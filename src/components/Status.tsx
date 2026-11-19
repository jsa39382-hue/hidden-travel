import type { ReactNode } from 'react'

export function Loading({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-6 text-sm text-stone-500">
      <span className="size-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      {label}
    </div>
  )
}

export function ErrorBox({ message, onRetry, detail }: { message: string; onRetry?: () => void; detail?: string }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <p className="font-medium">{message}</p>
      {detail && <p className="mt-1 text-xs text-rose-600">{detail}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 active:bg-rose-100"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{children}</p>
}
