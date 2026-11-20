// 이야기 데이터 검증: 끊어진 연결, 없는 장소·인물·아이템, 도달 불가능한 노드를 찾는다.
// 실행: node trpg/tools/validate.mjs
import { NODES, ENDINGS } from '../src/story/index.js';
import { ACTORS, ENEMIES, ITEMS, COMPANIONS } from '../src/data.js';
import { PLACES, LANDMARKS } from '../src/places.js';

const errors = [];
const warn = [];
const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const norm = (c) => (Array.isArray(c) ? { t: c[0], go: c[1], fx: c[2] } : c);

function checkFx(id, fx) {
  for (const f of arr(fx)) {
    for (const it of [...arr(f.item), ...arr(f.take)]) if (!ITEMS[it]) errors.push(`${id}: 없는 아이템 ${it}`);
    for (const c of [...arr(f.comp), ...arr(f.leave)]) if (!COMPANIONS[c]) errors.push(`${id}: 없는 동료 ${c}`);
  }
}
function checkReq(id, r) {
  if (!r) return;
  if (Array.isArray(r)) return r.forEach((x) => checkReq(id, x));
  if (r.any) r.any.forEach((x) => checkReq(id, x));
  for (const it of [...arr(r.item), ...arr(r.noItem)]) if (!ITEMS[it]) errors.push(`${id}: 조건에 없는 아이템 ${it}`);
  for (const c of [...arr(r.comp), ...arr(r.noComp)]) if (!COMPANIONS[c]) errors.push(`${id}: 조건에 없는 동료 ${c}`);
  for (const v of [...arr(r.visited), ...arr(r.notVisited)]) if (!NODES[v]) errors.push(`${id}: 조건에 없는 노드 ${v}`);
}

const edges = {};
let lastLoc = {};
for (const [id, n] of Object.entries(NODES)) {
  const targets = [];
  if (n.loc && !PLACES[n.loc]) errors.push(`${id}: 없는 장소 ${n.loc}`);
  for (const w of n.who || []) if (!ACTORS[w]) errors.push(`${id}: 없는 인물 ${w}`);
  if (n.sp && !ACTORS[n.sp]) errors.push(`${id}: 없는 화자 ${n.sp}`);
  checkFx(id, n.fx);
  if (n.next) targets.push(n.next);
  if (n.combat) {
    if (!ENEMIES[n.combat.e]) errors.push(`${id}: 없는 적 ${n.combat.e}`);
    targets.push(n.combat.win, n.combat.lose || 'death');
    if (n.combat.flee) targets.push(n.combat.flee);
  }
  const base = PLACES[n.loc]?.base;
  for (const raw of n.c || []) {
    const c = norm(raw);
    if (c.check) {
      if (!c.ok || !c.no) errors.push(`${id}: 판정 선택지에 ok/no 없음 (${c.t})`);
      targets.push(c.ok, c.no);
    } else {
      if (!c.go) errors.push(`${id}: 선택지에 go 없음 (${c.t})`);
      targets.push(c.go);
    }
    checkFx(id, c.fx);
    checkFx(id, c.okfx);
    checkReq(id, c.req);
    if (c.at && base && !LANDMARKS[base]?.[c.at]) errors.push(`${id}: 장소 ${base}에 표식 ${c.at} 없음`);
  }
  if (!n.end && !targets.length) errors.push(`${id}: 막다른 노드 (선택지 없음)`);
  for (const t of targets) if (!NODES[t]) errors.push(`${id}: 없는 노드로 연결 → ${t}`);
  edges[id] = targets;
  if (!n.loc && !n.end) warn.push(`${id}: 장소 없음 (이전 장소 유지)`);
}

// 도달 가능성
const seen = new Set(['p_wake']);
const q = ['p_wake'];
while (q.length) {
  const id = q.shift();
  for (const t of edges[id] || []) if (NODES[t] && !seen.has(t)) seen.add(t), q.push(t);
}
const unreachable = Object.keys(NODES).filter((id) => !seen.has(id));
for (const u of unreachable) warn.push(`도달 불가능: ${u}`);
const endIds = new Set(Object.values(NODES).filter((n) => n.end).map((n) => n.end.id));
for (const e of ENDINGS) if (!endIds.has(e.id)) errors.push(`엔딩 노드 없음: ${e.id}`);

const nodeCount = Object.keys(NODES).length;
const choiceCount = Object.values(NODES).reduce((a, n) => a + (n.c?.length || 0), 0);
const chars = Object.values(NODES).reduce((a, n) => a + (typeof n.t === 'string' ? n.t.length : 400), 0);
console.log(`노드 ${nodeCount}개, 선택지 ${choiceCount}개, 엔딩 ${endIds.size}종, 본문 약 ${Math.round(chars / 1000)}천 자`);
for (const w of warn) console.log('경고:', w);
if (errors.length) {
  for (const e of errors) console.log('오류:', e);
  process.exit(1);
}
console.log('검증 통과');
