import { HttpError } from './cache'

/**
 * OpenStreetMap 계열 서버(Overpass, Nominatim)는 사용 정책상 1초에 1번 이하로 요청해야 한다.
 * 서버별로 요청을 줄 세워 앞 요청이 끝난 뒤 최소 간격을 두고 보낸다.
 */
function makeQueue(minGapMs: number) {
  let last = 0
  let chain: Promise<unknown> = Promise.resolve()
  return <T>(fn: () => Promise<T>): Promise<T> => {
    const run = chain.then(async () => {
      const wait = last + minGapMs - Date.now()
      if (wait > 0) await new Promise((r) => setTimeout(r, wait))
      try {
        return await fn()
      } finally {
        last = Date.now()
      }
    })
    chain = run.catch(() => undefined)
    return run
  }
}

const overpassQueue = makeQueue(1100)
const nominatimQueue = makeQueue(1100)

// 키가 필요 없는 공개 Overpass 서버. 첫 번째가 실패(과부하·시간 초과·연결 오류)하면 다음 서버로 넘어간다.
const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

export interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

// Overpass JSON 응답: {"version":0.6,"generator":"Overpass API ...","osm3s":{...},"elements":[{type,id,lat,lon,tags} | {type,id,center:{lat,lon},tags}]}
export async function overpass(query: string, timeoutMs = 35000): Promise<OsmElement[]> {
  let lastError: unknown
  for (const server of OVERPASS_SERVERS) {
    try {
      return await overpassQueue(async () => {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), timeoutMs)
        try {
          const res = await fetch(server, {
            method: 'POST',
            body: new URLSearchParams({ data: query }),
            signal: ctrl.signal,
          })
          if (!res.ok) throw new HttpError(res.status, server)
          const json = (await res.json()) as { elements?: OsmElement[]; remark?: string }
          if (!Array.isArray(json.elements)) throw new Error('Overpass 응답 형식이 예상과 달라요')
          // 서버 시간 초과 시 200과 함께 remark만 오는 경우가 있다
          if (json.remark && /timed out|runtime error/i.test(json.remark) && json.elements.length === 0) throw new Error('Overpass 서버 시간 초과')
          return json.elements
        } finally {
          clearTimeout(timer)
        }
      })
    } catch (e) {
      lastError = e
      // 잘못된 쿼리(400)는 다른 서버에서도 실패하므로 바로 멈춘다
      if (e instanceof HttpError && e.status === 400) break
    }
  }
  throw lastError
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
