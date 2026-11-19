import { useEffect, useMemo, useState } from 'react'
import type { Country, TripDates } from '../types'
import { useAsync } from '../lib/useAsync'
import { getHolidaysForYears, type Holiday } from '../lib/holidays'
import { festivalWhen, getFestivals, overlapWithTrip, wikiUrl, type Festival } from '../lib/festivals'
import { formatKo, isWithin } from '../lib/dates'
import { errorReasonKo } from '../lib/cache'
import { ErrorBox, Loading, Notice } from './Status'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

export function CalendarSection({ country, dates }: { country: Country; dates: TripDates }) {
  const [view, setView] = useState(dates.start.slice(0, 7)) // YYYY-MM
  useEffect(() => setView(dates.start.slice(0, 7)), [dates.start, country.code])

  const viewYear = Number(view.slice(0, 4))
  const years = [...new Set([Number(dates.start.slice(0, 4)), Number(dates.end.slice(0, 4)), viewYear])].sort()
  const yearsKey = years.join(',')

  const hol = useAsync((force) => getHolidaysForYears(country.code, years, force), [country.code, yearsKey])
  const fest = useAsync(() => getFestivals(country.code), [country.code])

  return (
    <div className="space-y-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10 lg:space-y-0">
      <div className="space-y-5">
      {hol.status === 'error' ? (
        <ErrorBox message="공휴일을 불러오지 못했어요." detail={errorReasonKo(hol.error)} onRetry={hol.retry} />
      ) : hol.status !== 'success' ? (
        <Loading label="공휴일 불러오는 중…" />
      ) : (
        <>
          <TripHolidays holidays={hol.data.holidays} dates={dates} />
          <MonthCalendar
            view={view}
            setView={setView}
            holidays={hol.data.holidays}
            festivals={fest.status === 'success' ? fest.data : []}
            dates={dates}
          />
          {hol.data.stale && <Notice>⚠️ 공휴일 서버에 연결할 수 없어 전에 저장해 둔 정보를 보여 주고 있어요.</Notice>}
          <p className="text-xs text-stone-500">
            {hol.data.source === 'nager' && '공휴일 출처: Nager.Date'}
            {hol.data.source === 'manual' && `공휴일 출처: 직접 정리한 고정 공휴일. ${hol.data.note ?? ''}`}
            {hol.data.source === 'none' && '이 나라는 무료 공휴일 데이터가 없어요. 현지 관광청 정보를 확인해 주세요.'}
          </p>
        </>
      )}

      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">축제·행사</h3>
        {fest.status === 'error' ? (
          <ErrorBox message="축제 정보를 불러오지 못했어요." detail={errorReasonKo(fest.error)} onRetry={fest.retry} />
        ) : fest.status !== 'success' ? (
          <Loading label="축제 정보 불러오는 중…" />
        ) : (
          <FestivalList festivals={fest.data} dates={dates} />
        )}
      </div>
    </div>
  )
}

function TripHolidays({ holidays, dates }: { holidays: Holiday[]; dates: TripDates }) {
  const inTrip = holidays.filter((h) => isWithin(h.date, dates.start, dates.end))
  if (!inTrip.length)
    return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">✅ 여행 기간에 걸리는 공휴일이 없어요.</p>
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="font-bold text-amber-900">⚠️ 여행 기간에 공휴일이 {new Set(inTrip.map((h) => h.date)).size}일 있어요</p>
      <p className="mt-0.5 text-xs text-amber-800">가게 휴무·혼잡 가능 — 식당·상점이 문을 닫거나 교통·관광지가 붐빌 수 있어요.</p>
      <ul className="mt-2 space-y-1 text-sm text-amber-900">
        {inTrip.map((h) => (
          <li key={h.date + h.name} className="flex flex-wrap gap-x-2">
            <span className="font-medium tabular-nums">{formatKo(h.date)}</span>
            <span>{h.name}</span>
            {!h.nationwide && <span className="text-xs text-amber-700">(일부 지역)</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MonthCalendar({
  view,
  setView,
  holidays,
  festivals,
  dates,
}: {
  view: string
  setView: (v: string) => void
  holidays: Holiday[]
  festivals: Festival[]
  dates: TripDates
}) {
  const [y, m] = view.split('-').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const shift = (d: number) => {
    const t = new Date(Date.UTC(y, m - 1 + d, 1))
    setView(`${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}`)
  }

  const byDate = useMemo(() => {
    const map = new Map<string, Holiday[]>()
    holidays.forEach((h) => map.set(h.date, [...(map.get(h.date) ?? []), h]))
    return map
  }, [holidays])

  // 매년 같은 날짜인 축제만 달력에 점으로 표시
  const festByDay = useMemo(() => {
    const map = new Map<number, Festival[]>()
    for (const f of festivals) {
      if (f.day && f.month === m) map.set(f.day, [...(map.get(f.day) ?? []), f])
      else if (f.start && f.end && !(f.end < f.start)) {
        const [sm, sd] = f.start.split('-').map(Number)
        const [em, ed] = f.end.split('-').map(Number)
        if (sm <= m && em >= m)
          for (let d = sm === m ? sd : 1; d <= (em === m ? ed : 31); d++) map.set(d, [...(map.get(d) ?? []), f])
      }
    }
    return map
  }, [festivals, m])

  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const monthHolidays = holidays.filter((h) => h.date.startsWith(view))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="이전 달" className="rounded-lg px-3 py-2 text-lg active:bg-stone-100">
          ‹
        </button>
        <p className="font-bold">
          {y}년 {m}월
        </p>
        <button type="button" onClick={() => shift(1)} aria-label="다음 달" className="rounded-lg px-3 py-2 text-lg active:bg-stone-100">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs" role="grid" aria-label={`${y}년 ${m}월 달력`}>
        {WEEK.map((w, i) => (
          <div key={w} className={`pb-1 font-medium ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-600' : 'text-stone-400'}`}>
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d == null) return <div key={'e' + i} />
          const date = `${view}-${pad(d)}`
          const hs = byDate.get(date)
          const fs = festByDay.get(d)
          const inTrip = isWithin(date, dates.start, dates.end)
          const isStart = date === dates.start
          const isEnd = date === dates.end
          const dow = i % 7
          const color = hs?.some((h) => h.dayOff) ? 'text-rose-600 font-bold' : dow === 0 ? 'text-rose-500' : dow === 6 ? 'text-sky-600' : 'text-stone-800'
          return (
            <div
              key={date}
              title={[...(hs ?? []).map((h) => h.name), ...(fs ?? []).map((f) => f.name)].join(', ') || undefined}
              className={`relative flex h-11 flex-col items-center justify-center ${inTrip ? 'bg-teal-100' : ''} ${isStart ? 'rounded-l-full' : ''} ${isEnd ? 'rounded-r-full' : ''}`}
            >
              <span className={`text-sm tabular-nums ${color}`}>{d}</span>
              <span className="mt-0.5 flex h-1.5 gap-0.5">
                {hs && <span className="size-1.5 rounded-full bg-rose-500" />}
                {fs && <span className="size-1.5 rounded-full bg-amber-500" />}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-5 rounded-full bg-teal-100" /> 여행 기간
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-rose-500" /> 공휴일
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-amber-500" /> 축제(날짜 고정)
        </span>
      </div>

      <ul className="mt-3 space-y-1.5 text-sm">
        {monthHolidays.length === 0 && <li className="text-stone-400">이 달에는 공휴일이 없어요.</li>}
        {monthHolidays.map((h) => (
          <li key={h.date + h.name} className="flex gap-3">
            <span className="w-24 shrink-0 tabular-nums text-stone-500">{formatKo(h.date)}</span>
            <span>
              <span className={h.dayOff ? 'font-medium' : ''}>{h.name}</span>
              {h.nameLocal && <span className="ml-1 text-xs text-stone-400">{h.nameLocal}</span>}
              {!h.nationwide && <span className="ml-1 text-xs text-stone-400">· 일부 지역</span>}
              {!h.dayOff && <span className="ml-1 text-xs text-stone-400">· 기념일(쉬지 않음)</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FestivalList({ festivals, dates }: { festivals: Festival[]; dates: TripDates }) {
  const [showAll, setShowAll] = useState(false)
  const [showRest, setShowRest] = useState(false)
  const [showAllDuring, setShowAllDuring] = useState(false)
  const withOverlap = festivals.map((f) => ({ f, o: overlapWithTrip(f, dates.start, dates.end) }))
  // 날짜가 확실히 겹치는 것 → 직접 정리한 것 → 위키 문서가 있는 것 순
  const during = withOverlap
    .filter((x) => x.o)
    .sort((a, b) => (a.o === 'date' ? 0 : 1) - (b.o === 'date' ? 0 : 1) || rank(a.f) - rank(b.f))
  const shownDuring = showAllDuring ? during : during.slice(0, 8)
  // 전체 목록: 직접 정리한 것과 위키 문서가 있는 것을 먼저
  const rest = withOverlap
    .filter((x) => !x.o)
    .sort((a, b) => a.f.month - b.f.month || rank(a.f) - rank(b.f))
  const shownRest = showAll ? rest : rest.filter((x) => rank(x.f) < 2).slice(0, 12)

  if (!festivals.length)
    return <p className="text-sm text-stone-500">이 나라의 축제 정보가 아직 없어요. `src/data/festivals.json`에 추가할 수 있어요.</p>

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-teal-800">여행 기간에 열리는 축제 {during.length}개</p>
        {during.length === 0 ? (
          <p className="text-sm text-stone-500">여행 기간과 겹치는 축제 정보가 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {shownDuring.map(({ f, o }) => (
              <FestivalItem key={f.name + f.month} f={f} highlight={o} />
            ))}
          </ul>
        )}
        {shownDuring.length < during.length && (
          <button type="button" onClick={() => setShowAllDuring(true)} className="mt-2 text-sm font-medium text-teal-700 underline underline-offset-2">
            {during.length - shownDuring.length}개 더 보기
          </button>
        )}
      </div>

      {rest.length > 0 && !showRest && (
        <button type="button" onClick={() => setShowRest(true)} className="w-full rounded-xl border border-stone-200 py-3 text-sm text-stone-600 active:bg-stone-100">
          다른 달의 축제 보기 ({rest.length})
        </button>
      )}
      {rest.length > 0 && showRest && (
        <div>
          <p className="mb-2 text-sm font-medium text-stone-600">다른 달의 축제</p>
          <ul className="space-y-2">
            {shownRest.map(({ f }) => (
              <FestivalItem key={f.name + f.month} f={f} />
            ))}
          </ul>
          {shownRest.length < rest.length && (
            <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-sm font-medium text-teal-700 underline underline-offset-2">
              전체 {rest.length}개 보기
            </button>
          )}
        </div>
      )}
      <p className="text-xs text-stone-500">축제 출처: Wikidata(매년 날짜·개최 월이 있는 항목)와 직접 정리한 주요 축제. 정확한 일정은 방문 전 공식 사이트에서 확인하세요.</p>
    </div>
  )
}

const rank = (f: Festival) => (f.source === 'manual' ? 0 : f.wiki ? 1 : 2)

function FestivalItem({ f, highlight }: { f: Festival; highlight?: 'date' | 'month' | null }) {
  const url = wikiUrl(f.wiki)
  return (
    <li className={`rounded-xl px-3 py-2.5 ${highlight ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-stone-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="underline decoration-stone-300 underline-offset-2">
              {f.name}
            </a>
          ) : (
            f.name
          )}
          {f.nameEn && f.nameEn !== f.name && <span className="ml-1 text-xs font-normal text-stone-400">{f.nameEn}</span>}
        </p>
        <span className="shrink-0 text-xs font-medium text-stone-500">{festivalWhen(f)}</span>
      </div>
      {(f.place || f.note || highlight) && (
        <p className="mt-0.5 text-xs text-stone-500">
          {[f.place && `📍 ${f.place}`, f.note, highlight === 'month' && '같은 달 개최(정확한 날짜는 확인 필요)', highlight === 'date' && '여행 날짜와 겹쳐요']
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </li>
  )
}
