import { useMemo } from 'react'
import type { Country, Place, TripDates } from '../types'
import { localHHMM, sunTimes, timeZoneFor } from '../lib/sun'
import { formatKo } from '../lib/dates'

/** 여행 기간(최대 4일) 사진 찍기 좋은 골든아워: 일출 직후·일몰 직전 1시간 */
export function GoldenHour({ country, place, dates }: { country: Country; place: Place; dates: TripDates }) {
  // 일출·일몰은 날짜와 좌표로 직접 계산한다 (인터넷 없이, 16일 예보 밖 날짜도)
  const tz = timeZoneFor(country.code, place.lat, place.lng)
  const list = useMemo(() => {
    if (!tz) return []
    const out: { date: string; morning: [string, string]; evening: [string, string] }[] = []
    const d = new Date(`${dates.start}T00:00:00Z`)
    for (let i = 0; i < 4 && d.toISOString().slice(0, 10) <= dates.end; i++, d.setUTCDate(d.getUTCDate() + 1)) {
      const date = d.toISOString().slice(0, 10)
      const s = sunTimes(date, place.lat, place.lng)
      if (!s) continue
      const hm = (t: Date) => localHHMM(t, tz)
      out.push({ date, morning: [hm(s.sunrise), hm(new Date(s.sunrise.getTime() + 3600000))], evening: [hm(new Date(s.sunset.getTime() - 3600000)), hm(s.sunset)] })
    }
    return out
  }, [tz, dates.start, dates.end, place.lat, place.lng])
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">사진 찍기 좋은 골든아워</p>
      {!list.length ? (
        <p className="mt-2 text-sm text-stone-500">이 지역은 일출·일몰을 계산하지 못했어요.</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-stone-200">
            {list.map((g) => (
              <li key={g.date} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="shrink-0 text-stone-500">{formatKo(g.date)}</span>
                {/* 좁은 화면에서는 아침·저녁이 각각 한 줄씩 (시간 중간에서 끊기지 않게) */}
                <span className="flex min-w-0 flex-wrap justify-end gap-x-2 text-right text-[13px] tabular-nums text-amber-700">
                  <span className="whitespace-nowrap">☀ {g.morning[0]}–{g.morning[1]}</span>
                  <span className="whitespace-nowrap">☾ {g.evening[0]}–{g.evening[1]}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-stone-400">{place.name} 현지 시각 · 일출 직후·일몰 직전 약 1시간 (날짜와 좌표로 계산, 오차 1~2분)</p>
        </>
      )}
    </div>
  )
}
