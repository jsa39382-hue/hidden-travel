import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import type { Country, Place } from '../types'
import { useAsync } from '../lib/useAsync'
import { errorReasonKo } from '../lib/cache'
import { getSummary, photoUrl, splitSpots, useSpots, type Spot } from '../lib/spots'
import { getSpotDetails } from '../lib/spotDetails'
import { TranslateQuotaError, googleTranslateUrl, guessLang, papagoUrl, translateToKo } from '../lib/translate'
import { getNearby, type Eatery, type Lodging } from '../lib/nearby'
import { formatDistance, googleMapsUrl, osmUrl } from '../lib/osm'
import { getCostRow, TIERS } from '../lib/budget'
import { dailyFactor, lodgingFactor } from '../lib/places'
import { getKrwRate } from '../lib/exchange'
import { ErrorBox, Loading, Notice } from './Status'

const SpotsMap = lazy(() => import('./SpotsMap'))

const RADII = [5, 10, 20] as const
const PAGE = 15
const COLORS = { hidden: '#5eead4', famous: '#c4b5fd' }

interface LodgingCenter {
  name: string
  lat: number
  lng: number
}

export function SpotsSection({ country, place, active = true }: { country: Country; place: Place; active?: boolean }) {
  const [view, setView] = useState<'spots' | 'nearby'>('spots')
  const [radius, setRadius] = useState<(typeof RADII)[number]>(10)
  const [tab, setTab] = useState<'hidden' | 'famous'>('hidden')
  const [shown, setShown] = useState(PAGE)
  const [selected, setSelected] = useState<string | undefined>()
  const [focus, setFocus] = useState<[number, number] | null>(null)
  const [lodgingAt, setLodgingAt] = useState<LodgingCenter>({ name: place.name, lat: place.lat, lng: place.lng })
  const [nearTab, setNearTab] = useState<'lodging' | 'food' | 'cafe'>('lodging')
  const listRef = useRef<HTMLDivElement>(null)

  // 지역이 바뀌면 초기화
  useEffect(() => {
    setLodgingAt({ name: place.name, lat: place.lat, lng: place.lng })
    setSelected(undefined)
    setFocus(null)
    setShown(PAGE)
  }, [place.name, place.lat, place.lng])

  const sp = useSpots(place.lat, place.lng, radius)
  // 숙소·식당은 명소와 동시에 찾는다 (서로 기다리지 않음)
  const nearby = useAsync((force, signal) => getNearby(lodgingAt.lat, lodgingAt.lng, force, signal), [lodgingAt.lat, lodgingAt.lng])

  const split = useMemo(() => (sp.spots ? splitSpots(sp.spots) : { hidden: [], famous: [] }), [sp.spots])
  const list = split[tab]
  const visible = list.slice(0, shown)
  const near = nearby.status === 'success' ? nearby.data.data : null
  const lodgings = near && view === 'nearby' && nearTab === 'lodging' ? near.lodgings.slice(0, 30) : []
  const eateries =
    near && view === 'nearby' && nearTab !== 'lodging' ? near.eateries.filter((e) => (nearTab === 'cafe' ? e.kind === 'cafe' : e.kind !== 'cafe')).slice(0, 40) : []
  const mapCenter: [number, number] = useMemo(
    () => (view === 'nearby' ? [lodgingAt.lat, lodgingAt.lng] : [place.lat, place.lng]),
    [view, lodgingAt.lat, lodgingAt.lng, place.lat, place.lng],
  )

  const scrollToItem = (id: string) =>
    requestAnimationFrame(() => listRef.current?.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  const selectSpot = (id: string) => {
    setSelected(id)
    const i = list.findIndex((s) => s.id === id)
    if (i >= shown) setShown(i + 1)
    scrollToItem(id)
  }
  const showOnMap = (s: { id: string; lat: number; lng: number }) => {
    setSelected(s.id)
    setFocus([s.lat, s.lng])
    // 휴대폰에서는 지도가 위에 있으므로 지도로 올라간다
    if (window.innerWidth < 1024) document.getElementById('spots-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const nearbyOf = (s: Spot) => {
    setLodgingAt({ name: s.name, lat: s.lat, lng: s.lng })
    setView('nearby')
    setSelected(undefined)
    setFocus(null)
  }

  const nearCount = {
    lodging: near?.lodgings.length,
    food: near?.eateries.filter((e) => e.kind !== 'cafe').length,
    cafe: near?.eateries.filter((e) => e.kind === 'cafe').length,
  }

  return (
    <div className="space-y-5">
      {/* 보기 전환 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={view}
          onChange={(v) => (setView(v), setSelected(undefined), setFocus(null))}
          options={[
            ['spots', '명소'],
            ['nearby', '숙소·식당'],
          ]}
        />
        {view === 'spots' ? (
          <div className="flex items-center gap-1 text-xs" role="group" aria-label="검색 반경">
            <span className="mr-1 text-stone-500">반경</span>
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={radius === r}
                onClick={() => (setRadius(r), setShown(PAGE))}
                className={`rounded-full px-3 py-1.5 transition ${radius === r ? 'bg-stone-900 font-semibold text-stone-50' : 'text-stone-500 hover:text-stone-800'}`}
              >
                {r}km
              </button>
            ))}
          </div>
        ) : (
          lodgingAt.name !== place.name && (
            <button type="button" onClick={() => setLodgingAt({ name: place.name, lat: place.lat, lng: place.lng })} className="text-xs text-teal-700 underline underline-offset-2">
              {place.name} 중심으로 돌아가기
            </button>
          )
        )}
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-6">
        {/* 지도: 휴대폰은 위, 넓은 화면은 오른쪽에 고정 */}
        <div id="spots-map" className="mb-5 lg:sticky lg:top-28 lg:order-2 lg:mb-0 xl:top-8">
          <Suspense fallback={<div className="flex h-64 items-center justify-center rounded-2xl bg-stone-100 text-sm text-stone-500 sm:h-80">지도 불러오는 중…</div>}>
            <SpotsMap
              center={mapCenter}
              radiusKm={view === 'nearby' ? 1.5 : radius}
              spots={view === 'spots' ? visible : []}
              spotColor={COLORS[tab]}
              lodgings={lodgings}
              eateries={eateries}
              selectedId={selected}
              focus={focus}
              visible={active}
              onSelectSpot={selectSpot}
              onSelectLodging={(id) => (setSelected(id), scrollToItem(id))}
            />
          </Suspense>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-500">
            {view === 'spots' ? (
              <Legend color={COLORS[tab]} label={tab === 'hidden' ? '숨은 명소' : '유명 명소'} />
            ) : nearTab === 'lodging' ? (
              <Legend color="#fb923c" label="숙소" />
            ) : (
              <Legend color="#fb7185" label={nearTab === 'cafe' ? '카페' : '식당'} />
            )}
            <Legend color="#fff" border label="검색 중심" />
          </div>
        </div>

        {/* 목록 */}
        <div ref={listRef} className="min-w-0 lg:order-1">
          {view === 'spots' ? (
            <>
              <Underline
                value={tab}
                onChange={(t) => (setTab(t), setShown(PAGE), setSelected(undefined))}
                options={[
                  ['hidden', '숨은 명소', sp.spots ? split.hidden.length : undefined],
                  ['famous', '유명 명소', sp.spots ? split.famous.length : undefined],
                ]}
              />
              <div className="mt-4">
                {sp.base.status === 'error' ? (
                  <ErrorBox message="명소를 불러오지 못했어요." detail={`${errorReasonKo(sp.base.error)} 잠시 뒤 다시 시도하거나 반경을 줄여 보세요.`} onRetry={sp.retry} />
                ) : !sp.spots ? (
                  <Loading label="명소 찾는 중… (보통 5~15초)" />
                ) : (
                  <>
                    {sp.stale && <Notice>서버에 연결할 수 없어 전에 저장해 둔 결과를 보여 주고 있어요.</Notice>}
                    {sp.famePending && (
                      <p className="mb-3 flex items-center gap-2 text-xs text-stone-500" role="status">
                        <span className="size-3 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                        위키 조회수로 인지도를 확인하는 중… 끝나면 분류가 정리돼요.
                      </p>
                    )}
                    {sp.fameFailed && (
                      <p className="mb-3 text-xs text-amber-800">
                        인지도 확인에 실패해 위키 문서 유무로만 나눴어요.{' '}
                        <button type="button" onClick={sp.fame.retry} className="font-medium underline">
                          다시 확인
                        </button>
                      </p>
                    )}
                    {list.length === 0 ? (
                      <p className="py-6 text-sm text-stone-500">
                        이 반경에서 {tab === 'hidden' ? '숨은' : '유명'} 명소를 찾지 못했어요.{sp.famePending ? ' 인지도 확인이 끝나면 다시 보여 드려요.' : ' 반경을 넓혀 보세요.'}
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {visible.map((s) => (
                          <SpotCard key={s.id} spot={s} countryCode={country.code} selected={s.id === selected} onMap={() => showOnMap(s)} onLodging={() => nearbyOf(s)} />
                        ))}
                      </ul>
                    )}
                    {shown < list.length && (
                      <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-4 w-full rounded-xl border border-stone-200 py-3 text-sm font-medium text-stone-700 active:bg-stone-100">
                        더 보기 ({shown}/{list.length})
                      </button>
                    )}
                    <p className="mt-4 text-[11px] leading-relaxed text-stone-400">
                      숨은 정도는 위키백과 문서 유무와 최근 30일 조회수로 매겨요.{' '}
                      {sp.base.status === 'success' && sp.base.data.data.source === 'fallback'
                        ? 'OpenStreetMap 서버가 응답하지 않아 Wikidata에 등록된 명소로 찾았어요.'
                        : '명소 정보: OpenStreetMap 기여자.'}{' '}
                      설명·사진: 위키백과
                    </p>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-stone-500">
                <span className="font-semibold text-stone-800">{lodgingAt.name}</span> 주변
              </p>
              <Underline
                value={nearTab}
                onChange={setNearTab}
                options={[
                  ['lodging', '숙소', nearCount.lodging],
                  ['food', '식당', nearCount.food],
                  ['cafe', '카페', nearCount.cafe],
                ]}
              />
              <div className="mt-4">
                {nearby.status === 'error' ? (
                  <ErrorBox message="주변 숙소·식당을 불러오지 못했어요." detail={errorReasonKo(nearby.error)} onRetry={nearby.retry} />
                ) : !near ? (
                  <Loading label="주변 숙소·식당 찾는 중…" />
                ) : nearTab === 'lodging' ? (
                  <LodgingList items={near.lodgings} radiusKm={near.radiusKm} country={country} place={place} selected={selected} onMap={showOnMap} />
                ) : eateries.length === 0 ? (
                  <p className="py-6 text-sm text-stone-500">이 근처에서 {nearTab === 'cafe' ? '카페' : '식당'}를 찾지 못했어요.</p>
                ) : (
                  <EateryList items={eateries} total={eateries.length} radiusKm={near.radiusKm * 0.7} country={country} place={place} selected={selected} onMap={showOnMap} cafe={nearTab === 'cafe'} />
                )}
                {near?.source === 'fallback' && (
                  <p className="mt-4 text-[11px] text-stone-400">OpenStreetMap 서버가 응답하지 않아 Nominatim으로 찾았어요. 종류별로 가까운 40곳까지만 나와요.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** 둥근 세그먼트 전환 */
function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="inline-flex rounded-full border border-stone-200 p-1" role="tablist">
      {options.map(([k, label]) => (
        <button
          key={k}
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={`rounded-full px-4 py-1.5 text-sm transition ${value === k ? 'bg-stone-900 font-semibold text-stone-50' : 'text-stone-500 hover:text-stone-800'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** 밑줄 탭 */
function Underline<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string, number | undefined][] }) {
  return (
    <div className="flex gap-6 border-b border-stone-200" role="tablist">
      {options.map(([k, label, n]) => (
        <button
          key={k}
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={`-mb-px border-b-2 pb-2.5 text-sm transition ${value === k ? 'border-teal-700 font-semibold text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
        >
          {label}
          {n != null && <span className="ml-1.5 text-xs text-stone-400">{n}</span>}
        </button>
      ))}
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
  if (s.views === undefined && s.sitelinks)
    return { text: `한국어·영어 위키 없음 · 다른 언어 위키 ${s.sitelinks}곳`, cls: s.hiddenScore >= 50 ? 'bg-teal-50 text-teal-800' : 'bg-violet-50 text-violet-800' }
  if (s.views === undefined) return { text: '위키 문서 없음 · 숨은 곳 후보', cls: 'bg-teal-50 text-teal-800' }
  if (s.views === null && s.sitelinks) return { text: `위키 언어판 ${s.sitelinks}곳`, cls: s.hiddenScore >= 50 ? 'bg-teal-50 text-teal-800' : 'bg-violet-50 text-violet-800' }
  if (s.views === null) return { text: '조회수 확인 못 함', cls: 'bg-stone-100 text-stone-600' }
  return {
    text: `위키 조회 30일 ${s.views.toLocaleString('ko-KR')}회`,
    cls: s.hiddenScore >= 50 ? 'bg-teal-50 text-teal-800' : 'bg-violet-50 text-violet-800',
  }
}

function SpotCard({ spot, selected, onMap, onLodging, countryCode }: { spot: Spot; selected: boolean; onMap: () => void; onLodging: () => void; countryCode: string }) {
  const [open, setOpen] = useState(false)
  const hasWiki = !!(spot.koTitle || spot.enTitle || (spot.wiki && ['ko', 'en'].includes(spot.wiki.lang)))
  const sum = useAsync(hasWiki ? () => getSummary(spot) : null, [spot.id])
  const details = useAsync(open && spot.wikidata ? () => getSpotDetails(spot).then((r) => r.data) : null, [open, spot.id])
  const fame = fameLabel(spot)
  const summary = sum.status === 'success' ? sum.data : null
  const d = details.status === 'success' ? details.data : null
  // 사진은 펼치지 않아도 바로 보여 준다: 명소 자체 사진 → 위키백과 대표 사진 → (펼쳤을 때) Wikidata 사진
  const photo = spot.image ? photoUrl(spot.image) : (summary?.thumbnail ?? d?.image)
  const facts = [
    d?.location && `📍 ${d.location}`,
    d?.inception && `${d.inception} 건립`,
    d?.elevation && `해발 ${d.elevation.toLocaleString('ko-KR')}m`,
    ...(d?.heritage ?? []),
    spot.openingHours && `🕒 ${spot.openingHours}`,
    spot.fee && (spot.fee === 'no' ? '입장 무료' : spot.fee === 'yes' ? '입장료 있음' : `요금 ${spot.fee}`),
  ].filter(Boolean) as string[]
  const website = spot.website ?? d?.website
  const description = d?.description ?? (spot.description ? { text: spot.description, lang: guessLang(spot.description, countryCode) ?? 'ko' } : undefined)

  return (
    <li data-id={spot.id} className={`overflow-hidden rounded-2xl border bg-white transition ${selected ? 'border-teal-700' : 'border-stone-200'}`}>
      {photo && <Photo src={photo} alt={spot.name} />}
      <div className="flex gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{spot.name}</p>
          {spot.nameLocal && <p className="truncate text-xs text-stone-400">{spot.nameLocal}</p>}
          <p className="mt-0.5 text-xs text-stone-500">
            {spot.kind} · 중심에서 {formatDistance(spot.distKm)}
          </p>
          <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${fame.cls}`}>
            {fame.text} · 숨은 정도 {spot.hiddenScore}
          </span>
        </div>
      </div>
      {hasWiki && (
        <div className="px-4 pb-3 text-sm text-stone-600">
          {sum.status === 'loading' && <p className="text-xs text-stone-400">설명 불러오는 중…</p>}
          {sum.status === 'error' && (
            <p className="text-xs text-stone-400">
              설명을 불러오지 못했어요.{' '}
              <button type="button" onClick={sum.retry} className="underline">
                다시 시도
              </button>
            </p>
          )}
          {summary && (
            <p className={open ? '' : 'line-clamp-3'}>
              {summary.extract}{' '}
              <a href={summary.url} target="_blank" rel="noreferrer" className="text-xs text-teal-700 underline">
                {summary.lang === 'ko' ? '위키백과' : '위키백과(영어)'}
              </a>
            </p>
          )}
        </div>
      )}

      {open && (
        <div className="space-y-3 border-t border-stone-200 px-4 py-3 text-sm">
          {details.status === 'loading' && <p className="text-xs text-stone-400">자세한 정보 불러오는 중…</p>}
          {details.status === 'error' && (
            <p className="text-xs text-stone-400">
              자세한 정보를 불러오지 못했어요.{' '}
              <button type="button" onClick={details.retry} className="underline">
                다시 시도
              </button>
            </p>
          )}
          {description && <p className="text-stone-700">{description.text}</p>}
          {facts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {facts.map((f) => (
                <span key={f} className="rounded-full border border-stone-200 px-2.5 py-1 text-xs text-stone-600">
                  {f}
                </span>
              ))}
            </div>
          )}
          {!description && !facts.length && details.status !== 'loading' && !summary && (
            <p className="text-xs text-stone-500">공개 데이터에 등록된 설명이 없어요. 덜 알려진 곳일수록 정보가 적어요. 아래 지도 링크로 사진·후기를 확인해 보세요.</p>
          )}
          <Translator spot={spot} countryCode={countryCode} summary={summary?.lang !== 'ko' ? summary?.extract : undefined} description={description && description.lang !== 'ko' ? description : undefined} />
          {website && (
            <a href={website} target="_blank" rel="noreferrer" className="inline-block text-xs text-teal-700 underline underline-offset-2">
              공식 홈페이지
            </a>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 border-t border-stone-200 px-4 py-2.5 text-xs">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="rounded-full bg-stone-900 px-3 py-1 font-semibold text-stone-50">
          {open ? '접기' : '자세히 · 번역'}
        </button>
        <Action onClick={onMap}>지도에서 보기</Action>
        <Action onClick={onLodging}>근처 숙소·식당</Action>
        <a href={googleMapsUrl(spot.lat, spot.lng)} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1 font-medium text-stone-500 transition hover:text-stone-800">
          구글 지도
        </a>
        {spot.id.startsWith('wd/') ? (
          <a href={`https://www.wikidata.org/wiki/${spot.wikidata}`} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1 font-medium text-stone-500 transition hover:text-stone-800">
            Wikidata
          </a>
        ) : (
          <a href={osmUrl({ type: spot.id.split('/')[0], id: Number(spot.id.split('/')[1]) })} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1 font-medium text-stone-500 transition hover:text-stone-800">
            OSM
          </a>
        )}
      </div>
    </li>
  )
}

/** 이름·설명을 한국어로 번역 (MyMemory). 한도 초과면 파파고·구글 번역 링크 */
function Translator({
  spot,
  countryCode,
  summary,
  description,
}: {
  spot: Spot
  countryCode: string
  summary?: string
  description?: { text: string; lang: string }
}) {
  const nameLang = guessLang(spot.name, countryCode)
  const items = [
    nameLang && { key: 'name', label: '이름', text: spot.name, from: nameLang },
    description && { key: 'desc', label: '설명', text: description.text, from: description.lang === 'ko' ? null : description.lang },
    summary && { key: 'sum', label: '위키백과 요약', text: summary, from: guessLang(summary, countryCode, 'en') },
  ].filter((x): x is { key: string; label: string; text: string; from: string | null } => !!x && !!x.from)
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'quota' | 'error'>('idle')
  const [result, setResult] = useState<Record<string, string>>({})

  if (!items.length) return null
  const all = items.map((i) => i.text).join('\n\n')
  const run = async () => {
    setState('loading')
    try {
      const out: Record<string, string> = {}
      for (const it of items) out[it.key] = await translateToKo(it.text, it.from)
      setResult(out)
      setState('done')
    } catch (e) {
      setState(e instanceof TranslateQuotaError ? 'quota' : 'error')
    }
  }

  return (
    <div className="rounded-xl bg-stone-100 p-3">
      {state === 'done' ? (
        <div className="space-y-2">
          {items.map((it) => (
            <p key={it.key} className="text-sm text-stone-800">
              <span className="mr-1.5 text-xs text-stone-500">{it.label}</span>
              {result[it.key]}
            </p>
          ))}
          <p className="text-[11px] text-stone-400">기계 번역(MyMemory)이라 어색할 수 있어요.</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={run} disabled={state === 'loading'} className="rounded-full border border-stone-300 px-3 py-1.5 font-medium text-stone-800 disabled:opacity-50">
            {state === 'loading' ? '번역 중…' : '한국어로 번역'}
          </button>
          {(state === 'quota' || state === 'error') && (
            <span className="text-stone-500">{state === 'quota' ? '오늘 무료 번역 한도를 다 썼어요.' : '번역하지 못했어요.'} 번역 사이트에서 보기:</span>
          )}
          <a href={papagoUrl(all)} target="_blank" rel="noreferrer" className="text-stone-500 underline underline-offset-2">
            파파고
          </a>
          <a href={googleTranslateUrl(all)} target="_blank" rel="noreferrer" className="text-stone-500 underline underline-offset-2">
            구글 번역
          </a>
        </div>
      )}
    </div>
  )
}

function Action({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full border border-stone-300 px-3 py-1 font-medium text-stone-800 transition hover:border-stone-500">
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
              <Action onClick={() => onMap(l)}>지도</Action>
              <a href={googleMapsUrl(l.lat, l.lng)} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1 font-medium text-stone-500 transition hover:text-stone-800">
                구글 지도·가격 보기
              </a>
              {l.website && (
                <a href={l.website} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1 font-medium text-stone-500 transition hover:text-stone-800">
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
              <Action onClick={() => onMap(e)}>지도</Action>
              <a href={googleMapsUrl(e.lat, e.lng)} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1 font-medium text-stone-500 transition hover:text-stone-800">
                구글 지도·리뷰
              </a>
              {e.website && (
                <a href={e.website} target="_blank" rel="noreferrer" className="rounded-full px-3 py-1 font-medium text-stone-500 transition hover:text-stone-800">
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

/** 사진 (불러오지 못하면 자리를 감춘다) */
function Photo({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <div className="aspect-[16/9] w-full overflow-hidden bg-stone-100">
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="size-full object-cover" />
    </div>
  )
}
