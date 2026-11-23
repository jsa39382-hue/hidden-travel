import raw from '../data/risks.json'

/** 잘 알려진 나라별 주의사항 (직접 정리, 공식 경보 아님) */
export interface KnownRisk {
  label: string
  note: string
}
const file = raw as unknown as { countries?: Record<string, KnownRisk[]> }
export const knownRisks = (code: string): KnownRisk[] => file.countries?.[code] ?? []
