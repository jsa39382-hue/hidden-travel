import { DAY, cachedJson } from './cache'
import { distanceKm, elementLatLng, overpass } from './osm'
import type { Tier } from './budget'

export interface Lodging {
  id: string
  name: string
  nameLocal?: string
  kind: string
  stars?: number
  lat: number
  lng: number
  distKm: number
  website?: string
  phone?: string
  /** 예상 가격대 (costs.json 등급) */
  tier: Tier
}

const KIND: Record<string, [string, Tier]> = {
  hotel: ['호텔', 1],
  hostel: ['호스텔', 0],
  guest_house: ['게스트하우스', 0],
  motel: ['모텔', 0],
  apartment: ['레지던스·아파트', 1],
  chalet: ['산장·별장', 1],
  alpine_hut: ['산장', 0],
}

function tierOf(kind: string, stars?: number): Tier {
  if (kind === 'hotel' && stars != null) return stars >= 4 ? 2 : stars >= 3 ? 1 : 0
  return KIND[kind]?.[1] ?? 1
}

async function load(lat: number, lng: number, radiusM: number): Promise<Lodging[]> {
  const els = await overpass(
    `[out:json][timeout:25];nwr(around:${radiusM},${lat},${lng})[tourism~"^(hotel|hostel|guest_house|motel|apartment|chalet|alpine_hut)$"][name];out tags center 120;`,
  )
  const out: Lodging[] = []
  for (const e of els) {
    const t = e.tags ?? {}
    const ll = elementLatLng(e)
    if (!ll || !t.name) continue
    const starsNum = parseFloat(t.stars ?? '')
    const stars = Number.isFinite(starsNum) && starsNum > 0 && starsNum <= 7 ? Math.round(starsNum) : undefined
    const name = t['name:ko'] || t.name
    out.push({
      id: `${e.type}/${e.id}`,
      name,
      nameLocal: t.name !== name ? t.name : undefined,
      kind: KIND[t.tourism]?.[0] ?? '숙소',
      stars,
      lat: ll[0],
      lng: ll[1],
      distKm: distanceKm([lat, lng], ll),
      website: t.website ?? t['contact:website'],
      phone: t.phone ?? t['contact:phone'],
      tier: tierOf(t.tourism, stars),
    })
  }
  return out.sort((a, b) => a.distKm - b.distKm)
}

/** 지점 주변 숙소 (24시간 캐시). 결과가 적으면 반경을 넓혀 한 번 더 찾는다. */
export async function getLodging(lat: number, lng: number, force = false) {
  const key = (r: number) => `lodging:v1:${lat.toFixed(3)},${lng.toFixed(3)}:${r}`
  const near = await cachedJson(key(1500), DAY, () => load(lat, lng, 1500), { force })
  if (near.data.length >= 5) return { ...near, radiusKm: 1.5 }
  const wide = await cachedJson(key(5000), DAY, () => load(lat, lng, 5000), { force })
  return { ...wide, radiusKm: 5 }
}
