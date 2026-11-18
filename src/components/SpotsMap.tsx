import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Spot } from '../lib/spots'
import type { Lodging } from '../lib/lodging'

export interface MapProps {
  center: [number, number]
  radiusKm: number
  spots: Spot[]
  spotColor: string
  lodgings: Lodging[]
  selectedId?: string
  focus?: [number, number] | null
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

function Recenter({ center, radiusKm }: { center: [number, number]; radiusKm: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : 11)
  }, [center, radiusKm, map])
  return null
}

export default function SpotsMap({ center, radiusKm, spots, spotColor, lodgings, selectedId, focus, onSelectSpot, onSelectLodging }: MapProps) {
  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="h-72 w-full rounded-xl sm:h-96" style={{ zIndex: 0 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Recenter center={center} radiusKm={radiusKm} />
      <FlyTo focus={focus} />
      <CircleMarker center={center} radius={6} pathOptions={{ color: '#1c1917', fillColor: '#fff', fillOpacity: 1, weight: 2 }}>
        <Tooltip>검색 중심</Tooltip>
      </CircleMarker>
      {lodgings.map((l) => (
        <CircleMarker
          key={l.id}
          center={[l.lat, l.lng]}
          radius={l.id === selectedId ? 9 : 6}
          pathOptions={{ color: '#9a3412', fillColor: '#f97316', fillOpacity: 0.9, weight: l.id === selectedId ? 3 : 1 }}
          eventHandlers={{ click: () => onSelectLodging(l.id) }}
        >
          <Tooltip>🏨 {l.name}</Tooltip>
        </CircleMarker>
      ))}
      {spots.map((s) => (
        <CircleMarker
          key={s.id}
          center={[s.lat, s.lng]}
          radius={s.id === selectedId ? 10 : 7}
          pathOptions={{ color: '#fff', fillColor: spotColor, fillOpacity: 0.95, weight: s.id === selectedId ? 3 : 1.5 }}
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
