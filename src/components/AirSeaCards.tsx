import type { Place, TripDates } from '../types'
import { useAsync } from '../lib/useAsync'
import { errorReasonKo } from '../lib/cache'
import { formatKo, isWithin } from '../lib/dates'
import { AIR_FORECAST_DAYS, airTips, getAirQuality, gradePm10, gradePm25, gradeUv, type Grade } from '../lib/airQuality'
import { getSea, seaState, waterFeel } from '../lib/marine'
import { ErrorBox, Loading } from './Status'

const TONE: Record<Grade['tone'], string> = {
  good: 'bg-teal-50 text-teal-800',
  ok: 'bg-amber-50 text-amber-800',
  bad: 'bg-orange-50 text-orange-800',
  worst: 'bg-rose-50 text-rose-700',
}

function Chip({ g, children }: { g: Grade; children: React.ReactNode }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[g.tone]}`}>{children}</span>
}

/** 여행 기간이 예보 안이면 그 날들, 아니면 앞에서부터 n일 */
function pickDays<T extends { date: string }>(days: T[], dates: TripDates, n: number) {
  const trip = days.filter((d) => isWithin(d.date, dates.start, dates.end))
  return { list: trip.length ? trip : days.slice(0, n), inTrip: trip.length > 0 }
}

/** 미세먼지·초미세먼지·자외선 (Open-Meteo 대기질, 7일 예보) */
export function AirCard({ place, dates }: { place: Place; dates: TripDates }) {
  const a = useAsync((force) => getAirQuality(place.lat, place.lng, force), [place.lat, place.lng])
  if (a.status === 'error') return <ErrorBox message="미세먼지·자외선 예보를 불러오지 못했어요." detail={errorReasonKo(a.error)} onRetry={a.retry} />
  if (a.status !== 'success') return <Loading label="미세먼지·자외선 불러오는 중…" />
  const { data, stale } = a.data
  const { list, inTrip } = pickDays(data, dates, 5)
  const tips = airTips(list)
  return (
    <section aria-label="미세먼지와 자외선" className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">미세먼지 · 자외선</h3>
        <span className="text-[11px] text-stone-500">{inTrip ? '여행 기간 예보' : `여행 날짜는 아직 예보 밖이라 오늘부터 보여 드려요 (예보 ${AIR_FORECAST_DAYS}일)`}</span>
      </div>
      <ul className="mt-3 divide-y divide-stone-100">
        {list.map((d) => (
          <li key={d.date} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
            <span className="w-28 shrink-0 whitespace-nowrap">{formatKo(d.date)}</span>
            {d.pm25 != null && (
              <Chip g={gradePm25(d.pm25)}>
                초미세 {gradePm25(d.pm25).label} {Math.round(d.pm25)}
              </Chip>
            )}
            {d.pm10 != null && (
              <Chip g={gradePm10(d.pm10)}>
                미세 {gradePm10(d.pm10).label} {Math.round(d.pm10)}
              </Chip>
            )}
            {d.uvMax != null && (
              <Chip g={gradeUv(d.uvMax)}>
                자외선 {gradeUv(d.uvMax).label} {Math.round(d.uvMax)}
              </Chip>
            )}
            {d.pm25 == null && d.pm10 == null && d.uvMax == null && <span className="text-xs text-stone-500">값 없음</span>}
          </li>
        ))}
      </ul>
      {tips.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-stone-700">
          {tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
        먼지는 하루 평균(㎍/㎥), 자외선은 하루 최고값이에요. 등급은 한국 환경부(먼지)·WHO(자외선) 기준. 데이터: Open-Meteo 대기질{stale ? ' · 서버에 연결할 수 없어 저장본을 보여 줘요' : ''}{' '}
        <button type="button" onClick={a.retry} className="font-medium text-teal-700 underline underline-offset-2">
          새로고침
        </button>
      </p>
    </section>
  )
}

/** 파고·수온 (Open-Meteo 바다). 내륙이면 아무것도 보여 주지 않는다. */
export function SeaCard({ place, dates }: { place: Place; dates: TripDates }) {
  const s = useAsync((force) => getSea(place.lat, place.lng, force), [place.lat, place.lng])
  if (s.status === 'error') return <ErrorBox message="바다 예보를 불러오지 못했어요." detail={errorReasonKo(s.error)} onRetry={s.retry} />
  if (s.status !== 'success') return <Loading label="바다 상태 불러오는 중…" />
  const { data, stale } = s.data
  if (!data.coastal) return null
  const { list, inTrip } = pickDays(data.days, dates, 5)
  const last = data.days[data.days.length - 1]?.date
  return (
    <section aria-label="바다 상태" className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">🌊 바다 · 물놀이</h3>
        <span className="text-[11px] text-stone-500">{inTrip ? '여행 기간 예보' : `여행 날짜는 아직 예보 밖이라 오늘부터 보여 드려요${last ? ` (${formatKo(last)}까지)` : ''}`}</span>
      </div>
      <ul className="mt-3 divide-y divide-stone-100">
        {list.map((d) => {
          const st = d.wave != null ? seaState(d.wave) : null
          return (
            <li key={d.date} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <span className="w-28 shrink-0 whitespace-nowrap">{formatKo(d.date)}</span>
              {st && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[st.tone]}`}>
                  파도 {d.wave!.toFixed(1)}m · {st.label} · {st.swim}
                </span>
              )}
              {d.water != null && (
                <span className="text-xs text-stone-600">
                  수온 {Math.round(d.water)}° ({waterFeel(d.water)})
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-stone-500">
        {place.name} 앞바다 기준 하루 최고 파고와 수온이에요. 해변마다 파도가 다르니 현지 깃발·안전 요원 안내를 따르세요. 데이터: Open-Meteo 바다{stale ? ' · 저장본' : ''}
      </p>
    </section>
  )
}
