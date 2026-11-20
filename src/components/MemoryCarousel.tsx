import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'motion/react'
import { MAX_MEMO, MAX_PHOTOS, sortMemories, type TripMemory, type useMemories } from '../lib/memories'
import { deletePhoto, getPhoto, photosAvailable, savePhoto, shrinkImage } from '../lib/photos'
import { photoUrl } from '../lib/spots'
import { diffDays, formatKo } from '../lib/dates'
import { getCountry } from '../lib/countries'
import { readCache } from '../lib/cache'
import { estimateAll } from '../lib/budgetFinder'
import { Flag } from './Flag'
import { countVisited, drawRetro, readSpent } from './RetroSection'
import { shareOrDownload } from './HomeSection'

const GAP = 16
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 }
const today = () => new Date().toISOString().slice(0, 10)

type Store = ReturnType<typeof useMemories>

/** 추억 앨범: 요약 카드 + 여행 카드를 옆으로 넘기며 본다 */
export function MemoryCarousel({ memories, focusKey, onMake }: { memories: Store; focusKey: string | null; onMake: () => void }) {
  const list = useMemo(() => sortMemories(memories.list), [memories.list])
  const [index, setIndex] = useState(0)
  const [undo, setUndo] = useState<{ memory: TripMemory; timer: ReturnType<typeof setTimeout> } | null>(null)
  const [canPhoto, setCanPhoto] = useState(false)
  useEffect(() => void photosAvailable().then(setCanPhoto), [])

  // 방금 만든 여행 카드로 이동
  useEffect(() => {
    if (!focusKey) return
    const [code, start] = focusKey.split(':')
    const i = list.findIndex((m) => m.code === code && m.start === start)
    if (i >= 0) setIndex(i + 1)
  }, [focusKey, list])

  const count = list.length + 1
  const current = Math.min(index, count - 1)

  const remove = (m: TripMemory) => {
    if (undo) {
      // 앞서 지운 것은 바로 확정
      clearTimeout(undo.timer)
      undo.memory.photoIds.forEach(deletePhoto)
    }
    memories.remove(m.id)
    setIndex((i) => Math.max(0, Math.min(i, list.length - 1)))
    // 5초 동안 되돌릴 수 있게 하고, 그 뒤에 사진을 지운다
    const timer = setTimeout(() => {
      m.photoIds.forEach(deletePhoto)
      setUndo(null)
    }, 5000)
    setUndo({ memory: m, timer })
  }
  const restore = () => {
    if (!undo) return
    clearTimeout(undo.timer)
    memories.restore(undo.memory)
    setUndo(null)
  }

  if (!list.length)
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 p-8 text-center">
        <p className="text-sm text-stone-600">여행을 다녀온 뒤 회고 카드를 만들면 여기에 쌓여요.</p>
        <button type="button" onClick={onMake} className="mt-4 h-11 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-stone-50">
          이번 여행 카드 만들기
        </button>
        <UndoToast undo={undo} onUndo={restore} />
      </div>
    )

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">추억 앨범</h3>
      <Track count={count} index={current} setIndex={setIndex} labels={['요약', ...list.map((m) => `${m.name} ${m.place.name}`)]}>
        {(i) =>
          i === 0 ? (
            <SummaryCard list={list} onPick={(k) => setIndex(k + 1)} />
          ) : (
            <TripCard key={list[i - 1].id} m={list[i - 1]} all={list} canPhoto={canPhoto} onUpdate={memories.update} onDelete={remove} />
          )
        }
      </Track>
      <UndoToast undo={undo} onUndo={restore} />
    </div>
  )
}

// ---------------- 넘기는 틀 ----------------

function Track({ count, index, setIndex, labels, children }: { count: number; index: number; setIndex: (i: number) => void; labels: string[]; children: (i: number) => React.ReactNode }) {
  const reduced = useReducedMotion()
  const boxRef = useRef<HTMLDivElement>(null)
  const [boxW, setBoxW] = useState(360)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth))
    ro.observe(el)
    setBoxW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  // 카드 너비: 화면의 78%(최대 320px), 사이 16px, 양옆 카드가 살짝 보이게 가운데 정렬
  const cardW = Math.min(boxW * 0.78, 320)
  const offsetFor = (i: number) => (boxW - cardW) / 2 - i * (cardW + GAP)
  const x = useMotionValue(offsetFor(index))
  const [dragging, setDragging] = useState(false)
  // 끄는 동안 가운데 카드가 끌리는 방향으로 최대 6도 기울어짐
  const drag = useTransform(x, (v) => v - offsetFor(index))
  const tilt = useTransform(drag, [-160, 0, 160], [-6, 0, 6])

  useEffect(() => {
    const target = offsetFor(index)
    if (reduced) x.set(target)
    else {
      const a = animate(x, target, SPRING)
      return () => a.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, boxW, cardW, reduced])

  const go = (i: number) => setIndex(Math.max(0, Math.min(count - 1, i)))
  const onDragEnd = (_: unknown, info: PanInfo) => {
    setDragging(false)
    if (info.offset.x < -80 || info.velocity.x < -500) go(index + 1)
    else if (info.offset.x > 80 || info.velocity.x > 500) go(index - 1)
    else if (reduced) x.set(offsetFor(index))
    else animate(x, offsetFor(index), SPRING)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    go(index + (e.key === 'ArrowRight' ? 1 : -1))
  }

  return (
    <div aria-roledescription="carousel" aria-label="추억 앨범" tabIndex={0} onKeyDown={onKey} className="rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
      <div ref={boxRef} className="-mx-4 overflow-hidden px-0 py-3 md:mx-0">
        <motion.div
          className="flex touch-pan-y items-start"
          style={{ x, gap: GAP }}
          drag="x"
          dragConstraints={{ left: offsetFor(count - 1), right: offsetFor(0) }}
          dragElastic={0.2}
          dragMomentum={false}
          onDragStart={() => setDragging(true)}
          onDragEnd={onDragEnd}
        >
          {Array.from({ length: count }, (_, i) => {
            const active = i === index
            return (
              <motion.div
                key={i}
                role="group"
                aria-roledescription="slide"
                aria-label={`${count}개 중 ${i + 1}번째, ${labels[i]}`}
                aria-hidden={!active}
                style={{ width: cardW, rotate: active && dragging && !reduced ? tilt : 0 }}
                animate={{ scale: active ? 1 : 0.92, opacity: active ? 1 : 0.6 }}
                transition={reduced ? { duration: 0 } : SPRING}
                className="shrink-0"
                onClickCapture={(e) => {
                  // 옆 카드를 누르면 그 카드로 넘어간다
                  if (!active) {
                    e.stopPropagation()
                    e.preventDefault()
                    go(i)
                  }
                }}
              >
                <div inert={!active || undefined}>{children(i)}</div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
        <button type="button" aria-label="이전 카드" disabled={index === 0} onClick={() => go(index - 1)} className="flex size-11 items-center justify-center rounded-full border border-stone-300 text-lg disabled:opacity-30">
          ‹
        </button>
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: count }, (_, i) => (
            <motion.span key={i} className="h-1.5 rounded-full" animate={{ width: i === index ? 20 : 6, backgroundColor: i === index ? 'var(--color-teal-700)' : 'var(--color-stone-300)' }} transition={reduced ? { duration: 0 } : SPRING} />
          ))}
        </div>
        <button type="button" aria-label="다음 카드" disabled={index === count - 1} onClick={() => go(index + 1)} className="flex size-11 items-center justify-center rounded-full border border-stone-300 text-lg disabled:opacity-30">
          ›
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {count}개 중 {index + 1}번째 카드
      </p>
    </div>
  )
}

// ---------------- 카드 ----------------

function SummaryCard({ list, onPick }: { list: TripMemory[]; onPick: (i: number) => void }) {
  const t = today()
  const past = list.filter((m) => m.start <= t)
  const totalDays = past.reduce((a, m) => a + Math.max(1, diffDays(m.start, m.end) + 1), 0)
  const compared = past.map(compareSpent).filter((c): c is NonNullable<typeof c> => !!c)
  const avgDiff = compared.length ? compared.reduce((a, c) => a + c.diff, 0) / compared.length : null
  return (
    <div className="flex h-[30rem] flex-col rounded-3xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-teal-700">나의 여행</p>
      <p className="mt-3 text-3xl font-bold leading-tight">
        다녀온 나라 {countVisited(list, null)}개국
        <br />총 {totalDays}일
      </p>
      {avgDiff != null && (
        <p className="mt-2 text-sm text-stone-600">
          비교한 여행 {compared.length}번, 예상보다 평균{' '}
          <b className={avgDiff > 0 ? 'text-rose-600' : 'text-teal-700'}>
            {Math.abs(Math.round(avgDiff * 100))}% {avgDiff > 0 ? '더' : '덜'}
          </b>{' '}
          썼어요
        </p>
      )}
      <ul className="no-scrollbar mt-5 flex-1 touch-pan-y space-y-1 overflow-y-auto">
        {list.map((m, i) => (
          <li key={m.id}>
            <button type="button" onClick={() => onPick(i)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left active:bg-stone-100">
              <Flag code={m.code} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {m.name} · {m.place.name}
                </span>
                <span className="block text-xs text-stone-500">
                  {formatKo(m.start)}
                  {m.start > t && ' · 예정'}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-stone-400">옆으로 넘기거나 여행을 누르면 카드로 가요</p>
    </div>
  )
}

/** 내 사진을 IndexedDB에서 꺼내 주소로 (카드가 사라지면 정리) */
function usePhotoUrl(id: string | undefined) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!id) return setUrl(null)
    let u: string | null = null
    let alive = true
    getPhoto(id)
      .then((b) => {
        if (b && alive) setUrl((u = URL.createObjectURL(b)))
      })
      .catch(() => undefined)
    return () => {
      alive = false
      if (u) URL.revokeObjectURL(u)
    }
  }, [id])
  return url
}

/** 경비 탭에서 고른 인원·예산 스타일 (없으면 2명·보통) */
function budgetPrefs(): { adults: number; tier: 0 | 1 | 2 } {
  try {
    const v = JSON.parse(localStorage.getItem('hidden-travel:budget') ?? '{}') as { party?: { type?: string; adults?: number }; tier?: number }
    const p = v.party ?? {}
    const adults = p.type === 'solo' ? 1 : p.type === 'couple' ? 2 : Math.max(1, p.adults ?? 2)
    return { adults, tier: v.tier === 0 || v.tier === 2 ? v.tier : 1 }
  } catch {
    return { adults: 2, tier: 1 }
  }
}

/** 예상 경비 (경비 탭 인원·스타일, 저장된 USD 환율로 계산, 없으면 null). local은 항공권을 뺀 현지 경비 */
function estimateFor(m: TripMemory): { total: number; local: number; adults: number } | null {
  const usd = readCache<{ rates: Record<string, number> }>('rates:frankfurter:KRW', Infinity)?.data.rates.USD
  if (!usd) return null
  const days = Math.max(1, diffDays(m.start, m.end) + 1)
  const { adults, tier } = budgetPrefs()
  const row = estimateAll({ days, adults, tier, startDate: m.start, usdKrw: 1 / usd }).find((a) => a.country.code === m.code)
  return row ? { total: row.total, local: row.local, adults } : null
}

/** 실제로 쓴 돈: 정산 탭 기록을 매번 다시 읽는다 (카드를 만든 뒤에 추가한 지출도 반영) */
const spentOf = (m: TripMemory) => readSpent(m.code, m.start) || m.spent || 0
const man = (krw: number) => `${Math.round(krw / 10000).toLocaleString('ko-KR')}만 원`

/** 예상 현지 경비와 실제 지출 비교 */
function compareSpent(m: TripMemory) {
  const spent = spentOf(m)
  const est = estimateFor(m)
  if (!spent || !est || est.local <= 0) return null
  const diff = (spent - est.local) / est.local
  return { spent, expected: est.local, adults: est.adults, diff }
}

function SpentCompare({ c }: { c: NonNullable<ReturnType<typeof compareSpent>> }) {
  const max = Math.max(c.spent, c.expected)
  const pct = Math.round(Math.abs(c.diff) * 100)
  const verdict = pct < 5 ? '예상과 거의 같게 썼어요' : c.diff > 0 ? `예상보다 ${pct}% 더 썼어요` : `예상보다 ${pct}% 덜 썼어요`
  return (
    <div className="mt-1 space-y-1 text-xs" aria-label={`실제 ${man(c.spent)}, 예상 ${man(c.expected)}, ${verdict}`}>
      <p className="text-sm">
        <span className="text-xs text-stone-500">쓴 돈 </span>
        <b>{man(c.spent)}</b> <span className={pct < 5 ? 'text-stone-500' : c.diff > 0 ? 'text-rose-600' : 'text-teal-700'}>· {verdict}</span>
      </p>
      {[
        ['실제', c.spent, 'bg-stone-900'],
        ['예상', c.expected, 'bg-stone-400'],
      ].map(([label, v, color]) => (
        <div key={label as string} className="flex items-center gap-2">
          <span className="w-7 text-stone-500">{label}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
            <span className={`block h-full rounded-full ${color}`} style={{ width: `${((v as number) / max) * 100}%` }} />
          </span>
        </div>
      ))}
      <p className="text-[10px] text-stone-400">예상은 항공권을 뺀 현지 경비({c.adults}명, 경비 탭 설정 기준), 실제는 정산 탭 기록이에요</p>
    </div>
  )
}

function TripCard({ m, all, canPhoto, onUpdate, onDelete }: { m: TripMemory; all: TripMemory[]; canPhoto: boolean; onUpdate: (id: string, p: Partial<TripMemory>) => void; onDelete: (m: TripMemory) => void }) {
  const planned = m.start > today()
  const photo = usePhotoUrl(m.photoIds[0])
  const spotPhoto = m.spots.find((s) => s.image)?.image
  const [editing, setEditing] = useState(false)
  const [memo, setMemo] = useState(m.memo)
  const [busy, setBusy] = useState<'share' | 'photo' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const days = Math.max(1, diffDays(m.start, m.end) + 1)
  const expected = planned ? (estimateFor(m)?.total ?? null) : null
  const compare = planned ? null : compareSpent(m)
  const spent = planned ? 0 : spentOf(m)
  const country = getCountry(m.code)

  const share = async () => {
    setBusy('share')
    try {
      const first = m.photoIds[0] ? await getPhoto(m.photoIds[0]).catch(() => undefined) : undefined
      const blob = await drawRetro({ ...m, spent: planned ? m.spent : spentOf(m) || null }, { countries: countVisited(all, null), photo: first ?? null, planned, expected })
      await shareOrDownload(blob, `숨은여행-${m.name}-${m.start}.png`)
    } finally {
      setBusy(null)
    }
  }
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX_PHOTOS - m.photoIds.length
    if (room <= 0) return setMsg(`사진은 여행마다 ${MAX_PHOTOS}장까지예요`)
    setBusy('photo')
    try {
      const ids: string[] = []
      for (const f of [...files].slice(0, room)) ids.push(await savePhoto(await shrinkImage(f)))
      onUpdate(m.id, { photoIds: [...m.photoIds, ...ids] })
      setMsg(files.length > room ? `${room}장만 넣었어요 (최대 ${MAX_PHOTOS}장)` : null)
    } catch {
      setMsg('사진을 저장하지 못했어요')
    } finally {
      setBusy(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <article className="flex h-[30rem] flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white">
      <div className="relative h-44 shrink-0 bg-stone-100">
        {photo ? (
          <img src={photo} alt={`${m.name} 여행 사진`} draggable={false} className="size-full object-cover" />
        ) : spotPhoto ? (
          <img src={photoUrl(spotPhoto, 640)} alt={m.spots[0]?.name ?? ''} draggable={false} className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-teal-50 to-stone-100">
            <Flag code={m.code} size="lg" />
          </div>
        )}
        {planned && <span className="absolute left-3 top-3 rounded-full bg-teal-700 px-2.5 py-0.5 text-[11px] font-bold text-stone-50">예정</span>}
        {m.photoIds.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">사진 {m.photoIds.length}장</span>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <Flag code={m.code} size="sm" />
          <p className="truncate font-bold">
            {country?.nameKo ?? m.name} · {m.place.name}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-stone-500">
          {formatKo(m.start)} – {formatKo(m.end)} · {days}일
        </p>
        {m.spots.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {m.spots.map((s) => (
              <span key={s.id} className="max-w-full truncate rounded-full border border-stone-200 px-2 py-0.5 text-[11px] text-stone-600">
                {s.name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 min-h-0 flex-1">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onUpdate(m.id, { memo: memo.trim().slice(0, MAX_MEMO) })
                setEditing(false)
              }}
            >
              <textarea
                autoFocus
                value={memo}
                maxLength={MAX_MEMO}
                rows={2}
                onChange={(e) => setMemo(e.target.value)}
                aria-label="메모"
                className="w-full resize-none rounded-lg border border-stone-300 bg-white p-2 text-sm"
              />
              <div className="flex items-center justify-between text-[11px] text-stone-500">
                <span>
                  {memo.length}/{MAX_MEMO}
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => (setMemo(m.memo), setEditing(false))} className="px-2 py-1">
                    취소
                  </button>
                  <button type="submit" className="rounded-full bg-stone-900 px-3 py-1 font-semibold text-stone-50">
                    저장
                  </button>
                </span>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => (setMemo(m.memo), setEditing(true))} className="w-full text-left text-sm text-stone-700" aria-label="메모 수정">
              {m.memo ? `“${m.memo}”` : <span className="text-stone-400">메모를 남겨 보세요 (80자)</span>}
            </button>
          )}
        </div>
        {compare ? (
          <SpentCompare c={compare} />
        ) : (
          <p className="mt-1 text-sm">
            <span className="text-xs text-stone-500">{planned ? '예상 경비 ' : '쓴 돈 '}</span>
            <b>{planned ? (expected ? `약 ${man(expected)}` : '환율을 불러오면 계산돼요') : spent ? `${Math.round(spent).toLocaleString('ko-KR')}원` : '기록 없음'}</b>
            {!planned && !spent && <span className="block text-[11px] text-stone-400">정산 탭에 지출을 적으면 예상 경비와 비교해 드려요</span>}
          </p>
        )}
        {msg && <p className="mt-1 text-[11px] text-amber-700">{msg}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <button type="button" onClick={share} disabled={busy !== null} className="rounded-full bg-stone-900 px-3 py-1.5 font-semibold text-stone-50 disabled:opacity-50">
            {busy === 'share' ? '만드는 중…' : '저장·공유'}
          </button>
          {canPhoto && (
            <>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== null || m.photoIds.length >= MAX_PHOTOS} className="rounded-full border border-stone-300 px-3 py-1.5 disabled:opacity-40">
                {busy === 'photo' ? '줄이는 중…' : '사진 추가'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
            </>
          )}
          <button type="button" onClick={() => onDelete(m)} className="rounded-full px-3 py-1.5 text-stone-500">
            삭제
          </button>
        </div>
      </div>
    </article>
  )
}

function UndoToast({ undo, onUndo }: { undo: { memory: TripMemory } | null; onUndo: () => void }) {
  return (
    <AnimatePresence>
      {undo && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed inset-x-4 bottom-24 z-[1600] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl border border-stone-300 bg-white px-4 py-3 shadow-2xl md:bottom-8"
        >
          <span className="text-sm">{undo.memory.name} 카드를 지웠어요</span>
          <button type="button" onClick={onUndo} className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-stone-50">
            되돌리기
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
