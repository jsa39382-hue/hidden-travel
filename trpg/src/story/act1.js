// 1막: 별이 떨어진 밤, 가시골
export default {
  p_wake: {
    loc: 'village_night',
    chapter: '1막 · 별이 떨어진 밤',
    t: `타는 풀 냄새에 눈을 뜬다. 당신은 갓 패인 구덩이 한가운데 누워 있다. 하늘에는 별 하나가 떨어진 자리만큼 비어 있고, 가슴 한복판에서 은빛 맥박이 희미하게 뛴다.

기억나는 것은 하나뿐이다. 당신의 이름, {name}.

멀리서 개 짖는 소리, 그리고 그보다 더 멀리서 늑대인지 아닌지 모를 울음이 들린다.`,
    c: [
      { t: '가슴의 빛에 정신을 집중한다', check: ['int', 12], ok: 'p_vision', no: 'p_vision_fail' },
      { t: '몸을 일으켜 주위를 살핀다', go: 'p_crater' },
    ],
  },
  p_vision: {
    loc: 'village_night',
    t: `빛 속으로 가라앉는다. 새벽빛으로 빛나던 왕관 하나가 세 갈래로 쪼개진다. 초록, 붉은 불씨, 은빛. 그 너머 보랏빛 로브를 입은 키 큰 사내가 웃는다.

"그릇이여, 깨어나라. 나는 너를 오래 기다렸다."

눈을 뜨자 손끝이 떨린다. 이 빛은 그저 상처가 아니다. 무언가가 당신 안에 잠들어 있다.`,
    fx: { flag: ['star_vision'], journal: '별빛 속에서 세 조각으로 부서지는 왕관과 보랏빛 사내를 보았다.' },
    next: 'p_crater',
  },
  p_vision_fail: {
    loc: 'village_night',
    t: `빛을 붙잡으려는 순간 머릿속이 하얗게 타오른다. 귀에서 이명이 울리고, 코끝으로 따뜻한 피가 흐른다. 너무 이르다. 아직은.`,
    fx: { hp: -3 },
    next: 'p_crater',
  },
  p_crater: {
    loc: 'village_night',
    who: ['elder', 'bran', 'villager'],
    sp: 'elder',
    t: `횃불이 구덩이를 둘러싼다. 쇠스랑과 낫을 든 마을 사람들, 맨 앞에는 지팡이를 짚은 백발 노인, 그 옆에는 망치를 어깨에 걸친 붉은 수염의 드워프가 서 있다.

"별에서… 사람이 나왔어." 누군가 속삭인다.

노인이 손을 들어 사람들을 진정시킨다. "나는 가시골의 촌장 하윈이오. 그대는 누구요? 사람이오, 아니면 공허가 보낸 무엇이오?"

숲 쪽에서 다시 울음소리가 들린다. 이번엔 훨씬 가깝다.`,
    c: [
      { t: '손을 들고, 해칠 생각이 없다고 말한다', check: ['cha', 11], ok: 'p_trust', no: 'p_suspect' },
      { t: '망치를 든 드워프의 눈을 똑바로 마주 본다', check: ['str', 13], ok: 'p_respect', no: 'p_suspect' },
      { t: '손끝에 작은 불빛을 피워 보인다', req: { cls: 'mage' }, go: 'p_magic' },
      { t: '"빛이 당신들을 지키라 했습니다." 기도의 말을 외운다', req: { cls: 'cleric' }, go: 'p_magic' },
      { t: '어둠 속으로 달아난다', go: 'p_flee' },
    ],
  },
  p_trust: {
    loc: 'village_night',
    who: ['elder', 'bran', 'villager'],
    sp: 'elder',
    t: `당신의 목소리는 떨렸지만 진심이었다. 하윈이 길게 숨을 내쉰다.

"별이 떨어진 밤에는 손님을 내치지 않는 법이오. 내 할머니가 그리 말씀하셨지." 그가 지팡이로 마을 쪽을 가리킨다. "여관으로 갑시다. 오늘 밤은 바깥이 위험하오."

드워프가 망치를 내리며 투덜거린다. "별에서 떨어진 손님이라. 맥주값은 누가 내나 몰라."`,
    fx: { flag: 'village_trust' },
    next: 'p_wolves',
  },
  p_respect: {
    loc: 'village_night',
    who: ['elder', 'bran', 'villager'],
    sp: 'bran',
    t: `드워프가 한참 당신을 노려보다가, 갑자기 껄껄 웃는다.

"배짱 하나는 쓸 만하군! 별에서 떨어진 놈이 겁쟁이면 어쩌나 했지." 그가 커다란 손을 내민다. "브란이다. 이 마을 대장장이지."

하윈 촌장이 고개를 끄덕인다. "브란이 웃었으니 나쁜 사람은 아니겠지."`,
    fx: { flag: ['village_trust', 'bran_respect'] },
    next: 'p_wolves',
  },
  p_magic: {
    loc: 'village_night',
    who: ['elder', 'bran', 'villager'],
    sp: 'elder',
    t: `당신의 손바닥 위로 은빛 불꽃이 피어난다. 횃불보다 훨씬 맑은 빛이다. 사람들이 숨을 삼키고 뒤로 물러선다.

"별빛…" 하윈이 중얼거린다. "이솔 사제가 보면 기절하겠군. 오래된 노래에 나오는 그 빛이오."

브란이 코를 훌쩍인다. "마법사라면 질색이지만, 빛나는 건 쓸모가 있지."`,
    fx: { flag: ['village_trust', 'isol_curious'] },
    next: 'p_wolves',
  },
  p_suspect: {
    loc: 'village_night',
    who: ['elder', 'bran', 'villager'],
    sp: 'bran',
    t: `사람들의 눈빛이 굳는다. "공허가 보낸 놈일지도 몰라!" 누군가 외치고, 밧줄이 당신의 손목을 감는다.

"잠깐." 하윈이 말리려는 순간이었다. 마을 울타리 너머 어둠 속에서 푸른 눈 여섯 개가 켜진다. 연기처럼 일렁이는 털, 이빨 사이로 새어 나오는 검은 안개.

"공허 늑대다!" 브란이 망치를 고쳐 쥔다.`,
    fx: { flag: 'village_suspect' },
    c: [
      { t: '묶인 채로 촌장 앞을 가로막는다', go: 'p_wolves_fight' },
      { t: '밧줄을 비틀어 빠져나간다', check: ['dex', 12], ok: 'p_wolves', no: 'p_bitten' },
      { t: '가슴의 빛을 터뜨린다', req: { flag: 'star_vision' }, go: 'p_starburst' },
    ],
  },
  p_wolves: {
    loc: 'village_night',
    who: ['elder', 'bran', 'villager'],
    t: `그때 울타리 너머에서 푸른 눈들이 켜진다. 공허 늑대. 연기처럼 일렁이는 털, 이빨 사이로 새어 나오는 검은 안개. 마을 사람들이 비명을 지르며 흩어진다.

늑대 한 마리가 곧장 하윈 촌장에게 달려든다.`,
    c: [
      { t: '촌장 앞을 막아서며 싸운다', go: 'p_wolves_fight' },
      { t: '가슴의 빛을 터뜨린다', req: { flag: 'star_vision' }, go: 'p_starburst' },
      { t: '이 틈에 어둠 속으로 달아난다', go: 'p_flee' },
    ],
  },
  p_wolves_fight: {
    loc: 'village_night',
    who: ['elder', 'bran'],
    t: `당신은 촌장과 늑대 사이로 뛰어든다. 차가운 안개가 살갗을 베는 것 같다.`,
    combat: { e: 'wolf', win: 'p_hero', lose: 'p_flee_lose' },
  },
  p_hero: {
    loc: 'village_night',
    who: ['elder', 'bran', 'villager'],
    sp: 'elder',
    t: `늑대가 검은 연기로 흩어진다. 나머지 늑대들이 브란의 망치를 피해 숲으로 달아난다.

하윈이 떨리는 손으로 당신의 어깨를 짚는다. "목숨을 빚졌구려. 이 마을은 은혜를 잊지 않소." 그가 허리춤의 주머니를 풀어 쥐여 준다.

브란이 피 묻은 망치를 닦으며 씩 웃는다. "제법인데, 별똥별."`,
    fx: { flag: ['village_hero', 'village_trust', 'bran_respect'], unflag: 'village_suspect', gold: 10 },
    next: 'v_inn_first',
  },
  p_bitten: {
    loc: 'village_night',
    who: ['elder', 'bran'],
    sp: 'bran',
    t: `밧줄이 풀리는 순간 늑대의 이빨이 당신의 팔을 문다. 얼음 같은 통증. 쓰러지려는 찰나 망치가 늑대의 옆구리를 후려친다.

"엎드려 있어, 별똥별!" 브란이다. 늑대들이 연기처럼 흩어진다. 그는 당신을 일으키며 혀를 찬다. "묶어 둔 건 미안하게 됐다. 근데 네가 공허 편이면 늑대가 널 물진 않았겠지."`,
    fx: { hp: -5, flag: ['bran_saved_you', 'village_trust'] },
    next: 'v_inn_first',
  },
  p_starburst: {
    loc: 'village_night',
    who: ['elder', 'bran', 'villager'],
    t: `가슴 깊은 곳의 빛을 놓아 버린다. 은빛 파도가 사방으로 퍼져 나가고, 늑대들이 비명조차 지르지 못한 채 재로 흩어진다. 밧줄이 타서 끊어진다.

마을 사람들이 무릎을 꿇는다. 누군가는 기도를 하고, 누군가는 울고 있다.

빛이 꺼지자 다리에 힘이 풀린다. 마지막으로 본 것은 당신을 받아 드는 드워프의 굵은 팔이었다.`,
    fx: { flag: ['village_hero', 'village_trust', 'star_awake'], unflag: 'village_suspect', hp: -4, journal: '처음으로 별빛을 터뜨렸다. 공허의 짐승이 재가 되었다.' },
    next: 'v_inn_first',
  },
  p_flee: {
    loc: 'village_night',
    t: `당신은 횃불을 등지고 어둠 속으로 뛴다. 나뭇가지가 뺨을 할퀸다. 숲 가장자리에 다다랐을 때, 앞쪽에서 낮은 으르렁 소리가 들린다.

푸른 눈. 연기 같은 털. 공허 늑대 한 마리가 길을 막고 있다.`,
    combat: { e: 'wolf', win: 'p_flee_win', lose: 'p_flee_lose' },
  },
  p_flee_win: {
    loc: 'village_night',
    who: ['bran', 'villager'],
    sp: 'bran',
    t: `늑대가 재로 흩어지고 나서야 등 뒤로 횃불 빛이 다가온다. 붉은 수염의 드워프가 숨을 헐떡인다.

"혼자서 저놈을? 도망치는 줄 알았더니 사냥을 나간 거였군." 그가 망치로 땅을 쿵 찍는다. "브란이다. 따라와. 이 근처는 저런 게 밤새 돌아다녀."`,
    fx: { flag: ['village_trust', 'bran_respect', 'wolf_slayer'] },
    next: 'v_inn_first',
  },
  p_flee_lose: {
    loc: 'village',
    who: ['isol'],
    sp: 'isol',
    t: `…차가운 물수건이 이마에 닿는다. 촛불 냄새. 흰 옷을 입은 여인이 당신을 내려다보고 있다.

"움직이지 마세요. 공허 늑대에게 물리고도 살아난 사람은 처음 봐요." 그녀가 붕대를 감으며 조용히 말한다. "저는 신전 사제 이솔이에요. 촌장님이 당신을 여기로 데려오셨어요. 당신이 쓰러진 자리에… 은빛이 번져 있었다더군요."`,
    fx: { heal: 'full', hp: -8, flag: ['village_trust', 'isol_curious', 'rescued'] },
    next: 'v_morning',
  },
  v_inn_first: {
    loc: 'village_night',
    who: ['margo', 'elder'],
    sp: 'elder',
    t: `'졸린 거위' 여관. 벽난로가 타닥거리고, 풍채 좋은 여주인 마고가 김이 나는 스튜를 내온다. "먹어요. 별에서 왔든 땅에서 왔든 배는 고플 테니."

하윈 촌장이 맞은편에 앉는다.

"십 년 전, 알드렌 선왕께서 돌아가신 밤에 '새벽의 왕관'이 부서졌소. 왕관은 이 땅과 공허 사이의 장막을 지탱하던 것이었지. 그 뒤로 장막이 얇아졌고, 저런 짐승들이 넘어오기 시작했소. 사람들은 이제 그것을 '잿빛 왕관'이라 부르오."

그는 당신의 가슴께에서 새어 나오는 희미한 빛을 바라본다. "오늘 밤은 쉬시오. 내일 아침 내 집으로 오시오. 할 이야기가 있소."`,
    fx: { heal: 'full', journal: '가시골에 도착했다. 십 년 전 새벽의 왕관이 부서져 장막이 얇아졌다고 한다.' },
    next: 'v_morning',
  },
  v_morning: {
    loc: 'village',
    t: `아침이 밝았다. 밤의 공포가 거짓말처럼 가시골은 평화롭다. 굴뚝마다 연기가 오르고, 아이들이 당신을 흘끔거리며 수군댄다. "저 사람이 별에서 떨어졌대."

마을 한가운데 우물 너머로 촌장의 집이 보인다. 여관, 신전, 대장간, 장터도 모두 걸어서 닿는 거리다.`,
    x: [[{ flag: 'village_hero' }, '어젯밤의 이야기는 벌써 마을에 다 퍼진 모양이다. 지나가는 노인이 당신에게 고개를 숙인다.']],
    next: 'v_hub',
    nextLabel: '마을을 둘러본다',
  },
  v_hub: {
    loc: 'village',
    chapter: '1막 · 가시골',
    t: (s) =>
      s.flags.elder_quest
        ? '가시골의 오후. 떠날 채비는 되었는가? 마을 문은 북쪽에 있다. 빛나는 표식으로 걸어가거나, 아래에서 고르면 된다.'
        : '가시골의 아침. 어디로 가 볼까? 빛나는 표식으로 걸어가거나, 아래에서 고르면 된다.',
    c: [
      { t: '촌장 하윈의 집', go: 'v_elder', at: 'elder' },
      { t: '졸린 거위 여관', go: 'v_inn', at: 'inn' },
      { t: '별빛 신전', go: 'v_temple', at: 'temple' },
      { t: '브란의 대장간', go: 'v_smithy', at: 'smithy' },
      { t: '장터', go: 'v_market', at: 'market' },
      { t: '마을 우물', go: 'v_well', at: 'well', once: true },
      { t: '별이 떨어진 구덩이', go: 'v_crater_day', at: 'crater', once: true },
      { t: '마을 문을 나선다', go: 'v_gate', at: 'gate', req: { flag: 'elder_quest' } },
    ],
  },

  // ── 여관
  v_inn: {
    loc: 'village',
    who: ['margo'],
    sp: 'margo',
    t: `마고가 행주로 탁자를 훔치며 웃는다. "어서 와요, 별손님. 스튜? 맥주? 아니면 소문?"`,
    c: [
      { t: '요즘 돌아가는 소문을 묻는다', go: 'v_inn_rumor', once: true },
      { t: '맥주 한 잔을 산다 (금화 2)', req: { gold: 2 }, go: 'v_inn_drink', fx: { gold: -2 }, once: true },
      { t: '방을 잡고 푹 쉰다 (금화 5)', req: { gold: 5 }, go: 'v_inn_rest', fx: { gold: -5 } },
      { t: '구석의 후드 쓴 손님에게 다가간다', go: 'v_hood', req: { notVisited: 'v_hood' } },
      { t: '여관을 나온다', go: 'v_hub' },
    ],
  },
  v_inn_rumor: {
    loc: 'village',
    who: ['margo'],
    sp: 'margo',
    t: `"소문이라면 넘쳐나죠." 마고가 손가락을 하나씩 접는다.

"동쪽 '속삭이는 숲'의 엘프들은 요즘 사람만 보면 활을 겨눈대요. 숲 한가운데 고대 나무가 앓고 있다나.

서쪽 '잿불 광산'의 드워프들은 아예 성문을 걸어 잠갔고요. 브란 그 양반도 원래 거기 출신인데, 쫓겨났다는 얘기가 있어요.

그리고 북쪽 은빛성. 섭정 바렌 공작이 세금을 두 배로 올렸어요. 뒷골목에선 '잿빛 손'이라는 패거리가 섭정을 몰아내자고 떠든다나 봐요."`,
    fx: { flag: 'heard_rumors', journal: '숲의 엘프, 광산의 드워프, 은빛성의 섭정과 잿빛 손에 대한 소문을 들었다.' },
    next: 'v_inn',
    nextLabel: '고맙다고 한다',
  },
  v_inn_drink: {
    loc: 'village',
    who: ['margo'],
    sp: 'margo',
    t: `거품이 넘치는 맥주가 나온다. 한 모금 마시자 마고가 목소리를 낮춘다.

"하나 더 알려 줄게요. 남쪽 안개 늪에 '오르마'라는 마녀가 산대요. 운명을 본다나. 대신 값을 아주 비싸게 받는대요. 돈이 아니라… 다른 걸로."`,
    fx: { hp: 3, flag: 'heard_witch', journal: '남쪽 안개 늪에 운명을 보는 마녀 오르마가 산다고 한다.' },
    next: 'v_inn',
  },
  v_inn_rest: {
    loc: 'village',
    who: ['margo'],
    t: `깃털 이불은 생각보다 포근하다. 꿈속에서 누군가 노래를 부른다. 새벽의 왕관을 기리는 오래된 노래다. 깨어나니 몸이 가볍다.`,
    fx: { heal: 'full' },
    next: 'v_inn',
  },
  v_hood: {
    loc: 'village',
    who: ['nyx'],
    sp: 'nyx',
    t: `후드 아래로 날카로운 눈매의 여자가 당신을 올려다본다. 그녀는 잔을 돌리며 말한다.

"별에서 떨어진 사람. 소문보다 평범하게 생겼네." 그녀가 탁자 위로 동전 하나를 밀어 보낸다. 재로 그린 손바닥 문양. "나는 닉스. 은빛성에 오면 뒷골목에서 이걸 보여 줘. '잿빛 손'이 당신을 만나고 싶어 해. 섭정 놈도 당신을 찾고 있거든. 누가 먼저 찾느냐의 문제지."`,
    c: [
      { t: '동전을 받는다', go: 'v_hood_accept', fx: { item: 'hand_token', rep: { hand: 1 } } },
      { t: '"왜 섭정이 나를 찾지?"', go: 'v_hood_why' },
      { t: '거절한다. 도적과 엮이고 싶지 않다', go: 'v_hood_refuse' },
    ],
  },
  v_hood_why: {
    loc: 'village',
    who: ['nyx'],
    sp: 'nyx',
    t: `닉스가 입꼬리를 올린다. "섭정 바렌은 십 년 동안 왕 없는 왕좌에 앉아 있었어. 왕관이 다시 만들어지면 누가 쓰게 될까? 그걸 막고 싶겠지. 아니면… 직접 쓰고 싶거나."

그녀는 동전을 다시 톡 친다. "받든 말든 당신 마음이야."`,
    c: [
      { t: '동전을 받는다', go: 'v_hood_accept', fx: { item: 'hand_token', rep: { hand: 1 }, flag: 'varen_suspect_hint' } },
      { t: '거절한다', go: 'v_hood_refuse', fx: { flag: 'varen_suspect_hint' } },
    ],
  },
  v_hood_accept: {
    loc: 'village',
    who: ['nyx'],
    sp: 'nyx',
    t: `"현명해." 닉스가 일어나 망토를 여민다. "수도의 하수구 냄새를 맡으면 날 떠올려 줘." 그녀는 문을 열고 나가 아침 햇살 속으로 사라진다.`,
    next: 'v_inn',
  },
  v_hood_refuse: {
    loc: 'village',
    who: ['nyx'],
    sp: 'nyx',
    t: `"아쉽네." 닉스는 동전을 집어 넣고 어깨를 으쓱한다. "마음이 바뀌면 은빛성 뒷골목에서 내 이름을 불러. 운이 좋으면 대답할지도."`,
    next: 'v_inn',
  },

  // ── 신전
  v_temple: {
    loc: 'village',
    who: ['isol'],
    sp: 'isol',
    t: (s) =>
      s.flags.rescued
        ? `이솔이 제단의 촛불을 갈다가 돌아본다. "상처는 좀 어때요? 무리하지 마세요."`
        : `작은 신전 안, 별 모양 창으로 빛이 들어온다. 흰 옷의 사제가 당신을 보고 손을 멈춘다. "당신이… 별에서 온 분이군요. 저는 이솔이에요."`,
    c: [
      { t: '별과 왕관에 대해 묻는다', go: 'v_temple_lore', once: true },
      { t: '제단 앞에서 기도한다', go: 'v_temple_pray', once: true },
      { t: '치유 물약을 산다 (금화 10)', req: { gold: 10 }, fx: { gold: -10, item: 'potion' }, go: 'v_temple' },
      { t: '성수를 산다 (금화 12)', req: { gold: 12 }, fx: { gold: -12, item: 'holy_water' }, go: 'v_temple' },
      { t: '신전을 나온다', go: 'v_hub' },
    ],
  },
  v_temple_lore: {
    loc: 'village',
    who: ['isol'],
    sp: 'isol',
    t: `이솔이 낡은 두루마리를 펼친다. 그림 속 왕관에서 별 하나가 떨어지고 있다.

"오래된 예언이에요. '왕관이 부서지고 장막이 얇아질 때, 왕관의 혼이 별이 되어 떨어지리라. 별의 그릇이 세 조각을 모으면 새벽이 다시 오리라.'

초록 조각은 숲의 심장에, 잿불 조각은 드워프의 용광로에, 은빛 조각은 왕의 도성에 있다고 전해져요." 그녀가 당신을 본다. "당신이 그 그릇이라면… 많은 이들이 당신을 원하게 될 거예요. 좋은 뜻으로든, 나쁜 뜻으로든."`,
    fx: { flag: 'know_vessel', journal: '예언: 별의 그릇이 세 조각(숲의 심장, 드워프의 용광로, 왕의 도성)을 모으면 새벽이 다시 온다.' },
    next: 'v_temple',
  },
  v_temple_pray: {
    loc: 'village',
    who: ['isol'],
    t: `당신은 별 모양 창 아래 무릎을 꿇는다. 기도의 말은 모르지만, 마음속으로 무언가를 부른다.`,
    c: [{ t: '마음을 연다', check: ['cha', 12], ok: 'v_temple_pray_ok', no: 'v_temple_pray_no' }],
  },
  v_temple_pray_ok: {
    loc: 'village',
    who: ['isol'],
    sp: 'isol',
    t: `가슴의 빛이 창으로 들어온 햇살과 공명한다. 신전 전체가 잠깐 은빛으로 물든다. 이솔이 숨을 멈추고 당신을 바라보다가, 목에 걸고 있던 은실 부적을 풀어 건넨다.

"이건 제 스승님이 남기신 거예요. 별이 돌아오면 드리라고 하셨어요. 정말로… 돌아왔네요."`,
    fx: { heal: 'full', item: 'amulet', flag: 'isol_blessing' },
    next: 'v_temple',
  },
  v_temple_pray_no: {
    loc: 'village',
    who: ['isol'],
    sp: 'isol',
    t: `아무 일도 일어나지 않는다. 그래도 마음은 조금 가라앉는다. 이솔이 부드럽게 웃는다. "신은 늘 바로 대답하시지 않아요. 그래도 들으셨을 거예요."`,
    fx: { hp: 5 },
    next: 'v_temple',
  },

  // ── 대장간
  v_smithy: {
    loc: 'village',
    who: ['bran'],
    sp: 'bran',
    t: (s) =>
      s.comps.includes('bran')
        ? `브란이 모루 앞에서 마지막 짐을 챙긴다. "준비되면 말해. 난 언제든 갈 수 있어."`
        : `쇠 두드리는 소리가 멈춘다. 브란이 땀을 닦으며 고개를 든다. "별똥별이로군. 칼이 필요하냐, 말동무가 필요하냐?"`,
    c: [
      { t: '드워프 강철검을 산다 (금화 30)', req: { gold: 30, noItem: 'sword_fine' }, fx: { gold: -30, item: 'sword_fine' }, go: 'v_smithy' },
      { t: '가죽 갑옷을 산다 (금화 18)', req: { gold: 18, noItem: 'armor' }, fx: { gold: -18, item: 'armor' }, go: 'v_smithy' },
      { t: '횃불을 산다 (금화 3)', req: { gold: 3 }, fx: { gold: -3, item: 'torch' }, go: 'v_smithy' },
      { t: '"광산에서 쫓겨났다면서요?"', go: 'v_bran_past', once: true },
      { t: '함께 가자고 청한다', go: 'v_bran_ask', req: { noComp: 'bran', not: 'bran_refused' } },
      { t: '대장간을 나온다', go: 'v_hub' },
    ],
  },
  v_bran_past: {
    loc: 'village',
    who: ['bran'],
    sp: 'bran',
    t: `브란의 망치가 모루 위에서 멈춘다. 한참 뒤에야 그가 입을 연다.

"잿불 요새의 왕 둔가르가 내 아버지다. 십 년 전 광산 깊은 곳에서 공허가 새어 나왔을 때, 아버지는 문을 걸어 잠그라 명하셨지. 아래에 광부들이 아직 서른 명이나 있었는데.

난 문을 다시 열었다. 열두 명을 건졌고, 그 대가로 추방당했지." 그가 쓴웃음을 짓는다. "동생 두린은 아직 거기 있다. 살아 있다면."`,
    fx: { flag: 'bran_story', journal: '브란은 잿불 요새 둔가르 왕의 아들이다. 광부들을 구하려다 추방당했다. 동생 두린이 아직 광산에 있다.' },
    next: 'v_smithy',
  },
  v_bran_ask: {
    loc: 'village',
    who: ['bran'],
    sp: 'bran',
    t: (s) =>
      s.flags.bran_respect || s.flags.village_hero || s.flags.bran_story
        ? `브란이 앞치마를 벗어 모루 위에 던진다. "기다렸다. 이 마을에서 망치질만 하다 늙어 죽을 순 없지. 그리고 네가 왕관 조각을 찾는다면, 결국 잿불 요새로 가게 될 거다. 길잡이가 필요할걸."`
        : `브란이 팔짱을 낀다. "널 어떻게 믿지? 어젯밤에 떨어진 놈을." 그는 당신을 위아래로 훑어본다. "말로 설득해 보든가."`,
    c: [
      { t: '악수를 청한다', req: { any: [{ flag: 'bran_respect' }, { flag: 'village_hero' }, { flag: 'bran_story' }] }, go: 'v_bran_join', fx: { comp: 'bran' } },
      { t: '"당신 동생을 찾는 걸 돕겠어요."', req: { not: ['bran_respect', 'village_hero', 'bran_story'] }, check: ['cha', 13], ok: 'v_bran_join', okfx: { comp: 'bran' }, no: 'v_bran_no' },
      { t: '팔씨름으로 증명한다', req: { not: ['bran_respect', 'village_hero', 'bran_story'] }, check: ['str', 14], ok: 'v_bran_join', okfx: { comp: 'bran', flag: 'bran_respect' }, no: 'v_bran_no' },
      { t: '다음에 이야기하자', go: 'v_smithy' },
    ],
  },
  v_bran_join: {
    loc: 'village',
    who: ['bran'],
    sp: 'bran',
    t: `브란이 벽에 걸린 커다란 망치를 내려 어깨에 멘다. "좋아, 별똥별. 내 망치는 네 편이다. 대신 술은 네가 사."

[브란은 힘 판정에 +2를 더해 주고, 전투에서 함께 싸운다.]`,
    fx: { flag: 'bran_joined' },
    next: 'v_smithy',
  },
  v_bran_no: {
    loc: 'village',
    who: ['bran'],
    sp: 'bran',
    t: `브란이 코웃음을 친다. "아직은 아니야. 네가 뭘 하는지 좀 더 보고 정하지." 그는 다시 망치를 든다.`,
    fx: { flag: 'bran_refused' },
    next: 'v_smithy',
  },

  // ── 장터
  v_market: {
    loc: 'village',
    who: ['villager'],
    t: (s) =>
      s.visited.v_market > 1
        ? '장터는 여전히 북적인다. 생선 비린내와 빵 굽는 냄새가 섞여 있다.'
        : `장터는 북적인다. 당신이 좌판을 구경하는 사이, 허리춤이 가벼워지는 느낌이 든다. 돌아보니 작은 그림자가 사람들 다리 사이로 쏙 빠져나간다. 하플링이다!`,
    c: [
      { t: '소매치기를 쫓는다', req: { notVisited: ['v_finn_caught', 'v_finn_gone'] }, check: ['dex', 13], ok: 'v_finn_caught', no: 'v_finn_gone' },
      { t: '치유 물약 (금화 12)', req: { gold: 12 }, fx: { gold: -12, item: 'potion' }, go: 'v_market' },
      { t: '횃불 (금화 3)', req: { gold: 3 }, fx: { gold: -3, item: 'torch' }, go: 'v_market' },
      { t: '밧줄 (금화 4)', req: { gold: 4, noItem: 'rope' }, fx: { gold: -4, item: 'rope' }, go: 'v_market' },
      { t: '왕국 지도 (금화 8)', req: { gold: 8, noItem: 'map' }, fx: { gold: -8, item: 'map' }, go: 'v_market' },
      { t: '장터를 떠난다', go: 'v_hub' },
    ],
  },
  v_finn_caught: {
    loc: 'village',
    who: ['finn'],
    sp: 'finn',
    t: `골목 끝에서 당신은 작은 도둑의 멱살을 잡는다. 곱슬머리 하플링이 두 손을 번쩍 든다.

"아야야! 돌려줄게, 돌려준다고! 이름은 핀, 직업은… 음, 자유로운 재분배업자?" 그가 당신의 금화 주머니를 내밀며 눈을 굴린다. "근데 별에서 온 사람이 이렇게 빠를 줄 누가 알았겠어?"`,
    c: [
      { t: '경비에게 넘긴다', go: 'v_finn_jail', fx: { flag: 'finn_jailed', rep: { order: 1 } } },
      { t: '놓아준다', go: 'v_finn_free', fx: { flag: 'finn_freed', gold: 5 } },
      { t: '"그 손재주, 나를 위해 써 볼래?"', go: 'v_finn_join', fx: { comp: 'finn', flag: 'finn_freed' } },
    ],
  },
  v_finn_gone: {
    loc: 'village',
    t: `골목을 세 번 꺾고 나니 아무도 없다. 주머니에서 금화가 꽤 빠져나갔다. 바닥에 작은 쪽지 하나. "고마워요, 별손님. 언젠가 갚을게. 진짜로. - 핀"`,
    fx: { gold: -10, flag: 'finn_stole' },
    next: 'v_market',
  },
  v_finn_jail: {
    loc: 'village',
    who: ['finn'],
    sp: 'finn',
    t: `마을 경비가 핀을 끌고 간다. 하플링이 어깨 너머로 외친다. "너무해! 난 배고팠을 뿐이라고!" 마을 사람 몇이 당신에게 박수를 친다.`,
    next: 'v_market',
  },
  v_finn_free: {
    loc: 'village',
    who: ['finn'],
    sp: 'finn',
    t: `핀이 눈을 동그랗게 뜬다. "진짜? 와, 별에서 온 사람은 마음도 넓구나." 그는 주머니에서 금화 몇 닢을 더 꺼내 당신 손에 쥐여 준다. "이자야. 은빛성에서 다시 보면 크게 갚을게!" 그리고 바람처럼 사라진다.`,
    next: 'v_market',
  },
  v_finn_join: {
    loc: 'village',
    who: ['finn'],
    sp: 'finn',
    t: `핀의 얼굴이 환해진다. "동료? 나를? 세상에, 경비 말고 나한테 일거리를 준 사람은 처음이야!" 그가 당신의 주머니를 돌려주며, 덤으로 누군가의 은수저 하나를 끼워 넣는다. "아, 그건 실수. 아마도."

[핀은 민첩 판정에 +2를 더해 주고, 전투에서 함께 싸운다.]`,
    next: 'v_market',
  },

  // ── 우물과 구덩이
  v_well: {
    loc: 'village',
    t: `오래된 돌우물. 들여다보니 물 위에 비친 당신의 가슴께가 별처럼 빛난다. 바닥 쪽에서 무언가 반짝인다.`,
    c: [
      { t: '밧줄을 타고 내려간다', req: { item: 'rope' }, go: 'v_well_down' },
      { t: '팔을 뻗어 건져 본다', check: ['dex', 14], ok: 'v_well_down', no: 'v_well_fail' },
      { t: '그냥 둔다', go: 'v_hub' },
    ],
  },
  v_well_down: {
    loc: 'village',
    t: `차가운 물속에서 건져 낸 것은 녹슨 상자. 안에는 금화 스무 닢과, 왕실 문장이 새겨진 작은 은반지가 들어 있다. 반지 안쪽에는 '알드렌, 마지막 밤에'라고 적혀 있다. 누군가 십 년 전 이곳에 숨긴 것이다.`,
    fx: { gold: 20, flag: 'aldren_ring', journal: '우물 바닥에서 선왕 알드렌의 반지를 찾았다. 십 년 전 누군가 숨긴 것이다.' },
    next: 'v_hub',
  },
  v_well_fail: {
    loc: 'village',
    t: `손끝이 닿을 듯 말 듯하다가 우물 가장자리에서 미끄러진다. 차가운 물에 반쯤 빠졌다가 겨우 기어 나온다. 지나가던 아이들이 깔깔 웃는다.`,
    fx: { hp: -2 },
    next: 'v_hub',
  },
  v_crater_day: {
    loc: 'village',
    t: `밝은 날에 보니 구덩이는 생각보다 깊다. 흙이 유리처럼 녹아 굳어 있다. 그 한가운데, 당신이 누워 있던 자리에 작은 은빛 결정 하나가 박혀 있다. 손을 대자 결정이 녹아 당신의 손바닥으로 스며든다.

온몸에 힘이 차오른다.`,
    fx: { maxhp: 4, flag: 'crater_crystal' },
    next: 'v_hub',
  },

  // ── 촌장
  v_elder: {
    loc: 'village',
    who: ['elder'],
    sp: 'elder',
    t: (s) =>
      s.flags.elder_quest
        ? `하윈이 지도를 접어 건넨다. "갈 준비가 되었으면 북쪽 문으로 가시오. 몸조심하고."`
        : `촌장의 집은 책과 말린 약초 냄새로 가득하다. 하윈이 차를 따르며 무겁게 입을 연다.

"솔직히 말하겠소. 그대가 떨어진 밤, 늑대들이 처음으로 울타리를 넘었소. 장막이 더는 버티지 못한다는 뜻이오. 별의 전설이 사실이라면, 그대가 부서진 왕관의 조각들을 찾아야 하오.

그리고 하나 더. 오늘 아침 전령이 왔소. 은빛 기사단이 '별에서 떨어진 자'를 수도로 데려가려고 오고 있다 하오. 섭정의 명이라더군."`,
    c: [
      { t: '"제가 하겠습니다. 조각을 찾겠어요."', req: { not: 'elder_quest' }, go: 'v_elder_quest' },
      { t: '"왜 하필 저죠? 저는 아무것도 기억하지 못해요."', req: { not: 'elder_quest' }, go: 'v_elder_why', once: true },
      { t: '"저는 그런 운명 같은 거 원하지 않아요."', req: { not: 'elder_quest' }, go: 'v_elder_refuse' },
      { t: '선왕의 반지를 보여 준다', req: { flag: 'aldren_ring', not: 'ring_shown' }, go: 'v_elder_ring' },
      { t: '집을 나온다', go: 'v_hub' },
    ],
  },
  v_elder_why: {
    loc: 'village',
    who: ['elder'],
    sp: 'elder',
    t: `하윈이 찻잔을 내려놓는다. "기억이 없다는 건 짐이 없다는 뜻이기도 하오. 이 왕국 사람들은 모두 어느 편엔가 묶여 있지. 기사단, 엘프, 드워프, 뒷골목. 그대만이 어디에도 빚지지 않았소.

그리고 그대의 가슴에서 나는 빛. 십 년 전 왕관이 부서지던 밤, 나는 그 빛을 하늘에서 보았소. 똑같은 빛이오."`,
    next: 'v_elder',
  },
  v_elder_ring: {
    loc: 'village',
    who: ['elder'],
    sp: 'elder',
    t: `반지를 본 하윈의 손이 떨린다. "이걸… 어디서? 이건 선왕의 반지요. 왕이 돌아가신 밤, 왕의 시종 하나가 수도에서 도망쳐 이 마을까지 왔었소. 그는 다음 날 죽었지. '왕은 병으로 돌아가신 게 아니다'라는 말만 남기고.

이 반지를 수도의 기사단장 알드릭에게 보이면, 그는 그대의 말을 들을 것이오. 그는 선왕에게 충성을 맹세했던 사람이니."`,
    fx: { flag: ['ring_shown', 'king_murder_hint'], journal: '선왕 알드렌은 병사한 것이 아니라는 증언이 있었다. 반지를 알드릭 단장에게 보이면 믿어 줄 것이다.' },
    next: 'v_elder',
  },
  v_elder_quest: {
    loc: 'village',
    who: ['elder'],
    sp: 'elder',
    t: `하윈이 깊이 고개를 숙인다. 그리고 책상 서랍에서 밀랍으로 봉한 편지를 꺼낸다.

"동쪽 숲의 엘프 정찰자 세렌에게 이 편지를 전하시오. 내 오랜 벗의 딸이오. 숲의 엘프들은 외지인을 믿지 않지만, 이 편지가 있으면 화살보다 말을 먼저 꺼낼 것이오.

길은 마을 북쪽 문을 나서면 갈림길로 이어지오. 동쪽은 숲, 서쪽은 광산, 북쪽은 은빛성이오. 어디부터 갈지는 그대가 정하시오."`,
    fx: { flag: 'elder_quest', item: ['letter_harwin', 'potion'], gold: 10, journal: '촌장 하윈의 부탁: 왕관의 세 조각을 찾는다. 숲의 세렌에게 편지를 전한다.' },
    next: 'v_elder',
  },
  v_elder_refuse: {
    loc: 'village',
    who: ['elder'],
    sp: 'elder',
    t: `하윈은 화를 내지 않는다. 그저 창밖을 바라볼 뿐이다.

"그대를 탓할 수 없소. 하지만 기사단은 그대의 뜻을 묻지 않을 것이고, 공허의 짐승들은 더더욱 그렇소. 어느 길이든 그대는 이 마을을 떠나게 될 거요. 적어도 그 길을 고르는 건 그대이길 바라오."

그는 편지를 책상 위에 둔 채 밀어 놓는다. 언제든 가져가도 된다는 듯이.`,
    c: [
      { t: '편지를 집어 든다', go: 'v_elder_quest' },
      { t: '말없이 집을 나온다', go: 'v_hub' },
    ],
  },

  // ── 마을 문과 습격
  v_gate: {
    loc: 'village_raid',
    chapter: '1막 · 해질녘의 습격',
    who: ['villager'],
    t: `마을 문 앞에 다다랐을 때, 해가 지기 시작한다. 그리고 하늘이 이상한 색으로 물든다. 붉고, 그 아래로 보랏빛 금이 간다.

종탑의 종이 미친 듯이 울린다. "공허다! 공허가 온다!"

숲 쪽에서 검은 안개의 형체들이 밀려온다. 어젯밤의 늑대와는 비교도 안 되는 수다. 신전 쪽에서 아이들의 비명이, 대장간 쪽에서 쇠 부딪는 소리가 들린다.`,
    c: [
      { t: '신전으로 달려가 아이들을 지킨다', go: 'v_raid_temple', at: 'temple' },
      { t: '대장간으로 가 브란과 함께 싸운다', go: 'v_raid_smithy', at: 'smithy' },
      { t: '마을 문을 막아선다', go: 'v_raid_gate', at: 'gate' },
      { t: '마을 한가운데서 별빛을 터뜨린다', req: { flag: 'star_awake' }, go: 'v_raid_star', at: 'well' },
    ],
  },
  v_raid_temple: {
    loc: 'village_raid',
    who: ['isol'],
    sp: 'isol',
    t: `신전 문 앞에서 이솔이 지팡이 하나로 그림자들을 막고 있다. 등 뒤로 아이들이 웅크려 있다. "도와주세요!"`,
    combat: { e: 'hollow', win: 'v_raid_temple_win', lose: 'v_raid_lose' },
  },
  v_raid_temple_win: {
    loc: 'village_raid',
    who: ['isol', 'tomi'],
    sp: 'isol',
    t: `그림자가 흩어지자 이솔이 주저앉는다. 아이들이 하나둘 고개를 든다. 이솔이 아이들을 세다가 얼굴이 하얗게 질린다.

"토미… 토미가 없어요! 그림자를 쫓아 숲 쪽으로 뛰어갔다고…"`,
    fx: { flag: ['saved_children', 'tomi_lost'], rep: { order: 1 } },
    next: 'v_raid_after',
  },
  v_raid_smithy: {
    loc: 'village_raid',
    who: ['bran'],
    sp: 'bran',
    t: (s) =>
      s.comps.includes('bran')
        ? `브란이 당신 옆에서 망치를 휘두른다. "등 뒤는 맡겨라, 별똥별!"`
        : `대장간 앞, 브란이 혼자 세 놈을 상대하고 있다. "늦었잖아! 왼쪽 놈 맡아!"`,
    combat: { e: 'hollow', win: 'v_raid_smithy_win', lose: 'v_raid_lose' },
  },
  v_raid_smithy_win: {
    loc: 'village_raid',
    who: ['bran'],
    sp: 'bran',
    t: `마지막 그림자가 모루에 머리를 박고 흩어진다. 브란이 숨을 몰아쉬며 당신의 등을 친다.

"좋은 솜씨다." 그가 벽에서 무언가를 내린다. "이거 가져가. 내가 만든 것 중 제일 나은 놈이다." 그리고 대장간 너머로 신전 쪽을 본다. "아이들은… 이솔이 지켰겠지."`,
    fx: { flag: ['bran_respect', 'tomi_lost'], item: 'sword_fine' },
    next: 'v_raid_after',
  },
  v_raid_gate: {
    loc: 'village_raid',
    who: ['villager'],
    t: `당신은 마을 문 앞에 선다. 몰려오는 그림자들이 하나의 거대한 형체처럼 보인다. 등 뒤로 마을 사람들이 쇠스랑을 들고 떨고 있다.`,
    combat: { e: 'hollow_horde', win: 'v_raid_gate_win', lose: 'v_raid_lose' },
  },
  v_raid_gate_win: {
    loc: 'village_raid',
    who: ['villager', 'elder'],
    sp: 'elder',
    t: `그림자들의 물결이 당신 앞에서 부서진다. 마을 사람들이 함성을 지른다. 하윈 촌장이 다가와 당신의 손을 잡는다.

"그대가 문을 지켰소. 이 마을은 오늘 밤을 잊지 못할 거요." 하지만 그의 표정이 이내 어두워진다. "다만 이솔이 그러는데, 아이 하나가 숲으로 사라졌다는군. 토미라는 아이요."`,
    fx: { flag: ['village_hero', 'tomi_lost'], gold: 15, maxhp: 3 },
    next: 'v_raid_after',
  },
  v_raid_star: {
    loc: 'village_raid',
    who: ['villager', 'elder', 'isol'],
    t: `당신은 우물 위로 올라서서 가슴의 빛을 하늘로 쏘아 올린다. 은빛 기둥이 마을을 덮고, 그림자들이 녹아내린다. 마을 사람들이 무릎을 꿇는다.

그러나 빛이 너무 밝았다. 저 멀리, 아주 멀리 북쪽 어딘가에서 무언가가 그 빛을 보고 눈을 뜨는 느낌이 든다.

이솔이 달려와 당신을 부축한다. "괜찮아요? 그리고… 토미가 안 보여요. 숲 쪽으로 도망쳤대요."`,
    fx: { flag: ['village_hero', 'tomi_lost', 'morvain_noticed'], hp: -6, maxhp: 2 },
    next: 'v_raid_after',
  },
  v_raid_lose: {
    loc: 'village_raid',
    who: ['bran', 'isol'],
    t: `그림자의 손톱이 당신을 쓰러뜨린다. 시야가 흐려지는 가운데 은빛 빛줄기가 저절로 터져 나온다. 당신의 의지와 상관없이.

눈을 떴을 때 습격은 끝나 있다. 마을은 반쯤 불탔고, 사람들이 당신을 멀찍이서 바라본다. 감사와 두려움이 섞인 눈빛이다.`,
    fx: { hp: 10, flag: ['tomi_lost', 'star_awake'] },
    next: 'v_raid_after',
  },
  v_raid_after: {
    loc: 'village',
    chapter: '1막 · 새벽의 기사들',
    who: ['aldric', 'knight', 'elder'],
    sp: 'aldric',
    t: `새벽. 연기가 아직 피어오르는 마을로 은빛 갑옷의 기사들이 말을 타고 들어온다. 선두의 사내가 투구를 벗는다. 희끗한 머리, 흉터 진 얼굴.

"나는 은빛 기사단장 알드릭이다. 섭정 바렌 공작의 명으로 '별에서 떨어진 자'를 은빛성으로 모시러 왔다." 그는 불탄 마을을 둘러보고 잠시 입술을 깨문다. "…늦어서 미안하오, 촌장."

그의 시선이 당신에게 꽂힌다. "그대인가. 함께 가 주겠소? 거절은 권하지 않소."`,
    x: [[{ flag: 'village_hero' }, '마을 사람들이 당신 뒤로 모여든다. 누군가 외친다. "이분은 우리를 지켰어요!" 알드릭의 눈썹이 살짝 올라간다.']],
    c: [
      { t: '기사단을 따라 은빛성으로 간다', go: 'v_go_escort' },
      { t: '"저는 제 길을 가겠습니다." 정중히 거절한다', check: ['cha', 13], ok: 'v_aldric_respect', no: 'v_aldric_insist' },
      { t: '선왕 알드렌의 반지를 꺼내 보인다', req: { flag: 'aldren_ring' }, go: 'v_aldric_ring' },
      { t: '기사들이 쉬는 틈에 몰래 빠져나간다', check: ['dex', 12], ok: 'v_sneak_ok', no: 'v_sneak_no' },
    ],
  },
  v_aldric_ring: {
    loc: 'village',
    who: ['aldric', 'elder'],
    sp: 'aldric',
    t: `반지를 본 알드릭의 얼굴에서 핏기가 가신다. 그가 반지를 받아 손바닥 위에서 한참 바라본다.

"전하의 반지… 전하께선 이걸 손에서 빼신 적이 없었다. 돌아가신 밤에도." 그가 목소리를 낮춘다. "누가 이걸 가져갔단 말인가."

그는 반지를 당신에게 돌려준다. "섭정께는 그대를 찾지 못했다고 보고하겠소. 그대가 수도에 온다면, 나를 찾으시오. 이 반지에 대해 이야기해야겠소."`,
    fx: { flag: ['aldric_respect', 'aldric_doubt'], rep: { order: 1 }, journal: '알드릭 단장이 선왕의 반지를 보고 흔들렸다. 그는 진실을 알고 싶어 한다.' },
    next: 'v_depart',
  },
  v_aldric_respect: {
    loc: 'village',
    who: ['aldric', 'elder'],
    sp: 'aldric',
    t: `알드릭이 당신을 오래 바라본다. 그리고 불탄 지붕들, 당신 뒤에 선 마을 사람들을 본다.

"…명령은 데려오라는 것이었지, 끌고 오라는 것이 아니었소." 그가 투구를 다시 쓴다. "기사의 명예를 걸고 말하오. 그대가 스스로 수도에 온다면 내가 그대를 지키겠소. 그 전에 다른 자가 그대를 찾지 않기를 바라오."`,
    fx: { flag: 'aldric_respect', rep: { order: 1 } },
    next: 'v_depart',
  },
  v_aldric_insist: {
    loc: 'village',
    who: ['aldric', 'knight'],
    sp: 'aldric',
    t: `"유감이오." 알드릭이 손짓하자 기사 둘이 앞으로 나선다. "섭정의 명은 무르지 않소."`,
    c: [
      { t: '순순히 따른다', go: 'v_go_escort' },
      { t: '검을 뽑는다', go: 'v_knight_fight' },
    ],
  },
  v_knight_fight: {
    loc: 'village',
    who: ['aldric'],
    t: `기사 하나가 칼을 뽑아 든다. 알드릭이 외친다. "죽이지는 마라!"`,
    combat: { e: 'knight', win: 'v_knight_win', lose: 'v_knight_lose', flee: 'v_sneak_ok' },
  },
  v_knight_win: {
    loc: 'village',
    who: ['aldric', 'knight'],
    sp: 'aldric',
    t: `기사가 무릎을 꿇는다. 알드릭이 칼집에 손을 얹은 채 당신을 노려보다가, 천천히 손을 뗀다.

"강하군. 오늘은 물러서지. 하지만 그대는 은빛 기사단의 적이 되었소. 다음에 만날 땐 내가 직접 상대하겠소." 기사들이 말을 돌린다.`,
    fx: { flag: 'order_enemy', rep: { order: -2 } },
    next: 'v_depart',
  },
  v_knight_lose: {
    loc: 'village',
    who: ['aldric', 'knight'],
    sp: 'aldric',
    t: `칼등이 당신의 관자놀이를 친다. 정신이 돌아왔을 때 당신은 말 등에 묶여 있다. 알드릭이 옆에서 말을 몰며 말한다. "미안하오. 명령이오."`,
    fx: { flag: 'order_escort', hp: 4 },
    next: 'c_escort',
  },
  v_go_escort: {
    loc: 'village',
    who: ['aldric', 'elder'],
    sp: 'elder',
    t: `하윈이 당신의 손을 꼭 잡는다. "몸조심하시오. 섭정은… 겉과 속이 다른 사람이오." 그는 기사들이 듣지 못하게 속삭인다.

알드릭이 당신에게 말 한 필을 내준다. 은빛성까지는 이틀 길이다.`,
    fx: { flag: 'order_escort', rep: { order: 1 } },
    next: 'c_escort',
  },
  v_sneak_ok: {
    loc: 'village',
    t: `기사들이 말에게 물을 먹이는 사이, 당신은 불탄 헛간 뒤로 돌아 울타리를 넘는다. 아무도 눈치채지 못했다.`,
    fx: { flag: 'order_wanted' },
    next: 'v_depart',
  },
  v_sneak_no: {
    loc: 'village',
    who: ['aldric', 'knight'],
    sp: 'aldric',
    t: `울타리를 넘으려던 순간 굵은 손이 당신의 망토를 붙잡는다. 알드릭이 한숨을 쉰다. "도망칠 거라면 좀 더 잘하시오." 그는 당신을 말에 태운다.`,
    fx: { flag: 'order_escort' },
    next: 'c_escort',
  },
  v_depart: {
    loc: 'village',
    who: ['elder', 'isol'],
    sp: 'isol',
    t: `마을 사람들이 문 앞까지 배웅을 나온다. 마고가 빵 꾸러미를, 하윈이 지팡이로 북쪽 길을 가리킨다.

이솔이 당신의 손을 잡는다. "토미를… 혹시 숲에서 보게 되면. 부탁해요."

길은 갈림길로 이어진다. 당신의 진짜 여정이 시작된다.`,
    fx: { item: 'potion', journal: '가시골을 떠났다. 숲으로 사라진 아이 토미를 찾아 달라는 부탁을 받았다.' },
    next: 'x_cross',
    nextLabel: '길을 떠난다',
  },
};
