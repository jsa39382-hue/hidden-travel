import { useEffect, useState, type ReactNode } from 'react'
import { CountryPicker } from './components/CountryPicker'
import { DateRange } from './components/DateRange'
import { Flag } from './components/Flag'
import { ExchangeCalculator } from './components/ExchangeCalculator'
import { CalendarSection } from './components/CalendarSection'
import { BudgetCalculator } from './components/BudgetCalculator'
import { PlacePicker } from './components/PlacePicker'
import { SpotsSection } from './components/SpotsSection'
import { WeatherSection } from './components/WeatherSection'
import { PlannerSection } from './components/PlannerSection'
import { TipsSection } from './components/TipsSection'
import { SectionBoundary } from './components/SectionBoundary'
import { OfflineBanner } from './components/OfflineBanner'
import { Diagnostics } from './components/Diagnostics'
import { Icon } from './components/Icon'
import { cacheSizeKb, clearCache } from './lib/cache'
import { useTripState } from './lib/tripState'
import { diffDays, formatKo } from './lib/dates'
import { COUNTRIES, POPULAR_CODES } from './lib/countries'
import type { Country, Place, TripDates } from './types'

const TABS = [
  { id: 'plan', title: '맞춤 일정', short: '일정', desc: '원하는 여행 스타일을 적으면 추천 리스트와 일정표를 만들어요' },
  { id: 'spots', title: '명소·숙소·식당', short: '명소', desc: '덜 알려진 명소와 주변 숙소·식당을 지도와 함께' },
  { id: 'calendar', title: '공휴일·축제', short: '캘린더', desc: '여행 기간의 공휴일과 열리는 축제' },
  { id: 'budget', title: '예상 경비', short: '경비', desc: '인원과 스타일에 맞춘 여행 경비 추정' },
  { id: 'exchange', title: '환율', short: '환율', desc: '원화 기준 환율과 계산기' },
  { id: 'weather', title: '날씨', short: '날씨', desc: '선택한 지역의 16일 예보' },
  { id: 'tips', title: '여행 팁', short: '팁', desc: '콘센트·시차·팁 문화부터 기본 현지어 표현까지' },
] as const
type TabId = (typeof TABS)[number]['id']

const readTab = (): TabId => {
  const h = location.hash.slice(1)
  return (TABS.some((t) => t.id === h) ? h : 'plan') as TabId
}

export default function App() {
  const trip = useTripState()
  const { country } = trip
  const diag = new URLSearchParams(location.search).has('diag')

  return (
    <div className="min-h-dvh">
      {diag && (
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <Diagnostics />
        </div>
      )}
      {country ? <Shell {...trip} country={country} place={trip.place!} /> : <Onboarding {...trip} />}
      <OfflineBanner />
    </div>
  )
}

// ---------------- 처음 화면 (나라 고르기) ----------------

function Onboarding({ dates, setCountry, setDates }: ReturnType<typeof useTripState>) {
  const popular = POPULAR_CODES.map((c) => COUNTRIES.find((x) => x.code === c)).filter((c): c is Country => !!c)
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5 py-12">
      <p className="text-sm font-medium tracking-[0.2em] text-teal-700">HIDDEN TRAVEL</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">숨은여행</h1>
      <p className="mt-3 text-base text-stone-500">나라만 고르면 일정·명소·경비·환율·날씨를 한 곳에서.</p>

      <div className="mt-10 space-y-5">
        <CountryPicker value={undefined} onChange={(c) => setCountry(c.code)} />
        <DateRange value={dates} onChange={setDates} />
      </div>

      <div className="mt-8">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-stone-400">인기 여행지</p>
        <div className="flex flex-wrap gap-2">
          {popular.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCountry(c.code)}
              className="flex items-center gap-2 rounded-full border border-stone-200 px-3.5 py-2 text-sm text-stone-700 transition hover:border-stone-400 active:bg-stone-100"
            >
              <Flag code={c.code} size="sm" />
              {c.nameKo}
            </button>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}

// ---------------- 여행 화면 ----------------

type ShellProps = ReturnType<typeof useTripState> & { country: Country; place: Place }

function Shell({ country, dates, place, setCountry, setDates, setPlace }: ShellProps) {
  const [tab, setTab] = useState<TabId>(readTab)
  // 한 번 연 탭은 숨겨 두기만 해서 입력값·불러온 결과를 유지한다
  const [visited, setVisited] = useState<Set<TabId>>(() => new Set([readTab()]))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const onHash = () => setTab(readTab())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    setVisited((v) => (v.has(tab) ? v : new Set(v).add(tab)))
  }, [tab])

  const go = (id: TabId) => {
    if (id !== tab) history.pushState(null, '', `${location.pathname}${location.search}#${id}`)
    setTab(id)
    window.scrollTo({ top: 0 })
  }
  const current = TABS.find((t) => t.id === tab)!

  const setup = <TripSetup country={country} dates={dates} place={place} setCountry={setCountry} setDates={setDates} setPlace={setPlace} />

  return (
    <div className="xl:grid xl:grid-cols-[360px_minmax(0,1fr)]">
      {/* 컴퓨터: 왼쪽 고정 사이드바 */}
      <aside className="hidden xl:flex xl:sticky xl:top-0 xl:h-dvh xl:flex-col xl:overflow-y-auto xl:border-r xl:border-stone-200 xl:px-6 xl:py-7">
        <Brand />
        <nav aria-label="기능" className="mt-8 space-y-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                tab === t.id ? 'bg-stone-100 font-semibold text-stone-900' : 'text-stone-500 hover:bg-stone-100/60 hover:text-stone-800'
              }`}
            >
              <Icon name={t.id} className={`size-5 ${tab === t.id ? 'text-teal-700' : ''}`} />
              {t.title}
            </button>
          ))}
        </nav>
        <div className="mt-8 border-t border-stone-200 pt-6">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-stone-400">여행 설정</p>
          {setup}
        </div>
        <div className="mt-auto pt-8">
          <Footer compact />
        </div>
      </aside>

      <div className="min-w-0">
        {/* 휴대폰·태블릿: 위쪽 요약 막대 */}
        <header className="sticky top-0 z-[700] border-b border-stone-200 bg-stone-50/85 backdrop-blur-xl xl:hidden">
          <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5 md:px-8">
            <button type="button" onClick={() => setEditing(true)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left">
              <Flag code={country.code} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {country.nameKo} · {place.name}
                </span>
                <span className="block truncate text-xs text-stone-500">
                  {formatKo(dates.start)} – {formatKo(dates.end)} · {Math.max(1, diffDays(dates.start, dates.end) + 1)}일
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 active:bg-stone-100"
            >
              <Icon name="edit" className="size-3.5" />
              변경
            </button>
          </div>
          {/* 태블릿: 가로 탭 */}
          <nav aria-label="기능" className="no-scrollbar mx-auto hidden max-w-4xl gap-1 overflow-x-auto px-6 pb-2 md:flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => go(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                  tab === t.id ? 'bg-stone-900 font-semibold text-stone-50' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon name={t.id} className="size-4" />
                {t.title}
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-4xl px-4 pb-32 pt-6 md:px-8 md:pb-16 md:pt-8 xl:max-w-5xl xl:px-10 xl:pt-10">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{current.title}</h1>
            <p className="mt-1 text-sm text-stone-500">{current.desc}</p>
          </div>
          {TABS.map((t) =>
            visited.has(t.id) ? (
              <section key={t.id} hidden={tab !== t.id} aria-label={t.title}>
                <SectionBoundary name={t.title}>
                  <TabContent id={t.id} country={country} dates={dates} place={place} active={tab === t.id} />
                </SectionBoundary>
              </section>
            ) : null,
          )}
          <div className="mt-12 xl:hidden">
            <Footer />
          </div>
        </main>
      </div>

      {/* 휴대폰: 아래쪽 탭 바 */}
      <nav
        aria-label="기능"
        className="fixed inset-x-0 bottom-0 z-[700] border-t border-stone-200 bg-stone-50/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="grid grid-cols-7">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${tab === t.id ? 'font-semibold text-stone-900' : 'text-stone-400'}`}
            >
              <Icon name={t.id} className={`size-[22px] ${tab === t.id ? 'text-teal-700' : ''}`} />
              {t.short}
            </button>
          ))}
        </div>
      </nav>

      {editing && (
        <Sheet title="여행 설정" onClose={() => setEditing(false)}>
          {setup}
        </Sheet>
      )}
    </div>
  )
}

function TabContent({ id, country, dates, place, active }: { id: TabId; country: Country; dates: TripDates; place: Place; active: boolean }) {
  switch (id) {
    case 'plan':
      return <PlannerSection country={country} place={place} dates={dates} />
    case 'spots':
      return <SpotsSection country={country} place={place} active={active} />
    case 'calendar':
      return <CalendarSection country={country} dates={dates} />
    case 'budget':
      return <BudgetCalculator country={country} dates={dates} place={place} />
    case 'exchange':
      return <ExchangeCalculator country={country} />
    case 'weather':
      return <WeatherSection place={place} dates={dates} />
    case 'tips':
      return <TipsSection country={country} place={place} />
  }
}

function TripSetup({
  country,
  dates,
  place,
  setCountry,
  setDates,
  setPlace,
}: {
  country: Country
  dates: TripDates
  place: Place
  setCountry: (c: string) => void
  setDates: (d: TripDates) => void
  setPlace: (p: Place) => void
}) {
  return (
    <div className="space-y-5">
      <CountryPicker value={country} onChange={(c) => setCountry(c.code)} />
      <DateRange value={dates} onChange={setDates} />
      <PlacePicker country={country} place={place} onChange={setPlace} />
      <p className="text-xs text-stone-500">
        수도 {country.capitalKo ?? country.nameKo} · 통화 {country.currencyNameKo ?? country.currency} ({country.currency})
      </p>
    </div>
  )
}

/** 휴대폰·태블릿용 아래에서 올라오는 설정 창 */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[1500] flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-black/0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,.6)' }} />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-stone-200 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 md:max-w-lg md:rounded-3xl md:p-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300 md:hidden" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-full p-2 text-stone-500 active:bg-stone-100">
            <Icon name="close" />
          </button>
        </div>
        {children}
        <button type="button" onClick={onClose} className="mt-6 h-12 w-full rounded-xl bg-stone-900 text-sm font-semibold text-stone-50 active:opacity-90">
          완료
        </button>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-[0.2em] text-teal-700">HIDDEN TRAVEL</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">숨은여행</p>
    </div>
  )
}

function Footer({ compact }: { compact?: boolean }) {
  const [kb, setKb] = useState(cacheSizeKb)
  return (
    <footer className={`space-y-2 text-[11px] leading-relaxed text-stone-400 ${compact ? '' : 'text-center'}`}>
      <p>
        API 응답을 이 기기에 저장해 다시 써요 (약 {kb}KB).{' '}
        <button
          type="button"
          onClick={() => {
            clearCache()
            setKb(cacheSizeKb())
            location.reload()
          }}
          className="text-stone-500 underline underline-offset-2"
        >
          저장된 데이터 지우기
        </button>
      </p>
      <p>
        데이터: Wikidata · OpenStreetMap 기여자 · Nominatim · 위키백과 · Frankfurter · ExchangeRate-API · Nager.Date · Open-Meteo · 국기 flagcdn.com
      </p>
    </footer>
  )
}
