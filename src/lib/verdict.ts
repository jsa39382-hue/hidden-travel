/**
 * 여행 추천·비추천 판단 (순수 함수, 테스트용으로 다른 모듈을 가져오지 않는다)
 * - 안전이 가장 먼저: 영국 외무부(FCDO) 경보가 나라 전체면 비추천, 일부 지역이면 신중
 * - 안전 정보를 확인하지 못하면 '추천'하지 않는다
 * - 그다음 날씨(예보 또는 평년 기후)·공휴일 혼잡
 */
export type Safety = 'ok' | 'parts' | 'whole' | 'na' | 'unknown'
export type VerdictLevel = 'recommend' | 'normal' | 'caution' | 'avoid'

export function safetyOf(status: string[] | null | undefined, hasSource = true): Safety {
  if (!hasSource) return 'na'
  if (!status) return 'unknown'
  if (status.some((s) => s.endsWith('_whole_country'))) return 'whole'
  if (status.some((s) => s.endsWith('_to_parts'))) return 'parts'
  return 'ok'
}

export interface VerdictInput {
  safety: Safety
  /** 나라 전체 경보 중 '모든 여행 자제'(가장 높음)인지 */
  allTravel?: boolean
  /** 경보 원문에 적힌 위험 요인 (한국어 이름) */
  riskNames?: string[]
  /** 경보는 없지만 전쟁·납치·취업 사기가 언급됨 (위험도 1) */
  mentionedRisk?: boolean
  /** 0~100 (좋은 시기 지수의 날씨 점수), 모르면 null */
  weatherScore: number | null
  weatherNote?: string
  /** 0~100 (공휴일이 많을수록 낮음), 모르면 null */
  holidayScore: number | null
  holidayNote?: string
}

export interface Verdict {
  level: VerdictLevel
  title: string
  reasons: string[]
  /** 안전 정보를 직접 확인해야 하는지 */
  checkSafety: boolean
}

const TITLE: Record<VerdictLevel, string> = { recommend: '추천', normal: '보통', caution: '신중', avoid: '비추천' }

export function travelVerdict(v: VerdictInput): Verdict {
  const reasons: string[] = []
  let level: VerdictLevel = 'recommend'
  const down = (to: VerdictLevel) => {
    const order: VerdictLevel[] = ['recommend', 'normal', 'caution', 'avoid']
    if (order.indexOf(to) > order.indexOf(level)) level = to
  }

  // 1) 안전
  if (v.safety === 'whole') {
    down('avoid')
    reasons.push(v.allTravel ? '나라 전체에 "모든 여행을 자제하라"는 경보가 있어요' : '나라 전체에 "꼭 필요한 경우가 아니면 가지 말라"는 경보가 있어요')
  } else if (v.safety === 'parts') {
    down('caution')
    reasons.push('일부 지역(주로 국경·분쟁 지역)에 여행 자제 경보가 있어요. 가려는 도시가 포함되는지 확인하세요')
  } else if (v.safety === 'ok') {
    if (v.mentionedRisk) {
      down('normal')
      reasons.push('여행 자제 지역은 없지만 경보 원문에 위험 요인이 적혀 있어요')
    } else reasons.push('영국 외무부 기준 여행 자제 지역이 없어요')
  } else {
    down('normal')
    reasons.push(v.safety === 'na' ? '이 나라는 영국 외무부 경보 대상이 아니라 외교부에서 직접 확인해야 해요' : '여행 경보를 확인하지 못했어요')
  }

  if (v.riskNames?.length) reasons.push(`경보 원문의 위험 요인: ${v.riskNames.join(', ')}`)
  if (v.riskNames?.includes('전쟁·무력 충돌')) {
    down('caution')
    reasons.push('전쟁·무력 충돌이 적힌 나라는 한국 외교부가 더 높은 단계(전 지역 여행금지 등)로 정하기도 해요. 꼭 확인하세요')
  }

  // 2) 날씨
  if (v.weatherScore != null) {
    if (v.weatherScore < 45) {
      down('normal')
      reasons.push(`날씨가 아쉬워요${v.weatherNote ? ` (${v.weatherNote})` : ''}`)
    } else if (v.weatherScore >= 70) reasons.push(`날씨가 좋아요${v.weatherNote ? ` (${v.weatherNote})` : ''}`)
    else if (v.weatherNote) reasons.push(`날씨는 무난해요 (${v.weatherNote})`)
  }

  // 3) 공휴일 혼잡
  if (v.holidayScore != null && v.holidayScore < 60) {
    down('normal')
    reasons.push(`공휴일이 겹쳐 붐비거나 문을 닫는 곳이 있을 수 있어요${v.holidayNote ? ` (${v.holidayNote})` : ''}`)
  }

  return { level, title: TITLE[level], reasons, checkSafety: v.safety !== 'ok' }
}
