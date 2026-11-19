import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import type { Country, Place, TripDates } from '../types'
import { placeKeyOf, useWishlist } from '../lib/wishlist'
import { useMemories, type TripMemory } from '../lib/memories'
import { MemoryCarousel } from './MemoryCarousel'
import { commonsDirectThumb } from '../lib/md5'
import { diffDays, formatKo } from '../lib/dates'
import { balances, type Expense, type Member } from '../lib/settle'
import { shareOrDownload } from './HomeSection'
import { Num } from './ui/Num'

/** 여행 회고: 위쪽은 추억 앨범(캐러셀), 아래쪽은 지금 여행의 카드 만들기 */
export function RetroSection({ country, place, dates }: { country: Country; place: Place; dates: TripDates }) {
  const { wish } = useWishlist(placeKeyOf(place))
  const memories = useMemories()
  const spent = readSpent(country.code, dates.start)
  const days = Math.max(1, diffDays(dates.start, dates.end) + 1)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [blob, setBlob] = useState<Blob | null>(null)
  // 만든 직후 앨범에서 그 여행 카드로 넘어가게 (나라:시작일)
  const [focusKey, setFocusKey] = useState<string | null>(null)

  const existing = memories.list.find((m) => m.code === country.code && m.start === dates.start)
  const countries = countVisited(memories.list, existing ? null : country.code)

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  const make = async () => {
    setBusy(true)
    try {
      // 명소: 관심 목록(하트) 기능이 생기면 그 목록을, 지금은 카드 넘기기의 '가고 싶다' 목록을 쓴다
      const spots = wish.liked.slice(0, 4).map((s) => ({ id: s.id, name: s.name, ...(s.image ? { image: s.image } : {}) }))
      const data = { code: country.code, name: country.nameKo, place: { name: place.name, lat: place.lat, lng: place.lng }, start: dates.start, end: dates.end, spots, spent: spent || null }
      memories.upsert(data)
      const memory: TripMemory = { id: existing?.id ?? 'new', memo: existing?.memo ?? '', photoIds: existing?.photoIds ?? [], updatedAt: Date.now(), ...data }
      const b = await drawRetro(memory, { countries })
      setBlob(b)
      setUrl((old) => {
        if (old) URL.revokeObjectURL(old)
        return URL.createObjectURL(b)
      })
      setFocusKey(`${country.code}:${dates.start}:${Date.now()}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-12">
      <MemoryCarousel memories={memories} focusKey={focusKey} onMake={make} />

      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10 lg:space-y-0">
        <div className="space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">이번 여행 카드 만들기</h3>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="다녀온 나라" value={countries} suffix="개국" />
            <Stat label="이번 여행" value={days} suffix="일" />
            <Stat label="가고 싶다로 고른 곳" value={wish.liked.length} suffix="곳" />
          </div>
          <div className="rounded-2xl border border-stone-200 p-4 text-sm text-stone-600">
            <p>
              카드에 들어가는 것: 나라·도시·날짜, <b className="text-stone-800">일정 탭에서 '가고 싶다'로 고른 명소</b>(최대 4곳),{' '}
              <b className="text-stone-800">돈 탭 더치페이에 기록한 총액</b>
              {spent ? ` (${Math.round(spent).toLocaleString('ko-KR')}원)` : ' (기록이 없으면 빠져요)'}. 만들면 위 앨범에도 쌓여요.
            </p>
          </div>
          <button type="button" onClick={make} disabled={busy} className="h-12 w-full rounded-xl bg-stone-900 text-base font-semibold text-stone-50 disabled:opacity-50">
            {busy ? '사진을 모아 그리는 중…' : existing ? '이번 여행 카드 다시 만들기' : '회고 카드 만들기'}
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
    </div>
  )
}

/** 다녀온 나라 수 (시작일이 오늘 이후인 '예정' 여행은 빼고, extra는 지금 만들 나라) */
export function countVisited(list: TripMemory[], extra: string | null) {
  const today = new Date().toISOString().slice(0, 10)
  const codes = new Set(list.filter((m) => m.start <= today).map((m) => m.code))
  if (extra) codes.add(extra)
  return codes.size
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

export function readSpent(code: string, start: string) {
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

/** 1080×1920 회고 카드 이미지. 내 사진이 있으면 크게, 없으면 명소 사진 격자 */
export async function drawRetro(m: TripMemory, opts: { countries: number; photo?: Blob | null; planned?: boolean; expected?: number | null }) {
  const W = 1080
  const H = 1920
  const days = Math.max(1, diffDays(m.start, m.end) + 1)
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
  x.fillText(`HIDDEN TRAVEL · ${opts.planned ? '여행 예정' : '여행 회고'}`, 90, 150)
  x.fillStyle = '#fafafa'
  x.font = '800 132px system-ui, sans-serif'
  x.fillText(clip(x, m.name, W - 180), 90, 310)
  x.fillStyle = '#c9c9c9'
  x.font = '500 48px system-ui, sans-serif'
  x.fillText(clip(x, `${m.place.name} · ${days}일`, W - 180), 90, 390)
  x.fillStyle = '#8f8f8f'
  x.font = '400 38px system-ui, sans-serif'
  x.fillText(`${formatKo(m.start)} – ${formatKo(m.end)}`, 90, 450)

  const gx = 90
  const gy = 540
  if (opts.photo) {
    // 내 사진을 크게
    const img = await loadImage(URL.createObjectURL(opts.photo))
    const w = W - gx * 2
    const h = 760
    x.save()
    roundRect(x, gx, gy, w, h, 40)
    x.clip()
    x.fillStyle = '#1a1a1a'
    x.fillRect(gx, gy, w, h)
    if (img) {
      const r = Math.max(w / img.width, h / img.height)
      x.drawImage(img, gx + (w - img.width * r) / 2, gy + (h - img.height * r) / 2, img.width * r, img.height * r)
    }
    x.restore()
    x.fillStyle = '#fafafa'
    x.font = '500 34px system-ui, sans-serif'
    x.fillText(clip(x, m.spots.map((s) => s.name).join(' · '), w), gx, gy + h + 60)
  } else {
    // 명소 사진 격자 (사진 있는 4곳)
    const withPhoto = m.spots.filter((s) => s.image && !/^https?:/.test(s.image)).slice(0, 4)
    const imgs = await Promise.all(withPhoto.map((s) => loadImage(commonsDirectThumb(s.image!, 500))))
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
      x.fillText(m.spots.length ? clip(x, m.spots.map((s) => s.name).join(' · '), W - 180) : '일정 탭에서 가고 싶은 곳을 골라 보세요', 90, 700)
    }
  }
  if (m.memo) {
    x.fillStyle = '#e4e4e4'
    x.font = 'italic 400 40px system-ui, sans-serif'
    x.fillText(clip(x, `“${m.memo}”`, W - 180), 90, 1460)
  }

  const by = 1580
  const money = opts.planned ? (opts.expected ? `${Math.round(opts.expected / 10000).toLocaleString('ko-KR')}만 원` : '–') : m.spent ? `${Math.round(m.spent / 10000).toLocaleString('ko-KR')}만 원` : '–'
  const stats: [string, string][] = [
    ['고른 숨은 명소', `${m.spots.length}곳`],
    [opts.planned ? '예상 경비' : '쓴 돈', money],
    ['다녀온 나라', `${opts.countries}개국`],
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
