import type { Place, TripDates } from '../types'
import { useAsync } from '../lib/useAsync'
import { climateDays, nearestClimate, tripMonths } from '../lib/climate'
import { packingTips } from '../lib/weather'
import { Loading } from './Status'

const MONTH = (m: number) => `${m + 1}월`
const deg = (n: number) => `${Math.round(n)}°`

/** 예보를 못 받았거나 여행이 예보 범위 밖일 때: 위키백과 기후표의 평년 값 */
export function ClimateCard({ place, dates, reason }: { place: Place; dates: TripDates; reason: 'error' | 'range' }) {
  const c = useAsync(() => nearestClimate(place.lat, place.lng), [place.lat, place.lng])
  if (c.status === 'loading' || c.status === 'idle') return <Loading label="평년 기후 찾는 중…" />
  if (c.status === 'error' || !c.data) return reason === 'error' ? <p className="text-xs text-stone-500">이 지역은 평년 기후 자료도 아직 없어요.</p> : null

  const city = c.data
  const months = tripMonths(dates)
  const tips = packingTips(climateDays(city, dates))
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">
          {city.name} 평년 기후 <span className="text-xs font-normal text-stone-500">· 여행하는 달</span>
        </h3>
        <span className="rounded-full border border-amber-500 px-2 py-0.5 text-[11px] font-semibold text-amber-700">예보 아님 · 평균</span>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        {reason === 'error' ? '날씨 예보를 받지 못해 대신 보여 드려요. ' : '여행 날짜가 예보 범위 밖이라 평소 날씨로 미리 알려 드려요. '}
        {city.km > 30 && `가장 가까운 자료가 ${city.name}(약 ${Math.round(city.km)}km)예요.`}
      </p>
      <ul className="mt-4 divide-y divide-stone-100">
        {months.map((m) => (
          <li key={m} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="w-10 font-medium">{MONTH(m)}</span>
            <span className="flex-1">
              낮 <b>{deg(city.high[m])}</b> · 밤 {deg(city.low[m])}
            </span>
            <span className="text-right text-xs text-stone-500">
              {city.rainDays ? `비 오는 날 약 ${Math.round(city.rainDays[m])}일` : ''}
              {city.rainMm ? `${city.rainDays ? ' · ' : ''}${Math.round(city.rainMm[m])}mm` : ''}
            </span>
          </li>
        ))}
      </ul>
      {tips.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-l-2 border-teal-700 pl-4 text-sm text-stone-700">
          {tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-stone-400">
        출처:{' '}
        <a href={city.source} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          위키백과 기후표{city.location ? ` (${city.location})` : ''}
        </a>
      </p>
    </section>
  )
}
