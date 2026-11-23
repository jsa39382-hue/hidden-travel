import raw from '../data/countries.json'
import type { Country } from '../types'
import { getChoseong } from 'es-hangul'

export const COUNTRIES = raw as Country[]

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]))
export const getCountry = (code: string | null | undefined) => (code ? byCode.get(code) : undefined)

/** 국가 코드 → 국기 이모지 (이미지가 안 뜰 때 대체용) */
export const flagEmoji = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))

/** 키가 필요 없는 국기 이미지 CDN */
export const flagUrl = (code: string, width: 40 | 80 | 160 = 40) =>
  `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`

// 한글 초성 검색 지원
const isChosungOnly = (s: string) => /^[ㄱ-ㅎ]+$/.test(s)

export function searchCountries(query: string): Country[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, '')
  if (!q) return COUNTRIES
  const scored: [number, Country][] = []
  for (const c of COUNTRIES) {
    const ko = c.nameKo.replace(/\s+/g, '')
    const en = c.nameEn.toLowerCase().replace(/\s+/g, '')
    const cap = (c.capitalKo ?? '').replace(/\s+/g, '')
    let score = -1
    if (ko.startsWith(q) || en.startsWith(q) || c.code.toLowerCase() === q) score = 0
    else if (ko.includes(q) || en.includes(q)) score = 1
    else if (isChosungOnly(q) && getChoseong(ko).startsWith(q)) score = 2
    else if (cap.includes(q) || c.currency.toLowerCase() === q || (isChosungOnly(q) && q.length >= 2 && getChoseong(cap).startsWith(q))) score = 3
    if (score >= 0) scored.push([score, c])
  }
  return scored.sort((a, b) => a[0] - b[0]).map(([, c]) => c)
}

/** 자주 찾는 여행지 (빈 검색어일 때 상단 표시) */
export const POPULAR_CODES = ['JP', 'VN', 'TH', 'TW', 'PH', 'US', 'FR', 'IT', 'ES', 'GB', 'AU', 'SG']
