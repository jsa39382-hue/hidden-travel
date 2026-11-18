// Wikidata에서 나라별 축제(festival, Q132241와 그 하위 분류) 중
// 매년 날짜(P837)나 개최 월(P2922)이 정해진 항목을 모아 src/data/wikidata-festivals.json으로 저장한다.
//
// 공휴일은 Wikidata 데이터에 지역 기념일·폐지된 공휴일이 섞여 있어(예: 태국 송끄란 누락) 쓰지 않는다.
// Nager.Date가 지원하지 않는 나라의 공휴일은 src/data/holidays.json에 직접 정리한다.
//
// 브라우저에서 나라별로 바로 조회하면 40~70초가 걸리거나 시간 초과가 나기 때문에(2026-11 실측),
// 미리 받아 둔 파일을 앱에 포함한다. 실행: npm run build:festivals
//
// Wikidata 사용 정책에 맞춰 요청은 하나씩 순서대로 보내고 사이에 간격을 둔다.
import { readFile, writeFile } from 'node:fs/promises'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const UA = 'hidden-travel-build/0.1 (festival list generator)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

const qid = (uri) => uri.slice(uri.lastIndexOf('/') + 1)
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n))

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// "February 11" → [2, 11]
function parseDay(label) {
  const m = /^([A-Z][a-z]+) (\d{1,2})$/.exec(label ?? '')
  if (!m) return null
  const month = MONTHS.indexOf(m[1]) + 1
  return month ? [month, Number(m[2])] : null
}

async function subclasses(root) {
  const rows = await sparql(`SELECT ?t WHERE { ?t wdt:P279* wd:${root} }`)
  return rows.map((r) => qid(r.t.value))
}

/** 분류 목록에 속하면서 날짜 정보가 있는 항목 → Map<qid, {month, day}> */
async function datedItems(types) {
  const out = new Map()
  for (const part of chunks(types, 150)) {
    const values = part.map((t) => 'wd:' + t).join(' ')
    // 조건을 한 쿼리에 다 넣으면 매우 느려지므로 단순한 쿼리 두 개로 나눈다.
    const byMonth = await sparql(`SELECT ?f ?ml WHERE { VALUES ?t { ${values} } ?f wdt:P31 ?t ; wdt:P2922 ?m . ?m rdfs:label ?ml FILTER(LANG(?ml)="en") }`)
    for (const r of byMonth) {
      const month = MONTHS.indexOf(r.ml.value) + 1
      if (month && !out.has(qid(r.f.value))) out.set(qid(r.f.value), { month })
    }
    const byDay = await sparql(`SELECT ?f ?dl WHERE { VALUES ?t { ${values} } ?f wdt:P31 ?t ; wdt:P837 ?d . ?d rdfs:label ?dl FILTER(LANG(?dl)="en") }`)
    for (const r of byDay) {
      const md = parseDay(r.dl.value)
      if (md) out.set(qid(r.f.value), { month: md[0], day: md[1] })
    }
    process.stdout.write('.')
  }
  process.stdout.write('\n')
  return out
}

/** 항목별 나라 코드·이름·위키 문서·장소 */
async function details(ids) {
  const info = new Map()
  for (const part of chunks(ids, 200)) {
    const values = part.map((t) => 'wd:' + t).join(' ')
    const rows = await sparql(`
SELECT ?f ?iso ?ko ?en ?kowiki ?enwiki ?placeKo ?placeEn WHERE {
  VALUES ?f { ${values} }
  ?f wdt:P17 ?c . ?c wdt:P297 ?iso .
  OPTIONAL { ?f rdfs:label ?ko FILTER(LANG(?ko)="ko") }
  OPTIONAL { ?f rdfs:label ?en FILTER(LANG(?en)="en") }
  OPTIONAL { ?kw schema:about ?f ; schema:isPartOf <https://ko.wikipedia.org/> ; schema:name ?kowiki }
  OPTIONAL { ?ew schema:about ?f ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enwiki }
  OPTIONAL { ?f wdt:P276 ?p . OPTIONAL { ?p rdfs:label ?placeKo FILTER(LANG(?placeKo)="ko") } OPTIONAL { ?p rdfs:label ?placeEn FILTER(LANG(?placeEn)="en") } }
}`)
    for (const r of rows) {
      const id = qid(r.f.value)
      const v = (k) => r[k]?.value
      const e = info.get(id) ?? { countries: new Set() }
      e.countries.add(v('iso'))
      e.ko ??= v('ko')
      e.en ??= v('en')
      e.kowiki ??= v('kowiki')
      e.enwiki ??= v('enwiki')
      e.place ??= v('placeKo') ?? v('placeEn')
      info.set(id, e)
    }
    process.stdout.write('.')
  }
  process.stdout.write('\n')
  return info
}

async function collect(label, root) {
  console.log(`[${label}] 하위 분류 조회`)
  const types = await subclasses(root)
  console.log(`[${label}] 분류 ${types.length}개 → 날짜 있는 항목 조회`)
  const dated = await datedItems(types)
  console.log(`[${label}] 날짜 있는 항목 ${dated.size}개 → 상세 조회`)
  const info = await details([...dated.keys()])
  return { dated, info }
}

const countries = JSON.parse(await readFile(new URL('../src/data/countries.json', import.meta.url), 'utf8'))
const valid = new Set(countries.map((c) => c.code))

const result = { generatedAt: new Date().toISOString().slice(0, 10), festivals: {} }

function add(bucket, dated, info) {
  for (const [id, date] of dated) {
    const e = info.get(id)
    if (!e) continue
    const name = e.ko ?? e.en
    if (!name || /^Q\d+$/.test(name)) continue
    for (const iso of e.countries) {
      if (!valid.has(iso)) continue
      const item = { id, name, ...(e.ko && e.en && e.ko !== e.en ? { nameEn: e.en } : {}), ...date }
      if (e.place) item.place = e.place
      if (e.kowiki) item.wiki = 'ko:' + e.kowiki
      else if (e.enwiki) item.wiki = 'en:' + e.enwiki
      ;(bucket[iso] ??= []).push(item)
    }
  }
  for (const list of Object.values(bucket)) list.sort((a, b) => a.month - b.month || (a.day ?? 0) - (b.day ?? 0) || a.name.localeCompare(b.name, 'ko'))
}

const fest = await collect('축제', 'Q132241')
add(result.festivals, fest.dated, fest.info)

await writeFile(new URL('../src/data/wikidata-festivals.json', import.meta.url), JSON.stringify(result))
const count = (o) => Object.values(o).reduce((s, l) => s + l.length, 0)
console.log(`저장 완료: 축제 ${count(result.festivals)}개(${Object.keys(result.festivals).length}개국)`)
