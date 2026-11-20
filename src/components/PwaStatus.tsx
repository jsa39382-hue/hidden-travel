import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'hidden-travel:install-dismissed'

/** 오프라인 지원: 서비스 워커 등록, 인터넷 끊김 안내, 새 버전 알림, 앱 설치 버튼 */
export function PwaStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const [install, setInstall] = useState<InstallEvent | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    // 개발 서버에서는 등록하지 않는다 (코드가 바로 바뀌어야 하니까)
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    let reloading = false
    const hadController = !!navigator.serviceWorker.controller
    // 새 버전으로 바뀔 때만 새로고침 (처음 설치 때 페이지를 맡는 것은 새로고침할 필요 없음)
    const onChange = () => {
      if (reloading || !hadController) return
      reloading = true
      location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onChange)
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        if (reg.waiting && hadController) setWaiting(reg.waiting)
        const track = (w: ServiceWorker | null) =>
          w?.addEventListener('statechange', () => {
            if (w.state !== 'installed') return
            // 처음 설치면 '오프라인 준비 완료', 이미 쓰던 중이면 '새 버전' 알림
            if (navigator.serviceWorker.controller && hadController) setWaiting(w)
            else setReady(true)
          })
        // 등록이 끝나기 전에 설치가 시작됐을 수도 있다
        track(reg.installing)
        reg.addEventListener('updatefound', () => track(reg.installing))
      })
      .catch(() => undefined)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onChange)
  }, [])

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      let dismissed = false
      try {
        dismissed = localStorage.getItem(DISMISS_KEY) === '1'
      } catch {
        /* 저장소를 못 쓰면 매번 보여 줘도 괜찮다 */
      }
      if (!dismissed) setInstall(e as InstallEvent)
    }
    const onInstalled = () => setInstall(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setReady(false), 4000)
    return () => clearTimeout(t)
  }, [ready])

  const dismissInstall = () => {
    setInstall(null)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* 무시 */
    }
  }

  return (
    <>
      <AnimatePresence>
        {!online && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[1700] mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-amber-400 bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-800 shadow-lg"
          >
            인터넷이 끊겼어요 · 저장해 둔 정보로 보여 드려요
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(waiting || ready || install) && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed inset-x-4 bottom-24 z-[1650] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-2xl border border-stone-300 bg-white px-4 py-3 shadow-2xl md:bottom-8"
          >
            {waiting ? (
              <>
                <span className="text-sm">새 버전이 있어요</span>
                <button type="button" onClick={() => waiting.postMessage('SKIP_WAITING')} className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-stone-50">
                  새로고침
                </button>
              </>
            ) : ready ? (
              <span className="text-sm">이제 인터넷이 없어도 열려요. 한 번 본 정보는 저장돼요.</span>
            ) : (
              <>
                <span className="text-sm">홈 화면에 앱으로 설치할 수 있어요</span>
                <span className="flex shrink-0 gap-1">
                  <button type="button" onClick={dismissInstall} className="px-2 py-1.5 text-xs text-stone-500">
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await install?.prompt()
                      setInstall(null)
                    }}
                    className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-stone-50"
                  >
                    설치
                  </button>
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
