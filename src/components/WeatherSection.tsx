import { useState } from 'react'
import type { Country, Place, TripDates } from '../types'
import { useAsync } from '../lib/useAsync'
import { errorReasonKo } from '../lib/cache'
import { FORECAST_DAYS, describeWeather, getWeather, packingTips, type DayWeather } from '../lib/weather'
import { formatKo, isWithin } from '../lib/dates'
import { ErrorBox, Loading, Notice } from './Status'
import { ClimateCard } from './ClimateCard'
import { AirCard, SeaCard } from './AirSeaCards'
import { LastYearCard } from './LastYearCard'
import { GoldenHour } from './GoldenHour'

const t = (n: number | null) => (n == null ? '-' : `${Math.round(n)}°`)

export function WeatherSection({ country, place, dates }: { country: Country; place: Place; dates: TripDates }) {
  const w = useAsync((force) => getWeather(place.lat, place.lng, force), [place.lat, place.lng])
  const [showAll, setShowAll] = useState(false)

  // 여행 날짜 기준 정보 (예보가 없어도 나오는 것): 평년 기후 + 작년 실제 날씨 + 골든아워
  const preview = (reason: 'error' | 'range') => (
    <section aria-label="여행 기간 미리보기" className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
        여행 기간 미리보기 · {formatKo(dates.start)}~{formatKo(dates.end)}
      </h3>
      <ClimateCard place={place} dates={dates} reason={reason} />
      <LastYearCard place={place} dates={dates} />
      <GoldenHour country={country} place={place} dates={dates} />
    </section>
  )

  if (w.status === 'error')
    return (
      <div className="max-w-2xl space-y-6">
        <ErrorBox message="날씨 예보를 불러오지 못했어요." detail={errorReasonKo(w.error)} onRetry={w.retry} />
        {preview('error')}
        {/* 대기질·바다는 다른 서버라 날씨 예보가 실패해도 따로 보여 준다 */}
        <section aria-label="지금 현지 상황" className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">지금 현지 상황</h3>
          <AirCard place={place} dates={dates} />
          <SeaCard place={place} dates={dates} />
        </section>
      </div>
    )
  if (w.status !== 'success') return <Loading label={`${place.name} 날씨 불러오는 중…`} />

  const { data: weather, stale, savedAt } = w.data
  const days = weather.days
  const last = days[days.length - 1]?.date ?? ''
  const tripDays = days.filter((d) => isWithin(d.date, dates.start, dates.end))
  const tripCovered = tripDays.length > 0
  const tripAfterRange = dates.start > last
  // 기본: 여행 기간이 예보 안이면 여행 기간 + 앞뒤, 아니면 오늘부터 7일
  const firstTrip = days.findIndex((d) => isWithin(d.date, dates.start, dates.end))
  const defaultSlice = tripCovered ? days.slice(Math.max(0, firstTrip - 1), firstTrip + Math.max(tripDays.length + 1, 7)) : days.slice(0, 7)
  const list = showAll ? days : defaultSlice
  const temps = days.flatMap((d) => [d.min, d.max]).filter((x): x is number => x != null)
  const lo = Math.min(...temps)
  const hi = Math.max(...temps)
  const tips = packingTips(tripCovered ? tripDays : days.slice(0, 7))
  const [curIcon, curLabel] = describeWeather(weather.current?.code ?? null)

  const now = (
    <>
      {weather.current && (
        <div className="flex items-center gap-5 rounded-2xl border border-stone-200 bg-white p-5">
          <span className="text-5xl" aria-hidden>
            {curIcon}
          </span>
          <div>
            <p className="text-xs text-stone-500">{place.name} 지금</p>
            <p className="text-4xl font-bold tracking-tight">
              {t(weather.current.temp)} <span className="text-base font-medium">{curLabel}</span>
            </p>
            <p className="mt-1 text-xs text-stone-500">
              습도 {weather.current.humidity ?? '-'}% · 바람 {weather.current.wind != null ? `${(weather.current.wind / 3.6).toFixed(1)}m/s` : '-'} · 현지{' '}
              {weather.current.time.slice(11, 16)} 기준
            </p>
          </div>
        </div>
      )}
      {tripCovered ? (
        <p className="text-sm font-medium text-teal-800">
          ✈️ 여행 기간 {tripDays.length}일의 예보가 있어요.
          {dates.end > last && ` (${formatKo(last)}까지만 예보가 나와 있어요)`}
        </p>
      ) : (
        !tripAfterRange && <Notice>여행 기간이 이미 지났어요. 아래는 지금부터 7일 예보예요.</Notice>
      )}
      {tips.length > 0 && (
        <ul className="space-y-1.5 border-l-2 border-teal-700 pl-4 text-sm text-stone-700">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
      <ul className="divide-y divide-stone-100">
        {list.map((d) => (
          <DayRow key={d.date} d={d} lo={lo} hi={hi} inTrip={isWithin(d.date, dates.start, dates.end)} />
        ))}
      </ul>
      <button type="button" onClick={() => setShowAll((v) => !v)} className="w-full rounded-xl border border-stone-200 py-3 text-sm text-stone-600 active:bg-stone-100">
        {showAll ? '접기' : `${FORECAST_DAYS}일 전체 예보 보기`}
      </button>
      <AirCard place={place} dates={dates} />
      <SeaCard place={place} dates={dates} />
    </>
  )

  return (
    <div className="max-w-2xl space-y-6">
      {tripAfterRange ? (
        <>
          <Notice>
            여행 날짜는 아직 예보 범위 밖이에요 (예보는 {FORECAST_DAYS}일 앞 {formatKo(last)}까지). 여행 날짜 기준 정보를 먼저 보여 드려요.
          </Notice>
          {preview('range')}
          {/* 오늘부터의 예보·미세먼지·바다는 여행 날짜와 무관하므로 접어 둔다 */}
          <details className="group rounded-2xl border border-stone-200 bg-white">
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold">
              지금 현지 상황 <span className="font-normal text-stone-500">· 오늘부터 7일 날씨·미세먼지·바다</span>
              <span className="float-right text-stone-400 group-open:rotate-180" aria-hidden>
                ▾
              </span>
            </summary>
            <div className="space-y-4 border-t border-stone-200 p-4">{now}</div>
          </details>
        </>
      ) : (
        <>
          <section aria-label="날씨 예보" className="space-y-4">
            {now}
          </section>
          <GoldenHour country={country} place={place} dates={dates} />
        </>
      )}

      {stale && <Notice>⚠️ 날씨 서버에 연결할 수 없어 전에 저장해 둔 예보를 보여 주고 있어요.</Notice>}
      <p className="text-xs text-stone-500">
        날씨: Open-Meteo · {place.name} 좌표 기준 · 시간대 {weather.timezone} · 불러온 시각{' '}
        {new Date(savedAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}{' '}
        <button type="button" onClick={w.retry} className="font-medium text-teal-700 underline underline-offset-2">
          새로고침
        </button>
      </p>
    </div>
  )
}

function DayRow({ d, lo, hi, inTrip }: { d: DayWeather; lo: number; hi: number; inTrip: boolean }) {
  const [icon, label] = describeWeather(d.code)
  const span = Math.max(1, hi - lo)
  const left = d.min != null ? ((d.min - lo) / span) * 100 : 0
  const width = d.min != null && d.max != null ? Math.max(4, ((d.max - d.min) / span) * 100) : 0
  return (
    <li className={`flex items-center gap-3 px-2 py-2.5 ${inTrip ? 'rounded-lg bg-teal-50' : ''}`}>
      <div className="w-24 shrink-0 text-sm">
        <p className={inTrip ? 'font-bold text-teal-900' : ''}>{formatKo(d.date)}</p>
        {inTrip && <p className="text-[11px] text-teal-700">여행 중</p>}
      </div>
      <div className="w-16 shrink-0 text-center" title={label}>
        <span className="text-xl" aria-hidden>
          {icon}
        </span>
        <p className="text-[11px] text-stone-500">{label}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm tabular-nums">
          <span className="w-8 text-right text-sky-700">{t(d.min)}</span>
          <div className="relative h-1.5 flex-1 rounded-full bg-stone-100" aria-hidden>
            <div className="absolute h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-orange-400" style={{ left: `${left}%`, width: `${width}%` }} />
          </div>
          <span className="w-8 text-orange-700">{t(d.max)}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-stone-500">
          ☂️ {d.rainProb != null ? `${d.rainProb}%` : '-'}
          {d.rainMm ? ` · ${d.rainMm.toFixed(1)}mm` : ''}
          {d.sunrise && d.sunset && ` · 일출 ${d.sunrise.slice(11, 16)} · 일몰 ${d.sunset.slice(11, 16)}`}
        </p>
      </div>
    </li>
  )
}
