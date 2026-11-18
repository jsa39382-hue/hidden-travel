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
