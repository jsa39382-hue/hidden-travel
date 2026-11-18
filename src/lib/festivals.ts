import manualRaw from '../data/festivals.json'

export interface Festival {
  name: string
  nameEn?: string
  /** 시작 월(1~12) */
  month: number
  /** 여러 달에 걸칠 때 끝 월 (12→1처럼 해를 넘길 수 있음) */
  endMonth?: number
  /** 매년 같은 날짜일 때 (Wikidata의 '매년 날짜') */
  day?: number
  /** 매년 같은 기간일 때 MM-DD */
  start?: string
  end?: string
  place?: string
  note?: string
  /** 'ko:문서명' 또는 'en:문서명' */
  wiki?: string
  source: 'manual' | 'wikidata'
}

type Raw = Omit<Festival, 'source'>
const manual = manualRaw as unknown as Record<string, Raw[]>

let wikidataCache: Promise<Record<string, Raw[]>> | null = null
/** Wikidata 축제 데이터(약 130KB)는 필요할 때만 따로 불러온다 */
function loadWikidata() {
  wikidataCache ??= import('../data/wikidata-festivals.json').then((m) => (m.default as unknown as { festivals: Record<string, Raw[]> }).festivals)
  return wikidataCache
}

const norm = (s: string) => s.toLowerCase().replace(/[\s·()\-–'’.,]/g, '').replace(/(축제|마쓰리|마츠리|festival|matsuri)/g, '')

export async function getFestivals(code: string): Promise<Festival[]> {
  const mine: Festival[] = (manual[code] ?? []).map((f) => ({ ...f, source: 'manual' as const }))
  let wiki: Festival[] = []
  try {
    wiki = ((await loadWikidata())[code] ?? []).map((f) => ({ ...f, source: 'wikidata' as const }))
  } catch {
    // 파일 로드 실패 시 직접 정리한 데이터만 보여 준다
    wikidataCache = null
  }
  const seen = new Set(mine.flatMap((f) => [norm(f.name), f.nameEn && norm(f.nameEn)].filter(Boolean)))
  const merged = [...mine]
  for (const f of wiki) {
    const keys = [norm(f.name), f.nameEn && norm(f.nameEn)].filter(Boolean) as string[]
    if (keys.some((k) => seen.has(k))) continue
    keys.forEach((k) => seen.add(k))
    merged.push(f)
  }
  return merged
}

/** 축제가 열리는 달 목록 (해를 넘기는 경우 포함) */
export function festivalMonths(f: Festival): number[] {
  const end = f.endMonth ?? f.month
  const out: number[] = []
  for (let m = f.month, i = 0; i < 12; i++, m = (m % 12) + 1) {
    out.push(m)
    if (m === end) break
  }
  return out
}

/** 여행 기간과의 관계: 'date'=날짜가 겹침, 'month'=같은 달(정확한 날짜 모름), null=무관 */
export function overlapWithTrip(f: Festival, start: string, end: string): 'date' | 'month' | null {
  const years = new Set([Number(start.slice(0, 4)), Number(end.slice(0, 4))])
  const ranges: [string, string][] = []
  for (const y of years) {
    const pad = (n: number) => String(n).padStart(2, '0')
    if (f.start && f.end) {
      const crosses = f.end < f.start
      ranges.push([`${y}-${f.start}`, `${crosses ? y + 1 : y}-${f.end}`])
      if (crosses) ranges.push([`${y - 1}-${f.start}`, `${y}-${f.end}`])
    } else if (f.day) {
      const d = `${y}-${pad(f.month)}-${pad(f.day)}`
      ranges.push([d, d])
    }
  }
  if (ranges.length) return ranges.some(([a, b]) => a <= end && b >= start) ? 'date' : null

  // 날짜가 없으면 월 단위로 비교
  const tripMonths = new Set<number>()
  let y = Number(start.slice(0, 4))
  let m = Number(start.slice(5, 7))
  const ey = Number(end.slice(0, 4))
  const em = Number(end.slice(5, 7))
  while ((y < ey || (y === ey && m <= em)) && tripMonths.size < 12) {
    tripMonths.add(m)
    if (m === 12) {
      m = 1
      y++
    } else m++
  }
  return festivalMonths(f).some((m) => tripMonths.has(m)) ? 'month' : null
}

export function festivalWhen(f: Festival): string {
  const md = (s: string) => {
    const [m, d] = s.split('-').map(Number)
    return `${m}월 ${d}일`
  }
  if (f.start && f.end) return f.start === f.end ? md(f.start) : `${md(f.start)} ~ ${md(f.end)}`
  if (f.day) return `매년 ${f.month}월 ${f.day}일`
  if (f.endMonth && f.endMonth !== f.month) return `${f.month}~${f.endMonth}월`
  return `${f.month}월`
}

export function wikiUrl(wiki?: string) {
  if (!wiki) return undefined
  const [lang, ...rest] = wiki.split(':')
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(rest.join(':').replace(/ /g, '_'))}`
}
