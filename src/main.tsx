import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 글꼴: Pretendard Variable (SIL OFL 1.1) · 글자 범위별 조각이라 화면에 쓰인 부분만 받는다
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './index.css'
import { MotionConfig } from 'motion/react'
import App from './App.tsx'
import { cleanupCache } from './lib/cache'

cleanupCache()

// 휴대폰에서 버튼을 누르면 아주 짧게 진동 (지원하는 기기만, '동작 줄이기' 설정이면 끔)
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
document.addEventListener(
  'pointerdown',
  (e) => {
    if (e.pointerType !== 'touch' || reduced()) return
    if ((e.target as Element | null)?.closest?.('button, [role="tab"], .press')) navigator.vibrate?.(8)
  },
  { passive: true },
)

// ?demo(도쿄) · ?demo=FR(파리): 시연 데이터를 채우고 그 여행 화면으로 (화면은 이동한 뒤에 그린다)
const demo = new URLSearchParams(location.search).get('demo')
if (demo !== null) {
  import('./lib/demo').then((m) => m.startDemo(demo.toUpperCase() === 'FR' ? 'FR' : 'JP'))
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 300, damping: 22 }}>
        <App />
      </MotionConfig>
    </StrictMode>,
  )
}
