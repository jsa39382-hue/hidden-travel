// 나라별 팁·생활 정보 데이터 (약 80KB). 첫 화면을 가볍게 하려고 survival.ts와 나눠 필요할 때 불러온다.
import tipsRaw from '../data/tips.json'
import factsRaw from '../data/country-facts.json'
import type { Facts, Tip } from './survival'

export const TIPS = tipsRaw as unknown as Record<string, Tip>
export const FACTS = factsRaw as unknown as Record<string, Facts>
