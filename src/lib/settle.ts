/** 더치페이 정산: 여러 통화로 쓴 돈을 원화로 바꿔 누가 누구에게 얼마를 보내면 되는지 계산 */
export interface Member {
  id: string
  name: string
}
export interface Expense {
  id: string
  title: string
  amount: number
  currency: string
  payer: string
  /** 나눠 낼 사람 (비어 있으면 모두) */
  split: string[]
}

export function balances(members: Member[], expenses: Expense[], krwPer: (cur: string) => number | null) {
  const bal: Record<string, number> = Object.fromEntries(members.map((m) => [m.id, 0]))
  let total = 0
  const missing = new Set<string>()
  for (const e of expenses) {
    const rate = krwPer(e.currency)
    if (rate == null) {
      missing.add(e.currency)
      continue
    }
    const krw = e.amount * rate
    total += krw
    const who = (e.split.length ? e.split : members.map((m) => m.id)).filter((id) => id in bal)
    if (!who.length || !(e.payer in bal)) continue
    bal[e.payer] += krw
    for (const id of who) bal[id] -= krw / who.length
  }
  return { bal, total, missing: [...missing] }
}

/** 보내는 횟수가 적도록: 가장 많이 받을 사람과 가장 많이 낼 사람을 차례로 맞춘다 */
export function transfers(bal: Record<string, number>) {
  const pos = Object.entries(bal).filter(([, v]) => v > 1).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v)
  const neg = Object.entries(bal).filter(([, v]) => v < -1).map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v)
  const out: { from: string; to: string; krw: number }[] = []
  let i = 0
  let j = 0
  while (i < pos.length && j < neg.length) {
    const amt = Math.min(pos[i].v, neg[j].v)
    out.push({ from: neg[j].id, to: pos[i].id, krw: Math.round(amt / 10) * 10 })
    pos[i].v -= amt
    neg[j].v -= amt
    if (pos[i].v < 1) i++
    if (neg[j].v < 1) j++
  }
  return out
}

export const newId = () => Math.random().toString(36).slice(2, 9)
