import { useState } from 'react'
import { flagEmoji, flagUrl } from '../lib/countries'

export function Flag({ code, size = 'md' }: { code: string; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false)
  const cls = size === 'lg' ? 'h-8 w-12' : size === 'sm' ? 'h-4 w-6' : 'h-5 w-7'
  if (failed) return <span className={`inline-flex ${cls} items-center justify-center text-lg leading-none`}>{flagEmoji(code)}</span>
  return (
    <img
      src={flagUrl(code, size === 'lg' ? 80 : 40)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${cls} shrink-0 rounded-sm object-cover ring-1 ring-black/10`}
    />
  )
}
