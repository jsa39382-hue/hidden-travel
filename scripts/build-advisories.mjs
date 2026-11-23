// 영국 외무부(FCDO) 여행 경보 사본을 src/data/advisories.json으로 저장한다 (인터넷이 안 될 때·시연용).
// 사본을 새로 받으려면 이 스크립트를 실행한 뒤 커밋한다 (자동 배포에 매일 실행을 넣으면 자동으로 갱신된다). 실패하면 이전 사본을 그대로 둔다.
// 응답 (2026-11 실제 호출로 확인): https://www.gov.uk/api/content/foreign-travel-advice/thailand
//   { details: { alert_status: ['avoid_all_but_essential_travel_to_parts'], updated_at, reviewed_at, parts: [{ slug: 'warnings-and-insurance', body: '<html>' }] } }
// 실행: npm run build:advisories
import { readFile, writeFile } from 'node:fs/promises'
import { extractAreas } from '../src/lib/advisoryText.ts'

const src = await readFile(new URL('../src/lib/advisorySlugs.ts', import.meta.url), 'utf8')
const slugs = Object.fromEntries([...src.matchAll(/([A-Z]{2}): (null|'[^']+')/g)].map(([, c, s]) => [c, s === 'null' ? null : s.slice(1, -1)]))
const outFile = new URL('../src/data/advisories.json', import.meta.url)
const prev = JSON.parse(await readFile(outFile, 'utf8').catch(() => '{"countries":{}}'))
const out = { _설명: '영국 외무부(FCDO) 여행 경보 사본. 화면은 먼저 실시간으로 받고, 못 받으면 이 사본을 쓴다. npm run build:advisories로 갱신한다.', fetchedAt: new Date().toISOString(), countries: {} }
let ok = 0
const done = new Map()
for (const [code, slug] of Object.entries(slugs)) {
  if (!slug) continue
  try {
    let d = done.get(slug)
    if (!d) {
      const res = await fetch(`https://www.gov.uk/api/content/foreign-travel-advice/${slug}`, { headers: { 'User-Agent': 'hidden-travel-build/0.1 (school project)' }, signal: AbortSignal.timeout(20000) })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const j = await res.json()
      if (!Array.isArray(j.details?.alert_status)) throw new Error('형식이 달라요')
      const body = j.details.parts?.find((p) => p.slug === 'warnings-and-insurance')?.body ?? ''
      d = { status: j.details.alert_status, updatedAt: j.details.updated_at ?? j.public_updated_at, areas: extractAreas(body) }
      done.set(slug, d)
      await new Promise((r) => setTimeout(r, 300))
    }
    out.countries[code] = d
    ok++
  } catch (e) {
    console.warn(`  ${code}: ${e.message} (이전 사본 유지)`)
    if (prev.countries?.[code]) out.countries[code] = prev.countries[code]
  }
}
if (!ok) {
  console.warn('하나도 받지 못해 파일을 바꾸지 않아요')
  process.exit(0)
}
await writeFile(outFile, JSON.stringify(out, null, 1) + '\n')
console.log(`여행 경보 사본: ${ok}개 나라`)
