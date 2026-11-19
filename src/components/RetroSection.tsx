import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { Country, Place, TripDates } from '../types'
import { placeKeyOf, useWishlist } from '../lib/wishlist'
import { useStored } from '../lib/stored'
import { commonsDirectThumb } from '../lib/md5'
import { diffDays, formatKo } from '../lib/dates'
import { balances, type Expense, type Member } from '../lib/settle'
import { shareOrDownload } from './HomeSection'
import { Num } from './ui/Num'

interface TripLog {
  code: string
  name: string
  start: string
  end: string
}

/** 여행 회고 카드: 인스타 스토리 크기(1080×1920) 이미지로 만들어 저장·공유 */
export function RetroSection({ country, place, dates }: { country: Country; place: Place; dates: TripDates }) {
  const { wish } = useWishlist(placeKeyOf(place))
  const [trips, setTrips] = useStored<TripLog[]>('hidden-travel:trips', [], Array.isArray)
  const spent = readSpent(country.code, dates.start)
  const days = Math.max(1, diffDays(dates.start, dates.end) + 1)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [blob, setBlob] = useState<Blob | null>(null)

  const thisTrip: TripLog = { code: country.code, name: country.nameKo, start: dates.start, end: dates.end }
  const allTrips = trips.some((t) => t.code === thisTrip.code && t.start === thisTrip.start) ? trips : [...trips, thisTrip]
  const countries = new Set(allTrips.map((t) => t.code)).size

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  const make = async () => {
    setBusy(true)
    try {
      const b = await drawRetro({ country, place, dates, days, spots: wish.liked, spent, countries })
      setBlob(b)
      setUrl((old) => {
        if (old) URL.revokeObjectURL(old)
        return URL.createObjectURL(b)
      })
      setTrips(allTrips)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10 lg:space-y-0">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="다녀온 나라" value={countries} suffix="개국" />
          <Stat label="이번 여행" value={days} suffix="일" />
          <Stat label="가고 싶다로 고른 곳" value={wish.liked.length} suffix="곳" />
        </div>
        <div className="rounded-2xl border border-stone-200 p-4 text-sm text-stone-600">
          <p>
            카드에 들어가는 것: 나라·도시·날짜, <b className="text-stone-800">일정 탭에서 '가고 싶다'로 고른 명소</b>(사진 포함 최대 4곳),{' '}
            <b className="text-stone-800">돈 탭 더치페이에 기록한 총액</b>
            {spent ? ` (${Math.round(spent).toLocaleString('ko-KR')}원)` : ' (기록이 없으면 빠져요)'}.
          </p>
        </div>
        <button type="button" onClick={make} disabled={busy} className="h-12 w-full rounded-xl bg-stone-900 text-base font-semibold text-stone-50 disabled:opacity-50">
          {busy ? '사진을 모아 그리는 중…' : url ? '다시 만들기' : '회고 카드 만들기'}
        </button>
        {blob && (
          <button type="button" onClick={() => shareOrDownload(blob, `숨은여행-${country.nameKo}-회고.png`)} className="h-12 w-full rounded-xl border border-stone-300 text-base font-semibold text-stone-800">
            저장·공유하기
          </button>
        )}
        <p className="text-[11px] text-stone-400">이미지는 이 기기에서만 만들어져요. 휴대폰에서는 공유 창으로 인스타그램 스토리에 바로 올릴 수 있어요.</p>
      </div>
      <div className="flex justify-center">
        {url ? (
          <motion.img
            key={url}
            src={url}
            alt="여행 회고 카드 미리보기"
            initial={{ scale: 0.8, rotate: -4, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="w-64 rounded-3xl border border-stone-200 shadow-2xl"
          />
        ) : (
          <div className="flex aspect-[9/16] w-64 items-center justify-center rounded-3xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-400">
            여기에 스토리 크기(9:16) 카드가 나와요
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3">
      <p className="text-[11px] text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">
        <Num value={value} />
        <span className="ml-0.5 text-sm font-medium text-stone-500">{suffix}</span>
      </p>
    </div>
  )
}

function readSpent(code: string, start: string) {
  try {
    const book = JSON.parse(localStorage.getItem(`hidden-travel:settle:${code}:${start}`) ?? 'null') as { members: Member[]; expenses: Expense[] } | null
    if (!book?.expenses?.length) return 0
    // 저장된 환율 캐시로 원화 환산 (없는 통화는 빠짐)
    const rateOf = (c: string) => {
      if (c === 'KRW') return 1
      for (const k of ['rates:frankfurter:KRW', 'rates:erapi:KRW']) {
        const e = JSON.parse(localStorage.getItem('hidden-travel:v1:' + k) ?? 'null') as { data?: { rates?: Record<string, number> } } | null
        const r = e?.data?.rates?.[c]
        if (r) return 1 / r
      }
      return null
    }
    return balances(book.members, book.expenses, rateOf).total
  } catch {
    return 0
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((res) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = src
    setTimeout(() => res(null), 8000)
  })
}

async function drawRetro(o: {
  country: Country
  place: Place
  dates: TripDates
  days: number
  spots: { name: string; kind: string; image?: string }[]
  spent: number
  countries: number
}) {
  const W = 1080
  const H = 1920
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')!
  const grad = x.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#0f1a18')
  grad.addColorStop(1, '#0a0a0a')
  x.fillStyle = grad
  x.fillRect(0, 0, W, H)

  x.fillStyle = '#5eead4'
  x.font = '600 36px system-ui, sans-serif'
  x.fillText('HIDDEN TRAVEL · 여행 회고', 90, 150)
  x.fillStyle = '#fafafa'
  x.font = '800 132px system-ui, sans-serif'
  x.fillText(o.country.nameKo, 90, 310)
  x.fillStyle = '#c9c9c9'
  x.font = '500 48px system-ui, sans-serif'
  x.fillText(`${o.place.name} · ${o.days}일`, 90, 390)
  x.fillStyle = '#8f8f8f'
  x.font = '400 38px system-ui, sans-serif'
  x.fillText(`${formatKo(o.dates.start)} – ${formatKo(o.dates.end)}`, 90, 450)

  // 사진 격자 (가고 싶다로 고른 곳 중 사진 있는 4곳)
  const withPhoto = o.spots.filter((s) => s.image && !/^https?:/.test(s.image)).slice(0, 4)
  const imgs = await Promise.all(withPhoto.map((s) => loadImage(commonsDirectThumb(s.image!, 500))))
  const gx = 90
  const gy = 540
  const cell = (W - gx * 2 - 24) / 2
  withPhoto.forEach((s, i) => {
    const px = gx + (i % 2) * (cell + 24)
    const py = gy + Math.floor(i / 2) * (cell + 90)
    x.save()
    roundRect(x, px, py, cell, cell, 36)
    x.clip()
    x.fillStyle = '#1a1a1a'
    x.fillRect(px, py, cell, cell)
    const img = imgs[i]
    if (img) {
      const r = Math.max(cell / img.width, cell / img.height)
      x.drawImage(img, px + (cell - img.width * r) / 2, py + (cell - img.height * r) / 2, img.width * r, img.height * r)
    }
    x.restore()
    x.fillStyle = '#fafafa'
    x.font = '600 34px system-ui, sans-serif'
    x.fillText(clip(x, s.name, cell), px, py + cell + 50)
  })
  if (!withPhoto.length) {
    x.fillStyle = '#6b6b6b'
    x.font = '400 38px system-ui, sans-serif'
    x.fillText('일정 탭에서 가고 싶은 곳을 골라 보세요', 90, 700)
  }

  // 숫자
  const by = 1560
  const stats: [string, string][] = [
    ['고른 숨은 명소', `${o.spots.length}곳`],
    ['쓴 돈', o.spent ? `${Math.round(o.spent / 10000).toLocaleString('ko-KR')}만 원` : '–'],
    ['다녀온 나라', `${o.countries}개국`],
  ]
  stats.forEach(([k, v], i) => {
    const px = 90 + i * 310
    x.fillStyle = '#8f8f8f'
    x.font = '400 32px system-ui, sans-serif'
    x.fillText(k, px, by)
    x.fillStyle = '#fafafa'
    x.font = '700 64px system-ui, sans-serif'
    x.fillText(v, px, by + 80)
  })
  x.fillStyle = '#4a4a4a'
  x.font = '400 28px system-ui, sans-serif'
  x.fillText('jsa39382-hue.github.io/hidden-travel · 사진: 위키미디어 공용', 90, H - 90)
  return new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/png'))
}

function roundRect(x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number) {
  x.beginPath()
  x.moveTo(px + r, py)
  x.arcTo(px + w, py, px + w, py + h, r)
  x.arcTo(px + w, py + h, px, py + h, r)
  x.arcTo(px, py + h, px, py, r)
  x.arcTo(px, py, px + w, py, r)
  x.closePath()
}

function clip(x: CanvasRenderingContext2D, s: string, maxW: number) {
  if (x.measureText(s).width <= maxW) return s
  let t = s
  while (t && x.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}
