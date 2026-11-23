/** FCDO 'warnings-and-insurance' 본문(HTML)에서 '여행 자제 지역' 부분만 글자로 뽑는다 (최대 900자) */
export function extractAreas(html: string): string | null {
  const text = html
    .replace(/<\/(p|li|h\d)>/g, '\n')
    .replace(/<li[^>]*>/g, '· ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
  const start = text.search(/Areas where\s+FCDO\s+advises against/i)
  if (start < 0) return null
  let body = text.slice(start)
  const end = body.search(/Find out more about\s+why/i)
  if (end > 0) body = body.slice(0, end)
  body = body
    .replace(/^Areas where\s+FCDO\s+advises against travel\s*/i, '')
    .replace(/Your travel insurance could be invalidated[^\n]*\n?/gi, '')
    .trim()
  return body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, '') + ' …' : body
}

/** 경보 원문에서 찾는 위험 요인 (영국 외무부 문장 그대로의 표현으로, 단어 단위로 찾는다) */
export const RISK_FLAGS = [
  { id: 'conflict', label: '전쟁·무력 충돌', re: /\b(invasion|armed conflict|military conflict|hostilities|airstrikes?|ongoing conflict|active conflict|fighting (has|is|took|occurred))\b/i },
  { id: 'missile', label: '미사일·드론 위협', re: /\b(missiles?|drone attacks?|rocket (fire|attacks?)|artillery)\b/i },
  { id: 'terror-high', label: '테러 위험 매우 높음', re: /terrorists are very likely to try/i },
  { id: 'kidnap', label: '납치', re: /\bkidnap/i },
  { id: 'scam-job', label: '취업 사기·감금', re: /\b(scam (centres?|centers?|compounds?)|fraudulent (job|employment)|job scams?|fake job|human trafficking|forced to work|forced labour)\b/i },
  { id: 'mines', label: '지뢰·불발탄', re: /\b(landmines?|unexploded (ordnance|weapons|bombs?|munitions))\b/i },
  { id: 'crime', label: '강력 범죄', re: /\b(violent crime|armed robbery|carjackings?|gang violence)\b/i },
  { id: 'unrest', label: '정정 불안', re: /\b(civil unrest|political unrest|state of emergency|coup|curfew)\b/i },
] as const
export type RiskFlag = (typeof RISK_FLAGS)[number]['id']

/** HTML → 글자 */
export function htmlText(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ')
}

export function riskFlags(text: string): RiskFlag[] {
  return RISK_FLAGS.filter((f) => f.re.test(text)).map((f) => f.id)
}

/**
 * 위험도 0~4 (외교부 여행경보 1~4단계와 비슷한 눈높이, 근거는 영국 외무부)
 * 4 나라 전체 '모든 여행 자제' · 3 나라 전체 '꼭 필요한 경우 외 자제' · 2 일부 지역 경보 · 1 경보는 없지만 전쟁·납치·취업 사기 언급 · 0 없음
 */
export function riskLevel(status: string[], flags: RiskFlag[]): 0 | 1 | 2 | 3 | 4 {
  if (status.includes('avoid_all_travel_to_whole_country')) return 4
  if (status.includes('avoid_all_but_essential_travel_to_whole_country')) return 3
  if (status.some((s) => s.endsWith('_to_parts'))) return 2
  if (flags.some((f) => f === 'conflict' || f === 'kidnap' || f === 'scam-job')) return 1
  return 0
}

export const RISK_LABEL = ['경보 없음', '주의', '일부 지역 위험', '출국 권고급', '여행 금지급'] as const
