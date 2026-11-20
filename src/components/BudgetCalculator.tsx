import { useEffect, useState } from 'react'
import type { Country, Place, TripDates } from '../types'
import { diffDays } from '../lib/dates'
import { useAsync } from '../lib/useAsync'
import { getKrwRate, formatNumber } from '../lib/exchange'
import { errorReasonKo } from '../lib/cache'
import { COSTS_UPDATED, calcBudget, getCostRow, headcount, regionOfCountry } from '../lib/budget'
import { usePartyPrefs } from '../lib/party'
import { Field, PartyControls, Stepper } from './PartyControls'
import { DEFAULT_EXTRAS, KID_FLIGHT_RATE, SHOPPING, flightEstimate, insuranceEstimate, simEstimate, type ExtraLine, type ExtraPrefs } from '../lib/extras'
import { ErrorBox, Loading } from './Status'
import { transportBudget } from '../lib/transport'
import { Num, roundKrw } from './ui/Num'

export function BudgetCalculator({ country, dates, place }: { country: Country; dates: TripDates; place: Place }) {
  const [prefs, setPrefs] = usePartyPrefs()
  const tripDays = Math.max(1, diffDays(dates.start, dates.end) + 1)
  const [days, setDays] = useState(tripDays)
  useEffect(() => setDays(tripDays), [tripDays])

  const { party, tier } = prefs
  const extras = { ...DEFAULT_EXTRAS, ...prefs.extras }
  const setExtras = (e: Partial<ExtraPrefs>) => setPrefs((s) => ({ ...s, extras: { ...DEFAULT_EXTRAS, ...s.extras, ...e } }))
  const { row, basis, region } = getCostRow(country.code)
  const base = calcBudget(row, tier, party, days, place.factor)

  // 현지 경비 밖의 비용 (원화)
  const { adults, kids } = headcount(party)
  const flight = flightEstimate([place.lat, place.lng], tier, dates.start, country.code === 'KR')
  const flightPer = extras.flightPrice && extras.flightPrice > 0 ? extras.flightPrice : flight.perAdult
  const who = kids ? `어른 ${adults} + 아이 ${kids}` : `${adults}명`
  const extraLines: ExtraLine[] = [
    extras.flight && {
      key: 'flight',
      label: '항공권 (왕복)',
      formula: `${extras.flightPrice ? '직접 입력' : `추정 · 인천에서 약 ${Math.round(flight.distanceKm).toLocaleString('ko-KR')}km${flight.peak ? ' · 성수기' : ''}`} · 1인 ${flightPer.toLocaleString('ko-KR')}원 × ${who}${kids ? ' (아이 75%)' : ''}`,
      krw: flightPer * (adults + kids * KID_FLIGHT_RATE),
    },
    extras.insurance && {
      key: 'insurance',
      label: '여행자 보험',
      formula: `1인 약 ${insuranceEstimate(regionOfCountry(country.code), days, tier).toLocaleString('ko-KR')}원 × ${who}${kids ? ' (아이 70%)' : ''}`,
      krw: insuranceEstimate(regionOfCountry(country.code), days, tier) * (adults + kids * 0.7),
    },
    extras.sim && {
      key: 'sim',
      label: '현지 데이터 (eSIM·유심)',
      formula: `1인 약 ${simEstimate(days).toLocaleString('ko-KR')}원 × 어른 ${adults}명`,
      krw: simEstimate(days) * adults,
    },
    extras.shopping > 0 && {
      key: 'shopping',
      label: `쇼핑·기념품 (${SHOPPING[extras.shopping].label})`,
      formula: `1인 ${SHOPPING[extras.shopping].krw.toLocaleString('ko-KR')}원 × ${who}${kids ? ' (아이 30%)' : ''}`,
      krw: SHOPPING[extras.shopping].krw * (adults + kids * 0.3),
    },
  ].filter((x): x is ExtraLine => !!x)

  // 비용 통화 → 원화, 현지 통화 → 원화 환율
  const rates = useAsync(
    async (force) => {
      const [cost, local] = await Promise.allSettled([getKrwRate(row.currency, force), getKrwRate(country.currency, force)])
      if (cost.status === 'rejected') throw cost.reason
      return { cost: cost.value, local: local.status === 'fulfilled' ? local.value : null }
    },
    [row.currency, country.currency],
  )

  // 교통 데이터(transport.json)가 있는 나라는 '현지 교통'을 공항 왕복 + 시내 교통으로 다시 계산
  const tb = transportBudget(country.code, place, tier, headcount(party), days)
  const result = (() => {
    if (!tb) return base
    const costKrw = rates.status === 'success' ? rates.data.cost.krwPer : null
    const localKrw = rates.status === 'success' ? rates.data.local?.krwPer : null
    const lines = base.lines.map((l) => {
      if (l.key !== 'transport') return l
      // 교통 금액은 현지 통화 → 경비 표 통화(USD)로 바꿔서 넣는다
      if (tb.amount != null && costKrw && localKrw) return { ...l, amount: (tb.amount * localKrw) / costKrw, unit: NaN, formula: tb.formula }
      return { ...l, formula: tb.amount == null ? `${l.formula} · ${tb.formula}` : l.formula }
    })
    const total = lines.reduce((a, l) => a + l.amount, 0)
    return { ...base, lines, total, perPerson: total / base.people }
  })()

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-10 lg:space-y-0">
      {/* 입력 */}
      <div className="space-y-5">
        <PartyControls />

        <Field label="여행 일수">
          <Stepper label="일" value={days} min={1} max={90} onChange={setDays} suffix={`일 (${Math.max(0, days - 1)}박)`} />
          {days !== tripDays && (
            <button type="button" onClick={() => setDays(tripDays)} className="mt-1 text-xs text-teal-700 underline underline-offset-2">
              여행 날짜대로 {tripDays}일로 되돌리기
            </button>
          )}
        </Field>

        <Field label="그 밖의 비용">
          <div className="space-y-2">
            <Check checked={extras.flight} onChange={(v) => setExtras({ flight: v })} label="항공권 (인천 왕복)" hint={`1인 약 ${flight.perAdult.toLocaleString('ko-KR')}원 추정${flight.peak ? ' · 성수기' : ''}`} />
            {extras.flight && (
              <label className="ml-8 flex items-center gap-2 text-xs text-stone-500">
                실제 가격을 알면
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1인 왕복 (원)"
                  value={extras.flightPrice ? extras.flightPrice.toLocaleString('ko-KR') : ''}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^\d]/g, ''))
                    setExtras({ flightPrice: n > 0 ? n : undefined })
                  }}
                  className="h-9 w-36 rounded-lg border border-stone-300 bg-white px-2 text-right text-sm text-stone-900"
                />
              </label>
            )}
            <Check checked={extras.insurance} onChange={(v) => setExtras({ insurance: v })} label="여행자 보험" hint={`1인 약 ${insuranceEstimate(regionOfCountry(country.code), days, tier).toLocaleString('ko-KR')}원`} />
            <Check checked={extras.sim} onChange={(v) => setExtras({ sim: v })} label="현지 데이터 (eSIM·유심)" hint={`1인 약 ${simEstimate(days).toLocaleString('ko-KR')}원`} />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="w-20 text-sm text-stone-700">쇼핑</span>
              {SHOPPING.map((sh, i) => (
                <button
                  key={sh.label}
                  type="button"
                  aria-pressed={extras.shopping === i}
                  onClick={() => setExtras({ shopping: i as ExtraPrefs['shopping'] })}
                  className={`rounded-full px-3 py-1.5 text-xs ring-1 transition ${extras.shopping === i ? 'bg-stone-900 font-semibold text-stone-50 ring-stone-900' : 'text-stone-600 ring-stone-300'}`}
                >
                  {sh.label}
                  {sh.krw ? ` ${sh.krw / 10_000}만` : ''}
                </button>
              ))}
            </div>
          </div>
        </Field>
      </div>

      {/* 결과 */}
      <div className="space-y-4 lg:sticky lg:top-28 xl:top-8">
      {rates.status === 'error' ? (
        <>
          <ErrorBox message="환율을 불러오지 못해 원화로 바꾸지 못했어요." detail={errorReasonKo(rates.error)} onRetry={rates.retry} />
          <ResultTable result={result} extras={extraLines} toLocal={null} toKrw={null} country={country} placeName={place.name} />
        </>
      ) : rates.status !== 'success' ? (
        <Loading label="환율 불러오는 중…" />
      ) : (
        <ResultTable
          result={result}
          extras={extraLines}
          krwPerLocal={rates.data.local?.krwPer}
          country={country}
          placeName={place.name}
          toKrw={(n) => n * rates.data.cost.krwPer}
          toLocal={rates.data.local ? (n) => (n * rates.data.cost.krwPer) / rates.data.local!.krwPer : null}
        />
      )}

      <div className="space-y-1 text-[11px] leading-relaxed text-stone-500">
        <p className="font-medium text-stone-700">모두 추정치예요. 항공권은 거리·시기로 계산한 일반석 왕복 운임이라 실제와 차이가 클 수 있어요.</p>
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
  extras = [],
  krwPerLocal,
  country,
  placeName,
  toKrw,
  toLocal,
}: {
  result: ReturnType<typeof calcBudget>
  extras?: ExtraLine[]
  krwPerLocal?: number
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
  const extraKrw = extras.reduce((a, e) => a + e.krw, 0)
  const localKrw = toKrw ? toKrw(result.total) : null
  const grandKrw = localKrw != null ? localKrw + extraKrw : null
  const totalMain = grandKrw != null ? fmtKrw(grandKrw) : `${fmtSrc(result.total)}${extraKrw ? ` + ${fmtKrw(extraKrw)}` : ''}`

  return (
    <div>
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-xs text-stone-500">
          {placeName} · {result.people}명 · {result.nights}박 {result.days}일 · 방 {result.rooms}개
        </p>
        <p className="mt-2 text-4xl font-bold tracking-tight">{grandKrw != null ? <Num value={roundKrw(grandKrw)} suffix="원" /> : totalMain}</p>
        <p className="mt-1 text-sm text-stone-500">{extras.length ? '항공권 등 포함 총액' : sub(result.total)}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-stone-200 pt-4 text-sm">
          <p>
            <span className="block text-xs text-stone-500">1인당</span>
            <span className="font-semibold">{grandKrw != null ? fmtKrw(grandKrw / result.people) : main(result.perPerson)}</span>
          </p>
          <p>
            <span className="block text-xs text-stone-500">현지 경비</span>
            <span className="font-semibold">{main(result.total)}</span>
          </p>
          <p>
            <span className="block text-xs text-stone-500">현지 하루</span>
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
                  {Number.isFinite(l.unit) ? `${fmtSrc(l.unit)} ` : ''}
                  {l.formula}
                </p>
              </td>
              <td className="py-2.5 text-right tabular-nums">
                <p className="font-medium">{main(l.amount)}</p>
                <p className="text-xs text-stone-500">{sub(l.amount)}</p>
              </td>
            </tr>
          ))}
          <tr className="border-b border-stone-200">
            <td className="py-2.5 font-semibold">현지 경비 소계</td>
            <td className="py-2.5 text-right tabular-nums">
              <p className="font-semibold">{main(result.total)}</p>
              <p className="text-xs text-stone-500">{sub(result.total)}</p>
            </td>
          </tr>
          {extras.map((e) => (
            <tr key={e.key} className="border-b border-stone-100 align-top">
              <td className="py-2.5">
                <p className="font-medium">{e.label}</p>
                <p className="text-xs text-stone-500">{e.formula}</p>
              </td>
              <td className="py-2.5 text-right tabular-nums">
                <p className="font-medium">{fmtKrw(e.krw)}</p>
                {local && krwPerLocal && <p className="text-xs text-stone-500">{fmtLocal(e.krw / krwPerLocal)}</p>}
              </td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="py-3">총액</td>
            <td className="py-3 text-right tabular-nums">{totalMain}</td>
          </tr>
        </tbody>
      </table>
      {!local && country.currency !== 'KRW' && toKrw && (
        <p className="mt-1 text-xs text-stone-500">{country.currency} 환율이 없어 USD와 원화로만 보여 드려요.</p>
      )}
    </div>
  )
}





function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-3 py-2.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-teal-500" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-stone-800">{label}</span>
        {hint && <span className="block text-xs text-stone-500">{hint}</span>}
      </span>
    </label>
  )
}
