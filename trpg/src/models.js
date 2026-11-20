// 로우폴리 캐릭터·괴물 모델 (외부 에셋 없이 기본 도형으로 조립)
import * as THREE from 'three';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0.05, ...opts });
  delete m.unique;
  if (!opts.unique) matCache.set(key, m);
  return m;
}
export function glow(color, intensity = 1.6) {
  return mat(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}

function box(w, h, d, m) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.castShadow = true;
  return mesh;
}
function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return c.getHex();
}

// 사람형 캐릭터
export function humanoid(o = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const skin = mat(o.skin ?? 0xe2b48c);
  const cloth = mat(o.cloth ?? 0x666666);
  const cloth2 = mat(o.cloth2 ?? shade(o.cloth ?? 0x666666, 0.6));
  const hair = mat(o.hairColor ?? 0x3a2a1a);
  const w = o.wide ? 1.25 : 1;

  const mkLimb = (len, thick, m) => {
    const pivot = new THREE.Group();
    const mesh = box(thick, len, thick, m);
    mesh.position.y = -len / 2;
    pivot.add(mesh);
    return pivot;
  };
  const lLeg = mkLimb(0.58, 0.19 * w, cloth2);
  const rLeg = mkLimb(0.58, 0.19 * w, cloth2);
  lLeg.position.set(-0.13 * w, 0.6, 0);
  rLeg.position.set(0.13 * w, 0.6, 0);
  body.add(lLeg, rLeg);

  const torso = box(0.52 * w, 0.62, 0.3 * w, cloth);
  torso.position.y = 0.92;
  body.add(torso);
  const belt = box(0.54 * w, 0.08, 0.32 * w, cloth2);
  belt.position.y = 0.66;
  body.add(belt);

  if (o.robe) {
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * w, 0.46 * w, 0.72, 8), cloth);
    robe.position.y = 0.36;
    robe.castShadow = true;
    body.add(robe);
  }

  const lArm = mkLimb(0.55, 0.15 * w, cloth);
  const rArm = mkLimb(0.55, 0.15 * w, cloth);
  lArm.position.set(-0.34 * w, 1.2, 0);
  rArm.position.set(0.34 * w, 1.2, 0);
  const handGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);
  for (const a of [lArm, rArm]) {
    const h = new THREE.Mesh(handGeo, skin);
    h.position.y = -0.6;
    a.add(h);
  }
  body.add(lArm, rArm);

  const head = new THREE.Group();
  head.position.y = 1.47;
  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), skin);
  skull.castShadow = true;
  head.add(skull);
  const eyeM = o.eyes ? glow(o.eyes, 2.5) : mat(0x1a1a1a);
  for (const x of [-0.08, 0.08]) {
    const e = box(0.05, 0.05, 0.02, eyeM);
    e.castShadow = false;
    e.position.set(x, 0.02, 0.2);
    head.add(e);
  }
  if (o.ears) {
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 4), skin);
      ear.position.set(0.22 * s, 0.04, 0);
      ear.rotation.z = -s * 1.1;
      head.add(ear);
    }
  }
  if (o.beard) {
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 5), hair);
    beard.position.set(0, -0.2, 0.12);
    beard.rotation.x = Math.PI;
    head.add(beard);
  }
  const hat = o.hat ?? 'hair';
  if (hat === 'hair') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.235, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    cap.position.y = 0.02;
    cap.rotation.x = -0.25;
    head.add(cap);
  } else if (hat === 'hood') {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 7, 1, true), cloth2);
    hood.position.set(0, 0.1, -0.03);
    hood.material.side = THREE.DoubleSide;
    head.add(hood);
  } else if (hat === 'helmet') {
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.3, 8), mat(0xaab2bc, { metalness: 0.6, roughness: 0.35 }));
    helm.position.y = 0.08;
    head.add(helm);
    const crest = box(0.05, 0.14, 0.3, cloth2);
    crest.position.y = 0.28;
    head.add(crest);
  } else if (hat === 'wizard') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 10), cloth2);
    brim.position.y = 0.16;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 8), cloth2);
    cone.position.set(0, 0.46, -0.04);
    cone.rotation.x = -0.18;
    head.add(brim, cone);
  } else if (hat === 'crown') {
    const gold = mat(0xd9b44a, { metalness: 0.8, roughness: 0.3, emissive: 0x3a2a00 });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 10), gold);
    ring.position.y = 0.2;
    head.add(ring);
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), gold);
      const a = (i / 5) * Math.PI * 2;
      sp.position.set(Math.sin(a) * 0.2, 0.3, Math.cos(a) * 0.2);
      head.add(sp);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.225, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    head.add(cap);
  }
  body.add(head);

  if (o.cape) {
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.6 * w, 1.05), mat(o.cape, { side: THREE.DoubleSide }));
    cape.position.set(0, 0.72, -0.18 * w);
    cape.rotation.x = 0.12;
    cape.castShadow = true;
    body.add(cape);
    g.userData.cape = cape;
  }

  // 무기
  const wpn = new THREE.Group();
  wpn.position.y = -0.6;
  rArm.add(wpn);
  const steel = mat(0xc8cdd4, { metalness: 0.7, roughness: 0.3 });
  const wood = mat(0x6a4a2a);
  if (o.weapon === 'sword') {
    const blade = box(0.06, 0.8, 0.02, steel);
    blade.position.set(0, -0.08, 0.4);
    blade.rotation.x = Math.PI / 2;
    const guard = box(0.24, 0.04, 0.05, mat(0x8a6a2a));
    guard.position.set(0, 0, 0.04);
    wpn.add(blade, guard);
  } else if (o.weapon === 'dagger') {
    const blade = box(0.05, 0.36, 0.02, steel);
    blade.position.set(0, 0, 0.2);
    blade.rotation.x = Math.PI / 2;
    wpn.add(blade);
  } else if (o.weapon === 'staff') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 5), wood);
    pole.position.y = 0.35;
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), glow(o.orb ?? 0x9fd0ff, 2.2));
    orb.position.y = 1.22;
    wpn.add(pole, orb);
    g.userData.orb = orb;
  } else if (o.weapon === 'hammer') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 5), wood);
    pole.position.set(0, 0.1, 0.1);
    const headM = box(0.36, 0.2, 0.2, mat(0x6a6e74, { metalness: 0.6 }));
    headM.position.set(0, 0.55, 0.1);
    wpn.add(pole, headM);
  } else if (o.weapon === 'mace') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5), wood);
    pole.position.set(0, 0, 0.25);
    pole.rotation.x = Math.PI / 2;
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), mat(0xd9b44a, { metalness: 0.7 }));
    ball.position.set(0, 0, 0.56);
    wpn.add(pole, ball);
  } else if (o.weapon === 'bow') {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 4, 12, Math.PI), wood);
    bow.rotation.y = Math.PI / 2;
    bow.position.set(0, 0, 0.05);
    lArm.children[0].parent.add(bow);
    bow.position.set(0, -0.55, 0.1);
  } else if (o.weapon === 'torch') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5), wood);
    pole.position.y = 0.25;
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 5), glow(0xffa040, 3));
    fire.position.y = 0.62;
    wpn.add(pole, fire);
    g.userData.flame = fire;
  }

  if (o.aura) {
    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 12, 10),
      new THREE.MeshBasicMaterial({ color: o.aura, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    aura.position.y = 0.9;
    g.add(aura);
    g.userData.aura = aura;
  }

  const sc = o.scale ?? 1;
  g.scale.setScalar(sc);
  g.userData.parts = { lLeg, rLeg, lArm, rArm, head, body, torso };
  g.userData.kind = 'humanoid';
  g.userData.height = 1.9 * sc;
  return g;
}

export function wolf(o = {}) {
  const g = new THREE.Group();
  const fur = mat(o.tint ?? 0x23232e, { emissive: 0x1a0a33, emissiveIntensity: 0.4 });
  const body = new THREE.Group();
  g.add(body);
  const torso = box(0.5, 0.45, 1.1, fur);
  torso.position.y = 0.7;
  body.add(torso);
  const head = new THREE.Group();
  head.position.set(0, 0.95, 0.65);
  const skull = box(0.38, 0.34, 0.4, fur);
  const snout = box(0.2, 0.16, 0.3, fur);
  snout.position.set(0, -0.06, 0.3);
  head.add(skull, snout);
  for (const x of [-0.12, 0.12]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4), fur);
    ear.position.set(x, 0.25, -0.05);
    const eye = box(0.06, 0.04, 0.02, glow(0x6fd6ff, 3));
    eye.position.set(x * 0.9, 0.05, 0.21);
    head.add(ear, eye);
  }
  body.add(head);
  const legs = [];
  for (const [x, z] of [[-0.18, 0.4], [0.18, 0.4], [-0.18, -0.4], [0.18, -0.4]]) {
    const p = new THREE.Group();
    p.position.set(x, 0.55, z);
    const l = box(0.13, 0.55, 0.13, fur);
    l.position.y = -0.27;
    p.add(l);
    body.add(p);
    legs.push(p);
  }
  const tail = box(0.1, 0.1, 0.5, fur);
  tail.position.set(0, 0.85, -0.75);
  tail.rotation.x = -0.5;
  body.add(tail);
  g.userData.parts = { legs, head, body };
  g.userData.kind = 'quad';
  g.userData.height = 1.3;
  g.scale.setScalar(o.scale ?? 1);
  return g;
}

export function spider(o = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const shell = mat(0x2a1f2a, { emissive: 0x2a0033, emissiveIntensity: 0.3 });
  const abd = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), shell);
  abd.position.set(0, 0.6, -0.4);
  abd.scale.set(1, 0.8, 1.2);
  abd.castShadow = true;
  const ceph = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), shell);
  ceph.position.set(0, 0.5, 0.3);
  ceph.castShadow = true;
  body.add(abd, ceph);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), glow(0xb050ff, 2));
    b.position.set((i % 2 ? 0.2 : -0.2), 0.95, -0.3 - (i > 1 ? 0.3 : 0));
    body.add(b);
  }
  for (const x of [-0.08, 0.08, -0.15, 0.15]) {
    const e = box(0.05, 0.05, 0.02, glow(0xff3a5a, 3));
    e.position.set(x, 0.58 + (Math.abs(x) > 0.1 ? 0.05 : 0), 0.58);
    body.add(e);
  }
  const legs = [];
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const k = i % 4;
    const p = new THREE.Group();
    p.position.set(0.2 * side, 0.55, 0.35 - k * 0.22);
    p.rotation.z = side * 0.9;
    p.rotation.y = side * (k - 1.5) * 0.35;
    const l = box(0.06, 0.8, 0.06, shell);
    l.position.y = -0.4;
    p.add(l);
    body.add(p);
    legs.push(p);
  }
  g.userData.parts = { legs, body };
  g.userData.kind = 'spider';
  g.userData.height = 1.2;
  g.scale.setScalar(o.scale ?? 1);
  return g;
}

export function golem(o = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const rock = mat(o.tint ?? 0x5a5550);
  const crack = glow(o.tint ? 0x9aff6a : 0xff6a20, 2.2);
  const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), rock);
  torso.position.y = 1.5;
  torso.scale.set(1.1, 1, 0.8);
  torso.castShadow = true;
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), crack);
  core.position.set(0, 1.55, 0.55);
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), rock);
  head.position.y = 2.35;
  head.castShadow = true;
  for (const x of [-0.12, 0.12]) {
    const e = box(0.08, 0.06, 0.02, crack);
    e.position.set(x, 2.38, 0.28);
    body.add(e);
  }
  body.add(torso, core, head);
  const mkArm = (s) => {
    const p = new THREE.Group();
    p.position.set(0.95 * s, 1.9, 0);
    const a = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), rock);
    a.position.y = -0.35;
    const f = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), rock);
    f.position.y = -1.0;
    a.castShadow = f.castShadow = true;
    p.add(a, f);
    body.add(p);
    return p;
  };
  const lArm = mkArm(-1);
  const rArm = mkArm(1);
  const mkLeg = (s) => {
    const p = new THREE.Group();
    p.position.set(0.4 * s, 0.9, 0);
    const l = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), rock);
    l.position.y = -0.5;
    l.castShadow = true;
    p.add(l);
    body.add(p);
    return p;
  };
  const lLeg = mkLeg(-1);
  const rLeg = mkLeg(1);
  g.userData.parts = { lArm, rArm, lLeg, rLeg, body, head };
  g.userData.kind = 'humanoid';
  g.userData.height = 2.8;
  g.scale.setScalar(o.scale ?? 1);
  return g;
}

export function wraith(o = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const m = new THREE.MeshStandardMaterial({
    color: 0x14101e,
    emissive: 0x2a1048,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.88,
    flatShading: true,
  });
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.8, 7, 1, true), m);
  robe.position.y = 1.1;
  robe.rotation.x = Math.PI;
  robe.material.side = THREE.DoubleSide;
  const hood = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), m);
  hood.position.y = 1.95;
  body.add(robe, hood);
  for (const x of [-0.1, 0.1]) {
    const e = box(0.07, 0.05, 0.02, glow(0xc080ff, 3));
    e.position.set(x, 1.95, 0.27);
    body.add(e);
  }
  const lArm = new THREE.Group();
  const rArm = new THREE.Group();
  for (const [p, s] of [[lArm, -1], [rArm, 1]]) {
    p.position.set(0.4 * s, 1.6, 0);
    const a = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9, 5), m);
    a.position.y = -0.45;
    a.rotation.x = Math.PI;
    p.add(a);
    body.add(p);
  }
  g.userData.parts = { lArm, rArm, body };
  g.userData.kind = 'float';
  g.userData.height = 2.3;
  g.scale.setScalar(o.scale ?? 1);
  return g;
}

export function buildEnemy(def) {
  switch (def.model) {
    case 'wolf':
      return wolf(def);
    case 'spider':
      return spider(def);
    case 'golem':
      return golem(def);
    case 'wraith':
      return wraith(def);
    default:
      return humanoid(def.look || {});
  }
}

// 걷기·대기 애니메이션
export function animate(g, t, moving, phase = 0) {
  const p = g.userData.parts;
  if (!p) return;
  const k = g.userData.kind;
  const sw = moving ? Math.sin(t * 9 + phase) * 0.7 : Math.sin(t * 1.5 + phase) * 0.04;
  if (k === 'humanoid') {
    p.lLeg.rotation.x = sw;
    p.rLeg.rotation.x = -sw;
    p.lArm.rotation.x = -sw * 0.8;
    p.rArm.rotation.x = sw * 0.8;
    p.body.position.y = moving ? Math.abs(Math.sin(t * 9 + phase)) * 0.06 : Math.sin(t * 1.6 + phase) * 0.015;
    if (p.head && !moving) p.head.rotation.y = Math.sin(t * 0.5 + phase) * 0.25;
  } else if (k === 'quad') {
    p.legs.forEach((l, i) => (l.rotation.x = (i % 3 === 0 ? 1 : -1) * sw));
    p.body.position.y = moving ? Math.abs(Math.sin(t * 9)) * 0.05 : 0;
    p.head.rotation.x = Math.sin(t * 2 + phase) * 0.08;
  } else if (k === 'spider') {
    p.legs.forEach((l, i) => (l.rotation.x = Math.sin(t * (moving ? 14 : 3) + i) * (moving ? 0.4 : 0.08)));
    p.body.position.y = Math.sin(t * 2 + phase) * 0.03;
  } else if (k === 'float') {
    p.body.position.y = 0.2 + Math.sin(t * 2 + phase) * 0.15;
    p.lArm.rotation.x = -0.4 + Math.sin(t * 2.3 + phase) * 0.3;
    p.rArm.rotation.x = -0.4 + Math.cos(t * 2.1 + phase) * 0.3;
  }
  if (g.userData.aura) g.userData.aura.scale.setScalar(1 + Math.sin(t * 3 + phase) * 0.08);
  if (g.userData.orb) g.userData.orb.rotation.y = t * 2;
  if (g.userData.flame) g.userData.flame.scale.y = 1 + Math.sin(t * 20 + phase) * 0.2;
  if (g.userData.cape) g.userData.cape.rotation.x = 0.12 + (moving ? 0.35 : 0) + Math.sin(t * 3 + phase) * 0.04;
}

// 공격 동작: 짧게 팔을 휘두른다
export function swing(g, amt) {
  const p = g.userData.parts;
  if (!p) return;
  if (p.rArm) p.rArm.rotation.x = -amt * 2.2;
  if (g.userData.kind === 'quad' && p.head) p.head.position.z = 0.65 + amt * 0.3;
}
