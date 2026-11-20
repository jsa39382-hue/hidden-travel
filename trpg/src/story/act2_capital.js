// 2막: 은빛성. 섭정 바렌, 은빛 기사단, 잿빛 손
export default {
  c_escort: {
    loc: 'capital',
    chapter: '2막 · 은빛성',
    who: ['aldric', 'knight'],
    sp: 'aldric',
    t: `이틀 뒤, 은빛성. 하얀 돌로 쌓은 성벽이 햇빛에 눈부시다. 그러나 성문 안 거리는 생각보다 어둡다. 상점 절반은 문을 닫았고, 벽마다 '세금 미납자 명단'이 붙어 있다.

알드릭이 말 위에서 말한다. "섭정 전하께서 곧바로 그대를 보고 싶어 하시오." 그리고 조금 망설이다 덧붙인다. "…무엇을 보든, 말은 아끼시오."`,
    fx: { flag: 'capital_entered' },
    next: 'c_audience',
    nextLabel: '성으로 들어간다',
  },
  c_enter: {
    loc: 'capital',
    chapter: '2막 · 은빛성',
    who: ['guard'],
    sp: 'guard',
    t: `은빛성의 성문. 하얀 돌로 쌓은 성벽이 햇빛에 눈부시다. 성문 앞에는 들어가려는 사람들이 길게 줄을 서 있고, 경비병들이 짐을 뒤지며 '통행세'를 걷는다.

차례가 오자 경비병이 당신을 위아래로 훑는다. "통행세 금화 열 닢. 없으면 돌아가."`,
    x: [[{ flag: 'order_wanted' }, '경비병의 눈이 성문 기둥에 붙은 수배지와 당신 얼굴을 오간다. 수배지에는 \'별에서 떨어진 자\'라고 적혀 있다.']],
    c: [
      { t: '금화 열 닢을 낸다', req: { gold: 10 }, fx: { gold: -10 }, go: 'c_plaza_first' },
      { t: '"순례자입니다. 대성당에 기도하러 왔어요."', check: ['cha', 12], ok: 'c_plaza_first', no: 'c_gate_fail' },
      { t: '줄에서 빠져나와 성벽 아래 하수구로 간다', req: { item: 'hand_token' }, go: 'c_sewer' },
      { t: '경비병 몰래 수레 짐칸에 숨어든다', check: ['dex', 13], ok: 'c_plaza_first', no: 'c_gate_fail' },
    ],
  },
  c_gate_fail: {
    loc: 'capital',
    who: ['guard'],
    sp: 'guard',
    t: `"수작 부리지 마." 경비병이 창끝으로 당신을 밀어낸다. "돈을 가져오든가 꺼지든가."`,
    c: [
      { t: '금화 열다섯 닢을 쥐여 준다', req: { gold: 15 }, fx: { gold: -15 }, go: 'c_plaza_first' },
      { t: '성벽을 따라 걷다 하수구 입구를 찾는다', go: 'c_sewer' },
      { t: '갈림길로 돌아간다', go: 'x_cross' },
    ],
  },
  c_sewer: {
    loc: 'capital_night',
    who: ['nyx'],
    sp: 'nyx',
    t: (s) =>
      s.items.hand_token
        ? `하수구 철창 앞에서 동전을 꺼내 들자 어둠 속에서 손 하나가 불쑥 나와 동전을 낚아챈다.

"기억력이 좋네, 별손님." 닉스다. 그녀가 철창을 소리 없이 연다. "따라와. 두목이 기다리고 있었어."`
        : `악취가 진동하는 하수구. 미끄러운 벽을 짚고 한참을 걷자 어둠 속에서 칼날이 목에 닿는다.

"길 잃었어?" 후드를 쓴 여자다. 그녀가 당신의 얼굴을 보고 칼을 내린다. "아, 별손님이구나. 나는 닉스. 잘 왔어. 두목이 당신을 보고 싶어 해."`,
    fx: { flag: ['capital_entered', 'met_nyx'] },
    next: 'c_hideout',
  },
  c_plaza_first: {
    loc: 'capital',
    t: `성문 안 거리는 생각보다 어둡다. 상점 절반은 문을 닫았고, 벽마다 '세금 미납자 명단'이 붙어 있다. 광장 한가운데 선왕 알드렌의 동상이 있는데, 누군가 동상의 눈에 재를 발라 놓았다.

멀리 언덕 위에 은빛 성이, 그 옆에 대성당의 첨탑이 보인다.`,
    fx: { flag: 'capital_entered' },
    next: 'c_plaza',
  },
  c_plaza: {
    loc: 'capital',
    chapter: '2막 · 은빛성',
    t: (s) =>
      s.flags.varen_proof
        ? '광장. 당신은 이제 섭정의 비밀을 알고 있다. 거리의 사람들이 아무것도 모른 채 지나간다.'
        : '은빛성의 광장. 성, 뒷골목, 선술집, 대성당이 모두 이 광장에서 이어진다.',
    fx: { flag: 'capital_entered' },
    c: [
      { t: '언덕 위의 성으로 간다', go: 'c_audience', at: 'castle', req: { not: ['audience_done', 'order_escort'] } },
      { t: '뒷골목으로 간다', go: 'c_slums', at: 'slums' },
      { t: '선술집 \'은빛 잔\'', go: 'c_tavern', at: 'tavern' },
      { t: '대성당', go: 'c_cathedral', at: 'cathedral' },
      { t: '밤이 되길 기다려 대성당에 숨어든다', req: { flag: 'heist_ready' }, go: 'c_heist', at: 'cathedral' },
      { t: '알드릭과 함께 밤의 대성당을 지켜본다', req: { flag: 'stakeout_ready' }, go: 'c_stakeout', at: 'cathedral' },
      { t: '바렌의 밀서를 들고 알드릭을 찾아간다', req: { item: 'varen_letter', not: 'aldric_turned' }, go: 'c_letter_aldric' },
      { t: '왕좌의 방으로 쳐들어간다', req: { flag: 'ready_to_confront' }, go: 'c_throne_confront', at: 'castle' },
      { t: '도성을 떠난다', go: 'x_cross', at: 'gate' },
    ],
  },

  // ── 섭정 알현
  c_audience: {
    loc: 'throne',
    who: ['varen', 'aldric'],
    sp: 'varen',
    t: `왕좌의 방. 높은 창으로 들어온 빛이 붉은 융단 위에 떨어진다. 왕좌 옆, 한 단 낮은 의자에 검은 비단옷의 사내가 앉아 있다. 왕좌는 비어 있다.

"오, 드디어." 섭정 바렌 공작이 두 팔을 벌리며 일어선다. 목소리가 꿀처럼 부드럽다. "별에서 떨어진 손님! 그대의 이야기는 온 도성에 퍼졌소. 공허의 짐승들이 그대를 노린다고 하니 걱정이 이만저만이 아니었지.

이 성에 머무시오. 가장 좋은 방과 가장 강한 기사들을 내어 드리리다. 그대가 모은 것이 있다면… 성의 금고가 가장 안전할 것이고."`,
    fx: { flag: ['audience_done', 'capital_entered'] },
    c: [
      { t: '섭정의 손가락에 낀 반지를 살핀다', check: ['int', 13], ok: 'c_sigil', no: 'c_sigil_fail', once: true },
      { t: '"감사합니다. 머물겠습니다."', go: 'c_guest' },
      { t: '"고맙지만 제 길은 제가 가겠습니다."', check: ['cha', 13], ok: 'c_audience_leave', no: 'c_audience_force' },
      { t: '선왕 알드렌의 반지를 꺼내 보인다', req: { flag: 'aldren_ring' }, go: 'c_ring_varen' },
    ],
  },
  c_sigil: {
    loc: 'throne',
    who: ['varen', 'aldric'],
    t: `바렌이 손짓할 때마다 그의 인장 반지가 빛을 받는다. 겉은 왕실 문장인데, 각도가 바뀌자 그 아래로 다른 문양이 비친다. 보랏빛 눈 하나.

당신은 그 눈을 본 적이 있다. 별빛 속 환상에서, 보랏빛 로브의 사내가 들고 있던 지팡이 끝에서.`,
    fx: { flag: 'varen_suspect', journal: '섭정 바렌의 반지 아래 숨은 보랏빛 눈 문양. 모르베인의 표식이다.' },
    next: 'c_audience',
  },
  c_sigil_fail: {
    loc: 'throne',
    who: ['varen', 'aldric'],
    t: `섭정의 반지는 그저 화려한 왕실 반지로 보인다. 그의 미소에는 빈틈이 없다.`,
    next: 'c_audience',
  },
  c_audience_leave: {
    loc: 'throne',
    who: ['varen', 'aldric'],
    sp: 'varen',
    t: `바렌의 미소가 아주 잠깐 굳는다. 그리고 다시 부드러워진다.

"물론이오, 물론이지. 손님의 뜻을 꺾을 수는 없지." 그가 알드릭에게 눈짓한다. "단장, 손님을 정중히 배웅하게."

성문을 나서며 알드릭이 낮게 말한다. "섭정 전하께서 저렇게 웃으실 땐 조심하시오. 오늘 밤 그대 숙소 근처엔 내 기사들을 두겠소."`,
    fx: { flag: ['varen_wary'], rep: { order: 1 } },
    next: 'c_plaza',
  },
  c_audience_force: {
    loc: 'throne',
    who: ['varen', 'aldric'],
    sp: 'varen',
    t: `"아, 그대는 아직 지쳐서 판단이 흐린 모양이오." 바렌이 손뼉을 친다. 기사 넷이 당신의 양옆에 선다. "손님 방으로 모셔라. 푹 쉬면 생각이 바뀔 거요."`,
    next: 'c_guest',
  },
  c_ring_varen: {
    loc: 'throne',
    who: ['varen', 'aldric'],
    sp: 'varen',
    t: `반지를 본 순간 바렌의 얼굴에서 모든 표정이 사라진다. 그 짧은 정적 속에서, 알드릭이 반지와 섭정의 얼굴을 번갈아 보는 것이 느껴진다.

"…훔친 물건을 왕좌 앞에 내밀다니." 바렌의 목소리가 차가워진다. "선왕 전하의 유품을 도둑질한 자다. 감옥에 가둬라!"

알드릭이 머뭇거린다. 아주 잠깐. 그러나 명령은 명령이다.`,
    fx: { flag: ['varen_knows', 'aldric_doubt'], journal: '바렌이 선왕의 반지를 보고 나를 감옥에 가뒀다. 알드릭이 그 반응을 보았다.' },
    next: 'c_dungeon',
  },
  c_guest: {
    loc: 'capital_night',
    who: [],
    t: `손님 방은 호화롭다. 비단 이불, 은 촛대, 과일과 포도주. 그런데 문밖에서 열쇠 잠그는 소리가 난다.

밤이 깊어진다. 창밖으로 대성당의 첨탑이 보이고, 복도에서 낮은 목소리들이 들린다.`,
    c: [
      { t: '포도주를 마시고 잠든다', go: 'c_drugged' },
      { t: '문에 귀를 대고 엿듣는다', check: ['dex', 11], ok: 'c_overhear', no: 'c_dungeon_taken' },
      { t: '창문을 열고 지붕으로 빠져나간다', check: ['dex', 13], ok: 'c_window', no: 'c_dungeon_taken' },
      { t: '자물쇠를 딴다', req: { item: 'lockpick' }, go: 'c_window' },
    ],
  },
  c_drugged: {
    loc: 'capital_night',
    t: `포도주는 달콤했다. 너무 달콤했다. 혀끝이 마비되는 것을 느꼈을 때는 이미 늦었다. 시야가 기울어진다. 누군가 문을 열고 들어온다.`,
    fx: { hp: -4 },
    next: 'c_dungeon',
  },
  c_overhear: {
    loc: 'capital_night',
    t: `문틈으로 바렌의 목소리가 들린다. 누군가와 이야기하고 있다.

"…그래, 그릇은 손에 넣었다. 아직 조각은 다 모으지 않았지만. 모르베인 님께 전해라. 조각이 다 모이면 탑으로 보내겠다고. 대신 약속대로 왕좌는…"

다른 목소리가 대답한다. 사람의 목소리라기엔 너무 차갑다. "주인님은 약속을 지키신다. 선왕 때도 그랬지 않느냐."

발소리가 가까워진다.`,
    fx: { flag: ['varen_proof', 'varen_suspect'], journal: '바렌이 모르베인의 하수인과 이야기하는 것을 엿들었다. 선왕의 죽음에 둘이 엮여 있다.' },
    c: [
      { t: '침대로 돌아가 자는 척한다', go: 'c_dungeon_taken' },
      { t: '창문으로 뛰어내린다', check: ['dex', 12], ok: 'c_window', no: 'c_dungeon_taken' },
    ],
  },
  c_window: {
    loc: 'capital_night',
    t: `창틀을 넘어 지붕 위로 올라선다. 기와를 밟고 달려 성벽 아래 골목으로 뛰어내린다. 등 뒤에서 종이 울린다. 당신이 사라진 것을 알아챈 것이다.

골목 어둠 속에서 누군가 손짓한다. "이쪽!"`,
    fx: { flag: 'escaped_castle' },
    next: 'c_sewer',
  },
  c_dungeon_taken: {
    loc: 'capital_night',
    t: `문이 벌컥 열리고 기사들이 들이닥친다. 저항할 틈도 없이 머리에 자루가 씌워진다.`,
    next: 'c_dungeon',
  },
  c_dungeon: {
    loc: 'dungeon',
    chapter: '2막 · 지하 감옥',
    t: `차가운 돌바닥에서 눈을 뜬다. 지하 감옥. 횃불 하나가 철창 너머 복도를 밝히고, 어딘가에서 물방울 떨어지는 소리가 들린다. 소지품은… 다행히 거의 그대로다. 섭정은 당신을 오래 가둬 둘 생각이 아닌 모양이다. 조각이 다 모일 때까지만.`,
    c: [
      { t: '자물쇠를 딴다', req: { item: 'lockpick' }, check: ['dex', 11], ok: 'c_jail_escape', no: 'c_jail_wait' },
      { t: '핀이 철창 밖에서 씩 웃는다', req: { comp: 'finn' }, go: 'c_jail_finn_comp' },
      { t: '복도에서 낯익은 휘파람 소리가 들린다', req: { flag: 'finn_freed', noComp: 'finn' }, go: 'c_jail_finn' },
      { t: '별빛으로 철창을 녹인다', req: { flag: 'star_awake' }, fx: { hp: -5 }, go: 'c_jail_escape' },
      { t: '기다린다', go: 'c_jail_wait' },
    ],
  },
  c_jail_finn_comp: {
    loc: 'dungeon',
    who: ['finn'],
    sp: 'finn',
    t: `핀이 철창 밖에서 자물쇠 따개를 흔든다. "날 같이 잡아 넣었어야지. 따로 가뒀으니 내가 먼저 나왔잖아." 찰칵. 문이 열린다. "자, 하수구로 가자. 냄새는 내가 책임 못 져."`,
    next: 'c_jail_escape',
  },
  c_jail_finn: {
    loc: 'dungeon',
    who: ['finn'],
    sp: 'finn',
    t: `철창 너머로 곱슬머리가 쏙 나타난다. 가시골 장터의 그 하플링, 핀이다.

"갚는다고 했지? 별손님이 잡혀 들어갔다는 소문 듣고 바로 왔어." 찰칵. 철창이 열린다. 핀이 씩 웃는다. "그리고 말이야… 혹시 동료 자리 남았어?"`,
    c: [
      { t: '"물론이지. 같이 가자."', fx: { comp: 'finn' }, go: 'c_jail_escape' },
      { t: '"고마워. 하지만 위험한 길이야."', go: 'c_jail_escape' },
    ],
  },
  c_jail_escape: {
    loc: 'dungeon',
    t: `복도를 따라 달린다. 경비가 졸고 있는 초소를 지나, 녹슨 배수구 철망을 들어 올리자 하수구로 이어지는 통로가 나온다.`,
    fx: { flag: 'escaped_jail' },
    next: 'c_sewer',
  },
  c_jail_wait: {
    loc: 'dungeon',
    who: ['aldric'],
    sp: 'aldric',
    t: `몇 시간이 흘렀을까. 철컥, 철컥. 갑옷 소리가 가까워진다. 알드릭이 혼자 철창 앞에 선다. 그의 얼굴에 피곤이 가득하다.

"그대에게 묻겠소. 솔직히 대답하시오." 그가 목소리를 낮춘다. "섭정 전하께서 그대를 두려워하시는 이유가 뭐요?"`,
    c: [
      { t: '선왕의 반지 이야기를 한다', req: { flag: 'aldren_ring' }, go: 'c_aldric_free' },
      { t: '엿들은 대화를 그대로 전한다', req: { flag: 'varen_proof' }, go: 'c_aldric_free' },
      { t: '"섭정은 모르베인과 손을 잡았어요. 선왕을 죽인 것도 그들이에요."', check: ['cha', 13], ok: 'c_aldric_free', no: 'c_aldric_leave' },
      { t: '입을 다문다', go: 'c_aldric_leave' },
    ],
  },
  c_aldric_free: {
    loc: 'dungeon',
    who: ['aldric'],
    sp: 'aldric',
    t: `알드릭이 오래 침묵한다. 그의 손이 칼자루 위에서 떨린다.

"나는 선왕 전하께 충성을 맹세했소. 섭정이 아니라." 그가 열쇠를 꺼내 철창을 연다. "그대의 말이 사실이라면 증거가 필요하오. 기사단은 증거 없이 섭정에게 칼을 겨눌 수 없소.

섭정 전하께서는 매일 밤 자정, 혼자 대성당 금고에 가신다. 무엇을 하시는지는 아무도 모르지. 그곳을 지켜보면 무언가 알 수 있을 거요." 그가 망토를 벗어 당신에게 덮어 준다. "이걸 쓰고 나가시오. 내일 밤 자정, 대성당 뒤에서 기다리겠소."`,
    fx: { flag: ['aldric_doubt', 'stakeout_ready', 'escaped_jail'], rep: { order: 1 }, journal: '알드릭이 나를 풀어 주었다. 자정에 대성당 금고를 함께 지켜보기로 했다.' },
    next: 'c_plaza',
  },
  c_aldric_leave: {
    loc: 'dungeon',
    who: ['aldric'],
    sp: 'aldric',
    t: `알드릭이 한숨을 쉬고 돌아선다. "그렇다면 나도 할 말이 없소."

그가 떠나고 한참 뒤, 천장의 돌 하나가 조용히 들린다. 후드 쓴 얼굴이 내려다본다. "잿빛 손의 특급 배송이야. 올라와." 닉스다.`,
    fx: { flag: 'escaped_jail' },
    next: 'c_hideout',
  },

  // ── 뒷골목과 잿빛 손
  c_slums: {
    loc: 'capital_night',
    t: `뒷골목. 햇빛도 이곳까진 들지 않는다. 빨래가 골목 위를 가로지르고, 아이들이 맨발로 뛰어다닌다. 벽마다 재로 그린 손바닥 문양이 찍혀 있다.

모퉁이를 돌자 험상궂은 사내 둘이 길을 막는다. "여긴 길 잃은 귀족 나리가 올 데가 아닌데."`,
    c: [
      { t: '잿빛 손 증표를 보여 준다', req: { item: 'hand_token' }, go: 'c_hideout' },
      { t: '"닉스를 찾아왔어요."', req: { any: [{ flag: 'met_nyx' }, { visited: 'v_hood' }] }, go: 'c_hideout' },
      { t: '금화 다섯 닢을 던져 준다', req: { gold: 5 }, fx: { gold: -5 }, go: 'c_slums_pass' },
      { t: '"비켜."', go: 'c_slums_fight' },
      { t: '광장으로 돌아간다', go: 'c_plaza' },
    ],
  },
  c_slums_pass: {
    loc: 'capital_night',
    t: `사내들이 동전을 받아 들고 길을 비킨다. 그중 하나가 낄낄거린다. "별손님이구먼. 두목이 찾던 사람이야. 저 끝 빨간 문으로 가."`,
    next: 'c_hideout',
  },
  c_slums_fight: {
    loc: 'capital_night',
    t: `사내들이 칼을 뽑는다.`,
    combat: { e: 'thug', win: 'c_slums_win', lose: 'c_slums_lose', flee: 'c_plaza' },
  },
  c_slums_win: {
    loc: 'capital_night',
    who: ['nyx'],
    sp: 'nyx',
    t: `사내들이 바닥에 뒹군다. 박수 소리. 지붕 위에서 후드 쓴 여자가 내려온다.

"우리 애들을 이렇게 쉽게 눕히다니. 두목이 좋아하겠어." 닉스다. "따라와."`,
    fx: { flag: 'met_nyx' },
    next: 'c_hideout',
  },
  c_slums_lose: {
    loc: 'capital_night',
    who: ['nyx'],
    sp: 'nyx',
    t: `바닥에 쓰러진 당신 위로 후드 쓴 여자가 쪼그려 앉는다. "됐어, 그만. 이 사람 손님이야." 그녀가 당신을 일으킨다. "나는 닉스. 우리 애들이 좀 거칠지? 따라와."`,
    fx: { hp: 5, flag: 'met_nyx' },
    next: 'c_hideout',
  },
  c_hideout: {
    loc: 'hideout',
    chapter: '2막 · 잿빛 손',
    who: ['kael', 'nyx'],
    sp: 'kael',
    t: (s) =>
      s.visited.c_hideout > 1
        ? '은신처. 카엘이 지도 위에 단검을 꽂아 두고 당신을 기다리고 있다. "결정했나?"'
        : `낡은 창고 지하. 촛불 아래 지도와 무기, 빵 바구니가 뒤섞여 있다. 여기저기 누더기 차림의 사람들이 잠들어 있다. 대부분 아이와 노인이다.

지도 앞의 사내가 고개를 든다. 검은 머리, 날카로운 턱, 놀랄 만큼 부드러운 눈.

"카엘이다. 잿빛 손의 두목이라고들 하지. 사실은 이 사람들 밥 당번이고." 그가 잠든 아이들을 턱으로 가리킨다. "섭정이 세금을 두 배로 올린 뒤로 이렇게 됐다.

단도직입적으로 말하지. 은빛 조각은 대성당 금고에 있다. 우린 그걸 훔쳐서, 섭정이 모르베인의 개라는 걸 온 도성에 보여 줄 거다. 네가 필요해."`,
    c: [
      { t: '"함께하겠어요."', go: 'c_heist_plan', fx: { rep: { hand: 2 }, flag: 'hand_join' }, req: { not: 'hand_join' } },
      { t: '"섭정이 모르베인과 손잡았다는 증거가 있나요?"', go: 'c_kael_proof', once: true },
      { t: '"왜 왕관을 원하죠? 당신도 왕이 되고 싶은 건가요?"', go: 'c_kael_why', once: true },
      { t: '"생각해 볼게요."', go: 'c_plaza', req: { not: 'hand_join' } },
      { t: '계획대로 움직인다', go: 'c_plaza', req: { flag: 'hand_join' } },
    ],
  },
  c_kael_proof: {
    loc: 'hideout',
    who: ['kael', 'nyx'],
    sp: 'kael',
    t: `카엘이 탁자 위에 찢어진 편지 조각을 내놓는다. 보랏빛 밀랍.

"섭정에게 가던 전령을 털었다. 편지 대부분은 불탔지만, 이 부분은 남았지. '…선왕의 숨이 멎은 밤처럼, 조용히…'

섭정은 매일 밤 자정, 혼자 대성당 금고로 간다. 거기서 누군가를 만나. 우린 그게 누군지 보고 싶은 거다."`,
    fx: { flag: 'know_meeting', journal: '섭정 바렌은 매일 밤 자정, 혼자 대성당 금고에서 누군가를 만난다.' },
    next: 'c_hideout',
  },
  c_kael_why: {
    loc: 'hideout',
    who: ['kael', 'nyx'],
    sp: 'kael',
    t: `카엘이 웃는다. 처음으로 진짜 웃음이다.

"왕? 왕이 십 년 동안 없었는데 세상이 더 나빠진 건 왕이 없어서가 아니다. 왕좌 옆에 앉은 놈 때문이지." 그가 잠든 아이를 담요로 덮어 준다. "나는 왕관이 누구 머리에도 안 올라갔으면 좋겠다. 장막은 지키되, 그 대가로 누가 누구 위에 서는 일은 없었으면 해. 그게 가능한지는 모르겠지만."`,
    fx: { flag: 'kael_dream' },
    next: 'c_hideout',
  },
  c_heist_plan: {
    loc: 'hideout',
    who: ['kael', 'nyx'],
    sp: 'kael',
    t: `카엘이 지도 위에 단검으로 대성당을 짚는다.

"자정. 섭정이 금고로 내려가면, 우리가 들어간다. 길은 셋이다. 지붕의 종탑 창, 성가대로 변장해 정문, 아니면 하수구에서 지하로.

닉스와 내 애들이 밖에서 경비를 돌려놓겠다. 안에서는 네가 움직여야 해. 섭정이 누굴 만나는지 보고, 조각을 들고 나와."`,
    fx: { flag: 'heist_ready', journal: '잿빛 손과 함께 자정에 대성당 금고에 잠입하기로 했다.' },
    next: 'c_plaza',
    nextLabel: '광장으로 나간다',
  },

  // ── 선술집
  c_tavern: {
    loc: 'tavern',
    t: (s) =>
      `'은빛 잔' 선술집. 기사들과 상인들이 섞여 시끄럽게 떠든다. 구석 탁자에서는 팔씨름 내기가 한창이다.` +
      (!s.flags.order_enemy && !s.flags.aldric_turned ? '\n\n창가 자리에 알드릭이 혼자 앉아 잔을 비우고 있다. 갑옷 대신 수수한 옷차림이다.' : ''),
    c: [
      { t: '알드릭의 맞은편에 앉는다', req: { not: ['order_enemy', 'aldric_turned', 'stakeout_ready'] }, go: 'c_aldric_talk' },
      { t: '팔씨름 내기에 끼어든다 (금화 5)', req: { gold: 5, not: 'arm_done' }, check: ['str', 12], ok: 'c_arm_win', no: 'c_arm_lose' },
      { t: '사람들의 이야기를 엿듣는다', go: 'c_tavern_rumor', once: true },
      { t: '구운 고기와 맥주를 시킨다 (금화 3)', req: { gold: 3 }, fx: { gold: -3, hp: 8 }, go: 'c_tavern' },
      { t: '선술집을 나선다', go: 'c_plaza' },
    ],
  },
  c_arm_win: {
    loc: 'tavern',
    t: `상대의 손등이 탁자에 쾅 부딪힌다. 술집이 함성으로 가득 찬다. 판돈이 당신 앞으로 밀려온다.`,
    fx: { gold: 15, flag: 'arm_done' },
    next: 'c_tavern',
  },
  c_arm_lose: {
    loc: 'tavern',
    t: `팔이 꺾일 듯 넘어간다. 상대가 껄껄 웃으며 판돈을 쓸어 간다. "별에서 온 사람도 별거 없구먼!"`,
    fx: { gold: -5, flag: 'arm_done' },
    next: 'c_tavern',
  },
  c_tavern_rumor: {
    loc: 'tavern',
    t: `"…대주교 오스린 말이야, 요새 성당 문을 밤마다 잠근대. 섭정이 시켰다나."

"검은 탑 봤어? 북쪽 하늘에. 탑 꼭대기에서 보랏빛 번개가 친대."

"잿빛 손 놈들이 또 곡식 창고를 털어서 빈민가에 뿌렸다더라. 기사단장이 일부러 늦게 출동했다는 소문도 있고."`,
    fx: { flag: 'know_meeting' },
    next: 'c_tavern',
  },
  c_aldric_talk: {
    loc: 'tavern',
    who: ['aldric'],
    sp: 'aldric',
    t: (s) =>
      s.flags.aldric_respect
        ? '알드릭이 고개를 든다. "그대로군. 스스로 왔소?" 그가 맞은편 의자를 발로 밀어 준다. "앉으시오. 나도 묻고 싶은 게 있었소."'
        : '알드릭이 당신을 알아보고 한숨을 쉰다. "여기서 뭘 하시오. 섭정 전하께서 그대를 찾고 계시오." 그러나 그는 일어서지 않는다.',
    c: [
      { t: '선왕의 반지를 탁자 위에 올려놓는다', req: { flag: 'aldren_ring' }, go: 'c_aldric_convinced' },
      { t: '엿들은 섭정의 대화를 전한다', req: { flag: 'varen_proof' }, go: 'c_aldric_convinced' },
      { t: '"섭정을 의심해 본 적 없어요?"', check: ['cha', 13], ok: 'c_aldric_convinced', no: 'c_aldric_wall' },
      { t: '잔을 부딪치고 일어선다', go: 'c_tavern' },
    ],
  },
  c_aldric_convinced: {
    loc: 'tavern',
    who: ['aldric'],
    sp: 'aldric',
    t: `알드릭이 잔을 내려놓는다. 오래, 아주 오래 탁자를 내려다본다.

"…선왕 전하께서 돌아가신 밤, 나는 문 앞을 지키고 있었소. 섭정과 궁정 마법사가 들어갔다 나왔고, 한 시간 뒤 전하께서 숨을 거두셨지. 병이라고 했소. 나는 믿었소. 믿고 싶었소." 그가 고개를 든다. 눈이 젖어 있다.

"섭정은 매일 밤 자정 대성당 금고에 가오. 내일 밤 나와 함께 그곳을 지켜봅시다. 무엇을 보든, 기사의 이름으로 진실을 따르겠소."`,
    fx: { flag: ['aldric_doubt', 'stakeout_ready'], rep: { order: 2 }, journal: '알드릭이 의심을 품었다. 자정에 대성당 금고를 함께 지켜보기로 했다.' },
    next: 'c_tavern',
  },
  c_aldric_wall: {
    loc: 'tavern',
    who: ['aldric'],
    sp: 'aldric',
    t: `"말조심하시오." 알드릭의 눈빛이 굳는다. "섭정 전하는 십 년 동안 이 나라를 지탱하신 분이오. 증거 없는 말은 반역이오." 그가 동전을 탁자에 던지고 일어선다.`,
    next: 'c_tavern',
  },

  // ── 대성당
  c_cathedral: {
    loc: 'cathedral',
    who: ['priest'],
    sp: 'priest',
    t: `대성당. 천장이 하늘만큼 높고, 스테인드글라스로 들어온 빛이 바닥에 무지개를 그린다. 제단 뒤편 유리관 속에서 은빛 조각이 희미하게 빛난다.

늙은 대주교가 다가온다. "나는 대주교 오스린이오. 순례자여, 무엇을 찾으시오?" 그의 눈 밑이 검다. 잠을 못 잔 얼굴이다.`,
    c: [
      { t: '유리관의 은빛 조각을 본다', go: 'c_relic', once: true },
      { t: '"요즘 밤마다 성당을 잠근다고 들었어요."', check: ['cha', 12], ok: 'c_osrin_talk', no: 'c_osrin_silent', once: true },
      { t: '성당지기에게 금고 열쇠를 산다 (금화 25)', req: { gold: 25, flag: 'know_meeting', noItem: 'silver_key' }, fx: { gold: -25, item: 'silver_key' }, go: 'c_cathedral' },
      { t: '제단 앞에서 기도한다', go: 'c_pray', once: true },
      { t: '대성당을 나선다', go: 'c_plaza' },
    ],
  },
  c_relic: {
    loc: 'cathedral',
    who: ['priest'],
    t: `유리관에 다가가자 가슴의 빛이 요동친다. 은빛 조각도 대답하듯 밝아진다. 그런데 무언가 이상하다. 조각 주위로 보랏빛 실 같은 것이 얽혀 있다. 누군가 조각에 무언가를 걸어 두었다.

대주교가 당신과 조각을 번갈아 보며 낮게 숨을 들이켠다.`,
    fx: { flag: 'seen_relic' },
    next: 'c_cathedral',
  },
  c_osrin_talk: {
    loc: 'cathedral',
    who: ['priest'],
    sp: 'priest',
    t: `대주교가 주위를 살피고 목소리를 낮춘다.

"섭정 전하의 명이오. 자정마다 전하께서 홀로 금고에 드시는데, 그 시간에 성당에 아무도 있어선 안 된다 하셨소. 한번은 문틈으로… 아니오, 아무것도 아니오." 그의 손이 떨린다.

"보랏빛 불이었소. 신의 집에서 보랏빛 불이 타올랐소." 그가 성호를 긋는다. "나는 늙고 겁이 많소. 젊은 그대라면 다를지도."`,
    fx: { flag: 'know_meeting' },
    next: 'c_cathedral',
  },
  c_osrin_silent: {
    loc: 'cathedral',
    who: ['priest'],
    sp: 'priest',
    t: `"성당의 일은 성당의 일이오." 대주교가 시선을 피한다. "기도하러 오셨다면 기도만 하시오."`,
    next: 'c_cathedral',
  },
  c_pray: {
    loc: 'cathedral',
    t: `제단 앞에 무릎을 꿇는다. 스테인드글라스의 빛이 당신의 어깨에 내려앉는다. 따뜻하다.`,
    fx: { heal: 'full' },
    next: 'c_cathedral',
  },

  // ── 자정의 대성당
  c_stakeout: {
    loc: 'capital_night',
    chapter: '2막 · 자정의 대성당',
    who: ['aldric'],
    sp: 'aldric',
    t: `자정. 대성당 뒤편 그림자 속에서 알드릭이 기다리고 있다. 갑옷 대신 검은 망토 차림이다.

"섭정 전하께서 방금 들어가셨소. 혼자." 그가 성당 옆 작은 문을 가리킨다. "기사단장의 열쇠로 열리는 문이오. 금고 위 회랑으로 이어지지. 소리 내지 마시오."`,
    fx: { flag: 'with_aldric' },
    next: 'c_vault',
    nextLabel: '회랑으로 숨어든다',
  },
  c_heist: {
    loc: 'capital_night',
    chapter: '2막 · 자정의 대성당',
    who: ['nyx'],
    sp: 'nyx',
    t: `자정. 대성당 주변 골목에서 갑자기 불길이 치솟는다. 잿빛 손의 미끼다. 경비들이 우르르 그쪽으로 달려간다.

닉스가 당신 옆에서 속삭인다. "섭정은 방금 들어갔어. 이제 네 차례야. 어디로 갈래?"`,
    c: [
      { t: '종탑 벽을 타고 지붕 창으로', check: ['dex', 14], ok: 'c_vault', no: 'c_heist_caught' },
      { t: '성가대 옷을 입고 정문으로', check: ['cha', 13], ok: 'c_vault', no: 'c_heist_caught' },
      { t: '하수구 철창을 비틀어 지하로', check: ['str', 12], ok: 'c_vault', no: 'c_heist_caught' },
      { t: '은빛 열쇠로 옆문을 연다', req: { item: 'silver_key' }, go: 'c_vault' },
      { t: '핀이 뒷문 자물쇠를 딴다', req: { comp: 'finn' }, go: 'c_vault' },
    ],
  },
  c_heist_caught: {
    loc: 'capital_night',
    t: `발이 미끄러진다. 쨍그랑. 기사 하나가 소리를 듣고 칼을 뽑아 든다. "누구냐!"`,
    combat: { e: 'knight', win: 'c_vault', lose: 'c_dungeon', flee: 'c_hideout' },
  },
  c_vault: {
    loc: 'vault',
    who: ['varen'],
    t: (s) =>
      `금고 위 회랑. 난간 너머로 아래를 내려다본다. 섭정 바렌이 은빛 조각이 든 유리관 앞에 무릎을 꿇고 있다. 그 앞 허공에 보랏빛 불꽃이 피어올라 사람의 형상을 만든다. 키가 크고, 로브를 입은 사내.

"모르베인 님." 바렌이 고개를 조아린다. "그릇은 도성에 들어왔습니다. 조각이 다 모이면 탑으로 보내겠습니다."

불꽃의 형상이 웃는다. 당신이 환상 속에서 들었던 그 웃음이다. "잘했다, 바렌. 선왕의 숨을 거둔 그 밤처럼, 조용히 처리하라. 그러면 왕좌는 영원히 네 것이다."

형상이 흩어진다. 바렌이 일어서며 품에서 편지 한 통을 꺼내 탁자 위 촛불 옆에 놓는다.` +
      (s.flags.with_aldric ? '\n\n옆에서 알드릭의 숨소리가 거칠어진다. 그의 손이 칼자루를 으스러지게 쥐고 있다.' : ''),
    fx: { flag: ['varen_proof', 'varen_suspect'], journal: '자정의 대성당. 바렌이 모르베인의 환영 앞에 무릎 꿇었다. 선왕은 그들 손에 죽었다.' },
    c: [
      { t: '알드릭과 함께 뛰어내린다', req: { flag: 'with_aldric' }, go: 'c_aldric_turn' },
      { t: '바렌이 나간 틈에 편지를 훔친다', check: ['dex', 12], ok: 'c_vault_letter', no: 'c_vault_spotted' },
      { t: '편지는 두고 은빛 조각부터 챙긴다', go: 'c_vault_shard' },
      { t: '난간을 넘어 섭정 앞에 내려선다', go: 'c_vault_confront' },
    ],
  },
  c_vault_letter: {
    loc: 'vault',
    t: `바렌이 등을 돌린 사이, 당신은 그림자처럼 내려가 편지를 낚아챈다. 보랏빛 밀랍. 모르베인의 문양. 섭정은 눈치채지 못하고 계단을 올라간다.

이제 유리관의 은빛 조각만 남았다.`,
    fx: { item: 'varen_letter' },
    next: 'c_vault_shard',
  },
  c_vault_spotted: {
    loc: 'vault',
    who: ['varen'],
    sp: 'varen',
    t: `발밑의 판자가 삐걱거린다. 바렌이 휙 돌아본다. 눈이 마주친다.

"…쥐새끼가 들었군." 그의 눈동자가 보랏빛으로 물든다.`,
    next: 'c_vault_confront',
  },
  c_vault_shard: {
    loc: 'vault',
    t: `유리관 뚜껑을 들어 올린다. 은빛 조각에 얽힌 보랏빛 실이 당신의 손이 닿자 비명처럼 끊어진다. 조각이 당신 손바닥 위에서 별처럼 빛난다.

그 순간, 대성당의 종이 울린다. 실이 끊어진 것을 누군가 알아챈 것이다. 계단 위에서 갑옷 소리가 쏟아진다.`,
    fx: { shard: 'silver', maxhp: 5, heal: 'full', journal: '은빛 조각을 얻었다.' },
    c: [
      { t: '출구로 달린다', req: { not: 'aldric_turned' }, go: 'c_vault_escape' },
      { t: '밖에서 기다리는 알드릭에게 신호를 보낸다', req: { flag: 'aldric_turned' }, go: 'c_throne_confront' },
    ],
  },
  c_vault_escape: {
    loc: 'vault',
    who: ['aldric', 'knight'],
    sp: 'aldric',
    t: `출구 앞에 은빛 기사들이 늘어선다. 그 한가운데 알드릭이 칼을 뽑아 든다.

"성유물 도둑이라니… 그대였소?" 그의 목소리에 실망이 묻어난다.`,
    c: [
      { t: '바렌의 밀서를 내민다', req: { item: 'varen_letter' }, go: 'c_aldric_turn' },
      { t: '"섭정은 방금 이곳에서 모르베인과 만났어요. 선왕을 죽인 것도 그들이에요!"', check: ['cha', 14], ok: 'c_aldric_turn', no: 'c_aldric_duel' },
      { t: '선왕의 반지를 들어 보인다', req: { flag: 'aldren_ring' }, go: 'c_aldric_turn' },
      { t: '칼을 맞댄다', go: 'c_aldric_duel' },
      { t: '연막을 터뜨리고 달아난다', req: { comp: 'finn' }, go: 'c_hand_after' },
      { t: '틈을 노려 도망친다', check: ['dex', 14], ok: 'c_hand_after', no: 'c_aldric_duel' },
    ],
  },
  c_aldric_duel: {
    loc: 'vault',
    who: ['aldric'],
    t: `알드릭이 기사들을 물리고 홀로 앞으로 나선다. "내가 직접 상대하겠다."`,
    combat: { e: 'aldric', win: 'c_aldric_beaten', lose: 'c_dungeon' },
  },
  c_aldric_beaten: {
    loc: 'vault',
    who: ['aldric'],
    sp: 'aldric',
    t: `알드릭의 칼이 바닥을 구른다. 그가 무릎을 꿇은 채 숨을 몰아쉰다. 기사들이 술렁인다.

"…끝내시오."`,
    c: [
      { t: '칼을 거두고 손을 내민다. "섭정의 진실을 함께 봐 주세요."', go: 'c_aldric_turn' },
      { t: '그대로 달아난다', go: 'c_hand_after' },
    ],
  },
  c_vault_confront: {
    loc: 'vault',
    who: ['varen'],
    sp: 'varen',
    t: `바렌이 당신을 보고 웃는다. 그 미소에는 더 이상 꿀이 없다.

"별의 그릇이 제 발로 찾아오다니. 모르베인 님이 기뻐하시겠군." 그가 허리의 칼을 뽑는다. 칼날에서 보랏빛 안개가 피어오른다. "조금 다치게 해도 녹이는 데는 지장 없겠지."`,
    combat: { e: 'varen', win: 'c_varen_win', lose: 'c_dungeon' },
  },
  c_letter_aldric: {
    loc: 'capital',
    who: ['aldric'],
    sp: 'aldric',
    t: `기사단 막사. 당신이 내민 편지를 읽어 내려가는 알드릭의 손이 점점 떨린다. 보랏빛 밀랍, 모르베인의 문양, 그리고 선왕의 죽음에 대한 구절.

그가 편지를 구겨 쥔다. "십 년. 십 년 동안 나는 왕을 죽인 자를 지켰소."`,
    next: 'c_aldric_turn',
  },
  c_aldric_turn: {
    loc: 'vault',
    who: ['aldric', 'knight'],
    sp: 'aldric',
    t: `알드릭이 칼을 들어 올린다. 그러나 칼끝은 당신이 아니라 성의 언덕을 향한다.

"은빛 기사단은 들어라!" 그의 목소리가 돌벽을 울린다. "우리는 왕을 지키겠다고 맹세했다. 섭정이 아니라! 오늘 밤, 우리는 선왕 전하를 죽인 자를 심판한다!"

기사들이 하나둘 칼을 뽑아 들고 그의 뒤에 선다. 알드릭이 당신을 돌아본다. "함께 가 주겠소, 별의 사람이여."`,
    fx: { flag: ['aldric_turned', 'order_ally', 'ready_to_confront'], rep: { order: 3 }, item: 'order_badge', journal: '알드릭과 은빛 기사단이 섭정에게 칼을 돌렸다.' },
    c: [
      { t: '왕좌의 방으로 간다', go: 'c_throne_confront' },
      { t: '은빛 조각을 먼저 챙긴다', req: { noShard: 'silver' }, go: 'c_grab_shard_order' },
    ],
  },
  c_grab_shard_order: {
    loc: 'vault',
    who: ['aldric'],
    t: `유리관을 열자 보랏빛 실이 끊어지며 은빛 조각이 당신의 손에 내려앉는다. 알드릭이 고개를 숙인다. "그건 그대의 것이오. 처음부터 그랬을 거요."`,
    fx: { shard: 'silver', maxhp: 5, heal: 'full', journal: '은빛 조각을 얻었다.' },
    next: 'c_throne_confront',
    nextLabel: '왕좌의 방으로',
  },
  c_hand_after: {
    loc: 'hideout',
    who: ['kael', 'nyx'],
    sp: 'kael',
    t: (s) =>
      `은신처로 돌아오자 잿빛 손의 사람들이 환호한다. 카엘이 당신의 어깨를 움켜쥔다.

"해냈군!" ` +
      (s.flags.varen_proof ? '당신이 금고에서 본 것을 이야기하자 그의 얼굴이 굳는다. "모르베인… 역시 그랬어." ' : '') +
      `그가 지도 위의 성을 단검으로 찍는다. "이제 끝을 보자. 도성의 백성들이 오늘 밤 진실을 듣게 될 거다. 그리고 우리는 성으로 간다."`,
    fx: { flag: ['ready_to_confront'], rep: { hand: 2 } },
    c: [
      { t: '카엘과 함께 성으로 쳐들어간다', go: 'c_throne_confront', fx: { flag: 'with_kael' } },
      { t: '"먼저 알드릭을 설득해 보겠어요."', req: { item: 'varen_letter', not: 'aldric_turned' }, go: 'c_letter_aldric', fx: { flag: 'with_kael' } },
    ],
  },
  c_throne_confront: {
    loc: 'throne',
    chapter: '2막 · 왕좌의 방',
    who: ['varen'],
    sp: 'varen',
    t: (s) => {
      let t = '왕좌의 방 문이 박살 난다. ';
      if (s.flags.aldric_turned && (s.flags.with_kael || s.flags.hand_join))
        t += '은빛 기사들과 잿빛 손의 사람들이 나란히 들이닥친다. 어제까지 서로를 쫓던 사람들이다. ';
      else if (s.flags.aldric_turned) t += '알드릭과 은빛 기사들이 당신 뒤를 따른다. ';
      else if (s.flags.with_kael || s.flags.hand_join) t += '카엘과 잿빛 손의 사람들이 횃불을 들고 당신 뒤를 따른다. 성 밖에서 백성들의 함성이 들린다. ';
      return (
        t +
        `

섭정 바렌은 빈 왕좌 앞에 서 있다. 그가 천천히 왕좌에 앉는다. 처음으로.

"십 년이다. 십 년 동안 이 의자 옆에 앉아 있었지." 그의 몸에서 보랏빛 안개가 피어오른다. 눈이 검게 물든다. "모르베인 님이 주신 힘을 쓸 날이 오늘일 줄이야."`
      );
    },
    combat: { e: 'varen', win: 'c_varen_win', lose: 'c_varen_lose' },
  },
  c_varen_lose: {
    loc: 'throne',
    who: ['varen'],
    t: `바렌의 칼이 당신을 꿰뚫으려는 순간, 화살 하나와 칼 하나가 동시에 그를 막는다. 동료들이다. 그 틈에 당신은 마지막 힘을 짜내 일어선다. 바렌이 비틀거리다 쓰러진다.`,
    fx: { hp: 8 },
    next: 'c_varen_win',
  },
  c_varen_win: {
    loc: 'throne',
    who: ['varen'],
    sp: 'varen',
    t: `바렌이 왕좌에서 굴러떨어진다. 보랏빛 안개가 그의 몸에서 빠져나가 흩어진다. 남은 것은 늙고 지친 사내 하나다.

"모르베인이… 약속했는데…" 그가 피를 토하며 웃는다. "왕관이 다시 만들어지면 누가 쓰는지 아느냐? 그놈은 너를 녹여… 자기 머리에 쓸 거다. 탑으로 가라, 별의 그릇. 가서… 녹아 버려라."

그의 숨이 멎는다. 그의 품에서 보랏빛 밀랍이 찍힌 편지 다발과, 은빛으로 빛나는 무언가가 굴러 나온다.`,
    fx: { flag: ['varen_dead', 'know_melt'], journal: '섭정 바렌이 죽었다. 모르베인은 나를 녹여 자기 머리에 왕관을 쓰려 한다.' },
    c: [
      { t: '은빛 조각을 줍는다', req: { noShard: 'silver' }, fx: { shard: 'silver', maxhp: 5, heal: 'full' }, go: 'c_after_varen' },
      { t: '편지 다발을 챙긴다', req: { shard: 'silver' }, go: 'c_after_varen' },
    ],
  },
  c_after_varen: {
    loc: 'throne',
    who: ['aldric', 'kael'],
    t: (s) => {
      const a = s.flags.aldric_turned;
      const k = s.flags.with_kael || s.flags.hand_join;
      if (a && k)
        return '알드릭과 카엘이 쓰러진 섭정을 사이에 두고 서로를 바라본다. 기사단장과 도적 두목. 둘 다 당신을 본다. 이 도성의 내일을 누구 손에 맡길 것인가.';
      if (a) return '알드릭이 빈 왕좌를 바라본다. "도성은 혼란스러울 거요. 누군가는 질서를 세워야 하오."';
      if (k) return '카엘이 성의 발코니로 나가 광장의 백성들을 내려다본다. "오늘 밤, 이 도성은 누구의 것도 아니다. 우리 모두의 것이지."';
      return '왕좌의 방이 고요하다. 도성은 주인을 잃었다. 당신은 혼자 빈 왕좌 앞에 서 있다.';
    },
    c: [
      { t: '알드릭에게 도성의 질서를 맡긴다', req: { flag: 'aldric_turned' }, fx: { flag: ['order_ally', 'capital_order'], rep: { order: 1 } }, go: 'c_done' },
      { t: '카엘과 백성들에게 도성을 맡긴다', req: { any: [{ flag: 'with_kael' }, { flag: 'hand_join' }] }, fx: { flag: ['hand_ally', 'capital_hand'], rep: { hand: 2 } }, go: 'c_done' },
      { t: '"두 분이 함께 다스려 주세요. 칼과 손이 함께."', req: { flag: 'aldric_turned', any: [{ flag: 'with_kael' }, { flag: 'hand_join' }] }, check: ['cha', 13], ok: 'c_done', okfx: { flag: ['order_ally', 'hand_ally', 'capital_united'], rep: { order: 1, hand: 1 } }, no: 'c_done_split' },
      { t: '대주교 오스린에게 임시로 맡긴다', go: 'c_done' },
    ],
  },
  c_done_split: {
    loc: 'throne',
    who: ['aldric', 'kael'],
    t: `알드릭과 카엘이 서로를 노려본다. "도적과 나란히 서라고?" "기사 나리야말로 십 년 동안 누굴 지켰는지 생각해 보시지."

결국 둘은 등을 돌린다. 기사단은 성을, 잿빛 손은 거리를 맡기로 한다. 불안한 휴전이지만, 적어도 피는 흐르지 않는다.`,
    fx: { flag: ['order_ally'] },
    next: 'c_done',
  },
  c_done: {
    loc: 'capital',
    t: (s) =>
      (s.flags.capital_united
        ? '다음 날 아침, 광장에 기사들과 잿빛 손의 사람들이 함께 서서 곡식 창고를 연다. 백성들이 울고 웃는다. 선왕의 동상 눈에 묻은 재를 누군가 깨끗이 닦아 놓았다.'
        : s.flags.capital_hand
          ? '다음 날 아침, 잿빛 손의 사람들이 곡식 창고를 열어 빵을 나눈다. 백성들이 노래를 부른다. 성 위에는 왕실 깃발 대신 재로 그린 손바닥 깃발이 걸렸다.'
          : '다음 날 아침, 은빛 기사들이 거리의 질서를 되찾는다. 섭정의 죄가 광장에 낭독되고, 세금 명단이 불태워진다.') +
      '\n\n당신은 은빛성을 떠난다. 북쪽 하늘에 검은 탑이 보인다.',
    fx: { flag: 'capital_done', heal: 'full' },
    x: [
      [{ flag: 'order_ally' }, '알드릭이 성문까지 배웅하며 말한다. "탑으로 갈 때 기사단이 함께하겠소. 이번에는 진짜 왕을 위해서."'],
      [{ flag: 'hand_ally' }, '카엘이 지붕 위에서 손을 흔든다. "탑에서 보자, 별손님! 잿빛 손은 빚을 잊지 않아!"'],
    ],
    next: 'x_cross',
    nextLabel: '갈림길로 돌아간다',
  },
  c_return: {
    loc: 'capital',
    t: `은빛성은 조금씩 숨을 되찾고 있다. 문 닫았던 가게들이 하나둘 다시 문을 연다. 사람들이 당신을 알아보고 고개를 숙인다.`,
    c: [
      { t: '대성당에서 기도한다', fx: { heal: 'full' }, go: 'c_return' },
      { t: '시장에서 물약을 산다 (금화 9)', req: { gold: 9 }, fx: { gold: -9, item: 'potion' }, go: 'c_return' },
      { t: '성수를 산다 (금화 10)', req: { gold: 10 }, fx: { gold: -10, item: 'holy_water' }, go: 'c_return' },
      { t: '갈림길로 돌아간다', go: 'x_cross' },
    ],
  },
};
