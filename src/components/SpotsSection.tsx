import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import type { Country, Place } from '../types'
import { useAsync } from '../lib/useAsync'
import { errorReasonKo } from '../lib/cache'
import { getSummary, splitSpots, useSpots, type Spot } from '../lib/spots'
import { getNearby, type Eatery, type Lodging } from '../lib/nearby'
import { formatDistance, googleMapsUrl, osmUrl } from '../lib/osm'
import { getCostRow, TIERS } from '../lib/budget'
import { dailyFactor, lodgingFactor } from '../lib/places'
import { getKrwRate } from '../lib/exchange'
import { ErrorBox, Loading, Notice } from './Status'

const SpotsMap = lazy(() => import('./SpotsMap'))

const RADII = [5, 10, 20] as const
const PAGE = 15
const COLORS = { hidden: '#0f766e', famous: '#7c3aed' }

interface LodgingCenter {
  name: string
  lat: number
  lng: number
}

export function SpotsSection({ country, place }: { country: Country; place: Place }) {
  const [radius, setRadius] = useState<(typeof RADII)[number]>(10)
  const [tab, setTab] = useState<'hidden' | 'famous'>('hidden')
  const [shown, setShown] = useState(PAGE)
  const [selected, setSelected] = useState<string | undefined>()
  const [focus, setFocus] = useState<[number, number] | null>(null)
  const [lodgingAt, setLodgingAt] = useState<LodgingCenter>({ name: place.name, lat: place.lat, lng: place.lng })
  const listRef = useRef<HTMLDivElement>(null)
  const lodgingRef = useRef<HTMLDivElement>(null)

  // 지역이 바뀌면 초기화
  useEffect(() => {
    setLodgingAt({ name: place.name, lat: place.lat, lng: place.lng })
    setSelected(undefined)
    setFocus(null)
    setShown(PAGE)
  }, [place.name, place.lat, place.lng])

  const sp = useSpots(place.lat, place.lng, radius)
  // 숙소·식당은 명소와 동시에 찾는다 (서로 기다리지 않음)
  const nearby = useAsync((force) => getNearby(lodgingAt.lat, lodgingAt.lng, force), [lodgingAt.lat, lodgingAt.lng])
  const [nearTab, setNearTab] = useState<'lodging' | 'food' | 'cafe'>('lodging')

  const split = useMemo(() => (sp.spots ? splitSpots(sp.spots) : { hidden: [], famous: [] }), [sp.spots])
  const list = split[tab]
  const visible = list.slice(0, shown)
  const near = nearby.status === 'success' ? nearby.data.data : null
  const lodgings = near && nearTab === 'lodging' ? near.lodgings.slice(0, 30) : []
  const eateries = near && nearTab !== 'lodging' ? near.eateries.filter((e) => (nearTab === 'cafe' ? e.kind === 'cafe' : e.kind !== 'cafe')).slice(0, 40) : []
  const center: [number, number] = useMemo(() => [place.lat, place.lng], [place.lat, place.lng])

  const selectSpot = (id: string) => {
    setSelected(id)
    const i = list.findIndex((s) => s.id === id)
    if (i >= shown) setShown(i + 1)
    requestAnimationFrame(() => listRef.current?.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }
  const showOnMap = (s: { id: string; lat: number; lng: number }) => {
    setSelected(s.id)
    setFocus([s.lat, s.lng])
  }
  const lodgingNear = (s: Spot) => {
    setLodgingAt({ name: s.name, lat: s.lat, lng: s.lng })
    requestAnimationFrame(() => lodgingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600">
          <b>{place.name}</b> 중심 반경
        </p>
        <div className="flex gap-1" role="group" aria-label="검색 반경">
          {RADII.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={radius === r}
              onClick={() => (setRadius(r), setShown(PAGE))}
              className={`rounded-full px-3 py-1 text-sm ring-1 ${radius === r ? 'bg-stone-800 text-white ring-stone-800' : 'bg-white ring-stone-300'}`}
            >
              {r}km
            </button>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="grid grid-cols-2 rounded-xl bg-stone-100 p-1" role="tablist">
        {(['hidden', 'famous'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => (setTab(t), setShown(PAGE), setSelected(undefined))}
            className={`rounded-lg py-2 text-sm font-medium ${tab === t ? 'bg-white shadow-sm' : 'text-stone-500'}`}
          >
            {t === 'hidden' ? '🤫 숨은 명소' : '⭐ 유명 명소'}
            {sp.spots && <span className="ml-1 text-xs text-stone-400">{split[t].length}</span>}
          </button>
        ))}
      </div>

      {/* 지도 */}
      <Suspense fallback={<div className="flex h-72 items-center justify-center rounded-xl bg-stone-100 text-sm text-stone-500">지도 불러오는 중…</div>}>
        <SpotsMap
          center={center}
          radiusKm={radius}
          spots={visible}
          spotColor={COLORS[tab]}
          lodgings={lodgings}
          eateries={eateries}
          selectedId={selected}
          focus={focus}
          onSelectSpot={selectSpot}
          onSelectLodging={(id) => {
            setSelected(id)
            requestAnimationFrame(() => lodgingRef.current?.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
          }}
        />
      </Suspense>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
        <Legend color={COLORS[tab]} label={tab === 'hidden' ? '숨은 명소' : '유명 명소'} />
        {nearTab === 'lodging' ? <Legend color="#f97316" label="숙소" /> : <Legend color="#e11d48" label={nearTab === 'cafe' ? '카페' : '식당'} />}
        <Legend color="#fff" border label="검색 중심" />
      </div>

      {/* 목록 */}
      <div ref={listRef}>
        {sp.base.status === 'error' ? (
          <ErrorBox
            message="명소를 불러오지 못했어요."
            detail={`${errorReasonKo(sp.base.error)} OpenStreetMap 서버가 붐빌 때 자주 생겨요. 잠시 뒤 다시 시도하거나 반경을 줄여 보세요.`}
            onRetry={sp.retry}
          />
        ) : !sp.spots ? (
          <Loading label="명소 찾는 중… (보통 5~15초)" />
        ) : (
          <>
            {sp.stale && <Notice>⚠️ 서버에 연결할 수 없어 전에 저장해 둔 결과를 보여 주고 있어요.</Notice>}
            {sp.famePending && (
              <p className="mb-2 flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600" role="status">
                <span className="size-3 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                위키 조회수로 얼마나 알려진 곳인지 확인하는 중이에요. 끝나면 숨은/유명 분류가 정리돼요.
              </p>
            )}
            {sp.fameFailed && (
              <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                인지도 확인에 실패해 위키 문서 유무로만 나눴어요.{' '}
                <button type="button" onClick={sp.fame.retry} className="font-medium underline">
                  다시 확인
                </button>
              </p>
            )}
            {list.length === 0 ? (
              <p className="py-4 text-sm text-stone-500">
                이 반경에서 {tab === 'hidden' ? '숨은' : '유명'} 명소를 찾지 못했어요.{sp.famePending ? ' 인지도 확인이 끝나면 다시 보여 드려요.' : ' 반경을 넓혀 보세요.'}
              </p>
            ) : (
              <ul className="space-y-3">
                {visible.map((s) => (
                  <SpotCard key={s.id} spot={s} selected={s.id === selected} onMap={() => showOnMap(s)} onLodging={() => lodgingNear(s)} />
                ))}
              </ul>
            )}
            {shown < list.length && (
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-3 w-full rounded-xl bg-stone-100 py-2.5 text-sm font-medium active:bg-stone-200">
                {Math.min(PAGE, list.length - shown)}곳 더 보기 ({shown}/{list.length})
              </button>
            )}
            <p className="mt-3 text-xs text-stone-500">
              숨은 정도는 위키백과 문서 유무와 최근 30일 조회수로 매겨요. 문서가 없거나 조회수가 적을수록 덜 알려진 곳이에요.
              {sp.fame.status === 'success' && sp.fame.data.data.viewsFailed > 0 && ` (조회수 확인 실패 ${sp.fame.data.data.viewsFailed}곳은 중간 점수로 계산)`} 명소
              정보: OpenStreetMap 기여자, 설명·사진: 위키백과
            </p>
          </>
        )}
      </div>

      {/* 주변 숙소·식당 */}
      <div ref={lodgingRef} className="scroll-mt-28 border-t border-stone-200 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-bold">📍 {lodgingAt.name} 주변</h3>
          {lodgingAt.name !== place.name && (
            <button type="button" onClick={() => setLodgingAt({ name: place.name, lat: place.lat, lng: place.lng })} className="shrink-0 text-xs text-teal-700 underline">
              {place.name} 중심으로
            </button>
          )}
        </div>
        <div className="mb-3 grid grid-cols-3 rounded-xl bg-stone-100 p-1" role="tablist">
          {(
            [
              ['lodging', '🏨 숙소', near?.lodgings.length],
              ['food', '🍜 식당', near?.eateries.filter((e) => e.kind !== 'cafe').length],
              ['cafe', '☕ 카페', near?.eateries.filter((e) => e.kind === 'cafe').length],
            ] as const
          ).map(([k, label, n]) => (
            <button
              key={k}
              role="tab"
              aria-selected={nearTab === k}
              onClick={() => setNearTab(k)}
              className={`rounded-lg py-2 text-sm font-medium ${nearTab === k ? 'bg-white shadow-sm' : 'text-stone-500'}`}
            >
              {label}
              {n != null && <span className="ml-1 text-xs text-stone-400">{n}</span>}
            </button>
          ))}
        </div>
        {nearby.status === 'error' ? (
          <ErrorBox message="주변 숙소·식당을 불러오지 못했어요." detail={errorReasonKo(nearby.error)} onRetry={nearby.retry} />
        ) : !near ? (
          <Loading label="주변 숙소·식당 찾는 중…" />
        ) : nearTab === 'lodging' ? (
          <LodgingList items={near.lodgings} radiusKm={near.radiusKm} country={country} place={place} selected={selected} onMap={showOnMap} />
        ) : (
          <EateryList items={eateries} total={eateries.length} radiusKm={near.radiusKm * 0.7} country={country} place={place} selected={selected} onMap={showOnMap} cafe={nearTab === 'cafe'} />
        )}
      </div>
    </div>
  )
}

function Legend({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block size-2.5 rounded-full ${border ? 'ring-2 ring-stone-800' : ''}`} style={{ background: color }} />
      {label}
    </span>
  )
}

function fameLabel(s: Spot) {
  if (s.views === undefined) return { text: '위키 문서 없음 · 숨은 곳 후보', cls: 'bg-teal-50 text-teal-800' }
  if (s.views === null) return { text: '조회수 확인 못 함', cls: 'bg-stone-100 text-stone-600' }
  return {
    text: `위키 조회 30일 ${s.views.toLocaleString('ko-KR')}회`,
    cls: s.hiddenScore >= 50 ? 'bg-teal-50 text-teal-800' : 'bg-violet-50 text-violet-800',
  }
}

function SpotCard({ spot, selected, onMap, onLodging }: { spot: Spot; selected: boolean; onMap: () => void; onLodging: () => void }) {
  const hasWiki = !!(spot.koTitle || spot.enTitle || (spot.wiki && ['ko', 'en'].includes(spot.wiki.lang)))
  const sum = useAsync(hasWiki ? () => getSummary(spot) : null, [spot.id])
  const fame = fameLabel(spot)
  return (
    <li data-id={spot.id} className={`overflow-hidden rounded-xl ring-1 transition ${selected ? 'ring-2 ring-teal-600' : 'ring-stone-200'}`}>
      <div className="flex gap-3 p-3">
        {sum.status === 'success' && sum.data?.thumbnail && (
          <img src={sum.data.thumbnail} alt="" loading="lazy" className="size-20 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{spot.name}</p>
          {spot.nameLocal && <p className="truncate text-xs text-stone-400">{spot.nameLocal}</p>}
          <p className="mt-0.5 text-xs text-stone-500">
            {spot.kind} · 중심에서 {formatDistance(spot.distKm)}
          </p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${fame.cls}`}>
            {fame.text} · 숨은 정도 {spot.hiddenScore}
          </span>
        </div>
      </div>
      {hasWiki && (
        <div className="px-3 pb-2 text-sm text-stone-600">
          {sum.status === 'loading' && <p className="text-xs text-stone-400">설명 불러오는 중…</p>}
          {sum.status === 'error' && (
            <p className="text-xs text-stone-400">
              설명을 불러오지 못했어요.{' '}
              <button type="button" onClick={sum.retry} className="underline">
                다시 시도
              </button>
            </p>
          )}
          {sum.status === 'success' && sum.data && (
            <p className="line-clamp-3">
              {sum.data.extract}{' '}
              <a href={sum.data.url} target="_blank" rel="noreferrer" className="text-xs text-teal-700 underline">
                {sum.data.lang === 'ko' ? '위키백과' : '위키백과(영어)'}
              </a>
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 border-t border-stone-100 px-3 py-2 text-xs">
        <Action onClick={onMap}>🗺️ 지도에서 보기</Action>
        <Action onClick={onLodging}>🏨 근처 숙소·식당</Action>
        <a href={googleMapsUrl(spot.lat, spot.lng)} target="_blank" rel="noreferrer" className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
          구글 지도
        </a>
        <a href={osmUrl({ type: spot.id.split('/')[0], id: Number(spot.id.split('/')[1]) })} target="_blank" rel="noreferrer" className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
          OSM
        </a>
      </div>
    </li>
  )
}

function Action({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full bg-teal-50 px-2.5 py-1 font-medium text-teal-800 active:bg-teal-100">
      {children}
    </button>
  )
}

function LodgingList({
  items,
  radiusKm,
  country,
  place,
  selected,
  onMap,
}: {
  items: Lodging[]
  radiusKm: number
  country: Country
  place: Place
  selected?: string
  onMap: (l: Lodging) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const { row } = getCostRow(country.code)
  const rate = useAsync(() => getKrwRate(row.currency), [row.currency])
  const priceOf = (l: Lodging) => {
    const v = row.lodging[l.tier] * lodgingFactor(place.factor)
    if (rate.status !== 'success') return `${Math.round(v)} ${row.currency}`
    const krw = v * rate.data.krwPer
    return `${(Math.round(krw / 1000) * 1000).toLocaleString('ko-KR')}원`
  }

  if (!items.length) return <p className="text-sm text-stone-500">반경 {radiusKm}km 안에서 OpenStreetMap에 등록된 숙소를 찾지 못했어요.</p>
  const shown = showAll ? items : items.slice(0, 8)
  return (
    <div>
      <p className="mb-2 text-xs text-stone-500">
        반경 {radiusKm}km · {items.length}곳 · 가까운 순
      </p>
      <ul className="space-y-2">
        {shown.map((l) => (
          <li key={l.id} data-id={l.id} className={`rounded-xl p-3 ring-1 ${selected === l.id ? 'ring-2 ring-orange-500' : 'ring-stone-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-snug">{l.name}</p>
                {l.nameLocal && <p className="truncate text-xs text-stone-400">{l.nameLocal}</p>}
                <p className="text-xs text-stone-500">
                  {l.kind}
                  {l.stars ? ` · ${'★'.repeat(l.stars)}` : ''} · {formatDistance(l.distKm)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold">{priceOf(l)}</p>
                <p className="text-[11px] text-stone-400">1박 추정 · {TIERS[l.tier].label}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <Action onClick={() => onMap(l)}>🗺️ 지도</Action>
              <a href={googleMapsUrl(l.lat, l.lng)} target="_blank" rel="noreferrer" className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                구글 지도·가격 보기
              </a>
              {l.website && (
                <a href={l.website} target="_blank" rel="noreferrer" className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                  홈페이지
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!showAll && items.length > shown.length && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-2 w-full rounded-xl bg-stone-100 py-2.5 text-sm font-medium">
          숙소 {items.length - shown.length}곳 더 보기
        </button>
      )}
      <p className="mt-2 text-xs text-stone-500">
        숙소 목록은 OpenStreetMap에 등록된 곳이에요. 가격은 숙소 종류·성급과 {place.name} 물가로 계산한 추정치이니, 실제 요금은 예약 사이트에서 확인하세요.
      </p>
    </div>
  )
}

function EateryList({
  items,
  radiusKm,
  country,
  place,
  selected,
  onMap,
  cafe,
}: {
  items: Eatery[]
  total: number
  radiusKm: number
  country: Country
  place: Place
  selected?: string
  onMap: (e: Eatery) => void
  cafe: boolean
}) {
  const [showAll, setShowAll] = useState(false)
  const { row } = getCostRow(country.code)
  const rate = useAsync(() => getKrwRate(row.currency), [row.currency])
  // 한 끼 추정: 하루 식비(1인)를 끼니로 나눠 계산. 카페는 하루 식비의 15%
  const priceOf = (e: Eatery) => {
    const daily = row.food[e.kind === 'restaurant' || e.kind === 'bar' ? 1 : 0] * dailyFactor(place.factor)
    const v = e.kind === 'cafe' ? daily * 0.15 : e.kind === 'restaurant' || e.kind === 'bar' ? daily * 0.4 : daily * 0.3
    if (rate.status !== 'success') return `${Math.round(v)} ${row.currency}`
    return `${(Math.round((v * rate.data.krwPer) / 500) * 500).toLocaleString('ko-KR')}원`
  }
  if (!items.length)
    return <p className="text-sm text-stone-500">반경 {radiusKm.toFixed(1)}km 안에서 OpenStreetMap에 등록된 {cafe ? '카페' : '식당'}를 찾지 못했어요.</p>
  const shown = showAll ? items : items.slice(0, 10)
  return (
    <div>
      <p className="mb-2 text-xs text-stone-500">
        반경 {radiusKm.toFixed(1)}km · 가까운 순
      </p>
      <ul className="space-y-2">
        {shown.map((e) => (
          <li key={e.id} data-id={e.id} className={`rounded-xl p-3 ring-1 ${selected === e.id ? 'ring-2 ring-rose-500' : 'ring-stone-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-snug">{e.name}</p>
                {e.nameLocal && <p className="truncate text-xs text-stone-400">{e.nameLocal}</p>}
                <p className="text-xs text-stone-500">
                  {e.cuisine ? `${e.cuisine} · ` : ''}
                  {e.kindLabel} · {formatDistance(e.distKm)}
                </p>
                {e.openingHours && <p className="truncate text-[11px] text-stone-400">🕒 {e.openingHours}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold">{priceOf(e)}</p>
                <p className="text-[11px] text-stone-400">{cafe ? '음료 1잔 추정' : '1인 한 끼 추정'}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              <Action onClick={() => onMap(e)}>🗺️ 지도</Action>
              <a href={googleMapsUrl(e.lat, e.lng)} target="_blank" rel="noreferrer" className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                구글 지도·리뷰
              </a>
              {e.website && (
                <a href={e.website} target="_blank" rel="noreferrer" className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                  홈페이지
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!showAll && items.length > shown.length && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-2 w-full rounded-xl bg-stone-100 py-2.5 text-sm font-medium">
          {items.length - shown.length}곳 더 보기
        </button>
      )}
      <p className="mt-2 text-xs text-stone-500">
        목록은 OpenStreetMap에 등록된 곳이고 맛·평점 정보는 없어요. 가격은 {place.name} 물가로 계산한 추정치예요. 리뷰는 구글 지도에서 확인하세요.
      </p>
    </div>
  )
}
