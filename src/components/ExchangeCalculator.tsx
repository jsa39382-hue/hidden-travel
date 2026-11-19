import { useEffect, useState } from 'react'
import type { Country } from '../types'
import { useAsync } from '../lib/useAsync'
import {
  NoRateError,
  currencyDigits,
  displayUnit,
  formatNumber,
  getKrwRate,
  groupInput,
  parseAmount,
  type KrwRate,
} from '../lib/exchange'
import { ErrorBox, Loading, Notice } from './Status'
import { errorReasonKo } from '../lib/cache'
import { Num } from './ui/Num'

export function ExchangeCalculator({ country }: { country: Country }) {
  const { currency } = country
  const state = useAsync(currency === 'KRW' ? null : (force) => getKrwRate(currency, force), [currency])

  if (currency === 'KRW') return <p className="text-sm text-stone-600">원화(KRW)를 쓰는 나라예요. 환전이 필요 없어요.</p>
  if (state.status === 'idle' || state.status === 'loading') return <Loading label="환율 불러오는 중…" />
  if (state.status === 'error') {
    const noRate = state.error instanceof NoRateError
    return (
      <ErrorBox
        message={noRate ? state.error.message : '환율을 불러오지 못했어요.'}
        detail={noRate ? '현지에서 환전소 시세를 확인해 주세요.' : errorReasonKo(state.error)}
        onRetry={noRate ? undefined : state.retry}
      />
    )
  }
  return <Calculator key={currency} rate={state.data} country={country} onRefresh={state.retry} />
}

type Side = 'local' | 'krw'

/** '커피 몇 잔 값' 비교 기준 (한국 물가) */
const COFFEE_KRW = 4500
const ONIGIRI_KRW = 1500

function Calculator({ rate, country, onRefresh }: { rate: KrwRate; country: Country; onRefresh: () => void }) {
  const { currency } = rate
  const digits = currencyDigits(currency)
  const unit = displayUnit(rate.krwPer)

  const [edited, setEdited] = useState<Side>('krw')
  const [text, setText] = useState('100,000')

  const amount = parseAmount(text)
  const localValue = amount == null ? null : edited === 'local' ? amount : amount * rate.perKrw
  const krwValue = amount == null ? null : edited === 'krw' ? amount : amount * rate.krwPer

  const roundTo = (n: number, d: number) => Number(n.toFixed(d))
  const localText = edited === 'local' ? text : localValue == null ? '' : groupInput(String(roundTo(localValue, digits)))
  const krwText = edited === 'krw' ? text : krwValue == null ? '' : groupInput(String(Math.round(krwValue)))

  // 통화가 바뀌면 원화 10만 원으로 초기화
  useEffect(() => {
    setEdited('krw')
    setText('100,000')
  }, [currency])

  const set = (side: Side, value: string) => {
    setEdited(side)
    setText(groupInput(value))
  }

  const name = country.currencyNameKo ?? currency
  const presetsKrw = [10000, 50000, 100000, 500000, 1000000]
  const presetsLocal = [1, 10, 100, 1000, 10000].map((n) => n * unit).slice(0, 4)

  return (
    <div className="space-y-6 md:grid md:grid-cols-2 md:items-start md:gap-8 md:space-y-0">
      {/* 대표 환율 */}
      <div className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-xs text-stone-500">
          {formatNumber(unit)} {currency} · {name}
        </p>
        <p className="mt-2 text-4xl font-bold tracking-tight">
          <Num value={rate.krwPer * unit} digits={rate.krwPer * unit < 100 ? 2 : 0} suffix="원" />
        </p>
        <p className="mt-1 text-sm text-stone-500">
          1,000원 = {formatNumber(rate.perKrw * 1000, digits)} {currency}
        </p>
      </div>
      </div>

      {/* 양방향 변환 */}
      <div className="space-y-5">
      <div className="space-y-2">
        <AmountInput label={`${name} (${currency})`} code={currency} value={localText} onChange={(v) => set('local', v)} />
        <div className="flex justify-center py-0.5 text-stone-400" aria-hidden>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M8 4v16M4 8l4-4 4 4M16 20V4M12 16l4 4 4-4" /></svg>
        </div>
        <AmountInput label="대한민국 원 (KRW)" code="KRW" value={krwText} onChange={(v) => set('krw', v)} />
        {krwValue != null && krwValue > 0 && (
          <p className="text-right text-xs text-stone-500">
            ≈ 아메리카노 <span className="font-semibold text-stone-800"><Num value={krwValue / COFFEE_KRW} digits={1} />잔</span> · 편의점 삼각김밥{' '}
            <span className="font-semibold text-stone-800"><Num value={krwValue / ONIGIRI_KRW} digits={0} />개</span>
            <span className="block text-[11px] text-stone-400">한국 기준 아메리카노 4,500원, 삼각김밥 1,500원</span>
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Chips label="원화로" items={presetsKrw.map((n) => ({ text: n >= 10000 ? `${n / 10000}만 원` : `${n.toLocaleString('ko-KR')}원`, onClick: () => set('krw', String(n)) }))} />
        <Chips label="현지 돈으로" items={presetsLocal.map((n) => ({ text: `${formatNumber(n)} ${currency}`, onClick: () => set('local', String(n)) }))} />
      </div>

      {/* 기준 정보 */}
      <div className="space-y-2 border-t border-stone-200 pt-4 text-xs text-stone-500">
        {rate.stale && <Notice>지금은 환율 서버에 연결할 수 없어 전에 저장해 둔 환율을 보여 주고 있어요.</Notice>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="font-medium text-stone-600">기준일</dt>
          <dd>{rate.basisLabel}</dd>
          <dt className="font-medium text-stone-600">출처</dt>
          <dd>{rate.sourceLabel}</dd>
          <dt className="font-medium text-stone-600">불러온 시각</dt>
          <dd>
            {new Date(rate.fetchedAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            <button type="button" onClick={onRefresh} className="ml-2 font-medium text-teal-700 underline underline-offset-2">
              새로고침
            </button>
          </dd>
        </dl>
        <p>무료 환율은 실시간이 아니라 하루 한 번 정도 갱신되는 기준 환율이에요. 실제 환전·카드 결제 때는 수수료가 붙어 몇 % 차이가 날 수 있어요.</p>
      </div>
      </div>
    </div>
  )
}

function AmountInput({ label, code, value, onChange }: { label: string; code: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone-500">{label}</span>
      <div className="flex items-center rounded-xl border border-stone-300 bg-white px-3 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/20">
        <input
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="h-12 w-full min-w-0 bg-transparent text-right text-xl font-semibold tabular-nums outline-none"
        />
        <span className="ml-2 w-10 shrink-0 text-sm font-medium text-stone-500">{code}</span>
      </div>
    </label>
  )
}

function Chips({ label, items }: { label: string; items: { text: string; onClick: () => void }[] }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <span className="shrink-0 text-xs text-stone-400">{label}</span>
      {items.map((it) => (
        <button
          key={it.text}
          type="button"
          onClick={it.onClick}
          className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 active:bg-teal-100"
        >
          {it.text}
        </button>
      ))}
    </div>
  )
}
