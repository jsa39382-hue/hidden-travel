import { DAY, cachedJson } from './cache'
import { bboxOf, distanceKm, elementLatLng, nominatimPois, overpass, type OsmElement } from './osm'
import { raceWithFallback } from './fallback'
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
  /** 예상 가격대 (costs.json 등급) */
  tier: Tier
}

export interface Eatery {
  id: string
  name: string
  nameLocal?: string
  kind: 'restaurant' | 'cafe' | 'fast_food' | 'food_court' | 'bar'
  kindLabel: string
  cuisine?: string
  lat: number
  lng: number
  distKm: number
  website?: string
  openingHours?: string
  /** 가격대: 0 저렴(패스트푸드·푸드코트·카페) 1 보통(식당) */
  tier: Tier
}

export interface Nearby {
  lodgings: Lodging[]
  eateries: Eatery[]
  radiusKm: number
  /** 출처: OpenStreetMap(Overpass) 또는 대체 경로(Nominatim) */
  source?: 'osm' | 'fallback'
}

const LODGING_KIND: Record<string, [string, Tier]> = {
  hotel: ['호텔', 1],
  hostel: ['호스텔', 0],
  guest_house: ['게스트하우스', 0],
  motel: ['모텔', 0],
  apartment: ['레지던스·아파트', 1],
  chalet: ['산장·별장', 1],
  alpine_hut: ['산장', 0],
}

const EAT_KIND: Record<Eatery['kind'], [string, Tier]> = {
  restaurant: ['식당', 1],
  cafe: ['카페', 0],
  fast_food: ['패스트푸드·간편식', 0],
  food_court: ['푸드코트', 0],
  bar: ['바·펍', 1],
}

/** 자주 나오는 cuisine 태그 → 한국어 */
const CUISINE: Record<string, string> = {
  japanese: '일식', sushi: '스시', ramen: '라멘', udon: '우동', soba: '소바', tempura: '덴푸라', yakitori: '야키토리', izakaya: '이자카야',
  okonomiyaki: '오코노미야키', takoyaki: '다코야키', tonkatsu: '돈카츠', curry: '카레', gyudon: '규동', japanese_curry: '일본 카레',
  chinese: '중식', dim_sum: '딤섬', noodle: '면 요리', noodles: '면 요리', hot_pot: '훠궈', dumpling: '만두',
  korean: '한식', thai: '태국 음식', vietnamese: '베트남 음식', pho: '쌀국수', indian: '인도 음식', indonesian: '인도네시아 음식',
  malaysian: '말레이시아 음식', filipino: '필리핀 음식', asian: '아시아 음식', italian: '이탈리아 음식', pizza: '피자', pasta: '파스타',
  french: '프랑스 음식', spanish: '스페인 음식', tapas: '타파스', greek: '그리스 음식', turkish: '튀르키예 음식', kebab: '케밥',
  mexican: '멕시코 음식', american: '미국 음식', burger: '버거', steak_house: '스테이크', bbq: '바비큐', barbecue: '바비큐',
  seafood: '해산물', fish: '생선 요리', fish_and_chips: '피시앤칩스', german: '독일 음식', regional: '향토 음식', local: '향토 음식',
  sandwich: '샌드위치', bakery: '베이커리', coffee_shop: '커피', cake: '케이크', dessert: '디저트', ice_cream: '아이스크림',
  vegetarian: '채식', vegan: '비건', chicken: '치킨', fried_chicken: '치킨', international: '세계 음식', breakfast: '아침 식사',
  crepe: '크레페', tea: '차', bubble_tea: '버블티', portuguese: '포르투갈 음식', british: '영국 음식', middle_eastern: '중동 음식',
}

export const cuisineKo = (raw?: string) =>
  raw
    ?.split(/[;,]/)
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 2)
    .map((c) => CUISINE[c] ?? c.replace(/_/g, ' '))
    .join('·')

function names(t: Record<string, string>) {
  const name = t['name:ko'] || t.name
  return { name, nameLocal: t.name !== name ? t.name : undefined }
}

function toLodging(e: OsmElement, center: [number, number]): Lodging | null {
  const t = e.tags ?? {}
  const ll = elementLatLng(e)
  if (!ll || !t.name) return null
  const starsNum = parseFloat(t.stars ?? '')
  const stars = Number.isFinite(starsNum) && starsNum > 0 && starsNum <= 7 ? Math.round(starsNum) : undefined
  const tier: Tier = t.tourism === 'hotel' && stars != null ? (stars >= 4 ? 2 : stars >= 3 ? 1 : 0) : (LODGING_KIND[t.tourism]?.[1] ?? 1)
  return {
    id: `${e.type}/${e.id}`,
    ...names(t),
    kind: LODGING_KIND[t.tourism]?.[0] ?? '숙소',
    stars,
    lat: ll[0],
    lng: ll[1],
    distKm: distanceKm(center, ll),
    website: t.website ?? t['contact:website'],
    tier,
  }
}

function toEatery(e: OsmElement, center: [number, number]): Eatery | null {
  const t = e.tags ?? {}
  const ll = elementLatLng(e)
  const kind = (t.amenity === 'pub' ? 'bar' : t.amenity) as Eatery['kind']
  if (!ll || !t.name || !EAT_KIND[kind]) return null
  return {
    id: `${e.type}/${e.id}`,
    ...names(t),
    kind,
    kindLabel: EAT_KIND[kind][0],
    cuisine: cuisineKo(t.cuisine),
    lat: ll[0],
    lng: ll[1],
    distKm: distanceKm(center, ll),
    website: t.website ?? t['contact:website'],
    openingHours: t.opening_hours,
    tier: EAT_KIND[kind][1],
  }
}

async function load(lat: number, lng: number, radiusM: number, signal?: AbortSignal): Promise<Nearby> {
  const { data, source } = await raceWithFallback(
    (sig) => loadOsm(lat, lng, radiusM, sig),
    (sig) => loadNominatim(lat, lng, radiusM, sig),
    { signal },
  )
  return { ...data, source }
}

/** 대체 경로: Nominatim에 종류별로 물어본다 (1초 간격이라 4번에 약 5초) */
async function loadNominatim(lat: number, lng: number, radiusM: number, signal?: AbortSignal): Promise<Nearby> {
  const rKm = radiusM / 1000
  const eatKm = rKm * 0.7
  const phrases: [string, number][] = [
    ['hotel', rKm],
    ['hostel', rKm],
    ['restaurant', eatKm],
    ['cafe', eatKm],
  ]
  const els: OsmElement[] = []
  let ok = 0
  let lastErr: unknown
  for (const [q, r] of phrases) {
    try {
      els.push(...(await nominatimPois(q, lat, lng, r, signal)))
      ok++
    } catch (e) {
      if (signal?.aborted) throw e
      lastErr = e
    }
  }
  if (!ok) throw lastErr
  // 같은 곳이 두 번 나오면 하나만
  const seen = new Set<string>()
  return toNearby(
    els.filter((e) => (seen.has(`${e.type}/${e.id}`) ? false : seen.add(`${e.type}/${e.id}`))),
    lat,
    lng,
    rKm,
    eatKm,
  )
}

/** 숙소와 식당·카페를 한 번의 요청으로 가져온다 (출력 문 두 개로 종류별 개수를 따로 제한) */
async function loadOsm(lat: number, lng: number, radiusM: number, signal?: AbortSignal): Promise<Nearby> {
  const rKm = radiusM / 1000
  const eatKm = rKm * 0.7
  const els = await overpass(
    `[out:json][timeout:20];
nwr[tourism~"^(hotel|hostel|guest_house|motel|apartment|chalet|alpine_hut)$"][name]${bboxOf(lat, lng, rKm)};out tags center 120;
nwr[amenity~"^(restaurant|cafe|fast_food|food_court|bar|pub)$"][name]${bboxOf(lat, lng, eatKm)};out tags center 300;`,
    25000,
    signal,
  )
  return toNearby(els, lat, lng, rKm, eatKm)
}

function toNearby(els: OsmElement[], lat: number, lng: number, rKm: number, eatKm: number): Nearby {
  const center: [number, number] = [lat, lng]
  const lodgings: Lodging[] = []
  const eateries: Eatery[] = []
  for (const e of els) {
    if (e.tags?.tourism) {
      const l = toLodging(e, center)
      if (l && l.distKm <= rKm) lodgings.push(l)
    } else {
      const f = toEatery(e, center)
      if (f && f.distKm <= eatKm) eateries.push(f)
    }
  }
  return {
    lodgings: lodgings.sort((a, b) => a.distKm - b.distKm),
    eateries: eateries.sort((a, b) => a.distKm - b.distKm),
    radiusKm: rKm,
  }
}

/** 지점 주변 숙소·식당 (24시간 캐시). 숙소가 너무 적으면 반경을 넓혀 한 번 더 찾는다. */
export async function getNearby(lat: number, lng: number, force = false, signal?: AbortSignal) {
  const key = (r: number) => `nearby:v3:${lat.toFixed(3)},${lng.toFixed(3)}:${r}`
  const near = await cachedJson(key(1500), DAY, (sig) => load(lat, lng, 1500, sig), { force, signal })
  if (near.data.lodgings.length >= 5) return near
  return cachedJson(key(5000), DAY, (sig) => load(lat, lng, 5000, sig), { force, signal })
}
