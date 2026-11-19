/** 단순한 선 아이콘 (24x24, 현재 글자색) */
const PATHS: Record<string, string> = {
  plan: 'M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8z M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  calendar: 'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z M4 10h16 M8.5 3v4 M15.5 3v4',
  exchange: 'M4 8h13 M14 4.5 17.5 8 14 11.5 M20 16H7 M10 12.5 6.5 16 10 19.5',
  budget: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',
  spots: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  weather: 'M8 18h9a4 4 0 0 0 .4-8 6 6 0 0 0-11.3 2A3 3 0 0 0 8 18z',
  tips: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z',
  edit: 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4',
  close: 'M6 6l12 12 M18 6 6 18',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z',
  chevron: 'M9 6l6 6-6 6',
}

export type IconName = keyof typeof PATHS

export function Icon({ name, className = 'size-5' }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name] ?? ''} />
    </svg>
  )
}
