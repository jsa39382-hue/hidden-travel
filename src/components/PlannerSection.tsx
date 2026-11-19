import { useEffect, useMemo, useState } from 'react'
import type { Country, Place, TripDates } from '../types'
import { useAsync } from '../lib/useAsync'
import { useSpots } from '../lib/spots'
import { getNearby, type Eatery } from '../lib/nearby'
import { getWeather } from '../lib/weather'
import { getHolidaysForYears } from '../lib/holidays'
import { getFestivals } from '../lib/festivals'
import { STYLE_CHIPS, makePlan, parseStyle, planToText, type PlanDay } from '../lib/planner'
import { errorReasonKo } from '../lib/cache'
import { formatKo } from '../lib/dates'
import { googleMapsUrl } from '../lib/osm'
import { describeWeather } from '../lib/weather'
import { ErrorBox, Loading } from './Status'

const KEY = 'hidden-travel:style'
const EXAMPLES = ['사람 적은 자연 위주로 사진 많이 찍고 싶어요', '현지 맛집이랑 카페 위주, 느긋하게', '아이와 함께 박물관·공원, 비 오면 실내', '처음 가는 곳이라 유명한 곳 알차게']

function loadSaved(): { text: string; chips: string[] } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (v && typeof v.text === 'string' && Array.isArray(v.chips)) return v
  } catch {
    /* 무시 */
  }
  return { text: '', chips: [] }
}

export function PlannerSection({ country, place, dates }: { country: Country; place: Place; dates: TripDates }) {
  const saved = useMemo(loadSaved, [])
  const [text, setText] = useState(saved.text)
  const [chips, setChips] = useState<string[]>(saved.chips)
  const [request, setRequest] = useState<{ text: string; chips: string[]; seed: number } | null>(null)
  const [dayEateries, setDayEateries] = useState<Record<string, Eatery[]>>({})
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ text, chips }))
    } catch {
      /* 무시 */
    }
  }, [text, chips])
  useEffect(() => setDayEateries({}), [place.lat, place.lng, dates.start, dates.end])

  const style = useMemo(() => parseStyle(text, chips), [text, chips])
  const toggle = (c: string) => setChips((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]))

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-10 lg:space-y-0">
      <div className="space-y-4 lg:sticky lg:top-28 xl:top-8">
      <div>
        <label htmlFor="style-text" className="mb-1 block text-sm font-medium text-stone-600">
          어떤 여행을 원하세요? 자유롭게 적어 주세요
        </label>
        <textarea
          id="style-text"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`예: ${EXAMPLES[0]}`}
          className="w-full rounded-xl border border-stone-300 p-3 text-base focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.slice(1).map((ex) => (
            <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full border border-stone-200 px-2.5 py-1 text-xs text-stone-500 transition hover:text-stone-800">
              {ex}
            </button>
          ))}
        </div>
      </div>

      <details className="group rounded-xl border border-stone-200 px-4 py-3" open={chips.length > 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm text-stone-600">
          키워드로 고르기{chips.length > 0 && ` · ${chips.length}개 선택`}
          <span className="text-stone-400 transition group-open:rotate-90">›</span>
        </summary>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STYLE_CHIPS.map((c) => {
            const on = chips.includes(c.label)
            return (
              <button
                key={c.label}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c.label)}
                className={`rounded-full px-3 py-1.5 text-sm ring-1 transition ${on ? 'bg-stone-900 text-stone-50 ring-stone-900' : 'text-stone-600 ring-stone-300 hover:ring-stone-500'}`}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </details>

      <div className="border-l-2 border-teal-700 pl-4 text-sm">
        <p className="text-xs text-stone-500">이렇게 이해했어요</p>
        <p className="mt-1 text-stone-800">{style.understood.join(' · ')}</p>
        <p className="mt-1 text-xs text-stone-500">
          하루 {style.pace === 'relaxed' ? '2곳 정도 여유롭게' : style.pace === 'packed' ? '4~5곳 알차게' : '3곳 정도'} · {place.name} 중심 10km ·{' '}
          {formatKo(dates.start)} ~ {formatKo(dates.end)}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setRequest({ text, chips, seed: (request?.seed ?? 0) + (request ? 1 : 0) })}
        className="h-12 w-full rounded-xl bg-stone-900 text-base font-semibold text-stone-50 transition active:opacity-90"
      >
        {request ? '다시 짜기' : '여행 계획 만들기'}
      </button>

      <p className="text-[11px] leading-relaxed text-stone-400">
        키가 필요 없는 공개 데이터(명소·식당, 위키 조회수, 날씨, 공휴일, 축제)를 규칙에 따라 조합해 만든 추천이에요. AI가 쓴 글이 아니며, 영업시간·휴무일은 방문 전에 꼭 확인하세요.
      </p>
      </div>
      <div className="min-w-0">
      {request ? (
        <PlanResult
          country={country}
          place={place}
          dates={dates}
          style={parseStyle(request.text, request.chips)}
          seed={request.seed}
          dayEateries={dayEateries}
          onDayEateries={(d, list) => setDayEateries((m) => ({ ...m, [d]: list }))}
          copied={copied}
          onCopied={() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        />
      ) : (
        <div className="hidden h-full min-h-64 items-center justify-center rounded-2xl border border-dashed border-stone-200 p-8 text-center text-sm text-stone-400 lg:flex">
          왼쪽에 원하는 여행을 적고 &lsquo;여행 계획 만들기&rsquo;를 누르면 여기에 일정표가 나와요.
        </div>
      )}
      </div>
    </div>
  )
}

function PlanResult({
  country,
  place,
  dates,
  style,
  seed,
  dayEateries,
  onDayEateries,
  copied,
  onCopied,
}: {
  country: Country
  place: Place
  dates: TripDates
  style: ReturnType<typeof parseStyle>
  seed: number
  dayEateries: Record<string, Eatery[]>
  onDayEateries: (date: string, list: Eatery[]) => void
  copied: boolean
  onCopied: () => void
}) {
  const sp = useSpots(place.lat, place.lng, 10)
  const nearby = useAsync((force, signal) => getNearby(place.lat, place.lng, force, signal), [place.lat, place.lng])
  const years = [...new Set([Number(dates.start.slice(0, 4)), Number(dates.end.slice(0, 4))])]
  const extra = useAsync(
    async () => {
      // 보조 정보는 실패해도 계획은 만든다
      const [w, h, f] = await Promise.allSettled([getWeather(place.lat, place.lng), getHolidaysForYears(country.code, years), getFestivals(country.code)])
      return {
        weather: w.status === 'fulfilled' ? w.value.data.days : undefined,
        holidays: h.status === 'fulfilled' ? h.value.holidays : [],
        festivals: f.status === 'fulfilled' ? f.value : [],
      }
    },
    [place.lat, place.lng, country.code, years.join(',')],
  )

  const plan = useMemo(() => {
    if (!sp.spots || extra.status !== 'success') return null
    return makePlan({
      spots: sp.spots,
      eateries: nearby.status === 'success' ? nearby.data.data.eateries : [],
      place,
      dates,
      style,
      seed,
      ...extra.data,
      dayEateries,
    })
  }, [sp.spots, nearby, extra, place, dates, style, seed, dayEateries])

  if (sp.base.status === 'error') return <ErrorBox message="명소를 불러오지 못해 계획을 만들 수 없어요." detail={errorReasonKo(sp.base.error)} onRetry={sp.retry} />
  if (!plan) return <Loading label="명소·식당·날씨를 모아 계획을 짜는 중…" />

  const copy = async () => {
    const txt = planToText(plan, place.name, country.nameKo)
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) await navigator.share({ title: '숨은여행 계획', text: txt })
      else await navigator.clipboard.writeText(txt)
      onCopied()
    } catch {
      /* 사용자가 취소 */
    }
  }

  return (
    <div className="space-y-5">
      {sp.famePending && <p className="text-xs text-stone-500">위키 조회수 확인이 끝나면 숨은 정도가 반영돼 계획이 조금 바뀔 수 있어요.</p>}
      {plan.warnings.map((w) => (
        <p key={w} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {w}
        </p>
      ))}

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">추천 여행 리스트</h3>
        <ol className="space-y-1.5">
          {plan.recommended.map((r, i) => (
            <li key={r.spot.id} className="flex gap-2 text-sm">
              <span className="w-5 shrink-0 text-right font-bold text-teal-700">{i + 1}</span>
              <span className="min-w-0">
                <span className="font-medium">{r.spot.name}</span> <span className="text-xs text-stone-500">{r.spot.kind}</span>
                {r.reasons.length > 0 && <span className="block text-xs text-stone-500">{r.reasons.join(' · ')}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">일정표</h3>
          <button type="button" onClick={copy} className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium active:bg-stone-200">
            {copied ? '복사했어요' : '일정 복사·공유'}
          </button>
        </div>
        <div className="space-y-3">
          {plan.days.map((d) => (
            <DayCard key={d.date} day={d} onFindFood={onDayEateries} hasOwnFood={!!dayEateries[d.date]} />
          ))}
        </div>
      </div>
    </div>
  )
}

function DayCard({ day, onFindFood, hasOwnFood }: { day: PlanDay; onFindFood: (date: string, list: Eatery[]) => void; hasOwnFood: boolean }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const missingMeal = day.items.some((it) => (it.kind === 'lunch' || it.kind === 'dinner') && !it.eatery)
  const [wIcon] = describeWeather(day.weather?.code ?? null)
  const findFood = async () => {
    if (!day.centroid) return
    setState('loading')
    try {
      const r = await getNearby(day.centroid[0], day.centroid[1])
      onFindFood(day.date, r.data.eateries)
      setState('idle')
    } catch {
      setState('error')
    }
  }
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-stone-200">
      <div className="flex items-center justify-between bg-stone-50 px-3 py-2">
        <p className="font-bold">
          {day.dayIndex + 1}일차 <span className="text-sm font-normal text-stone-500">{formatKo(day.date)}</span>
        </p>
        {day.weather && (
          <p className="text-xs text-stone-600">
            {wIcon} {day.weather.min != null ? Math.round(day.weather.min) : '-'}° / {day.weather.max != null ? Math.round(day.weather.max) : '-'}° · ☂️ {day.weather.rainProb ?? '-'}%
          </p>
        )}
      </div>
      {day.notes.length > 0 && (
        <ul className="space-y-0.5 border-b border-stone-100 px-3 py-2 text-xs text-stone-600">
          {day.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <ol className="px-3 py-2">
        {day.items.length === 0 && <li className="py-2 text-sm text-stone-500">자유 일정 — 숙소 근처를 산책하거나 쉬어 가세요.</li>}
        {day.items.map((it, i) =>
          it.kind === 'move' ? (
            <li key={i} className="ml-[3.25rem] border-l-2 border-dotted border-stone-200 py-1 pl-3 text-[11px] text-stone-400">
              {it.detail}
            </li>
          ) : (
            <li key={i} className="flex gap-3 py-1.5">
              <span className="w-10 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-stone-500">{it.time}</span>
              <span className="min-w-0 text-sm">
                <span className="font-medium">
                  {it.kind === 'spot' ? '📍' : it.kind === 'cafe' ? '☕' : '🍽️'} {it.kind === 'lunch' ? '점심 · ' : it.kind === 'dinner' ? '저녁 · ' : ''}
                  {it.title}
                </span>
                {it.detail && <span className="block text-xs text-stone-500">{it.detail}</span>}
                {(it.spot || it.eatery) && (
                  <a
                    href={googleMapsUrl((it.spot ?? it.eatery)!.lat, (it.spot ?? it.eatery)!.lng)}
                    target="_blank"
                    rel="noreferrer"
                    className="pr-2 text-[11px] text-teal-700 underline underline-offset-2"
                  >
                    지도에서 보기
                  </a>
                )}
              </span>
            </li>
          ),
        )}
      </ol>
      {missingMeal && day.centroid && !hasOwnFood && (
        <div className="border-t border-stone-100 px-3 py-2">
          <button type="button" onClick={findFood} disabled={state === 'loading'} className="text-xs font-medium text-teal-700 underline underline-offset-2 disabled:opacity-50">
            {state === 'loading' ? '이 날 동선 근처 식당 찾는 중…' : state === 'error' ? '식당 찾기 실패 — 다시 시도' : '이 날 동선 근처 식당 찾아 채우기'}
          </button>
        </div>
      )}
    </div>
  )
}
