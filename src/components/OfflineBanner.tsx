import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
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
  if (online) return null
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[2000] bg-stone-900 px-4 py-3 text-center text-sm text-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      📴 인터넷 연결이 끊겼어요. 전에 저장해 둔 정보는 계속 볼 수 있어요.
    </div>
  )
}
