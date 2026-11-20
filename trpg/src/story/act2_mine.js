// 2막: 잿불 광산과 드워프 요새
export default {
  m_enter: {
    loc: 'mine',
    chapter: '2막 · 잿불 광산',
    t: `산허리를 깎아 만든 거대한 석문. 높이가 성벽만 하다. 문에는 드워프 룬이 빼곡히 새겨져 있고, 룬 사이사이로 희미한 불빛이 흐른다. 굳게 닫혀 있다.

문 아래 틈으로 뜨거운 바람이 새어 나온다. 쇠 냄새와 유황 냄새, 그리고 무언가 썩은 냄새.`,
    x: [[{ comp: 'bran' }, '브란이 석문을 올려다본다. 그의 턱이 굳어 있다. "십 년 만이군."']],
    c: [
      { t: '브란이 문 앞에 선다', req: { comp: 'bran' }, go: 'm_bran_gate' },
      { t: '룬을 해독해 여는 법을 찾는다', check: ['int', 13], ok: 'm_gate_open', no: 'm_gate_shock' },
      { t: '온 힘으로 문을 밀어젖힌다', check: ['str', 15], ok: 'm_gate_smash', no: 'm_gate_shock' },
      { t: '밧줄을 걸고 위쪽 환기구로 기어오른다', req: { item: 'rope' }, go: 'm_vent' },
      { t: '돌아간다', go: 'x_cross' },
    ],
  },
  m_gate_shock: {
    loc: 'mine',
    t: `룬이 갑자기 붉게 타오르며 불꽃이 튄다. 손바닥이 그을리고 당신은 뒤로 나가떨어진다. 드워프의 문은 무례한 손님을 반기지 않는다.`,
    fx: { hp: -4 },
    next: 'm_enter',
  },
  m_bran_gate: {
    loc: 'mine',
    who: ['bran'],
    sp: 'bran',
    t: `브란이 석문에 이마를 댄다. 그리고 낮은 목소리로 드워프 말을 읊조린다. 노래 같기도 하고, 기도 같기도 하다.

룬들이 하나씩 주황빛으로 켜지더니, 천 년 묵은 돌이 우르릉 소리를 내며 열린다. 안쪽에서 석궁을 든 드워프 경비들이 뛰쳐나왔다가, 브란을 보고 얼어붙는다.

"…브란 왕자님?"

"왕자는 무슨." 브란이 쓴웃음을 짓는다. "아버지께 전해라. 쫓겨난 아들이 손님을 데려왔다고."`,
    fx: { flag: 'bran_home', rep: { dwarf: 1 } },
    next: 'm_hall',
  },
  m_gate_open: {
    loc: 'mine',
    t: `룬의 순서가 보인다. 불, 망치, 산, 그리고 '손님'. 손님의 룬을 마지막으로 누르자 석문이 천천히 열린다.

석궁을 든 드워프 경비들이 당신을 둘러싼다. 그중 하나가 놀라서 중얼거린다. "외지인이 손님의 룬을 알다니."`,
    fx: { rep: { dwarf: 1 } },
    next: 'm_hall',
  },
  m_gate_smash: {
    loc: 'mine',
    t: `당신이 어깨로 문을 밀자 경첩이 비명을 지르며 문이 반쯤 열린다. 안쪽에서 석궁을 든 드워프들이 몰려든다. 표정이 험악하다.

"천 년 된 문을! 이 무례한 놈!"`,
    fx: { rep: { dwarf: -2 }, flag: 'dwarf_angry' },
    next: 'm_hall',
  },
  m_vent: {
    loc: 'mine',
    t: `밧줄을 타고 올라간 환기구는 좁고 뜨겁다. 그을음을 뒤집어쓴 채 한참을 기어가자, 아래쪽으로 광산 갱도가 보인다. 드워프들 눈에 띄지 않고 깊숙이 들어온 것이다.

어디선가 망치 소리와 누군가의 외침이 들린다. "버텨! 누가 올 거야!"`,
    fx: { flag: 'sneaked_in' },
    next: 'm_durin',
  },
  m_hall: {
    loc: 'mine',
    who: ['dungar'],
    sp: 'dungar',
    t: (s) =>
      s.flags.bran_home
        ? `거대한 홀. 기둥마다 용암이 흐르는 홈이 파여 있어 붉은 빛이 일렁인다. 돌 왕좌 위의 늙은 드워프가 일어선다. 그의 눈은 당신이 아니라 브란을 보고 있다.

"…네가 감히 이 문을 다시 넘느냐."`
        : `거대한 홀. 기둥마다 용암이 흐르는 홈이 파여 있어 붉은 빛이 일렁인다. 돌 왕좌 위에 회색 수염의 드워프가 앉아 있다. 머리에 쓴 무쇠 왕관이 무거워 보인다.

"나는 잿불 요새의 왕 둔가르다. 십 년 동안 이 문을 연 외지인은 없었다. 무슨 볼일이냐, 별에서 온 자여." 그는 이미 당신이 누군지 아는 눈치다.`,
    c: [
      { t: '브란과 둔가르 사이에 선다', req: { comp: 'bran' }, go: 'm_reunion', once: true },
      { t: '광산에 무슨 일이 있었는지 묻는다', go: 'm_hall_lore', once: true },
      { t: '"잿불 조각을 찾으러 왔습니다. 도와드리겠습니다."', go: 'm_quest', fx: { rep: { dwarf: 1 } } },
      { t: '"조각을 내주시면 공허를 막겠습니다."', check: ['cha', 14], ok: 'm_quest', okfx: { flag: 'dungar_promise' }, no: 'm_hall_angry' },
    ],
  },
  m_hall_lore: {
    loc: 'mine',
    who: ['dungar'],
    sp: 'dungar',
    t: `둔가르가 왕좌 팔걸이를 움켜쥔다.

"석 달 전, 붉은 로브의 여자 마법사가 왔다. 모르베인의 제자라더군. 거래를 하자고 했지. 거절하자 그 여자는 밤에 몰래 대용광로로 숨어들었다.

그날 이후 광산의 골렘들이 미쳐 날뛰기 시작했다. 용광로를 지키던 '잿불 수호자'까지 보랏빛 눈을 하고 우리를 공격했지. 내 아들 두린이 광부들을 이끌고 내려갔다가… 돌아오지 않았다."

그의 목소리가 처음으로 갈라진다.`,
    fx: { flag: 'know_selka', journal: '모르베인의 제자인 붉은 로브의 마법사가 대용광로에 숨어들었다. 둔가르의 아들 두린이 실종되었다.' },
    next: 'm_hall',
  },
  m_hall_angry: {
    loc: 'mine',
    who: ['dungar'],
    sp: 'dungar',
    t: `"내놓으라고?" 둔가르가 왕좌에서 벌떡 일어선다. "드워프에게서 무언가를 '내놓으라'는 자는 대개 그 말을 끝으로 입을 다물게 되지.

…하지만 지금은 칼 한 자루가 아쉽다. 두린을 데려오면, 그때 이야기하자."`,
    fx: { rep: { dwarf: -1 } },
    next: 'm_quest',
  },
  m_reunion: {
    loc: 'mine',
    who: ['dungar', 'bran'],
    sp: 'bran',
    t: `브란이 한 걸음 앞으로 나선다. "아버지."

둔가르가 대답하지 않는다. 홀의 모든 드워프가 숨을 죽인다.

"열두 명이었습니다. 그날 제가 문을 열어 데리고 나온 광부가 열두 명이에요. 그중 셋이 지금 이 홀에 서 있습니다." 브란의 목소리가 떨린다. "저는 그 일을 후회하지 않습니다."

둔가르의 손이 왕좌 팔걸이 위에서 하얗게 질린다. 당신이 무언가 말해야 할 것 같다.`,
    c: [
      { t: '"브란은 옳은 일을 했습니다. 지금도 두린을 구하러 왔어요."', check: ['cha', 12], ok: 'm_reunion_ok', no: 'm_reunion_cold' },
      { t: '아무 말 없이 브란의 어깨에 손을 얹는다', go: 'm_reunion_cold' },
    ],
  },
  m_reunion_ok: {
    loc: 'mine',
    who: ['dungar', 'bran'],
    sp: 'dungar',
    t: `긴 침묵 끝에, 둔가르가 왕좌에서 내려온다. 그리고 브란 앞에 선다. 아들보다 머리 하나가 작은 늙은 왕이다.

"…그날 문을 잠그라고 한 건 나다. 열여덟 명이 그 아래서 죽었다. 나는 십 년 동안 매일 밤 그 이름들을 셌다." 그가 브란의 팔을 붙잡는다. "네가 건진 열두 명의 이름도."

브란이 무너지듯 아버지를 끌어안는다. 홀 안의 드워프들이 방패를 두드린다.`,
    fx: { flag: 'bran_forgiven', rep: { dwarf: 2 }, journal: '브란과 둔가르 왕이 화해했다.' },
    next: 'm_hall',
  },
  m_reunion_cold: {
    loc: 'mine',
    who: ['dungar', 'bran'],
    sp: 'dungar',
    t: `둔가르가 고개를 돌린다. "추방은 왕의 말이다. 왕의 말은 돌에 새겨진다." 그가 갱도 쪽을 가리킨다. "하지만 네 동생을 데려온다면… 그 돌을 다시 읽어 보마."

브란이 이를 악문다. "그거면 됩니다."`,
    next: 'm_hall',
  },
  m_quest: {
    loc: 'mine',
    who: ['dungar'],
    sp: 'dungar',
    t: `둔가르가 지도를 펼친다. "대용광로는 광산 가장 깊은 곳에 있다. 거기 가려면 두린이 사라진 서쪽 갱도를 지나야 한다. 골렘들이 우글거리지.

두린을 찾으면 데려와 다오. 조각 이야기는 그다음이다."`,
    next: 'm_tunnels',
    nextLabel: '갱도로 내려간다',
  },
  m_tunnels: {
    loc: 'mine',
    t: `갱도는 칠흑같이 어둡다. 벽의 용암 홈도 여기선 식어 버렸다. 레일 위에 버려진 광차가 뒤집혀 있고, 바닥에는 무언가 긁고 지나간 자국이 있다.

어둠 속에서 작은 발소리들이 사방으로 흩어진다.`,
    c: [
      { t: '횃불을 밝힌다', req: { item: 'torch' }, go: 'm_lit', at: 'tunnel' },
      { t: '소리에 귀를 기울인다', check: ['int', 12], ok: 'm_hear', no: 'm_goblins' },
      { t: '어둠 속을 더듬어 나아간다', go: 'm_goblins' },
    ],
  },
  m_lit: {
    loc: 'mine',
    t: `횃불이 켜지자 벽에 붙어 있던 작은 그림자들이 비명을 지르며 달아난다. 공허에 홀린 고블린들이다. 빛을 싫어하는 모양이다.

바닥의 긁힌 자국이 더 선명하게 보인다. 무거운 무언가를 끌고 간 흔적. 그리고 그 옆에 드워프 장화 자국.`,
    next: 'm_durin',
  },
  m_hear: {
    loc: 'mine',
    t: `발소리 사이로 다른 소리가 들린다. 멀리서 돌을 두드리는 소리. 규칙적이다. 탕, 탕탕, 탕. 드워프의 구조 신호다.

당신은 고블린들이 우글거리는 쪽을 피해 신호를 따라간다.`,
    fx: { flag: 'heard_signal' },
    next: 'm_durin',
  },
  m_goblins: {
    loc: 'mine',
    t: `어둠 속에서 누런 눈들이 켜진다. 키가 무릎까지 오는 고블린들이 녹슨 칼을 들고 킬킬거린다. 눈동자가 보랏빛으로 물들어 있다.`,
    combat: { e: 'goblin', win: 'm_goblins_win', lose: 'm_goblins_lose', flee: 'm_durin' },
  },
  m_goblins_win: {
    loc: 'mine',
    t: `고블린들이 흩어진다. 그중 하나가 떨어뜨린 주머니에서 금화가 쏟아진다. 드워프에게서 훔친 것이리라.`,
    fx: { gold: 15 },
    next: 'm_durin',
  },
  m_goblins_lose: {
    loc: 'mine',
    t: `고블린들이 당신을 짓밟고 주머니를 털어 달아난다. 비틀거리며 일어나니 금화가 반쯤 사라졌다.`,
    fx: { hp: 6, gold: -15 },
    next: 'm_durin',
  },
  m_durin: {
    loc: 'mine',
    who: ['durin'],
    sp: 'durin',
    t: `갱도가 무너져 길이 막혀 있다. 무너진 바위 틈 사이로 드워프 몇의 얼굴이 보인다. 맨 앞의 젊은 드워프가 외친다.

"거기 누구요? 나는 두린! 광부 넷이 함께 있소!"

그리고 등 뒤에서 땅이 울린다. 쿵. 쿵. 바위로 이루어진 거인이 갱도를 꽉 채우며 다가온다. 눈이 보랏빛으로 타오른다.`,
    x: [[{ comp: 'bran' }, '브란이 외친다. "두린!" 바위 너머에서 대답이 돌아온다. "형…? 형이야?"']],
    c: [
      { t: '골렘이 오기 전에 바위를 치운다', check: ['str', 14], ok: 'm_durin_saved', no: 'm_golem_fight' },
      { t: '돌아서서 골렘을 막는다', go: 'm_golem_fight' },
      { t: '브란이 무너진 들보를 어깨로 받친다', req: { comp: 'bran' }, go: 'm_bran_hold' },
    ],
  },
  m_golem_fight: {
    loc: 'mine',
    who: ['durin'],
    t: `골렘이 주먹을 치켜든다. 갱도 천장에서 돌가루가 쏟아진다.`,
    combat: { e: 'golem', win: 'm_durin_saved', lose: 'm_durin_lost' },
  },
  m_bran_hold: {
    loc: 'mine',
    who: ['bran', 'durin'],
    sp: 'bran',
    t: `브란이 무너진 들보 아래로 파고들어 어깨로 들어 올린다. 바위가 움직이며 틈이 벌어진다. 광부들이 하나둘 기어 나온다.

그러나 골렘이 다가오고, 천장 전체가 신음한다. 브란의 무릎이 떨린다.

"두린 데리고 가! 어서!" 브란이 이를 악문다. "별똥별, 가라고!"`,
    c: [
      { t: '브란 옆에 붙어 함께 들보를 받친다', check: ['str', 13], ok: 'm_bran_both', no: 'm_bran_fall' },
      { t: '별빛으로 천장을 붙든다', req: { flag: 'star_awake' }, go: 'm_bran_both', fx: { hp: -6 } },
      { t: '브란의 말대로 광부들을 데리고 달린다', go: 'm_bran_fall' },
    ],
  },
  m_bran_both: {
    loc: 'mine',
    who: ['bran', 'durin'],
    sp: 'bran',
    t: `당신이 들보 아래로 뛰어든다. 무게가 반으로 나뉜다. 마지막 광부가 빠져나가는 순간 둘이 동시에 몸을 날린다. 등 뒤로 천장이 무너져 내리며 골렘을 덮친다.

먼지 속에서 브란이 기침을 하며 웃는다. "미친놈. 고맙다."

두린이 형을 끌어안는다. "형! 형이 올 줄 알았어!"`,
    fx: { flag: ['durin_saved', 'golem_buried'], rep: { dwarf: 2 }, journal: '브란과 함께 두린과 광부들을 구했다.' },
    next: 'm_durin_talk',
  },
  m_bran_fall: {
    loc: 'mine',
    who: ['durin'],
    sp: 'durin',
    t: `당신은 두린과 광부들을 이끌고 달린다. 등 뒤에서 굉음이 울린다. 돌아보니 천장이 통째로 무너져 내렸다. 골렘도, 들보도, 브란도 그 아래로 사라졌다.

두린이 무너진 바위 더미에 매달려 형의 이름을 부른다. 대답은 없다.

먼지 속에서 브란의 망치 손잡이만이 바위 틈으로 삐죽 나와 있다.`,
    fx: { leave: 'bran', flag: ['bran_dead', 'durin_saved'], rep: { dwarf: 2 }, journal: '브란이 무너지는 갱도에서 동생과 광부들을 살리고 돌 아래 잠들었다.' },
    next: 'm_durin_talk',
  },
  m_durin_saved: {
    loc: 'mine',
    who: ['durin'],
    sp: 'durin',
    t: `바위가 치워지고 두린과 광부들이 기어 나온다. 두린이 당신의 손을 붙잡고 흔든다. "은혜를 잊지 않겠소. 드워프는 빚을 돌에 새기오."`,
    x: [[{ comp: 'bran' }, '두린이 형을 보고 그대로 굳는다. 그리고 달려들어 끌어안는다. "형! 형이 올 줄 알았어!"']],
    fx: { flag: 'durin_saved', rep: { dwarf: 2 } },
    next: 'm_durin_talk',
  },
  m_durin_lost: {
    loc: 'mine',
    t: `골렘의 주먹이 당신을 벽에 처박는다. 흐려지는 시야 속에서, 골렘이 바위를 부수고 두린을 움켜쥐는 것이 보인다. 골렘은 두린을 들고 갱도 깊은 곳으로 사라진다.

광부들이 당신을 일으킨다. "대용광로 쪽이오! 그 마녀가 두린을 데려간 거요!"`,
    fx: { hp: 8, flag: 'durin_captive' },
    next: 'm_forge_walk',
  },
  m_durin_talk: {
    loc: 'mine',
    who: ['durin'],
    sp: 'durin',
    t: `두린이 숨을 고르며 말한다.

"붉은 로브의 마법사, 이름은 셀카요. 대용광로 한가운데 잿불 조각이 박혀 있는데, 그 여자가 조각에서 불을 뽑아내는 의식을 하고 있소. 그 의식 때문에 골렘들이 미친 거요.

잿불 수호자는 원래 우리 편이오. 수호자의 가슴에 새겨진 룬을 다시 새기면 정신을 차릴 거요. 내가 방법을 알려 주겠소."`,
    fx: { flag: 'know_warden_rune', journal: '잿불 수호자의 가슴 룬을 다시 새기면 수호자가 정신을 차린다.' },
    next: 'm_forge_walk',
  },
  m_forge_walk: {
    loc: 'mine_forge',
    chapter: '2막 · 대용광로',
    t: `광산 가장 깊은 곳. 거대한 동굴 한가운데 산만 한 용광로가 서 있다. 용암이 폭포처럼 쏟아지고, 그 중심에 주황빛 조각이 떠 있다.

조각 앞에서 붉은 로브의 여자가 두 팔을 벌리고 주문을 외고 있다. 조각에서 뽑혀 나온 불줄기가 그녀의 손바닥으로 빨려 든다. 그 뒤로 집채만 한 바위 거인이 무릎을 꿇은 채 보랏빛 눈을 깜빡이고 있다.`,
    x: [[{ flag: 'durin_captive' }, '용광로 옆 쇠사슬에 두린이 묶여 있다.']],
    c: [
      { t: '"멈춰요!" 셀카에게 말을 건다', check: ['cha', 13], ok: 'm_selka_talk', no: 'm_selka_fight', at: 'forge' },
      { t: '의식에 집중한 틈을 노려 기습한다', go: 'm_selka_ambush' },
      { t: '수호자에게 몰래 다가가 가슴의 룬을 다시 새긴다', req: { flag: 'know_warden_rune' }, check: ['int', 12], ok: 'm_warden_turn', no: 'm_selka_fight' },
    ],
  },
  m_selka_ambush: {
    loc: 'mine_forge',
    who: ['selka'],
    t: `당신의 첫 일격이 셀카의 어깨를 스친다. 의식이 깨지며 불줄기가 사방으로 튄다. 셀카가 비틀거리며 돌아선다. 눈에 분노와 피로가 뒤섞여 있다.`,
    combat: { e: 'selka', hp: -8, win: 'm_selka_down', lose: 'm_forge_lose' },
  },
  m_selka_fight: {
    loc: 'mine_forge',
    who: ['selka'],
    sp: 'selka',
    t: `셀카가 의식을 멈추고 돌아선다. "별의 그릇… 스승님이 기다리시던 게 너구나. 마침 잘 왔어." 그녀의 손에서 불꽃이 피어오른다.`,
    combat: { e: 'selka', win: 'm_selka_down', lose: 'm_forge_lose' },
  },
  m_selka_talk: {
    loc: 'mine_forge',
    who: ['selka'],
    sp: 'selka',
    t: `셀카가 주문을 멈춘다. 가까이서 보니 그녀는 생각보다 젊다. 눈 밑이 검고, 손이 화상투성이다.

"너구나. 별의 그릇." 그녀가 웃는데, 웃음이 지쳐 있다. "스승님이 그러셨어. 네가 조각을 다 모으면, 너를 용광로에 넣어 녹이면 된다고. 그럼 새 왕관이 생기고, 왕관을 쓴 자는 공허를 다스린다고.

공허를 다스리면… 공허에 삼켜진 사람들도 돌려받을 수 있대. 내 동생도."`,
    fx: { flag: 'know_melt', journal: '셀카: 모르베인은 조각을 모은 나를 녹여 새 왕관을 만들 계획이다. 셀카는 공허에 삼켜진 동생을 되찾고 싶어 한다.' },
    c: [
      { t: '"공허에 삼켜진 건 돌아오지 않아요. 모르베인은 당신을 이용하는 거예요."', check: ['cha', 14], ok: 'm_selka_turn', no: 'm_selka_fight' },
      { t: '"늙은 뿌리에게 들었어요. 나는 왕관 그 자체예요. 모르베인이 원하는 건 지배예요."', req: { flag: 'know_truth' }, go: 'm_selka_turn' },
      { t: '"그럼 당신부터 녹여 드리죠." 무기를 든다', go: 'm_selka_fight' },
    ],
  },
  m_selka_turn: {
    loc: 'mine_forge',
    who: ['selka'],
    sp: 'selka',
    t: `셀카의 손에서 불이 꺼진다. 그녀가 한참 용광로를 바라본다.

"…알고 있었어. 스승님 눈을 보면 알 수 있었어. 그 사람은 아무도 돌려받을 생각이 없어. 자기 자신 말고는."

그녀가 로브 소매에서 검은 수정 하나를 꺼내 바닥에 던져 깨뜨린다. 수호자의 보랏빛 눈이 흔들린다. "의식의 닻이야. 이제 수호자는 반쯤 깨어날 거야. 나머지는 너희가 해."

그녀가 돌아선다. "탑에서 다시 보자. 그땐… 네 편에 설게."`,
    fx: { flag: ['selka_turned'], journal: '셀카가 모르베인을 등졌다. 탑에서 돕겠다고 했다.' },
    next: 'm_warden',
  },
  m_selka_down: {
    loc: 'mine_forge',
    who: ['selka'],
    sp: 'selka',
    t: `셀카가 무릎을 꿇는다. 손바닥의 불이 꺼진다. 그녀가 피 섞인 웃음을 짓는다.

"끝내. 어차피 스승님한테 돌아가면 죽어."`,
    c: [
      { t: '살려 준다. "가요. 다시는 모르베인 곁에 서지 마요."', go: 'm_selka_spared', fx: { flag: 'selka_spared' } },
      { t: '끝을 낸다', go: 'm_selka_end', fx: { flag: 'selka_dead' } },
    ],
  },
  m_selka_spared: {
    loc: 'mine_forge',
    who: ['selka'],
    sp: 'selka',
    t: `셀카가 믿을 수 없다는 눈으로 당신을 본다. 그리고 비틀거리며 일어나 그림자 속으로 사라진다. 사라지기 직전, 작은 목소리가 남는다.

"…빚졌어."

그녀가 떠난 자리에서 의식이 무너지며, 무릎 꿇은 수호자가 몸을 일으킨다. 보랏빛 눈은 여전하다.`,
    next: 'm_warden',
  },
  m_selka_end: {
    loc: 'mine_forge',
    t: `셀카의 몸이 재가 되어 흩어진다. 그녀가 붙잡고 있던 의식이 무너지며, 무릎 꿇은 수호자가 몸을 일으킨다. 주인을 잃은 공허의 힘이 수호자에게 쏟아진다. 보랏빛 눈이 더욱 짙어진다.`,
    next: 'm_warden',
  },
  m_warden: {
    loc: 'mine_forge',
    t: `잿불 수호자가 일어선다. 키가 용광로의 절반이다. 바위 몸 틈새로 용암이 흐르고, 가슴에 새겨진 룬이 보랏빛으로 오염되어 있다.`,
    c: [
      { t: '수호자와 싸운다', go: 'm_warden_fight' },
      { t: '가슴의 룬을 다시 새긴다', req: { flag: 'know_warden_rune' }, check: ['int', 12], ok: 'm_warden_turn', no: 'm_warden_fight' },
      { t: '드워프 말로 수호자를 부른다', req: { any: [{ comp: 'bran' }, { flag: 'durin_saved' }] }, go: 'm_warden_turn' },
    ],
  },
  m_warden_fight: {
    loc: 'mine_forge',
    t: `수호자의 주먹이 용암을 튀기며 내려친다.`,
    combat: { e: 'warden', win: 'm_forge_win', lose: 'm_forge_lose' },
  },
  m_warden_turn: {
    loc: 'mine_forge',
    t: (s) =>
      (s.comps.includes('bran')
        ? '브란이 수호자 앞에 서서 드워프 말로 외친다. 천 년 전 처음 이 수호자를 깨운 왕의 말이다. '
        : s.flags.durin_saved
          ? '두린이 달려와 수호자 앞에서 드워프 말로 외친다. 천 년 전 처음 이 수호자를 깨운 왕의 말이다. '
          : '당신은 수호자의 다리를 타고 올라 가슴의 룬에 손을 댄다. 두린이 알려 준 순서대로 오염된 획을 지우고 새 획을 긋는다. ') +
      `수호자의 가슴에서 보랏빛이 빠져나가고, 주황빛 불씨가 다시 타오른다. 거인이 천천히 무릎을 꿇는다. 이번엔 공허가 아니라 당신에게.`,
    fx: { flag: 'warden_saved', rep: { dwarf: 2 } },
    next: 'm_forge_win',
  },
  m_forge_lose: {
    loc: 'mine_forge',
    t: `거대한 힘에 튕겨 나가 용광로 가장자리에 처박힌다. 숨이 끊어지려는 순간, 가슴의 별빛이 저절로 터져 나와 주변의 불을 밀어낸다. 수호자가 빛에 눈이 멀어 비틀거리다 용암 속으로 떨어진다.

당신은 살았다. 간신히.`,
    fx: { hp: 5, flag: 'star_awake' },
    next: 'm_forge_win',
  },
  m_forge_win: {
    loc: 'mine_forge',
    who: ['dungar', 'durin'],
    t: (s) =>
      `동굴이 고요해진다. 용광로 한가운데 떠 있던 잿불 조각이 천천히 내려와 당신 앞에서 멈춘다. 손을 뻗으면 닿을 거리다.

발소리. 둔가르 왕이 드워프 전사들을 이끌고 내려온다.` +
      (s.flags.durin_captive ? ' 당신이 두린의 쇠사슬을 끊자 둔가르가 아들을 끌어안는다.' : '') +
      `

둔가르가 조각을 바라본다. "그 조각이 천 년 동안 우리 용광로를 데웠다. 그걸 가져가면 용광로는 식는다. 하지만… 장막이 무너지면 용광로고 뭐고 남지 않겠지."`,
    fx: { flag: 'durin_saved', unflag: 'durin_captive' },
    c: [
      { t: '조각을 가져간다', go: 'm_take' },
      { t: '"조각의 불로 무기를 벼려 주실 수 있나요?"', go: 'm_reforge' },
      { t: '"조각을 가져가는 대신 약속하겠습니다. 장막을 고치면 다시 불을 돌려드리겠어요."', check: ['cha', 12], ok: 'm_take_promise', no: 'm_take' },
    ],
  },
  m_take: {
    loc: 'mine_forge',
    who: ['dungar', 'durin'],
    t: `당신이 조각을 쥐자 용광로의 불이 서서히 잦아든다. 조각의 열기가 가슴의 빛과 섞이며 몸속으로 힘이 흘러든다.

드워프들이 식어 가는 용광로를 말없이 바라본다.`,
    fx: { shard: 'ember', maxhp: 5, heal: 'full', flag: 'mine_done', journal: '잿불 조각을 얻었다.' },
    next: 'm_after',
  },
  m_take_promise: {
    loc: 'mine_forge',
    who: ['dungar', 'durin'],
    sp: 'dungar',
    t: `둔가르가 한참 당신을 바라보다가 굵은 손을 내민다. "드워프는 약속을 돌에 새긴다. 너의 약속도 새겨 두겠다."

당신이 조각을 쥐자 용광로의 불이 잦아든다. 하지만 드워프들의 눈빛은 실망이 아니라 기대다.`,
    fx: { shard: 'ember', maxhp: 5, heal: 'full', flag: ['mine_done', 'dwarf_promise'], rep: { dwarf: 1 }, journal: '잿불 조각을 얻고, 장막을 고치면 불을 돌려주겠다고 드워프와 약속했다.' },
    next: 'm_after',
  },
  m_reforge: {
    loc: 'mine_forge',
    who: ['dungar', 'durin'],
    sp: 'durin',
    t: (s) =>
      (s.comps.includes('bran') ? '브란과 두린이 나란히 모루 앞에 선다. 형제가 함께 망치를 드는 건 십 년 만이다. ' : '두린이 모루 앞에 선다. ') +
      `조각을 용광로 입구에 대고 마지막 불을 뽑아내 칼날에 입힌다. 망치 소리가 동굴을 울린다. 탕, 탕, 탕.

완성된 칼날 위로 불씨가 강물처럼 흐른다. 두린이 칼을 건넨다. "잿불 검이오. 이 칼이 닿는 공허는 타오를 거요."

조각은 불을 잃고 식었지만, 그 안의 빛은 그대로다.`,
    fx: { shard: 'ember', item: 'ember_blade', maxhp: 5, heal: 'full', flag: 'mine_done', rep: { dwarf: 1 }, journal: '잿불 조각을 얻고, 그 불로 잿불 검을 벼렸다.' },
    next: 'm_after',
  },
  m_after: {
    loc: 'mine',
    who: ['dungar', 'durin'],
    sp: 'dungar',
    t: (s) =>
      s.flags.bran_dead
        ? `왕의 홀. 둔가르가 브란의 망치를 왕좌 옆에 세워 둔다. 그의 눈이 붉다.

"내 아들은 두 번 광부들을 구했다. 두 번 다 내가 하지 못한 일이다." 그가 당신을 본다. "그 아이가 너를 따라나선 데는 이유가 있었겠지."`
        : `왕의 홀에서 드워프들이 술잔을 든다. 두린이 광부들과 노래를 부르고, 둔가르가 당신에게 잔을 건넨다.`,
    c: [
      { t: '둔가르의 맹세를 받는다', req: { rep: { dwarf: 3 }, not: 'dwarf_ally' }, fx: { flag: 'dwarf_ally', item: 'dwarf_horn' }, go: 'm_pledge' },
      { t: '흑맥주를 받아 든다', req: { not: 'got_ale' }, fx: { item: 'ale', flag: 'got_ale' }, go: 'm_after' },
      { t: '요새를 떠난다', go: 'm_leave' },
    ],
  },
  m_pledge: {
    loc: 'mine',
    who: ['dungar', 'durin'],
    sp: 'dungar',
    t: `둔가르가 허리춤의 뿔피리를 풀어 건넨다. 용의 이빨로 만든 낡은 뿔피리다.

"잿불 드워프는 빚을 진 자를 잊지 않는다. 마지막 싸움이 오면 이걸 불어라. 산이 무너져도 우리가 간다."`,
    next: 'm_after',
  },
  m_leave: {
    loc: 'mine',
    t: (s) =>
      s.flags.bran_dead
        ? '석문이 닫힌다. 문 위 룬 사이에 새 이름 하나가 새겨진 것이 보인다. 브란.'
        : '석문을 나서자 서늘한 바깥바람이 뺨을 스친다. 등 뒤에서 드워프들의 노래가 들린다.',
    x: [[{ comp: 'bran', flag: 'bran_forgiven' }, '브란이 석문을 돌아본다. "이번엔 쫓겨나는 게 아니라 떠나는 거다. 기분이 다르군."']],
    fx: { flag: 'mine_done' },
    next: 'x_cross',
    nextLabel: '갈림길로 돌아간다',
  },
  m_return: {
    loc: 'mine',
    t: `잿불 요새의 석문이 당신을 알아보고 스스로 열린다. 드워프 경비가 고개를 숙인다. "손님, 언제든 환영이오."`,
    c: [
      { t: '흑맥주 한 잔에 몸을 녹인다', fx: { heal: 'full' }, go: 'm_return' },
      { t: '드워프 대장간에서 갑옷을 산다 (금화 15)', req: { gold: 15, noItem: 'armor' }, fx: { gold: -15, item: 'armor' }, go: 'm_return' },
      { t: '갈림길로 돌아간다', go: 'x_cross' },
    ],
  },
};
