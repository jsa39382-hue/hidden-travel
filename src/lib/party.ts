/**
 * 인원·예산 스타일: 경비·교통·짐·추억 앨범이 함께 쓰는 설정 (한 곳에서 바꾸면 모든 탭에 바로 반영).
 * 저장 키는 예전 경비 탭과 같은 'hidden-travel:budget' (기존 값 그대로 이어 쓴다).
 */
import { useStored } from './stored'
import { TIERS, headcount, type Party, type PartyType, type Tier } from './budget'
import type { ExtraPrefs } from './extras'

export const PARTY_KEY = 'hidden-travel:budget'
export const PARTY_TYPES: { type: PartyType; label: string }[] = [
  { type: 'solo', label: '혼자' },
  { type: 'couple', label: '커플·2인' },
  { type: 'friends', label: '친구 3인 이상' },
  { type: 'family', label: '가족' },
]

export interface PartyPrefs {
  party: Party
  tier: Tier
  extras?: ExtraPrefs
}

export const DEFAULT_PARTY: PartyPrefs = { party: { type: 'couple', adults: 2, kids: 0 }, tier: 1 }

const valid = (v: unknown) => {
  const p = v as Partial<PartyPrefs> | null
  return !!p && PARTY_TYPES.some((t) => t.type === p.party?.type) && [0, 1, 2].includes(p.tier as number)
}

/** 인원·예산 스타일 (여러 화면에서 같이 바뀐다) */
export function usePartyPrefs() {
  return useStored<PartyPrefs>(PARTY_KEY, DEFAULT_PARTY, valid)
}

/** 저장된 값을 바로 읽기 (훅을 못 쓰는 계산용) */
export function readPartyPrefs(): PartyPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(PARTY_KEY) ?? 'null')
    if (valid(v)) return v as PartyPrefs
  } catch {
    /* 기본값 */
  }
  return DEFAULT_PARTY
}

/** "2명 · 보통", "어른 2·아이 1 · 알뜰" */
export function partyLabel(p: PartyPrefs) {
  const { adults, kids } = headcount(p.party)
  const who = kids ? `어른 ${adults}·아이 ${kids}` : `${adults}명`
  return `${who} · ${TIERS[p.tier].label}`
}

/** 좁은 화면용: "3명·알뜰" */
export function partyShort(p: PartyPrefs) {
  const { adults, kids } = headcount(p.party)
  return `${adults + kids}명·${TIERS[p.tier].label}`
}

/** 화면에서 쓰는 형태: 어른·아이 수와 스타일 */
export function partyNumbers(p: PartyPrefs) {
  const { adults, kids } = headcount(p.party)
  return { adults, kids, tier: p.tier }
}
