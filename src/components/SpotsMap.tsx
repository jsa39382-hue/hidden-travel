import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Spot } from '../lib/spots'
import type { Eatery, Lodging } from '../lib/nearby'

export interface MapProps {
  center: [number, number]
  radiusKm: number
  spots: Spot[]
  spotColor: string
  lodgings: Lodging[]
  eateries?: Eatery[]
  selectedId?: string
  focus?: [number, number] | null
  /** 숨겨진 탭에서 다시 보일 때 지도 크기를 다시 계산 */
  visible?: boolean
  onSelectSpot: (id: string) => void
  /** 관심 목록에 넣은 명소 (하트 색으로 표시) */
  likedIds?: Set<string>
  /** 숨은 산책 코스: 순서대로 이은 선과 번호 */
  route?: { lat: number; lng: number; name: string }[]
  /** 해 방향 화살표 (from에서 방위각 쪽으로) */
  sun?: { from: [number, number]; azimuth: number; label: string } | null
  onSelectLodging: (id: string) => void
}

function FlyTo({ focus }: { focus?: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (focus) map.flyTo(focus, Math.max(map.getZoom(), 15), { duration: 0.6 })
  }, [focus, map])
  return null
}

function Resize({ visible }: { visible?: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => map.invalidateSize(), 50)
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(map.getContainer())
    return () => (clearTimeout(t), ro.disconnect())
  }, [visible, map])
  return null
}

function Recenter({ center, radiusKm }: { center: [number, number]; radiusKm: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, radiusKm <= 2 ? 15 : radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : 11)
  }, [center, radiusKm, map])
  return null
}

export default function SpotsMap({ center, radiusKm, spots, spotColor, lodgings, eateries = [], selectedId, focus, visible, onSelectSpot, onSelectLodging, likedIds, route, sun }: MapProps) {
  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="h-64 w-full rounded-2xl sm:h-80 lg:h-[calc(100dvh-12rem)] xl:h-[calc(100dvh-8rem)]" style={{ zIndex: 0 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Resize visible={visible} />
      <Recenter center={center} radiusKm={radiusKm} />
      <FlyTo focus={focus} />
      <CircleMarker center={center} radius={6} pathOptions={{ color: '#0a0a0a', fillColor: '#fafafa', fillOpacity: 1, weight: 2 }}>
        <Tooltip>검색 중심</Tooltip>
      </CircleMarker>
      {lodgings.map((l) => (
        <CircleMarker
          key={l.id}
          center={[l.lat, l.lng]}
          radius={l.id === selectedId ? 9 : 6}
          pathOptions={{ color: '#0a0a0a', fillColor: '#fb923c', fillOpacity: 0.9, weight: l.id === selectedId ? 3 : 1 }}
          eventHandlers={{ click: () => onSelectLodging(l.id) }}
        >
          <Tooltip>🏨 {l.name}</Tooltip>
        </CircleMarker>
      ))}
      {eateries.map((e) => (
        <CircleMarker
          key={e.id}
          center={[e.lat, e.lng]}
          radius={e.id === selectedId ? 8 : 5}
          pathOptions={{ color: '#0a0a0a', fillColor: '#fb7185', fillOpacity: 0.85, weight: e.id === selectedId ? 3 : 1 }}
          eventHandlers={{ click: () => onSelectLodging(e.id) }}
        >
          <Tooltip>
            {e.kind === 'cafe' ? '☕' : '🍜'} {e.name}
          </Tooltip>
        </CircleMarker>
      ))}
      {spots.map((s) => (
        <CircleMarker
          key={s.id}
          center={[s.lat, s.lng]}
          radius={s.id === selectedId ? 10 : 7}
          pathOptions={{ color: s.id === selectedId ? '#fafafa' : '#0a0a0a', fillColor: likedIds?.has(s.id) ? '#fb7185' : spotColor, fillOpacity: 0.95, weight: s.id === selectedId ? 3 : 1.5 }}
          eventHandlers={{ click: () => onSelectSpot(s.id) }}
        >
          <Tooltip>
            {likedIds?.has(s.id) ? '♥ ' : ''}
            {s.name} · {s.kind}
          </Tooltip>
        </CircleMarker>
      ))}
      {route && route.length > 1 && <Polyline positions={route.map((r) => [r.lat, r.lng] as [number, number])} pathOptions={{ color: '#2dd4bf', weight: 4, opacity: 0.9, dashArray: '2 8', lineCap: 'round' }} />}
      {route?.map((r, i) => (
        <CircleMarker key={`route-${i}`} center={[r.lat, r.lng]} radius={11} pathOptions={{ color: '#0a0a0a', fillColor: i === route.length - 1 ? '#fbbf24' : '#2dd4bf', fillOpacity: 1, weight: 2 }}>
          <Tooltip permanent direction="center" className="route-num">
            {i + 1}
          </Tooltip>
        </CircleMarker>
      ))}
      {sun && <SunArrow {...sun} />}
      {route && route.length > 1 && <FitRoute route={route} />}
    </MapContainer>
  )
}

/** 지점에서 해 쪽으로 약 600m 화살표 (지도 위 방향 = 실제 방향) */
function SunArrow({ from, azimuth, label }: { from: [number, number]; azimuth: number; label: string }) {
  const toward = (km: number, deg: number): [number, number] => {
    const r = Math.PI / 180
    return [from[0] + (km / 111.32) * Math.cos(deg * r), from[1] + (km / (111.32 * Math.cos(from[0] * r))) * Math.sin(deg * r)]
  }
  const tip = toward(0.6, azimuth)
  // 화살촉: 끝에서 뒤로 비스듬히 두 줄
  const back = (side: number): [number, number] => {
    const r = Math.PI / 180
    const d = 0.12
    const deg = azimuth + 180 + side
    return [tip[0] + (d / 111.32) * Math.cos(deg * r), tip[1] + (d / (111.32 * Math.cos(tip[0] * r))) * Math.sin(deg * r)]
  }
  return (
    <>
      <Polyline positions={[from, tip]} pathOptions={{ color: '#fbbf24', weight: 3 }} />
      <Polyline positions={[back(-28), tip, back(28)]} pathOptions={{ color: '#fbbf24', weight: 3 }} />
      <CircleMarker center={tip} radius={9} pathOptions={{ color: '#fbbf24', fillColor: '#fbbf24', fillOpacity: 1, weight: 1 }}>
        {/* 이름표는 화살표 바깥쪽에 (도착지를 가리지 않게) */}
        <Tooltip permanent direction={azimuth > 180 ? 'left' : 'right'} offset={[azimuth > 180 ? -10 : 10, 0]}>
          {label}
        </Tooltip>
      </CircleMarker>
    </>
  )
}

/** 산책 코스를 고르면 코스 전체가 보이게 확대 */
function FitRoute({ route }: { route: { lat: number; lng: number }[] }) {
  const map = useMap()
  const key = route.map((r) => `${r.lat.toFixed(5)},${r.lng.toFixed(5)}`).join(';')
  useEffect(() => {
    const lats = route.map((r) => r.lat)
    const lngs = route.map((r) => r.lng)
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [48, 48], maxZoom: 16 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}
