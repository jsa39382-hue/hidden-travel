import raw from '../data/transport.json'
import { DAY, HttpError, cachedJson, readCache } from './cache'
import { distanceKm, makeQueue } from './osm'
import { cityTransitAdvice, recommendTransfer, taxiFare, type Candidate, type Mode, type Range, type TaxiTariff } from './transferRule'

// ---------------- 데이터 형식 ----------------

export interface TransferOption {
  mode: Mode
  name: string
  minutes: number | null
  price: Range | null
  firstLast: string | null
  where: string | null
  note: string | null
  transfers: number | null
}
export interface Airport {
  code: string
  name: string
  lat: number
  lng: number
  cities: string[]
  options: TransferOption[]
}
export interface CityTransit {
  city: string
  card: string | null
  cardPrice: number | null
  passes: { name: string; price: number | null; days: number }[]
  single: Range | null
}
export interface Taxi extends TaxiTariff {
  city: string | null
  /** 할증·추가요금 등 보충 설명 */
  note: string | null
}
export interface Intercity {
  route: string
  mode: string
  minutes: number | null
  price: Range | null
  booking: string | null
}
/** official: 공항·교통 운영사 등 공식 사이트에서 확인 / reference: 위키백과 등 공개 자료 참고 (공식 아님) */
export type Basis = 'official' | 'reference'
export interface TransportCountry {
  basis: Basis
  currency: string
  childRate: number | null
  airports: Airport[]
  cityTransit: CityTransit[]
  taxi: Taxi | null
  rideApps: string[]
  intercity: Intercity[]
  sources: string[]
}

// ---------------- 형식 검사 (잘못된 값은 버리거나 null로) ----------------

const MODES = new Set<Mode>(['rail', 'bus', 'taxi', 'ride', 'shuttle'])
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const range = (v: unknown): Range | null =>
  Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number' && v[0] >= 0 && v[1] >= v[0] ? [v[0], v[1]] : null
const hhmmRange = (v: unknown) => (typeof v === 'string' && /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(v) ? v : null)
const arr = <T>(v: unknown, f: (x: unknown) => T | null): T[] => (Array.isArray(v) ? v.map(f).filter((x): x is T => x != null) : [])

function parseOption(v: unknown): TransferOption | null {
  if (!isObj(v) || !MODES.has(v.mode as Mode) || !str(v.name)) return null
  return {
    mode: v.mode as Mode,
    name: str(v.name)!,
    minutes: num(v.minutes),
    price: range(v.price),
    firstLast: hhmmRange(v.firstLast),
    where: str(v.where),
    note: str(v.note),
    transfers: num(v.transfers),
  }
}
function parseAirport(v: unknown): Airport | null {
  if (!isObj(v) || !str(v.code) || num(v.lat) == null || num(v.lng) == null) return null
  return { code: str(v.code)!, name: str(v.name) ?? str(v.code)!, lat: num(v.lat)!, lng: num(v.lng)!, cities: arr(v.cities, str), options: arr(v.options, parseOption) }
}
function parseTransit(v: unknown): CityTransit | null {
  if (!isObj(v) || !str(v.city)) return null
  return {
    city: str(v.city)!,
    card: str(v.card),
    cardPrice: num(v.cardPrice),
    passes: arr(v.passes, (p) => (isObj(p) && str(p.name) ? { name: str(p.name)!, price: num(p.price), days: num(p.days) ?? 1 } : null)),
    single: range(v.single),
  }
}
export function parseCountry(v: unknown): TransportCountry | null {
  if (!isObj(v) || !str(v.currency)) return null
  const t = isObj(v.taxi) ? v.taxi : null
  return {
    basis: v.basis === 'reference' ? 'reference' : 'official',
    currency: str(v.currency)!,
    childRate: num(v.childRate),
    airports: arr(v.airports, parseAirport),
    cityTransit: arr(v.cityTransit, parseTransit),
    taxi: t
      ? { city: str(t.city), base: num(t.base), perKm: num(t.perKm), includedKm: num(t.includedKm), afterAmount: num(t.afterAmount), perKmAfter: num(t.perKmAfter), nightMultiplier: num(t.nightMultiplier), nightHours: hhmmRange(t.nightHours), note: str(t.note) }
      : null,
    rideApps: arr(v.rideApps, str),
    intercity: arr(v.intercity, (x) =>
      isObj(x) && str(x.route) ? { route: str(x.route)!, mode: str(x.mode) ?? '', minutes: num(x.minutes), price: range(x.price), booking: str(x.booking) } : null,
    ),
    sources: arr(v.sources, (s) => (typeof s === 'string' && /^https?:\/\//.test(s) ? s : null)),
  }
}

const file = raw as unknown as { updated?: string; countries?: Record<string, unknown> }
export const TRANSPORT_UPDATED = typeof file.updated === 'string' ? file.updated : null
const parsed = new Map<string, TransportCountry | null>()

/** 나라의 교통 데이터 (없거나 형식이 틀리면 null) */
export function getTransport(code: string): TransportCountry | null {
  if (!parsed.has(code)) parsed.set(code, parseCountry(file.countries?.[code]))
  return parsed.get(code) ?? null
}

/** 지금 지역에서 가장 가까운 공항 */
export function nearestAirport(t: TransportCountry, lat: number, lng: number) {
  return [...t.airports].sort((a, b) => distanceKm([lat, lng], [a.lat, a.lng]) - distanceKm([lat, lng], [b.lat, b.lng]))[0] ?? null
}

/** 데이터 수단 → 추천 규칙 입력 (택시는 요금표와 거리로 값을 채운다) */
export function toCandidates(a: Airport, taxiPrice: Range | null, routeMinutes: number | null): Candidate[] {
  return a.options.map((o, i) => ({
    id: `${a.code}-${i}`,
    mode: o.mode,
    name: o.name,
    minutes: o.minutes ?? (o.mode === 'taxi' || o.mode === 'ride' ? routeMinutes : null),
    price: o.price ?? (o.mode === 'taxi' ? taxiPrice : null),
    firstLast: o.firstLast,
    transfers: o.transfers ?? (o.mode === 'rail' ? 1 : 0),
  }))
}

// ---------------- 거리·시간: OSRM ----------------

export interface Route {
  km: number
  minutes: number
  /** OSRM에 실패해 직선거리 × 1.3으로 추정했으면 true */
  estimated: boolean
}

// OSRM 공개 서버 정책: 1초에 1번 이하
const osrmQueue = makeQueue(1100, 1)

// 응답 (2026-11 실제 호출로 확인): {"code":"Ok","routes":[{"distance":69973.8,"duration":3804.3,...}]} — 거리 m, 시간 초
async function osrm(from: [number, number], to: [number, number]): Promise<Route> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1].toFixed(5)},${from[0].toFixed(5)};${to[1].toFixed(5)},${to[0].toFixed(5)}?overview=false`
  return osrmQueue(async () => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 12000)
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok) throw new HttpError(res.status, url)
      const j = (await res.json()) as { code?: string; routes?: { distance: number; duration: number }[] }
      const r = j.routes?.[0]
      if (j.code !== 'Ok' || !r) throw new Error('경로를 찾지 못했어요')
      return { km: r.distance / 1000, minutes: Math.round(r.duration / 60), estimated: false }
    } finally {
      clearTimeout(timer)
    }
  })
}

/** 직선거리 × 1.3, 평균 시속 35km로 추정 */
export function estimateRoute(from: [number, number], to: [number, number]): Route {
  const km = distanceKm(from, to) * 1.3
  return { km, minutes: Math.round((km / 35) * 60), estimated: true }
}

const routeKey = (from: [number, number], to: [number, number]) => `route:v1:${from.map((n) => n.toFixed(3)).join(',')};${to.map((n) => n.toFixed(3)).join(',')}`

/** 같은 출발·도착은 30일 캐시. 실패하면 직선거리로 추정 (추정값은 저장하지 않음) */
export async function getRoute(from: [number, number], to: [number, number]): Promise<Route> {
  try {
    return (await cachedJson(routeKey(from, to), 30 * DAY, () => osrm(from, to))).data
  } catch {
    return estimateRoute(from, to)
  }
}

/** 저장된 경로가 있으면 바로 (경비 계산처럼 기다릴 수 없는 곳용), 없으면 직선거리 추정 */
export function cachedRouteOrEstimate(from: [number, number], to: [number, number]): Route {
  return readCache<Route>(routeKey(from, to), 30 * DAY)?.data ?? estimateRoute(from, to)
}

// ---------------- 경비 탭: 현지 교통 ----------------

export interface TransportBudget {
  /** 현지 통화 합계 (계산할 수 없으면 null) */
  amount: number | null
  /** 경비 표 formula 자리에 넣을 설명 */
  formula: string
}

/**
 * 공항 왕복(추천 수단) + 시내 교통(패스 또는 1회 요금 × 하루 4회) × 일수.
 * 교통 데이터가 없으면 null → 기존 하루 정액 방식을 쓴다.
 */
export function transportBudget(
  code: string,
  place: { lat: number; lng: number; name: string },
  tier: 0 | 1 | 2,
  party: { adults: number; kids: number },
  days: number,
  ridesPerDay = 4,
): TransportBudget | null {
  const t = getTransport(code)
  if (!t) return null
  const airport = nearestAirport(t, place.lat, place.lng)
  const fmt = (n: number) => `${Math.round(n).toLocaleString('ko-KR')} ${t.currency}`
  const mid = (r: Range) => (r[0] + r[1]) / 2

  let airportRound: number | null = null
  let airportText = '공항 요금 정보 없음'
  if (airport) {
    const route = cachedRouteOrEstimate([airport.lat, airport.lng], [place.lat, place.lng])
    const taxi = t.taxi ? taxiFareRange(t, route.km) : null
    const r = recommendTransfer({ ...party, tier, arrival: '14:00', luggage: 'normal', options: toCandidates(airport, taxi, route.minutes), childRate: t.childRate })
    const pick = r.recommended
    if (pick?.total) {
      airportRound = mid(pick.total) * 2
      airportText = `공항 왕복 ${pick.option.name.split(' (')[0]} ${fmt(airportRound)}`
    }
  }

  const city = t.cityTransit[0]
  const advice = city ? cityTransitAdvice(city.single, city.passes, ridesPerDay) : null
  const units = party.adults + party.kids * (t.childRate ?? 1)
  const cityTotal = advice?.perDay != null ? advice.perDay * units * days : null
  const cityText =
    advice?.pick === 'pass' && advice.pass
      ? `${advice.pass.name} 하루 ${fmt(advice.perDay!)} × ${units}명 × ${days}일`
      : advice?.pick === 'single'
        ? `1회 요금 × ${ridesPerDay}회 × ${units}명 × ${days}일`
        : '시내 요금 정보 없음'

  if (airportRound == null || cityTotal == null) {
    return { amount: null, formula: `교통 요금 데이터가 아직 비어 있어 하루 정액으로 계산했어요 (${[airportRound == null && '공항', cityTotal == null && '시내'].filter(Boolean).join('·')} 요금 확인 필요)` }
  }
  return { amount: airportRound + cityTotal, formula: `${airportText} + 시내 ${cityText}` }
}

function taxiFareRange(t: TransportCountry, km: number) {
  return t.taxi ? taxiFare(t.taxi, km) : null
}
