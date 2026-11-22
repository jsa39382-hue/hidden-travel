import { useEffect, useMemo, useState } from 'react'
import type { Country, Place, TripDates } from '../types'
import type { Spot } from '../lib/spots'
import { planWalk, scheduleWalk, hhmm, type WalkCourse as Course } from '../lib/walk'
import { compassKo, goldenSun, localHHMM, timeZoneFor } from '../lib/sun'
import { formatKo } from '../lib/dates'

/** 현지 시각(분)으로 바꾸기 */
function localMinutes(d: Date, tz: string) {
  const [h, m] = localHHMM(d, tz).split(':').map(Number)
  return h * 60 + m
}

/** 여행 날짜들 (최대 7일) */
function tripDays(dates: TripDates) {
  const out: string[] = []
  const d = new Date(`${dates.start}T00:00:00Z`)
  for (let i = 0; i < 7 && d.toISOString().slice(0, 10) <= dates.end; i++, d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10))
  return out
}

export interface WalkView {
  course: Course
  sun: { from: [number, number]; azimuth: number; label: string } | null
}

/** 숨은 산책 코스: 숨은 명소를 걸어서 잇고, 마지막 장소에 일몰 골든아워에 도착 */
export function WalkCourse({
  country,
  place,
  dates,
  spots,
  likedIds,
  onChange,
  onShowOnMap,
}: {
  country: Country
  place: Place
  dates: TripDates
  spots: Spot[] | null
  likedIds: Set<string>
  onChange: (v: WalkView | null) => void
  onShowOnMap: (s: { id: string; lat: number; lng: number }) => void
}) {
  const days = useMemo(() => tripDays(dates), [dates])
  const [day, setDay] = useState(days[0])
  const [seed, setSeed] = useState(0)
  const tz = timeZoneFor(country.code, place.lat, place.lng)
  const date = days.includes(day) ? day : days[0]

  const view = useMemo((): WalkView | null => {
    if (!spots?.length || !tz) return null
    const route = planWalk(spots, [place.lat, place.lng], { liked: likedIds, seed })
    if (route.length < 2) return null
    const last = route[route.length - 1]
    const g = goldenSun(date, last.lat, last.lng)
    // 마지막 장소에 일몰 30분 전(골든아워 한가운데) 도착, 해를 모르면 17시
    const arriveBy = g ? localMinutes(new Date(g.sunset.getTime() - 30 * 60000), tz) : 17 * 60
    const course = scheduleWalk(route, arriveBy)
    if (!course) return null
    return { course, sun: g ? { from: [last.lat, last.lng], azimuth: g.evening.azimuth, label: `☀ 일몰 방향 · ${compassKo(g.evening.azimuth)}` } : null }
  }, [spots, tz, place.lat, place.lng, likedIds, seed, date])

  // 지도에 코스를 그리도록 위로 알린다
  const key = view ? view.course.stops.map((s) => s.spot.id).join('|') + date : ''
  useEffect(() => {
    onChange(view)
    // 코스(장소 순서·날짜)가 바뀔 때만 알린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => () => onChange(null), []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!spots) return <p className="py-6 text-sm text-stone-500">명소를 찾는 중이에요. 잠시 뒤 코스를 짜 드릴게요.</p>
  if (!tz) return <p className="py-6 text-sm text-stone-500">이 나라는 아직 시간대 정보가 없어 코스를 짤 수 없어요.</p>

  const g = view ? goldenSun(date, view.course.stops.at(-1)!.spot.lat, view.course.stops.at(-1)!.spot.lng) : null
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm leading-relaxed text-stone-600">
          숨은 정도가 높은 명소를 걸어서 잇고, <b className="text-stone-900">마지막 장소에 저녁 골든아워에 도착</b>하도록 출발 시각을 거꾸로 계산했어요.
          {likedIds.size > 0 && ' 관심 목록(♥)에 넣은 곳을 먼저 넣어요.'}
        </p>
        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto" role="group" aria-label="날짜 고르기">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={d === date}
              onClick={() => setDay(d)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${d === date ? 'bg-stone-900 font-semibold text-stone-50' : 'border border-stone-300 text-stone-600'}`}
            >
              {formatKo(d)}
            </button>
          ))}
        </div>
      </div>

      {!view ? (
        <p className="py-4 text-sm text-stone-500">걸어서 이을 만큼 가까운 숨은 명소가 부족해요. 반경을 넓혀 보세요.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="출발" value={hhmm(view.course.start)} />
            <Stat label="걷는 거리" value={`${view.course.totalKm.toFixed(1)}km`} />
            <Stat label="골든아워 도착" value={hhmm(view.course.end)} accent />
          </div>
          <ol className="relative space-y-0 border-l-2 border-dashed border-teal-700/60 pl-5">
            {view.course.stops.map((st, i) => {
              const last = i === view.course.stops.length - 1
              return (
                <li key={st.spot.id} className="relative pb-4 last:pb-0">
                  <span
                    className={`absolute -left-[1.95rem] top-0.5 flex size-6 items-center justify-center rounded-full text-xs font-bold text-stone-50 ${last ? 'bg-amber-500' : 'bg-teal-600'}`}
                    style={{ color: '#0a0a0a' }}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  {i > 0 && <p className="mb-1 text-[11px] text-stone-500">🚶 {st.walkKm.toFixed(1)}km · 약 {st.walkMin}분</p>}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">
                        {likedIds.has(st.spot.id) && <span className="text-rose-600">♥ </span>}
                        {st.spot.name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {st.spot.kind} · 숨은 정도 {st.spot.hiddenScore}
                      </p>
                    </div>
                    <span className="shrink-0 text-right text-sm tabular-nums">
                      {hhmm(st.arrive)}
                      {!last && <span className="block text-[11px] text-stone-500">~{hhmm(st.leave)}</span>}
                    </span>
                  </div>
                  {last && g && (
                    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                      ☀ 일몰 {localHHMM(g.sunset, tz!)} · 해가 <b>{compassKo(g.evening.azimuth)}</b>쪽에 있어요. 해를 등지고({compassKo(g.evening.azimuth + 180)}쪽을 보며) 찍으면 밝게, 해를 바라보면
                      노을 실루엣으로 나와요.
                    </p>
                  )}
                  <button type="button" onClick={() => onShowOnMap(st.spot)} className="mt-1 text-[11px] text-teal-700 underline underline-offset-2">
                    지도에서 보기
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSeed((s) => s + 1)} className="rounded-full border border-stone-300 px-4 py-2 text-sm">
              다른 코스 보기
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-500">
            걷는 거리는 직선거리 × 1.3, 시속 4.5km, 장소마다 25분 머무는 것으로 어림했어요. 일몰은 날짜와 좌표로 계산했어요. 영업시간은 따로 확인해 주세요.
          </p>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-2 py-2.5">
      <p className="text-[11px] text-stone-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${accent ? 'text-amber-700' : ''}`}>{value}</p>
    </div>
  )
}
