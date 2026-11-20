// 이야기 엔진: 상태, 조건 검사, 효과 적용, 주사위 판정
import { CLASSES, BACKGROUNDS, ITEMS, COMPANIONS, STAT_NAMES, REP_NAMES, SHARD_NAMES, ALLY_FLAGS } from './data.js';

export const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
export const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// 받침에 따라 조사를 고른다: josa('물약', '을', '를') → '물약을'
export function josa(word, withFinal, without) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return word + withFinal;
  return word + ((c - 0xac00) % 28 ? withFinal : without);
}

export function newState(name, clsId, bgId) {
  const c = CLASSES[clsId];
  const bg = BACKGROUNDS[bgId];
  const stats = { ...c.stats };
  for (const k in bg.stats || {}) stats[k] += bg.stats[k];
  const items = { ...c.items };
  for (const k in bg.items || {}) items[k] = (items[k] || 0) + bg.items[k];
  return {
    v: 1,
    name,
    cls: clsId,
    bg: bgId,
    stats,
    hp: c.hp,
    maxhp: c.hp,
    gold: c.gold + (bg.gold || 0),
    items,
    flags: { ['bg_' + bgId]: true, ['cls_' + clsId]: true },
    rep: { order: 0, circle: 0, hand: 0, dwarf: 0 },
    comps: [],
    shards: [],
    node: 'p_wake',
    visited: {},
    journal: [],
    started: Date.now(),
  };
}

export const allyCount = (s) => ALLY_FLAGS.filter((f) => s.flags[f]).length;

// 조건 검사. 요구 조건 객체(또는 배열)를 받는다.
export function test(s, r) {
  if (!r) return true;
  if (Array.isArray(r)) return r.every((x) => test(s, x));
  if (r.any && !r.any.some((x) => test(s, x))) return false;
  if (r.flag && !arr(r.flag).every((f) => s.flags[f])) return false;
  if (r.not && arr(r.not).some((f) => s.flags[f])) return false;
  if (r.item && !arr(r.item).every((i) => (s.items[i] || 0) > 0)) return false;
  if (r.noItem && arr(r.noItem).some((i) => (s.items[i] || 0) > 0)) return false;
  if (r.gold != null && s.gold < r.gold) return false;
  if (r.cls && !arr(r.cls).includes(s.cls)) return false;
  if (r.comp && !arr(r.comp).every((c) => s.comps.includes(c))) return false;
  if (r.noComp && arr(r.noComp).some((c) => s.comps.includes(c))) return false;
  if (r.shards != null && s.shards.length < r.shards) return false;
  if (r.maxShards != null && s.shards.length > r.maxShards) return false;
  if (r.shard && !arr(r.shard).every((x) => s.shards.includes(x))) return false;
  if (r.noShard && arr(r.noShard).some((x) => s.shards.includes(x))) return false;
  if (r.rep) for (const k in r.rep) if ((s.rep[k] || 0) < r.rep[k]) return false;
  if (r.repBelow) for (const k in r.repBelow) if ((s.rep[k] || 0) >= r.repBelow[k]) return false;
  if (r.allies != null && allyCount(s) < r.allies) return false;
  if (r.stat) for (const k in r.stat) if (s.stats[k] < r.stat[k]) return false;
  if (r.visited && !arr(r.visited).every((v) => s.visited[v])) return false;
  if (r.notVisited && arr(r.notVisited).some((v) => s.visited[v])) return false;
  if (r.hp != null && s.hp < r.hp) return false;
  return true;
}

// 조건이 '숨김'이어야 하는지: 플래그나 평판처럼 스포일러가 되는 조건은 숨긴다.
const SECRET_KEYS = ['flag', 'not', 'rep', 'repBelow', 'allies', 'visited', 'notVisited', 'noItem', 'noComp', 'noShard', 'maxShards', 'any'];
export function isSecret(r) {
  if (!r) return false;
  if (Array.isArray(r)) return r.some(isSecret);
  return SECRET_KEYS.some((k) => r[k] != null);
}

// 보이는 조건에 대한 짧은 꼬리표
export function reqLabel(r) {
  if (!r) return '';
  if (Array.isArray(r)) return r.map(reqLabel).filter(Boolean).join(' · ');
  const out = [];
  for (const i of arr(r.item)) out.push(ITEMS[i]?.name || i);
  for (const c of arr(r.comp)) out.push(COMPANIONS[c]?.name + ' 동행');
  for (const c of arr(r.cls)) out.push(CLASSES[c]?.name);
  if (r.gold != null) out.push(`금화 ${r.gold}`);
  if (r.shards != null) out.push(`조각 ${r.shards}개`);
  for (const x of arr(r.shard)) out.push(SHARD_NAMES[x]);
  if (r.stat) for (const k in r.stat) out.push(`${STAT_NAMES[k]} ${r.stat[k]}+`);
  if (r.hp != null) out.push(`체력 ${r.hp}+`);
  return out.join(' · ');
}

// 판정에 쓰는 능력치 합계: 기본 + 동료 + 장비
export function statTotal(s, stat) {
  let v = s.stats[stat] || 0;
  for (const c of s.comps) if (COMPANIONS[c]?.bonus === stat) v += 2;
  for (const i in s.items) if (s.items[i] > 0 && ITEMS[i]?.bonus?.[stat]) v += ITEMS[i].bonus[stat];
  return v;
}

export function roll(s, stat, dc) {
  const d = rand(1, 20);
  const bonus = statTotal(s, stat);
  const total = d + bonus;
  const ok = d === 20 || (d !== 1 && total >= dc);
  return { d, bonus, total, dc, stat, ok, crit: d === 20, fumble: d === 1 };
}

export function weapon(s) {
  let best = { hit: 0, dmg: 0 };
  for (const i in s.items) {
    const w = s.items[i] > 0 && ITEMS[i]?.weapon;
    if (w && w.dmg > best.dmg) best = w;
  }
  return best;
}

export function armorClass(s) {
  let ac = 10 + statTotal(s, 'dex');
  for (const i in s.items) if (s.items[i] > 0 && ITEMS[i]?.armor) ac += ITEMS[i].armor;
  return ac;
}

// 효과 적용. 화면에 띄울 알림 문자열 배열을 돌려준다.
export function applyFx(s, fx) {
  const msgs = [];
  if (!fx) return msgs;
  if (Array.isArray(fx)) {
    for (const f of fx) msgs.push(...applyFx(s, f));
    return msgs;
  }
  if (fx.maxhp) {
    s.maxhp += fx.maxhp;
    s.hp += fx.maxhp;
    msgs.push(`최대 체력 ${fx.maxhp > 0 ? '+' : ''}${fx.maxhp}`);
  }
  if (fx.heal === 'full') {
    if (s.hp < s.maxhp) msgs.push('체력이 모두 회복되었다');
    s.hp = s.maxhp;
  }
  if (fx.hp) {
    const before = s.hp;
    s.hp = Math.max(0, Math.min(s.maxhp, s.hp + fx.hp));
    const d = s.hp - before;
    if (d) msgs.push(`체력 ${d > 0 ? '+' : ''}${d}`);
  }
  if (fx.gold) {
    const before = s.gold;
    s.gold = Math.max(0, s.gold + fx.gold);
    const d = s.gold - before;
    if (d) msgs.push(`금화 ${d > 0 ? '+' : ''}${d}`);
  }
  for (const it of arr(fx.item)) {
    s.items[it] = (s.items[it] || 0) + 1;
    msgs.push(`획득: ${ITEMS[it]?.name || it}`);
  }
  for (const it of arr(fx.take)) {
    if (s.items[it] > 0) {
      s.items[it] -= 1;
      if (!s.items[it]) delete s.items[it];
      msgs.push(`잃음: ${ITEMS[it]?.name || it}`);
    }
  }
  for (const f of arr(fx.flag)) s.flags[f] = true;
  for (const f of arr(fx.unflag)) delete s.flags[f];
  if (fx.rep) {
    for (const k in fx.rep) {
      s.rep[k] = (s.rep[k] || 0) + fx.rep[k];
      msgs.push(`${REP_NAMES[k]} 평판 ${fx.rep[k] > 0 ? '▲' : '▼'}`);
    }
  }
  if (fx.stat) {
    for (const k in fx.stat) {
      s.stats[k] += fx.stat[k];
      msgs.push(`${STAT_NAMES[k]} ${fx.stat[k] > 0 ? '+' : ''}${fx.stat[k]}`);
    }
  }
  for (const c of arr(fx.comp)) {
    if (!s.comps.includes(c)) {
      s.comps.push(c);
      msgs.push(`${josa(COMPANIONS[c].name, '이', '가')} 동료가 되었다`);
    }
  }
  for (const c of arr(fx.leave)) {
    if (s.comps.includes(c)) {
      s.comps = s.comps.filter((x) => x !== c);
      msgs.push(`${josa(COMPANIONS[c].name, '이', '가')} 떠났다`);
    }
  }
  for (const x of arr(fx.shard)) {
    if (!s.shards.includes(x)) {
      s.shards.push(x);
      msgs.push(`왕관 조각 획득: ${SHARD_NAMES[x]}`);
    }
  }
  if (fx.journal) s.journal.push(fx.journal);
  return msgs;
}

export function fill(s, text) {
  return String(text).replaceAll('{name}', s.name);
}

// 노드 본문: 문자열 또는 함수, 그리고 조건부 문단 x: [[조건, 문단], ...]
export function nodeText(s, n) {
  let t = typeof n.t === 'function' ? n.t(s) : n.t || '';
  for (const [cond, extra] of n.x || []) if (test(s, cond)) t += '\n\n' + extra;
  return fill(s, t);
}

// 선택지 정규화
export function normChoice(c) {
  if (Array.isArray(c)) return { t: c[0], go: c[1], fx: c[2] };
  return c;
}

export function visibleChoices(s, n, nodeId) {
  const list = (n.c || []).map(normChoice);
  const out = [];
  list.forEach((c, idx) => {
    const key = `o:${nodeId}:${idx}`;
    if (c.once && s.flags[key]) return;
    const ok = test(s, c.req);
    if (!ok && (c.hide || isSecret(c.req))) return;
    out.push({ ...c, idx, key, ok, label: reqLabel(c.req) });
  });
  return out;
}

// 저장 (브라우저 저장소가 막혀 있어도 게임은 진행된다)
const SAVE_KEY = 'ashen-crown-save-v1';
const END_KEY = 'ashen-crown-endings-v1';
export function save(s) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* 무시 */
  }
}
export function endingsSeen() {
  try {
    return JSON.parse(localStorage.getItem(END_KEY) || '{}');
  } catch {
    return {};
  }
}
export function recordEnding(id) {
  const seen = endingsSeen();
  seen[id] = (seen[id] || 0) + 1;
  try {
    localStorage.setItem(END_KEY, JSON.stringify(seen));
  } catch {
    /* 무시 */
  }
  return seen;
}
