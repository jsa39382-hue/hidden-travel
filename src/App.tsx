import { CountryPicker } from './components/CountryPicker'
import { DateRange } from './components/DateRange'
import { Flag } from './components/Flag'
import { Section } from './components/Section'
import { ExchangeCalculator } from './components/ExchangeCalculator'
import { CalendarSection } from './components/CalendarSection'
import { BudgetCalculator } from './components/BudgetCalculator'
import { useTripState } from './lib/tripState'
import { diffDays } from './lib/dates'

const SECTIONS = [
  { id: 'calendar', icon: '📅', title: '공휴일·축제' },
  { id: 'exchange', icon: '💱', title: '환율' },
  { id: 'budget', icon: '🧾', title: '예상 경비' },
  { id: 'spots', icon: '🧭', title: '숨은 명소' },
  { id: 'weather', icon: '🌤️', title: '날씨' },
] as const

export default function App() {
  const { country, dates, setCountry, setDates } = useTripState()
  const days = Math.max(diffDays(dates.start, dates.end) + 1, 1)

  return (
    <div className="min-h-dvh pb-16">
      <header className="bg-gradient-to-br from-teal-700 to-emerald-600 px-4 pb-16 pt-6 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-extrabold tracking-tight">숨은여행</h1>
          <p className="mt-1 text-sm text-teal-50/90">나라만 고르면 공휴일·환율·경비·숨은 명소·날씨를 한 번에</p>
        </div>
      </header>

      <main className="mx-auto -mt-12 max-w-3xl space-y-4 px-4">
        <div className="space-y-4 rounded-2xl bg-white p-4 shadow-md ring-1 ring-stone-200 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 sm:p-6">
          <CountryPicker value={country} onChange={(c) => setCountry(c.code)} />
          <DateRange value={dates} onChange={setDates} />
        </div>

        {!country ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 p-8 text-center text-stone-500">
            <p className="text-4xl" aria-hidden>🌏</p>
            <p className="mt-2">위에서 여행 갈 나라를 골라 주세요.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
              <Flag code={country.code} size="lg" />
              <div className="min-w-0">
                <p className="text-lg font-bold">{country.nameKo}</p>
                <p className="truncate text-sm text-stone-500">
                  수도 {country.capitalKo ?? country.nameKo} · 통화 {country.currencyNameKo ?? country.currency} ({country.currency}) · {days}일 일정
                </p>
              </div>
            </div>

            <nav aria-label="바로가기" className="sticky top-0 z-[500] -mx-4 overflow-x-auto bg-stone-50/90 px-4 py-2 backdrop-blur">
              <ul className="flex gap-2 whitespace-nowrap">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="inline-block rounded-full bg-white px-3 py-1.5 text-sm shadow-sm ring-1 ring-stone-200 active:bg-teal-50">
                      {s.icon} {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {SECTIONS.map((s) => (
              <Section key={s.id} id={s.id} icon={s.icon} title={s.title}>
                {s.id === 'calendar' ? (
                  <CalendarSection country={country} dates={dates} />
                ) : s.id === 'exchange' ? (
                  <ExchangeCalculator country={country} />
                ) : s.id === 'budget' ? (
                  <BudgetCalculator country={country} dates={dates} />
                ) : (
                  <p className="text-sm text-stone-400">준비 중인 기능이에요.</p>
                )}
              </Section>
            ))}
          </>
        )}
      </main>

      <footer className="mx-auto mt-10 max-w-3xl px-4 text-center text-xs text-stone-400">
        국가 정보: Wikidata · 국기: flagcdn.com · 환율: Frankfurter, ExchangeRate-API · 공휴일: Nager.Date · 축제: Wikidata
      </footer>
    </div>
  )
}
