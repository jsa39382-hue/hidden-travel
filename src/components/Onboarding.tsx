import { Suspense, lazy, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Country, TripDates } from '../types'
import { CountryPicker } from './CountryPicker'
import { DateRange } from './DateRange'
import { Flag } from './Flag'
import { Num, roundKrw } from './ui/Num'
import { COUNTRIES, POPULAR_CODES } from '../lib/countries'
import { defaultPlace } from '../lib/places'
import { diffDays } from '../lib/dates'
import { useAsync } from '../lib/useAsync'
import { getKrwRate } from '../lib/exchange'
import { estimateAll, type Affordable } from '../lib/budgetFinder'
import { TIERS, type Tier } from '../lib/budget'
import type { GlobeMarker } from './Globe'

const Globe = lazy(() => import('./Globe'))
const BUDGETS = [50, 100, 200, 300, 500]

export function Onboarding({ dates, setCountry, setDates, footer }: { dates: TripDates; setCountry: (c: string) => void; setDates: (d: TripDates) => void; footer: React.ReactNode }) {
  const popular = useMemo(() => POPULAR_CODES.map((c) => COUNTRIES.find((x) => x.code === c)).filter((c): c is Country => !!c), [])
  const [preview, setPreview] = useState<{ country: Country; cost?: Affordable } | null>(null)
  const [mode, setMode] = useState<'pick' | 'budget'>('pick')
  const [budget, setBudget] = useState(100)
  const [adults, setAdults] = useState(1)
  const [tier, setTier] = useState<Tier>(1)
  const days = Math.max(1, diffDays(dates.start, dates.end) + 1)
  const usd = useAsync(mode === 'budget' ? () => getKrwRate('USD') : null, [mode])
  const all = useMemo(
    () => (usd.status === 'success' ? estimateAll({ days, adults, tier, startDate: dates.start, usdKrw: usd.data.krwPer }) : []),
    [usd, days, adults, tier, dates.start],
  )
  const affordable = useMemo(() => all.filter((a) => a.total <= budget * 10_000).sort((a, b) => b.total - a.total), [all, budget])
  // 예산 안에 드는 곳이 없으면 가장 싼 곳을 '조금 넘는 곳'으로 보여 준다
  const nearest = useMemo(() => (affordable.length ? [] : [...all].sort((a, b) => a.total - b.total).slice(0, 6)), [all, affordable.length])

  const focusPlace = preview ? defaultPlace(preview.country) : null
  const markers: GlobeMarker[] = useMemo(() => {
    if (mode === 'budget' && affordable.length)
      return affordable.slice(0, 80).map((a) => {
        const p = defaultPlace(a.country)
        return { lat: p.lat, lng: p.lng, size: 0.04 }
      })
    return popular.map((c) => {
      const p = defaultPlace(c)
      return { lat: p.lat, lng: p.lng, size: 0.04 }
    })
  }, [mode, affordable, popular])

  const open = (country: Country, cost?: Affordable) => {
    setPreview({ country, cost })
    // 휴대폰에서는 지구본이 위에 있으므로, 돌아가는 모습과 카드가 보이게 위로 올린다
    if (window.innerWidth < 1024) window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return (
    <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-6 px-5 py-10 lg:grid-cols-2 lg:gap-12">
      {/* 지구본 */}
      <div className="relative order-first mx-auto w-full max-w-[22rem] lg:order-last lg:max-w-[34rem]">
        <Suspense fallback={<div className="aspect-square w-full" />}>
          <Globe markers={markers} focus={focusPlace ? [focusPlace.lat, focusPlace.lng] : null} />
        </Suspense>
        <AnimatePresence>
          {preview && (
            <motion.div
              key={preview.country.code}
              initial={{ opacity: 0, scale: 0.6, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              className="absolute inset-x-4 bottom-2 rounded-3xl border border-stone-300 bg-white/95 p-4 shadow-2xl backdrop-blur"
            >
              <div className="flex items-center gap-3">
                <Flag code={preview.country.code} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">{preview.country.nameKo}</p>
                  <p className="truncate text-xs text-stone-500">
                    {defaultPlace(preview.country).name} · {preview.country.currencyNameKo ?? preview.country.currency}
                  </p>
                </div>
                <button type="button" aria-label="닫기" onClick={() => setPreview(null)} className="rounded-full px-2 py-1 text-stone-400">
                  ×
                </button>
              </div>
              {preview.cost && (
                <p className="mt-3 text-sm text-stone-600">
                  {adults}명 {days}일 예상 <b className="text-stone-900">{Math.round(preview.cost.total / 10_000).toLocaleString('ko-KR')}만 원</b>
                  <span className="text-xs text-stone-500"> (항공 {Math.round(preview.cost.flight / 10_000)}만 + 현지 {Math.round(preview.cost.local / 10_000)}만)</span>
                </p>
              )}
              <button type="button" onClick={() => setCountry(preview.country.code)} className="mt-3 h-11 w-full rounded-xl bg-stone-900 text-sm font-semibold text-stone-50">
                이 나라로 여행 준비하기
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <p className="text-sm font-medium tracking-[0.2em] text-teal-700">HIDDEN TRAVEL</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">숨은여행</h1>
        <p className="mt-3 text-base text-stone-500">나라만 고르면 일정·명소·경비·환율·날씨를 한 곳에서.</p>

        <div className="mt-8 inline-flex rounded-full border border-stone-200 p-1" role="tablist">
          {(
            [
              ['pick', '나라 고르기'],
              ['budget', '예산으로 찾기'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={mode === k}
              onClick={() => (setMode(k), setPreview(null))}
              className={`relative rounded-full px-4 py-1.5 text-sm ${mode === k ? 'font-semibold text-stone-50' : 'text-stone-500'}`}
            >
              {mode === k && <motion.span layoutId="onb-tab" className="absolute inset-0 -z-0 rounded-full bg-stone-900" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          {mode === 'pick' ? (
            <>
              <CountryPicker value={undefined} onChange={(c) => setCountry(c.code)} />
              <DateRange value={dates} onChange={setDates} />
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-stone-400">인기 여행지 · 누르면 지구본이 돌아가요</p>
                <div className="flex flex-wrap gap-2">
                  {popular.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => open(c)}
                      className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition hover:border-stone-400 ${preview?.country.code === c.code ? 'border-teal-700 text-stone-900' : 'border-stone-200 text-stone-700'}`}
                    >
                      <Flag code={c.code} size="sm" />
                      {c.nameKo}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-stone-600">총 예산 (항공권 포함)</p>
                <div className="flex flex-wrap gap-2">
                  {BUDGETS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={budget === b}
                      onClick={() => setBudget(b)}
                      className={`rounded-full px-4 py-2 text-sm ring-1 ${budget === b ? 'bg-stone-900 font-semibold text-stone-50 ring-stone-900' : 'text-stone-600 ring-stone-300'}`}
                    >
                      {b}만 원
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-stone-600">인원</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <button key={n} type="button" aria-pressed={adults === n} onClick={() => setAdults(n)} className={`h-10 flex-1 rounded-xl text-sm ring-1 ${adults === n ? 'bg-stone-900 font-semibold text-stone-50 ring-stone-900' : 'text-stone-600 ring-stone-300'}`}>
                        {n}명
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-stone-600">스타일</p>
                  <div className="flex gap-1">
                    {TIERS.map((t, i) => (
                      <button key={t.label} type="button" aria-pressed={tier === i} onClick={() => setTier(i as Tier)} className={`h-10 flex-1 rounded-xl text-sm ring-1 ${tier === i ? 'bg-stone-900 font-semibold text-stone-50 ring-stone-900' : 'text-stone-600 ring-stone-300'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DateRange value={dates} onChange={setDates} />
              {usd.status === 'error' ? (
                <p className="text-sm text-rose-700">환율을 불러오지 못해 계산하지 못했어요.</p>
              ) : usd.status !== 'success' ? (
                <p className="text-sm text-stone-500">계산 중…</p>
              ) : (
                <div>
                  <p className="mb-2 text-sm">
                    <b className="text-2xl">
                      <Num value={affordable.length} />
                    </b>
                    <span className="text-stone-500"> 개 나라에 갈 수 있어요 · 예산에 가까운 순</span>
                  </p>
                  {nearest.length > 0 && (
                    <div className="mb-3 rounded-2xl border border-stone-200 p-3">
                      <p className="text-sm text-stone-600">이 조건으로는 예산 안에 드는 곳이 없어요. 가장 가까운 곳:</p>
                      <ul className="mt-2 space-y-1">
                        {nearest.map((a) => (
                          <li key={a.country.code}>
                            <button type="button" onClick={() => open(a.country, a)} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left">
                              <Flag code={a.country.code} size="sm" />
                              <span className="flex-1 truncate text-sm">{a.country.nameKo}</span>
                              <span className="text-xs text-amber-700">+{Math.round((a.total - budget * 10_000) / 10_000)}만 원</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11px] text-stone-500">혼자면 방값을 혼자 내서 비싸요. 인원을 늘리거나 '알뜰'로 바꿔 보세요.</p>
                    </div>
                  )}
                  <ul className="no-scrollbar max-h-72 space-y-1 overflow-y-auto pr-1">
                    {affordable.slice(0, 40).map((a) => (
                      <li key={a.country.code}>
                        <button type="button" onClick={() => open(a.country, a)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${preview?.country.code === a.country.code ? 'bg-stone-100' : ''}`}>
                          <Flag code={a.country.code} size="sm" />
                          <span className="flex-1 truncate text-sm">{a.country.nameKo}</span>
                          <span className="text-sm font-semibold tabular-nums">
                            <Num value={roundKrw(a.total) / 10_000} suffix="만" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-stone-400">항공권(인천 왕복 추정)과 숙소·식비·교통·관광 하루 비용으로 계산한 추정치예요. 31개국 외에는 지역 평균을 써요.</p>
                </div>
              )}
            </>
          )}
        </div>
        <div className="mt-10">{footer}</div>
      </div>
    </div>
  )
}
