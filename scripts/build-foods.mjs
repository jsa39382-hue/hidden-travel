// Wikidata에서 나라별 대표 음식(원산지 P495가 그 나라이고 사진 P18이 있는 요리·음식·후식·국)을 받아
// 위키 언어판이 많은(=널리 알려진) 순으로 나라당 10개를 src/data/foods.json에 저장한다. 실행: npm run build:foods
import { readFile, writeFile } from 'node:fs/promises'

const TYPES = ['Q746549', 'Q2095', 'Q19861951', 'Q182940', 'Q41415'] // 요리, 음식, 음식 종류, 후식, 국
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function sparql(query) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch('https://query.wikidata.org/sparql', {
        method: 'POST',
        headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'hidden-travel-build/0.1 (food list)', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ query }),
        signal: AbortSignal.timeout(90_000),
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const j = await res.json()
      await sleep(1100)
      return j.results.bindings
    } catch (e) {
      if (i >= 4) throw e
      console.warn('  재시도', e.message)
      await sleep(3000 * i)
    }
  }
}

const qid = (u) => u.slice(u.lastIndexOf('/') + 1)
const countries = JSON.parse(await readFile(new URL('../src/data/countries.json', import.meta.url), 'utf8'))
const valid = new Set(countries.map((c) => c.code))

// 1) 음식·나라·사진·위키 언어판 수만 (가벼운 쿼리)
const core = new Map() // iso → Map(q → {img, sl})
for (const t of TYPES) {
  let r
  try {
    r = await sparql(`SELECT ?f ?iso ?img ?sl WHERE { ?f wdt:P31 wd:${t} ; wdt:P495 ?c ; wdt:P18 ?img ; wikibase:sitelinks ?sl . ?c wdt:P297 ?iso . }`)
  } catch (e) {
    console.warn(`분류 ${t} 건너뜀: ${e.message}`)
    continue
  }
  console.log(`분류 ${t}: ${r.length}건`)
  for (const x of r) {
    const iso = x.iso.value
    if (!valid.has(iso)) continue
    const m = core.get(iso) ?? new Map()
    const q = qid(x.f.value)
    if (!m.has(q)) m.set(q, { img: x.img.value, sl: Number(x.sl.value) })
    core.set(iso, m)
  }
}

// 2) 나라별 상위 12개만 이름·설명·문서 제목 조회
const top = new Map()
for (const [iso, m] of core) for (const [q, v] of [...m].sort((a, b) => b[1].sl - a[1].sl).slice(0, 12)) top.set(`${iso}:${q}`, { iso, q, ...v })
const ids = [...new Set([...top.values()].map((x) => x.q))]
const info = new Map()
for (let i = 0; i < ids.length; i += 200) {
  const part = ids.slice(i, i + 200)
  const r = await sparql(`SELECT ?f ?ko ?en ?descKo ?descEn ?kowiki ?enwiki WHERE {
  VALUES ?f { ${part.map((q) => 'wd:' + q).join(' ')} }
  OPTIONAL { ?f rdfs:label ?ko FILTER(LANG(?ko) = "ko") }
  OPTIONAL { ?f rdfs:label ?en FILTER(LANG(?en) = "en") }
  OPTIONAL { ?f schema:description ?descKo FILTER(LANG(?descKo) = "ko") }
  OPTIONAL { ?f schema:description ?descEn FILTER(LANG(?descEn) = "en") }
  OPTIONAL { ?k schema:about ?f ; schema:isPartOf <https://ko.wikipedia.org/> ; schema:name ?kowiki }
  OPTIONAL { ?e schema:about ?f ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enwiki }
}`)
  for (const x of r) if (!info.has(qid(x.f.value))) info.set(qid(x.f.value), x)
  process.stdout.write('.')
}
process.stdout.write('\n')

const byCountry = {}
for (const { iso, q, img } of [...top.values()].sort((a, b) => b.sl - a.sl)) {
  const r = info.get(q)
  const name = r?.ko?.value ?? r?.en?.value
  if (!name || /^Q\d+$/.test(name)) continue
  const list = (byCountry[iso] ??= [])
  if (list.length >= 10) continue
  list.push({
    id: q,
    name,
    ...(r.ko && r.en && r.ko.value !== r.en.value ? { nameEn: r.en.value } : {}),
    image: decodeURIComponent(img.slice(img.lastIndexOf('/') + 1)),
    ...(r.descKo || r.descEn ? { desc: (r.descKo ?? r.descEn).value } : {}),
    ...(r.kowiki ? { wiki: 'ko:' + r.kowiki.value } : r.enwiki ? { wiki: 'en:' + r.enwiki.value } : {}),
  })
}
await writeFile(new URL('../src/data/foods.json', import.meta.url), JSON.stringify(byCountry))
console.log(`저장 완료: ${Object.keys(byCountry).length}개국 ${Object.values(byCountry).reduce((s, l) => s + l.length, 0)}개`)
