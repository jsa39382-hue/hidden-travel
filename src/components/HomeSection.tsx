import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import type { Country, Place, TripDates } from '../types'
import { useAsync } from '../lib/useAsync'
import { getGoodTime, grade, rankCountries, type Part } from '../lib/goodTime'
import { getWeather } from '../lib/weather'
import { plugAdvice, timeDiff, useSurvival, voltageAdvice, type SurvivalData } from '../lib/survival'
import { climateForTrip } from '../lib/climate'
import { VerdictCard } from './VerdictCard'
import { partyNumbers, usePartyPrefs } from '../lib/party'
import { timeZoneFor, tzOffsetSec } from '../lib/sun'
import { makePackingList, type PackItem } from '../lib/packing'
import { useStored } from '../lib/stored'
import { COUNTRIES, POPULAR_CODES } from '../lib/countries'
import { defaultPlace } from '../lib/places'
import { diffDays, isWithin } from '../lib/dates'
import { errorReasonKo } from '../lib/cache'
import { Num } from './ui/Num'
import { ErrorBox, Loading } from './Status'
import { Flag } from './Flag'

export function HomeSection({ country, place, dates, onPickCountry }: { country: Country; place: Place; dates: TripDates; onPickCountry: (code: string) => void }) {
  return (
    <div className="space-y-8">
      <VerdictCard country={country} place={place} dates={dates} />
      <div className="grid gap-4 lg:grid-cols-2">
        <GoodTimeCard country={country} place={place} dates={dates} />
        <SurvivalCard country={country} place={place} />
      </div>
      <Packing country={country} place={place} dates={dates} />
      <Compare dates={dates} current={country.code} onPick={onPickCountry} />
    </div>
  )
}

// ---------------- '지금 가면 이득' 지수 ----------------

function Bar({ label, part }: { label: string; part: Part }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-stone-500">{label}</span>
        <span className="font-semibold tabular-nums">{part.score == null ? '–' : part.score}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200">
        <motion.div
          className="h-full rounded-full bg-teal-700"
          initial={{ width: 0 }}
          animate={{ width: `${part.score ?? 0}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        />
      </div>
      <p className="mt-1 text-[11px] text-stone-500">{part.note}</p>
    </div>
  )
}

function GoodTimeCard({ country, place, dates }: { country: Country; place: Place; dates: TripDates }) {
  const g = useAsync(() => getGoodTime(country, place, dates), [country.code, place.lat, place.lng, dates.start, dates.end])
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">지금 가면 이득 지수</p>
      {g.status === 'error' ? (
        <ErrorBox message="지수를 계산하지 못했어요." detail={errorReasonKo(g.error)} onRetry={g.retry} />
      ) : g.status !== 'success' ? (
        <Loading label="환율·날씨·공휴일을 모으는 중…" />
      ) : (
        <>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-6xl font-bold leading-none tracking-tight">{g.data.total == null ? '–' : <Num value={g.data.total} />}</span>
            <span className="pb-1 text-sm text-stone-500">/ 100</span>
          </div>
          <p className="mt-2 font-semibold text-teal-700">{g.data.total == null ? '판단할 정보가 부족해요' : grade(g.data.total)}</p>
          <div className="mt-5 space-y-4">
            <Bar label="환율 (40%)" part={g.data.fx} />
            <Bar label="날씨 (35%)" part={g.data.weather} />
            <Bar label="공휴일·혼잡 (25%)" part={g.data.holiday} />
          </div>
          {g.data.festivals.length > 0 && <p className="mt-4 text-xs text-stone-600">여행 중 열리는 축제: {g.data.festivals.join(', ')}</p>}
          <p className="mt-4 text-[11px] text-stone-400">모르는 항목은 빼고 나머지로 계산해요. 환율: Frankfurter 30일 기록, 날씨: Open-Meteo</p>
        </>
      )}
    </div>
  )
}

// ---------------- 현지 생존 카드 ----------------

function survivalRows(country: Country, offsetSec: number | undefined, sv: SurvivalData | null) {
  const f = sv?.FACTS[country.code] ?? {}
  const tip = sv?.TIPS[country.code]
  const td = timeDiff(offsetSec)
  return [
    ['시차', td?.value ?? '–'],
    ['콘센트', `${plugAdvice(f).value}${plugAdvice(f).warn ? ' · 어댑터' : ''}`],
    ['전압', voltageAdvice(f.voltage).value],
    ['운전', f.driving === 'left' ? '좌측통행' : f.driving === 'right' ? '우측통행' : '–'],
    ['긴급', tip?.emergency ?? f.emergency?.join(' · ') ?? '–'],
    ['국가 번호', f.calling ?? '–'],
    ['팁', tip?.tipping.split('.')[0] ?? '–'],
    ['물', tip?.water.split('.')[0] ?? '–'],
  ] as [string, string][]
}

/** 홈에는 꼭 필요한 4가지만 (나머지·생존 문장은 정보 › 음식·팁). 이미지 저장에는 8가지 모두 넣는다 */
const KEY_FACTS = ['시차', '콘센트', '긴급', '물']

function SurvivalCard({ country, place }: { country: Country; place: Place }) {
  const tz = timeZoneFor(country.code, place.lat, place.lng)
  const w = useAsync(() => (tz ? Promise.resolve(null) : getWeather(place.lat, place.lng)), [tz, place.lat, place.lng])
  const sv = useSurvival()
  // 시차는 시간대로 계산 (날씨 서버가 막혀도 나오게), 시간대를 모르는 나라만 날씨 응답 값
  const offset = tz ? tzOffsetSec(tz) : w.status === 'success' && w.data ? w.data.data.utcOffsetSec : undefined
  const rows = survivalRows(country, offset, sv)
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try {
      const blob = await drawSurvivalCard(country, rows)
      await shareOrDownload(blob, `숨은여행-${country.nameKo}-생존카드.png`)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-500">현지 생존 카드</p>
        <button type="button" onClick={save} disabled={saving} className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700">
          {saving ? '만드는 중…' : '이미지로 저장'}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Flag code={country.code} />
        <p className="font-semibold">{country.nameKo}</p>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.filter(([k]) => KEY_FACTS.includes(k)).map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[11px] text-stone-500">{k}</dt>
            <dd className="text-sm font-semibold leading-snug">{v}</dd>
          </div>
        ))}
      </dl>
      <a href="#tips" className="mt-4 inline-block text-xs font-medium text-teal-700 underline underline-offset-2">
        전압·운전·팁·물, 현지 생존 문장(듣기) 모두 보기
      </a>
    </div>
  )
}

async function drawSurvivalCard(country: Country, rows: [string, string][]) {
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')!
  x.fillStyle = '#0a0a0a'
  x.fillRect(0, 0, W, H)
  x.fillStyle = '#5eead4'
  x.font = '600 34px system-ui, sans-serif'
  x.fillText('HIDDEN TRAVEL · 현지 생존 카드', 80, 130)
  x.fillStyle = '#fafafa'
  x.font = '700 96px system-ui, sans-serif'
  x.fillText(country.nameKo, 80, 250)
  rows.forEach(([k, v], i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const px = 80 + col * 480
    const py = 380 + row * 220
    x.fillStyle = '#8f8f8f'
    x.font = '400 34px system-ui, sans-serif'
    x.fillText(k, px, py)
    x.fillStyle = '#fafafa'
    x.font = '700 48px system-ui, sans-serif'
    wrap(x, v, px, py + 64, 420, 58, 2)
  })
  x.fillStyle = '#6b6b6b'
  x.font = '400 28px system-ui, sans-serif'
  x.fillText('출발 전 외교부 해외안전여행(0404.go.kr)에서 최신 정보를 확인하세요', 80, H - 80)
  return new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/png'))
}

function wrap(x: CanvasRenderingContext2D, text: string, px: number, py: number, maxW: number, lh: number, maxLines: number) {
  let line = ''
  let n = 0
  for (const ch of text) {
    if (x.measureText(line + ch).width > maxW) {
      if (++n >= maxLines) {
        x.fillText(line.slice(0, -1) + '…', px, py)
        return
      }
      x.fillText(line, px, py)
      line = ''
      py += lh
    }
    line += ch
  }
  x.fillText(line, px, py)
}

/** 휴대폰은 공유 창으로, 컴퓨터는 파일 다운로드로 */
export async function shareOrDownload(blob: Blob, name: string) {
  const file = new File([blob], name, { type: 'image/png' })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name })
      return
    }
  } catch {
    /* 사용자가 취소 → 다운로드로 */
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

// ---------------- 짐 체크리스트 ----------------

const GROUPS: PackItem['group'][] = ['필수', '옷', '전자기기', '생활', '아이']

function Packing({ country, place, dates }: { country: Country; place: Place; dates: TripDates }) {
  const w = useAsync(() => getWeather(place.lat, place.lng), [place.lat, place.lng])
  // 인원은 상단 버튼·경비 탭과 같은 설정 (바꾸면 바로 반영)
  const [partyPrefs] = usePartyPrefs()
  const { adults: people, kids } = partyNumbers(partyPrefs)
  const days = Math.max(1, diffDays(dates.start, dates.end) + 1)
  const forecast = useMemo(() => (w.status === 'success' ? w.data.data.days.filter((d) => isWithin(d.date, dates.start, dates.end)) : []), [w, dates.start, dates.end])
  // 예보가 없으면(막힘·16일 밖) 평년 기후로 옷차림을 정한다
  const climate = useAsync(() => climateForTrip(place.lat, place.lng, dates), [place.lat, place.lng, dates.start, dates.end])
  const weather = forecast.length ? forecast : climate.status === 'success' && climate.data ? climate.data.days : forecast
  const sv = useSurvival()
  const items = useMemo(() => makePackingList({ countryCode: country.code, days, people, kids, weather, data: sv ?? { FACTS: {}, TIPS: {} } }), [country.code, days, people, kids, weather, sv])
  const [checked, setChecked] = useStored<string[]>(`hidden-travel:pack:${country.code}:${dates.start}`, [], Array.isArray)
  const [open, setOpen] = useState(false)
  const done = items.filter((i) => checked.includes(i.id)).length
  // 접힌 상태에서도 체크한 항목은 줄을 그어 그대로 보여 준다 (바로 사라지면 눌렀는지 헷갈림)
  const shown = open ? items : items.slice(0, 6)
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-stone-500">짐 체크리스트</p>
        <span className="text-xs tabular-nums text-stone-500">
          <Num value={done} /> / {items.length}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-200">
        <motion.div className="h-full bg-teal-700" animate={{ width: `${(done / Math.max(1, items.length)) * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} />
      </div>
      <ul className="mt-3 space-y-1">
        {(open ? GROUPS : [null]).flatMap((grp) =>
          shown
            .filter((i) => grp == null || i.group === grp)
            .map((i, idx) => (
              <li key={i.id}>
                {grp && idx === 0 && <p className="mb-1 mt-3 text-[11px] font-medium text-stone-400">{grp}</p>}
                <label className="flex cursor-pointer items-start gap-3 rounded-lg py-1.5">
                  <input
                    type="checkbox"
                    checked={checked.includes(i.id)}
                    onChange={(e) => setChecked((c) => (e.target.checked ? [...c, i.id] : c.filter((x) => x !== i.id)))}
                    className="mt-0.5 size-5 shrink-0 accent-teal-500"
                  />
                  <span className={`text-sm ${checked.includes(i.id) ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
                    {i.label}
                    {i.why && <span className="block text-[11px] text-stone-500 no-underline">{i.why}</span>}
                  </span>
                </label>
              </li>
            )),
        )}
      </ul>
      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 text-xs text-teal-700 underline underline-offset-2">
        {open ? '접기' : `전체 ${items.length}개 보기`}
      </button>
    </div>
  )
}

// ---------------- 다른 나라와 비교 ----------------

function Compare({ dates, current, onPick }: { dates: TripDates; current: string; onPick: (code: string) => void }) {
  const [on, setOn] = useState(false)
  const list = useMemo(
    () =>
      POPULAR_CODES.map((c) => COUNTRIES.find((x) => x.code === c))
        .filter((c): c is Country => !!c)
        .map((country) => ({ country, place: defaultPlace(country) })),
    [],
  )
  const r = useAsync(on ? () => rankCountries(list, dates) : null, [on, dates.start, dates.end])
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">같은 날짜, 어디가 이득일까?</h3>
        {!on && (
          <button type="button" onClick={() => setOn(true)} className="rounded-full bg-stone-900 px-4 py-1.5 text-xs font-semibold text-stone-50">
            인기 여행지 비교하기
          </button>
        )}
      </div>
      {on &&
        (r.status === 'error' ? (
          <ErrorBox message="비교하지 못했어요." detail={errorReasonKo(r.error)} onRetry={r.retry} />
        ) : r.status !== 'success' ? (
          <Loading label="12개 나라의 환율·날씨·공휴일을 모으는 중…" />
        ) : (
          <ol className="grid gap-2 sm:grid-cols-2">
            {r.data.map((row, i) => (
              <motion.li key={row.country.code} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22, delay: i * 0.04 }}>
                <button
                  type="button"
                  onClick={() => onPick(row.country.code)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${row.country.code === current ? 'border-teal-700' : 'border-stone-200'} bg-white`}
                >
                  <span className="w-5 text-sm font-bold text-stone-400">{i + 1}</span>
                  <Flag code={row.country.code} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{row.country.nameKo}</span>
                    <span className="block truncate text-[11px] text-stone-500">
                      {[row.fx.score != null && `환율 ${row.fx.score}`, row.weather.score != null && `날씨 ${row.weather.score}`, row.holiday.score != null && `공휴일 ${row.holiday.score}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="text-2xl font-bold tabular-nums">{row.total ?? '–'}</span>
                </button>
              </motion.li>
            ))}
          </ol>
        ))}
    </div>
  )
}
