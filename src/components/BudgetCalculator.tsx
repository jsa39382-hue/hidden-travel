import { useEffect, useState } from 'react'
import type { Country, Place, TripDates } from '../types'
import { diffDays } from '../lib/dates'
import { useAsync } from '../lib/useAsync'
import { getKrwRate, formatNumber } from '../lib/exchange'
import { errorReasonKo } from '../lib/cache'
import { COSTS_UPDATED, TIERS, calcBudget, getCostRow, type Party, type PartyType, type Tier } from '../lib/budget'
import { ErrorBox, Loading } from './Status'

const PREFS_KEY = 'hidden-travel:budget'
const PARTY_TYPES: { type: PartyType; label: string }[] = [
  { type: 'solo', label: '혼자' },
  { type: 'couple', label: '커플·2인' },
  { type: 'friends', label: '친구 3인 이상' },
  { type: 'family', label: '가족' },
]

interface Prefs {
  party: Party
  tier: Tier
}
function loadPrefs(): Prefs {
  const fallback: Prefs = { party: { type: 'couple', adults: 2, kids: 0 }, tier: 1 }
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null') as Prefs | null
    if (p && PARTY_TYPES.some((t) => t.type === p.party?.type) && [0, 1, 2].includes(p.tier)) return p
  } catch {
    /* 무시 */
  }
  return fallback
}

export function BudgetCalculator({ country, dates, place }: { country: Country; dates: TripDates; place: Place }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)
  const tripDays = Math.max(1, diffDays(dates.start, dates.end) + 1)
  const [days, setDays] = useState(tripDays)
  useEffect(() => setDays(tripDays), [tripDays])
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      /* 무시 */
    }
  }, [prefs])

  const { party, tier } = prefs
  const setParty = (p: Partial<Party>) => setPrefs((s) => ({ ...s, party: { ...s.party, ...p } }))
  const { row, basis, region } = getCostRow(country.code)
  const result = calcBudget(row, tier, party, days, place.factor)

  // 비용 통화 → 원화, 현지 통화 → 원화 환율
  const rates = useAsync(
    async (force) => {
      const [cost, local] = await Promise.allSettled([getKrwRate(row.currency, force), getKrwRate(country.currency, force)])
      if (cost.status === 'rejected') throw cost.reason
      return { cost: cost.value, local: local.status === 'fulfilled' ? local.value : null }
    },
    [row.currency, country.currency],
  )

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-10 lg:space-y-0">
      {/* 입력 */}
      <div className="space-y-5">
        <Field label="누구와 가나요?">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PARTY_TYPES.map((t) => (
              <Toggle
                key={t.type}
                active={party.type === t.type}
                onClick={() =>
                  setParty({
                    type: t.type,
                    adults: t.type === 'friends' ? Math.max(3, party.adults) : t.type === 'family' ? Math.max(2, party.adults) : party.adults,
                  })
                }
              >
                {t.label}
              </Toggle>
            ))}
          </div>
          {party.type === 'friends' && (
            <Stepper label="인원" value={Math.max(3, party.adults)} min={3} max={20} onChange={(v) => setParty({ adults: v })} />
          )}
          {party.type === 'family' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Stepper label="어른" value={Math.max(1, party.adults)} min={1} max={10} onChange={(v) => setParty({ adults: v })} />
              <Stepper label="아이" value={party.kids} min={0} max={10} onChange={(v) => setParty({ kids: v })} />
            </div>
          )}
        </Field>

        <Field label="예산 스타일">
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((t, i) => (
              <Toggle key={t.label} active={tier === i} onClick={() => setPrefs((s) => ({ ...s, tier: i as Tier }))}>
                {t.label}
              </Toggle>
            ))}
          </div>
          <p className="mt-1 text-xs text-stone-500">{TIERS[tier].desc}</p>
        </Field>

        <Field label="여행 일수">
          <Stepper label="일" value={days} min={1} max={90} onChange={setDays} suffix={`일 (${Math.max(0, days - 1)}박)`} />
          {days !== tripDays && (
            <button type="button" onClick={() => setDays(tripDays)} className="mt-1 text-xs text-teal-700 underline underline-offset-2">
              여행 날짜대로 {tripDays}일로 되돌리기
            </button>
          )}
        </Field>
      </div>

      {/* 결과 */}
      <div className="space-y-4 lg:sticky lg:top-28 xl:top-8">
      {rates.status === 'error' ? (
        <>
          <ErrorBox message="환율을 불러오지 못해 원화로 바꾸지 못했어요." detail={errorReasonKo(rates.error)} onRetry={rates.retry} />
          <ResultTable result={result} toLocal={null} toKrw={null} country={country} placeName={place.name} />
        </>
      ) : rates.status !== 'success' ? (
        <Loading label="환율 불러오는 중…" />
      ) : (
        <ResultTable
          result={result}
          country={country}
          placeName={place.name}
          toKrw={(n) => n * rates.data.cost.krwPer}
          toLocal={rates.data.local ? (n) => (n * rates.data.cost.krwPer) / rates.data.local!.krwPer : null}
        />
      )}

      <div className="space-y-1 text-[11px] leading-relaxed text-stone-500">
        <p className="font-medium text-stone-700">추정치예요. 항공권·쇼핑·보험은 빠져 있어요.</p>
        <p>
          {basis === 'country' && `${country.nameKo}의 하루 물가 자료(${COSTS_UPDATED} 기준, USD)로 계산했어요.`}
          {basis === 'region' && `${country.nameKo}의 자료가 없어 ${region} 지역 평균으로 계산했어요.`}
          {basis === 'global' && '이 지역 자료가 없어 전체 평균으로 계산했어요.'}{' '}
          {place.factor !== 1
            ? `${place.name} 물가 보정 ×${place.factor.toFixed(2)}${place.near ? `(${place.near} 기준)` : ''}을 숙소에는 그대로, 식비·교통·관광에는 절반만 반영했어요.`
            : `${place.name} 기준으로 계산했어요.`}{' '}
          실제 금액은 시기에 따라 크게 달라요.
        </p>
        <p>
          숙소는 방 단위(2인 1실{party.type === 'family' ? ', 가족은 한 방에 최대 4명' : ''}), 식비·교통·관광은 1인 단위로 계산하고 아이는 어른의 70%로
          계산해요.
        </p>
      </div>
      </div>
    </div>
  )
}

function ResultTable({
  result,
  country,
  placeName,
  toKrw,
  toLocal,
}: {
  result: ReturnType<typeof calcBudget>
  country: Country
  placeName: string
  toKrw: ((n: number) => number) | null
  toLocal: ((n: number) => number) | null
}) {
  const local = toLocal && country.currency !== 'KRW' ? toLocal : null
  const fmtLocal = (n: number) => `${formatNumber(Math.round(n), 0)} ${country.currency}`
  // 추정치이므로 10만 원 이상은 천 원 단위, 그 아래는 십 원 단위로 반올림
  const fmtKrw = (n: number) => `${(n >= 100000 ? Math.round(n / 1000) * 1000 : Math.round(n / 10) * 10).toLocaleString('ko-KR')}원`
  const fmtSrc = (n: number) => `${formatNumber(Math.round(n), 0)} ${result.currency}`
  const main = (n: number) => (toKrw ? fmtKrw(toKrw(n)) : fmtSrc(n))
  const sub = (n: number) => (local ? fmtLocal(local(n)) : toKrw ? fmtSrc(n) : '')

  return (
    <div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-xs text-stone-500">
          {placeName} · {result.people}명 · {result.nights}박 {result.days}일 · 방 {result.rooms}개
        </p>
        <p className="mt-2 text-4xl font-bold tracking-tight">{main(result.total)}</p>
        <p className="mt-1 text-sm text-stone-500">{sub(result.total)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-stone-200 pt-4 text-sm">
          <p>
            <span className="block text-xs text-stone-500">1인당</span>
            <span className="font-semibold">{main(result.perPerson)}</span>
          </p>
          <p>
            <span className="block text-xs text-stone-500">하루</span>
            <span className="font-semibold">{main(result.total / result.days)}</span>
          </p>
        </div>
      </div>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
            <th className="py-2 font-medium">항목</th>
            <th className="py-2 text-right font-medium">금액</th>
          </tr>
        </thead>
        <tbody>
          {result.lines.map((l) => (
            <tr key={l.key} className="border-b border-stone-100 align-top">
              <td className="py-2.5">
                <p className="font-medium">{l.label}</p>
                <p className="text-xs text-stone-500">
                  {fmtSrc(l.unit)} {l.formula}
                </p>
              </td>
              <td className="py-2.5 text-right tabular-nums">
                <p className="font-medium">{main(l.amount)}</p>
                <p className="text-xs text-stone-500">{sub(l.amount)}</p>
              </td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="py-2.5">합계</td>
            <td className="py-2.5 text-right tabular-nums">
              <p>{main(result.total)}</p>
              <p className="text-xs font-normal text-stone-500">{sub(result.total)}</p>
            </td>
          </tr>
        </tbody>
      </table>
      {!local && country.currency !== 'KRW' && toKrw && (
        <p className="mt-1 text-xs text-stone-500">{country.currency} 환율이 없어 USD와 원화로만 보여 드려요.</p>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-stone-600">{label}</p>
      {children}
    </div>
  )
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-11 rounded-xl px-2 text-sm font-medium ring-1 transition ${
        active ? 'bg-stone-900 text-stone-50 ring-stone-900' : 'bg-white text-stone-700 ring-stone-300 active:bg-stone-50'
      }`}
    >
      {children}
    </button>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  suffix?: string
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  return (
    <div className="mt-2 flex items-center gap-2">
      {!suffix && <span className="w-8 text-sm text-stone-500">{label}</span>}
      <button type="button" aria-label={`${label} 줄이기`} onClick={() => onChange(clamp(value - 1))} disabled={value <= min} className="size-10 rounded-lg bg-stone-100 text-lg disabled:opacity-40">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n) && e.target.value !== '') onChange(clamp(Math.round(n)))
        }}
        className="h-10 w-14 rounded-lg border border-stone-300 text-center text-base tabular-nums"
      />
      <button type="button" aria-label={`${label} 늘리기`} onClick={() => onChange(clamp(value + 1))} disabled={value >= max} className="size-10 rounded-lg bg-stone-100 text-lg disabled:opacity-40">
        +
      </button>
      {suffix ? <span className="text-sm text-stone-600">{suffix}</span> : <span className="text-sm text-stone-600">명</span>}
    </div>
  )
}

