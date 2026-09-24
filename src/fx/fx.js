// Particle + effect systems, all voxel flavoured (cubes everywhere).
import * as THREE from 'three';
import { rand } from '../core/util.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _d = new THREE.Vector3();
const Zf = new THREE.Vector3(0, 0, 1);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

class CubePool {
  constructor(scene, max, material, { shadow = false } = {}) {
    this.max = max;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mesh = new THREE.InstancedMesh(geo, material, max);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = shadow;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, new THREE.Color());
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.p = [];
    for (let i = 0; i < max; i++)
      this.p.push({
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1,
        s0: 1, s1: 0, sPeak: 0, c0: new THREE.Color(), c1: new THREE.Color(),
        rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, g: 0, drag: 0, bounce: 0, stretch: 0, fadePow: 1, floor: 0,
      });
    this.n = 0;
    this.tmpC = new THREE.Color();
  }
  spawn() {
    if (this.n >= this.max) {
      // recycle the oldest-ish slot
      const q = this.p[(Math.random() * this.max) | 0];
      q.life = 0;
      return q;
    }
    const q = this.p[this.n++];
    q.life = 0;
    q.stretch = 0;
    q.sPeak = 0;
    q.bounce = 0;
    q.floor = 0;
    q.fadePow = 1;
    q.wx = q.wy = q.wz = 0;
    return q;
  }
  update(dt) {
    const p = this.p;
    let i = 0;
    const mesh = this.mesh;
    while (i < this.n) {
      const q = p[i];
      q.life += dt;
      if (q.life >= q.max) {
        // swap-remove
        this.n--;
        const last = p[this.n];
        p[this.n] = q;
        p[i] = last;
        continue;
      }
      const t = q.life / q.max;
      const dr = Math.exp(-q.drag * dt);
      q.vx *= dr; q.vy *= dr; q.vz *= dr;
      q.vy -= q.g * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.y < q.floor) {
        q.y = q.floor;
        if (q.bounce > 0) {
          q.vy = -q.vy * q.bounce;
          q.vx *= 0.6; q.vz *= 0.6;
          q.wx *= 0.5; q.wz *= 0.5;
        } else q.vy = 0;
      }
      q.rx += q.wx * dt; q.ry += q.wy * dt; q.rz += q.wz * dt;
      let s;
      if (q.sPeak > 0) {
        s = t < q.sPeak ? q.s0 + (q.s1 - q.s0) * (t / q.sPeak) : q.s1 * (1 - (t - q.sPeak) / (1 - q.sPeak));
      } else s = q.s0 + (q.s1 - q.s0) * t;
      _p.set(q.x, q.y, q.z);
      if (q.stretch > 0) {
        _d.set(q.vx, q.vy, q.vz);
        const sp = _d.length();
        if (sp > 1e-4) _q.setFromUnitVectors(Zf, _d.multiplyScalar(1 / sp));
        _s.set(s, s, s + sp * q.stretch);
      } else {
        _e.set(q.rx, q.ry, q.rz);
        _q.setFromEuler(_e);
        _s.set(s, s, s);
      }
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      const f = Math.pow(1 - t, q.fadePow);
      this.tmpC.copy(q.c0).lerp(q.c1, t).multiplyScalar(f);
      mesh.setColorAt(i, this.tmpC);
      i++;
    }
    mesh.count = this.n;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
  }
}

// Ribbon trail for the beam saber (and boost streaks).
export class Trail {
  constructor(scene, color, segs = 18) {
    this.segs = segs;
    this.color = new THREE.Color(color);
    const n = segs * 2;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    const idx = [];
    for (let i = 0; i < segs - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, transparent: true,
    }));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.hist = [];
    this.intensity = 0;
  }
  push(base, tip, on) {
    this.hist.unshift({ b: base.clone(), t: tip.clone() });
    if (this.hist.length > this.segs) this.hist.pop();
    this.intensity += ((on ? 1 : 0) - this.intensity) * (on ? 0.6 : 0.25);
    const n = this.hist.length;
    for (let i = 0; i < this.segs; i++) {
      const h = this.hist[Math.min(i, n - 1)];
      const k = i * 6;
      // widen the ribbon slightly toward the base for a crescent look
      this.pos[k] = h.b.x; this.pos[k + 1] = h.b.y; this.pos[k + 2] = h.b.z;
      this.pos[k + 3] = h.t.x; this.pos[k + 4] = h.t.y; this.pos[k + 5] = h.t.z;
      const f = Math.pow(1 - i / this.segs, 1.6) * this.intensity;
      const fb = f * 0.35;
      this.col[k] = this.color.r * fb; this.col[k + 1] = this.color.g * fb; this.col[k + 2] = this.color.b * fb;
      this.col[k + 3] = this.color.r * f * 1.6; this.col[k + 4] = this.color.g * f * 1.6; this.col[k + 5] = this.color.b * f * 1.6;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
    this.mesh.visible = this.intensity > 0.01;
  }
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    const glowMat = new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true });
    const solidMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.1 });
    const smokeMat = new THREE.MeshLambertMaterial({});
    this.glow = new CubePool(scene, 2400, glowMat);
    // opaque emissive cubes for fireballs: they bloom but don't stack into white-out
    this.fire = new CubePool(scene, 900, new THREE.MeshBasicMaterial({ toneMapped: false }));
    this.solid = new CubePool(scene, 1400, solidMat, { shadow: true });
    this.smoke = new CubePool(scene, 900, smokeMat);
    this.glow.mesh.renderOrder = 5;

    // shockwave rings
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.86, 1, 48, 1);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 20; i++) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, side: THREE.DoubleSide,
      }));
      m.visible = false;
      m.frustumCulled = false;
      scene.add(m);
      this.rings.push({ m, t: 0, dur: 1, r0: 0, r1: 1, c: new THREE.Color(), active: false });
    }
    // spheres (SP blast domes)
    this.domes = [];
    const domeGeo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({
        color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, flatShading: true,
      }));
      m.visible = false;
      m.frustumCulled = false;
      scene.add(m);
      this.domes.push({ m, t: 0, dur: 1, r0: 0, r1: 1, c: new THREE.Color(), active: false });
    }
    // flash lights (fixed count to avoid shader recompiles)
    this.lights = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffaa55, 0, 20, 1.6);
      scene.add(l);
      this.lights.push({ l, t: 0, dur: 1, i0: 0 });
    }
    this.lightCursor = 0;
    this.smokeSources = [];
    this.smokeAcc = 0;
  }

  update(dt) {
    this.glow.update(dt);
    this.fire.update(dt);
    this.solid.update(dt);
    this.smoke.update(dt);
    for (const r of this.rings) {
      if (!r.active) continue;
      r.t += dt;
      const t = r.t / r.dur;
      if (t >= 1) { r.active = false; r.m.visible = false; continue; }
      const e = 1 - Math.pow(1 - t, 3);
      const rad = r.r0 + (r.r1 - r.r0) * e;
      r.m.scale.set(rad, 1, rad);
      r.m.material.color.copy(r.c).multiplyScalar((1 - t) * (1 - t));
    }
    for (const r of this.domes) {
      if (!r.active) continue;
      r.t += dt;
      const t = r.t / r.dur;
      if (t >= 1) { r.active = false; r.m.visible = false; continue; }
      const e = 1 - Math.pow(1 - t, 3);
      const rad = r.r0 + (r.r1 - r.r0) * e;
      r.m.scale.set(rad, rad * 0.7, rad);
      r.m.rotation.y += dt * 0.8;
      r.m.material.color.copy(r.c).multiplyScalar((1 - t) * (1 - t));
    }
    for (const L of this.lights) {
      if (L.t >= L.dur) { L.l.intensity = 0; continue; }
      L.t += dt;
      const t = Math.min(1, L.t / L.dur);
      L.l.intensity = L.i0 * (1 - t) * (1 - t);
    }
    // ambient battle smoke from burning buildings
    this.smokeAcc += dt;
    while (this.smokeAcc > 0.04 && this.smokeSources.length) {
      this.smokeAcc -= 0.04;
      const s = this.smokeSources[(Math.random() * this.smokeSources.length) | 0];
      const q = this.smoke.spawn();
      q.x = s.x + rand(-0.6, 0.6); q.y = s.y + rand(0, 0.5); q.z = s.z + rand(-0.6, 0.6);
      q.vx = rand(0.4, 1.4); q.vy = rand(1.8, 3); q.vz = rand(-0.3, 0.3);
      q.max = rand(4, 6.5); q.g = 0; q.drag = 0.05;
      q.s0 = rand(0.35, 0.6); q.s1 = rand(1.6, 2.6); q.sPeak = 0.7;
      const l = rand(0.1, 0.2);
      q.c0.setRGB(l, l * 0.96, l * 0.92); q.c1.setRGB(l * 2.2, l * 2.15, l * 2.1);
      q.fadePow = 0;
      q.rx = rand(0, 3); q.ry = rand(0, 3); q.wy = rand(-0.3, 0.3);
      if (Math.random() < 0.3) {
        const f = this.fire.spawn();
        f.x = s.x + rand(-0.8, 0.8); f.y = s.y - rand(0, 0.8); f.z = s.z + rand(-0.8, 0.8);
        f.vx = 0; f.vy = rand(1, 2.5); f.vz = 0; f.max = rand(0.4, 0.8); f.g = 0; f.drag = 1;
        f.s0 = rand(0.25, 0.5); f.s1 = 0.05; f.c0.setRGB(2.0, 0.9, 0.2); f.c1.setRGB(1.0, 0.2, 0.04);
        f.rx = rand(0, 3); f.ry = rand(0, 3);
      }
    }
  }

  light(pos, color, intensity, dist, dur) {
    const L = this.lights[this.lightCursor++ % this.lights.length];
    L.l.position.copy(pos);
    L.l.color.set(color);
    L.l.distance = dist;
    L.i0 = intensity;
    L.t = 0;
    L.dur = dur;
  }

  ring(pos, r0, r1, color, dur, y = 0.08) {
    const r = this.rings.find((x) => !x.active) || this.rings[0];
    r.active = true;
    r.t = 0;
    r.dur = dur;
    r.r0 = r0;
    r.r1 = r1;
    r.c.set(color);
    r.m.position.set(pos.x, y, pos.z);
    r.m.scale.set(r0, 1, r0);
    r.m.visible = true;
  }

  dome(pos, r0, r1, color, dur) {
    const r = this.domes.find((x) => !x.active) || this.domes[0];
    r.active = true;
    r.t = 0;
    r.dur = dur;
    r.r0 = r0;
    r.r1 = r1;
    r.c.set(color);
    r.m.position.copy(pos);
    r.m.visible = true;
  }

  // Beam hit sparks: bright stretched cubes.
  sparks(pos, n, color, speed = 12, spread = 1, dir = null) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const q = this.glow.spawn();
      q.x = pos.x; q.y = pos.y; q.z = pos.z;
      let vx = rand(-1, 1), vy = rand(-0.4, 1), vz = rand(-1, 1);
      if (dir) { vx = vx * spread + dir.x; vy = vy * spread + dir.y; vz = vz * spread + dir.z; }
      const l = Math.hypot(vx, vy, vz) || 1;
      const sp = speed * rand(0.4, 1.2);
      q.vx = (vx / l) * sp; q.vy = (vy / l) * sp; q.vz = (vz / l) * sp;
      q.max = rand(0.15, 0.4); q.g = 18; q.drag = 3;
      q.s0 = rand(0.06, 0.14); q.s1 = 0.02; q.stretch = 0.045;
      q.c0.copy(c).multiplyScalar(2.2); q.c1.copy(c).multiplyScalar(0.8);
    }
  }

  hit(pos, color = 0xff5fbf, big = false) {
    this.sparks(pos, big ? 22 : 12, color, big ? 18 : 13);
    const q = this.glow.spawn();
    q.x = pos.x; q.y = pos.y; q.z = pos.z; q.vx = q.vy = q.vz = 0;
    q.max = 0.12; q.g = 0; q.drag = 0;
    q.s0 = big ? 1.4 : 0.8; q.s1 = big ? 2.2 : 1.3;
    q.c0.set(color).multiplyScalar(2.5); q.c1.set(0xffffff).multiplyScalar(0.8);
    q.rx = rand(0, 3); q.ry = rand(0, 3); q.rz = rand(0, 3);
  }

  debris(pos, n, colors, speed = 8, size = 0.22) {
    for (let i = 0; i < n; i++) {
      const q = this.solid.spawn();
      q.x = pos.x + rand(-0.4, 0.4); q.y = pos.y + rand(-0.4, 0.6); q.z = pos.z + rand(-0.4, 0.4);
      const a = rand(0, Math.PI * 2), sp = speed * rand(0.35, 1);
      q.vx = Math.cos(a) * sp; q.vz = Math.sin(a) * sp; q.vy = rand(0.4, 1.3) * speed;
      q.max = rand(1.2, 2.2); q.g = 22; q.drag = 0.4; q.bounce = 0.35;
      q.s0 = size * rand(0.6, 1.5); q.s1 = q.s0; q.sPeak = 0.8; q.fadePow = 0;
      q.c0.set(colors[(Math.random() * colors.length) | 0]); q.c1.copy(q.c0).multiplyScalar(0.5);
      q.rx = rand(0, 3); q.ry = rand(0, 3); q.rz = rand(0, 3);
      q.wx = rand(-12, 12); q.wy = rand(-12, 12); q.wz = rand(-12, 12);
      q.floor = q.s0 * 0.5;
    }
  }

  puff(pos, n, gray = 0.55, size = 1, rise = 1.5, spread = 2.5) {
    for (let i = 0; i < n; i++) {
      const q = this.smoke.spawn();
      q.x = pos.x + rand(-0.4, 0.4); q.y = pos.y + rand(0, 0.3); q.z = pos.z + rand(-0.4, 0.4);
      const a = rand(0, Math.PI * 2), sp = spread * rand(0.3, 1);
      q.vx = Math.cos(a) * sp; q.vz = Math.sin(a) * sp; q.vy = rise * rand(0.4, 1.2);
      q.max = rand(0.7, 1.3); q.g = 0; q.drag = 2.4;
      q.s0 = size * rand(0.3, 0.6); q.s1 = size * rand(0.9, 1.5); q.sPeak = 0.35; q.fadePow = 0;
      const l = gray * rand(0.85, 1.1);
      q.c0.setRGB(l, l * 0.97, l * 0.92); q.c1.setRGB(l * 1.1, l * 1.08, l * 1.04);
      q.rx = rand(0, 3); q.ry = rand(0, 3); q.wy = rand(-2, 2);
    }
  }

  dust(pos, n = 6, size = 0.8) {
    this.puff(pos, n, 0.62, size, 0.8, 3.2);
  }

  // Full voxel explosion.
  explode(pos, scale = 1, colors = [0x3e6a3c, 0x78a85a, 0x4b5049]) {
    const s = scale;
    // brief core flash (additive, small)
    const f = this.glow.spawn();
    f.x = pos.x; f.y = pos.y; f.z = pos.z; f.vx = f.vy = f.vz = 0;
    f.max = 0.1; f.g = 0; f.drag = 0; f.s0 = 1.1 * s; f.s1 = 1.8 * s;
    f.c0.setRGB(1.6, 1.2, 0.7); f.c1.setRGB(1.0, 0.45, 0.1);
    f.rx = rand(0, 3); f.ry = rand(0, 3);
    // fireball: solid glowing cubes cooling from yellow to deep red
    const nf = Math.round(10 * Math.min(2, s));
    for (let i = 0; i < nf; i++) {
      const q = this.fire.spawn();
      q.x = pos.x + rand(-0.5, 0.5) * s; q.y = pos.y + rand(-0.4, 0.5) * s; q.z = pos.z + rand(-0.5, 0.5) * s;
      const a = rand(0, Math.PI * 2), sp = rand(1.5, 5) * s;
      q.vx = Math.cos(a) * sp; q.vz = Math.sin(a) * sp; q.vy = rand(0.5, 4.5) * s;
      q.max = rand(0.35, 0.65); q.g = -1.5; q.drag = 4;
      q.s0 = rand(0.35, 0.6) * s; q.s1 = rand(0.8, 1.25) * s; q.sPeak = 0.3; q.fadePow = 0.4;
      const hot = rand(0, 1);
      q.c0.setRGB(1.9, 1.25 + hot * 0.4, 0.35 + hot * 0.3); q.c1.setRGB(0.9, 0.16, 0.03);
      q.rx = rand(0, 3); q.ry = rand(0, 3); q.rz = rand(0, 3);
      q.wx = rand(-3, 3); q.wy = rand(-3, 3);
    }
    // sparks
    this.sparks(pos, Math.round(12 * s), 0xffb347, 14 * Math.sqrt(s));
    // smoke
    for (let i = 0; i < Math.round(7 * s); i++) {
      const q = this.smoke.spawn();
      q.x = pos.x + rand(-0.7, 0.7) * s; q.y = pos.y + rand(0, 0.7) * s; q.z = pos.z + rand(-0.7, 0.7) * s;
      const a = rand(0, Math.PI * 2), sp = rand(1, 3) * s;
      q.vx = Math.cos(a) * sp; q.vz = Math.sin(a) * sp; q.vy = rand(1.5, 3.5) * s;
      q.max = rand(1.0, 1.8); q.g = 0; q.drag = 1.8;
      q.s0 = rand(0.3, 0.55) * s; q.s1 = rand(0.9, 1.4) * s; q.sPeak = 0.35; q.fadePow = 0;
      const l = rand(0.1, 0.18);
      q.c0.setRGB(l, l, l); q.c1.setRGB(l * 2.4, l * 2.3, l * 2.2);
      q.rx = rand(0, 3); q.ry = rand(0, 3); q.wy = rand(-1, 1);
    }
    this.debris(pos, Math.round(9 * s), colors, 8 * Math.sqrt(s), 0.22 * Math.sqrt(s));
    this.ring(pos, 0.4 * s, 3.5 * s, 0xff8a30, 0.45);
    this.light(pos, 0xff9040, 40 * s, 14 * s, 0.3);
  }

  // Thruster exhaust (call every frame while boosting).
  thruster(pos, dir, color = 0x7fd4ff, strength = 1) {
    const q = this.glow.spawn();
    q.x = pos.x + rand(-0.08, 0.08); q.y = pos.y + rand(-0.08, 0.08); q.z = pos.z + rand(-0.08, 0.08);
    const sp = rand(6, 10) * strength;
    q.vx = dir.x * sp + rand(-0.6, 0.6); q.vy = dir.y * sp + rand(-0.6, 0.6); q.vz = dir.z * sp + rand(-0.6, 0.6);
    q.max = rand(0.08, 0.16); q.g = 0; q.drag = 5;
    q.s0 = rand(0.09, 0.16) * strength; q.s1 = 0.02; q.stretch = 0.02;
    q.c0.set(color).multiplyScalar(1.5); q.c1.set(0xffffff).multiplyScalar(0.25);
  }

  // SP / musou aura motes rising around a point.
  aura(pos, color, n = 2, radius = 1.2) {
    for (let i = 0; i < n; i++) {
      const q = this.glow.spawn();
      const a = rand(0, Math.PI * 2), r = rand(0.4, radius);
      q.x = pos.x + Math.cos(a) * r; q.y = pos.y + rand(0, 2.5); q.z = pos.z + Math.sin(a) * r;
      q.vx = 0; q.vy = rand(2, 4); q.vz = 0;
      q.max = rand(0.3, 0.6); q.g = 0; q.drag = 1;
      q.s0 = rand(0.06, 0.14); q.s1 = 0.01; q.stretch = 0.05;
      q.c0.set(color).multiplyScalar(2.2); q.c1.set(color).multiplyScalar(0.6);
    }
  }
}
