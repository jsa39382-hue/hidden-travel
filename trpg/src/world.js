// 3D 세계: 렌더러, 3인칭 카메라, 이동, 등장인물 배치, 표식, 전투 연출
import * as THREE from 'three';
import { humanoid, buildEnemy, animate, swing, glow } from './models.js';
import { buildScene } from './scenes.js';
import { PLACES, LANDMARKS } from './places.js';
import { ACTORS, CLASSES } from './data.js';

const UP = new THREE.Vector3(0, 1, 0);

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function label(text, { color = '#f3ead6', bg = 'rgba(14,12,20,0.72)', size = 30, border = null } = {}) {
  const c = document.createElement('canvas');
  const x = c.getContext('2d');
  const font = `600 ${size}px "Gowun Dodum", "Noto Sans KR", system-ui, sans-serif`;
  x.font = font;
  const w = Math.ceil(x.measureText(text).width) + 36;
  const h = size + 22;
  c.width = w;
  c.height = h;
  x.font = font;
  x.fillStyle = bg;
  const r = h / 2;
  x.beginPath();
  x.roundRect(1, 1, w - 2, h - 2, r);
  x.fill();
  if (border) {
    x.strokeStyle = border;
    x.lineWidth = 2;
    x.stroke();
  }
  x.fillStyle = color;
  x.textBaseline = 'middle';
  x.textAlign = 'center';
  x.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const k = 0.011;
  sp.scale.set(w * k, h * k, 1);
  sp.renderOrder = 10;
  return sp;
}

const PARTICLES = {
  fireflies: { color: 0xd8ff8a, size: 0.22, count: 120, add: true },
  embers: { color: 0xff8a3a, size: 0.16, count: 220, add: true },
  ash: { color: 0x9a8a90, size: 0.14, count: 260, add: false },
  pollen: { color: 0xfff6d0, size: 0.08, count: 120, add: true },
  dust: { color: 0xffe8c0, size: 0.08, count: 110, add: true },
  leaves: { color: 0xd88a3a, size: 0.2, count: 90, add: false },
  spores: { color: 0x9affd8, size: 0.14, count: 160, add: true },
  motes: { color: 0xb0ff9a, size: 0.14, count: 140, add: true },
  void: { color: 0xc89aff, size: 0.2, count: 300, add: true },
};

export class World {
  constructor(container) {
    this.container = container;
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    r.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(r.domElement);
    r.domElement.className = 'world-canvas';
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -24;
    sc.right = sc.top = 24;
    sc.near = 1;
    sc.far = 120;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.dot = dotTexture();
    this.player = new THREE.Group();
    this.scene.add(this.player);
    this.playerModel = null;
    this.actors = new Map();
    this.markers = [];
    this.enemies = [];
    this.effects = [];
    this.anim = [];
    this.colliders = [];
    this.bounds = 18;
    this.keys = {};
    this.yaw = 0;
    this.pitch = 0.38;
    this.dist = 7.5;
    this.moveTarget = null;
    this.focus = new THREE.Vector3();
    this.camPos = new THREE.Vector3(0, 5, 10);
    this.combatFocus = null;
    this.locked = false;
    this.speaker = null;
    this.time = 0;
    this.onMarker = null;
    this.clock = new THREE.Clock();
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ visible: false }));
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);
    this.ray = new THREE.Raycaster();

    this.speakRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.7, 28),
      new THREE.MeshBasicMaterial({ color: 0xf2cf7a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.speakRing.rotation.x = -Math.PI / 2;
    this.speakRing.visible = false;
    this.scene.add(this.speakRing);

    this.moveDot = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.moveDot.rotation.x = -Math.PI / 2;
    this.moveDot.visible = false;
    this.scene.add(this.moveDot);

    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    r.setAnimationLoop(() => this.tick());
  }

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 66 : 55;
    this.camera.updateProjectionMatrix();
  }

  setPlayer(clsId) {
    if (this.playerModel) this.player.remove(this.playerModel);
    const look = { ...CLASSES[clsId].look };
    this.playerModel = humanoid(look);
    this.player.add(this.playerModel);
  }

  // ── 장소 불러오기
  load(loc) {
    const place = PLACES[loc];
    if (!place) return;
    this.loc = loc;
    if (this.envGroup) {
      this.scene.remove(this.envGroup);
      this.envGroup.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
      });
    }
    this.clearActors();
    this.clearMarkers();
    this.clearEnemies();
    if (this.stars) this.scene.remove(this.stars), (this.stars = null);
    if (this.particles) this.scene.remove(this.particles), (this.particles = null);

    const seed = loc.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const { group, colliders, anim, env } = buildScene(place.base, place.mode, seed);
    this.envGroup = group;
    this.scene.add(group);
    this.colliders = colliders;
    this.anim = anim;
    this.env = env;
    this.landmarks = LANDMARKS[place.base] || {};
    this.bounds = env.bounds ?? 18;
    this.indoor = !!env.indoor;

    this.scene.background = new THREE.Color(env.sky);
    this.scene.fog = new THREE.Fog(env.fog[0], env.fog[1], env.fog[2]);
    this.hemi.color.setHex(env.hemi[0]);
    this.hemi.groundColor.setHex(env.hemi[1]);
    this.hemi.intensity = env.hemi[2];
    this.sun.color.setHex(env.sun[0]);
    this.sun.intensity = env.sun[1];
    this.sunDir = new THREE.Vector3(...env.sun[2]).normalize();

    if (env.stars) this.makeStars();
    if (env.particles) this.makeParticles(env.particles);

    const [sx, sz] = place.spawn;
    this.player.position.set(sx, 0, sz);
    this.yaw = Math.atan2(sx, sz) || 0;
    if (Math.hypot(sx, sz) < 1) this.yaw = 0;
    this.player.rotation.y = this.yaw + Math.PI;
    this.moveTarget = null;
    this.dist = this.indoor ? 6 : 7.5;
    this.focus.copy(this.player.position).add(new THREE.Vector3(0, 1.4, 0));
    this.placeCamera(true);
  }

  makeStars() {
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * 0.48 * Math.PI;
      const r = 220;
      pos[i * 3] = Math.cos(u) * Math.cos(v) * r;
      pos[i * 3 + 1] = Math.sin(v) * r + 10;
      pos[i * 3 + 2] = Math.sin(u) * Math.cos(v) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.6, sizeAttenuation: false, fog: false, map: this.dot, transparent: true, depthWrite: false }));
    this.scene.add(this.stars);
  }

  makeParticles(kind) {
    const k = PARTICLES[kind];
    if (!k) return;
    const n = k.count;
    const pos = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 1] = Math.random() * 9;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 36;
      seeds[i] = Math.random() * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.particles = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        color: k.color,
        size: k.size,
        map: this.dot,
        transparent: true,
        depthWrite: false,
        blending: k.add ? THREE.AdditiveBlending : THREE.NormalBlending,
        opacity: k.add ? 0.9 : 0.75,
      }),
    );
    this.particles.userData = { kind, seeds };
    this.scene.add(this.particles);
  }

  updateParticles(dt) {
    const p = this.particles;
    if (!p) return;
    const { kind, seeds } = p.userData;
    const a = p.geometry.attributes.position;
    const t = this.time;
    const cx = this.player.position.x;
    const cz = this.player.position.z;
    for (let i = 0; i < a.count; i++) {
      let x = a.getX(i);
      let y = a.getY(i);
      let z = a.getZ(i);
      const s = seeds[i];
      if (kind === 'embers' || kind === 'spores') {
        y += dt * (kind === 'embers' ? 1.2 : 0.4) * (0.5 + (s % 1));
        x += Math.sin(t + s) * dt * 0.4;
        if (y > 9) y = 0;
      } else if (kind === 'ash' || kind === 'leaves') {
        y -= dt * (kind === 'ash' ? 0.7 : 1.0) * (0.5 + (s % 1));
        x += Math.sin(t * 1.3 + s) * dt * 0.8;
        z += Math.cos(t * 0.9 + s) * dt * 0.3;
        if (y < 0) y = 9;
      } else if (kind === 'void') {
        const ang = t * 0.2 + s;
        x += Math.cos(ang) * dt * 1.2;
        z += Math.sin(ang) * dt * 1.2;
        y += Math.sin(t + s) * dt * 0.5;
      } else {
        x += Math.sin(t * 0.7 + s) * dt * 0.5;
        y += Math.cos(t * 0.9 + s * 2) * dt * 0.3;
        z += Math.cos(t * 0.6 + s) * dt * 0.5;
        if (y < 0.2) y = 0.2;
        if (y > 6) y = 6;
      }
      if (x - cx > 18) x -= 36;
      if (x - cx < -18) x += 36;
      if (z - cz > 18) z -= 36;
      if (z - cz < -18) z += 36;
      a.setXYZ(i, x, y, z);
    }
    a.needsUpdate = true;
    if (kind === 'fireflies') p.material.opacity = 0.65 + Math.sin(t * 3) * 0.25;
  }

  // ── 등장인물
  clearActors() {
    for (const { g } of this.actors.values()) this.scene.remove(g);
    this.actors.clear();
    this.speaker = null;
  }

  setActors(ids = [], speaker = null) {
    for (const [id, a] of this.actors) {
      if (!ids.includes(id)) {
        this.scene.remove(a.g);
        this.actors.delete(id);
      }
    }
    const fresh = ids.filter((id) => !this.actors.has(id) && ACTORS[id]);
    if (fresh.length) {
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
      const n = ids.length;
      ids.forEach((id, i) => {
        if (!fresh.includes(id)) return;
        const def = ACTORS[id];
        const g = humanoid(def.look);
        const off = (i - (n - 1) / 2) * 1.7;
        const p = this.player.position.clone().addScaledVector(fwd, 3.4 - Math.abs(off) * 0.25).addScaledVector(right, off);
        this.resolve(p, 0.5);
        g.position.copy(p);
        const lb = label(def.name);
        lb.position.y = (g.userData.height || 1.9) / (def.look.scale || 1) + 0.45;
        g.add(lb);
        g.userData.phase = Math.random() * 6;
        g.userData.spawn = 0;
        this.scene.add(g);
        this.actors.set(id, { g, def });
      });
    }
    this.speaker = speaker && this.actors.has(speaker) ? speaker : null;
  }

  // ── 표식 (선택지가 세계에 놓인 자리)
  clearMarkers() {
    for (const m of this.markers) this.scene.remove(m.g);
    this.markers = [];
  }

  setMarkers(list, onTrigger) {
    this.clearMarkers();
    this.onMarker = onTrigger;
    const used = {};
    for (const ch of list) {
      const base = this.landmarks?.[ch.at];
      if (!base) continue;
      // 같은 자리에 표식이 여럿이면 옆으로 벌려 놓는다
      const k = (used[ch.at] = (used[ch.at] || 0) + 1) - 1;
      const pos = k ? [base[0] + Math.cos(k * 2.1) * 2.6, base[1] + Math.sin(k * 2.1) * 2.6] : base;
      const g = new THREE.Group();
      const color = ch.ok ? 0xf2cf7a : 0x8a8a8a;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1.15, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 0.9, 6, 20, 1, true),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      beam.position.y = 3;
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), glow(color, 2.5));
      gem.position.y = 2.4;
      const text = ch.t.length > 16 ? ch.t.slice(0, 15) + '…' : ch.t;
      const lb = label(text, { color: ch.ok ? '#ffe7a8' : '#bbbbbb', border: ch.ok ? 'rgba(242,207,122,0.6)' : null });
      lb.position.y = 3.1;
      g.add(ring, beam, gem, lb);
      g.position.set(pos[0], 0, pos[1]);
      this.scene.add(g);
      const d = Math.hypot(this.player.position.x - pos[0], this.player.position.z - pos[1]);
      this.markers.push({ g, ch, ring, gem, armed: d > 2.6, pos });
    }
  }

  // ── 적
  clearEnemies() {
    for (const e of this.enemies) this.scene.remove(e.g);
    this.enemies = [];
    this.combatFocus = null;
  }

  spawnEnemy(def) {
    this.clearEnemies();
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
    const n = Math.min(def.count || 1, 3);
    const center = this.player.position.clone().addScaledVector(fwd, def.scale > 1.5 ? 6 : 4.2);
    this.resolve(center, 1);
    // 구경하던 인물들은 플레이어 양옆 뒤로 물러난다
    let side = 0;
    for (const { g } of this.actors.values()) {
      const s = side % 2 ? 1 : -1;
      const p = this.player.position.clone().addScaledVector(right, s * (2.4 + Math.floor(side / 2) * 1.3)).addScaledVector(fwd, -1.2);
      this.resolve(p, 0.5);
      g.position.copy(p);
      side++;
    }
    for (let i = 0; i < n; i++) {
      const g = buildEnemy(def);
      const off = (i - (n - 1) / 2) * 1.8;
      g.position.copy(center).addScaledVector(right, off).addScaledVector(fwd, Math.abs(off) * 0.4);
      g.userData.phase = Math.random() * 6;
      g.userData.home = g.position.clone();
      g.scale.multiplyScalar(0.01);
      g.userData.baseScale = def.scale ?? def.look?.scale ?? 1;
      this.scene.add(g);
      this.enemies.push({ g, hit: 0, lunge: 0, dying: 0 });
    }
    if (def.boss || def.model === 'wraith') this.boom(center, def.boss ? 0xb46cff : 0x6a3aaa, 30);
    this.combatFocus = center.clone();
  }

  // 전투 중 연출
  playerAttack(kind = 'melee', color = 0xffffff) {
    const e = this.enemies.find((x) => !x.dying);
    if (!e) return;
    this.playerLunge = 1;
    if (kind !== 'melee') {
      const from = this.player.position.clone().add(new THREE.Vector3(0, 1.3, 0));
      const to = e.g.position.clone().add(new THREE.Vector3(0, 1.1, 0));
      this.projectile(from, to, color);
    }
  }
  enemyHit(dead = false) {
    const delay = 180;
    setTimeout(() => {
      for (const e of this.enemies) {
        if (e.dying) continue;
        e.hit = 1;
        this.boom(e.g.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffd0a0, 14);
        if (dead) e.dying = 0.001;
      }
    }, delay);
  }
  enemyAttack() {
    for (const e of this.enemies) if (!e.dying) e.lunge = 1;
    setTimeout(() => (this.playerHitT = 1), 220);
  }
  enemyMiss() {
    for (const e of this.enemies) if (!e.dying) e.lunge = 1;
  }
  heal(color = 0x9aff9a) {
    this.boom(this.player.position.clone().add(new THREE.Vector3(0, 0.5, 0)), color, 24, true);
  }
  burst(color = 0xdfe8ff) {
    this.boom(this.player.position.clone().add(new THREE.Vector3(0, 1.2, 0)), color, 60);
  }

  projectile(from, to, color) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), glow(color, 3));
    m.position.copy(from);
    this.scene.add(m);
    const light = new THREE.PointLight(color, 8, 6, 1.5);
    m.add(light);
    this.effects.push({ t: 0, dur: 0.32, update: (k) => m.position.lerpVectors(from, to, k), done: () => this.scene.remove(m) });
  }

  boom(at, color, count = 20, rise = false) {
    const n = count;
    const pos = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++) {
      pos.set([at.x, at.y, at.z], i * 3);
      const v = new THREE.Vector3(Math.random() - 0.5, rise ? Math.random() * 0.8 + 0.4 : Math.random() - 0.3, Math.random() - 0.5).multiplyScalar(rise ? 2.2 : 6);
      vel.push(v);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.35, map: this.dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(pts);
    this.effects.push({
      t: 0,
      dur: rise ? 1.2 : 0.7,
      update: (k, dt) => {
        const a = g.attributes.position;
        for (let i = 0; i < n; i++) {
          a.setXYZ(i, a.getX(i) + vel[i].x * dt, a.getY(i) + vel[i].y * dt, a.getZ(i) + vel[i].z * dt);
          if (!rise) vel[i].y -= 6 * dt;
        }
        a.needsUpdate = true;
        pts.material.opacity = 1 - k;
      },
      done: () => this.scene.remove(pts),
    });
  }

  // ── 입력
  bindInput() {
    const el = this.renderer.domElement;
    window.addEventListener('keydown', (e) => {
      if (e.target.closest?.('input, textarea')) return;
      this.keys[e.code] = true;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) this.moveTarget = null;
    });
    window.addEventListener('keyup', (e) => (this.keys[e.code] = false));
    window.addEventListener('blur', () => (this.keys = {}));
    let down = null;
    el.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch, moved: false, id: e.pointerId };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!down || down.id !== e.pointerId) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 7) down.moved = true;
      if (down.moved) {
        this.yaw = down.yaw - dx * 0.0065;
        this.pitch = Math.max(0.08, Math.min(1.1, down.pitch + dy * 0.004));
      }
    });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      if (!down.moved && !this.locked) this.clickMove(e);
      down = null;
    });
    el.addEventListener('pointercancel', () => (down = null));
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.dist = Math.max(3.5, Math.min(13, this.dist + e.deltaY * 0.006));
      },
      { passive: false },
    );
  }

  clickMove(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const mk = this.ray.intersectObjects(
      this.markers.map((m) => m.g),
      true,
    );
    if (mk.length) {
      let o = mk[0].object;
      while (o.parent && !this.markers.find((m) => m.g === o)) o = o.parent;
      const m = this.markers.find((x) => x.g === o);
      if (m) {
        this.moveTarget = new THREE.Vector3(m.pos[0], 0, m.pos[1]);
        this.showMoveDot();
        return;
      }
    }
    const hit = this.ray.intersectObject(this.ground);
    if (hit.length) {
      const p = hit[0].point;
      p.y = 0;
      this.clampBounds(p);
      this.moveTarget = p;
      this.showMoveDot();
    }
  }
  showMoveDot() {
    this.moveDot.position.set(this.moveTarget.x, 0.05, this.moveTarget.z);
    this.moveDot.visible = true;
  }

  clampBounds(p) {
    const d = Math.hypot(p.x, p.z);
    if (d > this.bounds) {
      p.x *= this.bounds / d;
      p.z *= this.bounds / d;
    }
  }
  resolve(p, r = 0.4) {
    for (let k = 0; k < 2; k++) {
      for (const c of this.colliders) {
        const dx = p.x - c.x;
        const dz = p.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + r;
        if (d < min && d > 0.0001) {
          p.x = c.x + (dx / d) * min;
          p.z = c.z + (dz / d) * min;
        }
      }
    }
    this.clampBounds(p);
  }

  // ── 매 프레임
  placeCamera(snap = false) {
    const target = this.combatFocus ? this.combatFocus.clone().lerp(this.player.position, 0.5).add(new THREE.Vector3(0, 1.3, 0)) : this.player.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    this.focus.lerp(target, snap ? 1 : 0.12);
    const dist = this.combatFocus ? Math.max(this.dist, 8.5) : this.dist;
    const off = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)).multiplyScalar(dist);
    const want = this.focus.clone().add(off);
    if (this.indoor || this.env?.camLimit) {
      const lim = this.env?.camLimit ?? this.bounds + 1;
      const d = Math.hypot(want.x, want.z);
      if (d > lim) {
        want.x *= lim / d;
        want.z *= lim / d;
      }
      if (this.indoor) want.y = Math.min(want.y, 6.2);
    }
    want.y = Math.max(want.y, 0.6);
    this.camPos.lerp(want, snap ? 1 : 0.15);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.focus);
  }

  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    const t = this.time;

    // 이동
    let moving = false;
    if (!this.locked && this.playerModel) {
      const k = this.keys;
      let ix = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      let iz = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0);
      const dir = new THREE.Vector3();
      if (ix || iz) {
        const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3().crossVectors(fwd, UP);
        dir.addScaledVector(fwd, -iz).addScaledVector(right, ix);
      } else if (this.moveTarget) {
        dir.subVectors(this.moveTarget, this.player.position);
        dir.y = 0;
        if (dir.length() < 0.25) {
          this.moveTarget = null;
          this.moveDot.visible = false;
          dir.set(0, 0, 0);
        }
      }
      if (dir.lengthSq() > 0) {
        dir.normalize();
        const speed = k.ShiftLeft || k.ShiftRight ? 7 : 4.6;
        const next = this.player.position.clone().addScaledVector(dir, speed * dt);
        this.resolve(next, 0.4);
        this.player.position.copy(next);
        const want = Math.atan2(dir.x, dir.z);
        let d = want - this.player.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        this.player.rotation.y += d * Math.min(1, dt * 12);
        moving = true;
        // 카메라가 천천히 등 뒤로 따라온다
        if (ix === 0 && iz < 0) {
          let dy = this.player.rotation.y + Math.PI - this.yaw;
          dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          this.yaw += dy * dt * 1.2;
        }
      }
    }
    if (this.moveDot.visible) this.moveDot.material.opacity = 0.4 + Math.sin(t * 6) * 0.3;

    if (this.playerModel) {
      animate(this.playerModel, t, moving);
      if (this.playerLunge > 0) {
        this.playerLunge = Math.max(0, this.playerLunge - dt * 3.5);
        swing(this.playerModel, Math.sin(this.playerLunge * Math.PI));
        const e = this.enemies[0];
        if (e) {
          const dir = e.g.position.clone().sub(this.player.position).setY(0).normalize();
          this.player.rotation.y = Math.atan2(dir.x, dir.z);
          this.playerModel.position.copy(dir.multiplyScalar(Math.sin(this.playerLunge * Math.PI) * 0.8)).applyAxisAngle(UP, -this.player.rotation.y);
        }
      } else this.playerModel.position.set(0, 0, 0);
      if (this.playerHitT > 0) {
        this.playerHitT = Math.max(0, this.playerHitT - dt * 3);
        this.playerModel.position.x += Math.sin(t * 60) * 0.06 * this.playerHitT;
      }
    }

    // 등장인물: 플레이어를 바라본다
    for (const [id, { g }] of this.actors) {
      g.userData.spawn = Math.min(1, g.userData.spawn + dt * 3);
      const s = g.userData.spawn;
      g.position.y = (1 - s) * -1.5;
      const look = Math.atan2(this.player.position.x - g.position.x, this.player.position.z - g.position.z);
      let d = look - g.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      g.rotation.y += d * Math.min(1, dt * 4);
      animate(g, t + (id === this.speaker ? t * 0.6 : 0), false, g.userData.phase);
    }
    const sp = this.speaker && this.actors.get(this.speaker);
    this.speakRing.visible = !!sp;
    if (sp) {
      this.speakRing.position.set(sp.g.position.x, 0.04, sp.g.position.z);
      this.speakRing.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
    }

    // 적
    for (const e of this.enemies) {
      const g = e.g;
      const bs = g.userData.baseScale;
      if (!e.dying) g.scale.setScalar(Math.min(bs, g.scale.x + dt * bs * 3));
      const look = Math.atan2(this.player.position.x - g.position.x, this.player.position.z - g.position.z);
      g.rotation.y = look;
      animate(g, t, e.lunge > 0, g.userData.phase);
      const toP = this.player.position.clone().sub(g.userData.home).setY(0).normalize();
      if (e.lunge > 0) {
        e.lunge = Math.max(0, e.lunge - dt * 3);
        const k = Math.sin(e.lunge * Math.PI);
        g.position.copy(g.userData.home).addScaledVector(toP, k * 1.6);
        swing(g, k);
      } else if (e.hit > 0) {
        e.hit = Math.max(0, e.hit - dt * 4);
        g.position.copy(g.userData.home).addScaledVector(toP, -e.hit * 0.5);
      } else if (!e.dying) g.position.copy(g.userData.home);
      if (e.dying) {
        e.dying += dt;
        g.scale.setScalar(Math.max(0.001, bs * (1 - e.dying * 1.4)));
        g.position.y = -e.dying * 0.8;
        g.rotation.z = e.dying * 1.5;
      }
    }

    // 표식
    for (const m of this.markers) {
      m.gem.rotation.y = t * 2;
      m.gem.position.y = 2.4 + Math.sin(t * 2 + m.pos[0]) * 0.15;
      m.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
      const d = Math.hypot(this.player.position.x - m.pos[0], this.player.position.z - m.pos[1]);
      if (d > 2.6) m.armed = true;
      if (m.armed && d < 1.5 && !this.locked && this.onMarker) {
        m.armed = false;
        this.moveTarget = null;
        this.moveDot.visible = false;
        this.onMarker(m.ch);
      }
    }

    for (const f of this.anim) f(t);
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const f = this.effects[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      f.update(k, dt);
      if (k >= 1) {
        f.done?.();
        this.effects.splice(i, 1);
      }
    }
    this.updateParticles(dt);

    // 그림자 카메라를 플레이어 주변에 둔다
    if (this.sunDir) {
      this.sun.position.copy(this.player.position).addScaledVector(this.sunDir, 50);
      this.sun.target.position.copy(this.player.position);
    }
    this.placeCamera();
    this.renderer.render(this.scene, this.camera);
  }
}
