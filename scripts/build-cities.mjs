// Wikidata에서 나라별 주요 도시(인구 10만 이상, 나라당 최대 12곳)를 받아 src/data/cities.wikidata.json으로 저장한다.
// src/data/cities.json(직접 정리한 여행 도시)이 없는 나라에서 숨은 명소 검색 지역·날씨 기준 도시로 쓴다.
// 큰 쿼리 하나는 시간 초과가 나므로 도시 분류별 단순 쿼리 → 상세 정보 일괄 조회로 나눈다.
// 실행: npm run build:cities
import { readFile, writeFile } from 'node:fs/promises'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const UA = 'hidden-travel-build/0.1 (city list generator)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const qid = (uri) => uri.slice(uri.lastIndexOf('/') + 1)
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

async function sparql(query, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ query }),
        signal: AbortSignal.timeout(90_000),
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const json = await res.json()
      await sleep(1100)
      return json.results.bindings
    } catch (e) {
      if (i >= tries) throw e
      console.warn(`  재시도 ${i}/${tries - 1}: ${e.message}`)
      await sleep(3000 * i)
    }
  }
}

// 도시로 볼 분류: 도시, 대도시, 100만 도시, 일본의 시, 특별시·광역시 등
const CITY_TYPES = [
  'Q515', 'Q1637706', 'Q1549591', 'Q200250', 'Q494721', 'Q1093829', 'Q747074', 'Q15661340', 'Q1867183',
  'Q13218690', 'Q5119', 'Q15284', 'Q3957', 'Q484170', 'Q2039348', 'Q1500350', 'Q1062083', 'Q1022059', 'Q15253706',
]
const MIN_POP = 100_000
const PER_COUNTRY = 12

const pops = new Map()
for (const t of CITY_TYPES) {
  try {
    const rows = await sparql(`SELECT ?c ?pop WHERE { ?c wdt:P31 wd:${t} ; wdt:P1082 ?pop . FILTER(?pop >= ${MIN_POP}) }`)
    for (const r of rows) {
      const id = qid(r.c.value)
      pops.set(id, Math.max(pops.get(id) ?? 0, Number(r.pop.value)))
    }
    console.log(`분류 ${t}: ${rows.length}건 (누적 ${pops.size})`)
  } catch (e) {
    console.warn(`분류 ${t} 건너뜀: ${e.message}`)
  }
}

const info = new Map()
for (const part of chunks([...pops.keys()], 250)) {
  const rows = await sparql(`
SELECT ?c ?iso ?ko ?en ?coord WHERE {
  VALUES ?c { ${part.map((id) => 'wd:' + id).join(' ')} }
  ?c wdt:P17 ?country . ?country wdt:P297 ?iso .
  ?c wdt:P625 ?coord .
  OPTIONAL { ?c rdfs:label ?ko FILTER(LANG(?ko)="ko") }
  OPTIONAL { ?c rdfs:label ?en FILTER(LANG(?en)="en") }
}`)
  for (const r of rows) {
    const id = qid(r.c.value)
    if (info.has(id)) continue
    const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(r.coord.value)
    if (!m) continue
    info.set(id, {
      iso: r.iso.value,
      ko: r.ko?.value,
      en: r.en?.value,
      lat: Number(Number(m[2]).toFixed(4)),
      lng: Number(Number(m[1]).toFixed(4)),
    })
  }
  process.stdout.write('.')
}
process.stdout.write('\n')

const countries = JSON.parse(await readFile(new URL('../src/data/countries.json', import.meta.url), 'utf8'))
const valid = new Set(countries.map((c) => c.code))
const clean = (s) =>
  s
    ?.trim()
    .replace(/^City of /i, '')
    .replace(/ (city|City|Métropole|Metropolitan Municipality|Municipality)$/, '')
    .replace(/(특별시|광역시|특별자치시)$/, '')
    .replace(/^도쿄도$/, '도쿄')
    .replace(/ ?시$/, (m, off, str) => (str.length >= 3 ? '' : m))
    .trim()
const km = (a, b) => {
  const r = Math.PI / 180
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r)
  const y = (b.lat - a.lat) * r
  return Math.sqrt(x * x + y * y) * 6371
}

const byCountry = {}
for (const [id, e] of info) {
  if (!valid.has(e.iso)) continue
  const name = clean(e.ko) ?? clean(e.en)
  if (!name || /^Q\d+$/.test(name)) continue
  ;(byCountry[e.iso] ??= []).push({ id, name, nameEn: e.en, lat: e.lat, lng: e.lng, pop: pops.get(id) })
}
for (const [iso, list] of Object.entries(byCountry)) {
  // 같은 이름이거나 10km 안에 있는 중복(행정구역·도시권 항목 등)은 인구가 큰 쪽만 남긴다
  const kept = []
  for (const c of list.sort((a, b) => b.pop - a.pop)) {
    if (kept.some((k) => k.name === c.name || km(k, c) < 10)) continue
    kept.push(c)
    if (kept.length >= PER_COUNTRY) break
  }
  byCountry[iso] = kept.map(({ name, lat, lng, pop }) => ({ name, lat, lng, pop }))
}

await writeFile(new URL('../src/data/cities.wikidata.json', import.meta.url), JSON.stringify(byCountry))
console.log(`저장 완료: ${Object.keys(byCountry).length}개국 ${Object.values(byCountry).reduce((s, l) => s + l.length, 0)}개 도시`)
