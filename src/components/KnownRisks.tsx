import { useState } from 'react'
import { knownRisks } from '../lib/risks'

/** 잘 알려진 주의사항: 이름표를 누르면 한 줄 설명 */
export function KnownRisks({ code, compact }: { code: string; compact?: boolean }) {
  const list = knownRisks(code)
  const [open, setOpen] = useState<string | null>(compact ? null : '__all')
  if (!list.length) return null
  return (
    <div>
      <p className="mb-1.5 text-xs text-stone-500">잘 알려진 주의사항 <span className="text-[11px]">(직접 정리 · 공식 경보 아님)</span></p>
      <div className="flex flex-wrap gap-1.5">
        {list.map((r) => (
          <button
            key={r.label}
            type="button"
            aria-expanded={open === '__all' || open === r.label}
            onClick={() => setOpen((o) => (o === r.label ? null : r.label))}
            className="rounded-full border border-amber-400/70 px-2.5 py-1 text-xs text-amber-800"
          >
            {r.label}
          </button>
        ))}
      </div>
      {open && (
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-stone-600">
          {list
            .filter((r) => open === '__all' || open === r.label)
            .map((r) => (
              <li key={r.label}>
                <b className="text-stone-800">{r.label}</b> · {r.note}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
