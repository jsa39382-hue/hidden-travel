import { DAY, HttpError, cachedJson } from './cache'
import type { Spot } from './spots'

export interface SpotDetails {
  description?: { text: string; lang: string }
  image?: string
  website?: string
  inception?: string
  heritage?: string[]
  location?: string
  elevation?: number
}

interface Row {
  descKo?: { value: string }
  descEn?: { value: string }
  image?: { value: string }
  website?: { value: string }
  inception?: { value: string }
  heritage?: { value: string; 'xml:lang'?: string }
  loc?: { value: string; 'xml:lang'?: string }
  elev?: { value: string }
}

/** Wikidata에서 명소의 설명·사진·지정 문화재·세운 해·위치·높이·홈페이지 (7일 캐시) */
async function loadWikidata(q: string): Promise<SpotDetails> {
  const query = `SELECT ?descKo ?descEn ?image ?website ?inception ?heritage ?loc ?elev WHERE {
  BIND(wd:${q} AS ?i)
  OPTIONAL { ?i schema:description ?descKo FILTER(LANG(?descKo) = "ko") }
  OPTIONAL { ?i schema:description ?descEn FILTER(LANG(?descEn) = "en") }
  OPTIONAL { ?i wdt:P18 ?image }
  OPTIONAL { ?i wdt:P856 ?website }
  OPTIONAL { ?i wdt:P571 ?inception }
  OPTIONAL { ?i wdt:P1435 ?h . ?h rdfs:label ?heritage FILTER(LANG(?heritage) IN ("ko", "en")) }
  OPTIONAL { ?i wdt:P131 ?l . ?l rdfs:label ?loc FILTER(LANG(?loc) IN ("ko", "en")) }
  OPTIONAL { ?i wdt:P2044 ?elev }
} LIMIT 40`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  let rows: Row[]
  try {
    const res = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ query }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new HttpError(res.status, res.url)
    rows = ((await res.json()) as { results: { bindings: Row[] } }).results.bindings
  } finally {
    clearTimeout(timer)
  }
  const pick = (k: keyof Row) => rows.find((r) => r[k])?.[k]?.value
  // 한국어 이름이 있으면 한국어를 우선
  const pickLang = (k: 'heritage' | 'loc') => {
    const all = rows.map((r) => r[k]).filter((x): x is NonNullable<typeof x> => !!x)
    const ko = [...new Set(all.filter((x) => x['xml:lang'] === 'ko').map((x) => x.value))]
    return ko.length ? ko : [...new Set(all.map((x) => x.value))]
  }
  const descKo = pick('descKo')
  const descEn = pick('descEn')
  const image = pick('image')
  const inception = pick('inception')
  const elev = pick('elev')
  return {
    description: descKo ? { text: descKo, lang: 'ko' } : descEn ? { text: descEn, lang: 'en' } : undefined,
    // Special:FilePath 주소에 width를 붙이면 작은 미리보기 이미지가 온다
    image: image ? `${image.replace(/^http:/, 'https:')}?width=640` : undefined,
    website: pick('website'),
    inception: inception ? formatInception(inception) : undefined,
    heritage: pickLang('heritage').slice(0, 2),
    location: pickLang('loc')[0],
    elevation: elev ? Math.round(Number(elev)) : undefined,
  }
}

function formatInception(v: string) {
  // "1633-01-01T00:00:00Z", 기원전은 "-0500-..."
  const m = /^(-?)0*(\d+)-/.exec(v)
  if (!m) return undefined
  return m[1] ? `기원전 ${m[2]}년` : `${m[2]}년`
}

export function getSpotDetails(spot: Spot) {
  if (!spot.wikidata) return Promise.resolve({ data: {} as SpotDetails, savedAt: Date.now(), stale: false })
  return cachedJson(`detail:${spot.wikidata}`, 7 * DAY, () => loadWikidata(spot.wikidata!))
}
