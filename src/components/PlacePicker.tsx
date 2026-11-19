import { useEffect, useState } from 'react'
import type { Country, Place } from '../types'
import { useAsync } from '../lib/useAsync'
import { cityOptions, factorNear } from '../lib/places'
import { nominatimSearch, type NominatimPlace } from '../lib/osm'
import { DAY, cachedJson, errorReasonKo } from '../lib/cache'

export function PlacePicker({ country, place, onChange }: { country: Country; place: Place; onChange: (p: Place) => void }) {
  const options = useAsync(() => cityOptions(country), [country.code])
  const [searching, setSearching] = useState(false)
  const list = options.status === 'success' ? options.data : []
  const inList = list.some((p) => p.name === place.name)
  const chips = inList ? list : [place, ...list]

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-stone-600">어느 도시·지역을 둘러보세요?</p>
      <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
        {chips.map((p) => {
          const active = p.name === place.name
          return (
            <button
              key={p.name}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(p)}
              className={`rounded-full px-3 py-1.5 text-sm ring-1 ${active ? 'bg-stone-900 font-semibold text-stone-50 ring-stone-900' : 'bg-white text-stone-700 ring-stone-300 active:bg-stone-50'}`}
            >
              {p.name}
            </button>
          )
        })}
        <MyLocation country={country} onPick={onChange} active={place.source === 'gps'} />
        <button
          type="button"
          onClick={() => setSearching((v) => !v)}
          className="rounded-full px-3 py-1.5 text-sm text-teal-700 ring-1 ring-teal-600/40 active:bg-teal-50"
        >
          다른 지역 검색
        </button>
      </div>
      {searching && <PlaceSearch country={country} onPick={(p) => (onChange(p), setSearching(false))} />}
      <p className="mt-1.5 text-xs text-stone-500">
        숨은 명소·주변 숙소·날씨·경비가 이 지역 기준으로 바뀌어요.
        {place.factor !== 1 && ` 물가 보정 ×${place.factor.toFixed(2)}${place.near ? ` (${place.near} 기준)` : ''}`}
      </p>
    </div>
  )
}

function PlaceSearch({ country, onPick }: { country: Country; onPick: (p: Place) => void }) {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 700)
    return () => clearTimeout(t)
  }, [q])

  const results = useAsync(
    debounced.length >= 2
      ? (force) => cachedJson(`nominatim:${country.code}:${debounced}`, DAY, () => nominatimSearch(debounced, country.code), { force }).then((r) => r.data)
      : null,
    [debounced, country.code],
  )

  const pick = (r: NominatimPlace) => {
    const lat = Number(r.lat)
    const lng = Number(r.lon)
    const { factor, near } = factorNear(country.code, lat, lng)
    onPick({ name: r.name || r.display_name.split(',')[0], lat, lng, factor, near, source: 'search' })
  }

  return (
    <div className="mt-2 rounded-xl border border-stone-200 p-2">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`${country.nameKo} 안의 도시·동네·섬 이름 (예: 하코네)`}
        className="h-11 w-full rounded-lg border border-stone-300 px-3 text-base focus:border-teal-600 focus:outline-none"
      />
      <div className="mt-1 text-sm">
        {results.status === 'loading' && <p className="px-1 py-2 text-stone-500">검색 중…</p>}
        {results.status === 'error' && (
          <p className="px-1 py-2 text-rose-700">
            검색하지 못했어요. {errorReasonKo(results.error)}{' '}
            <button type="button" onClick={results.retry} className="font-medium underline">
              다시 시도
            </button>
          </p>
        )}
        {results.status === 'success' && results.data.length === 0 && <p className="px-1 py-2 text-stone-500">검색 결과가 없어요.</p>}
        {results.status === 'success' && (
          <ul>
            {results.data.map((r) => (
              <li key={`${r.lat},${r.lon}`}>
                <button type="button" onClick={() => pick(r)} className="w-full rounded-lg px-2 py-2 text-left active:bg-teal-50">
                  <span className="font-medium">{r.name || r.display_name.split(',')[0]}</span>
                  <span className="block truncate text-xs text-stone-500">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="px-1 pt-1 text-[11px] text-stone-400">검색: OpenStreetMap Nominatim</p>
      </div>
    </div>
  )
}

/** 여행 중: 현재 위치를 기준으로 근처 숨은 명소·식당을 찾는다 (위치는 이 기기에서만 쓰고 저장된 지역 외에는 보내지 않음) */
function MyLocation({ country, onPick, active }: { country: Country; onPick: (p: Place) => void; active: boolean }) {
  const [state, setState] = useState<'idle' | 'loading' | 'denied' | 'error'>('idle')
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null
  const go = () => {
    setState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const { factor, near } = factorNear(country.code, lat, lng)
        onPick({ name: '내 위치', lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)), factor, near, source: 'gps' })
        setState('idle')
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    )
  }
  return (
    <button
      type="button"
      onClick={go}
      aria-pressed={active}
      title={state === 'denied' ? '브라우저 설정에서 위치 권한을 허용해 주세요' : undefined}
      className={`rounded-full px-3 py-1.5 text-sm ring-1 ${active ? 'bg-stone-900 font-semibold text-stone-50 ring-stone-900' : 'text-teal-700 ring-teal-600/40'}`}
    >
      {state === 'loading' ? '위치 찾는 중…' : state === 'denied' ? '위치 권한 없음' : state === 'error' ? '위치 실패 · 다시' : '◎ 내 위치 주변'}
    </button>
  )
}
