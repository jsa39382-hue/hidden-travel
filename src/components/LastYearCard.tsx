import type { Place, TripDates } from '../types'
import { useAsync } from '../lib/useAsync'
import { errorReasonKo } from '../lib/cache'
import { formatKo } from '../lib/dates'
import { describeWeather } from '../lib/weather'
import { getLastYear, summarize } from '../lib/history'
import { ErrorBox, Loading } from './Status'

const t = (n: number | null) => (n == null ? '-' : `${Math.round(n)}°`)

/** 예보가 아직 없을 때: 작년 같은 기간에 실제로 어땠는지 (Open-Meteo 과거 날씨) */
export function LastYearCard({ place, dates }: { place: Place; dates: TripDates }) {
  const h = useAsync((force) => getLastYear(place.lat, place.lng, dates.start, dates.end, force), [place.lat, place.lng, dates.start, dates.end])
  if (h.status === 'error') return <ErrorBox message="작년 같은 기간 날씨를 불러오지 못했어요." detail={errorReasonKo(h.error)} onRetry={h.retry} />
  if (h.status !== 'success') return <Loading label="작년 이맘때 날씨 찾는 중…" />
  const days = h.data.data
  const s = summarize(days)
  const year = days[0]?.date.slice(0, 4)
  return (
    <section aria-label="작년 같은 기간 실제 날씨" className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">작년 이맘때 실제 날씨</h3>
        <span className="text-[11px] text-stone-500">{year}년 기록 · 예보 아님</span>
      </div>
      <p className="mt-2 text-sm text-stone-700">
        {s.avgMax != null && s.avgMin != null ? `낮 평균 ${t(s.avgMax)} · 밤 평균 ${t(s.avgMin)}` : '기온 기록 없음'}
        {s.known > 0 && ` · ${days.length}일 중 비 온 날(1mm 이상) ${s.rainyDays}일`}
      </p>
      <ul className="mt-2 divide-y divide-stone-100">
        {days.map((d) => {
          const [icon, label] = describeWeather(d.code)
          return (
            <li key={d.date} className="flex items-center gap-3 py-1.5 text-sm">
              <span className="w-24 shrink-0 text-stone-600">{formatKo(d.date)}</span>
              <span className="w-20 shrink-0" title={label}>
                <span aria-hidden>{icon}</span> <span className="text-xs text-stone-500">{label}</span>
              </span>
              <span className="tabular-nums">
                <span className="text-sky-700">{t(d.min)}</span> / <span className="text-orange-700">{t(d.max)}</span>
              </span>
              {d.rainMm != null && d.rainMm >= 0.1 && <span className="text-xs text-stone-500">☂️ {d.rainMm.toFixed(1)}mm</span>}
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
        작년 같은 날짜에 {place.name}에서 실제로 관측된 날씨예요(기상 재분석 자료). 올해 날씨는 다를 수 있어요. 데이터: Open-Meteo 과거 날씨{h.data.stale ? ' · 저장본' : ''}
      </p>
    </section>
  )
}
