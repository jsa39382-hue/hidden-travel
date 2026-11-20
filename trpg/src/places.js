// 장소 정의: 3D 장면 종류(base), 분위기(mode), 시작 위치, 표식 위치
// 좌표는 [x, z]. 플레이어는 y=0 평면 위를 걷는다.
export const PLACES = {
  village_night: { name: '가시골 · 밤', base: 'village', mode: 'night', spawn: [13, 11] },
  village: { name: '가시골', base: 'village', mode: 'day', spawn: [0, 5] },
  village_raid: { name: '가시골 · 습격', base: 'village', mode: 'raid', spawn: [0, 6] },
  crossroads: { name: '세 갈래 길', base: 'crossroads', spawn: [0, 5] },
  forest: { name: '속삭이는 숲', base: 'forest', spawn: [0, 11] },
  forest_heart: { name: '늙은 뿌리', base: 'forest_heart', spawn: [0, 9] },
  mine: { name: '잿불 요새', base: 'mine', spawn: [0, 9] },
  mine_forge: { name: '대용광로', base: 'mine_forge', spawn: [0, 10] },
  capital: { name: '은빛성', base: 'capital', mode: 'day', spawn: [0, 11] },
  capital_night: { name: '은빛성 · 밤', base: 'capital', mode: 'night', spawn: [0, 11] },
  throne: { name: '왕좌의 방', base: 'hall', mode: 'throne', spawn: [0, 7] },
  cathedral: { name: '대성당', base: 'hall', mode: 'cathedral', spawn: [0, 7] },
  vault: { name: '대성당 금고', base: 'hall', mode: 'vault', spawn: [0, 6] },
  dungeon: { name: '지하 감옥', base: 'hall', mode: 'dungeon', spawn: [0, 5] },
  hideout: { name: '잿빛 손 은신처', base: 'hall', mode: 'hideout', spawn: [0, 6] },
  tavern: { name: '은빛 잔', base: 'hall', mode: 'tavern', spawn: [0, 6] },
  swamp: { name: '안개 늪', base: 'swamp', spawn: [0, 11] },
  tower: { name: '검은 탑', base: 'tower', spawn: [0, 13] },
  tower_inner: { name: '탑의 내부', base: 'tower_inner', spawn: [0, 6] },
  tower_top: { name: '탑의 꼭대기', base: 'tower_top', spawn: [0, 7] },
  void: { name: '공허의 문', base: 'void', spawn: [0, 5] },
};

// 장면 종류별 표식 위치
export const LANDMARKS = {
  village: {
    well: [0, 0],
    elder: [-9, -5],
    inn: [9, -6],
    temple: [0, -13],
    smithy: [-11, 6],
    market: [9, 6],
    gate: [0, 15],
    crater: [15, 13],
  },
  crossroads: {
    camp: [0, 0],
    east: [15, 0],
    west: [-15, 0],
    north: [0, -15],
    south: [0, 14],
    shrine: [-8, 8],
    tower: [9, -12],
  },
  forest: { path: [0, -6], hollowtree: [-10, 1], spring: [10, -9] },
  forest_heart: { heart: [0, -6] },
  mine: { hall: [0, -9], tunnel: [-11, 0], gate: [0, 12] },
  mine_forge: { forge: [0, -6] },
  capital: { castle: [0, -15], slums: [-13, 5], tavern: [12, 5], cathedral: [12, -9], gate: [0, 15], plaza: [0, 0] },
  hall: { center: [0, -5] },
  swamp: { hut: [0, -9], bog: [10, 2] },
  tower: { gate: [0, -5] },
  tower_inner: { center: [0, -3] },
  tower_top: { altar: [0, -4] },
  void: { center: [0, -4] },
};

export const placeBase = (loc) => PLACES[loc]?.base;
