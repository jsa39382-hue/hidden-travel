// 턴제 전투 규칙
import { CLASSES, ENEMIES, COMPANIONS, STAT_NAMES, ITEMS } from './data.js';
import { rand, statTotal, weapon, armorClass, allyCount, josa } from './engine.js';

const COMP_LINES = {
  bran: ['브란의 망치가 내려친다!', '브란이 어깨로 들이받는다!', '"이거나 먹어라!" 브란의 망치가 번뜩인다!'],
  finn: ['핀이 등 뒤로 돌아 단검을 꽂는다!', '핀이 모래를 뿌리고 발목을 벤다!', '"여기야, 여기!" 핀이 틈을 만든다!'],
  seren: ['세렌의 화살이 꿰뚫는다!', '세렌이 연달아 두 발을 쏜다!', '숲의 빛을 머금은 세렌의 화살!'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Combat {
  constructor(state, spec) {
    this.s = state;
    this.spec = spec;
    this.def = ENEMIES[spec.e];
    let hp = this.def.hp + (spec.hp || 0);
    if (spec.allyWeaken) hp -= allyCount(state) * 5 + (state.flags.selka_help ? 4 : 0) + (state.flags.morvain_weak ? 4 : 0);
    this.maxhp = Math.max(8, hp);
    this.hp = this.maxhp;
    this.cls = CLASSES[state.cls];
    this.skillUsed = false;
    this.starUsed = false;
    this.defending = false;
    this.turn = 0;
    this.over = false;
  }

  actions() {
    const s = this.s;
    const st = this.cls.atk;
    const out = [
      { id: 'attack', label: '공격', sub: `${STAT_NAMES[st]} +${statTotal(s, st) + weapon(s).hit}` },
      { id: 'skill', label: this.cls.skill.name, sub: this.skillUsed ? '이번 전투에 사용함' : this.cls.skill.desc, disabled: this.skillUsed },
      { id: 'defend', label: '방어', sub: '방어 +4, 체력 2 회복' },
    ];
    if (s.flags.star_awake) out.push({ id: 'star', label: '별빛 폭발', sub: this.starUsed ? '이번 전투에 사용함' : '체력 3을 쓰고 큰 피해', disabled: this.starUsed || s.hp <= 3 });
    if (s.items.potion) out.push({ id: 'potion', label: `치유 물약 ×${s.items.potion}`, sub: '체력 12 회복' });
    if (s.items.holy_water) out.push({ id: 'holy', label: `성수 ×${s.items.holy_water}`, sub: this.def.hollow ? '공허에게 큰 피해' : '이 적에게는 약함' });
    if (s.items.ale) out.push({ id: 'ale', label: `흑맥주 ×${s.items.ale}`, sub: '체력 5 회복' });
    if (this.spec.flee) out.push({ id: 'flee', label: '도주', sub: '민첩 12 판정' });
    return out;
  }

  // 한 턴 진행. 연출용 이벤트 목록을 돌려준다.
  act(id) {
    const s = this.s;
    const ev = [];
    const log = (text, tone = '') => ev.push({ type: 'log', text, tone });
    this.defending = false;
    this.turn++;
    const st = this.cls.atk;
    const w = weapon(s);
    const base = () => rand(this.cls.dmg[0], this.cls.dmg[1]) + Math.max(0, statTotal(s, st)) + w.dmg + s.comps.length;
    const atkRoll = () => {
      const d = rand(1, 20);
      const bonus = statTotal(s, st) + w.hit;
      return { d, bonus, total: d + bonus, hit: d === 20 || (d !== 1 && d + bonus >= this.def.ac), crit: d === 20 };
    };
    let fled = false;

    if (id === 'attack') {
      const r = atkRoll();
      ev.push({ type: 'roll', d: r.d, bonus: r.bonus, dc: this.def.ac, ok: r.hit });
      ev.push({ type: 'fx', fx: 'attack', kind: this.cls.atk === 'int' ? 'magic' : 'melee', color: 0x9fd0ff });
      if (r.hit) {
        let dmg = base();
        if (r.crit) dmg *= 2;
        this.hp -= dmg;
        log(`${r.crit ? '치명타! ' : ''}${dmg} 피해를 입혔다.`, 'good');
        ev.push({ type: 'fx', fx: 'hit' });
      } else log('빗나갔다.', 'dim');
    } else if (id === 'skill') {
      this.skillUsed = true;
      if (s.cls === 'warrior') {
        const dmg = base() * 2;
        this.hp -= dmg;
        ev.push({ type: 'fx', fx: 'attack', kind: 'melee' });
        ev.push({ type: 'fx', fx: 'hit' });
        log(`강타! 온 힘을 실은 일격으로 ${dmg} 피해.`, 'good');
      } else if (s.cls === 'rogue') {
        const r = atkRoll();
        ev.push({ type: 'roll', d: r.d, bonus: r.bonus, dc: this.def.ac, ok: r.hit });
        ev.push({ type: 'fx', fx: 'attack', kind: 'melee' });
        if (r.hit) {
          const dmg = base() * 3;
          this.hp -= dmg;
          ev.push({ type: 'fx', fx: 'hit' });
          log(`급소 찌르기! ${dmg} 피해.`, 'good');
        } else log('급소를 노렸지만 빗나갔다.', 'dim');
      } else if (s.cls === 'mage') {
        const dmg = rand(2, 12) + statTotal(s, 'int') * 2 + 4;
        this.hp -= dmg;
        ev.push({ type: 'fx', fx: 'attack', kind: 'magic', color: 0xff7a2a });
        ev.push({ type: 'fx', fx: 'hit' });
        log(`화염구가 작렬한다! ${dmg} 피해.`, 'good');
      } else {
        const heal = 8 + statTotal(s, 'cha') * 2;
        const before = s.hp;
        s.hp = Math.min(s.maxhp, s.hp + heal);
        const dmg = rand(2, 6) + (this.def.hollow ? 4 : 0);
        this.hp -= dmg;
        ev.push({ type: 'fx', fx: 'heal', color: 0xfff0a0 });
        ev.push({ type: 'fx', fx: 'attack', kind: 'magic', color: 0xfff0a0 });
        ev.push({ type: 'fx', fx: 'hit' });
        log(`성스러운 빛! 체력 ${s.hp - before} 회복, 적에게 ${dmg} 피해.`, 'good');
      }
    } else if (id === 'star') {
      this.starUsed = true;
      s.hp = Math.max(1, s.hp - 3);
      const dmg = 12 + rand(1, 8) + statTotal(s, 'int');
      this.hp -= dmg;
      ev.push({ type: 'fx', fx: 'burst' });
      ev.push({ type: 'fx', fx: 'hit' });
      log(`가슴의 별빛이 터져 나온다! ${dmg} 피해.`, 'star');
    } else if (id === 'defend') {
      this.defending = true;
      s.hp = Math.min(s.maxhp, s.hp + 2);
      log('자세를 낮추고 방어한다.', 'dim');
    } else if (id === 'potion' || id === 'ale') {
      s.items[id] -= 1;
      if (!s.items[id]) delete s.items[id];
      const heal = ITEMS[id].use.heal;
      const before = s.hp;
      s.hp = Math.min(s.maxhp, s.hp + heal);
      ev.push({ type: 'fx', fx: 'heal' });
      log(`${josa(ITEMS[id].name, '을', '를')} 마셨다. 체력 +${s.hp - before}.`, 'good');
    } else if (id === 'holy') {
      s.items.holy_water -= 1;
      if (!s.items.holy_water) delete s.items.holy_water;
      const dmg = this.def.hollow ? 12 + rand(0, 4) : 3;
      this.hp -= dmg;
      ev.push({ type: 'fx', fx: 'attack', kind: 'magic', color: 0xdff4ff });
      ev.push({ type: 'fx', fx: 'hit' });
      log(this.def.hollow ? `성수가 공허를 태운다! ${dmg} 피해.` : `성수가 튀었지만 별 효과가 없다. ${dmg} 피해.`, this.def.hollow ? 'good' : 'dim');
    } else if (id === 'flee') {
      const d = rand(1, 20);
      const bonus = statTotal(s, 'dex');
      const ok = d === 20 || (d !== 1 && d + bonus >= 12);
      ev.push({ type: 'roll', d, bonus, dc: 12, ok });
      if (ok) {
        log('틈을 타 달아났다!', 'good');
        fled = true;
      } else log('달아나려 했지만 길이 막혔다.', 'bad');
    }

    // 동료의 지원
    if (!fled && this.hp > 0 && s.comps.length && Math.random() < 0.45) {
      const c = pick(s.comps);
      const dmg = rand(2, 5);
      this.hp -= dmg;
      log(`${pick(COMP_LINES[c] || [josa(COMPANIONS[c].name, '이', '가') + ' 돕는다!'])} ${dmg} 피해.`, 'ally');
      ev.push({ type: 'fx', fx: 'hit' });
    }

    if (fled) {
      this.over = true;
      ev.push({ type: 'end', result: 'flee' });
      return ev;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.over = true;
      ev.push({ type: 'fx', fx: 'die' });
      log(`${josa(this.def.name, '을', '를')} 쓰러뜨렸다!`, 'win');
      ev.push({ type: 'end', result: 'win' });
      return ev;
    }

    // 적의 차례
    const heavy = (this.def.boss || this.def.hp >= 30) && this.turn % 3 === 0;
    const ac = armorClass(s) + (this.defending ? 4 : 0);
    const d = rand(1, 20);
    const hit = d === 20 || (d !== 1 && d + this.def.atk >= ac);
    if (heavy) log(`${josa(this.def.name, '이', '가')} 힘을 모은다…`, 'bad');
    if (hit) {
      let dmg = rand(this.def.dmg[0], this.def.dmg[1]);
      if (heavy) dmg = Math.round(dmg * 1.5);
      if (d === 20) dmg += 3;
      if (this.defending) dmg = Math.max(1, Math.round(dmg * 0.6));
      s.hp = Math.max(0, s.hp - dmg);
      ev.push({ type: 'fx', fx: 'enemyAttack' });
      log(`${this.def.name}의 공격! 체력 -${dmg}.`, 'bad');
      ev.push({ type: 'hurt', amount: dmg });
    } else {
      ev.push({ type: 'fx', fx: 'enemyMiss' });
      log(`${this.def.name}의 공격을 피했다.`, 'dim');
    }
    if (s.hp <= 0) {
      this.over = true;
      ev.push({ type: 'end', result: 'lose' });
    }
    return ev;
  }
}
