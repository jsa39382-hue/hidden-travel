import { DAY, HttpError, cachedJson, fetchJson } from './cache.ts'

/**
 * Photon (komoot, 키 없음): OpenStreetMap 기반 '입력하는 대로' 장소 검색. 오타에도 강하다.
 * 응답: {"type":"FeatureCollection","features":[{"properties":{"name":"Kyoto","osm_value":"city","state":"Kyoto Prefecture","country":"Japan","countrycode":"JP"},"geometry":{"coordinates":[135.768,35.011]}}]}
 * 한글 이름은 거의 찾지 못하므로 한글 검색은 Nominatim(검색 버튼)으로 한다.
 */
interface PhotonRes {
  features?: {
    properties?: { name?: string; city?: string; district?: string; state?: string; country?: string; countrycode?: string; osm_value?: string }
    geometry?: { coordinates?: number[] }
  }[]
}

export interface PlaceHit {
  name: string
  detail: string
  lat: number
  lng: number
}

export const hasHangul = (s: string) => /[ㄱ-ㆎ가-힣]/.test(s)

/** 고른 나라 안의 결과만, 이름·좌표가 있는 것만, 같은 이름·거의 같은 위치는 하나만 */
export function toHits(r: PhotonRes, countryCode: string, limit = 6): PlaceHit[] {
  const out: PlaceHit[] = []
  for (const f of r.features ?? []) {
    const p = f.properties ?? {}
    const c = f.geometry?.coordinates ?? []
    if (!p.name || p.countrycode?.toUpperCase() !== countryCode.toUpperCase() || c.length < 2) continue
    const hit = { name: p.name, detail: [p.district, p.city !== p.name ? p.city : undefined, p.state, p.country].filter(Boolean).join(', '), lat: c[1], lng: c[0] }
    if (out.some((o) => o.name === hit.name && Math.abs(o.lat - hit.lat) < 0.02 && Math.abs(o.lng - hit.lng) < 0.02)) continue
    out.push(hit)
    if (out.length >= limit) break
  }
  return out
}

async function load(q: string, countryCode: string): Promise<PlaceHit[]> {
  const url =
    'https://photon.komoot.io/api/?' +
    // 위치 치우침(lat/lon)을 주면 수도 근처 이름이 앞서서 오타 검색이 나빠진다 → 넉넉히 받아 나라로 거른다
    new URLSearchParams({ q, limit: '30', lang: 'en' })
  const r = await fetchJson<PhotonRes>(url, { timeoutMs: 10000 })
  if (!r || !Array.isArray(r.features)) throw new HttpError(500, url)
  return toHits(r, countryCode)
}

/** 입력하는 대로 찾기 (같은 검색어는 하루 저장) */
export const photonSearch = (q: string, countryCode: string, force = false) =>
  cachedJson(`photon:v2:${countryCode}:${q.toLowerCase()}`, DAY, () => load(q, countryCode), { force }).then((x) => x.data)
