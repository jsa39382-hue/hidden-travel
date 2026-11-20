// 2막: 갈림길(허브), 속삭이는 숲, 안개 늪
export default {
  x_cross: {
    loc: 'crossroads',
    chapter: '2막 · 세 갈래 길',
    t: (s) => {
      const n = s.shards.length;
      if (n === 0)
        return '세 갈래 길이 만나는 언덕. 오래된 이정표가 동쪽의 숲, 서쪽의 광산, 북쪽의 은빛성을 가리킨다. 모닥불 곁에서는 떠돌이 상인이 짐을 풀고 있다.';
      if (n === 1)
        return '갈림길로 돌아왔다. 품속의 왕관 조각이 다른 조각들을 부르듯 미세하게 떨린다. 아직 갈 길이 남았다.';
      if (n === 2)
        return '두 개의 조각이 서로 부딪히며 낮은 노래를 부른다. 북쪽 하늘 끝, 먹구름 아래로 검은 탑의 그림자가 보이기 시작했다. 모르베인이 당신을 기다리고 있다.';
      return '세 조각이 모두 모였다. 조각들이 하나의 빛으로 맥동한다. 검은 탑이 하늘을 찢고 서 있다. 이제 끝을 맺을 때다.';
    },
    c: [
      { t: '동쪽: 속삭이는 숲', go: 'f_enter', at: 'east', req: { not: 'forest_done' } },
      { t: '동쪽: 속삭이는 숲 (다시 찾기)', go: 'f_return', at: 'east', req: { flag: 'forest_done' } },
      { t: '서쪽: 잿불 광산', go: 'm_enter', at: 'west', req: { not: 'mine_done' } },
      { t: '서쪽: 잿불 요새 (다시 찾기)', go: 'm_return', at: 'west', req: { flag: 'mine_done' } },
      { t: '북쪽: 은빛성', go: 'c_enter', at: 'north', req: { not: ['capital_entered', 'capital_done'] } },
      { t: '북쪽: 은빛성 (다시 찾기)', go: 'c_plaza', at: 'north', req: { flag: 'capital_entered', not: 'capital_done' } },
      { t: '북쪽: 은빛성 (다시 찾기)', go: 'c_return', at: 'north', req: { flag: 'capital_done' } },
      { t: '남쪽: 안개 늪', go: 's_enter', at: 'south', req: { flag: 'heard_witch' } },
      { t: '떠돌이 상인 올로와 이야기한다', go: 'x_merchant', at: 'camp' },
      { t: '모닥불 곁에서 쉰다', go: 'x_rest', at: 'camp' },
      { t: '이끼 낀 옛 사당을 살핀다', go: 'x_shrine', at: 'shrine', once: true },
      { t: '검은 탑으로 향한다', go: 't_enter', req: { shards: 2 }, at: 'tower' },
      { t: '모든 것을 내려놓고 남쪽 바다로 떠난다', go: 'x_wander', req: { not: 'no_wander' } },
    ],
  },
  x_merchant: {
    loc: 'crossroads',
    who: ['ollo'],
    sp: 'ollo',
    t: (s) =>
      s.visited.x_merchant > 1
        ? '"또 왔구먼! 장사는 정직하게, 값은 적당히!" 올로가 배낭을 툭툭 친다.'
        : '"어이쿠, 별손님 아니신가! 소문 들었지. 나는 올로, 이 길 위에서만 삼십 년을 굴러먹은 장사꾼이야. 필요한 거 있으면 말만 해."',
    c: [
      { t: '치유 물약 (금화 10)', req: { gold: 10 }, fx: { gold: -10, item: 'potion' }, go: 'x_merchant' },
      { t: '성수 (금화 12)', req: { gold: 12 }, fx: { gold: -12, item: 'holy_water' }, go: 'x_merchant' },
      { t: '횃불 (금화 2)', req: { gold: 2 }, fx: { gold: -2, item: 'torch' }, go: 'x_merchant' },
      { t: '밧줄 (금화 4)', req: { gold: 4, noItem: 'rope' }, fx: { gold: -4, item: 'rope' }, go: 'x_merchant' },
      { t: '가죽 갑옷 (금화 20)', req: { gold: 20, noItem: 'armor' }, fx: { gold: -20, item: 'armor' }, go: 'x_merchant' },
      { t: '"요즘 길에서 들리는 이야기는?"', go: 'x_merchant_talk', once: true },
      { t: '자리를 뜬다', go: 'x_cross' },
    ],
  },
  x_merchant_talk: {
    loc: 'crossroads',
    who: ['ollo'],
    sp: 'ollo',
    t: `올로가 목소리를 낮춘다.

"북쪽 하늘에 검은 탑이 하나 솟았다는 얘기, 들었나? 원래 거긴 선왕의 궁정 마법사가 살던 곳이었지. 이름이 모르베인이라던가. 왕이 죽던 밤에 사라졌다던 그 양반.

그리고 남쪽 안개 늪. 거기 마녀 오르마는 나랑 거래하는 사이인데, 운명을 본다지. 별손님 같은 사람이라면 꼭 한번 가 볼 만해. 대신 뭘 달라고 하는지 잘 듣고 대답하라고."`,
    fx: { flag: ['heard_witch', 'know_morvain_name'], journal: '검은 탑의 주인은 선왕의 궁정 마법사 모르베인이다. 왕이 죽던 밤 사라졌다.' },
    next: 'x_merchant',
  },
  x_rest: {
    loc: 'crossroads',
    t: (s) => {
      const lines = [];
      if (s.comps.includes('bran')) lines.push('브란이 모닥불에 고기를 굽다가 중얼거린다. "아버지가 날 다시 보면 뭐라 하실까. 아니, 대답하지 마."');
      if (s.comps.includes('finn')) lines.push('핀이 동전 세 개로 저글링을 하며 웃는다. "별손님, 별에선 뭘 먹고 살아? 별사탕?"');
      if (s.comps.includes('seren')) lines.push('세렌이 불빛 너머 별자리를 가리킨다. "저건 \'떨어진 왕관\' 자리예요. 열 해 전부터 별 하나가 비어 있었죠. 당신이 거기서 왔을까요?"');
      if (!lines.length) lines.push('혼자 불을 쬐며 별을 올려다본다. 하늘의 빈자리가 당신을 내려다보는 것 같다.');
      return '모닥불이 타닥거린다. 지친 몸이 따뜻해진다.\n\n' + lines.join('\n\n');
    },
    fx: { heal: 'full' },
    next: 'x_cross',
    nextLabel: '일어선다',
  },
  x_shrine: {
    loc: 'crossroads',
    t: `이끼에 덮인 돌 사당. 왕관을 쓴 인물의 부조가 반쯤 깨져 있다. 그 아래 글귀가 새겨져 있다.`,
    c: [
      { t: '옛 글자를 해독한다', check: ['int', 12], ok: 'x_shrine_read', no: 'x_shrine_fail' },
      { t: '부조 앞에 고개를 숙인다', go: 'x_shrine_bow' },
    ],
  },
  x_shrine_read: {
    loc: 'crossroads',
    t: `"왕관은 왕을 고르지 않는다. 왕관은 장막을 고른다. 장막을 지킬 자가 없으면, 왕관은 스스로 장막이 되리라."

당신은 그 문장을 몇 번이고 되새긴다. 왕관이 스스로 장막이 된다면, 그 왕관의 혼인 당신은?`,
    fx: { flag: 'know_sacrifice', journal: '사당의 글귀: 장막을 지킬 자가 없으면 왕관이 스스로 장막이 된다.' },
    next: 'x_cross',
  },
  x_shrine_fail: {
    loc: 'crossroads',
    t: `글자가 너무 닳아서 읽을 수가 없다. '왕관'과 '장막'이라는 단어만 겨우 알아본다.`,
    next: 'x_cross',
  },
  x_shrine_bow: {
    loc: 'crossroads',
    t: `고개를 숙이자 부조의 깨진 눈에서 은빛이 잠깐 번득인다. 가슴의 빛이 대답하듯 따뜻해진다. 몸이 가볍다.`,
    fx: { heal: 'full', maxhp: 2 },
    next: 'x_cross',
  },
  x_wander: {
    loc: 'crossroads',
    t: `당신은 갈림길 남쪽, 아무 이정표도 없는 길을 바라본다. 그 끝에는 바다가 있다고 했다. 왕관도, 예언도, 공허도 상관없는 곳.

정말 떠나겠는가? 한번 떠나면 돌아오지 않는다.`,
    c: [
      { t: '떠난다', go: 'e_wanderer' },
      { t: '아니다. 아직 할 일이 있다', go: 'x_cross', fx: { flag: 'no_wander' } },
    ],
  },

  // ── 속삭이는 숲
  f_enter: {
    loc: 'forest',
    chapter: '2막 · 속삭이는 숲',
    t: `나무들이 하늘을 가린다. 잎사귀 사이로 내려오는 빛이 초록색으로 일렁인다. 발을 디딜 때마다 어딘가에서 속삭임이 들린다. 말 같기도 하고, 바람 같기도 하다.

군데군데 나무껍질이 검게 썩어 있다. 썩은 자리에서 보랏빛 안개가 피어오른다.`,
    x: [[{ comp: 'seren' }, '세렌이 활시위를 만지작거린다. "제 고향이에요. 예전엔 이렇지 않았어요."']],
    c: [
      { t: '흙길을 따라 안쪽으로 들어간다', go: 'f_path', at: 'path' },
      { t: '속삭임에 귀를 기울인다', check: ['int', 12], ok: 'f_whisper', no: 'f_lost' },
      { t: '진흙 위의 작은 발자국을 따라간다', req: { flag: 'tomi_lost', not: 'tomi_saved' }, go: 'f_tomi', at: 'hollowtree' },
    ],
  },
  f_whisper: {
    loc: 'forest',
    t: `속삭임들이 하나로 모인다. 나무들의 목소리다.

"아프다… 샘이 썩었다… 검은 것이 샘에 알을 낳았다… 뿌리가… 늙은 뿌리가 죽어 간다…"

어느 쪽으로 가야 할지 알 것 같다. 숲의 심장, 그리고 썩은 샘.`,
    fx: { flag: 'forest_secret', journal: '숲의 나무들이 말했다. 샘이 썩었고, 검은 것이 샘에 알을 낳았다.' },
    next: 'f_path',
  },
  f_lost: {
    loc: 'forest',
    t: `속삭임을 따라가다 보니 길이 사라졌다. 나무들이 똑같아 보인다. 그리고 위에서, 끈적한 실이 당신의 어깨에 떨어진다.

개만 한 거미가 썩은 가지에서 내려온다.`,
    combat: { e: 'spider', win: 'f_path', lose: 'f_seren_capture' },
  },
  f_tomi: {
    loc: 'forest',
    who: ['tomi'],
    sp: 'tomi',
    t: `발자국은 속이 빈 거대한 고목 앞에서 끝난다. 안에서 훌쩍이는 소리. 들여다보니 작은 아이가 거미줄에 반쯤 감겨 있다. 그리고 그 위로, 거미 한 마리가 천천히 내려오고 있다.

"살려 주세요…!" 토미다.`,
    c: [
      { t: '거미에게 달려든다', go: 'f_tomi_fight' },
      { t: '거미 몰래 아이를 꺼낸다', check: ['dex', 13], ok: 'f_tomi_saved', no: 'f_tomi_fight' },
      { t: '횃불로 거미를 쫓는다', req: { item: 'torch' }, fx: { take: 'torch' }, go: 'f_tomi_saved' },
    ],
  },
  f_tomi_fight: {
    loc: 'forest',
    who: ['tomi'],
    t: `거미가 당신을 향해 몸을 돌린다. 토미가 비명을 지른다.`,
    combat: { e: 'spider', win: 'f_tomi_saved', lose: 'f_seren_capture' },
  },
  f_tomi_saved: {
    loc: 'forest',
    who: ['tomi', 'seren'],
    sp: 'tomi',
    t: `거미줄을 끊어 내자 토미가 당신 품으로 뛰어든다. 아이는 한참을 울다가, 주머니에서 서툴게 깎은 나무 별을 꺼낸다.

"이거… 별손님 주려고 만든 거예요. 별에서 왔다니까."

그때 나무 위에서 누군가 내려선다. 은발의 엘프 여인이 활을 내린 채 당신과 아이를 번갈아 본다. "…인간이 아이를 구하려고 이 숲 깊이까지 왔다고요?"`,
    fx: { flag: ['tomi_saved', 'seren_trust', 'seren_met'], item: 'wood_star', journal: '숲에서 토미를 구했다. 토미가 나무 별을 주었다.' },
    next: 'f_seren_kind',
  },
  f_seren_kind: {
    loc: 'forest',
    who: ['seren', 'tomi'],
    sp: 'seren',
    t: `"저는 세렌, 푸른 원환의 정찰자예요." 그녀가 손짓하자 다른 엘프 하나가 나타나 토미를 안아 든다. "아이는 가시골까지 데려다줄게요.

당신에겐 활 대신 길을 내어 드리죠. 대드루이드께서 당신을 만나고 싶어 하실 거예요."`,
    x: [[{ item: 'letter_harwin' }, '당신이 하윈의 편지를 건네자 세렌이 봉인을 보고 미소 짓는다. "하윈 아저씨… 아직 살아 계셨군요."']],
    fx: { take: 'letter_harwin' },
    next: 'f_circle',
  },
  f_path: {
    loc: 'forest',
    who: ['seren'],
    sp: 'seren',
    t: `쉭. 화살 하나가 당신의 발끝 앞 흙에 박힌다. 깃이 아직 떨린다.

"한 걸음만 더 오면 다음 화살은 눈에 박힐 거예요." 나무 위, 은발의 엘프 여인이 시위를 당기고 있다. 주변 나뭇가지마다 다른 궁수들의 그림자가 보인다.

"인간이 이 숲에 무슨 볼일이죠?"`,
    c: [
      { t: '하윈 촌장의 편지를 꺼낸다', req: { item: 'letter_harwin' }, go: 'f_seren_letter', fx: { take: 'letter_harwin' } },
      { t: '무기를 내려놓고 대화를 청한다', check: ['cha', 12], ok: 'f_seren_calm', no: 'f_seren_capture' },
      { t: '가슴의 별빛을 드러낸다', req: { any: [{ flag: 'star_awake' }, { flag: 'star_vision' }] }, go: 'f_seren_awe' },
      { t: '나무 위로 뛰어올라 먼저 덮친다', go: 'f_elf_fight' },
    ],
  },
  f_seren_letter: {
    loc: 'forest',
    who: ['seren'],
    sp: 'seren',
    t: `세렌이 나무에서 내려와 편지를 받는다. 봉인을 보는 순간 그녀의 눈빛이 달라진다.

"하윈 아저씨… 제 아버지의 친구셨어요." 편지를 읽어 내려가던 그녀가 당신을 다시 본다. "'이 사람은 별에서 왔다. 믿어 주어라.' 이렇게 쓰셨네요. 아저씨는 거짓말을 못 하시는 분이죠.

저는 세렌이에요. 따라오세요. 대드루이드께 모셔다드릴게요."`,
    fx: { flag: ['seren_trust', 'seren_met'] },
    next: 'f_circle',
  },
  f_seren_calm: {
    loc: 'forest',
    who: ['seren'],
    sp: 'seren',
    t: `당신은 천천히 무기를 내려놓고 두 손을 펼친다. 긴 침묵. 이윽고 세렌이 시위를 늦춘다.

"이상하네요. 당신에게선 인간 냄새가 안 나요. 비 온 뒤의 밤하늘 냄새가 나요." 그녀가 가볍게 땅에 내려선다. "세렌이에요. 대드루이드께서 판단하시게 하죠."`,
    fx: { flag: ['seren_trust', 'seren_met'] },
    next: 'f_circle',
  },
  f_seren_awe: {
    loc: 'forest',
    who: ['seren'],
    sp: 'seren',
    t: `당신의 가슴에서 은빛이 흘러나와 숲을 비춘다. 썩은 나무껍질에서 피어오르던 보랏빛 안개가 빛에 닿아 사라진다.

엘프 궁수들이 하나둘 활을 내린다. 세렌이 나무에서 뛰어내려 당신 앞에 한쪽 무릎을 꿇는다.

"새벽의 빛… 노래 속에만 있는 줄 알았어요." 그녀가 고개를 든다. "세렌이에요. 당신을 원환으로 모시겠어요."`,
    fx: { flag: ['seren_trust', 'seren_met', 'seren_awe'], rep: { circle: 1 } },
    next: 'f_circle',
  },
  f_elf_fight: {
    loc: 'forest',
    who: ['seren'],
    t: `당신이 몸을 날리자 궁수 하나가 나무에서 뛰어내려 단검을 뽑는다.`,
    combat: { e: 'elf_guard', win: 'f_elf_fight_win', lose: 'f_seren_capture' },
  },
  f_elf_fight_win: {
    loc: 'forest',
    who: ['seren'],
    sp: 'seren',
    t: `엘프 궁수가 쓰러지자 사방에서 시위 당기는 소리가 난다. "그만!" 세렌의 외침이 숲을 울린다.

그녀가 내려와 쓰러진 동료를 살핀다. 숨은 붙어 있다. "실력은 인정할게요. 하지만 이 숲은 칼로 들어오는 곳이 아니에요." 그녀가 차갑게 말한다. "대드루이드께서 당신을 어떻게 할지 정하실 거예요."`,
    fx: { flag: 'seren_met', rep: { circle: -2 } },
    next: 'f_circle',
  },
  f_seren_capture: {
    loc: 'forest',
    who: ['seren'],
    sp: 'seren',
    t: `정신을 차렸을 때 당신은 덩굴로 손이 묶여 있다. 엘프 궁수들이 당신을 끌고 숲 깊은 곳으로 간다. 세렌이 앞장서며 말한다.

"쓰러진 당신을 거미 밥으로 둘 수도 있었어요. 감사는 나중에 하시고." 그녀가 당신의 가슴께에서 새어 나오는 빛을 흘끔 본다. "…이상한 사람이네요."`,
    fx: { flag: ['forest_prisoner', 'seren_met'], hp: 6 },
    next: 'f_circle',
  },
  f_circle: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    sp: 'elowen',
    t: (s) =>
      (s.flags.forest_prisoner
        ? '덩굴에 묶인 채로 당신은 거대한 나무 앞에 꿇어앉혀진다. '
        : '숲이 갑자기 트이며 거대한 나무가 모습을 드러낸다. ') +
      `줄기 하나가 성탑만큼 굵고, 뿌리는 언덕처럼 솟아 있다. 그러나 나무의 절반은 검게 썩어 있고, 그 틈에서 보랏빛 안개가 새어 나온다.

나무 아래, 흰 머리를 땅까지 늘어뜨린 엘프가 지팡이를 짚고 서 있다.

"나는 푸른 원환의 대드루이드 엘로웬. 이 나무는 '늙은 뿌리', 이 숲의 심장이자 왕관의 초록 조각을 품은 자다." 그녀의 목소리는 고요하지만 차갑다. "그리고 지금 죽어 가고 있지. 별의 아이여, 너는 무엇을 원하느냐."`,
    c: [
      { t: '"이 숲을 돕겠습니다. 맹세합니다."', go: 'f_oath', fx: { rep: { circle: 2 } } },
      { t: '"조각이 필요합니다. 왕국 전체가 위험해요."', check: ['cha', 14], ok: 'f_demand_ok', no: 'f_demand_no' },
      { t: '늙은 뿌리가 왜 병들었는지 묻는다', go: 'f_lore', once: true },
      { t: '엘로웬의 표정을 찬찬히 읽는다', check: ['int', 13], ok: 'f_read_ok', no: 'f_read_no', once: true },
    ],
  },
  f_lore: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    sp: 'elowen',
    t: `"석 달 전, 보랏빛 로브를 입은 자가 숲 동쪽 샘에 검은 씨앗을 심었다. 씨앗은 거미의 여왕으로 자라났고, 여왕의 독이 샘을 타고 뿌리로 스며들었지.

그자는 조각을 빼앗으려 한 게 아니었다. 조각이 숲을 지키지 못하도록 숲을 병들게 한 것이다. 조각을 뽑으면 나무는 죽고, 뽑지 않으면 썩어 죽는다. 교활한 덫이지."`,
    fx: { flag: 'know_spring', journal: '모르베인의 수하가 숲의 샘에 검은 씨앗을 심었다. 거미 여왕이 샘을 썩히고 있다.' },
    next: 'f_circle',
  },
  f_read_ok: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    t: `엘로웬의 손끝이 지팡이를 꽉 쥐고 있다. 차가운 목소리 아래 숨은 것은 분노가 아니라 두려움이다. 그녀는 당신이 조각을 가져가는 것보다, 당신이 실패하는 것을 더 두려워한다.

그리고 하나 더. 그녀의 시선이 계속 세렌을 향한다. 딸을 보는 눈빛이다.`,
    fx: { flag: 'elowen_read' },
    next: 'f_circle',
  },
  f_read_no: {
    loc: 'forest_heart',
    who: ['elowen'],
    t: `엘로웬의 얼굴은 돌처럼 아무것도 드러내지 않는다. 오히려 그녀가 당신을 읽고 있는 것 같다.`,
    next: 'f_circle',
  },
  f_oath: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    sp: 'elowen',
    t: `엘로웬이 처음으로 표정을 누그러뜨린다. "맹세는 숲이 기억한다. 어기면 숲이 너를 잊지 않을 것이다."

그녀가 동쪽을 가리킨다. "썩은 샘으로 가라. 거미의 여왕을 없애고 샘을 되살려라. 그러면 늙은 뿌리가 너와 이야기할 것이다."`,
    next: 'f_quest',
  },
  f_demand_ok: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    sp: 'elowen',
    t: `엘로웬이 당신을 오래 바라본다. "기세가 좋구나. 왕관의 혼답다." 그녀가 동쪽을 가리킨다. "좋다. 조각을 원한다면 먼저 그 값을 치러라. 썩은 샘의 여왕을 없애라. 그 뒤에 늙은 뿌리가 너를 받아들일지 정할 것이다."`,
    fx: { rep: { circle: 1 } },
    next: 'f_quest',
  },
  f_demand_no: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    sp: 'elowen',
    t: `"인간들은 늘 그렇게 말하지. '왕국 전체를 위해서.'" 엘로웬의 목소리가 서늘해진다. "그 왕국이 이 숲을 위해 무엇을 했느냐?

그래도 늙은 뿌리는 너를 보고 싶어 한다. 썩은 샘의 여왕을 없애라. 그게 네가 말할 자격을 얻는 길이다."`,
    fx: { rep: { circle: -1 } },
    next: 'f_quest',
  },
  f_quest: {
    loc: 'forest_heart',
    who: ['seren', 'elowen'],
    sp: 'seren',
    t: (s) =>
      s.comps.includes('seren')
        ? '세렌이 활을 고쳐 멘다. "샘까지 안내할게요. 가요."'
        : `세렌이 엘로웬을 돌아본다. 엘로웬이 아주 작게 고개를 끄덕인다.

"샘까지 길을 아는 건 저뿐이에요." 세렌이 당신 앞에 선다. "그리고… 당신이 정말 이 숲을 구할 수 있는지, 제 눈으로 보고 싶어요."`,
    c: [
      { t: '세렌과 함께 간다', req: { noComp: 'seren', any: [{ flag: 'seren_trust' }, { rep: { circle: 1 } }] }, fx: { comp: 'seren' }, go: 'f_to_spring' },
      { t: '"고맙지만 혼자 가겠어요."', req: { noComp: 'seren' }, go: 'f_to_spring' },
      { t: '썩은 샘으로 향한다', req: { comp: 'seren' }, go: 'f_to_spring' },
      { t: '세렌이 길만 알려 준다 (세렌은 아직 당신을 믿지 않는다)', req: { noComp: 'seren', not: 'seren_trust', repBelow: { circle: 1 } }, go: 'f_to_spring' },
    ],
  },
  f_to_spring: {
    loc: 'forest',
    t: `동쪽으로 갈수록 나무가 검게 변한다. 공기가 끈적하다. 거미줄이 커튼처럼 드리워진 너머로 검은 물이 고인 샘이 보인다. 샘 한가운데, 집채만 한 무언가가 몸을 웅크리고 있다.

여왕 거미다. 등에 보랏빛 혹들이 맥동한다.`,
    x: [[{ comp: 'seren' }, '세렌이 숨죽여 말한다. "등의 혹이 약점이에요. 거기에 독이 모여 있어요."']],
    c: [
      { t: '정면으로 덤빈다', go: 'f_queen_fight', at: 'spring' },
      { t: '횃불로 거미줄을 불태우며 공격한다', req: { item: 'torch' }, fx: { take: 'torch' }, go: 'f_queen_burn' },
      { t: '세렌과 협공한다', req: { comp: 'seren' }, go: 'f_queen_duo' },
      { t: '샘에 별빛을 흘려 정화한다', req: { any: [{ cls: 'cleric' }, { flag: 'star_awake' }] }, check: ['int', 13], ok: 'f_purify_ok', no: 'f_purify_no' },
      { t: '성수를 샘에 붓는다', req: { item: 'holy_water' }, fx: { take: 'holy_water' }, go: 'f_purify_ok' },
    ],
  },
  f_queen_fight: {
    loc: 'forest',
    t: `여왕 거미가 몸을 일으킨다. 여덟 개의 눈이 보랏빛으로 타오른다.`,
    combat: { e: 'spider_queen', win: 'f_queen_win', lose: 'f_queen_lose' },
  },
  f_queen_burn: {
    loc: 'forest',
    t: `횃불을 거미줄에 던지자 불길이 순식간에 번진다. 여왕이 비명을 지르며 불타는 둥지에서 뛰쳐나온다. 이미 몸 곳곳이 그을렸다.`,
    combat: { e: 'spider_queen', hp: -12, win: 'f_queen_win', lose: 'f_queen_lose' },
  },
  f_queen_duo: {
    loc: 'forest',
    who: ['seren'],
    t: `세렌의 화살이 여왕의 등 혹 하나를 꿰뚫는다. 보랏빛 독이 터져 나온다. 여왕이 분노에 차 당신에게 달려든다.`,
    combat: { e: 'spider_queen', hp: -8, win: 'f_queen_win', lose: 'f_queen_lose' },
  },
  f_purify_no: {
    loc: 'forest',
    t: `빛을 흘려 보내지만 샘의 독이 너무 짙다. 오히려 여왕이 빛에 이끌려 깨어난다.`,
    combat: { e: 'spider_queen', win: 'f_queen_win', lose: 'f_queen_lose' },
  },
  f_purify_ok: {
    loc: 'forest',
    t: `빛이 검은 물에 닿는 순간, 샘 바닥에서부터 맑은 물이 솟구친다. 여왕 거미가 비명을 지르며 몸부림친다. 독으로 이루어진 몸이 맑은 물에 녹아내린다.

얼마 지나지 않아 샘은 투명하게 빛나고, 썩었던 나무뿌리에 초록 새순이 돋는다.`,
    fx: { flag: ['spring_pure', 'queen_dead'], rep: { circle: 2 } },
    next: 'f_heart_walk',
  },
  f_queen_lose: {
    loc: 'forest',
    who: ['seren'],
    t: `여왕의 독니가 당신을 꿰뚫는다. 쓰러지는 순간, 숲 전체가 진동한다. 땅에서 뿌리가 솟구쳐 여왕을 휘감고 샘 속으로 끌어내린다.

늙은 뿌리가 마지막 힘을 짜낸 것이다. 당신은 살았지만, 숲 깊은 곳에서 무언가 꺾이는 소리가 들린다.`,
    fx: { hp: 8, flag: ['queen_dead', 'root_weakened'], rep: { circle: -1 } },
    next: 'f_heart_walk',
  },
  f_queen_win: {
    loc: 'forest',
    t: `여왕 거미가 마지막으로 경련하더니 검은 연기가 되어 흩어진다. 샘의 물은 여전히 탁하지만, 더는 썩어 들어가지 않는다.`,
    fx: { flag: 'queen_dead', rep: { circle: 1 } },
    c: [
      { t: '성수를 부어 샘을 정화한다', req: { item: 'holy_water' }, fx: { take: 'holy_water', flag: 'spring_pure', rep: { circle: 1 } }, go: 'f_spring_clean' },
      { t: '샘에 별빛을 흘려 보낸다', req: { any: [{ cls: 'cleric' }, { flag: 'star_awake' }] }, fx: { flag: 'spring_pure', rep: { circle: 1 }, hp: -3 }, go: 'f_spring_clean' },
      { t: '숲의 심장으로 돌아간다', go: 'f_heart_walk' },
    ],
  },
  f_spring_clean: {
    loc: 'forest',
    t: `맑은 물이 샘 바닥에서 솟구친다. 검은 물이 밀려나고, 주변 나무뿌리에 초록 새순이 돋아난다. 숲 전체가 안도의 한숨을 쉬는 것 같다.`,
    next: 'f_heart_walk',
  },
  f_heart_walk: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    t: (s) =>
      s.flags.spring_pure
        ? '늙은 뿌리 앞으로 돌아오자, 나무의 검은 껍질 사이로 초록빛이 번지고 있다. 엘로웬이 말없이 나무에 손을 얹고 있다. 그녀의 눈가가 젖어 있다.'
        : '늙은 뿌리 앞으로 돌아온다. 썩음은 멈췄지만 나무는 여전히 지쳐 보인다. 엘로웬이 당신에게 길을 비킨다.',
    next: 'f_heart',
    nextLabel: '나무에 다가간다',
  },
  f_heart: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    spName: '늙은 뿌리',
    t: `나무껍질에 손을 대자 세상이 고요해진다. 땅 밑 깊은 곳에서, 천 년을 산 목소리가 울린다.

"별의 아이… 아니, 왕관의 혼이여. 너를 기억한다. 너는 내가 어린 묘목이었을 때 이 땅에 처음 떨어졌지. 그때 너는 왕관이 되었다. 그리고 지금 다시 떨어졌구나.

내 안에 너의 일부가 잠들어 있다. 가져가겠느냐?"`,
    c: [
      { t: '"네. 조각을 가져가겠습니다."', go: 'f_take' },
      { t: '"제가 왕관의 혼이라는 건 무슨 뜻이죠?"', check: ['int', 13], ok: 'f_root_talk', no: 'f_root_silent' },
      { t: '"이 숲에 남겨 두겠습니다. 숲이 더 필요로 하니까요."', go: 'f_leave_shard' },
    ],
  },
  f_root_silent: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    spName: '늙은 뿌리',
    t: `"그 답은… 내가 줄 수 없다. 너 스스로 기억해 내야 한다." 목소리가 희미해진다. "시간이 없다. 결정하거라."`,
    c: [
      { t: '조각을 가져간다', go: 'f_take' },
      { t: '숲에 남겨 둔다', go: 'f_leave_shard' },
    ],
  },
  f_root_talk: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    spName: '늙은 뿌리',
    t: `"왕관은 금으로 만든 물건이 아니다. 천 년 전, 이 땅에 떨어진 별 하나가 스스로 고리가 되어 장막을 감쌌지. 사람들은 그걸 '새벽의 왕관'이라 불렀다.

십 년 전 누군가 왕관을 부쉈을 때, 왕관의 혼은 하늘로 흩어졌다가 다시 떨어졌다. 너의 모습으로. 너는 그릇이 아니다, 아이야. 너는 왕관 그 자체다.

모르베인이라는 자는 그걸 안다. 그자가 원하는 건 조각이 아니라 너다. 세 조각을 모은 너를 녹여, 자신의 왕관을 만들려는 것이지."

나무가 잠시 침묵한다. 그리고 가지 하나가 내려와 당신의 손에 씨앗 하나를 떨어뜨린다.

"이 씨앗을 내 뿌리 곁에 심으면, 조각이 없어도 숲은 버틸 것이다. 그 대신 나는 깊은 잠에 들겠지."`,
    fx: { flag: 'know_truth', item: 'root_seed', journal: '늙은 뿌리가 말했다. 나는 그릇이 아니라 왕관 그 자체다. 모르베인은 조각을 모은 나를 녹여 자신의 왕관을 만들려 한다.' },
    c: [
      { t: '씨앗을 심고 조각을 가져간다', go: 'f_take_seed', fx: { take: 'root_seed' } },
      { t: '씨앗은 간직하고 조각만 가져간다', go: 'f_take' },
      { t: '조각을 남겨 두고 씨앗만 간직한다', go: 'f_leave_shard' },
    ],
  },
  f_take: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    t: (s) =>
      `나무껍질이 갈라지며 초록빛 조각이 당신의 손바닥으로 떠오른다. 따뜻하다. 조각이 가슴의 빛과 닿자 당신의 몸속으로 힘이 흘러든다.

` +
      (s.flags.spring_pure
        ? '샘이 맑아진 덕분인지, 나무는 조각을 잃고도 꿋꿋이 서 있다. 엘로웬이 당신에게 고개를 숙인다.'
        : '그러나 나무가 신음한다. 잎이 우수수 떨어진다. 엘로웬이 고개를 돌린다. "…숲은 이 일을 기억할 것이다."'),
    fx: [{ shard: 'verdant', maxhp: 5, heal: 'full', flag: 'forest_done', journal: '초록 조각을 얻었다.' }],
    x: [[{ not: 'spring_pure' }, '세렌이 아무 말 없이 떨어지는 잎을 바라본다.']],
    next: 'f_after',
  },
  f_take_seed: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    sp: 'elowen',
    t: `씨앗을 뿌리 곁에 묻자 땅이 부드럽게 떨린다. 작은 새순이 돋고, 늙은 뿌리가 낮게 한숨을 쉰다. 그리고 나무껍질이 열리며 초록 조각이 당신의 손에 내려앉는다.

엘로웬이 무릎을 꿇는다. 다른 엘프들도 따라 한다.

"별의 아이여. 너는 숲에서 아무것도 빼앗지 않았다. 원환은 이 일을 천 년 동안 노래할 것이다."`,
    fx: { shard: 'verdant', maxhp: 5, heal: 'full', rep: { circle: 3 }, flag: ['forest_done', 'root_saved'], journal: '씨앗을 심어 숲을 지키고 초록 조각을 얻었다.' },
    next: 'f_after',
  },
  f_leave_shard: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    sp: 'elowen',
    t: `당신은 나무에서 손을 뗀다. 엘로웬이 놀란 얼굴로 당신을 본다.

"왕관을 원하는 자들이 이 숲에 수없이 왔다. 조각을 두고 떠난 자는 네가 처음이다." 그녀가 지팡이를 땅에 꽂는다. "좋다. 원환은 너에게 빚을 졌다. 네가 마지막 싸움에 나설 때, 우리가 이 조각을 들고 너의 곁에 서겠다. 맹세한다."`,
    fx: { rep: { circle: 3 }, flag: ['forest_done', 'shard_with_circle', 'circle_ally'], maxhp: 3, heal: 'full', journal: '초록 조각을 숲에 남겼다. 마지막 싸움에서 푸른 원환이 조각을 들고 오기로 맹세했다.' },
    next: 'f_after',
  },
  f_after: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    sp: 'elowen',
    t: `떠날 채비를 하는 당신에게 엘로웬이 다가온다.`,
    c: [
      { t: '원환의 맹약을 받는다', req: { rep: { circle: 3 }, not: 'circle_pledge' }, fx: { flag: ['circle_ally', 'circle_pledge'], item: 'elf_arrow' }, go: 'f_pledge' },
      { t: '엘프 망토를 선물로 받는다', req: { rep: { circle: 2 }, not: 'got_cloak' }, fx: { item: 'elf_cloak', flag: 'got_cloak' }, go: 'f_after' },
      { t: '세렌에게 함께 가자고 한다', req: { noComp: 'seren', flag: 'seren_trust', not: 'seren_left' }, go: 'f_seren_join' },
      { t: '숲을 떠난다', go: 'f_leave' },
    ],
  },
  f_pledge: {
    loc: 'forest_heart',
    who: ['elowen', 'seren'],
    sp: 'elowen',
    t: `엘로웬이 은빛 깃이 달린 화살 하나를 건넨다. "마지막 싸움의 날, 이 화살을 하늘로 쏘아라. 원환의 모든 궁수가 너에게 갈 것이다."`,
    next: 'f_after',
  },
  f_seren_join: {
    loc: 'forest_heart',
    who: ['seren', 'elowen'],
    sp: 'seren',
    t: `세렌이 엘로웬을 돌아본다. 대드루이드는 한참 딸을 바라보다가, 천천히 고개를 끄덕인다.

"가거라. 숲은 언제나 네가 돌아올 곳이다."

세렌이 당신 옆에 선다. "그럼, 잘 부탁해요. 길을 잃으면 제가 찾아 드릴게요."

[세렌은 지능 판정에 +2를 더해 주고, 전투에서 함께 싸운다.]`,
    fx: { comp: 'seren' },
    next: 'f_after',
  },
  f_leave: {
    loc: 'forest',
    t: `초록 빛이 등 뒤로 멀어진다. 숲 가장자리에서 돌아보니, 나무들이 바람도 없이 일제히 가지를 흔든다. 배웅처럼.`,
    fx: { flag: 'forest_done' },
    next: 'x_cross',
    nextLabel: '갈림길로 돌아간다',
  },
  f_return: {
    loc: 'forest',
    t: (s) =>
      s.flags.root_saved || s.flags.spring_pure
        ? '숲은 생기를 되찾았다. 새들이 노래하고, 썩었던 나무껍질에 새순이 돋아 있다. 엘프 궁수 하나가 나무 위에서 당신에게 손을 흔든다.'
        : '숲은 고요하다. 너무 고요하다. 엘프들은 모습을 드러내지 않는다.',
    c: [
      { t: '늙은 뿌리 곁에서 쉰다', req: { any: [{ flag: 'root_saved' }, { flag: 'spring_pure' }] }, fx: { heal: 'full' }, go: 'f_return' },
      { t: '갈림길로 돌아간다', go: 'x_cross' },
    ],
  },

  // ── 안개 늪
  s_enter: {
    loc: 'swamp',
    chapter: '외전 · 안개 늪',
    t: `발목까지 차오르는 검은 물. 안개가 너무 짙어서 손을 뻗으면 손끝이 사라진다. 어디선가 개구리 울음과, 개구리가 아닌 무언가의 숨소리가 들린다.

안개 너머로 기울어진 오두막의 불빛이 보인다.`,
    c: [
      { t: '오두막으로 간다', go: 's_hut', at: 'hut' },
      { t: '물 위에 핀 하얀 꽃을 따러 간다', go: 's_lily', at: 'bog', req: { not: 'lily_done' } },
      { t: '갈림길로 돌아간다', go: 'x_cross' },
    ],
  },
  s_lily: {
    loc: 'swamp',
    t: `하얀 꽃 한 송이가 검은 물 위에 떠 있다. 손을 뻗는 순간, 물이 부풀어 오른다. 이끼와 뼈로 이루어진 거대한 형체가 일어선다.`,
    combat: { e: 'bog', win: 's_lily_win', lose: 's_lily_lose', flee: 's_enter' },
  },
  s_lily_win: {
    loc: 'swamp',
    t: `괴물이 진흙으로 무너진다. 꽃은 상처 하나 없이 그대로다. 손에 쥐자 은은한 향이 난다.`,
    fx: { item: 'bog_lily', flag: 'lily_done' },
    next: 's_enter',
  },
  s_lily_lose: {
    loc: 'swamp',
    t: `괴물에게 물속으로 끌려들어 간다. 숨이 막히는 순간 누군가 당신의 머리채를 잡아 끌어올린다. 정신을 차리니 오두막 앞이다.`,
    fx: { hp: 6, flag: 'orma_saved' },
    next: 's_hut',
  },
  s_hut: {
    loc: 'swamp',
    who: ['orma'],
    sp: 'orma',
    t: (s) =>
      s.visited.s_hut > 1
        ? '"또 왔느냐, 별 아이야." 오르마가 솥을 젓는다. "이번엔 무얼 원하느냐."'
        : `오두막 안은 말린 뱀과 유리병, 끓는 솥으로 가득하다. 굽은 허리의 노파가 솥을 저으며 웃는다. 이가 세 개뿐이다.

"오호라. 하늘에서 떨어진 왕관 부스러기가 내 집에 왔구나. 나는 오르마. 이 늪의 주인이지." 그녀가 국자로 당신을 가리킨다. "무엇이든 알려 주마. 무엇이든 팔아 주마. 값만 치른다면."`,
    x: [[{ flag: 'orma_saved' }, '"늪 괴물한테 잡아먹힐 뻔했지? 끌어 올린 값은 나중에 받으마. 흐흐."']],
    c: [
      { t: '"제 운명을 보여 주세요." (최대 체력 -4)', go: 's_fate', req: { not: 'orma_fate' }, fx: { maxhp: -4, flag: 'orma_fate' } },
      { t: '늪 백합을 건넨다', req: { item: 'bog_lily' }, fx: { take: 'bog_lily' }, go: 's_lily_trade' },
      { t: '"그 병 속의 빛은 뭐죠?"', req: { noItem: 'witch_vial', not: 'vial_asked' }, go: 's_vial', fx: { flag: 'vial_asked' } },
      { t: '물약을 산다 (금화 8)', req: { gold: 8 }, fx: { gold: -8, item: 'potion' }, go: 's_hut' },
      { t: '"제 안의 별을 꺼내 줄 수 있나요?"', go: 's_heart_deal', req: { flag: 'orma_fate' } },
      { t: '오두막을 나선다', go: 's_enter' },
    ],
  },
  s_fate: {
    loc: 'swamp',
    who: ['orma'],
    sp: 'orma',
    t: `오르마가 당신의 손가락을 바늘로 찌른다. 핏방울이 솥에 떨어지자 김이 은빛으로 변한다. 김 속에 장면들이 떠오른다.

왕좌에 앉은 당신. 부서진 왕관 앞에서 웃는 사람들. 하늘에 녹아드는 당신. 보랏빛 왕관을 쓴 당신. 그리고 아무것도 없이 바닷가를 걷는 당신.

"갈래가 많구나." 오르마가 혀를 찬다. "알려 주마. 선왕을 죽인 건 모르베인이다. 섭정 바렌은 그걸 알면서 입을 다물었지. 대가로 왕좌를 받았거든.

그리고 별 아이야, 끝에 가면 누군가 너에게 장막이 되라고 할 게다. 그게 정말 유일한 길인지는… 네가 몇 명의 손을 잡고 있느냐에 달렸지."`,
    fx: { flag: ['know_truth_king', 'varen_suspect'], journal: '오르마의 예언: 선왕을 죽인 것은 모르베인이고, 바렌은 그 대가로 왕좌를 받았다. 끝에서 내가 몇 명의 손을 잡고 있느냐가 중요하다.' },
    next: 's_hut',
  },
  s_lily_trade: {
    loc: 'swamp',
    who: ['orma'],
    sp: 'orma',
    t: `오르마의 눈이 반짝인다. "늪 백합! 이걸 딴 자는 십 년 만이다." 그녀는 꽃을 솥에 넣고 무언가를 중얼거린다. 솥에서 퍼낸 초록 국물을 당신에게 내민다. "마셔라. 맛은 끔찍하지만 오래 살게 해 주지."`,
    fx: { maxhp: 6, heal: 'full', gold: 10 },
    next: 's_hut',
  },
  s_vial: {
    loc: 'swamp',
    who: ['orma'],
    sp: 'orma',
    t: `선반 위 작은 유리병 안에서 별빛 같은 것이 맴돌고 있다.

"아, 그거. 백 년 전에 떨어진 별똥별 부스러기다. 목숨 하나를 대신해 줄 수 있지. 딱 한 번." 오르마가 이를 드러내고 웃는다. "값은 금화 마흔. 아니면… 너의 기억 하나."`,
    c: [
      { t: '금화 40을 낸다', req: { gold: 40 }, fx: { gold: -40, item: 'witch_vial' }, go: 's_hut' },
      { t: '기억 하나를 내준다 (지능 -1)', fx: { stat: { int: -1 }, item: 'witch_vial', flag: 'gave_memory' }, go: 's_vial_memory' },
      { t: '사양한다', go: 's_hut' },
    ],
  },
  s_vial_memory: {
    loc: 'swamp',
    who: ['orma'],
    sp: 'orma',
    t: `오르마가 당신의 이마에 손가락을 댄다. 무언가가 빠져나간다. 무엇이었는지조차 기억나지 않는다. 다만 가슴 한구석이 조금 비었다.

"고맙다. 아주 맛있는 기억이었어." 그녀가 병을 건넨다.`,
    next: 's_hut',
  },
  s_heart_deal: {
    loc: 'swamp',
    who: ['orma'],
    sp: 'orma',
    t: `오르마가 솥 젓던 손을 멈춘다. 처음으로 그녀의 웃음이 사라진다.

"꺼낼 수 있지. 별을 꺼내면 너는 평범한 사람이 된다. 왕관도, 예언도, 모르베인도 너를 찾지 않겠지. 대신 별은 내가 갖는다. 그리고 장막은… 누군가 다른 방법을 찾거나, 찾지 못하겠지."

그녀가 당신을 빤히 본다. "진심이냐?"`,
    c: [
      { t: '"네. 꺼내 주세요."', go: 'e_witch' },
      { t: '"아니요. 아직은."', go: 's_hut' },
    ],
  },
};
