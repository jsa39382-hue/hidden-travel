/**
 * 숨은 산책 코스: 숨은 정도가 높은 명소를 걸어서 잇고, 마지막 장소에 저녁 골든아워에 닿도록 출발 시각을 거꾸로 계산한다.
 * 순수 함수 (테스트하기 쉽게). 걷는 거리는 직선거리 × 1.3, 걷는 속도 시속 4.5km로 어림한다.
 */

// 다른 모듈을 가져오지 않는다 (단위 테스트에서 바로 불러오려고)
function distanceKm(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180
  const h = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export interface WalkSpot {
  id: string
  name: string
  kind: string
  lat: number
  lng: number
  hiddenScore: number
}

export interface WalkStop {
  spot: WalkSpot
  /** 앞 장소에서 걸어오는 거리(km)·시간(분). 첫 장소는 0 */
  walkKm: number
  walkMin: number
  /** 도착·출발 시각 (분 단위, 자정부터) */
  arrive: number
  leave: number
}

export interface WalkCourse {
  stops: WalkStop[]
  totalKm: number
  totalMin: number
  /** 첫 장소 도착(출발) 시각과 마지막 장소 도착 시각 (분) */
  start: number
  end: number
}

export const WALK_FACTOR = 1.3
export const WALK_KMH = 4.5
export const DWELL_MIN = 25

const walkKmOf = (a: WalkSpot, b: WalkSpot) => distanceKm([a.lat, a.lng], [b.lat, b.lng]) * WALK_FACTOR
const walkMinOf = (km: number) => Math.round((km / WALK_KMH) * 60)

/**
 * 코스 고르기
 * - 시작: 중심에서 maxStartKm 안, 숨은 정도가 높은 곳 (seed로 다른 시작점을 고를 수 있다)
 * - 다음: 아직 안 간 곳 중 숨은 정도 − 거리 벌점이 가장 큰 곳 (한 번에 maxLegKm 이하)
 * - 관심 목록(liked)에 있는 곳은 가산점
 */
export function planWalk(
  spots: WalkSpot[],
  center: [number, number],
  opts: { stops?: number; maxLegKm?: number; maxTotalKm?: number; maxStartKm?: number; liked?: Set<string>; seed?: number } = {},
): WalkSpot[] {
  const { stops = 5, maxLegKm = 1.6, maxTotalKm = 6, maxStartKm = 3, liked = new Set<string>(), seed = 0 } = opts
  const score = (s: WalkSpot) => s.hiddenScore + (liked.has(s.id) ? 25 : 0)
  const starts = spots
    .filter((s) => distanceKm(center, [s.lat, s.lng]) <= maxStartKm)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 8)
  if (!starts.length) return []
  const route = [starts[seed % starts.length]]
  let total = 0
  while (route.length < stops) {
    const cur = route[route.length - 1]
    let best: WalkSpot | null = null
    let bestVal = -Infinity
    for (const s of spots) {
      if (route.some((r) => r.id === s.id)) continue
      const km = walkKmOf(cur, s)
      if (km > maxLegKm || total + km > maxTotalKm || km < 0.05) continue
      const v = score(s) - km * 20
      if (v > bestVal) (bestVal = v), (best = s)
    }
    if (!best) break
    total += walkKmOf(cur, best)
    route.push(best)
  }
  return route
}

/** 시간표: 마지막 장소 도착을 arriveBy(분)에 맞춘다 */
export function scheduleWalk(route: WalkSpot[], arriveBy: number, dwellMin = DWELL_MIN): WalkCourse | null {
  if (!route.length) return null
  const legs = route.map((s, i) => {
    const km = i ? walkKmOf(route[i - 1], s) : 0
    return { km, min: walkMinOf(km) }
  })
  const totalWalk = legs.reduce((a, l) => a + l.min, 0)
  // 마지막 장소 전까지 머무는 시간 (마지막은 골든아워를 즐기므로 도착 시각만)
  const totalMin = totalWalk + dwellMin * (route.length - 1)
  const start = arriveBy - totalMin
  let t = start
  const stops: WalkStop[] = route.map((spot, i) => {
    t += legs[i].min
    const arrive = t
    const leave = i === route.length - 1 ? arrive : arrive + dwellMin
    t = leave
    return { spot, walkKm: legs[i].km, walkMin: legs[i].min, arrive, leave }
  })
  return { stops, totalKm: legs.reduce((a, l) => a + l.km, 0), totalMin, start, end: arriveBy }
}

export const hhmm = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** 숨은 탐험가 등급: 고른 곳들의 평균 숨은 정도로 */
export function explorerLevel(scores: number[]): { level: number; title: string; avg: number } | null {
  if (!scores.length) return null
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const table: [number, number, string][] = [
    [80, 5, '전설의 숨은 탐험가'],
    [70, 4, '골목 탐험가'],
    [60, 3, '숨은 길 여행자'],
    [45, 2, '호기심 여행자'],
    [0, 1, '첫걸음 여행자'],
  ]
  const [, level, title] = table.find(([min]) => avg >= min)!
  return { level, title, avg }
}
