import { HttpError } from './cache'

/**
 * OpenStreetMap 계열 서버(Overpass, Nominatim)는 사용 정책상 요청을 몰아 보내면 안 된다.
 * 요청 '시작' 사이에 최소 간격을 두고, 동시에 진행되는 요청 수도 제한한다.
 */
export function makeQueue(minGapMs: number, maxConcurrent: number) {
  let lastStart = 0
  let running = 0
  const waiting: (() => void)[] = []
  const next = () => {
    if (running >= maxConcurrent || !waiting.length) return
    const wait = lastStart + minGapMs - Date.now()
    if (wait > 0) {
      setTimeout(next, wait)
      return
    }
    lastStart = Date.now()
    running++
    waiting.shift()!()
  }
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      waiting.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            running--
            next()
          })
      })
      next()
    })
}

// Overpass 공개 서버는 IP당 동시 2건까지 허용 → 명소와 숙소·식당을 동시에 찾을 수 있다.
// 대기열은 서버마다 따로 둔다. (한 서버가 멈춰도 다른 서버로 보내는 요청이 그 뒤에 갇히지 않게)
const overpassQueues = new Map<string, ReturnType<typeof makeQueue>>()
const overpassQueue = (server: string) => {
  let q = overpassQueues.get(server)
  if (!q) overpassQueues.set(server, (q = makeQueue(1100, 2)))
  return q
}
const nominatimQueue = makeQueue(1100, 1)

// 키가 필요 없는 공개 Overpass 서버
const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
/** 첫 서버가 이 시간 안에 답하지 않으면 다음 서버에도 같이 요청해 먼저 온 응답을 쓴다 */
const HEDGE_AFTER_MS = 6000

export interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

async function overpassOnce(server: string, query: string, timeoutMs: number, outer: AbortSignal): Promise<OsmElement[]> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const onOuter = () => ctrl.abort()
  outer.addEventListener('abort', onOuter)
  try {
    const res = await fetch(server, { method: 'POST', body: new URLSearchParams({ data: query }), signal: ctrl.signal })
    if (!res.ok) throw new HttpError(res.status, server)
    const json = (await res.json()) as { elements?: OsmElement[]; remark?: string }
    if (!Array.isArray(json.elements)) throw new Error('Overpass 응답 형식이 예상과 달라요')
    // 서버 시간 초과 시 200과 함께 remark만 오는 경우가 있다
    if (json.remark && /timed out|runtime error|out of memory/i.test(json.remark) && json.elements.length === 0) throw new Error('Overpass 서버 시간 초과')
    return json.elements
  } finally {
    clearTimeout(timer)
    outer.removeEventListener('abort', onOuter)
  }
}

export class OverpassError extends Error {
  cause: unknown
  constructor(message: string, cause: unknown) {
    super(message)
    this.cause = cause
  }
}

/** 실패 원인을 짧은 한국어로 (진단용) */
export function describeFailure(e: unknown): string {
  if (e instanceof HttpError) return e.status === 429 ? '요청 많음(429)' : e.status === 504 ? '서버 과부하(504)' : `HTTP ${e.status}`
  if (e instanceof DOMException && e.name === 'AbortError') return '시간 초과'
  if (e instanceof TypeError) return '접속 불가(차단·CORS·네트워크)'
  if (e instanceof Error) return /[가-힣]/.test(e.message) ? e.message : '알 수 없는 오류'
  return '알 수 없는 오류'
}

// Overpass JSON 응답: {"version":0.6,"generator":"Overpass API ...","elements":[{type,id,lat,lon,tags} | {type,id,center:{lat,lon},tags}]}
export function overpass(query: string, timeoutMs = 30000, signal?: AbortSignal): Promise<OsmElement[]> {
  const outer = new AbortController()
  return new Promise<OsmElement[]>((resolve, reject) => {
    let started = 0
    let failed = 0
    let lastError: unknown
    const reasons: string[] = []
    let done = false
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined
    // 호출한 쪽이 취소하면 진행 중·대기 중인 서버 요청을 모두 멈춘다
    if (signal) {
      if (signal.aborted) return reject(new DOMException('요청을 취소했어요', 'AbortError'))
      signal.addEventListener(
        'abort',
        () => {
          if (done) return
          done = true
          clearTimeout(hedgeTimer)
          outer.abort()
          reject(new DOMException('요청을 취소했어요', 'AbortError'))
        },
        { once: true },
      )
    }

    const startNext = () => {
      if (done || started >= OVERPASS_SERVERS.length) return
      const server = OVERPASS_SERVERS[started++]
      clearTimeout(hedgeTimer)
      // 늦으면 다음 서버도 같이 시작
      hedgeTimer = setTimeout(startNext, HEDGE_AFTER_MS)
      overpassQueue(server)(() => (done || outer.signal.aborted ? Promise.resolve([] as OsmElement[]) : overpassOnce(server, query, timeoutMs, outer.signal))).then(
        (els) => {
          if (done) return
          done = true
          clearTimeout(hedgeTimer)
          outer.abort() // 나머지 서버 요청은 취소
          resolve(els)
        },
        (e) => {
          if (done) return
          failed++
          lastError = e
          reasons.push(`${new URL(server).host}: ${describeFailure(e)}`)
          // 잘못된 쿼리(400)는 다른 서버에서도 실패하므로 바로 멈춘다
          if ((e instanceof HttpError && e.status === 400) || failed >= OVERPASS_SERVERS.length) {
            done = true
            clearTimeout(hedgeTimer)
            const all = new OverpassError(`OpenStreetMap 서버 ${failed}곳 모두 실패 — ${reasons.join(' / ')}`, lastError)
            reject(all)
            return
          }
          if (failed >= started) startNext() // 진행 중인 요청이 없으면 바로 다음 서버
        },
      )
    }
    startNext()
  })
}

export const elementLatLng = (e: OsmElement): [number, number] | null =>
  e.lat != null && e.lon != null ? [e.lat, e.lon] : e.center ? [e.center.lat, e.center.lon] : null

// Nominatim 검색 응답 (2026-11 실제 호출로 확인):
// [{"lat":"35.23","lon":"139.10","category":"boundary","type":"administrative","addresstype":"town","name":"하코네",
//   "display_name":"하코네, 아시가라시모군, 가나가와현, 250-0398, 일본","boundingbox":[...],"importance":0.52,"place_rank":16}]
export interface NominatimPlace {
  lat: string
  lon: string
  name: string
  display_name: string
  addresstype?: string
  category?: string
  type?: string
}

export function nominatimSearch(q: string, countryCode: string): Promise<NominatimPlace[]> {
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({ q, countrycodes: countryCode.toLowerCase(), format: 'jsonv2', 'accept-language': 'ko', limit: '6' })
  return nominatimQueue(async () => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok) throw new HttpError(res.status, url)
      const data = (await res.json()) as NominatimPlace[]
      if (!Array.isArray(data)) throw new Error('Nominatim 응답 형식이 예상과 달라요')
      return data
    } finally {
      clearTimeout(timer)
    }
  })
}

/**
 * 중심·반경 → Overpass 네모 영역 "(남,서,북,동)".
 * around(반경) 검색은 길·건물의 모양을 하나하나 거리 계산해야 해서 무겁다.
 * 네모 영역으로 찾고 원 밖의 것은 브라우저에서 거리로 걸러 내는 편이 훨씬 빠르다.
 */
export function bboxOf(lat: number, lng: number, radiusKm: number) {
  const dLat = radiusKm / 111.32
  const dLng = radiusKm / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  const f = (n: number) => n.toFixed(5)
  return `(${f(lat - dLat)},${f(lng - dLng)},${f(lat + dLat)},${f(lng + dLng)})`
}

// Nominatim 장소 종류 검색 응답 (2026-11 실제 호출로 확인, extratags는 null일 수 있음):
// [{"osm_type":"node","osm_id":123,"lat":"35.01","lon":"135.76","category":"tourism","type":"hotel","name":"Hotel ...",
//   "extratags":{"stars":"3","website":"..."} | null, "namedetails":{"name":"...","name:ko":"..."} | null}]
interface NominatimPoi {
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  category: string
  type: string
  name: string
  extratags?: Record<string, string> | null
  namedetails?: Record<string, string> | null
}

/**
 * Nominatim으로 네모 영역 안의 장소 종류(hotel, restaurant 등)를 찾는다. 한 번에 최대 40곳.
 * 결과는 Overpass 결과와 같은 모양(OsmElement)으로 바꿔 돌려준다.
 */
export function nominatimPois(phrase: string, lat: number, lng: number, radiusKm: number, signal?: AbortSignal): Promise<OsmElement[]> {
  const dLat = radiusKm / 111.32
  const dLng = radiusKm / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  const viewbox = [lng - dLng, lat + dLat, lng + dLng, lat - dLat].map((n) => n.toFixed(5)).join(',')
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({ q: phrase, format: 'jsonv2', limit: '40', bounded: '1', viewbox, extratags: '1', namedetails: '1', 'accept-language': 'ko' })
  return nominatimQueue(async () => {
    if (signal?.aborted) throw new DOMException('요청을 취소했어요', 'AbortError')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15000)
    const onAbort = () => ctrl.abort()
    signal?.addEventListener('abort', onAbort)
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok) throw new HttpError(res.status, url)
      const data = (await res.json()) as NominatimPoi[]
      if (!Array.isArray(data)) throw new Error('Nominatim 응답 형식이 예상과 달라요')
      return data.map((d) => {
        const local = d.namedetails?.name ?? d.name
        return {
          type: (d.osm_type as OsmElement['type']) ?? 'node',
          id: d.osm_id,
          lat: Number(d.lat),
          lon: Number(d.lon),
          tags: {
            ...(d.extratags ?? {}),
            [d.category]: d.type,
            name: local,
            ...(d.namedetails?.['name:ko'] ? { 'name:ko': d.namedetails['name:ko'] } : {}),
          },
        }
      })
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  })
}

/** 두 좌표 사이 거리(km) */
export function distanceKm(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180
  const dLat = (b[0] - a[0]) * r
  const dLng = (b[1] - a[1]) * r
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

export const formatDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(km < 10 ? 1 : 0)}km`)

/** 구글 지도에서 좌표 위치를 연다 (키 불필요 URL) */
export const googleMapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

export const osmUrl = (e: { type: string; id: number }) => `https://www.openstreetmap.org/${e.type}/${e.id}`
