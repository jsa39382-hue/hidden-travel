import { readCache, writeCache, HttpError } from './cache'

/**
 * 키가 필요 없는 MyMemory 번역 API (2026-11 실제 호출로 확인)
 * GET https://api.mymemory.translated.net/get?q=...&langpair=en|ko
 * → {"responseData":{"translatedText":"...","match":0.85},"responseStatus":200,"quotaFinished":false,...}
 * - 한 번에 500자까지 (넘으면 responseStatus 403)
 * - 하루 무료 한도를 넘으면 responseStatus 429와 함께 경고문이 translatedText에 들어온다 → 반드시 걸러야 함
 */
export class TranslateQuotaError extends Error {}

const COUNTRY_LANG: Record<string, string> = {
  JP: 'ja', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW', VN: 'vi', TH: 'th', ID: 'id', MY: 'ms', PH: 'en', KH: 'km', MN: 'mn',
  FR: 'fr', IT: 'it', ES: 'es', DE: 'de', AT: 'de', CH: 'de', PT: 'pt', GR: 'el', CZ: 'cs', TR: 'tr', NL: 'nl', BE: 'fr', PL: 'pl',
  HU: 'hu', HR: 'hr', SE: 'sv', NO: 'no', DK: 'da', FI: 'fi', RU: 'ru', UA: 'uk', BR: 'pt', MX: 'es', AR: 'es', PE: 'es', CL: 'es',
  CO: 'es', AE: 'ar', EG: 'ar', MA: 'fr', IN: 'hi', NP: 'ne', LA: 'lo', MM: 'my', IL: 'he',
}

/** 글자 모양으로 언어를 짐작한다. 라틴 문자는 hint(문서 언어) → 나라 언어 → 영어 */
export function guessLang(text: string, countryCode: string, hint?: string): string | null {
  if (/[가-힣]/.test(text) && !/[぀-ヿ一-鿿]/.test(text)) return null // 이미 한국어
  if (/[぀-ヿ]/.test(text)) return 'ja'
  if (/[一-鿿]/.test(text)) return countryCode === 'JP' ? 'ja' : COUNTRY_LANG[countryCode]?.startsWith('zh') ? COUNTRY_LANG[countryCode] : 'zh-CN'
  if (/[฀-๿]/.test(text)) return 'th'
  if (/[ក-៿]/.test(text)) return 'km'
  if (/[Ѐ-ӿ]/.test(text)) return countryCode === 'MN' ? 'mn' : 'ru'
  if (/[؀-ۿ]/.test(text)) return 'ar'
  if (/[Ͱ-Ͽ]/.test(text)) return 'el'
  if (/[ऀ-ॿ]/.test(text)) return 'hi'
  return hint ?? (COUNTRY_LANG[countryCode] && !COUNTRY_LANG[countryCode].startsWith('zh') && !['ja', 'th', 'km', 'mn', 'ar', 'el', 'hi'].includes(COUNTRY_LANG[countryCode]) ? COUNTRY_LANG[countryCode] : 'en')
}

const enc = new TextEncoder()
/** 문장 단위로 잘라 한 덩어리가 450바이트를 넘지 않게 */
function chunks(text: string): string[] {
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]*\s*/g) ?? [text]
  const out: string[] = []
  let cur = ''
  for (const s of sentences) {
    if (enc.encode(cur + s).length > 450 && cur) {
      out.push(cur.trim())
      cur = ''
    }
    if (enc.encode(s).length > 450) {
      // 아주 긴 문장은 글자 수로 자른다
      let rest = s
      while (rest) {
        let n = rest.length
        while (enc.encode(rest.slice(0, n)).length > 450) n = Math.floor(n * 0.8)
        out.push(rest.slice(0, n).trim())
        rest = rest.slice(n)
      }
    } else cur += s
  }
  if (cur.trim()) out.push(cur.trim())
  return out.filter(Boolean)
}

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0).toString(36)
}

let chain: Promise<unknown> = Promise.resolve()
const queue = <T>(fn: () => Promise<T>) => {
  const p = chain.then(fn, fn)
  chain = p.then(
    () => new Promise((r) => setTimeout(r, 250)),
    () => new Promise((r) => setTimeout(r, 250)),
  )
  return p
}

async function translateChunk(q: string, from: string): Promise<string> {
  const url = 'https://api.mymemory.translated.net/get?' + new URLSearchParams({ q, langpair: `${from}|ko` })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (res.status === 429) throw new TranslateQuotaError('오늘 무료 번역 한도를 다 썼어요')
    if (!res.ok) throw new HttpError(res.status, url)
    const j = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number | string; quotaFinished?: boolean; responseDetails?: string }
    const status = Number(j.responseStatus)
    const t = j.responseData?.translatedText ?? ''
    if (status === 429 || j.quotaFinished || /MYMEMORY WARNING/i.test(t)) throw new TranslateQuotaError('오늘 무료 번역 한도를 다 썼어요')
    if (status !== 200 || !t) throw new Error('번역 서버가 번역하지 못했어요')
    return t
  } finally {
    clearTimeout(timer)
  }
}

/** 한국어로 번역 (30일 캐시). 이미 한국어면 그대로 돌려준다. */
export async function translateToKo(text: string, from: string | null): Promise<string> {
  const t = text.trim()
  if (!t || !from) return t
  const key = `tr:${from}:${hash(t)}`
  const hit = readCache<string>(key, 30 * 24 * 3600 * 1000)
  if (hit) return hit.data
  const parts: string[] = []
  for (const c of chunks(t)) parts.push(await queue(() => translateChunk(c, from)))
  const out = parts.join(' ')
  writeCache(key, out)
  return out
}

/** 한도 초과 등으로 직접 번역하지 못할 때 여는 번역 사이트 링크 (키 불필요) */
export const papagoUrl = (text: string) => `https://papago.naver.com/?sk=auto&tk=ko&st=${encodeURIComponent(text.slice(0, 1500))}`
export const googleTranslateUrl = (text: string) => `https://translate.google.com/?sl=auto&tl=ko&op=translate&text=${encodeURIComponent(text.slice(0, 1500))}`
