import type { ReactNode } from 'react'

export function Section({ id, icon, title, aside, children }: { id: string; icon: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:p-6">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden>{icon}</span>
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  )
}
