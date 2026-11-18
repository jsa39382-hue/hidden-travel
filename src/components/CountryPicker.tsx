import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { COUNTRIES, POPULAR_CODES, getCountry, searchCountries } from '../lib/countries'
import type { Country } from '../types'
import { Flag } from './Flag'

const MAX_RESULTS = 60

export function CountryPicker({ value, onChange }: { value: Country | undefined; onChange: (c: Country) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const results = useMemo(() => {
    if (query.trim()) return searchCountries(query).slice(0, MAX_RESULTS)
    const popular = POPULAR_CODES.map(getCountry).filter((c): c is Country => !!c)
    const rest = COUNTRIES.filter((c) => !POPULAR_CODES.includes(c.code))
    return [...popular, ...rest]
  }, [query])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (c: Country) => {
    onChange(c)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && open && results[active]) {
      e.preventDefault()
      choose(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={listId + '-input'} className="mb-1 block text-sm font-medium text-stone-600">
        어느 나라로 떠나세요?
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/20">
        {value && !open ? <Flag code={value.code} /> : <span aria-hidden className="text-stone-400">🔍</span>}
        <input
          id={listId + '-input'}
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${results[active].code}` : undefined}
          autoComplete="off"
          placeholder={value ? `${value.nameKo} (다른 나라 검색)` : '나라 이름, 영어, 초성(ㅇㅂ)으로 검색'}
          value={open ? query : value?.nameKo ?? query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-12 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-stone-400"
        />
        {open && query && (
          <button type="button" aria-label="검색어 지우기" onClick={() => setQuery('')} className="px-1 text-stone-400">
            ✕
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute z-[1000] mt-1 max-h-72 w-full overflow-y-auto overscroll-contain rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
        >
          {!query.trim() && <li className="px-3 pb-1 pt-2 text-xs font-medium text-stone-400">인기 여행지</li>}
          {results.length === 0 && <li className="px-3 py-4 text-sm text-stone-500">‘{query}’에 맞는 나라가 없어요.</li>}
          {results.map((c, i) => (
            <li key={c.code}>
              {!query.trim() && i === POPULAR_CODES.length && (
                <div className="border-t border-stone-100 px-3 pb-1 pt-2 text-xs font-medium text-stone-400">전체 (가나다순)</div>
              )}
              <div
                id={`${listId}-${c.code}`}
                role="option"
                aria-selected={value?.code === c.code}
                data-index={i}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(c)}
                onPointerEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${i === active ? 'bg-teal-50' : ''}`}
              >
                <Flag code={c.code} />
                <span className="flex-1 truncate">
                  {c.nameKo}
                  <span className="ml-1.5 text-xs text-stone-400">{c.nameEn}</span>
                </span>
                <span className="text-xs text-stone-400">{c.currency}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
