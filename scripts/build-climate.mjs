// 위키백과 기후표(Weather box)에서 도시별 월 평균 기온·강수를 받아 src/data/climate.json으로 저장한다.
// 날씨 예보 API(Open-Meteo)가 막혔을 때 '평년 기후'로 대신 보여 주는 데 쓴다.
//  1) 한국어 위키백과에서 도시 이름 → 영어 문서 제목 (좌표가 50km 안에 있는지 확인해 동음이의어를 거른다)
//  2) 영어 문서가 쓰는 기후표 틀(예: Template:Tokyo weatherbox) 또는 본문의 {{Weather box}}를 읽는다
// 실행: npm run build:climate
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'

const UA = 'hidden-travel-build/0.1 (climate table generator; school project)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 받은 응답은 임시 폴더에 저장해 두고, 다시 실행하면 이어서 받는다 (위키백과 요청 한도 대비)
const CACHE = `${tmpdir()}/hidden-travel-climate-cache`
async function api(host, params, tries = 8) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ ...params, format: 'json', formatversion: '2' })
  const file = `${CACHE}/${createHash('sha1').update(url).digest('hex')}.json`
  if (existsSync(file)) return JSON.parse(await readFile(file, 'utf8'))
  await mkdir(CACHE, { recursive: true })
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const json = await res.json()
      await writeFile(file, JSON.stringify(json))
      await sleep(1500)
      return json
    } catch (e) {
      if (i >= tries) throw e
      await sleep(e.message.includes('429') ? 45000 * i : 2000 * i)
    }
  }
}

function distKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// 기후표 안의 "| Jan high C = 9.8" 같은 값을 읽는다 (화씨만 있으면 섭씨로 바꾼다)
function parseBox(text) {
  const start = text.search(/\{\{\s*Weather box/i)
  if (start < 0) return null
  // 중첩 {{ }}를 세어 기후표 끝을 찾는다
  let depth = 0
  let end = start
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') (depth++, i++)
    else if (text[i] === '}' && text[i + 1] === '}') {
      depth--
      i++
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  const box = text.slice(start, end)
  const field = (name) => {
    const m = new RegExp(`\\|\\s*${name}\\s*=\\s*([−\\-–]?[0-9.]+)`, 'i').exec(box)
    return m ? Number(m[1].replace(/[−–]/, '-')) : null
  }
  const series = (keys, conv = (v) => v) =>
    MONTHS.map((mo) => {
      for (const k of keys) {
        const v = field(`${mo} ${k}`)
        if (v != null && Number.isFinite(v)) return Math.round(conv(v) * 10) / 10
      }
      return null
    })
  const fToC = (f) => ((f - 32) * 5) / 9
  const high = series(['high C']).some((v) => v != null) ? series(['high C']) : series(['high F'], fToC)
  const low = series(['low C']).some((v) => v != null) ? series(['low C']) : series(['low F'], fToC)
  const rainMm = series(['precipitation mm', 'rain mm']).some((v) => v != null) ? series(['precipitation mm', 'rain mm']) : series(['precipitation inch', 'rain inch'], (v) => v * 25.4)
  const rainDays = series(['precipitation days', 'rain days'])
  const location = /\|\s*location\s*=\s*([^|\n]+)/i.exec(box.replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>|<ref[^>]*>[^|]*/g, ''))?.[1]?.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1').replace(/\{\{[^}]*\}?\}?/g, '').trim() ?? null
  const full = (a) => a.filter((v) => v != null).length >= 12
  if (!full(high) || !full(low)) return null
  return { location, high, low, rainMm: full(rainMm) ? rainMm : null, rainDays: full(rainDays) ? rainDays : null }
}

const cities = JSON.parse(await readFile(new URL('../src/data/cities.json', import.meta.url), 'utf8'))
const out = { _설명: '위키백과 기후표(Weather box)에서 받은 도시별 월 평균 최고·최저 기온(°C), 강수량(mm), 강수일. 날씨 예보를 못 받을 때·예보 범위 밖일 때 평년 기후로 보여 준다. 출처: 영어 위키백과(CC BY-SA). npm run build:climate로 다시 만든다.', updated: new Date().toISOString().slice(0, 7), countries: {} }
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

// 위키백과 요청 한도를 지키려고 문서를 50개씩 묶어서 묻는다
async function batchQuery(host, titles, params) {
  const pages = []
  for (const part of chunk([...new Set(titles)], 50)) {
    // 목록 값(틀·좌표 등)이 한 번에 다 안 오면 continue로 이어 받아 합친다
    const merged = new Map()
    let cont = {}
    for (let guard = 0; guard < 30; guard++) {
      const r = await api(host, { action: 'query', titles: part.join('|'), redirects: 1, ...params, ...cont })
      for (const x of [...(r.query?.normalized ?? []), ...(r.query?.redirects ?? [])]) pages.push({ alias: x.from, to: x.to })
      for (const pg of r.query?.pages ?? []) {
        const old = merged.get(pg.title)
        if (!old) merged.set(pg.title, pg)
        else for (const k of ['langlinks', 'coordinates', 'templates']) if (pg[k]) old[k] = [...(old[k] ?? []), ...pg[k]]
      }
      if (!r.continue) break
      cont = r.continue
    }
    pages.push(...merged.values())
  }
  // 입력 제목 → 페이지 (정규화·넘겨주기 따라감)
  const byTitle = new Map(pages.filter((p) => p.title).map((p) => [p.title, p]))
  const aliases = new Map(pages.filter((p) => p.alias).map((p) => [p.alias, p.to]))
  return (t) => {
    let cur = t
    for (let i = 0; i < 3 && aliases.has(cur); i++) cur = aliases.get(cur)
    return byTitle.get(cur)
  }
}

const list = Object.entries(cities).filter(([k, v]) => !k.startsWith('_') && Array.isArray(v)).flatMap(([code, l]) => l.map((c) => ({ code, ...c })))
const variantsOf = (name) => {
  const base = name.replace(/\s*\(.*\)\s*/, '')
  const inner = /\(([^)]+)\)/.exec(name)?.[1]
  // '오사카'처럼 동음이의어 문서면 '오사카시'로 다시 찾는다
  return [...new Set([inner, inner && inner + '시', base, base + '시', name].filter(Boolean))]
}

// 1) 한국어 문서 → 영어 제목 (+ 좌표). 좌표가 50km 안이어야 같은 도시로 본다
const ko = await batchQuery('ko.wikipedia.org', list.flatMap((c) => variantsOf(c.name)), { prop: 'langlinks|coordinates', lllang: 'en', lllimit: 'max', colimit: 'max' })
const cand = new Map()
for (const c of list) cand.set(c, variantsOf(c.name).map((v) => ko(v)).filter((p) => p?.langlinks?.[0]?.title))
const enTitles = [...cand.values()].flat().map((p) => p.langlinks[0].title)
console.log('한국어 문서 확인 끝')
const enInfo = await batchQuery('en.wikipedia.org', enTitles, { prop: 'coordinates', colimit: 'max' })
console.log('영어 문서 좌표 확인 끝')
const chosen = new Map()
for (const c of list) {
  for (const p of cand.get(c)) {
    const en = enInfo(p.langlinks[0].title)
    const co = p.coordinates?.[0] ?? en?.coordinates?.[0]
    if (en && co && distKm([co.lat, co.lon], [c.lat, c.lng]) <= 50) {
      chosen.set(c, en.title)
      break
    }
  }
  if (!chosen.has(c)) console.log(`  ${c.code} ${c.name}: 문서 없음/좌표 불일치`)
}

// 2) 영어 본문을 묶어서 받고, 본문에 기후표가 없으면 전용 틀({{Tokyo weatherbox}} 등)을 다시 받는다
async function contents(titles, size) {
  const map = new Map()
  for (const part of chunk([...new Set(titles)], size)) {
    const r = await api('en.wikipedia.org', { action: 'query', titles: part.join('|'), prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: 1 })
    const alias = new Map([...(r.query?.normalized ?? []), ...(r.query?.redirects ?? [])].map((x) => [x.to, x.from]))
    for (const pg of r.query?.pages ?? []) {
      const text = pg.revisions?.[0]?.slots?.main?.content ?? ''
      map.set(pg.title, text)
      if (alias.has(pg.title)) map.set(alias.get(pg.title), text)
    }
    process.stdout.write('.')
  }
  console.log()
  return map
}
const texts = await contents([...chosen.values()], 10)
const ownOf = (t) => {
  const m = /\{\{\s*([^{}|\n]*?(?:weather ?box|climate)[^{}|\n]*?)\s*(?:\||\}\})/i.exec(t ?? '')
  return m && !/^weather box$/i.test(m[1].trim()) ? 'Template:' + m[1].trim() : null
}
const own = new Map([...chosen].map(([c, t]) => [c, /\{\{\s*Weather box/i.test(texts.get(t) ?? '') ? null : ownOf(texts.get(t))]))
const tplTexts = await contents([...own.values()].filter(Boolean), 20)
const sourceOf = new Map([...chosen].map(([c, t]) => [c, own.get(c) ? [own.get(c), t] : [t]]))
for (const [k, v] of tplTexts) texts.set(k, v)

let ok = 0
for (const c of list) {
  const srcs = sourceOf.get(c)
  if (!srcs) continue
  let parsed = null
  let src = null
  for (const t of srcs) {
    parsed = parseBox(texts.get(t) ?? '')
    if (parsed) {
      src = t
      break
    }
  }
  if (!parsed) {
    console.log(`  ${c.code} ${c.name}: 기후표 없음 (${srcs.join(', ')})`)
    continue
  }
  ;(out.countries[c.code] ??= []).push({ name: c.name, lat: c.lat, lng: c.lng, source: `https://en.wikipedia.org/wiki/${encodeURIComponent(src.replace(/ /g, '_'))}`, ...parsed })
  ok++
  console.log(`${c.code} ${c.name} ← ${src} (${parsed.location ?? ''})`)
}

await writeFile(new URL('../src/data/climate.json', import.meta.url), JSON.stringify(out) + '\n')
console.log(`완료: ${ok}/${list.length}개 도시`)
