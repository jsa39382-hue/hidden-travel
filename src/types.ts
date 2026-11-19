export interface Country {
  code: string
  nameKo: string
  nameEn: string
  capitalKo: string | null
  capitalEn: string | null
  /** 수도(없으면 국가 중심) 좌표 [위도, 경도] */
  latlng: [number, number]
  countryLatlng: [number, number] | null
  currency: string
  currencyNameKo: string | null
}

export interface TripDates {
  start: string // YYYY-MM-DD
  end: string
}

/** 숨은 명소·숙소 검색, 물가 보정, 날씨의 기준이 되는 도시·지역 */
export interface Place {
  name: string
  lat: number
  lng: number
  /** 나라 평균 물가 대비 보정값 (1.0 = 평균) */
  factor: number
  source: 'curated' | 'wikidata' | 'capital' | 'search' | 'gps'
  /** 검색 결과일 때 가까운 기준 도시 */
  near?: string
}
