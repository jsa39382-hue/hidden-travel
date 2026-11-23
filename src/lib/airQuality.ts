import { HOUR, HttpError, cachedJson, fetchJson } from './cache.ts'

/**
 * Open-Meteo 대기질 API (키 없음): 미세먼지(PM10)·초미세먼지(PM2.5)·자외선 지수 예보.
 * 응답: {"timezone":"Europe/Paris","hourly":{"time":["2026-11-23T00:00",...],"pm2_5":[8.0,...],"pm10":[...],"uv_index":[0.4,...]}}
 * 예보는 오늘부터 7일까지만 나온다.
 */
interface AirRes {
  timezone?: string
  hourly?: { time: string[]; pm2_5?: (number | null)[]; pm10?: (number | null)[]; uv_index?: (number | null)[] }
}

export interface AirDay {
  date: string
  /** 하루 평균 (㎍/㎥) */
  pm25: number | null
  pm10: number | null
  /** 하루 최고 자외선 지수 */
  uvMax: number | null
}

export const AIR_FORECAST_DAYS = 7

const avg = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
}
const max = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  return v.length ? Math.max(...v) : null
}

/** 시간별 값 → 날짜별 (평균·최고) */
export function toAirDays(r: AirRes): AirDay[] {
  const h = r.hourly
  if (!h?.time?.length) return []
  const byDate = new Map<string, number[]>()
  h.time.forEach((t, i) => {
    const d = t.slice(0, 10)
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(i)
  })
  return [...byDate].map(([date, idx]) => ({
    date,
    pm25: avg(idx.map((i) => h.pm2_5?.[i])),
    pm10: avg(idx.map((i) => h.pm10?.[i])),
    uvMax: max(idx.map((i) => h.uv_index?.[i])),
  }))
}

async function load(lat: number, lng: number): Promise<AirDay[]> {
  const url =
    'https://air-quality-api.open-meteo.com/v1/air-quality?' +
    new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      hourly: 'pm2_5,pm10,uv_index',
      timezone: 'auto',
      forecast_days: String(AIR_FORECAST_DAYS),
    })
  const r = await fetchJson<AirRes>(url)
  const days = toAirDays(r)
  if (!days.length) throw new HttpError(500, url)
  return days
}

/** 지점의 7일 대기질 예보 (3시간 캐시, 실패하면 저장본) */
export const getAirQuality = (lat: number, lng: number, force = false) =>
  cachedJson(`air:v1:${lat.toFixed(3)},${lng.toFixed(3)}`, 3 * HOUR, () => load(lat, lng), { force })

export type Grade = { label: string; tone: 'good' | 'ok' | 'bad' | 'worst' }

/** 한국 환경부 예보 기준: 초미세먼지(PM2.5) 좋음 0~15 · 보통 16~35 · 나쁨 36~75 · 매우 나쁨 76~ */
export function gradePm25(v: number): Grade {
  return v <= 15 ? { label: '좋음', tone: 'good' } : v <= 35 ? { label: '보통', tone: 'ok' } : v <= 75 ? { label: '나쁨', tone: 'bad' } : { label: '매우 나쁨', tone: 'worst' }
}
/** 한국 환경부 예보 기준: 미세먼지(PM10) 좋음 0~30 · 보통 31~80 · 나쁨 81~150 · 매우 나쁨 151~ */
export function gradePm10(v: number): Grade {
  return v <= 30 ? { label: '좋음', tone: 'good' } : v <= 80 ? { label: '보통', tone: 'ok' } : v <= 150 ? { label: '나쁨', tone: 'bad' } : { label: '매우 나쁨', tone: 'worst' }
}
/** WHO 자외선 지수: 0~2 낮음 · 3~5 보통 · 6~7 높음 · 8~10 매우 높음 · 11~ 위험 */
export function gradeUv(v: number): Grade {
  const u = Math.round(v)
  return u <= 2 ? { label: '낮음', tone: 'good' } : u <= 5 ? { label: '보통', tone: 'ok' } : u <= 7 ? { label: '높음', tone: 'bad' } : u <= 10 ? { label: '매우 높음', tone: 'worst' } : { label: '위험', tone: 'worst' }
}

/** 기간 안 날씨에 맞춘 준비물 안내 (값이 있는 날만 본다) */
export function airTips(days: AirDay[]): string[] {
  const tips: string[] = []
  const pm25 = max(days.map((d) => d.pm25))
  const pm10 = max(days.map((d) => d.pm10))
  const uv = max(days.map((d) => d.uvMax))
  if ((pm25 != null && pm25 > 35) || (pm10 != null && pm10 > 80)) tips.push('😷 미세먼지 나쁨인 날이 있어요. 마스크(KF80 이상)를 챙기세요.')
  if (uv != null && Math.round(uv) >= 8) tips.push('🧴 자외선이 매우 강해요. 선크림·모자·선글라스를 꼭 챙기세요.')
  else if (uv != null && Math.round(uv) >= 6) tips.push('🧴 자외선이 강한 날이 있어요. 한낮엔 선크림을 덧발라 주세요.')
  return tips
}
