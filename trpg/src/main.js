// 게임 진행: 제목 화면, 캐릭터 만들기, 이야기 진행, 주사위, 전투, 인물 정보, 저장, 엔딩
import { World } from './world.js';
import { NODES, ENDINGS } from './story/index.js';
import { CLASSES, BACKGROUNDS, ITEMS, COMPANIONS, STAT_NAMES, REP_NAMES, SHARD_NAMES, ACTORS, ENEMIES } from './data.js';
import * as E from './engine.js';
import { Combat } from './combat.js';
import { PLACES } from './places.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const world = new World($('world'));
let S = null;
let undoState = null;
let busy = false;
let typing = null;
let lastChapter = null;
let combat = null;
let currentChoices = [];
let screen = 'title';

// ── 제목 화면 배경
world.load('village_night');
world.player.visible = false;
world.locked = true;
world.pitch = 0.22;
world.dist = 13;
(function orbit() {
  if (screen === 'title' || screen === 'create') world.yaw += 0.0009;
  requestAnimationFrame(orbit);
})();
setTimeout(() => $('boot').classList.add('gone'), 350);
if (E.load()) $('btn-continue').hidden = false;

$('btn-new').onclick = () => openCreate();
$('btn-continue').onclick = () => {
  const s = E.load();
  if (s && NODES[s.node]) startGame(s, true);
};
$('btn-endings').onclick = () => showEndings();
$('btn-endings2').onclick = () => showEndings();

// ── 캐릭터 만들기
let pickCls = 'warrior';
let pickBg = 'hunter';
function openCreate() {
  screen = 'create';
  $('title').hidden = true;
  $('create').hidden = false;
  const cc = $('class-cards');
  cc.innerHTML = '';
  for (const [id, c] of Object.entries(CLASSES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card';
    b.setAttribute('aria-pressed', id === pickCls);
    b.innerHTML = `<h3>${c.name}</h3><span class="tl">${c.tagline}</span><p>${c.desc}</p>
      <div class="statline">${Object.entries(c.stats).map(([k, v]) => `<span>${STAT_NAMES[k]} <b>+${v}</b></span>`).join('')}<span>체력 <b>${c.hp}</b></span></div>
      <p class="tl">기술: ${c.skill.name}. ${c.skill.desc}</p>`;
    b.onclick = () => {
      pickCls = id;
      openCreate();
    };
    cc.append(b);
  }
  const bc = $('bg-cards');
  bc.innerHTML = '';
  for (const [id, g] of Object.entries(BACKGROUNDS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card';
    b.setAttribute('aria-pressed', id === pickBg);
    b.innerHTML = `<h3>${g.name}</h3><p>${g.desc}</p>`;
    b.onclick = () => {
      pickBg = id;
      openCreate();
    };
    bc.append(b);
  }
  const preview = E.newState('미리보기', pickCls, pickBg);
  $('create-summary').textContent =
    Object.entries(preview.stats)
      .map(([k, v]) => `${STAT_NAMES[k]} +${v}`)
      .join(' · ') + ` · 체력 ${preview.hp} · 금화 ${preview.gold}`;
  world.setPlayer(pickCls);
}
$('btn-back').onclick = () => {
  screen = 'title';
  $('create').hidden = true;
  $('title').hidden = false;
};
$('create-form').onsubmit = (e) => {
  e.preventDefault();
  const name = ($('hero-name').value || '').trim().slice(0, 10) || '세아';
  startGame(E.newState(name, pickCls, pickBg), false);
};

async function startGame(state, fromLoad) {
  S = state;
  undoState = null;
  lastChapter = null;
  screen = 'game';
  $('title').hidden = true;
  $('create').hidden = true;
  $('ending').hidden = true;
  $('hud').hidden = false;
  $('place-tag').hidden = false;
  world.setPlayer(S.cls);
  world.player.visible = true;
  world.locked = false;
  world.pitch = 0.38;
  world.loc = null;
  await go(S.node, { fromLoad });
  const h = $('hint');
  h.hidden = false;
  h.style.opacity = 1;
  setTimeout(() => (h.style.opacity = 0), 9000);
  setTimeout(() => (h.hidden = true), 10000);
}

// ── 이야기 진행
async function transition(loc) {
  const f = $('fade');
  if (world.loc) {
    f.classList.add('on');
    await wait(reduce ? 0 : 450);
  }
  world.load(loc);
  const tag = $('place-tag');
  tag.textContent = PLACES[loc]?.name || '';
  tag.hidden = false;
  f.classList.remove('on');
}

function showChapter(text) {
  const c = $('chapter');
  c.textContent = text;
  c.classList.add('show');
  clearTimeout(showChapter.t);
  showChapter.t = setTimeout(() => c.classList.remove('show'), 2600);
}

async function go(id, { fromLoad = false } = {}) {
  let n = NODES[id];
  if (!n) {
    console.error('없는 노드', id);
    id = 'x_cross';
    n = NODES[id];
  }
  S.node = id;
  let msgs = [];
  if (!fromLoad) {
    S.visited[id] = (S.visited[id] || 0) + 1;
    msgs = E.applyFx(S, n.fx);
  }
  if (S.hp <= 0 && !n.end && !n.combat) return go('death');
  const loc = n.loc || S.loc || 'village';
  if (loc !== world.loc) await transition(loc);
  S.loc = loc;
  if (n.chapter && n.chapter !== lastChapter) {
    lastChapter = n.chapter;
    showChapter(n.chapter);
  }
  world.setActors(n.who || [], n.sp);
  updateHUD();
  toasts(msgs);
  if (n.end) return showEnding(n);
  E.save(S);
  if (n.combat) return startCombat(n);
  renderStory(n, id);
}

function speakerName(n) {
  if (n.sp) return ACTORS[n.sp]?.name || '';
  return n.spName || '';
}

function renderStory(n, id) {
  $('combat').hidden = true;
  $('story').hidden = false;
  $('story-pill').hidden = true;
  $('speaker').textContent = speakerName(n);
  let list;
  if (n.next) list = [{ t: n.nextLabel || '계속', go: n.next, ok: true, idx: 0, label: '' }];
  else list = E.visibleChoices(S, n, id);
  if (!list.length) list = [{ t: '갈림길로 돌아간다', go: 'x_cross', ok: true, idx: 0, label: '' }];
  currentChoices = list;
  const box = $('choices');
  box.innerHTML = '';
  box.hidden = true;
  list.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.disabled = !c.ok;
    let tags = '';
    if (c.check) {
      const [st, dc] = c.check;
      tags += `<span class="tag check">${STAT_NAMES[st]} ${dc} · +${E.statTotal(S, st)}</span>`;
    }
    if (c.label) tags += `<span class="tag req">${esc(c.label)}</span>`;
    if (c.at) tags += `<span class="tag at">표식</span>`;
    b.innerHTML = `<span class="n">${i + 1}</span><span class="t">${esc(E.fill(S, c.t))}</span>${tags}`;
    b.onclick = () => choose(c);
    box.append(b);
  });
  world.setMarkers(
    list.filter((c) => c.at),
    (c) => {
      if (busy || screen !== 'game' || combat) return;
      if (!c.ok) return toasts([`아직 할 수 없다: ${c.label || '조건 부족'}`], 'bad');
      choose(c);
    },
  );
  typeText(E.nodeText(S, n));
  $('story-text').scrollTop = 0;
}

function typeText(text) {
  const el = $('story-text');
  if (typing) clearInterval(typing.timer);
  if (reduce) {
    el.textContent = text;
    $('choices').hidden = false;
    typing = null;
    return;
  }
  let i = 0;
  el.textContent = '';
  const step = Math.max(2, Math.round(text.length / 260));
  typing = {
    text,
    timer: setInterval(() => {
      i += step;
      if (i >= text.length) return finishTyping();
      el.textContent = text.slice(0, i);
      el.scrollTop = el.scrollHeight;
    }, 16),
  };
}
function finishTyping() {
  if (!typing) return;
  clearInterval(typing.timer);
  const el = $('story-text');
  el.textContent = typing.text;
  typing = null;
  $('choices').hidden = false;
}
$('story-text').onclick = finishTyping;

async function choose(c) {
  if (busy || !c.ok) return;
  if (typing) finishTyping();
  busy = true;
  undoState = structuredClone(S);
  if (c.once && c.key) S.flags[c.key] = true;
  const msgs = E.applyFx(S, c.fx);
  let target = c.go;
  if (c.check) {
    const [stat, dc] = c.check;
    const r = E.roll(S, stat, dc);
    await showDice(r, c.t);
    msgs.push(...E.applyFx(S, r.ok ? c.okfx : c.nofx));
    target = r.ok ? c.ok : c.no;
  }
  toasts(msgs);
  if (S.hp <= 0) target = 'death';
  busy = false;
  await go(target);
}

async function showDice(r, label) {
  const d = $('dice');
  const num = $('dice-num');
  const die = d.querySelector('.d20');
  $('dice-label').textContent = `${STAT_NAMES[r.stat]} 판정 · 난이도 ${r.dc}`;
  $('dice-math').textContent = '';
  const res = $('dice-result');
  res.textContent = '';
  res.className = 'dice-result';
  d.hidden = false;
  die.classList.add('rolling');
  const t0 = performance.now();
  const dur = reduce ? 0 : 750;
  while (performance.now() - t0 < dur) {
    num.textContent = 1 + Math.floor(Math.random() * 20);
    await wait(55);
  }
  die.classList.remove('rolling');
  num.textContent = r.d;
  $('dice-math').textContent = `${r.d} ${r.bonus >= 0 ? '+' : '−'} ${Math.abs(r.bonus)} = ${r.total}`;
  res.textContent = r.crit ? '대성공' : r.fumble ? '대실패' : r.ok ? '성공' : '실패';
  res.classList.add(r.ok ? 'ok' : 'no');
  if (r.ok && S.flags.star_awake) world.burst(0xcfe0ff);
  await Promise.race([wait(1300), new Promise((ok) => (d.onclick = ok))]);
  d.onclick = null;
  d.hidden = true;
  void label;
}

// ── 전투
function startCombat(n) {
  combat = new Combat(S, n.combat);
  combat.node = n;
  world.spawnEnemy(combat.def);
  world.locked = true;
  world.clearMarkers();
  $('story').hidden = true;
  $('story-pill').hidden = true;
  $('combat').hidden = false;
  $('enemy-name').textContent = combat.def.name + (combat.def.count > 1 ? ` ×${combat.def.count}` : '');
  const log = $('combat-log');
  log.innerHTML = '';
  addLog(E.nodeText(S, n), 'dim');
  updateEnemy();
  renderActions();
}
function addLog(text, tone = '') {
  const li = document.createElement('li');
  li.className = tone;
  li.textContent = text;
  const log = $('combat-log');
  log.append(li);
  log.scrollTop = log.scrollHeight;
}
function updateEnemy() {
  const pct = Math.max(0, (combat.hp / combat.maxhp) * 100);
  $('enemy-hp').style.width = pct + '%';
  $('enemy-hp-text').textContent = `${Math.max(0, combat.hp)} / ${combat.maxhp}`;
}
function renderActions() {
  const box = $('combat-actions');
  box.innerHTML = '';
  combat.actions().forEach((a, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'act' + (i === 0 ? ' primary' : '');
    b.disabled = !!a.disabled || busy;
    b.innerHTML = `<b>${i + 1}. ${esc(a.label)}</b><small>${esc(a.sub)}</small>`;
    b.onclick = () => combatAct(a.id);
    box.append(b);
  });
}
async function combatAct(id) {
  if (busy || !combat || combat.over) return;
  busy = true;
  renderActions();
  const ev = combat.act(id);
  let result = null;
  for (const e of ev) {
    if (e.type === 'roll') {
      addLog(`주사위 ${e.d} ${e.bonus >= 0 ? '+' : '−'} ${Math.abs(e.bonus)} = ${e.d + e.bonus} (목표 ${e.dc}) ${e.ok ? '성공' : '실패'}`, 'roll');
      await wait(260);
    } else if (e.type === 'log') {
      addLog(e.text, e.tone);
      await wait(320);
    } else if (e.type === 'fx') {
      if (e.fx === 'attack') world.playerAttack(e.kind, e.color);
      else if (e.fx === 'hit') world.enemyHit(false);
      else if (e.fx === 'die') world.enemyHit(true);
      else if (e.fx === 'heal') world.heal(e.color);
      else if (e.fx === 'burst') world.burst();
      else if (e.fx === 'enemyAttack') world.enemyAttack();
      else if (e.fx === 'enemyMiss') world.enemyMiss();
      await wait(120);
    } else if (e.type === 'hurt') {
      const h = $('hurt');
      h.classList.add('on');
      setTimeout(() => h.classList.remove('on'), 120);
    } else if (e.type === 'end') result = e.result;
    updateEnemy();
    updateHUD();
  }
  busy = false;
  if (result) return endCombat(result);
  renderActions();
}
async function endCombat(result) {
  const spec = combat.spec;
  busy = true;
  await wait(900);
  world.clearEnemies();
  world.locked = false;
  $('combat').hidden = true;
  combat = null;
  busy = false;
  let target;
  if (result === 'win') {
    target = spec.win;
    toasts(['승리'], 'gold');
  } else if (result === 'flee') target = spec.flee;
  else {
    target = spec.lose || 'death';
    if (target !== 'death') S.hp = Math.max(S.hp, Math.ceil(S.maxhp * 0.25));
  }
  await go(target);
}

// ── HUD와 알림
function updateHUD() {
  if (!S) return;
  $('hud-name').textContent = S.name;
  $('hud-cls').textContent = `${CLASSES[S.cls].name} · ${BACKGROUNDS[S.bg].name}`;
  $('hud-hp').style.width = Math.max(0, (S.hp / S.maxhp) * 100) + '%';
  $('hud-hp-text').textContent = `체력 ${S.hp} / ${S.maxhp}`;
  $('hud-gold').textContent = S.gold;
  $('hud-shards').innerHTML = ['verdant', 'ember', 'silver'].map((k) => `<i class="shard ${k} ${S.shards.includes(k) ? 'on' : ''}" title="${SHARD_NAMES[k]}"></i>`).join('');
  $('hud-comps').textContent = S.comps.map((c) => COMPANIONS[c].name).join(' · ');
}

function toasts(list, tone) {
  const box = $('toasts');
  list.forEach((m, i) => {
    setTimeout(() => {
      const t = document.createElement('div');
      const auto = tone || (/-|잃음|▼|떠났다/.test(m) ? 'bad' : /금화|조각/.test(m) ? 'gold' : /동료/.test(m) ? 'ally' : 'good');
      t.className = 'toast ' + auto;
      t.textContent = m;
      box.append(t);
      setTimeout(() => t.remove(), 3300);
    }, i * 220);
  });
}

// ── 둘러보기
$('btn-collapse').onclick = () => {
  finishTyping();
  $('story').hidden = true;
  $('story-pill').hidden = false;
};
$('story-pill').onclick = () => {
  $('story').hidden = false;
  $('story-pill').hidden = true;
};

// ── 창들
function openModal(html) {
  $('modal-body').innerHTML = html;
  $('modal').hidden = false;
}
function closeModal() {
  $('modal').hidden = true;
}
$('modal-close').onclick = closeModal;
$('modal').onclick = (e) => {
  if (e.target.id === 'modal') closeModal();
};

function showSheet() {
  if (!S) return;
  const st = Object.keys(STAT_NAMES)
    .map((k) => {
      const base = S.stats[k];
      const tot = E.statTotal(S, k);
      return `<div><small>${STAT_NAMES[k]}</small><b>+${tot}${tot !== base ? ` <small>(기본 ${base})</small>` : ''}</b></div>`;
    })
    .join('');
  const w = E.weapon(S);
  const items = Object.entries(S.items).filter(([, n]) => n > 0);
  const itemHtml = items.length
    ? items
        .map(
          ([id, n]) =>
            `<li><div>${esc(ITEMS[id]?.name || id)}${n > 1 ? ` ×${n}` : ''}<small>${esc(ITEMS[id]?.desc || '')}</small></div>${ITEMS[id]?.use ? `<button type="button" class="mini" data-use="${id}">사용</button>` : ''}</li>`,
        )
        .join('')
    : '<li><div class="note">가진 것이 없다.</div></li>';
  const comps = S.comps.length ? S.comps.map((c) => `<li><div>${COMPANIONS[c].name}<small>${COMPANIONS[c].desc}</small></div></li>`).join('') : '<li><div class="note">아직 혼자다.</div></li>';
  const reps = Object.entries(REP_NAMES)
    .map(([k, name]) => {
      const v = S.rep[k] || 0;
      const pct = Math.min(50, Math.abs(v) * 8);
      return `<div class="rep"><span>${name}</span><span class="track"><i class="${v < 0 ? 'neg' : ''}" style="${v < 0 ? `right:50%;left:auto;width:${pct}%` : `width:${pct}%`}"></i></span><span>${v > 0 ? '+' : ''}${v}</span></div>`;
    })
    .join('');
  openModal(`<h2>${esc(S.name)}</h2>
    <p class="note">${CLASSES[S.cls].name} · ${BACKGROUNDS[S.bg].name} · 기술: ${CLASSES[S.cls].skill.name}${S.flags.star_awake ? ' · 별빛 폭발' : ''}</p>
    <div class="kv">${st}<div><small>체력</small><b>${S.hp} / ${S.maxhp}</b></div><div><small>방어</small><b>${E.armorClass(S)}</b></div><div><small>무기</small><b>명중 +${w.hit} · 피해 +${w.dmg}</b></div><div><small>금화</small><b>${S.gold}</b></div></div>
    <h3>왕관 조각</h3><p>${S.shards.length ? S.shards.map((x) => SHARD_NAMES[x]).join(', ') : '<span class="note">아직 없다.</span>'}</p>
    <h3>동료</h3><ul class="list">${comps}</ul>
    <h3>소지품</h3><ul class="list">${itemHtml}</ul>
    <h3>평판</h3><div style="display:grid;gap:6px">${reps}</div>`);
  $('modal-body')
    .querySelectorAll('[data-use]')
    .forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.use;
          if (combat) return;
          const before = S.hp;
          S.hp = Math.min(S.maxhp, S.hp + ITEMS[id].use.heal);
          S.items[id] -= 1;
          if (!S.items[id]) delete S.items[id];
          toasts([`${E.josa(ITEMS[id].name, '을', '를')} 사용했다 · 체력 +${S.hp - before}`]);
          world.heal();
          updateHUD();
          E.save(S);
          showSheet();
        }),
    );
}
function showJournal() {
  if (!S) return;
  const j = S.journal.length ? `<ol class="journal">${S.journal.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : '<p class="note">아직 기록할 만한 일이 없다.</p>';
  openModal(`<h2>모험 일지</h2>${j}`);
}
function showEndings() {
  const seen = E.endingsSeen();
  const n = ENDINGS.filter((e) => seen[e.id]).length;
  openModal(`<h2>엔딩 도감</h2><p class="note">${n} / ${ENDINGS.length}개를 보았다. 같은 처음에서도 선택에 따라 전혀 다른 끝에 닿는다.</p>
    <div class="endings">${ENDINGS.map((e) => (seen[e.id] ? `<div class="seen"><b>${e.title}</b><small>${seen[e.id]}번 봄</small></div>` : `<div class="locked"><b>???</b><small>단서: ${e.hint}</small></div>`)).join('')}</div>`);
}
function showMenu() {
  openModal(`<h2>메뉴</h2>
    <div class="menu-grid">
      <button type="button" class="btn" data-m="resume">계속하기</button>
      <button type="button" class="btn" data-m="endings">엔딩 도감</button>
      <button type="button" class="btn" data-m="help">조작법</button>
      <button type="button" class="btn" data-m="title">제목 화면으로 (자동 저장됨)</button>
      <button type="button" class="btn ghost" data-m="new">처음부터 새로 시작</button>
    </div>
    <p class="note">진행은 장면이 바뀔 때마다 이 브라우저에 자동 저장됩니다. 사생활 보호 창에서는 저장되지 않을 수 있습니다.</p>`);
  $('modal-body')
    .querySelectorAll('[data-m]')
    .forEach(
      (b) =>
        (b.onclick = () => {
          const m = b.dataset.m;
          if (m === 'resume') closeModal();
          else if (m === 'endings') showEndings();
          else if (m === 'help')
            openModal(`<h2>조작법</h2><ul class="list">
              <li><div>걷기<small>WASD 또는 방향키. Shift를 누르면 달린다. 휴대폰은 땅을 눌러 이동.</small></div></li>
              <li><div>시점<small>화면을 끌어서 돌리고, 마우스 휠로 가까이·멀리.</small></div></li>
              <li><div>선택<small>아래 선택지를 누르거나 숫자키 1~9. '표식' 꼬리표가 붙은 선택지는 세계의 빛나는 자리로 걸어가도 고를 수 있다.</small></div></li>
              <li><div>판정<small>주사위(d20) + 능력치 보정이 난이도 이상이면 성공. 20은 무조건 성공, 1은 무조건 실패. 동료와 장비가 보정을 올려 준다.</small></div></li>
              <li><div>둘러보기<small>이야기 창을 접고 주변을 걸어 다닐 수 있다.</small></div></li>
            </ul>`);
          else if (m === 'title') toTitle();
          else if (m === 'new') {
            E.clearSave();
            closeModal();
            toTitle();
            openCreate();
          }
        }),
    );
}
$('btn-sheet').onclick = showSheet;
$('hud-card').onclick = showSheet;
$('btn-journal').onclick = showJournal;
$('btn-menu').onclick = showMenu;

function toTitle() {
  if (S && !NODES[S.node]?.end) E.save(S);
  closeModal();
  screen = 'title';
  $('story').hidden = true;
  $('combat').hidden = true;
  $('story-pill').hidden = true;
  $('hud').hidden = true;
  $('place-tag').hidden = true;
  $('ending').hidden = true;
  $('title').hidden = false;
  $('btn-continue').hidden = !E.load();
  combat = null;
  world.clearEnemies();
  world.clearMarkers();
  world.clearActors();
  world.load('village_night');
  world.player.visible = false;
  world.locked = true;
  world.pitch = 0.22;
  world.dist = 13;
}

// ── 엔딩
function showEnding(n) {
  const seen = E.recordEnding(n.end.id);
  E.clearSave();
  $('story').hidden = true;
  $('combat').hidden = true;
  $('story-pill').hidden = true;
  world.clearMarkers();
  world.locked = true;
  screen = 'ending';
  setTimeout(() => ($('hud').hidden = true), reduce ? 0 : 900);
  $('place-tag').hidden = true;
  $('ending-kind').textContent = n.end.kind;
  $('ending-title').textContent = n.end.title;
  $('ending-text').textContent = E.nodeText(S, n);
  const count = ENDINGS.filter((e) => seen[e.id]).length;
  $('ending-count').textContent = `엔딩 도감 ${count} / ${ENDINGS.length}`;
  $('btn-undo').hidden = !undoState;
  setTimeout(() => ($('ending').hidden = false), reduce ? 0 : 900);
  if (n.end.id !== 'death' && n.end.id !== 'void') world.burst(0xfff0c0);
}
$('btn-undo').onclick = () => {
  if (!undoState) return;
  const s = undoState;
  undoState = null;
  $('ending').hidden = true;
  startGame(s, true);
};
$('btn-restart').onclick = () => {
  $('ending').hidden = true;
  toTitle();
  openCreate();
};

// ── 키보드
window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  if (!$('modal').hidden) {
    if (e.key === 'Escape') closeModal();
    return;
  }
  if (screen !== 'game') return;
  const num = parseInt(e.key, 10);
  if (combat && !busy && num >= 1) {
    const a = combat.actions()[num - 1];
    if (a && !a.disabled) combatAct(a.id);
    return;
  }
  if (!$('story').hidden) {
    if ((e.key === ' ' || e.key === 'Enter') && typing) {
      e.preventDefault();
      finishTyping();
      return;
    }
    if (num >= 1 && !typing) {
      const c = currentChoices[num - 1];
      if (c) choose(c);
    }
  }
  if (e.key === 'Escape' && !$('story').hidden && !combat) $('btn-collapse').click();
  else if (e.key === 'Escape' && !$('story-pill').hidden) $('story-pill').click();
});

// 디버그용: 콘솔에서 상태 확인
window.__game = { get state() { return S; }, go, world, NODES, ENEMIES };
