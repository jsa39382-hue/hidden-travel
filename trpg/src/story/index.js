// 모든 이야기 노드를 하나로 모은다
import act1 from './act1.js';
import forest from './act2_forest.js';
import mine from './act2_mine.js';
import capital from './act2_capital.js';
import finale from './act3_finale.js';

export const NODES = { ...act1, ...forest, ...mine, ...capital, ...finale };

export const ENDINGS = [
  { id: 'free', title: '모두의 새벽', hint: '모든 이의 손을 잡을 것' },
  { id: 'king', title: '새벽의 왕', hint: '왕관을 머리에' },
  { id: 'sacrifice', title: '장막이 된 별', hint: '스스로를 내어 줄 것' },
  { id: 'circle', title: '숲의 맹약', hint: '숲과 깊은 맹세를' },
  { id: 'republic', title: '그림자 공화국', hint: '잿빛 손과 함께' },
  { id: 'dark', title: '잿빛 군주', hint: '대마법사의 손을' },
  { id: 'void', title: '공허의 메아리', hint: '마지막 싸움에서 지면' },
  { id: 'wanderer', title: '이름 없는 방랑자', hint: '남쪽 바다로' },
  { id: 'witch', title: '평범한 사람', hint: '늪의 마녀와 거래를' },
  { id: 'death', title: '쓰러진 별', hint: '모험 중에 쓰러지면' },
];
