// 게임 규칙 데이터: 직업, 출신, 아이템, 동료, 적, 등장인물 외형
// three.js에 의존하지 않으므로 검증 스크립트(node)에서도 불러올 수 있다.

export const STAT_NAMES = { str: '힘', dex: '민첩', int: '지능', cha: '매력' };

export const REP_NAMES = {
  order: '은빛 기사단',
  circle: '푸른 원환',
  hand: '잿빛 손',
  dwarf: '잿불 드워프',
};

export const ALLY_FLAGS = ['order_ally', 'circle_ally', 'hand_ally', 'dwarf_ally'];

export const SHARD_NAMES = {
  verdant: '초록 조각',
  ember: '잿불 조각',
  silver: '은빛 조각',
};

export const CLASSES = {
  warrior: {
    name: '전사',
    tagline: '앞에 서서 막아 내는 사람',
    desc: '두꺼운 체력과 강한 일격. 힘 판정과 정면 돌파에 강합니다.',
    stats: { str: 3, dex: 1, int: 0, cha: 1 },
    hp: 32,
    gold: 15,
    atk: 'str',
    dmg: [3, 8],
    items: { potion: 1 },
    skill: { name: '강타', desc: '반드시 명중하는 두 배 피해' },
    look: { cloth: 0x7a2e2e, cloth2: 0x8c8f96, hat: 'helmet', weapon: 'sword', cape: 0x5a1e1e },
  },
  rogue: {
    name: '도적',
    tagline: '그림자 속을 걷는 사람',
    desc: '날렵한 몸놀림과 손재주. 잠입, 자물쇠, 도주에 강합니다.',
    stats: { str: 1, dex: 3, int: 1, cha: 1 },
    hp: 25,
    gold: 30,
    atk: 'dex',
    dmg: [2, 7],
    items: { potion: 1, lockpick: 1 },
    skill: { name: '급소 찌르기', desc: '명중하면 세 배 피해' },
    look: { cloth: 0x2f4a36, cloth2: 0x2a2a2a, hat: 'hood', weapon: 'dagger', cape: 0x1f2f24 },
  },
  mage: {
    name: '마법사',
    tagline: '세계의 법칙을 읽는 사람',
    desc: '몸은 약하지만 지식과 마법이 깊습니다. 지능 판정과 화염구.',
    stats: { str: 0, dex: 1, int: 3, cha: 1 },
    hp: 21,
    gold: 20,
    atk: 'int',
    dmg: [3, 7],
    items: { potion: 2 },
    skill: { name: '화염구', desc: '반드시 맞는 큰 화염 피해' },
    look: { cloth: 0x2c3e7a, cloth2: 0x1d2850, hat: 'wizard', weapon: 'staff', robe: true },
  },
  cleric: {
    name: '성직자',
    tagline: '빛을 나누어 주는 사람',
    desc: '치유와 설득에 능합니다. 매력 판정과 성스러운 빛.',
    stats: { str: 1, dex: 0, int: 2, cha: 2 },
    hp: 27,
    gold: 20,
    atk: 'str',
    dmg: [2, 7],
    items: { potion: 1, holy_water: 1 },
    skill: { name: '성스러운 빛', desc: '체력을 크게 회복하고 적을 그을림' },
    look: { cloth: 0xe6dfcc, cloth2: 0xb8963e, hat: 'hair', weapon: 'mace', robe: true },
  },
};

// 기억을 잃은 주인공이므로 '몸이 기억하는 것'으로 출신을 고른다.
export const BACKGROUNDS = {
  noble: { name: '몰락한 귀족', desc: '손이 곱고, 말씨가 단정합니다. 매력 +1, 금화 +25', stats: { cha: 1 }, gold: 25 },
  hunter: { name: '숲의 사냥꾼', desc: '발소리를 죽이는 법을 압니다. 민첩 +1, 횃불', stats: { dex: 1 }, gold: 0, items: { torch: 1 } },
  scholar: { name: '탑의 학자', desc: '낯선 글자가 눈에 익습니다. 지능 +1, 왕국 지도', stats: { int: 1 }, gold: 5, items: { map: 1 } },
  smith: { name: '대장간 견습생', desc: '손바닥에 굳은살이 있습니다. 힘 +1, 밧줄', stats: { str: 1 }, gold: 5, items: { rope: 1 } },
};

export const ITEMS = {
  potion: { name: '치유 물약', desc: '마시면 체력 12 회복', use: { heal: 12 }, combat: true },
  holy_water: { name: '성수', desc: '공허의 존재에게 던지면 큰 피해 (전투 중)', combat: true, dmg: 12 },
  torch: { name: '횃불', desc: '어둠을 밝힙니다' },
  rope: { name: '밧줄', desc: '튼튼한 삼베 밧줄' },
  map: { name: '왕국 지도', desc: '엘데란 왕국의 오래된 지도' },
  lockpick: { name: '자물쇠 따개', desc: '웬만한 자물쇠는 열 수 있습니다' },
  letter_harwin: { name: '하윈의 편지', desc: '숲의 정찰자 세렌에게 보내는 편지' },
  hand_token: { name: '잿빛 손 증표', desc: '재로 그린 손바닥 문양의 동전' },
  amulet: { name: '이솔의 부적', desc: '매력 +1. 은실로 엮은 별 모양 부적', bonus: { cha: 1 } },
  sword_fine: { name: '드워프 강철검', desc: '공격 명중 +1, 피해 +2', weapon: { hit: 1, dmg: 2 } },
  armor: { name: '가죽 갑옷', desc: '방어 +2', armor: 2 },
  elf_cloak: { name: '엘프 망토', desc: '민첩 +1. 숲의 빛을 머금은 망토', bonus: { dex: 1 } },
  root_seed: { name: '늙은 뿌리의 씨앗', desc: '고대 나무의 생명이 담긴 씨앗' },
  ember_blade: { name: '잿불 검', desc: '공격 명중 +2, 피해 +4. 칼날에 불씨가 흐릅니다', weapon: { hit: 2, dmg: 4 } },
  wood_star: { name: '나무 별', desc: '토미가 깎아 준 별. 행운이 깃들어 매력 +1', bonus: { cha: 1 } },
  varen_letter: { name: '바렌의 밀서', desc: '섭정과 모르베인이 나눈 편지. 결정적 증거' },
  witch_vial: { name: '마녀의 약병', desc: '별빛이 갇힌 작은 병. 언젠가 목숨을 대신합니다' },
  bog_lily: { name: '늪 백합', desc: '안개 늪에서만 피는 하얀 꽃' },
  silver_key: { name: '은빛 열쇠', desc: '대성당 금고의 열쇠' },
  dwarf_horn: { name: '둔가르의 뿔피리', desc: '불면 잿불 드워프가 달려옵니다' },
  elf_arrow: { name: '원환의 화살', desc: '불면 푸른 원환의 궁수들이 옵니다' },
  kael_dagger: { name: '카엘의 단검', desc: '민첩 +1. 잿빛 손의 맹세가 새겨진 단검', bonus: { dex: 1 } },
  order_badge: { name: '기사단 휘장', desc: '은빛 기사단이 인정한 동지의 표식' },
  ale: { name: '드워프 흑맥주', desc: '마시면 체력 5 회복', use: { heal: 5 } },
};

export const COMPANIONS = {
  bran: { name: '브란', bonus: 'str', desc: '추방당한 드워프 대장장이. 힘 판정 +2, 전투 피해 +1' },
  finn: { name: '핀', bonus: 'dex', desc: '손버릇 나쁜 하플링. 민첩 판정 +2, 전투 피해 +1' },
  seren: { name: '세렌', bonus: 'int', desc: '푸른 원환의 엘프 정찰자. 지능 판정 +2, 전투 피해 +1' },
};

// 적: hp, ac(방어), atk(명중 보정), dmg(피해 범위), hollow(성수가 통하는지)
export const ENEMIES = {
  wolf: { name: '공허 늑대', hp: 13, ac: 11, atk: 3, dmg: [2, 5], model: 'wolf', hollow: true },
  wolf_pack: { name: '공허 늑대 무리', hp: 22, ac: 11, atk: 4, dmg: [2, 6], model: 'wolf', count: 3, hollow: true },
  hollow: { name: '공허의 그림자', hp: 16, ac: 12, atk: 4, dmg: [3, 6], model: 'wraith', hollow: true },
  hollow_horde: { name: '공허의 무리', hp: 26, ac: 12, atk: 4, dmg: [3, 7], model: 'wraith', count: 3, hollow: true },
  spider: { name: '썩은 숲 거미', hp: 15, ac: 12, atk: 4, dmg: [2, 6], model: 'spider', hollow: true },
  spider_queen: { name: '부패의 여왕 거미', hp: 34, ac: 13, atk: 5, dmg: [3, 8], model: 'spider', scale: 1.9, hollow: true },
  elf_guard: { name: '원환의 궁수', hp: 18, ac: 13, atk: 5, dmg: [3, 6], model: 'humanoid', look: { cloth: 0x3d6b45, ears: true, hat: 'hair', hairColor: 0xcfd6c8, weapon: 'bow' } },
  goblin: { name: '공허에 홀린 고블린 떼', hp: 18, ac: 11, atk: 3, dmg: [2, 6], model: 'humanoid', count: 3, look: { skin: 0x6f8a3a, cloth: 0x4a3a2a, scale: 0.6, weapon: 'dagger', ears: true } },
  golem: { name: '광산 골렘', hp: 28, ac: 13, atk: 4, dmg: [4, 8], model: 'golem' },
  warden: { name: '잿불 수호자', hp: 42, ac: 14, atk: 6, dmg: [4, 9], model: 'golem', scale: 1.6, hollow: true },
  selka: { name: '마법사 셀카', hp: 26, ac: 13, atk: 6, dmg: [4, 8], model: 'humanoid', look: { cloth: 0x6b1f2a, robe: true, hat: 'hair', hairColor: 0x111111, weapon: 'staff', orb: 0xff5544 } },
  thug: { name: '뒷골목 패거리', hp: 18, ac: 11, atk: 3, dmg: [2, 6], model: 'humanoid', count: 2, look: { cloth: 0x4b4038, hat: 'hood', weapon: 'dagger' } },
  knight: { name: '은빛 기사', hp: 24, ac: 15, atk: 5, dmg: [3, 7], model: 'humanoid', look: { cloth: 0x9aa3ad, cloth2: 0x2f4f8a, hat: 'helmet', weapon: 'sword', cape: 0x2f4f8a } },
  aldric: { name: '알드릭 단장', hp: 34, ac: 16, atk: 6, dmg: [4, 8], model: 'humanoid', look: { cloth: 0xc9ced6, cloth2: 0x2f4f8a, hat: 'helmet', weapon: 'sword', cape: 0x1f3f8a, scale: 1.1 } },
  varen: { name: '공허에 물든 섭정 바렌', hp: 38, ac: 14, atk: 6, dmg: [4, 9], model: 'humanoid', hollow: true, look: { cloth: 0x3a1f4a, cloth2: 0x111111, hat: 'crown', cape: 0x6b1020, weapon: 'sword', aura: 0x8a3cff, scale: 1.1 } },
  bog: { name: '늪의 괴물', hp: 24, ac: 12, atk: 4, dmg: [3, 7], model: 'golem', tint: 0x3f5a35 },
  hollow_knight: { name: '공허의 기사', hp: 30, ac: 14, atk: 5, dmg: [4, 8], model: 'humanoid', hollow: true, look: { cloth: 0x1a1a22, cloth2: 0x2a0f3a, hat: 'helmet', weapon: 'sword', cape: 0x2a0f3a, aura: 0x8a3cff, eyes: 0xb07cff } },
  morvain: { name: '대마법사 모르베인', hp: 52, ac: 15, atk: 7, dmg: [5, 10], model: 'humanoid', hollow: true, boss: true, look: { cloth: 0x3b1858, cloth2: 0x1a0a28, robe: true, hat: 'wizard', weapon: 'staff', orb: 0xb46cff, aura: 0xb46cff, scale: 1.25, hairColor: 0xd8d8d8, beard: true } },
  void_avatar: { name: '공허의 화신', hp: 40, ac: 14, atk: 6, dmg: [5, 9], model: 'wraith', scale: 2.4, hollow: true, boss: true },
};

// 등장인물 외형 (models.js의 humanoid 옵션)
export const ACTORS = {
  elder: { name: '촌장 하윈', look: { cloth: 0x6b5b3e, hairColor: 0xe8e8e8, hat: 'hair', beard: true, weapon: 'staff', orb: 0x9fd0ff } },
  bran: { name: '브란', look: { cloth: 0x5a4030, cloth2: 0x3a2a20, hairColor: 0xb5482a, beard: true, hat: 'hair', weapon: 'hammer', scale: 0.82, wide: true } },
  margo: { name: '마고', look: { cloth: 0x8a5a3a, cloth2: 0xdedad0, hairColor: 0x7a4a2a, hat: 'hair', robe: true } },
  isol: { name: '사제 이솔', look: { cloth: 0xefe9da, cloth2: 0xb8963e, hairColor: 0x2a1a12, hat: 'hood', robe: true, weapon: 'staff', orb: 0xfff2b0 } },
  finn: { name: '핀', look: { cloth: 0x4f6a2c, hat: 'hood', weapon: 'dagger', scale: 0.62, hairColor: 0x8a5a2a } },
  nyx: { name: '닉스', look: { cloth: 0x1f1f24, hat: 'hood', weapon: 'dagger', cape: 0x111111 } },
  villager: { name: '마을 사람들', look: { cloth: 0x7a6a4a, hat: 'hair', hairColor: 0x4a3a2a, weapon: 'torch' } },
  tomi: { name: '토미', look: { cloth: 0x9a6a3a, hat: 'hair', hairColor: 0xd8a85a, scale: 0.5 } },
  seren: { name: '세렌', look: { cloth: 0x3d6b45, cloth2: 0x2a4a30, ears: true, hat: 'hair', hairColor: 0xdfe6e8, weapon: 'bow', cape: 0x2a4a30 } },
  elowen: { name: '대드루이드 엘로웬', look: { cloth: 0x2f5a3a, robe: true, ears: true, hat: 'hair', hairColor: 0xf2f2f2, weapon: 'staff', orb: 0x7dffb0, scale: 1.08 } },
  dungar: { name: '둔가르 왕', look: { cloth: 0x5a2a20, cloth2: 0x8a6a2a, hairColor: 0x9a9a9a, beard: true, hat: 'crown', weapon: 'hammer', scale: 0.86, wide: true, cape: 0x6a1a1a } },
  durin: { name: '두린', look: { cloth: 0x4a5a6a, hairColor: 0x6a3a1a, beard: true, hat: 'hair', weapon: 'hammer', scale: 0.78, wide: true } },
  selka: { name: '셀카', look: ENEMIES.selka.look },
  aldric: { name: '알드릭 단장', look: ENEMIES.aldric.look },
  knight: { name: '은빛 기사', look: ENEMIES.knight.look },
  varen: { name: '섭정 바렌', look: { cloth: 0x3a1f4a, cloth2: 0x111111, hat: 'crown', cape: 0x6b1020, scale: 1.05, hairColor: 0x222222 } },
  kael: { name: '카엘', look: { cloth: 0x3a3a40, cloth2: 0x1a1a1a, hat: 'hair', hairColor: 0x111111, cape: 0x2a2a2a, weapon: 'dagger' } },
  priest: { name: '대주교 오스린', look: { cloth: 0xf5f1e6, cloth2: 0xd4af37, robe: true, hat: 'crown', weapon: 'staff', orb: 0xfff2b0, hairColor: 0xdddddd } },
  guard: { name: '성문 경비병', look: { cloth: 0x8a8f96, cloth2: 0x2f4f8a, hat: 'helmet', weapon: 'sword' } },
  orma: { name: '늪의 마녀 오르마', look: { cloth: 0x2a3a24, robe: true, hat: 'wizard', hairColor: 0x9a9a8a, weapon: 'staff', orb: 0x9aff6a, scale: 0.9 } },
  ollo: { name: '떠돌이 상인 올로', look: { cloth: 0xb8662a, cloth2: 0x6a3a1a, hat: 'wizard', hairColor: 0x6a4a2a, beard: true, scale: 0.95 } },
  morvain: { name: '대마법사 모르베인', look: ENEMIES.morvain.look },
};
