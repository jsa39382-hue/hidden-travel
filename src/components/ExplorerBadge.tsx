import { explorerLevel } from '../lib/walk'

/** 숨은 탐험가 등급: 관심 목록 명소의 평균 숨은 정도 */
export function ExplorerBadge({ scores }: { scores: number[] }) {
  const lv = explorerLevel(scores)
  if (!lv) return <p className="text-xs text-stone-500">명소 탭에서 ♥를 누르면 숨은 정도로 '숨은 탐험가' 등급을 매겨 드려요.</p>
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-400/60 bg-amber-50 p-4">
      <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-full bg-amber-400 font-extrabold leading-none" style={{ color: '#0a0a0a' }} aria-hidden>
        <span className="text-[10px]">Lv</span>
        <span className="text-lg">{lv.level}</span>
      </span>
      <div>
        <p className="font-bold text-amber-800">{lv.title}</p>
        <p className="text-xs text-stone-600">
          관심 목록 {scores.length}곳의 평균 숨은 정도 {lv.avg}점 · 다음 등급까지 {nextGap(lv.avg)}
        </p>
      </div>
    </div>
  )
}

function nextGap(avg: number) {
  const next = [45, 60, 70, 80].find((n) => n > avg)
  return next ? `${next - avg}점` : '최고 등급이에요'
}
