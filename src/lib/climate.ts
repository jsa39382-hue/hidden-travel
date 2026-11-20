import type { TripDates } from '../types'
import type { DayWeather } from './weather'
import { distanceKm } from './osm'

/** 위키백과 기후표에서 받은 도시별 월 평균 (scripts/build-climate.mjs가 만든다) */
export interface ClimateCity {
  name: string
  lat: number
  lng: number
  source: string
  location: string | null
  /** 1~12월 평균 최고·최저 기온(°C) */
  high: number[]
  low: number[]
  rainMm: number[] | null
  rainDays: number[] | null
}

let loaded: Promise<ClimateCity[]> | null = null
// 처음 쓸 때만 불러온다 (첫 화면을 가볍게)
function all(): Promise<ClimateCity[]> {
  loaded ??= import('../data/climate.json').then((m) => {
    const file = (m.default ?? m) as unknown as { countries?: Record<string, ClimateCity[]> }
    return Object.values(file.countries ?? {}).flat()
  })
  return loaded
}

/** 가장 가까운 기후표 도시 (maxKm 안에 없으면 null) */
export async function nearestClimate(lat: number, lng: number, maxKm = 250): Promise<(ClimateCity & { km: number }) | null> {
  const list = await all()
  let best: (ClimateCity & { km: number }) | null = null
  for (const c of list) {
    const km = distanceKm([lat, lng], [c.lat, c.lng])
    if (km <= maxKm && (!best || km < best.km)) best = { ...c, km }
  }
  return best
}

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

/** 여행 날짜마다 그 달의 평년 값을 넣은 '가짜 예보' (짐 싸기·좋은 시기 점수 계산에 그대로 쓴다) */
export function climateDays(c: ClimateCity, dates: TripDates): DayWeather[] {
  const out: DayWeather[] = []
  const d = new Date(`${dates.start}T00:00:00Z`)
  const end = new Date(`${dates.end}T00:00:00Z`)
  for (let i = 0; d <= end && i < 60; i++, d.setUTCDate(d.getUTCDate() + 1)) {
    const m = d.getUTCMonth()
    const rainDays = c.rainDays?.[m]
    out.push({
      date: d.toISOString().slice(0, 10),
      code: null,
      max: c.high[m],
      min: c.low[m],
      rainMm: c.rainMm ? c.rainMm[m] / daysInMonth(d.getUTCFullYear(), m) : null,
      // 그 달에 비 오는 날의 비율을 '비 올 확률'로 본다
      rainProb: rainDays != null ? Math.round((rainDays / daysInMonth(d.getUTCFullYear(), m)) * 100) : null,
    })
  }
  return out
}

/** 여행에 걸친 달들 (0~11) */
export function tripMonths(dates: TripDates): number[] {
  const s = new Date(`${dates.start}T00:00:00Z`)
  const e = new Date(`${dates.end}T00:00:00Z`)
  const months: number[] = []
  for (let y = s.getUTCFullYear(), m = s.getUTCMonth(); y < e.getUTCFullYear() || (y === e.getUTCFullYear() && m <= e.getUTCMonth()); m === 11 ? (y++, (m = 0)) : m++) {
    months.push(m)
    if (months.length >= 12) break
  }
  return months
}

/** 기후표 도시를 찾아 여행 날짜의 평년 값으로 (없으면 null) */
export async function climateForTrip(lat: number, lng: number, dates: TripDates) {
  const c = await nearestClimate(lat, lng)
  return c ? { city: c, days: climateDays(c, dates) } : null
}
