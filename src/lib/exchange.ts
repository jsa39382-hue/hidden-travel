import { HOUR, cachedJson, fetchJson } from './cache'

/** 환율 표. rates[X] = 1원당 X 통화 */
export interface RateTable {
  source: 'frankfurter' | 'er-api'
  /** 기준일(또는 기준 시각, ISO 문자열) */
  basis: string
  rates: Record<string, number>
}

export interface KrwRate {
  currency: string
  /** 1원당 현지 통화 */
  perKrw: number
  /** 1 현지 통화당 원 */
  krwPer: number
  source: RateTable['source']
  sourceLabel: string
  /** 화면 표시용 기준일 문구 */
  basisLabel: string
  /** 데이터를 실제로 받아 온 시각 */
  fetchedAt: number
  /** 네트워크 실패로 만료된 캐시를 보여 주는 중인지 */
  stale: boolean
}

export class NoRateError extends Error {}

// 응답 형식 (2026-11 실제 호출로 확인)
// Frankfurter: {"amount":1.0,"base":"KRW","date":"2026-11-17","rates":{"AUD":0.0011112,...}}
//   ※ api.frankfurter.app은 api.frankfurter.dev/v1로 리디렉트되므로 새 주소를 바로 쓴다.
// open.er-api: {"result":"success","time_last_update_unix":...,"base_code":"KRW","rates":{"KRW":1,...}}
interface FrankfurterRes {
  base: string
  date: string
  rates: Record<string, number>
}
interface ErApiRes {
  result: string
  time_last_update_unix: number
  base_code: string
  rates: Record<string, number>
}

const loadFrankfurter = (force: boolean) =>
  cachedJson<RateTable>(
    'rates:frankfurter:KRW',
    HOUR,
    async () => {
      const r = await fetchJson<FrankfurterRes>('https://api.frankfurter.dev/v1/latest?from=KRW')
      if (!r?.rates || r.base !== 'KRW') throw new Error('Frankfurter 응답 형식이 예상과 달라요')
      return { source: 'frankfurter', basis: r.date, rates: r.rates }
    },
    { force },
  )

const loadErApi = (force: boolean) =>
  cachedJson<RateTable>(
    'rates:erapi:KRW',
    HOUR,
    async () => {
      const r = await fetchJson<ErApiRes>('https://open.er-api.com/v6/latest/KRW')
      if (r?.result !== 'success' || !r.rates) throw new Error('open.er-api 응답 형식이 예상과 달라요')
      return { source: 'er-api', basis: new Date(r.time_last_update_unix * 1000).toISOString(), rates: r.rates }
    },
    { force },
  )

const SOURCE_LABEL: Record<RateTable['source'], string> = {
  frankfurter: 'Frankfurter (유럽중앙은행 기준환율)',
  'er-api': 'ExchangeRate-API (open.er-api.com)',
}

const kstDateTime = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

function basisLabel(t: RateTable) {
  if (t.source === 'frankfurter') {
    const [y, m, d] = t.basis.split('-').map(Number)
    return `${y}년 ${m}월 ${d}일 고시 기준`
  }
  return `${kstDateTime(t.basis)} (한국 시각) 기준`
}

function toKrwRate(currency: string, t: RateTable, fetchedAt: number, stale: boolean): KrwRate | null {
  const perKrw = t.rates[currency]
  if (!(perKrw > 0)) return null
  return {
    currency,
    perKrw,
    krwPer: 1 / perKrw,
    source: t.source,
    sourceLabel: SOURCE_LABEL[t.source],
    basisLabel: basisLabel(t),
    fetchedAt,
    stale,
  }
}

/**
 * 원화 대비 환율을 구한다.
 * Frankfurter(주) → 해당 통화가 없거나 실패하면 open.er-api(백업)로 자동 전환.
 */
export async function getKrwRate(currency: string, force = false): Promise<KrwRate> {
  if (currency === 'KRW') {
    return { currency, perKrw: 1, krwPer: 1, source: 'frankfurter', sourceLabel: '-', basisLabel: '-', fetchedAt: Date.now(), stale: false }
  }
  let firstError: unknown
  try {
    const fr = await loadFrankfurter(force)
    const hit = toKrwRate(currency, fr.data, fr.savedAt, fr.stale)
    if (hit) return hit
  } catch (e) {
    firstError = e
  }
  try {
    const er = await loadErApi(force)
    const hit = toKrwRate(currency, er.data, er.savedAt, er.stale)
    if (hit) return hit
    throw new NoRateError(`${currency} 통화는 무료 환율 API에서 제공하지 않아요.`)
  } catch (e) {
    if (e instanceof NoRateError) throw e
    throw firstError ?? e
  }
}

// ---------- 숫자 표시 도우미 ----------

/** 통화별 소수 자릿수 (JPY 0, USD 2 등) */
export function currencyDigits(currency: string) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

/** 값 크기에 맞춰 적당한 유효숫자로 표시 */
export function formatNumber(n: number, maxDigits = 2) {
  if (!Number.isFinite(n)) return '-'
  const abs = Math.abs(n)
  const digits = abs === 0 ? 0 : abs < 0.01 ? 6 : abs < 1 ? 4 : abs < 100 ? Math.max(maxDigits, 2) : maxDigits
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: digits }).format(n)
}

export const formatKrw = (n: number) => `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: n < 100 ? 2 : 0 }).format(n)}원`

/**
 * 환율 표시 단위. 1단위가 10원도 안 되는 통화(엔, 동, 루피아 등)는
 * 국내 은행처럼 100단위(그래도 1원 미만이면 더 큰 단위)로 보여 준다.
 */
export function displayUnit(krwPer: number) {
  if (krwPer >= 10) return 1
  let unit = 100
  while (krwPer * unit < 10 && unit < 1e9) unit *= 10
  return unit
}

/** 입력 문자열 → 숫자 (쉼표 허용) */
export const parseAmount = (s: string) => {
  const n = Number(s.replace(/,/g, ''))
  return s.trim() === '' || !Number.isFinite(n) ? null : n
}

/** 입력 중인 문자열에 천 단위 쉼표를 넣는다 (소수점 이하는 그대로) */
export function groupInput(raw: string) {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [int, ...rest] = cleaned.split('.')
  const intFmt = int === '' ? (rest.length ? '0' : '') : Number(int).toLocaleString('ko-KR')
  return rest.length ? `${intFmt}.${rest.join('')}` : intFmt
}
