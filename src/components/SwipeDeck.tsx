import { useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import type { Spot } from '../lib/spots'
import { photoUrl } from '../lib/spots'

/**
 * 틴더식 스와이프: 오른쪽으로 던지면 '가고 싶다', 왼쪽은 '별로'.
 * 세게 던질수록 많이 기울어지고 늘어나며, 덜 던지면 고무줄처럼 제자리로 돌아온다.
 */
export function SwipeDeck({ spots, onLike, onDislike }: { spots: Spot[]; onLike: (s: Spot) => void; onDislike: (s: Spot) => void }) {
  const [gone, setGone] = useState<Record<string, 'left' | 'right'>>({})
  const rest = spots.filter((s) => !gone[s.id])
  const top = rest.slice(0, 3)

  const decide = (s: Spot, dir: 'left' | 'right') => {
    setGone((g) => ({ ...g, [s.id]: dir }))
    if (dir === 'right') onLike(s)
    else onDislike(s)
  }

  if (!spots.length) return <p className="py-8 text-center text-sm text-stone-500">고를 명소를 불러오는 중이거나 이 지역에서 찾지 못했어요.</p>
  if (!rest.length)
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-stone-600">다 골랐어요! 아래 계획 만들기에 반영돼요.</p>
        <button type="button" onClick={() => setGone({})} className="mt-3 text-xs text-teal-700 underline underline-offset-2">
          다시 고르기
        </button>
      </div>
    )

  return (
    <div>
      <div className="relative mx-auto h-[23rem] w-full max-w-sm select-none">
        <AnimatePresence>
          {top
            .slice()
            .reverse()
            .map((s) => {
              const depth = top.indexOf(s)
              return <Card key={s.id} spot={s} depth={depth} onDecide={(d) => decide(s, d)} exitDir={gone[s.id]} />
            })}
        </AnimatePresence>
      </div>
      <div className="mt-4 flex items-center justify-center gap-4">
        <button type="button" onClick={() => decide(rest[0], 'left')} className="h-12 w-28 rounded-full border border-stone-300 text-sm font-semibold text-stone-700">
          별로
        </button>
        <span className="text-xs tabular-nums text-stone-400">
          {spots.length - rest.length + 1} / {spots.length}
        </span>
        <button type="button" onClick={() => decide(rest[0], 'right')} className="h-12 w-28 rounded-full bg-stone-900 text-sm font-semibold text-stone-50">
          가고 싶다
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-stone-400">카드를 좌우로 던져도 돼요</p>
    </div>
  )
}

function Card({ spot, depth, onDecide, exitDir }: { spot: Spot; depth: number; onDecide: (d: 'left' | 'right') => void; exitDir?: 'left' | 'right' }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 0, 220], [-18, 0, 18])
  // 세게 끌수록 가로로 살짝 늘어난다 (스트레치)
  const scaleX = useTransform(x, [-300, 0, 300], [1.06, 1, 1.06])
  const likeOpacity = useTransform(x, [30, 120], [0, 1])
  const nopeOpacity = useTransform(x, [-120, -30], [1, 0])
  const isTop = depth === 0

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const power = info.offset.x + info.velocity.x * 0.25
    if (power > 140) onDecide('right')
    else if (power < -140) onDecide('left')
  }

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
      style={{ x, rotate, scaleX, zIndex: 10 - depth, touchAction: 'pan-y' }}
      initial={{ scale: 0.9, y: 30, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: depth > 2 ? 0 : 1 }}
      exit={{ x: exitDir === 'left' ? -500 : 500, rotate: exitDir === 'left' ? -30 : 30, opacity: 0, transition: { type: 'spring', stiffness: 200, damping: 25 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      drag={isTop ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.9}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 15 }}
      onDragEnd={onDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
    >
      <div className="h-56 bg-stone-100">
        {spot.image ? (
          <img src={photoUrl(spot.image, 640)} alt={spot.name} draggable={false} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-stone-400">사진 없음 · {spot.kind}</div>
        )}
      </div>
      <div className="p-4">
        <p className="text-lg font-bold leading-snug">{spot.name}</p>
        <p className="mt-1 text-xs text-stone-500">
          {spot.kind} · 중심에서 {spot.distKm < 1 ? `${Math.round(spot.distKm * 1000)}m` : `${spot.distKm.toFixed(1)}km`} · 숨은 정도 {spot.hiddenScore}
        </p>
      </div>
      <motion.span style={{ opacity: likeOpacity }} className="absolute left-4 top-4 rotate-[-12deg] rounded-lg border-2 border-teal-700 px-3 py-1 text-sm font-bold text-teal-700">
        가고 싶다
      </motion.span>
      <motion.span style={{ opacity: nopeOpacity }} className="absolute right-4 top-4 rotate-[12deg] rounded-lg border-2 border-rose-700 px-3 py-1 text-sm font-bold text-rose-700">
        별로
      </motion.span>
    </motion.div>
  )
}
