import type { DayWeather } from './weather'
import { FACTS, TIPS } from './survival'

export interface PackItem {
  id: string
  label: string
  why?: string
  group: '필수' | '옷' | '전자기기' | '생활' | '아이'
}

/** 날씨·일수·인원·나라 정보로 짐 목록을 만든다 */
export function makePackingList(opts: { countryCode: string; days: number; people: number; kids: number; weather: DayWeather[] }): PackItem[] {
  const { countryCode, days, people, kids, weather } = opts
  const f = FACTS[countryCode] ?? {}
  const tip = TIPS[countryCode]
  const items: PackItem[] = []
  const add = (group: PackItem['group'], id: string, label: string, why?: string) => items.push({ group, id, label, why })

  add('필수', 'passport', '여권', '남은 기간 6개월 이상인지 확인')
  if (tip?.entry) add('필수', 'eta', '전자여행허가 승인 내역', tip.entry)
  add('필수', 'ticket', '항공권·숙소 예약 확인서')
  add('필수', 'card', '해외 결제 카드 2장 이상', '한 장이 막힐 때를 대비')
  if (tip && /현금/.test(tip.payment)) add('필수', 'cash', '현지 현금 조금', tip.payment)
  add('필수', 'insurance', '여행자 보험 가입 확인')

  const valid = weather.filter((d) => d.max != null && d.min != null)
  const minT = valid.length ? Math.min(...valid.map((d) => d.min!)) : null
  const maxT = valid.length ? Math.max(...valid.map((d) => d.max!)) : null
  const rainy = weather.filter((d) => (d.rainProb ?? 0) >= 50).length
  const sets = Math.min(days, 7)
  add('옷', 'clothes', `갈아입을 옷 ${sets}벌`, days > 7 ? '일주일이 넘으면 현지에서 세탁' : undefined)
  add('옷', 'underwear', `속옷·양말 ${sets + 1}벌`)
  if (minT != null && minT <= 5) add('옷', 'coat', '두꺼운 외투·장갑·목도리', `최저 ${Math.round(minT)}°`)
  else if (minT != null && minT <= 14) add('옷', 'jacket', '가벼운 겉옷', `아침저녁 ${Math.round(minT)}°`)
  if (maxT != null && maxT >= 27) {
    add('옷', 'summer', '반팔·통풍 잘 되는 옷', `낮 최고 ${Math.round(maxT)}°`)
    add('생활', 'sunscreen', '자외선 차단제·모자·선글라스')
  }
  if (rainy) add('생활', 'umbrella', '접이식 우산·방수 신발', `비 올 확률 높은 날 ${rainy}일`)
  add('옷', 'shoes', '오래 걸어도 편한 신발')

  add('전자기기', 'phone', '휴대폰 충전기·보조배터리', '보조배터리는 기내에만 가지고 탈 수 있어요')
  if (f.plugs?.length && !f.plugs.some((p) => p === 'C' || p === 'F' || p === 'E')) add('전자기기', 'adapter', `${f.plugs.join('·')}형 변환 어댑터`, '한국 플러그가 맞지 않아요')
  if (f.voltage && f.voltage < 200) add('전자기기', 'voltage', '100~240V 겸용인지 충전기 확인', `현지 전압 ${f.voltage}V`)
  add('전자기기', 'esim', 'eSIM·유심 또는 로밍 준비')

  add('생활', 'meds', '상비약 (소화제·진통제·밴드)')
  add('생활', 'toiletry', '세면도구·화장품 (액체는 기내 100ml 이하)')
  if (people > 1) add('생활', 'share', '함께 쓸 물건 나누기 (충전기·드라이기 등)', `${people}명`)
  if (kids) {
    add('아이', 'kidmeds', '아이 상비약·체온계')
    add('아이', 'snack', '간식·물티슈·여벌 옷')
    add('아이', 'stroller', '휴대용 유모차·아기띠', '공항에서 탑승 직전까지 쓸 수 있어요')
  }
  return items
}
