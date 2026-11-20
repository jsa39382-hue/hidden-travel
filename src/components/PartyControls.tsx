import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TIERS, type Party, type Tier } from '../lib/budget'
import { PARTY_TYPES, partyLabel, partyShort, usePartyPrefs } from '../lib/party'

/** 인원·예산 스타일 고르기 (경비 탭과 상단 버튼이 같이 쓴다) */
export function PartyControls({ compact }: { compact?: boolean }) {
  const [prefs, setPrefs] = usePartyPrefs()
  const { party, tier } = prefs
  const setParty = (p: Partial<Party>) => setPrefs((s) => ({ ...s, party: { ...s.party, ...p } }))
  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
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
        {party.type === 'friends' && <Stepper label="인원" value={Math.max(3, party.adults)} min={3} max={20} onChange={(v) => setParty({ adults: v })} />}
        {party.type === 'family' && (
          <div className={`mt-2 grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-2'}`}>
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
    </div>
  )
}

/** 상단바의 "2명 · 보통" 버튼: 어느 탭에서든 눌러서 바꾼다 */
export function PartyChip({ align = 'right' }: { align?: 'left' | 'right' }) {
  const [prefs] = usePartyPrefs()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`인원·예산: ${partyLabel(prefs)}. 바꾸기`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-stone-300 px-3 text-xs font-medium text-stone-800"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16 5.2a3 3 0 0 1 0 5.6M17.5 14.3c1.7.6 2.7 2.3 3 4.7" />
        </svg>
        <span className="sm:hidden">{partyShort(prefs)}</span>
        <span className="hidden sm:inline">{partyLabel(prefs)}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="인원·예산 스타일"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className={`fixed inset-x-4 top-16 z-[1500] sm:absolute sm:inset-x-auto sm:top-11 sm:w-[22rem] ${align === 'right' ? 'sm:right-0' : 'sm:left-0'} rounded-2xl border border-stone-300 bg-white p-4 shadow-2xl`}
          >
            <PartyControls compact />
            <p className="mt-3 text-[11px] text-stone-500">경비·교통 추천·짐 목록·추억 앨범에 같이 적용돼요.</p>
            <button type="button" onClick={() => setOpen(false)} className="mt-3 h-10 w-full rounded-xl bg-stone-900 text-sm font-semibold text-stone-50">
              완료
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-stone-600">{label}</p>
      {children}
    </div>
  )
}

export function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-11 rounded-xl px-2 text-sm font-medium ring-1 transition ${active ? 'bg-stone-900 text-stone-50 ring-stone-900' : 'bg-white text-stone-700 ring-stone-300 active:bg-stone-50'}`}
    >
      {children}
    </button>
  )
}

export function Stepper({ label, value, min, max, onChange, suffix }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
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
