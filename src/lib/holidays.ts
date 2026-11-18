import manualRaw from '../data/holidays.json'
import { DAY, HttpError, cachedJson } from './cache'
import { HOLIDAY_KO } from './holidayNames'

export interface Holiday {
  date: string // YYYY-MM-DD
  name: string // 화면 표시용(가능하면 한국어)
  nameEn?: string
  nameLocal?: string
  /** 전국 공휴일인지 (false면 일부 지역만) */
  nationwide: boolean
  /** 가게 휴무가 많은 '진짜' 공휴일인지 (Observance·Optional 등은 false) */
  dayOff: boolean
}

export interface HolidayResult {
  source: 'nager' | 'manual' | 'none'
  holidays: Holiday[]
  note?: string
  stale?: boolean
}

// Nager.Date 응답 (2026-11 실제 호출로 확인)
// [{"date":"2026-01-01","localName":"元日","name":"New Year's Day","countryCode":"JP","fixed":false,
//   "global":true,"counties":null,"launchYear":null,"types":["Public"]}, ...]
// 지원하지 않는 나라는 204(본문 없음)로 응답한다.
interface NagerHoliday {
  date: string
  localName: string
  name: string
  global: boolean
  counties: string[] | null
  types: string[]
}

type ManualData = Record<string, { note?: string; holidays: { date: string; end?: string; name: string }[] }>
const manual = manualRaw as unknown as ManualData

async function fetchNager(code: string, year: number): Promise<NagerHoliday[] | null> {
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${code}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (res.status === 204 || res.status === 404) return null // 지원하지 않는 나라
    if (!res.ok) throw new HttpError(res.status, url)
    const data = (await res.json()) as NagerHoliday[]
    if (!Array.isArray(data)) throw new Error('공휴일 응답 형식이 예상과 달라요')
    return data
  } finally {
    clearTimeout(timer)
  }
}

function fromNager(list: NagerHoliday[]): Holiday[] {
  // 같은 날 같은 이름이 지역별로 여러 번 오는 경우가 있어 합친다
  const map = new Map<string, Holiday>()
  for (const h of list) {
    const key = h.date + h.name
    const dayOff = h.types.some((t) => t === 'Public' || t === 'Bank')
    const prev = map.get(key)
    const item: Holiday = {
      date: h.date,
      name: HOLIDAY_KO[h.localName] ?? HOLIDAY_KO[h.name] ?? h.name,
      nameEn: h.name,
      nameLocal: h.localName !== h.name ? h.localName : undefined,
      nationwide: h.global,
      dayOff,
    }
    if (prev) {
      prev.nationwide ||= item.nationwide
      prev.dayOff ||= item.dayOff
    } else map.set(key, item)
  }
  return [...map.values()]
}

function fromManual(code: string, year: number): HolidayResult | null {
  const m = manual[code]
  if (!m) return null
  const holidays: Holiday[] = []
  for (const h of m.holidays) {
    const [sm, sd] = h.date.split('-').map(Number)
    const [em, ed] = (h.end ?? h.date).split('-').map(Number)
    for (let t = Date.UTC(year, sm - 1, sd); t <= Date.UTC(year, em - 1, ed); t += 86400000) {
      holidays.push({ date: new Date(t).toISOString().slice(0, 10), name: h.name, nationwide: true, dayOff: true })
    }
  }
  return { source: 'manual', holidays, note: m.note }
}

/** 한 해의 공휴일. Nager.Date(24시간 캐시) → 없으면 직접 정리한 데이터 */
export async function getHolidays(code: string, year: number, force = false): Promise<HolidayResult> {
  const r = await cachedJson(`holidays:${code}:${year}`, DAY, () => fetchNager(code, year), { force })
  if (r.data) return { source: 'nager', holidays: fromNager(r.data), stale: r.stale }
  return fromManual(code, year) ?? { source: 'none', holidays: [] }
}

/** 여러 해(여행이 연말연시에 걸칠 때)를 합쳐서 조회 */
export async function getHolidaysForYears(code: string, years: number[], force = false): Promise<HolidayResult> {
  const results = await Promise.all(years.map((y) => getHolidays(code, y, force)))
  const first = results.find((r) => r.source !== 'none') ?? results[0]
  return {
    source: first.source,
    note: first.note,
    stale: results.some((r) => r.stale),
    holidays: results.flatMap((r) => r.holidays).sort((a, b) => a.date.localeCompare(b.date)),
  }
}
