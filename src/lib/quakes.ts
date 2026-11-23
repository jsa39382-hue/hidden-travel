import { DAY, HOUR, cachedJson, fetchJson } from './cache.ts'
import { distanceKm } from './osm.ts'

/**
 * 미국 지질조사국(USGS) 지진 목록 API (키 없음).
 * 응답: {"type":"FeatureCollection","features":[{"properties":{"mag":4.6,"place":"68 km SSE of Tateyama, Japan","time":1795282244504,"url":"https://earthquake.usgs.gov/earthquakes/eventpage/...","tsunami":0},"geometry":{"coordinates":[lng,lat,depthKm]}}]}
 */
interface UsgsRes {
  features?: { id?: string; properties?: { mag?: number | null; place?: string | null; time?: number; url?: string; tsunami?: number }; geometry?: { coordinates?: number[] } }[]
}

export interface Quake {
  id: string
  mag: number
  place: string
  time: number
  url: string | null
  distKm: number
  depthKm: number | null
  tsunami: boolean
}

export const QUAKE_RADIUS_KM = 300
export const QUAKE_DAYS = 30
export const QUAKE_MIN_MAG = 4.5

export function toQuakes(r: UsgsRes, lat: number, lng: number): Quake[] {
  return (r.features ?? [])
    .map((f, i) => {
      const p = f.properties ?? {}
      const c = f.geometry?.coordinates ?? []
      if (typeof p.mag !== 'number' || typeof p.time !== 'number' || c.length < 2) return null
      return {
        id: f.id ?? String(i),
        mag: p.mag,
        place: p.place ?? '',
        time: p.time,
        url: typeof p.url === 'string' && p.url.startsWith('https://') ? p.url : null,
        distKm: distanceKm([lat, lng], [c[1], c[0]]),
        depthKm: typeof c[2] === 'number' ? c[2] : null,
        tsunami: p.tsunami === 1,
      }
    })
    .filter((q): q is Quake => !!q)
    .sort((a, b) => b.time - a.time)
}

async function load(lat: number, lng: number): Promise<Quake[]> {
  const start = new Date(Date.now() - QUAKE_DAYS * DAY).toISOString().slice(0, 10)
  const url =
    'https://earthquake.usgs.gov/fdsnws/event/1/query?' +
    new URLSearchParams({
      format: 'geojson',
      latitude: lat.toFixed(3),
      longitude: lng.toFixed(3),
      maxradiuskm: String(QUAKE_RADIUS_KM),
      starttime: start,
      minmagnitude: String(QUAKE_MIN_MAG),
      orderby: 'time',
      limit: '50',
    })
  return toQuakes(await fetchJson<UsgsRes>(url), lat, lng)
}

/** 지점 반경 300km, 최근 30일, 규모 4.5 이상 지진 (1시간 캐시, 실패하면 저장본) */
export const getQuakes = (lat: number, lng: number, force = false) =>
  cachedJson(`quakes:v1:${lat.toFixed(2)},${lng.toFixed(2)}`, HOUR, () => load(lat, lng), { force })

/** 규모 → 쉬운 말 (대략) */
export function magKo(m: number) {
  return m >= 7 ? '대형 지진' : m >= 6 ? '강한 지진' : m >= 5 ? '중간 지진' : '약한 지진'
}
