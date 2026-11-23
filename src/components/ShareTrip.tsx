import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import type { Country, Place, TripDates } from '../types'
import { placeKeyOf, useWishlist } from '../lib/wishlist'
import { decodeLiked, shareTrip, shareUrl } from '../lib/share'
import { formatKo } from '../lib/dates'

/** 상단의 '공유' 버튼: 누르면 QR 코드와 공유·복사 버튼이 있는 창이 열린다 */
export function ShareTrip({ country, place, dates }: { country: Country; place: Place; dates: TripDates }) {
  const wl = useWishlist(placeKeyOf(place))
  const [toast, setToast] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const title = `${country.nameKo} ${place.name} ${formatKo(dates.start)}~`
  const run = async (onlyCopy: boolean) => {
    const msg = await shareTrip(title, wl.wish.liked, onlyCopy)
    if (msg) setToast(msg)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`이 여행 공유${wl.wish.liked.length ? ` (관심 장소 ${wl.wish.liked.length}곳 포함)` : ''}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-stone-300 text-stone-700"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
          <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {/* 머리말(header)의 흐림 효과 안에 두면 화면 전체를 덮지 못하므로 body에 바로 그린다 */}
      {createPortal(
        <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[2000] flex items-end justify-center bg-stone-900/50 p-4 sm:items-center"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="여행 공유"
              initial={{ y: 30 }}
              animate={{ y: 0 }}
              exit={{ y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-5 text-center"
            >
              <p className="font-semibold">이 여행 공유</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {title}
                {wl.wish.liked.length > 0 && ` · 관심 장소 ${Math.min(wl.wish.liked.length, 12)}곳 포함`}
              </p>
              <ShareQr url={shareUrl(wl.wish.liked)} />
              <p className="text-xs text-stone-500">휴대폰 카메라로 찍으면 같은 여행 화면이 열려요.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => run(false)} className="h-11 rounded-full bg-stone-900 text-sm font-semibold text-stone-50">
                  공유하기
                </button>
                <button type="button" onClick={() => run(true)} className="h-11 rounded-full border border-stone-300 text-sm font-semibold">
                  링크 복사
                </button>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="mt-2 h-10 w-full text-sm text-stone-600">
                닫기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed inset-x-4 bottom-24 z-[2050] mx-auto max-w-sm rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm shadow-2xl md:bottom-8"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
        </>,
        document.body,
      )}
    </>
  )
}

/** QR 코드 (qrcode 라이브러리는 창을 열 때만 불러온다). 검은 무늬·흰 바탕이라 어두운 화면에서도 잘 찍힌다 */
function ShareQr({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    import('qrcode')
      .then((m) => m.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 480, color: { dark: '#000000', light: '#ffffff' } }))
      .then((d) => alive && setSrc(d))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [url])
  return (
    <div className="mx-auto my-4 flex size-56 items-center justify-center rounded-2xl bg-white ring-1 ring-stone-200">
      {src ? (
        <img src={src} alt="여행 링크 QR 코드" className="size-52 [image-rendering:pixelated]" />
      ) : (
        <span className="px-4 text-xs text-stone-500">{failed ? 'QR 코드를 만들지 못했어요. 링크 복사를 써 주세요.' : 'QR 코드 만드는 중…'}</span>
      )}
    </div>
  )
}

/** 친구가 보낸 링크(?w=…)의 관심 장소를 내 관심 목록에 넣는다 (화면에 한 번만 둔다) */
export function SharedWishImport({ place }: { place: Place }) {
  const wl = useWishlist(placeKeyOf(place))
  const [toast, setToast] = useState<string | null>(null)
  // 관심 목록에 합치고 주소에서 지운다
  useEffect(() => {
    const u = new URL(location.href)
    const z = u.searchParams.get('z')
    const w = u.searchParams.get('w')
    if (!z && !w) return
    const items = z ? decodeLiked(z, 'z') : decodeLiked(w!, 'w')
    u.searchParams.delete('z')
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
