import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import type { Country, Place } from '../types'
import { useAsync } from '../lib/useAsync'
import { getKrwRate } from '../lib/exchange'
import { TIPS } from '../lib/survival'
import { TRANSPORT_UPDATED, getRoute, getTransport, nearestAirport, toCandidates, type Airport, type TransportCountry } from '../lib/transport'
import { cityTransitAdvice, recommendTransfer, taxiFare, type Evaluated, type Luggage, type Mode, type Range } from '../lib/transferRule'
import { useStored } from '../lib/stored'
import { formatNumber } from '../lib/exchange'
import { distanceKm } from '../lib/osm'
import { Num, roundKrw } from './ui/Num'
import { Loading } from './Status'

const MODE_LABEL: Record<Mode, string> = { rail: '철도', bus: '버스', taxi: '택시', ride: '차량 호출', shuttle: '셔틀' }

function ModeIcon({ mode }: { mode: Mode }) {
  const d: Record<Mode, string> = {
    rail: 'M7 4h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2z M5 11h14 M8 21l2-3 M16 21l-2-3 M8.5 14.5h.01 M15.5 14.5h.01',
    bus: 'M6 3h12a2 2 0 0 1 2 2v12H4V5a2 2 0 0 1 2-2z M4 11h16 M7 20v-3 M17 20v-3 M7.5 14h.01 M16.5 14h.01',
    taxi: 'M5 16l1.5-5A2 2 0 0 1 8.4 9.5h7.2a2 2 0 0 1 1.9 1.5L19 16 M4 16h16v3H4z M10 9.5V7h4v2.5 M7 19v1.5 M17 19v1.5',
    ride: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z M9 10h6',
    shuttle: 'M3 7h15l3 4v5H3z M3 12h18 M7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="size-6 shrink-0" aria-hidden>
      <path d={d[mode]} />
    </svg>
  )
}

interface Prefs {
  airport?: string
  arrival: string
  luggage: Luggage
  rides: number
}

export function TransportSection({ country, place }: { country: Country; place: Place }) {
  const t = getTransport(country.code)
  if (!t) return <NoData country={country} />
  return <WithData country={country} place={place} t={t} />
}

function NoData({ country }: { country: Country }) {
  const tip = TIPS[country.code]
  return (
    <div className="space-y-4">
      <p className="rounded-2xl border border-stone-200 p-4 text-sm text-stone-600">{country.nameKo}의 교통 요금 정보는 준비 중이에요.</p>
      {tip?.transport && (
        <div className="rounded-2xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">교통</p>
          <p className="mt-1.5 text-sm text-stone-800">{tip.transport}</p>
        </div>
      )}
      {!tip && <p className="text-sm text-stone-500">현지에서는 대중교통 앱이나 지도 앱으로 경로와 요금을 확인해 주세요.</p>}
    </div>
  )
}

function WithData({ country, place, t }: { country: Country; place: Place; t: TransportCountry }) {
  const [prefs, setPrefs] = useStored<Prefs>(`hidden-travel:transport:${country.code}`, { arrival: '14:00', luggage: 'normal', rides: 4 }, (v) => !!v && typeof v === 'object')
  // 인원·예산 스타일은 경비 탭 설정을 그대로 쓴다 (읽기만)
  const party = useMemo(() => {
    try {
      const v = JSON.parse(localStorage.getItem('hidden-travel:budget') ?? '{}') as { party?: { type?: string; adults?: number; kids?: number }; tier?: 0 | 1 | 2 }
      const p = v.party ?? {}
      const adults = p.type === 'solo' ? 1 : p.type === 'couple' ? 2 : Math.max(1, p.adults ?? 2)
      return { adults, kids: p.type === 'family' ? Math.max(0, p.kids ?? 0) : 0, tier: ([0, 1, 2] as const).includes(v.tier as 0) ? (v.tier as 0 | 1 | 2) : (1 as const) }
    } catch {
      return { adults: 2, kids: 0, tier: 1 as const }
    }
  }, [])
  const near = nearestAirport(t, place.lat, place.lng)
  const airport = t.airports.find((a) => a.code === prefs.airport) ?? near
  const krw = useAsync(() => getKrwRate(t.currency), [t.currency])
  const krwPer = krw.status === 'success' ? krw.data.krwPer : null

  return (
    <div className="space-y-10">
      {airport && (
        <section aria-label="공항에서 숙소까지">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">공항 → {place.name}</h3>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs text-stone-500">공항</span>
              <select
                value={airport.code}
                onChange={(e) => setPrefs((p) => ({ ...p, airport: e.target.value }))}
                className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
              >
                {t.airports.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.name} ({a.code}){a.code === near?.code ? ' · 가장 가까움' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-stone-500">도착 시각</span>
              <input
                type="time"
                value={prefs.arrival}
                onChange={(e) => e.target.value && setPrefs((p) => ({ ...p, arrival: e.target.value }))}
                className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"
              />
            </label>
            <div>
              <span className="mb-1 block text-xs text-stone-500">짐</span>
              <div className="grid h-11 grid-cols-3 gap-1">
                {(
                  [
                    ['light', '적음'],
                    ['normal', '보통'],
                    ['heavy', '많음'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={prefs.luggage === k}
                    onClick={() => setPrefs((p) => ({ ...p, luggage: k }))}
                    className={`rounded-xl text-sm ring-1 ${prefs.luggage === k ? 'bg-stone-900 font-semibold text-stone-50 ring-stone-900' : 'text-stone-600 ring-stone-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mb-4 text-xs text-stone-500">
            경비 탭 설정 기준: 어른 {party.adults}명{party.kids ? ` · 아이 ${party.kids}명` : ''} · {['알뜰', '보통', '고급'][party.tier]}
          </p>
          <Transfer airport={airport} place={place} t={t} party={party} arrival={prefs.arrival} luggage={prefs.luggage} krwPer={krwPer} />
        </section>
      )}

      <CityTransitBlock t={t} rides={prefs.rides} setRides={(n) => setPrefs((p) => ({ ...p, rides: n }))} krwPer={krwPer} />

      {t.intercity.length > 0 && (
        <section aria-label="도시 간 이동">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">도시 간 이동</h3>
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                  <th className="px-4 py-2.5 font-medium">구간</th>
                  <th className="px-4 py-2.5 font-medium">수단</th>
                  <th className="px-4 py-2.5 font-medium">시간</th>
                  <th className="px-4 py-2.5 font-medium">가격대 (1인)</th>
                  <th className="px-4 py-2.5 font-medium">예약</th>
                </tr>
              </thead>
              <tbody>
                {t.intercity.map((r) => (
                  <tr key={r.route + r.mode} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-2.5">{r.route}</td>
                    <td className="px-4 py-2.5">{r.mode}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.minutes != null ? `${r.minutes}분` : '확인 필요'}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.price ? priceText(r.price, t.currency, krwPer) : '확인 필요'}</td>
                    <td className="px-4 py-2.5 text-stone-500">{r.booking ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="space-y-1 text-[11px] leading-relaxed text-stone-400">
        <p>{TRANSPORT_UPDATED ?? '작성일 미상'} 기준이에요. 실제 요금·시간은 달라질 수 있어요. '확인 필요'는 아직 공식 값을 넣지 않은 항목이에요.</p>
        {t.sources.length > 0 && (
          <p className="flex flex-wrap gap-x-3">
            출처:
            {t.sources.map((s) => (
              <a key={s} href={s} target="_blank" rel="noreferrer" className="text-stone-500 underline underline-offset-2">
                {new URL(s).host.replace(/^www\./, '')}
              </a>
            ))}
          </p>
        )}
        <p>거리·시간: OSRM(OpenStreetMap 경로 안내)</p>
      </footer>
    </div>
  )
}

const priceText = (r: Range, cur: string, krwPer: number | null) => {
  const local = r[0] === r[1] ? formatNumber(r[0], 0) : `${formatNumber(r[0], 0)}~${formatNumber(r[1], 0)}`
  return `${local} ${cur}${krwPer ? ` (약 ${roundKrw(((r[0] + r[1]) / 2) * krwPer).toLocaleString('ko-KR')}원)` : ''}`
}

function Transfer({
  airport,
  place,
  t,
  party,
  arrival,
  luggage,
  krwPer,
}: {
  airport: Airport
  place: Place
  t: TransportCountry
  party: { adults: number; kids: number; tier: 0 | 1 | 2 }
  arrival: string
  luggage: Luggage
  krwPer: number | null
}) {
  const route = useAsync(() => getRoute([airport.lat, airport.lng], [place.lat, place.lng]), [airport.code, place.lat, place.lng])
  if (route.status !== 'success') return <Loading label="공항에서 거리·시간을 계산하는 중…" />
  const r = route.data
  const taxi = t.taxi ? taxiFare(t.taxi, r.km, arrival) : null
  const result = recommendTransfer({ ...party, arrival, luggage, options: toCandidates(airport, taxi, r.minutes), childRate: t.childRate })
  const far = distanceKm([airport.lat, airport.lng], [place.lat, place.lng]) > 150
  const rows = result.recommended ? [result.recommended, ...result.others] : []

  return (
    <div>
      <p className="mb-3 text-xs text-stone-500">
        차로 약 {Math.round(r.km)}km · {r.minutes}분{r.estimated && ' · 직선거리로 추정'}
        {far && ` · ${airport.name}은(는) ${place.name}에서 멀어요. 다른 공항을 골라 보세요`}
      </p>
      {!result.recommended && <p className="rounded-2xl border border-stone-200 p-4 text-sm text-stone-600">{result.reason}</p>}
      <ul className="grid gap-3 lg:grid-cols-2">
        {rows.map((e, i) => (
          <OptionCard key={e.option.id} e={e} best={i === 0} reason={i === 0 ? result.reason : undefined} currency={t.currency} krwPer={krwPer} people={party.adults + party.kids} where={airport.options[Number(e.option.id.split('-')[1])]?.where ?? null} note={airport.options[Number(e.option.id.split('-')[1])]?.note ?? null} />
        ))}
        {result.excluded.map((e) => (
          <li key={e.option.id} className="rounded-2xl border border-dashed border-stone-200 p-4 text-sm text-stone-400">
            {e.option.name} · 도착 시각({arrival})에는 운행하지 않아요{e.option.firstLast ? ` (${e.option.firstLast})` : ''}
          </li>
        ))}
      </ul>
    </div>
  )
}

function OptionCard({
  e,
  best,
  reason,
  currency,
  krwPer,
  people,
  where,
  note,
}: {
  e: Evaluated
  best: boolean
  reason?: string
  currency: string
  krwPer: number | null
  people: number
  where: string | null
  note: string | null
}) {
  const mid = (r: Range) => (r[0] + r[1]) / 2
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className={`rounded-2xl border bg-white p-4 ${best ? 'border-teal-700' : 'border-stone-200'}`}
    >
      <div className="flex items-start gap-3">
        <span className={best ? 'text-teal-700' : 'text-stone-500'}>
          <ModeIcon mode={e.option.mode} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {best && <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[11px] font-bold text-stone-50">추천</span>}
            <span className="text-xs text-stone-500">{MODE_LABEL[e.option.mode]}</span>
            {e.option.transfers > 0 && <span className="text-xs text-stone-500">· 갈아타기 {e.option.transfers}번</span>}
          </div>
          <p className="mt-0.5 font-semibold leading-snug">{e.option.name}</p>
          {reason && <p className="mt-1 text-sm text-teal-700">{reason}</p>}
        </div>
        <span className="shrink-0 text-right text-sm tabular-nums text-stone-600">{e.option.minutes != null ? `${e.option.minutes}분` : '시간 확인 필요'}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3 border-t border-stone-100 pt-3">
        <div className="min-w-0 text-xs text-stone-500">
          {e.option.firstLast && <p>첫차·막차 {e.option.firstLast}</p>}
          {where && <p className="truncate">타는 곳: {where}</p>}
          {note && <p>{note}</p>}
          {e.vehicles > 1 && <p>{people}명이라 {e.vehicles}대로 계산</p>}
        </div>
        <div className="shrink-0 text-right">
          {e.total ? (
            <>
              <p className="text-lg font-bold tabular-nums">
                <Num value={Math.round(mid(e.total))} suffix={` ${currency}`} />
              </p>
              <p className="text-xs tabular-nums text-stone-500">
                일행 전체{krwPer ? (
                  <>
                    {' '}
                    · <Num value={roundKrw(mid(e.total) * krwPer)} suffix="원" />
                  </>
                ) : null}
              </p>
              {people > 1 && e.perPerson && (
                <p className="text-xs tabular-nums text-stone-500">
                  1인 <Num value={Math.round(mid(e.perPerson))} suffix={` ${currency}`} />
                </p>
              )}
              {e.total[0] !== e.total[1] && <p className="text-[11px] text-stone-400">±20% 범위로 달라질 수 있어요</p>}
            </>
          ) : (
            <p className="text-sm text-stone-500">요금 확인 필요</p>
          )}
        </div>
      </div>
    </motion.li>
  )
}

function CityTransitBlock({ t, rides, setRides, krwPer }: { t: TransportCountry; rides: number; setRides: (n: number) => void; krwPer: number | null }) {
  const [km, setKm] = useState(5)
  const city = t.cityTransit[0]
  const advice = city ? cityTransitAdvice(city.single, city.passes, rides) : null
  const fare = t.taxi ? taxiFare(t.taxi, km) : null
  return (
    <section aria-label="시내 이동">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">시내 이동{city ? ` · ${city.city}` : ''}</h3>
      <div className="grid gap-3 lg:grid-cols-2">
        {city && (
          <div className="rounded-2xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500">교통카드</p>
            <p className="mt-1 font-semibold">{city.card ?? '정보 없음'}</p>
            <p className="text-xs text-stone-500">{city.cardPrice != null ? `카드 값 ${formatNumber(city.cardPrice, 0)} ${t.currency}` : '카드 값 확인 필요'}</p>
            <p className="mt-3 text-xs text-stone-500">1회 요금</p>
            <p className="font-semibold">{city.single ? priceText(city.single, t.currency, krwPer) : '확인 필요'}</p>
            {city.passes.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {city.passes.map((p) => (
                  <li key={p.name} className="flex justify-between gap-3">
                    <span>{p.name}</span>
                    <span className="tabular-nums text-stone-600">{p.price != null ? `${formatNumber(p.price, 0)} ${t.currency}` : '확인 필요'}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3 text-sm">
              <span className="text-stone-500">하루 탑승</span>
              <button type="button" aria-label="탑승 횟수 줄이기" onClick={() => setRides(Math.max(1, rides - 1))} className="size-9 rounded-lg bg-stone-100">
                −
              </button>
              <span className="w-8 text-center font-semibold tabular-nums">{rides}회</span>
              <button type="button" aria-label="탑승 횟수 늘리기" onClick={() => setRides(Math.min(15, rides + 1))} className="size-9 rounded-lg bg-stone-100">
                +
              </button>
            </div>
            <p className="mt-2 text-sm">
              {advice?.pick === 'pass' && advice.pass
                ? `하루 ${rides}번 타면 ${advice.pass.name}이(가) 더 싸요 (하루 ${formatNumber(Math.round(advice.perDay!), 0)} ${t.currency})`
                : advice?.pick === 'single'
                  ? `하루 ${rides}번이면 그때그때 내는 게 더 싸요 (하루 약 ${formatNumber(Math.round(advice.perDay!), 0)} ${t.currency})`
                  : '요금 정보가 채워지면 패스와 1회 요금 중 싼 쪽을 알려 드려요.'}
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">택시 요금 계산기{t.taxi?.city ? ` · ${t.taxi.city}` : ''}</p>
          <label className="mt-2 flex items-center gap-2 text-sm">
            거리
            <input
              type="number"
              inputMode="decimal"
              min={0.5}
              max={200}
              step={0.5}
              value={km}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (Number.isFinite(n) && n >= 0) setKm(Math.min(200, n))
              }}
              className="h-10 w-20 rounded-lg border border-stone-300 bg-white px-2 text-right tabular-nums"
            />
            km
          </label>
          <p className="mt-3 text-2xl font-bold tabular-nums">
            {fare ? (
              <>
                <Num value={fare[0]} />~<Num value={fare[1]} suffix={` ${t.currency}`} />
              </>
            ) : (
              <span className="text-base font-normal text-stone-500">기본요금·km당 요금이 채워지면 계산돼요</span>
            )}
          </p>
          {fare && krwPer && <p className="text-xs text-stone-500">약 {roundKrw(((fare[0] + fare[1]) / 2) * krwPer).toLocaleString('ko-KR')}원 · 기본요금 + km당 요금 × 거리, ±20%</p>}
          {t.taxi?.nightHours && t.taxi.nightMultiplier && <p className="mt-1 text-xs text-stone-500">심야 {t.taxi.nightHours} ×{t.taxi.nightMultiplier}</p>}
          {t.taxi?.note && <p className="mt-1 text-xs text-stone-500">{t.taxi.note}</p>}
          {t.rideApps.length > 0 && (
            <>
              <p className="mt-4 text-xs text-stone-500">차량 호출 앱</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {t.rideApps.map((a) => (
                  <span key={a} className="rounded-full border border-stone-300 px-3 py-1 text-sm">
                    {a}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
