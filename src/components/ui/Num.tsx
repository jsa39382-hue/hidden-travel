import NumberFlow from '@number-flow/react'

/** 바뀔 때 숫자가 촤르륵 굴러가는 숫자 (NumberFlow). '동작 줄이기' 설정이면 바로 바뀐다 */
export function Num({ value, suffix, digits = 0, className }: { value: number; suffix?: string; digits?: number; className?: string }) {
  return (
    <NumberFlow
      value={Number.isFinite(value) ? value : 0}
      locales="ko-KR"
      format={{ maximumFractionDigits: digits, minimumFractionDigits: 0 }}
      suffix={suffix}
      respectMotionPreference
      className={className}
    />
  )
}

/** 추정 원화: 10만 원 이상은 천 원 단위로 반올림해서 굴린다 */
export const roundKrw = (n: number) => (n >= 100_000 ? Math.round(n / 1000) * 1000 : Math.round(n / 10) * 10)
