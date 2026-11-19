import createGlobe from 'cobe'
import { useEffect, useRef } from 'react'

export interface GlobeMarker {
  lat: number
  lng: number
  size?: number
  color?: [number, number, number]
}

/** 위도·경도 → cobe 회전각 */
const toAngles = (lat: number, lng: number): [number, number] => [Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180]

/**
 * cobe 지구본 (WebGL, 약 5KB).
 * focus가 있으면 그 나라로 스프링처럼 돌아가고(살짝 지나쳤다 멈춤), 없으면 천천히 자전한다. 손가락·마우스로 돌릴 수 있다.
 */
export default function Globe({ markers, focus, className }: { markers: GlobeMarker[]; focus?: [number, number] | null; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const target = useRef<[number, number] | null>(null)
  const drag = useRef<{ x: number; phi: number } | null>(null)
  const state = useRef({ phi: 2.4, theta: 0.25, vPhi: 0, vTheta: 0, userPhi: 0 })
  const markersRef = useRef(markers)
  const globeRef = useRef<{ globe: ReturnType<typeof createGlobe>; toMarkers: (m: GlobeMarker[]) => { location: [number, number]; size: number }[] } | null>(null)

  useEffect(() => {
    target.current = focus ? toAngles(focus[0], focus[1]) : null
  }, [focus])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = canvas.offsetWidth
    const onResize = () => (width = canvas.offsetWidth)
    window.addEventListener('resize', onResize)
    const s = state.current
    const toMarkers = (ms: GlobeMarker[]) => ms.map((m) => ({ location: [m.lat, m.lng] as [number, number], size: m.size ?? 0.05, ...(m.color ? { color: m.color } : {}) }))
    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(2, window.devicePixelRatio || 1),
      width: width * 2,
      height: width * 2,
      phi: s.phi,
      theta: s.theta,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 5,
      baseColor: [0.22, 0.22, 0.22],
      markerColor: [0.37, 0.92, 0.83],
      glowColor: [0.12, 0.12, 0.12],
      markers: toMarkers(markersRef.current),
    })
    globeRef.current = { globe, toMarkers }
    // cobe 2.0은 직접 애니메이션 루프를 돌리며 update()로 각도를 넘긴다
    let raf = 0
    const tick = () => {
      if (drag.current) {
        // 끄는 중: 손가락을 그대로 따라감
      } else if (target.current) {
        // 스프링: 장력 0.06, 감쇠 0.82 → 목표를 살짝 지나쳤다가 제자리
        let dPhi = target.current[0] - s.phi
        dPhi = Math.atan2(Math.sin(dPhi), Math.cos(dPhi))
        s.vPhi = (s.vPhi + dPhi * 0.06) * 0.82
        s.vTheta = (s.vTheta + (target.current[1] - s.theta) * 0.06) * 0.82
        s.phi += reduced ? dPhi : s.vPhi
        s.theta += reduced ? target.current[1] - s.theta : s.vTheta
      } else if (!reduced) {
        s.phi += 0.003
        s.theta += (0.25 - s.theta) * 0.05
      }
      globe.update({ phi: s.phi + s.userPhi, theta: s.theta, width: width * 2, height: width * 2 })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    requestAnimationFrame(() => (canvas.style.opacity = '1'))
    return () => {
      cancelAnimationFrame(raf)
      globe.destroy()
      globeRef.current = null
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // 마커가 바뀌면 지구본을 다시 만들지 않고 갱신
  useEffect(() => {
    markersRef.current = markers
    const g = globeRef.current
    if (g) g.globe.update({ markers: g.toMarkers(markers) })
  }, [markers])


  return (
    <div className={`relative aspect-square ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className="size-full cursor-grab touch-none opacity-0 transition-opacity duration-700 active:cursor-grabbing"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, phi: state.current.userPhi }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (drag.current) state.current.userPhi = drag.current.phi + (e.clientX - drag.current.x) / 150
        }}
        onPointerUp={() => {
          // 놓으면 손으로 돌린 만큼을 기본 회전에 합친다
          if (drag.current) {
            state.current.phi += state.current.userPhi
            state.current.userPhi = 0
            target.current = null
          }
          drag.current = null
        }}
      />
    </div>
  )
}
