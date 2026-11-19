// Wikidata에서 나라별 여행 기본 정보(콘센트·전압·운전 방향·국가 번호·긴급 전화·공용어)를 받아
// src/data/country-facts.json으로 저장한다. 실행: npm run build:facts
import { readFile, writeFile } from 'node:fs/promises'

const QUERY = `
SELECT ?iso (GROUP_CONCAT(DISTINCT ?plugL; separator="|") AS ?plugs) (MIN(?volt) AS ?voltage)
       (SAMPLE(?drive) AS ?driving) (SAMPLE(?code) AS ?calling)
       (GROUP_CONCAT(DISTINCT ?emL; separator="|") AS ?emergency) (GROUP_CONCAT(DISTINCT ?langL; separator="|") AS ?langs) WHERE {
  ?c wdt:P297 ?iso .
  FILTER NOT EXISTS { ?c wdt:P576 [] }
  OPTIONAL { ?c wdt:P2853 ?plug . ?plug rdfs:label ?plugL FILTER(LANG(?plugL)="en") }
  OPTIONAL { ?c wdt:P2884 ?volt FILTER(?volt >= 90 && ?volt <= 250) }
  OPTIONAL { ?c wdt:P1622 ?d . BIND(IF(?d = wd:Q11920728, "left", "right") AS ?drive) }
  OPTIONAL { ?c wdt:P474 ?code }
  OPTIONAL { ?c wdt:P2852 ?em . ?em rdfs:label ?emL FILTER(LANG(?emL)="en") }
  OPTIONAL { ?c wdt:P37 ?lang . ?lang rdfs:label ?langL FILTER(LANG(?langL)="ko") }
} GROUP BY ?iso`

// 플러그 이름 → 국제 표준 문자(A~O)
const PLUG = {
  'NEMA 1-15': 'A', 'NEMA 5-15': 'B', Europlug: 'C', 'BS 546': 'D', 'Type E': 'E', Schuko: 'F', 'BS 1363': 'G',
  'SI 32': 'H', 'AS/NZS 3112': 'I', 'SEV 1011': 'J', 'Danish plug': 'K', 'Section 107-2-D1': 'K', 'CEI 23-50': 'L',
  'IEC 60906-1': 'N', 'NBR 14136': 'N', 'TIS 166-2549': 'O', 'Type D': 'D', 'Type M': 'M',
}
const plugLetter = (s) => PLUG[s] ?? (/^Type ([A-O])$/.exec(s)?.[1]) ?? null

const res = await fetch('https://query.wikidata.org/sparql', {
  method: 'POST',
  headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'hidden-travel-build/0.1 (country facts)', 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ query: QUERY }),
})
if (!res.ok) throw new Error('Wikidata ' + res.status)
const rows = (await res.json()).results.bindings
const countries = JSON.parse(await readFile(new URL('../src/data/countries.json', import.meta.url), 'utf8'))
const valid = new Set(countries.map((c) => c.code))

const out = {}
for (const r of rows) {
  const iso = r.iso.value
  if (!valid.has(iso)) continue
  const split = (k) => (r[k]?.value ? r[k].value.split('|').filter(Boolean) : [])
  const plugs = [...new Set(split('plugs').map(plugLetter).filter(Boolean))].sort()
  const emergency = [...new Set(split('emergency').filter((x) => /^\d{2,4}$/.test(x)))].sort((a, b) => a.length - b.length || a.localeCompare(b))
  out[iso] = {
    ...(plugs.length ? { plugs } : {}),
    ...(r.voltage ? { voltage: Math.round(Number(r.voltage.value)) } : {}),
    ...(r.driving ? { driving: r.driving.value } : {}),
    ...(r.calling ? { calling: r.calling.value.replace(/\s/g, '') } : {}),
    ...(emergency.length ? { emergency: emergency.slice(0, 5) } : {}),
    ...(split('langs').length ? { languages: split('langs').slice(0, 4) } : {}),
  }
}
await writeFile(new URL('../src/data/country-facts.json', import.meta.url), JSON.stringify(out))
console.log(`저장 완료: ${Object.keys(out).length}개국`)
