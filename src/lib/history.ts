import { DAY, HttpError, cachedJson, fetchJson } from './cache.ts'

/**
 * Open-Meteo 과거 날씨 API (키 없음): 여행 날짜의 '작년 같은 날' 실제 날씨.
 * 응답: {"daily":{"time":["2025-12-10",...],"weather_code":[51,...],"temperature_2m_max":[13.7,...],"temperature_2m_min":[7.0,...],"precipitation_sum":[0.1,...]}}
 */
interface ArchiveRes {
  daily?: {
    time: string[]
    weather_code?: (number | null)[]
    temperature_2m_max?: (number | null)[]
    temperature_2m_min?: (number | null)[]
    precipitation_sum?: (number | null)[]
  }
}

export interface PastDay {
  date: string
  code: number | null
  max: number | null
  min: number | null
  rainMm: number | null
}

/** 최대 16일까지만 본다 */
export const MAX_PAST_DAYS = 16

/** 'YYYY-MM-DD'의 n년 전 같은 날 (2월 29일 → 2월 28일) */
export function yearsBefore(ymd: string, n = 1) {
  const [y, m, d] = ymd.split('-').map(Number)
  const last = new Date(Date.UTC(y - n, m, 0)).getUTCDate()
  return `${y - n}-${String(m).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}

/** 여행 기간 → 작년 같은 기간 (최대 16일) */
export function lastYearRange(start: string, end: string): [string, string] {
  const s = yearsBefore(start)
  const days = Math.round((Date.parse(end) - Date.parse(start)) / DAY)
  const e = new Date(Date.parse(s) + Math.min(Math.max(days, 0), MAX_PAST_DAYS - 1) * DAY).toISOString().slice(0, 10)
  return [s, e]
}

export function toPastDays(r: ArchiveRes): PastDay[] {
  const d = r.daily
  if (!d?.time?.length) return []
  return d.time.map((date, i) => ({
    date,
    code: d.weather_code?.[i] ?? null,
    max: d.temperature_2m_max?.[i] ?? null,
    min: d.temperature_2m_min?.[i] ?? null,
    rainMm: d.precipitation_sum?.[i] ?? null,
  }))
}

/** 요약: 평균 최고·최저, 비 온 날(1mm 이상) 수 */
export function summarize(days: PastDay[]) {
  const nums = (xs: (number | null)[]) => xs.filter((x): x is number => x != null)
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const rain = nums(days.map((d) => d.rainMm))
  return { avgMax: mean(nums(days.map((d) => d.max))), avgMin: mean(nums(days.map((d) => d.min))), rainyDays: rain.filter((x) => x >= 1).length, known: rain.length }
}

async function load(lat: number, lng: number, start: string, end: string): Promise<PastDay[]> {
  const url =
    'https://archive-api.open-meteo.com/v1/archive?' +
    new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      start_date: start,
      end_date: end,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
      timezone: 'auto',
    })
  const days = toPastDays(await fetchJson<ArchiveRes>(url))
  if (!days.length) throw new HttpError(500, url)
  return days
}

/** 작년 같은 기간의 실제 날씨 (지난 기록이라 7일 저장) */
export function getLastYear(lat: number, lng: number, tripStart: string, tripEnd: string, force = false) {
  const [s, e] = lastYearRange(tripStart, tripEnd)
  return cachedJson(`past:v1:${lat.toFixed(2)},${lng.toFixed(2)}:${s}:${e}`, 7 * DAY, () => load(lat, lng, s, e), { force })
}
