import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
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

export default function SpotsMap({ center, radiusKm, spots, spotColor, lodgings, eateries = [], selectedId, focus, visible, onSelectSpot, onSelectLodging }: MapProps) {
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
          pathOptions={{ color: s.id === selectedId ? '#fafafa' : '#0a0a0a', fillColor: spotColor, fillOpacity: 0.95, weight: s.id === selectedId ? 3 : 1.5 }}
          eventHandlers={{ click: () => onSelectSpot(s.id) }}
        >
          <Tooltip>
            {s.name} · {s.kind}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
