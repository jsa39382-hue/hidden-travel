import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Country, TripDates } from '../types'
import { useAsync } from '../lib/useAsync'
import { useStored } from '../lib/stored'
import { getKrwRate } from '../lib/exchange'
import { balances, newId, transfers, type Expense, type Member } from '../lib/settle'
import { Num, roundKrw } from './ui/Num'

interface Book {
  members: Member[]
  expenses: Expense[]
}
const validBook = (v: unknown) => !!v && Array.isArray((v as Book).members) && Array.isArray((v as Book).expenses)

/** 더치페이: 여러 통화로 쓴 돈을 기록하면 마지막에 원화로 정산 (이 기기에만 저장) */
export function SettleSection({ country, dates }: { country: Country; dates: TripDates }) {
  const [book, setBook] = useStored<Book>(
    `hidden-travel:settle:${country.code}:${dates.start}`,
    { members: [{ id: newId(), name: '나' }, { id: newId(), name: '친구' }], expenses: [] },
    validBook,
  )
  const currencies = [...new Set([country.currency, 'KRW', 'USD', ...book.expenses.map((e) => e.currency)])]
  const rates = useAsync(
    async (force) => {
      const out: Record<string, number> = { KRW: 1 }
      await Promise.all(
        currencies
          .filter((c) => c !== 'KRW')
          .map(async (c) => {
            try {
              out[c] = (await getKrwRate(c, force)).krwPer
            } catch {
              /* 환율 없는 통화는 정산에서 빠지고 안내 */
            }
          }),
      )
      return out
    },
    [currencies.join(',')],
  )
  const rateOf = (c: string) => (rates.status === 'success' ? (rates.data[c] ?? null) : c === 'KRW' ? 1 : null)
  const { bal, total, missing } = balances(book.members, book.expenses, rateOf)
  const moves = transfers(bal)
  const nameOf = (id: string) => book.members.find((m) => m.id === id)?.name ?? '?'

  const [memberName, setMemberName] = useState('')
  const addMember = () => {
    const n = memberName.trim()
    if (!n) return
    setBook((b) => ({ ...b, members: [...b.members, { id: newId(), name: n }] }))
    setMemberName('')
  }

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10 lg:space-y-0">
      <div className="space-y-6">
        {/* 함께 간 사람 */}
        <div>
          <p className="mb-2 text-sm font-medium text-stone-600">함께 간 사람</p>
          <div className="flex flex-wrap gap-2">
            {book.members.map((m) => (
              <span key={m.id} className="flex items-center gap-1 rounded-full border border-stone-300 py-1 pl-3 pr-1 text-sm">
                {m.name}
                {book.members.length > 2 && !book.expenses.some((e) => e.payer === m.id) && (
                  <button
                    type="button"
                    aria-label={`${m.name} 빼기`}
                    onClick={() => setBook((b) => ({ ...b, members: b.members.filter((x) => x.id !== m.id), expenses: b.expenses.map((e) => ({ ...e, split: e.split.filter((s) => s !== m.id) })) }))}
                    className="rounded-full px-1.5 text-stone-400"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addMember()
              }}
              className="flex"
            >
              <input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="이름 추가" className="h-9 w-24 rounded-l-full border border-stone-300 bg-white px-3 text-sm" />
              <button type="submit" className="h-9 rounded-r-full border border-l-0 border-stone-300 px-3 text-sm">
                +
              </button>
            </form>
          </div>
        </div>

        <ExpenseForm members={book.members} currencies={[country.currency, 'KRW', 'USD'].filter((c, i, a) => a.indexOf(c) === i)} onAdd={(e) => setBook((b) => ({ ...b, expenses: [e, ...b.expenses] }))} />
      </div>

      <div className="space-y-6">
        {/* 정산 결과 */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">정산</p>
          <p className="mt-2 text-4xl font-bold tracking-tight">
            <Num value={roundKrw(total)} suffix="원" />
          </p>
          <p className="mt-1 text-sm text-stone-500">
            총 {book.expenses.length}건 · 1인당 <Num value={roundKrw(total / Math.max(1, book.members.length))} suffix="원" />
          </p>
          <ul className="mt-4 space-y-2 border-t border-stone-200 pt-4">
            {moves.length === 0 && <li className="text-sm text-stone-500">{book.expenses.length ? '주고받을 돈이 없어요.' : '쓴 돈을 기록하면 누가 누구에게 보내면 되는지 알려 드려요.'}</li>}
            {moves.map((m, i) => (
              <motion.li key={`${m.from}-${m.to}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between text-sm">
                <span>
                  <b>{nameOf(m.from)}</b> → <b>{nameOf(m.to)}</b>
                </span>
                <span className="font-semibold tabular-nums">
                  <Num value={m.krw} suffix="원" />
                </span>
              </motion.li>
            ))}
          </ul>
          {missing.length > 0 && <p className="mt-3 text-xs text-amber-800">{missing.join(', ')} 환율을 불러오지 못해 정산에서 빠졌어요.</p>}
          {rates.status === 'success' && <p className="mt-3 text-[11px] text-stone-400">마지막으로 불러온 환율로 계산해요. 인터넷이 끊겨도 저장해 둔 환율로 계속 계산돼요.</p>}
        </div>

        {/* 기록 */}
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {book.expenses.map((e) => (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -60 }}
                className="flex items-center gap-3 rounded-2xl border border-stone-200 px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.title || '지출'}</span>
                  <span className="block truncate text-xs text-stone-500">
                    {nameOf(e.payer)} 결제 · {(e.split.length ? e.split : book.members.map((m) => m.id)).map(nameOf).join(', ')}
                  </span>
                </span>
                <span className="text-right tabular-nums">
                  <span className="block font-semibold">
                    {e.amount.toLocaleString('ko-KR')} {e.currency}
                  </span>
                  {e.currency !== 'KRW' && rateOf(e.currency) && <span className="block text-xs text-stone-500">{roundKrw(e.amount * rateOf(e.currency)!).toLocaleString('ko-KR')}원</span>}
                </span>
                <button type="button" aria-label="삭제" onClick={() => setBook((b) => ({ ...b, expenses: b.expenses.filter((x) => x.id !== e.id) }))} className="rounded-full px-2 py-1 text-stone-400">
                  ×
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {book.expenses.length > 0 && (
          <button
            type="button"
            onClick={() => confirm('기록을 모두 지울까요?') && setBook((b) => ({ ...b, expenses: [] }))}
            className="text-xs text-stone-500 underline underline-offset-2"
          >
            기록 모두 지우기
          </button>
        )}
      </div>
    </div>
  )
}

function ExpenseForm({ members, currencies, onAdd }: { members: Member[]; currencies: string[]; onAdd: (e: Expense) => void }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(currencies[0])
  const [payer, setPayer] = useState(members[0]?.id ?? '')
  const [split, setSplit] = useState<string[]>([])
  const n = Number(amount.replace(/,/g, ''))
  return (
    <form
      className="space-y-3 rounded-2xl border border-stone-200 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!(n > 0) || !members.some((m) => m.id === payer)) return
        onAdd({ id: newId(), title: title.trim(), amount: n, currency, payer, split })
        setTitle('')
        setAmount('')
        setSplit([])
      }}
    >
      <p className="text-sm font-medium text-stone-600">쓴 돈 기록하기</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="무엇에 썼나요? (예: 저녁 식사)" className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base" />
      <div className="flex gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
          inputMode="decimal"
          placeholder="금액"
          className="h-11 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-right text-base tabular-nums"
        />
        <select aria-label="통화" value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-11 rounded-xl border border-stone-300 bg-white px-2 text-sm">
          {currencies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-stone-500">낸 사람</span>
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={payer === m.id}
            onClick={() => setPayer(m.id)}
            className={`rounded-full px-3 py-1 ring-1 ${payer === m.id ? 'bg-stone-900 font-semibold text-stone-50 ring-stone-900' : 'text-stone-600 ring-stone-300'}`}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-stone-500">나눌 사람</span>
        {members.map((m) => {
          const on = split.length === 0 || split.includes(m.id)
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const cur = split.length ? split : members.map((x) => x.id)
                const next = on ? cur.filter((x) => x !== m.id) : [...cur, m.id]
                setSplit(next.length === members.length ? [] : next)
              }}
              className={`rounded-full px-3 py-1 ring-1 ${on ? 'text-stone-900 ring-teal-700' : 'text-stone-400 ring-stone-300'}`}
            >
              {m.name}
            </button>
          )
        })}
      </div>
      <button type="submit" disabled={!(n > 0)} className="h-11 w-full rounded-xl bg-stone-900 text-sm font-semibold text-stone-50 disabled:opacity-40">
        기록 추가
      </button>
    </form>
  )
}
