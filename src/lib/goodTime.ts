import { HOUR, DAY, cachedJson, fetchJson } from './cache'
import { getWeather, getWeatherMulti, type DayWeather } from './weather'
import { getHolidaysForYears, type Holiday } from './holidays'
import { getFestivals, overlapWithTrip } from './festivals'
import { addDays, isWithin } from './dates'
import type { Country, Place, TripDates } from '../types'

/**
 * '지금 가면 이득' 지수 (0~100)
 *  - 환율 40%: 오늘 1원으로 살 수 있는 현지 돈이 최근 30일 평균보다 많을수록 높음 (Frankfurter 기록)
 *  - 날씨 35%: 여행 기간 예보의 낮 기온이 18~28도에 가깝고 비 확률이 낮을수록 높음 (Open-Meteo, 16일 안일 때만)
 *  - 공휴일 25%: 여행 기간에 쉬는 공휴일(휴무·혼잡)이 적을수록 높음
 * 알 수 없는 항목은 빼고 나머지 비중으로 다시 계산한다.
 */

// Frankfurter(유럽중앙은행 기준환율)가 기록을 주는 통화 (2026-11 실제 응답 기준)
export const FRANKFURTER = new Set('AUD BRL CAD CHF CNY CZK DKK EUR GBP HKD HUF IDR ILS INR ISK JPY MXN MYR NOK NZD PHP PLN RON SEK SGD THB TRY USD ZAR'.split(' '))

interface SeriesRes {
  start_date: string
  end_date: string
  rates: Record<string, Record<string, number>>
}

/** 최근 30일 원화 대비 환율 기록 (6시간 캐시). 응답: {"rates":{"2026-10-20":{"JPY":0.11909,...},...}} */
export function getFxHistory(currencies: string[], force = false) {
  const list = [...new Set(currencies.filter((c) => FRANKFURTER.has(c)))].sort()
  const today = new Date().toISOString().slice(0, 10)
  const start = addDays(today, -30)
  return cachedJson(
    `fxhist:v1:${list.join(',')}`,
    6 * HOUR,
    async () => {
      if (!list.length) return {} as Record<string, number[]>
      const r = await fetchJson<SeriesRes>(`https://api.frankfurter.dev/v1/${start}..${today}?from=KRW&to=${list.join(',')}`)
      const out: Record<string, number[]> = {}
      for (const d of Object.keys(r.rates ?? {}).sort()) for (const [c, v] of Object.entries(r.rates[d])) (out[c] ??= []).push(v)
      return out
    },
    { force },
  )
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

export interface Part {
  score: number | null
  note: string
}

export function fxPart(series?: number[]): Part {
  if (!series || series.length < 5) return { score: null, note: '환율 기록이 없는 통화예요' }
  const avg = series.reduce((a, b) => a + b, 0) / series.length
  const pct = (series[series.length - 1] / avg - 1) * 100
  const s = clamp(50 + pct * 12.5)
  const abs = Math.abs(pct).toFixed(1)
  return {
    score: s,
    note: Math.abs(pct) < 0.3 ? '30일 평균과 거의 같아요' : pct > 0 ? `30일 평균보다 ${abs}% 싸게 바꿀 수 있어요` : `30일 평균보다 ${abs}% 비싸요`,
  }
}

export function weatherPart(days: DayWeather[] | undefined, dates: TripDates): Part {
  if (!days) return { score: null, note: '날씨를 불러오지 못했어요' }
  const trip = (days ?? []).filter((d) => isWithin(d.date, dates.start, dates.end) && d.max != null)
  if (!trip.length) return { score: null, note: '여행 날짜가 아직 예보 범위(16일) 밖이에요' }
  const per = trip.map((d) => {
    const t = d.max!
    const temp = t < 18 ? 100 - (18 - t) * 5 : t > 28 ? 100 - (t - 28) * 7 : 100
    return clamp(temp - (d.rainProb ?? 0) * 0.6)
  })
  const s = clamp(per.reduce((a, b) => a + b, 0) / per.length)
  const avgMax = Math.round(trip.reduce((a, d) => a + d.max!, 0) / trip.length)
  const rainy = trip.filter((d) => (d.rainProb ?? 0) >= 50).length
  return { score: s, note: `낮 평균 ${avgMax}°${rainy ? ` · 비 올 확률 높은 날 ${rainy}일` : ' · 비 소식 적음'}` }
}

export function holidayPart(holidays: Holiday[] | undefined, dates: TripDates): Part {
  if (!holidays) return { score: null, note: '공휴일 정보를 불러오지 못했어요' }
  const off = [...new Set(holidays.filter((h) => h.dayOff && isWithin(h.date, dates.start, dates.end)).map((h) => h.date))]
  return { score: clamp(100 - off.length * 22), note: off.length ? `공휴일 ${off.length}일 — 휴무·혼잡 가능` : '여행 기간에 공휴일이 없어요' }
}

export function combine(parts: { part: Part; weight: number }[]) {
  const known = parts.filter((p) => p.part.score != null)
  if (!known.length) return null
  const w = known.reduce((a, p) => a + p.weight, 0)
  return clamp(known.reduce((a, p) => a + p.part.score! * p.weight, 0) / w)
}

export const grade = (s: number) => (s >= 75 ? '지금이 기회예요' : s >= 60 ? '가기 좋은 때예요' : s >= 45 ? '보통이에요' : '다른 때도 생각해 보세요')

export interface GoodTime {
  total: number | null
  fx: Part
  weather: Part
  holiday: Part
  festivals: string[]
}

export async function getGoodTime(country: Country, place: Place, dates: TripDates): Promise<GoodTime> {
  const years = [...new Set([Number(dates.start.slice(0, 4)), Number(dates.end.slice(0, 4))])]
  const [fx, w, h, f] = await Promise.allSettled([
    getFxHistory([country.currency]),
    getWeather(place.lat, place.lng),
    getHolidaysForYears(country.code, years),
    getFestivals(country.code),
  ])
  const fxP = country.currency === 'KRW' ? { score: null, note: '원화를 쓰는 나라예요' } : fxPart(fx.status === 'fulfilled' ? fx.value.data[country.currency] : undefined)
  const wP = weatherPart(w.status === 'fulfilled' ? w.value.data.days : undefined, dates)
  const hP = holidayPart(h.status === 'fulfilled' ? h.value.holidays : undefined, dates)
  const festivals = f.status === 'fulfilled' ? f.value.filter((x) => overlapWithTrip(x, dates.start, dates.end) === 'date').map((x) => x.name).slice(0, 3) : []
  return {
    total: combine([
      { part: fxP, weight: 40 },
      { part: wP, weight: 35 },
      { part: hP, weight: 25 },
    ]),
    fx: fxP,
    weather: wP,
    holiday: hP,
    festivals,
  }
}

export interface RankRow {
  country: Country
  total: number | null
  fx: Part
  weather: Part
  holiday: Part
}

/** 여러 나라를 같은 날짜로 비교 (환율 1번 + 날씨 1번 + 공휴일 나라별, 모두 캐시) */
export async function rankCountries(list: { country: Country; place: Place }[], dates: TripDates): Promise<RankRow[]> {
  const years = [...new Set([Number(dates.start.slice(0, 4)), Number(dates.end.slice(0, 4))])]
  const [fx, w] = await Promise.allSettled([getFxHistory(list.map((x) => x.country.currency)), getWeatherMulti(list.map((x) => [x.place.lat, x.place.lng]))])
  const hol = await Promise.allSettled(list.map((x) => getHolidaysForYears(x.country.code, years)))
  return list
    .map(({ country }, i) => {
      const fxP = fxPart(fx.status === 'fulfilled' ? fx.value.data[country.currency] : undefined)
      const wP = weatherPart(w.status === 'fulfilled' ? w.value.data[i] : undefined, dates)
      const h = hol[i]
      const hP = holidayPart(h.status === 'fulfilled' ? h.value.holidays : undefined, dates)
      return { country, fx: fxP, weather: wP, holiday: hP, total: combine([{ part: fxP, weight: 40 }, { part: wP, weight: 35 }, { part: hP, weight: 25 }]) }
    })
    .sort((a, b) => (b.total ?? -1) - (a.total ?? -1))
}

export { DAY }
