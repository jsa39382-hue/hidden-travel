import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CountryPicker } from './components/CountryPicker'
import { DateRange } from './components/DateRange'
import { Flag } from './components/Flag'
import { PlacePicker } from './components/PlacePicker'
import { HomeSection } from './components/HomeSection'
import { Onboarding } from './components/Onboarding'
import { SectionBoundary } from './components/SectionBoundary'
import { PwaStatus } from './components/PwaStatus'
import { PartyChip } from './components/PartyControls'
import { SharedWishImport, ShareTrip } from './components/ShareTrip'
import { Diagnostics } from './components/Diagnostics'
import { Icon } from './components/Icon'
import { Loading } from './components/Status'
import { cacheSizeKb, clearCache } from './lib/cache'
import { useTripState } from './lib/tripState'
import { diffDays, formatKo } from './lib/dates'
import type { Country, Place, TripDates } from './types'

// 처음 화면(홈) 밖의 화면은 처음 열 때 불러온다 (첫 로딩을 가볍게)
const BackupPanel = lazy(() => import('./components/BackupPanel'))
const ExchangeCalculator = lazy(() => import('./components/ExchangeCalculator').then((m) => ({ default: m.ExchangeCalculator })))
const CalendarSection = lazy(() => import('./components/CalendarSection').then((m) => ({ default: m.CalendarSection })))
const BudgetCalculator = lazy(() => import('./components/BudgetCalculator').then((m) => ({ default: m.BudgetCalculator })))
const SpotsSection = lazy(() => import('./components/SpotsSection').then((m) => ({ default: m.SpotsSection })))
const WeatherSection = lazy(() => import('./components/WeatherSection').then((m) => ({ default: m.WeatherSection })))
const PlannerSection = lazy(() => import('./components/PlannerSection').then((m) => ({ default: m.PlannerSection })))
const SafetySection = lazy(() => import('./components/SafetySection').then((m) => ({ default: m.SafetySection })))
const TransportSection = lazy(() => import('./components/TransportSection').then((m) => ({ default: m.TransportSection })))
const TipsSection = lazy(() => import('./components/TipsSection').then((m) => ({ default: m.TipsSection })))
const SettleSection = lazy(() => import('./components/SettleSection').then((m) => ({ default: m.SettleSection })))
const RetroSection = lazy(() => import('./components/RetroSection').then((m) => ({ default: m.RetroSection })))

/** 여섯 개의 큰 탭. '돈'과 '정보'는 안에서 다시 나뉜다 */
const TABS = [
  { id: 'home', title: '한눈에', short: '홈', desc: '지금 가면 이득인지, 꼭 알아야 할 것, 챙길 짐' },
  { id: 'plan', title: '맞춤 일정', short: '일정', desc: '카드를 넘기며 고르고, 원하는 스타일로 일정표 만들기' },
  { id: 'spots', title: '명소·숙소·식당', short: '명소', desc: '덜 알려진 명소와 주변 숙소·식당을 지도와 함께' },
  { id: 'money', title: '돈', short: '돈', desc: '예상 경비, 환율 계산, 더치페이 정산', subs: [['budget', '경비'], ['exchange', '환율'], ['settle', '더치페이']] },
  { id: 'info', title: '정보', short: '정보', desc: '날씨·골든아워, 안전·여행 경보, 공휴일·축제, 교통, 음식·여행 팁', subs: [['weather', '날씨'], ['safety', '안전'], ['calendar', '캘린더'], ['transport', '교통'], ['tips', '음식·팁']] },
  { id: 'retro', title: '회고 카드', short: '추억', desc: '다녀온 여행을 스토리 크기 이미지로' },
] as const
type TabId = (typeof TABS)[number]['id']
type SubId = 'budget' | 'exchange' | 'settle' | 'weather' | 'safety' | 'calendar' | 'transport' | 'tips'

/** 주소 #탭 또는 #하위탭 (예전 주소 #budget, #weather도 그대로 열린다) */
function readHash(): { tab: TabId; sub?: SubId } {
  const h = location.hash.slice(1)
  for (const t of TABS) {
    if (t.id === h) return { tab: t.id }
    if ('subs' in t && t.subs.some(([s]) => s === h)) return { tab: t.id, sub: h as SubId }
  }
  return { tab: 'home' }
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
      {country ? (
        <Shell {...trip} country={country} place={trip.place!} />
      ) : (
        <Onboarding dates={trip.dates} setCountry={trip.setCountry} setDates={trip.setDates} footer={<Footer />} />
      )}
      <PwaStatus />
    </div>
  )
}

type ShellProps = ReturnType<typeof useTripState> & { country: Country; place: Place }

function Shell({ country, dates, place, setCountry, setDates, setPlace }: ShellProps) {
  const initial = readHash()
  const [tab, setTab] = useState<TabId>(initial.tab)
  const [subs, setSubs] = useState<Record<string, SubId>>({ money: initial.tab === 'money' && initial.sub ? initial.sub : 'budget', info: initial.tab === 'info' && initial.sub ? initial.sub : 'weather' })
  // 한 번 연 화면은 숨겨 두기만 해서 입력값·불러온 결과를 유지한다
  const [visited, setVisited] = useState<Set<string>>(() => new Set([initial.tab, initial.sub ?? '']))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const onHash = () => {
      const r = readHash()
      setTab(r.tab)
      if (r.sub) setSubs((s) => ({ ...s, [r.tab]: r.sub! }))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const activeSub = tab === 'money' || tab === 'info' ? subs[tab] : undefined
  useEffect(() => {
    setVisited((v) => {
      if (v.has(tab) && (!activeSub || v.has(activeSub))) return v
      const n = new Set(v)
      n.add(tab)
      if (activeSub) n.add(activeSub)
      return n
    })
  }, [tab, activeSub])

  const go = (id: TabId, sub?: SubId) => {
    const hash = sub ?? id
    if (`#${hash}` !== location.hash) history.pushState(null, '', `${location.pathname}${location.search}#${hash}`)
    setTab(id)
    if (sub) setSubs((s) => ({ ...s, [id]: sub }))
    window.scrollTo({ top: 0 })
  }
  const current = TABS.find((t) => t.id === tab)!
  const setup = <TripSetup country={country} dates={dates} place={place} setCountry={setCountry} setDates={setDates} setPlace={setPlace} />
  const days = Math.max(1, diffDays(dates.start, dates.end) + 1)

  return (
    <div className="xl:grid xl:grid-cols-[340px_minmax(0,1fr)]">
      <SharedWishImport place={place} />
      {/* 컴퓨터: 왼쪽 고정 사이드바 */}
      <aside className="hidden xl:sticky xl:top-0 xl:flex xl:h-dvh xl:flex-col xl:overflow-y-auto xl:border-r xl:border-stone-200 xl:px-6 xl:py-7">
        <Brand onClick={() => setCountry(null)} />
        <nav aria-label="기능" className="mt-8 space-y-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${tab === t.id ? 'font-semibold text-stone-900' : 'text-stone-500 hover:text-stone-800'}`}
            >
              {tab === t.id && <motion.span layoutId="side-active" className="absolute inset-0 rounded-xl bg-stone-100" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
              <Icon name={t.id} className={`relative size-5 ${tab === t.id ? 'text-teal-700' : ''}`} />
              <span className="relative">{t.title}</span>
            </button>
          ))}
        </nav>
        <div className="mt-8 border-t border-stone-200 pt-6">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-stone-400">여행 설정</p>
          <div className="mb-5">
            <p className="mb-1.5 text-sm text-stone-600">인원·예산</p>
            <div className="flex items-center gap-2">
              <PartyChip align="left" />
              <ShareTrip country={country} place={place} dates={dates} />
            </div>
          </div>
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
                  {formatKo(dates.start)} – {formatKo(dates.end)} · {days}일
                </span>
              </span>
            </button>
            <PartyChip />
            <ShareTrip country={country} place={place} dates={dates} />
            <button type="button" onClick={() => setEditing(true)} aria-label="나라·도시·날짜 변경" className="flex h-9 items-center gap-1.5 rounded-full border border-stone-300 px-2.5 text-xs font-medium text-stone-700 sm:px-3">
              <Icon name="edit" className="size-3.5" />
              <span className="hidden sm:inline">변경</span>
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
                className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm ${tab === t.id ? 'font-semibold text-stone-50' : 'text-stone-500 hover:text-stone-800'}`}
              >
                {tab === t.id && <motion.span layoutId="top-active" className="absolute inset-0 rounded-full bg-stone-900" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
                <Icon name={t.id} className="relative size-4" />
                <span className="relative">{t.title}</span>
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-4xl px-4 pb-32 pt-6 md:px-8 md:pb-16 md:pt-8 xl:max-w-5xl xl:px-10 xl:pt-10">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{current.title}</h1>
            <p className="mt-1 text-sm text-stone-500">{current.desc}</p>
          </div>
          {'subs' in current && (
            <div className="no-scrollbar -mx-4 mb-6 flex gap-1 overflow-x-auto px-4" role="tablist">
              {current.subs.map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeSub === id}
                  onClick={() => go(current.id, id as SubId)}
                  className={`relative shrink-0 rounded-full px-4 py-2 text-sm ${activeSub === id ? 'font-semibold text-stone-50' : 'text-stone-500'}`}
                >
                  {activeSub === id && <motion.span layoutId={`sub-${current.id}`} className="absolute inset-0 rounded-full bg-stone-900" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          )}
          {VIEWS.map((v) => {
            if (!visited.has(v.id)) return null
            const active = v.parent ? tab === v.parent && activeSub === v.id : tab === v.id
            return (
              <motion.section
                key={v.id}
                hidden={!active}
                aria-label={v.label}
                initial={false}
                animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={active ? { type: 'spring', stiffness: 260, damping: 26 } : { duration: 0 }}
              >
                <SectionBoundary name={v.label}>
                  <Suspense fallback={<Loading />}>
                    <View id={v.id} country={country} dates={dates} place={place} active={active} onPickCountry={(c) => setCountry(c)} />
                  </Suspense>
                </SectionBoundary>
              </motion.section>
            )
          })}
          <div className="mt-12 xl:hidden">
            <Footer />
          </div>
        </main>
      </div>

      {/* 휴대폰: 아래쪽 탭 바 (활성 표시가 스프링으로 미끄러진다) */}
      <nav aria-label="기능" className="fixed inset-x-0 bottom-0 z-[700] border-t border-stone-200 bg-stone-50/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] ${tab === t.id ? 'font-semibold text-stone-900' : 'text-stone-400'}`}
            >
              {tab === t.id && <motion.span layoutId="bottom-active" className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-teal-700" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
              <Icon name={t.id} className={`size-[22px] ${tab === t.id ? 'text-teal-700' : ''}`} />
              {t.short}
            </button>
          ))}
        </div>
      </nav>

      <AnimatePresence>{editing && <Sheet title="여행 설정" onClose={() => setEditing(false)} onHome={() => setCountry(null)}>{setup}</Sheet>}</AnimatePresence>
    </div>
  )
}

const VIEWS: { id: string; label: string; parent?: TabId }[] = [
  { id: 'home', label: '한눈에' },
  { id: 'plan', label: '맞춤 일정' },
  { id: 'spots', label: '명소·숙소·식당' },
  { id: 'budget', label: '경비', parent: 'money' },
  { id: 'exchange', label: '환율', parent: 'money' },
  { id: 'settle', label: '더치페이', parent: 'money' },
  { id: 'weather', label: '날씨', parent: 'info' },
  { id: 'safety', label: '안전', parent: 'info' },
  { id: 'calendar', label: '캘린더', parent: 'info' },
  { id: 'transport', label: '교통', parent: 'info' },
  { id: 'tips', label: '음식·팁', parent: 'info' },
  { id: 'retro', label: '회고 카드' },
]

function View({ id, country, dates, place, active, onPickCountry }: { id: string; country: Country; dates: TripDates; place: Place; active: boolean; onPickCountry: (c: string) => void }) {
  switch (id) {
    case 'home':
      return <HomeSection country={country} place={place} dates={dates} onPickCountry={onPickCountry} />
    case 'plan':
      return <PlannerSection country={country} place={place} dates={dates} />
    case 'spots':
      return <SpotsSection country={country} place={place} dates={dates} active={active} />
    case 'budget':
      return <BudgetCalculator country={country} dates={dates} place={place} />
    case 'exchange':
      return <ExchangeCalculator country={country} />
    case 'settle':
      return <SettleSection country={country} dates={dates} />
    case 'weather':
      return <WeatherSection place={place} dates={dates} />
    case 'calendar':
      return <CalendarSection country={country} dates={dates} />
    case 'safety':
      return <SafetySection country={country} place={place} onPickCountry={onPickCountry} />
    case 'transport':
      return <TransportSection country={country} place={place} />
    case 'tips':
      return <TipsSection country={country} place={place} />
    case 'retro':
      return <RetroSection country={country} place={place} dates={dates} />
    default:
      return null
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
  setCountry: (c: string | null) => void
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

/** 휴대폰·태블릿용 아래에서 올라오는 설정 창: 스프링으로 튀어 오르고, 아래로 끌어 내리면 닫힌다 */
function Sheet({ title, onClose, onHome, children }: { title: string; onClose: () => void; onHome: () => void; children: ReactNode }) {
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
      <motion.button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,.6)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.8 }}
        onDragEnd={(_, info) => (info.offset.y > 120 || info.velocity.y > 600) && onClose()}
        className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl border border-stone-200 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 md:max-w-lg md:rounded-3xl md:p-6"
      >
        <div className="mx-auto mb-3 h-1 w-10 cursor-grab rounded-full bg-stone-300 md:hidden" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-full p-2 text-stone-500">
            <Icon name="close" />
          </button>
        </div>
        {children}
        <button type="button" onClick={onClose} className="mt-6 h-12 w-full rounded-xl bg-stone-900 text-sm font-semibold text-stone-50">
          완료
        </button>
        <button type="button" onClick={onHome} className="mt-2 h-11 w-full text-sm text-stone-500">
          지구본으로 돌아가 다른 나라 찾기
        </button>
      </motion.div>
    </div>
  )
}

function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-left" title="처음 화면(지구본)으로">
      <p className="text-[11px] font-medium tracking-[0.2em] text-teal-700">HIDDEN TRAVEL</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">숨은여행</p>
    </button>
  )
}

function Footer({ compact }: { compact?: boolean }) {
  const [kb, setKb] = useState(cacheSizeKb)
  const [backup, setBackup] = useState(false)
  return (
    <footer className={`space-y-2 text-[11px] leading-relaxed text-stone-400 ${compact ? '' : 'text-center'}`}>
      <p>
        <button type="button" aria-expanded={backup} onClick={() => setBackup((v) => !v)} className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700">
          {backup ? '백업 닫기' : '내 기록 백업·옮기기'}
        </button>
      </p>
      {backup && (
        <Suspense fallback={<p>불러오는 중…</p>}>
          <BackupPanel />
        </Suspense>
      )}
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
        시연 모드(미리 받아 둔 데이터로 열기):{' '}
        <button type="button" onClick={() => import('./lib/demo').then((m) => m.startDemo('JP'))} className="text-stone-500 underline underline-offset-2">
          도쿄
        </button>{' '}
        ·{' '}
        <button type="button" onClick={() => import('./lib/demo').then((m) => m.startDemo('FR'))} className="text-stone-500 underline underline-offset-2">
          파리
        </button>
      </p>
      <p>
        데이터: Wikidata · OpenStreetMap 기여자 · Nominatim · Photon(komoot) · OSRM · 위키백과·위키보이저·위키미디어 공용 · 영국 외무부(FCDO) 여행 경보 · 미국 지질조사국(USGS) 지진 · Frankfurter · ExchangeRate-API · Nager.Date · Open-Meteo(날씨·과거 날씨·대기질·바다) · MyMemory · 국기 flagcdn.com
      </p>
      <p>위키백과·위키보이저 글은 CC BY-SA, 영국 외무부 여행 경보는 Open Government Licence v3.0을 따라 출처를 밝혀 썼어요.</p>
    </footer>
  )
}
