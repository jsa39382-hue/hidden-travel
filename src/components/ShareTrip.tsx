import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Country, Place, TripDates } from '../types'
import { placeKeyOf, useWishlist } from '../lib/wishlist'
import { decodeLiked, shareTrip } from '../lib/share'
import { formatKo } from '../lib/dates'

/** 상단의 '공유' 버튼 + 받은 링크의 관심 목록 넣기 */
export function ShareTrip({ country, place, dates }: { country: Country; place: Place; dates: TripDates }) {
  const wl = useWishlist(placeKeyOf(place))
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const share = async () => {
    const msg = await shareTrip(`${country.nameKo} ${place.name} ${formatKo(dates.start)}~`, wl.wish.liked)
    if (msg) setToast(msg)
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        aria-label={`이 여행 공유${wl.wish.liked.length ? ` (관심 장소 ${wl.wish.liked.length}곳 포함)` : ''}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-stone-300 text-stone-700"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed inset-x-4 bottom-24 z-[1650] mx-auto max-w-sm rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm shadow-2xl md:bottom-8"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/** 친구가 보낸 링크(?w=…)의 관심 장소를 내 관심 목록에 넣는다 (화면에 한 번만 둔다) */
export function SharedWishImport({ place }: { place: Place }) {
  const wl = useWishlist(placeKeyOf(place))
  const [toast, setToast] = useState<string | null>(null)
  // 관심 목록에 합치고 주소에서 지운다
  useEffect(() => {
    const u = new URL(location.href)
    const w = u.searchParams.get('w')
    if (!w) return
    const items = decodeLiked(w)
    u.searchParams.delete('w')
    history.replaceState(null, '', u.toString())
    if (!items.length) return
    let added = 0
    for (const it of items)
      if (!wl.wish.liked.some((x) => x.id === it.id)) {
        wl.like({ ...it, image: undefined } as never)
        added++
      }
    setToast(added ? `친구가 보낸 관심 장소 ${added}곳을 관심 목록(♥)에 넣었어요` : '친구가 보낸 장소는 이미 관심 목록에 있어요')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed inset-x-4 bottom-24 z-[1650] mx-auto max-w-sm rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm shadow-2xl md:bottom-8"
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
