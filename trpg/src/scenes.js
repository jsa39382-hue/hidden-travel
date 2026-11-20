// 장소별 3D 장면 생성. 모든 지형과 소품은 기본 도형으로 절차적으로 만든다.
import * as THREE from 'three';
import { mat, glow } from './models.js';
import { LANDMARKS } from './places.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Builder {
  constructor(seed) {
    this.g = new THREE.Group();
    this.colliders = [];
    this.anim = [];
    this.lights = 0;
    this.r = rng(seed);
  }
  rand(a, b) {
    return a + this.r() * (b - a);
  }
  add(mesh, x = 0, y = 0, z = 0, shadow = true) {
    mesh.position.set(x, y, z);
    mesh.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = shadow;
        o.receiveShadow = true;
      }
    });
    this.g.add(mesh);
    return mesh;
  }
  col(x, z, r) {
    this.colliders.push({ x, z, r });
  }
  // 바깥으로 갈수록 솟아오르는 지면
  ground(color, { flatR = 22, rise = 0.45, size = 140, jitter = 0.18, color2 } = {}) {
    const geo = new THREE.PlaneGeometry(size, size, 70, 70);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const cols = [];
    const c1 = new THREE.Color(color);
    const c2 = new THREE.Color(color2 ?? color).multiplyScalar(color2 ? 1 : 0.82);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const d = Math.hypot(x, z);
      let y = (this.r() - 0.5) * jitter;
      if (d > flatR) y += (d - flatR) * rise * (0.7 + Math.sin(x * 0.21) * 0.3 + Math.cos(z * 0.17) * 0.3);
      else y *= 0.3;
      pos.setY(i, y);
      const c = c1.clone().lerp(c2, this.r());
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }));
    m.receiveShadow = true;
    this.g.add(m);
    return m;
  }
  floor(color, r = 12, sides = 24) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, sides), mat(color));
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    this.g.add(m);
    return m;
  }
  strip(x1, z1, x2, z2, w, color, y = 0.03) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mat(color));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(x2 - x1, z2 - z1);
    m.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    m.receiveShadow = true;
    this.g.add(m);
  }
  tree(x, z, s = 1, kind = 'pine', colors = {}) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 1.4 * s, 6), mat(colors.trunk ?? 0x5a3d26));
    trunk.position.y = 0.7 * s;
    g.add(trunk);
    if (kind === 'pine') {
      const leaf = mat(colors.leaf ?? 0x2f5a35);
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry((1.3 - i * 0.3) * s, 1.4 * s, 7), leaf);
        c.position.y = (1.4 + i * 0.75) * s;
        g.add(c);
      }
    } else if (kind === 'oak') {
      const leaf = mat(colors.leaf ?? 0x4a7a3a);
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.9 + this.r() * 0.4) * s, 0), leaf);
        b.position.set((this.r() - 0.5) * s, (1.9 + this.r() * 0.6) * s, (this.r() - 0.5) * s);
        g.add(b);
      }
    } else if (kind === 'dead') {
      trunk.material = mat(colors.trunk ?? 0x2a2420);
      for (let i = 0; i < 3; i++) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * s, 0.07 * s, 1 * s, 4), trunk.material);
        br.position.set(0, (1.1 + i * 0.25) * s, 0);
        br.rotation.z = (this.r() - 0.5) * 2;
        br.rotation.y = this.r() * 6;
        br.translateY(0.4 * s);
        g.add(br);
      }
    } else if (kind === 'rot') {
      trunk.material = mat(0x2a2030);
      const leaf = mat(0x3a2a48, { emissive: 0x2a0a40, emissiveIntensity: 0.5 });
      for (let i = 0; i < 2; i++) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.9 + this.r() * 0.3) * s, 0), leaf);
        b.position.set((this.r() - 0.5) * s, (1.9 + i * 0.6) * s, (this.r() - 0.5) * s);
        g.add(b);
      }
    }
    g.rotation.y = this.r() * 6;
    this.add(g, x, 0, z);
    this.col(x, z, 0.45 * s);
    return g;
  }
  rock(x, z, s = 1, color = 0x77736c) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(color));
    m.scale.y = 0.6 + this.r() * 0.4;
    m.rotation.set(this.r(), this.r() * 6, this.r());
    this.add(m, x, s * 0.3, z);
    if (s > 0.5) this.col(x, z, s * 0.85);
    return m;
  }
  house(x, z, rot = 0, o = {}) {
    const g = new THREE.Group();
    const w = o.w ?? 4;
    const d = o.d ?? 3.5;
    const h = o.h ?? 2.6;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(o.wall ?? 0xd8c8a8));
    wall.position.y = h / 2;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.8, 4), mat(o.roof ?? 0x8a3a2a));
    roof.position.y = h + h * 0.4;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    const beam = mat(0x5a3a22);
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, h, 0.15), beam);
      b.position.set((sx * w) / 2, h / 2, d / 2 + 0.01);
      g.add(b);
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.06), beam);
    door.position.set(0, 0.7, d / 2 + 0.02);
    const winM = o.lit ? glow(0xffc070, 1.8) : mat(0x2a3a4a);
    for (const sx of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.06), winM);
      win.position.set(sx * w * 0.3, h * 0.6, d / 2 + 0.02);
      g.add(win);
    }
    if (o.chimney) {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), mat(0x6a5a50));
      ch.position.set(w * 0.25, h + 0.9, 0);
      g.add(ch);
    }
    g.add(wall, roof, door);
    g.rotation.y = rot;
    this.add(g, x, 0, z);
    this.col(x, z, Math.max(w, d) * 0.62);
    return g;
  }
  fire(x, z, s = 1, color = 0xff8a30, light = true) {
    const g = new THREE.Group();
    const flames = [];
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.25 * s, 0.8 * s, 5), glow(i ? 0xffc040 : color, 3));
      f.position.set((this.r() - 0.5) * 0.3 * s, 0.4 * s, (this.r() - 0.5) * 0.3 * s);
      flames.push(f);
      g.add(f);
    }
    this.add(g, x, 0, z, false);
    let pl = null;
    if (light && this.lights < 6) {
      pl = new THREE.PointLight(color, 18 * s, 12 * s, 1.6);
      pl.position.set(x, 1.2 * s, z);
      this.g.add(pl);
      this.lights++;
    }
    const ph = this.r() * 10;
    this.anim.push((t) => {
      flames.forEach((f, i) => {
        f.scale.y = 1 + Math.sin(t * 12 + i * 2 + ph) * 0.25;
        f.rotation.y = t * (i + 1);
      });
      if (pl) pl.intensity = 18 * s * (0.85 + Math.sin(t * 15 + ph) * 0.1 + Math.sin(t * 7.3) * 0.08);
    });
    return g;
  }
  campfire(x, z) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      this.rock(x + Math.cos(a) * 0.8, z + Math.sin(a) * 0.8, 0.22, 0x5a5550);
    }
    this.fire(x, z, 1);
    this.col(x, z, 1);
  }
  torch(x, z, light = false, color = 0xff9a40) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 5), mat(0x4a3424));
    this.add(pole, x, 1.1, z);
    const f = this.fire(x, z, 0.5, color, light);
    f.position.y = 2.2;
    this.col(x, z, 0.25);
  }
  lamp(x, z, color = 0xffd080, light = false) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3, 6), mat(0x2a2a30, { metalness: 0.5 }));
    this.add(pole, x, 1.5, z);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), glow(color, 2.2));
    this.add(b, x, 3.1, z, false);
    if (light && this.lights < 6) {
      const pl = new THREE.PointLight(color, 10, 10, 1.6);
      pl.position.set(x, 3, z);
      this.g.add(pl);
      this.lights++;
    }
    this.col(x, z, 0.25);
  }
  crystal(x, z, color, s = 1, y = 0) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.4 * s, 0), glow(color, 1.8));
    m.scale.y = 2.2;
    m.rotation.z = (this.r() - 0.5) * 0.6;
    this.add(m, x, y + 0.6 * s, z, false);
    const ph = this.r() * 6;
    this.anim.push((t) => {
      m.material.emissiveIntensity = 1.4 + Math.sin(t * 2 + ph) * 0.5;
    });
    return m;
  }
  pillar(x, z, h = 5, r = 0.45, color = 0xcfc8bc, cap = true) {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 8), mat(color));
    c.position.y = h / 2;
    g.add(c);
    if (cap) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(r * 2.6, 0.3, r * 2.6), mat(color));
      t.position.y = h;
      const b = t.clone();
      b.position.y = 0.15;
      g.add(t, b);
    }
    this.add(g, x, 0, z);
    this.col(x, z, r + 0.2);
    return g;
  }
  tower(x, z, h, r, color, roof) {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, h, 10), mat(color));
    c.position.y = h / 2;
    g.add(c);
    if (roof) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 1.3, r * 2.4, 10), mat(roof));
      cone.position.y = h + r * 1.2;
      g.add(cone);
    }
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 0.1), glow(0xffd090, 1.2));
      const a = (i / 4) * Math.PI * 2;
      w.position.set(Math.sin(a) * (r + 0.02), h * 0.7, Math.cos(a) * (r + 0.02));
      w.rotation.y = a;
      g.add(w);
    }
    this.add(g, x, 0, z);
    this.col(x, z, r + 0.3);
    return g;
  }
  wallRing(r, h, color, gaps = [], segs = 28, thick = 0.8) {
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const deg = ((a * 180) / Math.PI + 360) % 360;
      if (gaps.some(([g0, g1]) => deg >= g0 && deg <= g1)) continue;
      const len = ((2 * Math.PI * r) / segs) * 1.05;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, thick), mat(color));
      m.position.set(Math.sin(a) * r, h / 2, Math.cos(a) * r);
      m.rotation.y = a + Math.PI / 2;
      m.castShadow = true;
      m.receiveShadow = true;
      this.g.add(m);
      if (i % 2 === 0) {
        const cren = new THREE.Mesh(new THREE.BoxGeometry(len * 0.45, 0.5, thick + 0.1), mat(color));
        cren.position.set(Math.sin(a) * r, h + 0.25, Math.cos(a) * r);
        cren.rotation.y = a + Math.PI / 2;
        this.g.add(cren);
      }
    }
  }
  water(x, z, r, color = 0x2a5a7a, opacity = 0.8, emissive = 0x000000) {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(r, 24),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.15, metalness: 0.3, emissive, emissiveIntensity: 0.6 }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.05, z);
    this.g.add(m);
    const ph = this.r() * 5;
    this.anim.push((t) => (m.material.opacity = opacity + Math.sin(t * 1.3 + ph) * 0.05));
    return m;
  }
  mushroom(x, z, color = 0x6affd0, s = 1) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.35 * s, 5), mat(0xe8e0d0));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), glow(color, 1.6));
    this.add(stem, x, 0.17 * s, z, false);
    this.add(cap, x, 0.33 * s, z, false);
  }
  box(x, z, w, h, d, color, y = 0, rot = 0, solid = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'number' ? mat(color) : color);
    m.rotation.y = rot;
    this.add(m, x, y + h / 2, z);
    if (solid) this.col(x, z, Math.max(w, d) * 0.55);
    return m;
  }
  barrel(x, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 8), mat(0x7a5232));
    this.add(m, x, 0.4, z);
    this.col(x, z, 0.4);
  }
  banner(x, z, color, rot = 0, h = 4) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, h, 5), mat(0x3a3a3a));
    this.add(pole, x, h / 2, z);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), mat(color, { side: THREE.DoubleSide }));
    cloth.rotation.y = rot;
    this.add(cloth, x + Math.cos(rot) * 0.47, h - 0.9, z - Math.sin(rot) * 0.47);
    const ph = this.r() * 5;
    this.anim.push((t) => (cloth.rotation.y = rot + Math.sin(t * 1.5 + ph) * 0.15));
  }
  // 실내 벽 (원형)
  room(r, h, wall, floor, gapDeg = null) {
    this.floor(floor, r + 1, 32);
    const segs = 24;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      if (gapDeg != null) {
        const deg = ((a * 180) / Math.PI + 360) % 360;
        if (Math.abs(deg - gapDeg) < 10) continue;
      }
      const len = ((2 * Math.PI * r) / segs) * 1.05;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.6), mat(wall));
      m.position.set(Math.sin(a) * r, h / 2, Math.cos(a) * r);
      m.rotation.y = a + Math.PI / 2;
      m.receiveShadow = true;
      this.g.add(m);
    }
  }
}

// ── 장면들
const SCENES = {
  village(b, mode) {
    const L = LANDMARKS.village;
    const night = mode !== 'day';
    b.ground(mode === 'raid' ? 0x4a3a2a : 0x5f7f3a, { color2: mode === 'raid' ? 0x2a1e18 : 0x4a6a2a });
    // 길
    b.strip(0, 16, 0, -13, 2.4, 0x9a8462);
    b.strip(-11, 6, 9, 6, 2, 0x9a8462);
    b.strip(-9, -5, 9, -6, 2, 0x9a8462);
    b.strip(0, 2, 15, 13, 1.5, 0x8a7656);
    // 우물
    const well = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 0.9, 10), mat(0x8a8478));
    b.add(well, L.well[0], 0.45, L.well[1]);
    b.water(L.well[0], L.well[1], 0.8, 0x1a3a5a, 0.9);
    const roofW = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.9, 4), mat(0x6a3a2a));
    b.add(roofW, L.well[0], 2.4, L.well[1]);
    for (const s of [-1, 1]) b.box(L.well[0] + s * 0.9, L.well[1], 0.12, 2, 0.12, 0x5a3a22, 0, 0, false);
    b.col(L.well[0], L.well[1], 1.3);
    const lit = night;
    b.house(L.elder[0] - 1.5, L.elder[1] - 1.5, 0.5, { w: 4.6, d: 4, h: 3, roof: 0x4a5a6a, chimney: true, lit });
    b.house(L.inn[0] + 1.5, L.inn[1] - 1.5, -0.4, { w: 6, d: 4.6, h: 3.4, roof: 0x8a5a2a, chimney: true, lit });
    // 여관 간판
    b.box(L.inn[0] - 1, L.inn[1] + 1.5, 0.9, 0.6, 0.08, 0xc8a050, 2.4, -0.4, false);
    // 신전
    const tg = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 5), mat(0xc8c0b0));
    base.position.y = 0.25;
    const hall = new THREE.Mesh(new THREE.BoxGeometry(5, 3.6, 4), mat(0xe8e2d4));
    hall.position.y = 2.3;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x9ab0c8));
    dome.position.y = 4.1;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), glow(0xdfe8ff, 2.4));
    star.position.y = 6.4;
    tg.add(base, hall, dome, star);
    b.add(tg, L.temple[0], 0, L.temple[1] - 2);
    b.col(L.temple[0], L.temple[1] - 2, 3.4);
    b.anim.push((t) => (star.rotation.y = t));
    // 대장간
    b.house(L.smithy[0] - 1.5, L.smithy[1] + 0.5, 1.2, { w: 4, d: 3.6, h: 2.4, roof: 0x3a3a3a, wall: 0x8a7a6a, chimney: true, lit });
    b.box(L.smithy[0] + 1.2, L.smithy[1] - 0.8, 0.9, 0.7, 0.5, 0x3a3a40, 0, 0.3);
    b.fire(L.smithy[0] + 0.5, L.smithy[1] + 1.8, 0.6, 0xff6a20, true);
    // 장터 좌판
    const stallC = [0xb83a3a, 0x3a6ab8, 0xd8a83a, 0x3a9a5a];
    for (let i = 0; i < 4; i++) {
      const x = L.market[0] - 2 + (i % 2) * 4;
      const z = L.market[1] - 1.5 + Math.floor(i / 2) * 3.4;
      b.box(x, z, 2, 0.9, 1, 0x7a5a3a, 0, 0);
      const awn = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.6), mat(stallC[i]));
      b.add(awn, x, 2.1, z);
      for (const s of [-1, 1]) b.box(x + s * 1.1, z + 0.6, 0.08, 2.1, 0.08, 0x5a3a22, 0, 0, false);
      for (let k = 0; k < 3; k++) {
        const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), mat([0xd84a3a, 0xe8c040, 0x6ab84a][k]));
        b.add(f, x - 0.6 + k * 0.6, 1.05, z);
      }
    }
    // 집들
    const spots = [[-15, -12], [14, -14], [-17, 2], [17, 0], [-14, 13], [6, 15], [-6, -18], [10, -18], [-19, -6], [19, 8]];
    for (const [x, z] of spots) b.house(x, z, Math.atan2(-x, -z), { roof: [0x8a3a2a, 0x6a4a2a, 0x4a5a3a][Math.floor(b.r() * 3)], lit, chimney: b.r() > 0.5 });
    // 울타리 & 문
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      if (Math.abs(a) < 0.12 || Math.abs(a - Math.PI * 2) < 0.12) continue;
      const x = Math.sin(a) * 23;
      const z = Math.cos(a) * 23;
      b.box(x, z, 0.15, 1.2, 0.15, 0x6a4a2a, 0, 0, false);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.1, 0.08), mat(0x6a4a2a));
      rail.rotation.y = a + Math.PI / 2;
      b.add(rail, x, 0.9, z);
    }
    for (const s of [-1, 1]) b.box(s * 1.6, 22.6, 0.4, 3, 0.4, 0x5a3a22);
    b.box(0, 22.6, 3.6, 0.4, 0.4, 0x5a3a22, 2.8, 0, false);
    // 숲 테두리
    for (let i = 0; i < 70; i++) {
      const a = b.rand(0, Math.PI * 2);
      const r = b.rand(25, 40);
      b.tree(Math.sin(a) * r, Math.cos(a) * r, b.rand(1.2, 2.2), 'pine', { leaf: mode === 'raid' ? 0x2a2a22 : 0x2f5a35 });
    }
    // 별이 떨어진 구덩이
    const crater = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.6, 5, 14), mat(0x3a3028));
    crater.rotation.x = -Math.PI / 2;
    b.add(crater, L.crater[0], 0.05, L.crater[1]);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(2, 14), mat(0x3a3448, { roughness: 0.5, emissive: 0x1a1a3a, emissiveIntensity: 0.4 }));
    glass.rotation.x = -Math.PI / 2;
    b.add(glass, L.crater[0], 0.02, L.crater[1]);
    if (mode === 'night') b.crystal(L.crater[0], L.crater[1], 0xcfe0ff, 0.6);
    // 나무 몇 그루 마을 안
    for (const [x, z] of [[-5, 10], [5, -10], [-4, -9], [13, -2], [-6, 2]]) b.tree(x, z, 1.1, 'oak');
    for (let i = 0; i < 6; i++) b.barrel(L.inn[0] - 2 + b.r(), L.inn[1] + 2 + i * 0.1 + b.r());
    if (night) {
      b.torch(-2, 9, true);
      b.torch(3, -3, false);
      b.torch(L.inn[0] - 2, L.inn[1] + 2.5, true);
    }
    if (mode === 'raid') {
      for (const [x, z] of [[-15, -12], [17, 0], [-14, 13], [10, -18]]) b.fire(x, z + 1, 2.2, 0xff4a20, b.lights < 5);
    }
    return mode === 'day'
      ? { sky: 0x9cc8e8, fog: [0xb8d4e8, 30, 95], hemi: [0xd8ecff, 0x5a6a3a, 1.0], sun: [0xfff1d0, 2.4, [20, 30, 10]], particles: 'pollen' }
      : mode === 'night'
        ? { sky: 0x0c1230, fog: [0x0c1230, 16, 70], hemi: [0x8a9ae0, 0x2a2a3a, 1.25], sun: [0xb4c4ff, 1.5, [-15, 25, -10]], particles: 'fireflies', stars: true }
        : { sky: 0x3a1020, fog: [0x4a1a24, 12, 60], hemi: [0xff9a80, 0x301018, 1.1], sun: [0xff7a50, 1.8, [-10, 14, -20]], particles: 'embers', bounds: 21 };
  },

  crossroads(b) {
    const L = LANDMARKS.crossroads;
    b.ground(0x8a8a4a, { color2: 0x6a7a3a, flatR: 20 });
    b.strip(L.west[0] - 10, 0, L.east[0] + 10, 0, 2.6, 0x9a8462);
    b.strip(0, L.north[1] - 10, 0, L.south[1] + 10, 2.6, 0x9a8462);
    b.strip(0, 0, L.tower[0] + 6, L.tower[1] - 8, 1.4, 0x5a4a4a);
    b.campfire(L.camp[0] + 2.5, L.camp[1] + 2.5);
    // 상인 수레
    const cart = b.box(L.camp[0] - 3, L.camp[1] + 3, 2.2, 1, 1.4, 0x7a5232, 0.5, 0.4);
    const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.2, 8, 1, false, 0, Math.PI), mat(0xd8c8a0, { side: THREE.DoubleSide }));
    cover.rotation.z = Math.PI / 2;
    cover.rotation.y = 0.4;
    b.add(cover, cart.position.x, 1.5, cart.position.z);
    for (const s of [-1, 1]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 10), mat(0x4a3422));
      wh.rotation.x = Math.PI / 2;
      wh.rotation.y = 0.4;
      b.add(wh, cart.position.x + Math.sin(0.4) * 0.8 * s, 0.45, cart.position.z + Math.cos(0.4) * 0.8 * s);
    }
    // 이정표
    b.box(1.6, -1.6, 0.18, 2.6, 0.18, 0x5a3a22);
    for (const [rot, y] of [[0, 2.3], [Math.PI / 2, 2.0], [-Math.PI / 4, 1.7]]) b.box(1.6, -1.6, 1.4, 0.3, 0.06, 0xb89a6a, y, rot, false);
    // 사당
    const sh = new THREE.Group();
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 2), mat(0x7a8a7a));
    plinth.position.y = 0.25;
    const st = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.6), mat(0x8a9a8a));
    st.position.y = 1.6;
    const moss = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 0.7), mat(0x4a7a3a));
    moss.position.y = 2.7;
    sh.add(plinth, st, moss);
    b.add(sh, L.shrine[0], 0, L.shrine[1] + 1.5);
    b.col(L.shrine[0], L.shrine[1] + 1.5, 1.3);
    // 방향 표지: 숲(동), 광산(서), 성(북), 늪(남)
    for (let i = 0; i < 10; i++) b.tree(L.east[0] + 4 + b.rand(0, 8), b.rand(-8, 8), b.rand(1.2, 2), 'pine');
    for (let i = 0; i < 8; i++) b.rock(L.west[0] - 4 - b.rand(0, 8), b.rand(-8, 8), b.rand(0.8, 2.2), 0x6a625a);
    b.tower(-3, L.north[1] - 22, 9, 1.4, 0xd8d8d8, 0x3a5a9a);
    b.tower(4, L.north[1] - 24, 12, 1.8, 0xe0e0e0, 0x3a5a9a);
    for (let i = 0; i < 6; i++) b.tree(b.rand(-6, 6), L.south[1] + 4 + b.rand(0, 6), b.rand(1, 1.6), 'dead');
    // 먼 북쪽의 검은 탑
    const spire = new THREE.Mesh(new THREE.ConeGeometry(3, 40, 6), mat(0x120a18, { emissive: 0x2a0a3a, emissiveIntensity: 0.6 }));
    b.add(spire, 40, 20, -70, false);
    const crack = new THREE.Mesh(new THREE.TorusGeometry(8, 0.4, 4, 20), glow(0xb46cff, 1.5));
    crack.rotation.x = Math.PI / 2;
    b.add(crack, 40, 42, -70, false);
    b.anim.push((t) => (crack.rotation.z = t * 0.3));
    for (let i = 0; i < 40; i++) {
      const a = b.rand(0, Math.PI * 2);
      const r = b.rand(24, 38);
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      if (Math.abs(x) < 4 || Math.abs(z) < 4) continue;
      b.tree(x, z, b.rand(1.2, 2.2), b.r() > 0.5 ? 'oak' : 'pine', { leaf: b.r() > 0.5 ? 0xb8862a : 0x6a8a3a });
    }
    return { sky: 0xe8b07a, fog: [0xe8b88a, 28, 95], hemi: [0xffd8a8, 0x4a4a2a, 0.9], sun: [0xffb070, 2.0, [-30, 14, 10]], particles: 'leaves' };
  },

  forest(b) {
    const L = LANDMARKS.forest;
    b.ground(0x2f4a2a, { color2: 0x24381f, flatR: 17, rise: 0.6 });
    b.strip(0, 14, 0, -6, 1.6, 0x4a3a26);
    b.strip(0, -6, L.spring[0], L.spring[1], 1.2, 0x3a2a26);
    b.strip(0, 2, L.hollowtree[0], L.hollowtree[1], 1, 0x3a3a26);
    for (let i = 0; i < 110; i++) {
      const x = b.rand(-34, 34);
      const z = b.rand(-34, 34);
      if (Math.abs(x) < 2.2 && z > -7) continue;
      if (Math.hypot(x - L.spring[0], z - L.spring[1]) < 5) continue;
      if (Math.hypot(x - L.hollowtree[0], z - L.hollowtree[1]) < 3.5) continue;
      if (Math.hypot(x, z - L.path[1]) < 3) continue;
      const rot = Math.hypot(x - L.spring[0], z - L.spring[1]) < 12;
      b.tree(x, z, b.rand(1.4, 2.6), rot ? 'rot' : b.r() > 0.4 ? 'pine' : 'oak', { leaf: b.r() > 0.5 ? 0x2a5a32 : 0x1f4a2a });
    }
    for (let i = 0; i < 26; i++) b.mushroom(b.rand(-14, 14), b.rand(-14, 14), b.r() > 0.5 ? 0x6affd0 : 0x9a7aff, b.rand(0.8, 1.6));
    for (let i = 0; i < 12; i++) b.rock(b.rand(-15, 15), b.rand(-15, 15), b.rand(0.3, 0.9), 0x4a5a4a);
    // 속 빈 고목
    const ht = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.7, 4.5, 8, 1, true), mat(0x3a2a1e, { side: THREE.DoubleSide }));
    b.add(ht, L.hollowtree[0] - 1.5, 2.25, L.hollowtree[1]);
    b.col(L.hollowtree[0] - 1.5, L.hollowtree[1], 1.6);
    // 썩은 샘
    b.water(L.spring[0], L.spring[1], 3.2, 0x2a1a3a, 0.9, 0x3a0a5a);
    for (let i = 0; i < 6; i++) {
      const web = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ color: 0xdedede, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      const a = (i / 6) * Math.PI * 2;
      web.rotation.y = a;
      b.add(web, L.spring[0] + Math.sin(a) * 4, 2, L.spring[1] + Math.cos(a) * 4, false);
    }
    b.crystal(L.spring[0] + 3.5, L.spring[1] - 2, 0x9a4aff, 0.7);
    return { sky: 0x24402f, fog: [0x1c3326, 7, 42], hemi: [0x9fe8c0, 0x223a22, 1.05], sun: [0xd8ffd8, 1.1, [8, 30, 6]], particles: 'fireflies' };
  },

  forest_heart(b) {
    const L = LANDMARKS.forest_heart;
    b.ground(0x2f5a2a, { color2: 0x3a6a30, flatR: 14, rise: 0.8 });
    // 늙은 뿌리
    const g = new THREE.Group();
    const trunkM = mat(0x5a4030);
    const rotM = mat(0x2a1a30, { emissive: 0x3a0a5a, emissiveIntensity: 0.4 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.6, 14, 10), trunkM);
    trunk.position.y = 7;
    const rotSide = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 3.65, 9, 10, 1, true, 0, Math.PI * 0.8), rotM);
    rotSide.position.y = 4.5;
    g.add(trunk, rotSide);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.9, 6, 6), trunkM);
      root.position.set(Math.sin(a) * 3.8, 0.6, Math.cos(a) * 3.8);
      root.rotation.set(Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2);
      g.add(root);
    }
    const leafM = mat(0x3a8a4a);
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(b.rand(3, 4.5), 0), leafM);
      const a = b.rand(0, Math.PI * 2);
      c.position.set(Math.sin(a) * b.rand(2, 6), b.rand(13, 18), Math.cos(a) * b.rand(2, 6));
      g.add(c);
    }
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), glow(0x6aff9a, 3));
    shard.position.set(0, 4, 3.4);
    g.add(shard);
    b.add(g, L.heart[0], 0, L.heart[1] - 4);
    b.col(L.heart[0], L.heart[1] - 4, 4.4);
    b.anim.push((t) => {
      shard.rotation.y = t;
      shard.position.y = 4 + Math.sin(t * 2) * 0.2;
    });
    const pl = new THREE.PointLight(0x6aff9a, 20, 14, 1.5);
    pl.position.set(L.heart[0], 4, L.heart[1]);
    b.g.add(pl);
    for (let i = 0; i < 40; i++) {
      const a = b.rand(0, Math.PI * 2);
      const r = b.rand(15, 30);
      b.tree(Math.sin(a) * r, Math.cos(a) * r, b.rand(1.6, 2.8), 'oak', { leaf: 0x2a6a3a });
    }
    for (let i = 0; i < 20; i++) b.mushroom(b.rand(-11, 11), b.rand(-4, 11), 0x7dffb0, b.rand(0.8, 1.5));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      b.crystal(Math.sin(a) * 10, Math.cos(a) * 10 - 2, 0x7dffd0, 0.8);
    }
    return { sky: 0x3a6a50, fog: [0x2a5040, 10, 50], hemi: [0xb0ffd0, 0x1a3a1a, 0.9], sun: [0xf0ffd0, 1.4, [5, 30, 12]], particles: 'spores' };
  },

  mine(b) {
    const L = LANDMARKS.mine;
    b.ground(0x3a302a, { color2: 0x2a221e, flatR: 15, rise: 1.2 });
    b.wallRing(16, 9, 0x3a322c, [], 30, 2);
    // 용암 수로
    for (const x of [-4, 4]) {
      const lava = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 24), glow(0xff5a10, 2.4));
      lava.rotation.x = -Math.PI / 2;
      lava.position.set(x, 0.05, 0);
      b.g.add(lava);
    }
    // 기둥
    for (let i = 0; i < 8; i++) {
      const z = -10 + i * 3;
      for (const x of [-7, 7]) b.pillar(x, z, 8, 0.7, 0x5a4a3e, true);
    }
    // 왕좌
    const steps = b.box(L.hall[0], L.hall[1] - 1, 6, 0.6, 3, 0x4a3e34);
    steps.receiveShadow = true;
    b.box(L.hall[0], L.hall[1] - 1.6, 1.8, 3.4, 1, 0x6a5a4a, 0.6);
    b.box(L.hall[0], L.hall[1] - 1, 1.6, 0.4, 1.4, 0x8a2a2a, 0.9, 0, false);
    // 레일과 광차
    b.strip(L.tunnel[0] - 6, 0, L.tunnel[0] + 6, 0, 1, 0x4a4040);
    b.box(L.tunnel[0] + 1, 0.8, 1.4, 0.8, 1, 0x5a4a3a, 0.2, 0.5);
    for (let i = 0; i < 10; i++) b.crystal(b.rand(-14, 14), b.rand(-14, 14), b.r() > 0.5 ? 0xff9a40 : 0x6ad0ff, b.rand(0.5, 1));
    for (let i = 0; i < 10; i++) b.rock(b.rand(-14, 14), b.rand(-12, 14), b.rand(0.3, 1.1), 0x4a3e36);
    b.torch(-3, 8, true, 0xff8a30);
    b.torch(3, -4, true, 0xff8a30);
    b.torch(L.tunnel[0], -3, true, 0xff8a30);
    b.fire(L.hall[0] - 3, L.hall[1] - 1, 0.8, 0xff6a20, true);
    b.fire(L.hall[0] + 3, L.hall[1] - 1, 0.8, 0xff6a20, true);
    return { sky: 0x0a0604, fog: [0x140a06, 6, 38], hemi: [0xc08a60, 0x1a0e08, 0.95], sun: [0xffa070, 0.8, [0, 20, 5]], particles: 'embers', bounds: 14, camLimit: 14.5 };
  },

  mine_forge(b) {
    const L = LANDMARKS.mine_forge;
    b.ground(0x2a1e18, { color2: 0x3a241a, flatR: 13, rise: 1.4 });
    b.wallRing(15, 12, 0x2a201a, [], 30, 2);
    // 용광로
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 3, 8), mat(0x4a3a30));
    base.position.y = 1.5;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.8, 7, 8), mat(0x5a4a3a));
    body.position.y = 6.5;
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(1.6, 10), glow(0xff6a10, 3));
    mouth.position.set(0, 3.6, 3.75);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 8, 8), mat(0x3a2e26));
    chimney.position.y = 14;
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), glow(0xffa040, 3.5));
    shard.position.set(0, 4.5, 4.6);
    g.add(base, body, mouth, chimney, shard);
    b.add(g, L.forge[0], 0, L.forge[1] - 4);
    b.col(L.forge[0], L.forge[1] - 4, 5.2);
    b.anim.push((t) => {
      shard.rotation.y = t * 1.5;
      shard.position.y = 4.5 + Math.sin(t * 2) * 0.25;
      mouth.material.emissiveIntensity = 2.5 + Math.sin(t * 3) * 0.6;
    });
    const pl = new THREE.PointLight(0xff6a20, 40, 22, 1.4);
    pl.position.set(L.forge[0], 4, L.forge[1]);
    b.g.add(pl);
    // 용암 못
    for (const [x, z, r] of [[-8, -3, 2.4], [8, -2, 2.8], [-6, 7, 1.6], [9, 8, 1.8]]) {
      const lava = new THREE.Mesh(new THREE.CircleGeometry(r, 14), glow(0xff4a10, 2.6));
      lava.rotation.x = -Math.PI / 2;
      lava.position.set(x, 0.06, z);
      b.g.add(lava);
      b.col(x, z, r);
    }
    // 모루
    b.box(4, 3, 1.2, 0.8, 0.6, 0x3a3a40, 0, 0.3);
    for (let i = 0; i < 10; i++) b.crystal(b.rand(-13, 13), b.rand(-13, 13), 0xff8a30, b.rand(0.6, 1.2));
    return { sky: 0x1a0804, fog: [0x2a0e06, 8, 40], hemi: [0xff9a60, 0x1a0804, 0.9], sun: [0xff9a60, 0.9, [0, 20, 8]], particles: 'embers', bounds: 13, camLimit: 13.5 };
  },

  capital(b, mode) {
    const L = LANDMARKS.capital;
    const night = mode === 'night';
    b.ground(0x7a7a6a, { color2: 0x6a6a5a, flatR: 22 });
    // 돌길과 광장
    const plaza = new THREE.Mesh(new THREE.CircleGeometry(6, 24), mat(0xb8b0a0));
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.03;
    plaza.receiveShadow = true;
    b.g.add(plaza);
    b.strip(0, 18, 0, -14, 3, 0xa8a090);
    b.strip(-14, 5, 13, 5, 2.4, 0xa8a090);
    b.strip(0, 0, 12, -9, 2.2, 0xa8a090);
    // 동상
    const st = new THREE.Group();
    const ped = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), mat(0xd8d0c0));
    ped.position.y = 0.7;
    const fig = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.2, 8), mat(0x8a9aa0, { metalness: 0.5 }));
    fig.position.y = 2.5;
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 4, 8), mat(0xc8a040, { metalness: 0.8 }));
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 3.75;
    const hd = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), fig.material);
    hd.position.y = 3.85;
    st.add(ped, fig, hd, crown);
    b.add(st, 0, 0, 0);
    b.col(0, 0, 1.3);
    // 성 (북)
    const cx = L.castle[0];
    const cz = L.castle[1] - 6;
    b.box(cx, cz, 14, 1, 8, 0xc8c0b0, 0, 0);
    b.box(cx, cz, 9, 7, 5, 0xe0dad0, 1, 0);
    b.tower(cx - 6, cz, 12, 1.5, 0xe8e2d8, 0x2f4f8a);
    b.tower(cx + 6, cz, 12, 1.5, 0xe8e2d8, 0x2f4f8a);
    b.tower(cx, cz - 1, 16, 2, 0xf0eae0, 0x2f4f8a);
    b.banner(cx - 2.5, L.castle[1] - 2.2, 0x2f4f8a, 0, 4);
    b.banner(cx + 2.5, L.castle[1] - 2.2, 0x2f4f8a, 0, 4);
    // 대성당 (북동)
    const ccx = L.cathedral[0] + 3;
    const ccz = L.cathedral[1] - 2;
    b.box(ccx, ccz, 6, 6, 9, 0xe8e2d4, 0, 0.6);
    b.tower(ccx - 2, ccz + 3.5, 14, 1.1, 0xe8e2d4, 0x8a8aa0);
    const rose = new THREE.Mesh(new THREE.CircleGeometry(1, 12), glow(night ? 0xa070ff : 0x6a8aff, night ? 1.6 : 0.6));
    rose.position.set(ccx - Math.cos(0.6) * 0.2 - 2.6, 4, ccz + 3.2);
    rose.rotation.y = 0.6 - Math.PI / 2 + Math.PI;
    b.add(rose, rose.position.x, rose.position.y, rose.position.z, false);
    // 선술집 (동)
    b.house(L.tavern[0] + 2.5, L.tavern[1] + 1, -Math.PI / 2, { w: 6, d: 5, h: 3.4, roof: 0x6a3a2a, chimney: true, lit: true });
    b.box(L.tavern[0] - 0.2, L.tavern[1] - 1.6, 0.06, 0.7, 1, 0xc0c8d0, 2.6, 0, false);
    // 뒷골목 (서)
    for (let i = 0; i < 7; i++) {
      const x = L.slums[0] - 3 - (i % 3) * 3.4;
      const z = L.slums[1] - 7 + Math.floor(i / 3) * 6 + b.rand(-1, 1);
      b.house(x, z, Math.PI / 2 + b.rand(-0.3, 0.3), { w: 3, d: 3, h: 2.2, wall: 0x8a7a6a, roof: 0x4a4038, lit: night && b.r() > 0.5 });
    }
    for (let i = 0; i < 5; i++) {
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), mat([0xc85a4a, 0x5a8ac8, 0xd8c87a][i % 3], { side: THREE.DoubleSide }));
      b.add(cloth, L.slums[0] - 2 - i * 1.3, 3, L.slums[1] - 1 + (i % 2) * 2, false);
    }
    // 도시 집들
    for (const [x, z] of [[-9, -9], [-6, -16], [7, 11], [-7, 12], [14, 13], [-15, -4], [16, -2]]) b.house(x, z, Math.atan2(-x, -z), { wall: 0xe0d8c8, roof: 0x3a5a8a, lit: night });
    b.wallRing(24, 5, 0xd8d0c0, [[170, 190]], 36, 1.2);
    for (const s of [-1, 1]) b.tower(s * 3, 23.5, 7, 1.2, 0xd8d0c0, 0x2f4f8a);
    if (night) {
      b.lamp(3, 3, 0xffd080, true);
      b.lamp(-3, -3, 0xffd080, true);
      b.lamp(L.tavern[0] - 2, L.tavern[1] + 2, 0xffc070, true);
      b.lamp(L.slums[0] + 2, L.slums[1], 0xffb060, true);
    } else {
      for (const [x, z] of [[3, 3], [-3, -3], [-3, 8], [3, -8]]) b.lamp(x, z);
    }
    return night
      ? { sky: 0x0e1430, fog: [0x10162e, 18, 75], hemi: [0x8a9ae0, 0x2a2a30, 1.2], sun: [0xb4c4ff, 1.4, [10, 30, -15]], particles: 'fireflies', stars: true }
      : { sky: 0xa8d0f0, fog: [0xc8e0f0, 34, 100], hemi: [0xffffff, 0x6a6a5a, 1.0], sun: [0xfff4e0, 2.5, [18, 32, 14]], particles: 'pollen' };
  },

  hall(b, mode) {
    const S = {
      throne: { wall: 0xd8d0c4, floor: 0xb8ae9e, light: 0xfff0d0 },
      cathedral: { wall: 0xe8e2d6, floor: 0xc8c0b0, light: 0xfff0e0 },
      vault: { wall: 0x4a4650, floor: 0x3a3640, light: 0xb090ff },
      dungeon: { wall: 0x4a4640, floor: 0x3a3632, light: 0xff9a50 },
      hideout: { wall: 0x5a4a3a, floor: 0x4a3a2c, light: 0xffb060 },
      tavern: { wall: 0x8a6a4a, floor: 0x6a4a32, light: 0xffb060 },
    }[mode];
    b.room(11, 7, S.wall, S.floor, mode === 'dungeon' ? null : 0);
    const C = LANDMARKS.hall.center;
    if (mode === 'throne') {
      b.strip(0, 11, 0, C[1], 2.4, 0x8a1e22, 0.03);
      b.box(C[0], C[1] - 1.5, 5, 0.6, 3, 0xc8c0b0, 0, 0);
      const th = b.box(C[0], C[1] - 2, 1.6, 3.2, 1, 0xc8a040, 0.6, 0);
      th.material = mat(0xc8a040, { metalness: 0.7, roughness: 0.3 });
      b.box(C[0] - 2.4, C[1] - 1.5, 1, 1.4, 0.9, 0x3a1f4a, 0.6, 0);
      for (let i = 0; i < 4; i++) for (const x of [-5, 5]) b.pillar(x, -6 + i * 4, 7, 0.5, 0xe0d8cc);
      for (const x of [-7.5, 7.5]) for (const z of [-6, 2]) b.banner(x, z, 0x2f4f8a, x > 0 ? Math.PI : 0, 5);
    } else if (mode === 'cathedral' || mode === 'vault') {
      for (let i = 0; i < 4; i++) for (const x of [-5, 5]) b.pillar(x, -6 + i * 4, 7, 0.45, mode === 'vault' ? 0x5a5660 : 0xece6da);
      b.box(C[0], C[1] - 1, 3, 1.1, 1.4, mode === 'vault' ? 0x3a3640 : 0xd8d0c0, 0, 0);
      const relic = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.9), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.25, roughness: 0.1 }));
      b.add(relic, C[0], 1.7, C[1] - 1, false);
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), glow(0xe0f0ff, 3));
      b.add(shard, C[0], 1.7, C[1] - 1, false);
      b.anim.push((t) => (shard.rotation.y = t * 1.3));
      const colors = [0xff5a5a, 0x5a8aff, 0xffd04a, 0x6aff8a];
      for (let i = 0; i < (mode === 'vault' ? 1 : 3); i++) {
        const pl = new THREE.PointLight(mode === 'vault' ? 0xa060ff : colors[i], 14, 12, 1.6);
        pl.position.set(-4 + i * 4, 5, -6 + i * 2);
        b.g.add(pl);
      }
      if (mode === 'vault') {
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.4, 6), new THREE.MeshBasicMaterial({ color: 0xb46cff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
        b.add(flame, C[0], 2.2, C[1] + 2, false);
        b.anim.push((t) => {
          flame.scale.set(1 + Math.sin(t * 5) * 0.1, 1 + Math.sin(t * 7) * 0.15, 1);
          flame.rotation.y = t;
        });
      }
      for (let i = 0; i < 6; i++) b.box(-2.5 + (i % 2) * 5, 2 + Math.floor(i / 2) * 2, 2.6, 0.5, 0.6, 0x7a5a3a, 0, 0);
    } else if (mode === 'dungeon') {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.5;
        const x = Math.sin(a) * 8;
        const z = Math.cos(a) * 8;
        for (let k = -3; k <= 3; k++) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 5), mat(0x3a3a40, { metalness: 0.6 }));
          b.add(bar, x + Math.cos(a) * k * 0.3, 1.7, z - Math.sin(a) * k * 0.3);
        }
      }
      b.torch(3, 1, true);
      b.torch(-3, -3, true);
      for (let i = 0; i < 4; i++) b.rock(b.rand(-6, 6), b.rand(-6, 6), 0.3, 0x3a3632);
    } else if (mode === 'hideout') {
      for (let i = 0; i < 10; i++) b.box(b.rand(-8, 8), b.rand(-8, 8), 1, 1, 1, 0x7a5a3a, 0, b.r());
      for (let i = 0; i < 6; i++) b.barrel(b.rand(-8, 8), b.rand(-8, 8));
      b.box(C[0], C[1], 3, 0.9, 1.8, 0x6a4a2e, 0, 0.1);
      const map = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), mat(0xd8c8a0));
      map.rotation.x = -Math.PI / 2;
      b.add(map, C[0], 0.92, C[1], false);
      for (const [x, z] of [[-1, -0.4], [1.1, 0.4]]) b.fire(C[0] + x, C[1] + z, 0.25, 0xffb050, true).position.y = 0.95;
      for (let i = 0; i < 5; i++) b.box(b.rand(-7, 7), b.rand(2, 8), 1.6, 0.2, 0.8, 0x6a5a4a, 0, b.r(), false);
    } else if (mode === 'tavern') {
      for (let i = 0; i < 6; i++) {
        const x = -5 + (i % 3) * 5;
        const z = -3 + Math.floor(i / 3) * 5;
        b.box(x, z, 1.8, 0.9, 1.2, 0x6a4a2e, 0, 0);
        for (const s of [-1, 1]) b.box(x + s * 1.3, z, 0.5, 0.5, 0.5, 0x5a3a22, 0, 0, false);
      }
      b.box(0, -9, 8, 1.2, 1, 0x5a3a22, 0, 0);
      for (let i = 0; i < 8; i++) b.barrel(-3.5 + i, -10.2);
      b.fire(8.5, -3, 1, 0xff8a40, true);
      b.box(9.3, -3, 0.6, 3, 3, 0x6a5a50, 0, 0);
    }
    if (b.lights < 2) {
      const pl = new THREE.PointLight(S.light, 22, 22, 1.4);
      pl.position.set(0, 6, 0);
      b.g.add(pl);
    }
    const dim = mode === 'dungeon' || mode === 'vault';
    return {
      sky: dim ? 0x0a0a10 : 0x1a1612,
      fog: [dim ? 0x0a0a10 : 0x1a1612, 10, 34],
      hemi: [S.light, 0x2a2018, dim ? 0.75 : 1.05],
      sun: [S.light, dim ? 0.6 : 1.2, [4, 20, 6]],
      particles: mode === 'cathedral' || mode === 'throne' ? 'dust' : mode === 'vault' ? 'motes' : 'dust',
      bounds: 9.5,
      indoor: true,
    };
  },

  swamp(b) {
    const L = LANDMARKS.swamp;
    b.ground(0x2a3a24, { color2: 0x1e2a1a, flatR: 16, rise: 0.35 });
    for (let i = 0; i < 9; i++) b.water(b.rand(-14, 14), b.rand(-12, 12), b.rand(1.5, 3.5), 0x1a2a20, 0.85);
    b.water(L.bog[0], L.bog[1], 3.5, 0x1a2a1a, 0.9);
    const lily = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), glow(0xf0fff0, 1.8));
    b.add(lily, L.bog[0], 0.2, L.bog[1], false);
    // 오두막
    const hut = new THREE.Group();
    for (const [x, z] of [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]]) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 5), mat(0x3a2a1e));
      s.position.set(x, 0.8, z);
      hut.add(s);
    }
    const floorH = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 3.2), mat(0x4a3a2a));
    floorH.position.y = 1.6;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 2.8), mat(0x5a4a34));
    wall.position.y = 2.8;
    wall.rotation.z = 0.06;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2, 4), mat(0x3a4a2a));
    roof.position.y = 4.8;
    roof.rotation.set(0.08, Math.PI / 4, 0.1);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.06), glow(0x9aff6a, 2));
    win.position.set(0.6, 3, 1.42);
    hut.add(floorH, wall, roof, win);
    b.add(hut, L.hut[0], 0, L.hut[1] - 1.5);
    b.col(L.hut[0], L.hut[1] - 1.5, 2.6);
    const pl = new THREE.PointLight(0x9aff6a, 10, 10, 1.6);
    pl.position.set(L.hut[0] + 0.6, 3, L.hut[1]);
    b.g.add(pl);
    for (let i = 0; i < 40; i++) {
      const x = b.rand(-30, 30);
      const z = b.rand(-30, 30);
      if (Math.hypot(x, z) < 6 || Math.hypot(x - L.hut[0], z - L.hut[1]) < 5) continue;
      b.tree(x, z, b.rand(1.2, 2.4), 'dead', { trunk: 0x2a2a22 });
    }
    for (let i = 0; i < 14; i++) b.mushroom(b.rand(-12, 12), b.rand(-12, 12), 0x9aff6a, b.rand(0.6, 1.2));
    return { sky: 0x26302a, fog: [0x2a342c, 3, 30], hemi: [0xb0c8b0, 0x1a221a, 1.0], sun: [0xd8e8d0, 1.0, [5, 20, 5]], particles: 'motes' };
  },

  tower(b) {
    const L = LANDMARKS.tower;
    b.ground(0x2a2628, { color2: 0x1a1618, flatR: 18, rise: 0.5 });
    b.strip(0, 16, 0, L.gate[1], 3, 0x1a1618);
    const obs = mat(0x14101a, { metalness: 0.4, roughness: 0.3, emissive: 0x1a0a2a, emissiveIntensity: 0.5 });
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 6, 8), obs);
    base.position.y = 3;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 5.5, 46, 8), obs);
    shaft.position.y = 28;
    const top = new THREE.Mesh(new THREE.ConeGeometry(4.5, 8, 8), obs);
    top.position.y = 55;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4), glow(0xb46cff, 1.4));
    door.position.set(0, 2.2, 7.2);
    g.add(base, shaft, top, door);
    for (let i = 0; i < 12; i++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2, 0.1), glow(0xb46cff, 2));
      const a = (i / 12) * Math.PI * 2;
      r.position.set(Math.sin(a) * 4.3, 10 + (i % 4) * 9, Math.cos(a) * 4.3);
      r.rotation.y = a;
      g.add(r);
    }
    b.add(g, L.gate[0], 0, L.gate[1] - 8);
    b.col(L.gate[0], L.gate[1] - 8, 7.6);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(14, 0.6, 5, 30), glow(0xb46cff, 1.8));
    ring.rotation.x = Math.PI / 2;
    b.add(ring, L.gate[0], 58, L.gate[1] - 8, false);
    b.anim.push((t) => {
      ring.rotation.z = t * 0.4;
      door.material.emissiveIntensity = 1.2 + Math.sin(t * 2) * 0.4;
    });
    for (let i = 0; i < 18; i++) {
      const a = b.rand(0, Math.PI * 2);
      const r = b.rand(10, 30);
      const sp = new THREE.Mesh(new THREE.ConeGeometry(b.rand(0.4, 1), b.rand(2, 6), 5), obs);
      b.add(sp, Math.sin(a) * r, 1, Math.cos(a) * r + 4);
      b.col(Math.sin(a) * r, Math.cos(a) * r + 4, 0.8);
    }
    for (let i = 0; i < 10; i++) b.rock(b.rand(-16, 16), b.rand(-4, 16), b.rand(0.4, 1.4), 0x2a2428);
    for (let i = 0; i < 6; i++) b.crystal(b.rand(-14, 14), b.rand(0, 14), 0xb46cff, b.rand(0.5, 1));
    b.fire(-6, 4, 1.2, 0xb46cff, true);
    b.fire(6, 4, 1.2, 0xb46cff, true);
    return { sky: 0x2a0a18, fog: [0x3a1020, 12, 70], hemi: [0xff8a8a, 0x1a0c10, 1.0], sun: [0xff7a6a, 1.6, [-20, 18, 10]], particles: 'ash' };
  },

  tower_inner(b) {
    b.room(9, 12, 0x1a1420, 0x231c2a);
    const obs = mat(0x14101a, { metalness: 0.4, roughness: 0.3 });
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.2), obs);
      step.position.set(Math.sin(a) * 7.6, i * 0.55 + 0.15, Math.cos(a) * 7.6);
      step.rotation.y = a;
      b.g.add(step);
    }
    // 거울
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const mirror = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.2), new THREE.MeshStandardMaterial({ color: 0xb8b0d0, metalness: 1, roughness: 0.05, emissive: 0x2a1a4a, emissiveIntensity: 0.4 }));
      mirror.position.set(Math.sin(a) * 6, 1.9, Math.cos(a) * 6);
      mirror.lookAt(0, 1.9, 0);
      b.g.add(mirror);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2, 3.4, 0.1), mat(0x3a2a4a));
      frame.position.copy(mirror.position).multiplyScalar(1.02);
      frame.lookAt(0, 1.9, 0);
      b.g.add(frame);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      b.crystal(Math.sin(a) * 4, Math.cos(a) * 4, 0xb46cff, 0.7);
    }
    const pl = new THREE.PointLight(0xb46cff, 20, 16, 1.5);
    pl.position.set(0, 4, 0);
    b.g.add(pl);
    return { sky: 0x0a0610, fog: [0x0a0610, 8, 30], hemi: [0xb48aff, 0x1a1020, 0.95], sun: [0xc89aff, 0.8, [0, 20, 3]], particles: 'motes', bounds: 7.5, indoor: true };
  },

  tower_top(b) {
    const L = LANDMARKS.tower_top;
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(11, 9, 2, 12), mat(0x1a1420, { metalness: 0.4, roughness: 0.4 }));
    plat.position.y = -1;
    plat.receiveShadow = true;
    b.g.add(plat);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.pillar(Math.sin(a) * 10, Math.cos(a) * 10, b.rand(2, 5), 0.4, 0x2a2030, false);
    }
    b.box(L.altar[0], L.altar[1] - 1, 2.4, 1.2, 1.4, mat(0x14101a, { emissive: 0x2a0a3a, emissiveIntensity: 0.5 }), 0, 0);
    const vortex = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const r = new THREE.Mesh(
        new THREE.TorusGeometry(6 + i * 5, 0.4 + i * 0.2, 4, 32),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x6a2aaa : 0xb46cff, transparent: true, opacity: 0.6 - i * 0.08, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      r.rotation.x = Math.PI / 2;
      r.position.y = 22 + i * 1.5;
      vortex.add(r);
    }
    b.g.add(vortex);
    b.anim.push((t) => vortex.children.forEach((r, i) => (r.rotation.z = t * (0.3 + i * 0.1) * (i % 2 ? -1 : 1))));
    const pl = new THREE.PointLight(0xb46cff, 30, 30, 1.2);
    pl.position.set(0, 10, 0);
    b.g.add(pl);
    return { sky: 0x1a0620, fog: [0x2a0a2a, 20, 80], hemi: [0xd0a0ff, 0x1a1020, 1.0], sun: [0xff8aa0, 1.4, [-10, 20, 10]], particles: 'ash', bounds: 9 };
  },

  void(b) {
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(8, 0.5, 4, 10), new THREE.MeshStandardMaterial({ color: 0x2a1a3a, emissive: 0x3a1a6a, emissiveIntensity: 0.6, flatShading: true }));
    plat.position.y = -2;
    b.g.add(plat);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(8, 0.12, 4, 40), glow(0xe0d0ff, 2));
    rim.rotation.x = Math.PI / 2;
    b.add(rim, 0, 0.02, 0, false);
    const frags = [];
    for (let i = 0; i < 40; i++) {
      const f = new THREE.Mesh(new THREE.DodecahedronGeometry(b.rand(0.4, 2), 0), mat(0x1a1024, { emissive: 0x2a0a4a, emissiveIntensity: 0.6 }));
      const a = b.rand(0, Math.PI * 2);
      const r = b.rand(14, 40);
      f.position.set(Math.sin(a) * r, b.rand(-15, 20), Math.cos(a) * r);
      b.g.add(f);
      frags.push([f, a, r, b.rand(0.02, 0.1)]);
    }
    const gate = new THREE.Mesh(new THREE.TorusGeometry(12, 1.2, 8, 40), glow(0x8a3cff, 2));
    gate.position.set(0, 12, -24);
    b.g.add(gate);
    const core = new THREE.Mesh(new THREE.CircleGeometry(11, 32), new THREE.MeshBasicMaterial({ color: 0x050008 }));
    core.position.set(0, 12, -24.2);
    b.g.add(core);
    b.anim.push((t) => {
      gate.rotation.z = t * 0.2;
      for (const [f, a, r, sp] of frags) {
        const aa = a + t * sp;
        f.position.x = Math.sin(aa) * r;
        f.position.z = Math.cos(aa) * r;
        f.rotation.x = t * sp * 5;
      }
    });
    return { sky: 0x08040e, fog: [0x10081a, 20, 90], hemi: [0xc8a0ff, 0x150a20, 1.0], sun: [0xe8dcff, 1.4, [0, 20, 10]], particles: 'void', bounds: 7.5, stars: true };
  },
};

export function buildScene(base, mode, seed = 7) {
  const b = new Builder(seed + base.length * 131 + (mode ? mode.length * 17 : 0));
  const env = SCENES[base](b, mode);
  return { group: b.g, colliders: b.colliders, anim: b.anim, env };
}
