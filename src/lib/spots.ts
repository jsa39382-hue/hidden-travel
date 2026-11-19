import { DAY, cachedJson, readCache, writeCache, HttpError } from './cache'
import { useAsync } from './useAsync'
import { bboxOf, distanceKm, elementLatLng, overpass, type OsmElement } from './osm'
import { raceWithFallback } from './fallback'

export type SpotCategory = 'nature' | 'view' | 'museum' | 'history' | 'art' | 'attraction'

export interface Spot {
  id: string // 'node/123'
  name: string
  nameLocal?: string
  kind: string // 화면용 종류 (예: 폭포)
  category: SpotCategory
  lat: number
  lng: number
  distKm: number
  /** 위키 문서 (pageviews·요약용) */
  wiki?: { lang: string; title: string }
  /** 한국어·영어 문서 제목 (Wikidata로 확인) */
  koTitle?: string
  enTitle?: string
  /** 최근 30일 조회수. null = 확인 못 함, undefined = 위키 문서 없음 */
  views?: number | null
  /** 0~100, 높을수록 덜 알려진 곳 */
  hiddenScore: number
  /** 숨은 명소 목록 정렬용 흥미도 */
  interest: number
  website?: string
  /** OpenStreetMap에서 온 추가 정보 */
  openingHours?: string
  fee?: string
  description?: string
  wikidata?: string
  /** Wikidata에서 찾은 경우: 연결된 위키 문서(언어판) 수 */
  sitelinks?: number
  /** 인지도(조회수) 확인 전이면 true */
  pending?: boolean
}

export interface SpotsResult {
  spots: Spot[]
  fetchedAt: number
  viewsChecked: number
  viewsFailed: number
  /** 명소 목록 출처: OpenStreetMap(Overpass) 또는 대체 경로(Wikidata) */
  source?: 'osm' | 'fallback'
}

// ---------- 태그 → 종류 ----------

const KIND: Record<string, Record<string, [string, SpotCategory, number]>> = {
  tourism: {
    attraction: ['관광 명소', 'attraction', 10],
    viewpoint: ['전망 포인트', 'view', 15],
    museum: ['박물관', 'museum', 8],
    gallery: ['미술관', 'museum', 6],
    artwork: ['예술 작품', 'art', -10],
  },
  natural: {
    waterfall: ['폭포', 'nature', 20],
    peak: ['산봉우리', 'nature', 8],
    beach: ['해변', 'nature', 10],
    cave_entrance: ['동굴', 'nature', 15],
    hot_spring: ['온천', 'nature', 15],
  },
  historic: {
    castle: ['성', 'history', 12],
    palace: ['궁전', 'history', 12],
    ruins: ['유적', 'history', 12],
    archaeological_site: ['고고학 유적', 'history', 12],
    fort: ['요새', 'history', 12],
    monastery: ['수도원', 'history', 12],
    city_gate: ['성문', 'history', 8],
    citywalls: ['성벽', 'history', 6],
    castle_wall: ['성벽', 'history', 6],
    manor: ['옛 저택', 'history', 8],
    monument: ['기념물', 'history', -5],
    tomb: ['옛 무덤', 'history', -5],
    building: ['역사적 건물', 'history', 2],
    church: ['역사적 교회', 'history', 4],
    temple: ['옛 사원', 'history', 8],
    shrine: ['사당·신사', 'history', 6],
    bridge: ['옛 다리', 'history', 5],
    aqueduct: ['수도교', 'history', 8],
    ship: ['역사적 선박', 'history', 5],
    battlefield: ['옛 전쟁터', 'history', 2],
  },
}

function classify(tags: Record<string, string>): { kind: string; category: SpotCategory; bonus: number } {
  for (const key of ['natural', 'tourism', 'historic'] as const) {
    const v = tags[key]
    if (!v) continue
    const k = KIND[key][v]
    if (k) return { kind: k[0], category: k[1], bonus: k[2] }
    if (key === 'historic') return { kind: '역사 유적', category: 'history', bonus: 0 }
  }
  return { kind: '명소', category: 'attraction', bonus: 0 }
}

// historic=* 중 작은 표지판·기념비처럼 여행지로 보기 어려운 것은 뺀다
const HISTORIC_NOISE = 'memorial|wayside_cross|wayside_shrine|boundary_stone|milestone|yes|district|heritage|railway|marker|stone|optical_telegraph|pillory|cannon|vehicle|tree_shrine|creamery|mine_shaft|mine'

function buildQuery(lat: number, lng: number, radiusKm: number) {
  const b = bboxOf(lat, lng, radiusKm)
  return `[out:json][timeout:25];
(
  nwr[tourism~"^(attraction|viewpoint|museum|gallery|artwork)$"][name]${b};
  nwr[natural~"^(waterfall|peak|beach|cave_entrance|hot_spring)$"][name]${b};
  nwr[historic][historic!~"^(${HISTORIC_NOISE})$"][name]${b};
);
out tags center 500;`
}

function parseWikiTag(v?: string): Spot['wiki'] {
  const m = /^([a-z-]{2,12}):(.+)$/.exec(v ?? '')
  return m ? { lang: m[1], title: m[2].trim() } : undefined
}

function toSpot(e: OsmElement, center: [number, number]): Spot | null {
  const tags = e.tags ?? {}
  const ll = elementLatLng(e)
  const local = tags.name
  if (!ll || !local) return null
  const name = tags['name:ko'] || local
  const { kind, category, bonus } = classify(tags)
  const wikidata = /^Q\d+$/.test(tags.wikidata ?? '') ? tags.wikidata : undefined
  const wiki = parseWikiTag(tags.wikipedia)
  return {
    id: `${e.type}/${e.id}`,
    name,
    nameLocal: local !== name ? local : undefined,
    kind,
    category,
    lat: ll[0],
    lng: ll[1],
    distKm: distanceKm(center, ll),
    wiki,
    wikidata,
    hiddenScore: 0,
    interest: bonus + (tags['name:ko'] ? 3 : 0) + (tags.description || tags.website ? 2 : 0),
    website: tags.website ?? tags['contact:website'],
    openingHours: tags.opening_hours,
    fee: tags.fee,
    description: tags['description:ko'] ?? tags['description:en'] ?? tags.description,
  }
}

// ---------- Wikidata: 문서 제목 ----------

async function resolveTitles(qids: string[]): Promise<Map<string, { ko?: string; en?: string }>> {
  const out = new Map<string, { ko?: string; en?: string }>()
  for (let i = 0; i < qids.length; i += 150) {
    const part = qids.slice(i, i + 150)
    const query = `SELECT ?item ?ko ?en WHERE { VALUES ?item { ${part.map((q) => 'wd:' + q).join(' ')} }
  OPTIONAL { ?k schema:about ?item ; schema:isPartOf <https://ko.wikipedia.org/> ; schema:name ?ko }
  OPTIONAL { ?e schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?en } }`
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    try {
      const res = await fetch('https://query.wikidata.org/sparql', {
        method: 'POST',
        headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ query }),
        signal: ctrl.signal,
      })
      if (!res.ok) throw new HttpError(res.status, res.url)
      const json = (await res.json()) as { results: { bindings: Record<string, { value: string }>[] } }
      for (const b of json.results.bindings) {
        const q = b.item.value.slice(b.item.value.lastIndexOf('/') + 1)
        out.set(q, { ko: b.ko?.value, en: b.en?.value })
      }
    } finally {
      clearTimeout(timer)
    }
  }
  return out
}

// ---------- Wikimedia Pageviews ----------

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')

// 응답: {"items":[{"project":"en.wikipedia","article":"...","granularity":"daily","timestamp":"2026101800","access":"all-access","agent":"user","views":1234}, ...]}
// 기간 동안 조회 기록이 없는 문서는 404를 준다 → 0회로 본다.
async function pageviews30(lang: string, title: string): Promise<number> {
  const key = `pv:${lang}:${title}`
  const hit = readCache<number>(key, 3 * DAY)
  if (hit) return hit.data
  const end = new Date(Date.now() - DAY)
  const start = new Date(end.getTime() - 29 * DAY)
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${lang}.wikipedia/all-access/user/${encodeURIComponent(
    title.replace(/ /g, '_'),
  )}/daily/${ymd(start)}/${ymd(end)}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (res.status === 404) {
      writeCache(key, 0)
      return 0
    }
    if (!res.ok) throw new HttpError(res.status, url)
    const json = (await res.json()) as { items?: { views: number }[] }
    const views = (json.items ?? []).reduce((s, x) => s + (x.views ?? 0), 0)
    writeCache(key, views)
    return views
  } finally {
    clearTimeout(timer)
  }
}

/** 동시에 n개까지만 실행 */
async function mapLimit<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        try {
          out[idx] = { status: 'fulfilled', value: await fn(items[idx]) }
        } catch (reason) {
          out[idx] = { status: 'rejected', reason }
        }
      }
    }),
  )
  return out
}

/** 조회수 → 숨은 정도(0~100). 0회=100, 30회≈67, 300회≈45, 3천 회≈24, 3만 회≈1 */
export const scoreFromViews = (v: number) => Math.max(0, Math.min(100, Math.round(100 - 22 * Math.log10(v + 1))))
export const HIDDEN_THRESHOLD = 50
/** 한국어·영어 문서는 없고 다른 언어 문서만 있을 때: 연결된 언어판이 적을수록 덜 알려진 곳 */
const scoreFromSitelinks = (n: number) => (n <= 1 ? 68 : n <= 3 ? 58 : n <= 6 ? 45 : 30)
const NO_WIKI_SCORE = 75
const UNKNOWN_VIEWS_SCORE = 40
const MAX_PAGEVIEW_LOOKUPS = 45

const hasWikiOf = (s: Spot) => !!(s.enTitle || s.wiki || s.koTitle || s.wikidata)

/** 1단계: 명소 목록만 (빠름). 위키 문서가 있는 곳은 인지도 확인 전 상태로 둔다. */
async function loadBase(lat: number, lng: number, radiusKm: number, signal?: AbortSignal): Promise<SpotsResult> {
  const { data, source } = await raceWithFallback(
    (sig) => loadBaseOsm(lat, lng, radiusKm, sig),
    (sig) => loadBaseWikidata(lat, lng, radiusKm, sig),
    { signal },
  )
  return { ...data, source }
}

async function loadBaseOsm(lat: number, lng: number, radiusKm: number, signal?: AbortSignal): Promise<SpotsResult> {
  const center: [number, number] = [lat, lng]
  const elements = await overpass(buildQuery(lat, lng, radiusKm), 35000, signal)
  const raw = elements
    .map((e) => toSpot(e, center))
    .filter((s): s is Spot => !!s && s.distKm <= radiusKm)
    .sort((a, b) => (hasWikiOf(b) ? 1 : 0) - (hasWikiOf(a) ? 1 : 0) || a.distKm - b.distKm)
  // 같은 이름이 가까이 여러 개(건물·경계 등) 있으면 하나만
  const spots: Spot[] = []
  for (const s of raw) {
    if (spots.some((t) => t.name === s.name && distanceKm([t.lat, t.lng], [s.lat, s.lng]) < 0.5)) continue
    if (s.wiki?.lang === 'ko') s.koTitle = s.wiki.title
    if (s.wiki?.lang === 'en') s.enTitle = s.wiki.title
    const hasWiki = hasWikiOf(s)
    s.hiddenScore = hasWiki ? UNKNOWN_VIEWS_SCORE : NO_WIKI_SCORE
    s.pending = hasWiki || undefined
    s.interest += s.hiddenScore + (hasWiki ? 15 : 0) - Math.min(10, s.distKm)
    spots.push(s)
    if (spots.length >= 300) break
  }
  return { spots, fetchedAt: Date.now(), viewsChecked: 0, viewsFailed: 0 }
}

/** 2단계: Wikidata 문서 제목 + Wikimedia 조회수로 숨은 정도 계산 */
async function loadFame(base: Spot[]): Promise<SpotsResult> {
  const spots = base.map((s) => ({ ...s, interest: s.interest - s.hiddenScore - (hasWikiOf(s) ? 15 : 0) + Math.min(10, s.distKm) }))

  // Wikidata에서 찾은 명소는 문서 제목을 이미 알고 있으므로 다시 묻지 않는다
  const qids = [...new Set(spots.filter((s) => !s.id.startsWith('wd/')).map((s) => s.wikidata).filter((q): q is string => !!q))]
  if (qids.length) {
    try {
      const titles = await resolveTitles(qids)
      for (const s of spots) {
        const t = s.wikidata ? titles.get(s.wikidata) : undefined
        if (t) {
          s.koTitle ??= t.ko
          s.enTitle ??= t.en
        }
      }
    } catch {
      /* 제목 확인 실패 → 위키 태그만 사용 */
    }
  }

  // 조회수: 영어 문서(나라 간 비교 가능) → 원래 위키 태그 문서 → 한국어 문서 순
  const withWiki = spots.filter((s) => s.enTitle || s.wiki || s.koTitle).sort((a, b) => a.distKm - b.distKm)
  const lookup = withWiki.slice(0, MAX_PAGEVIEW_LOOKUPS)
  const results = await mapLimit(lookup, 6, (s) => {
    const [lang, title] = s.enTitle ? ['en', s.enTitle] : s.wiki ? [s.wiki.lang, s.wiki.title] : ['ko', s.koTitle!]
    return pageviews30(lang, title)
  })
  let viewsFailed = 0
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') lookup[i].views = r.value
    else {
      lookup[i].views = null
      viewsFailed++
    }
  })
  for (const s of withWiki.slice(MAX_PAGEVIEW_LOOKUPS)) s.views = null

  for (const s of spots) {
    const hasWiki = !!(s.enTitle || s.wiki || s.koTitle)
    s.hiddenScore =
      s.views != null
        ? scoreFromViews(s.views)
        : s.sitelinks // 조회수를 모르면 위키 언어판 수로 추정 (Wikidata에서 찾은 곳)
          ? scoreFromSitelinks(s.sitelinks)
          : !hasWiki
            ? NO_WIKI_SCORE
            : UNKNOWN_VIEWS_SCORE
    // 설명을 보여 줄 수 있는(문서가 있는) 숨은 곳을 더 앞에, 너무 먼 곳은 살짝 뒤로
    s.interest += s.hiddenScore + (hasWiki ? 15 : 0) - Math.min(10, s.distKm)
    if (!hasWiki) s.views = undefined
    s.pending = undefined
  }
  return { spots, fetchedAt: Date.now(), viewsChecked: lookup.length - viewsFailed, viewsFailed }
}

const spotsKey = (lat: number, lng: number, radiusKm: number) => `${lat.toFixed(3)},${lng.toFixed(3)}:${radiusKm}`

/** 지역의 명소 목록 (24시간 캐시) */
export function getSpotsBase(lat: number, lng: number, radiusKm: number, force = false, signal?: AbortSignal) {
  return cachedJson(`spots:base:v4:${spotsKey(lat, lng, radiusKm)}`, DAY, (sig) => loadBase(lat, lng, radiusKm, sig), { force, signal })
}

/** 명소 목록 + 인지도 (24시간 캐시) */
export function getSpotsFame(lat: number, lng: number, radiusKm: number, base: Spot[], force = false, signal?: AbortSignal) {
  return cachedJson(`spots:fame:v4:${spotsKey(lat, lng, radiusKm)}`, DAY, () => loadFame(base), { force, signal })
}

export function splitSpots(spots: Spot[]) {
  // 인지도 확인 전인 곳은 아직 어느 쪽인지 모르므로 숨은 명소 뒤쪽에 둔다
  const hidden = spots.filter((s) => s.hiddenScore >= HIDDEN_THRESHOLD || s.pending).sort((a, b) => (a.pending ? 1 : 0) - (b.pending ? 1 : 0) || b.interest - a.interest)
  const famous = spots
    .filter((s) => s.hiddenScore < HIDDEN_THRESHOLD && !s.pending)
    .sort((a, b) => (b.views ?? -1) - (a.views ?? -1) || a.distKm - b.distKm)
  return { hidden, famous }
}

// ---------- Wikipedia 요약 ----------

export interface WikiSummary {
  title: string
  extract: string
  thumbnail?: string
  url: string
  lang: string
}

// 응답: {"type":"standard","title":"...","extract":"...","thumbnail":{"source":"https://upload...","width":320,"height":240},
//        "content_urls":{"desktop":{"page":"https://ko.wikipedia.org/wiki/..."}}}
async function fetchSummary(lang: string, title: string): Promise<WikiSummary | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (res.status === 404) return null
    if (!res.ok) throw new HttpError(res.status, url)
    const j = (await res.json()) as {
      type?: string
      title?: string
      extract?: string
      thumbnail?: { source?: string }
      content_urls?: { desktop?: { page?: string } }
    }
    if (!j.extract || j.type === 'disambiguation') return null
    return {
      title: j.title ?? title,
      extract: j.extract,
      thumbnail: j.thumbnail?.source,
      url: j.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      lang,
    }
  } finally {
    clearTimeout(timer)
  }
}

/** 한국어 문서 → 없으면 영어 문서 요약 (7일 캐시) */
export async function getSummary(spot: Spot): Promise<WikiSummary | null> {
  const candidates: [string, string][] = []
  if (spot.koTitle) candidates.push(['ko', spot.koTitle])
  if (spot.enTitle) candidates.push(['en', spot.enTitle])
  if (!candidates.length && spot.wiki && (spot.wiki.lang === 'ko' || spot.wiki.lang === 'en')) candidates.push([spot.wiki.lang, spot.wiki.title])
  for (const [lang, title] of candidates) {
    const r = await cachedJson(`sum:${lang}:${title}`, 7 * DAY, () => fetchSummary(lang, title))
    if (r.data) return r.data
  }
  return null
}

/**
 * 명소를 두 단계로 불러오는 훅: 목록이 오면 바로 보여 주고, 인지도(조회수)는 뒤이어 채운다.
 * 같은 지역을 여러 곳(명소 섹션·여행 계획)에서 불러도 캐시·동시 요청 합치기 덕분에 한 번만 요청한다.
 */
export function useSpots(lat: number, lng: number, radiusKm: number) {
  const base = useAsync((force, signal) => getSpotsBase(lat, lng, radiusKm, force, signal), [lat, lng, radiusKm])
  const baseSpots = base.status === 'success' ? base.data.data.spots : null
  const fame = useAsync(baseSpots ? (force, signal) => getSpotsFame(lat, lng, radiusKm, baseSpots, force, signal) : null, [baseSpots])
  const spots = fame.status === 'success' ? fame.data.data.spots : baseSpots
  return {
    base,
    fame,
    spots,
    famePending: !!baseSpots && fame.status === 'loading',
    fameFailed: fame.status === 'error',
    stale: (base.status === 'success' && base.data.stale) || (fame.status === 'success' && fame.data.stale),
    retry: () => (base.status === 'error' ? base.retry() : fame.retry()),
  }
}

// ---------- 대체 경로: Wikidata 위치 검색 ----------

/** Wikidata 분류 → [종류, 분류, 흥미 가산점] (QID는 2026-11 Wikidata에서 이름 확인) */
const WD_TYPES: Record<string, [string, SpotCategory, number]> = {
  Q8502: ['산', 'nature', 8],
  Q54050: ['언덕', 'nature', 6],
  Q23397: ['호수', 'nature', 12],
  Q34038: ['폭포', 'nature', 20],
  Q40080: ['해변', 'nature', 10],
  Q35509: ['동굴', 'nature', 15],
  Q177380: ['온천', 'nature', 15],
  Q46169: ['국립공원', 'nature', 12],
  Q1286517: ['자연 경관', 'nature', 12],
  Q22698: ['공원', 'nature', 4],
  Q1107656: ['정원', 'nature', 8],
  Q6017969: ['전망 포인트', 'view', 15],
  Q174782: ['광장', 'attraction', 2],
  Q570116: ['관광 명소', 'attraction', 10],
  Q33506: ['박물관', 'museum', 8],
  Q207694: ['미술관', 'museum', 6],
  Q2087181: ['역사 가옥', 'museum', 8],
  Q23413: ['성', 'history', 12],
  Q16560: ['궁전', 'history', 12],
  Q57821: ['요새', 'history', 12],
  Q109607: ['유적', 'history', 12],
  Q839954: ['고고학 유적', 'history', 12],
  Q4989906: ['기념물', 'history', -5],
  Q5393308: ['절', 'history', 8],
  Q845945: ['신사', 'history', 6],
  Q44539: ['사원', 'history', 8],
  Q16970: ['교회', 'history', 4],
  Q160742: ['수도원', 'history', 12],
  Q12280: ['다리', 'history', 3],
}

interface WdRow {
  item: { value: string }
  type: { value: string }
  coord: { value: string }
  dist: { value: string }
  sl: { value: string }
  label?: { value: string }
  koLabel?: { value: string }
  ko?: { value: string }
  en?: { value: string }
}

async function loadBaseWikidata(lat: number, lng: number, radiusKm: number, signal?: AbortSignal): Promise<SpotsResult> {
  const query = `SELECT ?item ?type ?coord ?dist ?sl ?label ?koLabel ?ko ?en WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point(${lng.toFixed(5)} ${lat.toFixed(5)})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "${radiusKm}" .
    bd:serviceParam wikibase:distance ?dist .
  }
  ?item wdt:P31 ?type .
  VALUES ?type { ${Object.keys(WD_TYPES).map((q) => 'wd:' + q).join(' ')} }
  ?item wikibase:sitelinks ?sl .
  OPTIONAL { ?item rdfs:label ?koLabel FILTER(LANG(?koLabel) = "ko") }
  OPTIONAL { ?k schema:about ?item ; schema:isPartOf <https://ko.wikipedia.org/> ; schema:name ?ko }
  OPTIONAL { ?e schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?en }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en,mul,ja,zh,fr,de,es,it,pt,ru,th,vi,id,tr". ?item rdfs:label ?label }
} LIMIT 1500`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30000)
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort)
  let rows: WdRow[]
  try {
    const res = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new HttpError(res.status, res.url)
    rows = ((await res.json()) as { results: { bindings: WdRow[] } }).results.bindings
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }

  const byItem = new Map<string, Spot>()
  for (const r of rows) {
    const q = r.item.value.slice(r.item.value.lastIndexOf('/') + 1)
    const t = WD_TYPES[r.type.value.slice(r.type.value.lastIndexOf('/') + 1)]
    const name = r.label?.value
    const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(r.coord.value)
    if (!t || !m || !name || /^Q\d+$/.test(name)) continue
    const prev = byItem.get(q)
    // 분류가 여러 개면 흥미 가산점이 큰 쪽
    if (prev && prev.interest >= t[2]) continue
    const sitelinks = Number(r.sl.value)
    const koTitle = r.ko?.value
    const enTitle = r.en?.value
    const hasKoEn = !!(koTitle || enTitle)
    byItem.set(q, {
      id: `wd/${q}`,
      name,
      kind: t[0],
      category: t[1],
      lat: Number(m[2]),
      lng: Number(m[1]),
      distKm: Number(r.dist.value),
      koTitle,
      enTitle,
      wikidata: q,
      sitelinks,
      hiddenScore: hasKoEn ? UNKNOWN_VIEWS_SCORE : sitelinks ? scoreFromSitelinks(sitelinks) : NO_WIKI_SCORE,
      interest: t[2] + (r.koLabel ? 3 : 0),
      pending: hasKoEn || undefined,
    })
  }
  const spots = [...byItem.values()]
  for (const s of spots) s.interest += s.hiddenScore + (hasWikiOf(s) ? 15 : 0) - Math.min(10, s.distKm)
  // 인지도 확인 전이라 흥미도로 자르면 유명한 곳이 잘려 나간다 → 가까운 순으로 자른다
  spots.sort((a, b) => a.distKm - b.distKm)
  return { spots: spots.slice(0, 450), fetchedAt: Date.now(), viewsChecked: 0, viewsFailed: 0 }
}
