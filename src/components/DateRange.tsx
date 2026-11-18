import type { TripDates } from '../types'
import { addDays, diffDays } from '../lib/dates'

export function DateRange({ value, onChange }: { value: TripDates; onChange: (d: TripDates) => void }) {
  const nights = diffDays(value.start, value.end)
  const invalid = nights < 0

  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-stone-600">여행 날짜</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="sr-only">시작일</span>
          <input
            type="date"
            value={value.start}
            onChange={(e) => {
              const start = e.target.value
              if (!start) return
              // 시작일이 종료일보다 늦어지면 종료일을 같은 일정 길이만큼 뒤로 민다
              const end = diffDays(start, value.end) < 0 ? addDays(start, Math.max(nights, 0)) : value.end
              onChange({ start, end })
            }}
            className="h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
        </label>
        <label className="block">
          <span className="sr-only">종료일</span>
          <input
            type="date"
            value={value.end}
            min={value.start}
            onChange={(e) => e.target.value && onChange({ ...value, end: e.target.value })}
            className="h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
        </label>
      </div>
      <p className={`mt-1 text-xs ${invalid ? 'text-rose-600' : 'text-stone-500'}`}>
        {invalid ? '종료일이 시작일보다 빨라요.' : `${nights}박 ${nights + 1}일`}
      </p>
    </fieldset>
  )
}
