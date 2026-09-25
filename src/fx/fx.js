// Particle + effect systems, all voxel flavoured (cubes everywhere).
import * as THREE from 'three';
import { rand } from '../core/util.js';
import { lensClear } from '../core/lensclear.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _d = new THREE.Vector3();
const Zf = new THREE.Vector3(0, 0, 1);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const _c = new THREE.Color();

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
        rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, sx: 1, sy: 1, sz: 1, g: 0, drag: 0, bounce: 0, stretch: 0, fadePow: 1, floor: 0,
      });
    this.n = 0;
    this.tmpC = new THREE.Color();
  }
  spawn() {
    if (this.n >= this.max) {
      // recycle the oldest-ish slot
      const q = this.p[(Math.random() * this.max) | 0];
      q.life = 0;
      q.sx = q.sy = q.sz = 1;
      q.stretch = 0;
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
    q.sx = q.sy = q.sz = 1;
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
        _s.set(s * q.sx, s * q.sy, s * q.sz);
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

// Ribbon trail for the beam saber (and the heat hawks). Raw per-frame samples are Catmull-Rom subdivided so fast
// swings sweep a smooth crescent instead of a jagged fan, and each row runs dim base -> saber colour -> white-hot edge.
const SUB = 4;
const cr = (a, b, c, d, t) => {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
};
export class Trail {
  constructor(scene, color, segs = 18) {
    this.raw = Math.max(4, segs);
    this.rows = (this.raw - 1) * SUB + 1;
    this.color = new THREE.Color(color);
    const n = this.rows * 3;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    const idx = [];
    for (let i = 0; i < this.rows - 1; i++) {
      const a = i * 3, b = a + 3;
      idx.push(a, a + 1, b, a + 1, b + 1, b, a + 1, a + 2, b + 1, a + 2, b + 2, b + 1);
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
    if (this.hist.length > this.raw) this.hist.pop();
    this.intensity += ((on ? 1 : 0) - this.intensity) * (on ? 0.6 : 0.25);
    const H = this.hist, n = H.length;
    const at = (i) => H[Math.max(0, Math.min(n - 1, i))];
    const c = this.color;
    let k = 0;
    for (let r = 0; r < this.rows; r++) {
      const seg = Math.floor(r / SUB), u = (r % SUB) / SUB;
      const p0 = at(seg - 1), p1 = at(seg), p2 = at(seg + 1), p3 = at(seg + 2);
      for (const key of ['b', 't']) {
        const o = key === 'b' ? 0 : 6;
        this.pos[k + o] = cr(p0[key].x, p1[key].x, p2[key].x, p3[key].x, u);
        this.pos[k + o + 1] = cr(p0[key].y, p1[key].y, p2[key].y, p3[key].y, u);
        this.pos[k + o + 2] = cr(p0[key].z, p1[key].z, p2[key].z, p3[key].z, u);
      }
      // middle row sits 70% of the way to the tip
      for (let a = 0; a < 3; a++) this.pos[k + 3 + a] = this.pos[k + a] + (this.pos[k + 6 + a] - this.pos[k + a]) * 0.7;
      const f = Math.pow(1 - r / (this.rows - 1), 1.5) * this.intensity;
      const fb = f * 0.18, fm = f * 1.2, ft = f * 2.0;
      this.col[k] = c.r * fb; this.col[k + 1] = c.g * fb; this.col[k + 2] = c.b * fb;
      this.col[k + 3] = c.r * fm; this.col[k + 4] = c.g * fm; this.col[k + 5] = c.b * fm;
      // the leading edge burns toward white
      this.col[k + 6] = (c.r * 0.6 + 0.6) * ft; this.col[k + 7] = (c.g * 0.6 + 0.55) * ft; this.col[k + 8] = (c.b * 0.6 + 0.6) * ft;
      k += 9;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.color.needsUpdate = true;
    this.mesh.visible = this.intensity > 0.01;
  }
}

// Ground scorch marks left by explosions and slams: blocky soot discs with a dying ember core.
class Scorches {
  constructor(scene, max = 96) {
    this.max = max;
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.age = new Float32Array(max).fill(1);
    this.seed = new Float32Array(max);
    geo.setAttribute('aAge', new THREE.InstancedBufferAttribute(this.age, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(this.seed, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */`
        attribute float aAge; attribute float aSeed;
        varying vec2 vUv; varying float vAge; varying float vSeed;
        void main() {
          vUv = uv; vAge = aAge; vSeed = aSeed;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        varying vec2 vUv; varying float vAge; varying float vSeed;
        float h(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1)) + vSeed * 17.0) * 43758.5); }
        void main() {
          vec2 q = (floor(vUv * 10.0) + 0.5) / 10.0;
          float d = length(q - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.35, d + (h(q) - 0.5) * 0.45);
          if (a <= 0.01 || vAge >= 1.0) discard;
          float fade = 1.0 - vAge * vAge;
          float ember = max(0.0, 1.0 - vAge * 9.0) * smoothstep(0.55, 0.0, d);
          vec3 col = vec3(0.035, 0.03, 0.028) + vec3(2.2, 0.55, 0.08) * ember * (0.6 + 0.4 * h(q + 3.0));
          gl_FragColor = vec4(col, a * fade * 0.82);
        }`,
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, toneMapped: false,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < max; i++) this.mesh.setMatrixAt(i, ZERO);
    this.life = new Float32Array(max);
    this.cursor = 0;
    this.live = 0;
    scene.add(this.mesh);
  }
  add(x, z, r, life = 14) {
    const i = this.cursor++ % this.max;
    _p.set(x, 0.03 + (i % 8) * 0.004, z);
    _q.setFromAxisAngle(_d.set(0, 1, 0), Math.random() * Math.PI * 2);
    _s.set(r * 2, 1, r * 2);
    _m.compose(_p, _q, _s);
    this.mesh.setMatrixAt(i, _m);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.age[i] = 0;
    this.seed[i] = Math.random() * 10;
    this.life[i] = life;
    this.mesh.geometry.attributes.aSeed.needsUpdate = true;
    this.live = this.max;
  }
  update(dt) {
    if (!this.live) return;
    let any = false;
    for (let i = 0; i < this.max; i++) {
      if (this.age[i] >= 1) continue;
      this.age[i] = Math.min(1, this.age[i] + dt / this.life[i]);
      any = true;
    }
    this.mesh.geometry.attributes.aAge.needsUpdate = true;
    if (!any) this.live = 0;
  }
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    const glowMat = new THREE.MeshBasicMaterial({ blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true });
    const solidMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.1 });
    const smokeMat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.78, depthWrite: false });
    this.glow = new CubePool(scene, 2400, glowMat);
    // opaque emissive cubes for fireballs: they bloom but don't stack into white-out
    this.fire = new CubePool(scene, 900, new THREE.MeshBasicMaterial({ toneMapped: false }));
    this.solid = new CubePool(scene, 1400, solidMat, { shadow: true });
    this.smoke = new CubePool(scene, 900, smokeMat);
    this.glow.mesh.renderOrder = 5;
    for (const pool of [this.solid, this.smoke, this.fire]) lensClear(pool.mesh.material, 2);

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
    // ground shockwave discs: a filled energy disc with a hot rim and radial streaks (C6, SP finishers)
    this.discs = [];
    const discGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color() }, uFade: { value: 1 }, uSpin: { value: 0 } },
        vertexShader: /* glsl */`
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */`
          varying vec2 vUv; uniform vec3 uColor; uniform float uFade; uniform float uSpin;
          void main() {
            vec2 q = vUv * 2.0 - 1.0;
            float d = length(q);
            if (d > 1.0) discard;
            float rim = smoothstep(0.8, 0.97, d) * (1.0 - smoothstep(0.97, 1.0, d));
            float body = smoothstep(1.0, 0.7, d) * (0.25 + 0.3 * d);
            float a = atan(q.y, q.x);
            float streak = 0.55 + 0.45 * sin(a * 23.0 + uSpin + d * 9.0);
            float v = (rim * 1.8 + body * streak) * uFade;
            gl_FragColor = vec4(uColor * v, 1.0);
          }`,
        blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(discGeo, mat);
      m.visible = false;
      m.frustumCulled = false;
      m.renderOrder = 4;
      scene.add(m);
      this.discs.push({ m, t: 0, dur: 1, r: 1, active: false });
    }
    // spheres (SP blast domes)
    this.domes = [];
    const domeGeo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(domeGeo, new THREE.MeshBasicMaterial({
        color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false,
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
    this.scorches = new Scorches(scene);
    this.later = []; // delayed secondary blasts
  }

  update(dt) {
    for (let i = this.later.length - 1; i >= 0; i--) {
      const e = this.later[i];
      e.t -= dt;
      if (e.t <= 0) { this.later.splice(i, 1); this.fireball(e.p, e.s); }
    }
    this.glow.update(dt);
    this.fire.update(dt);
    this.solid.update(dt);
    this.smoke.update(dt);
    this.scorches.update(dt);
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
    for (const D of this.discs) {
      if (!D.active) continue;
      D.t += dt;
      const t = D.t / D.dur;
      if (t >= 1) { D.active = false; D.m.visible = false; continue; }
      const rad = D.r * (1 - Math.pow(1 - Math.min(1, t * 1.6), 3));
      D.m.scale.set(rad, 1, rad);
      const u = D.m.material.uniforms;
      u.uFade.value = t < 0.1 ? t / 0.1 : Math.pow(1 - (t - 0.1) / 0.9, 1.6);
      u.uSpin.value += dt * 6;
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

  // Flat expanding ring at height y; tilt [x, z] (radians) stands it up for the swirl around a charging suit.
  ring(pos, r0, r1, color, dur, y = 0.08, tilt = null) {
    const r = this.rings.find((x) => !x.active) || this.rings[0];
    r.active = true;
    r.t = 0;
    r.dur = dur;
    r.r0 = r0;
    r.r1 = r1;
    r.c.set(color);
    r.m.position.set(pos.x, y, pos.z);
    r.m.rotation.set(tilt ? tilt[0] : 0, 0, tilt ? tilt[1] : 0);
    r.m.scale.set(r0, 1, r0);
    r.m.visible = true;
  }

  // Ground shockwave: a filled energy disc racing out to radius r.
  shock(pos, r, color, dur = 0.7) {
    const D = this.discs.find((x) => !x.active) || this.discs.reduce((a, b) => (a.t / a.dur > b.t / b.dur ? a : b));
    D.active = true;
    D.t = 0;
    D.dur = dur;
    D.r = r;
    D.m.material.uniforms.uColor.value.set(color).multiplyScalar(1.6);
    D.m.position.set(pos.x, 0.12, pos.z);
    D.m.scale.set(0.01, 1, 0.01);
    D.m.visible = true;
  }

  // Lightning: n jagged bolts crackling out of pos to about radius r, with a few forks.
  bolts(pos, r, color, n = 8) {
    const c = new THREE.Color(color);
    const seg = (ax, ay, az, bx, by, bz, w, life) => {
      const q = this.glow.spawn();
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const len = Math.hypot(dx, dy, dz) || 1e-3;
      q.x = (ax + bx) / 2; q.y = (ay + by) / 2; q.z = (az + bz) / 2;
      q.vx = q.vy = q.vz = 0;
      q.max = life; q.g = 0; q.drag = 0; q.fadePow = 0.7;
      q.s0 = 1; q.s1 = 1;
      _q.setFromUnitVectors(Zf, _d.set(dx / len, dy / len, dz / len));
      _e.setFromQuaternion(_q);
      q.rx = _e.x; q.ry = _e.y; q.rz = _e.z;
      q.sx = w; q.sy = w; q.sz = len;
      q.c0.setRGB(2.6, 2.4, 2.8); q.c1.copy(c).multiplyScalar(1.4);
    };
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
      const reach = r * rand(0.6, 1.1), steps = 6;
      let x = pos.x, y = pos.y + rand(0.2, 1.2), z = pos.z;
      const life = rand(0.16, 0.3);
      for (let s = 1; s <= steps; s++) {
        const u = s / steps;
        const nx = pos.x + Math.cos(a) * reach * u + rand(-0.6, 0.6);
        const nz = pos.z + Math.sin(a) * reach * u + rand(-0.6, 0.6);
        const ny = Math.max(0.1, pos.y + (1 - u) * rand(0.5, 2.5) + rand(-0.4, 0.4));
        seg(x, y, z, nx, ny, nz, 0.13 * (1 - u * 0.5), life);
        if (s === 3 && Math.random() < 0.6) { // fork
          const fa = a + rand(-0.9, 0.9);
          seg(nx, ny, nz, nx + Math.cos(fa) * reach * 0.3, ny + rand(0, 1.5), nz + Math.sin(fa) * reach * 0.3, 0.08, life * 0.8);
        }
        x = nx; y = ny; z = nz;
      }
    }
    // a couple of bolts straight up out of the blast
    for (let i = 0; i < 3; i++) {
      let x = pos.x + rand(-1, 1), y = pos.y, z = pos.z + rand(-1, 1);
      for (let s = 0; s < 4; s++) {
        const nx = x + rand(-0.7, 0.7), ny = y + rand(1, 2), nz = z + rand(-0.7, 0.7);
        seg(x, y, z, nx, ny, nz, 0.1, rand(0.14, 0.24));
        x = nx; y = ny; z = nz;
      }
    }
  }

  dome(pos, r0, r1, color, dur) {
    const r = this.domes.find((x) => !x.active) || this.domes.reduce((a, b) => (a.t / a.dur > b.t / b.dur ? a : b));
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
    this.star(pos, color, big ? 1.5 : 1);
  }

  // Anime impact star: thin needles that snap open around a small white-hot core.
  star(pos, color = 0xffffff, size = 1) {
    const c = _c.set(color);
    const n = size > 1.2 ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const q = this.glow.spawn();
      q.x = pos.x; q.y = pos.y; q.z = pos.z; q.vx = q.vy = q.vz = 0;
      q.max = rand(0.1, 0.16) * (0.8 + size * 0.2); q.g = 0; q.drag = 0;
      q.s0 = 0.3; q.s1 = rand(1.6, 2.6) * size; q.sPeak = 0.35; q.fadePow = 1.5;
      q.sx = 0.045; q.sy = 1; q.sz = 0.045;
      q.rx = rand(0, Math.PI); q.ry = rand(0, Math.PI); q.rz = rand(0, Math.PI);
      q.c0.setRGB(2.4, 2.3, 2.4); q.c1.copy(c).multiplyScalar(1.6);
    }
    const q = this.glow.spawn();
    q.x = pos.x; q.y = pos.y; q.z = pos.z; q.vx = q.vy = q.vz = 0;
    q.max = 0.08; q.g = 0; q.drag = 0;
    q.s0 = 0.55 * size; q.s1 = 0.2 * size; q.fadePow = 1;
    q.c0.setRGB(2.6, 2.5, 2.6); q.c1.copy(c).multiplyScalar(1.2);
    q.rx = rand(0, 3); q.ry = rand(0, 3); q.rz = rand(0, 3);
  }

  // Beam weapon muzzle flash: a forward spray, a stretched flare along the barrel and a star.
  muzzle(pos, dir, color = 0xff8ad8, size = 1) {
    this.sparks(pos, Math.round(8 * size), color, 16 * size, 0.35, dir);
    const q = this.glow.spawn();
    q.x = pos.x + dir.x * 0.6 * size; q.y = pos.y + dir.y * 0.6 * size; q.z = pos.z + dir.z * 0.6 * size;
    q.vx = dir.x * 0.01; q.vy = dir.y * 0.01; q.vz = dir.z * 0.01;
    q.max = 0.09; q.g = 0; q.drag = 0; q.stretch = 0;
    q.s0 = 0.7 * size; q.s1 = 0.2 * size;
    _q.setFromUnitVectors(Zf, _d.set(dir.x, dir.y, dir.z).normalize());
    _e.setFromQuaternion(_q);
    q.rx = _e.x; q.ry = _e.y; q.rz = _e.z;
    q.sx = 0.6; q.sy = 0.6; q.sz = 3.2;
    q.c0.setRGB(2.6, 2.4, 2.6); q.c1.set(color).multiplyScalar(1.4);
    this.star(pos, color, 0.9 * size);
  }

  scorch(x, z, r, life) {
    this.scorches.add(x, z, r, life);
  }

  // Afterglow left along a beam's path (call every frame with the segment it just travelled).
  streak(a, b, color) {
    const c = _c.set(color);
    for (let i = 0; i < 3; i++) {
      const q = this.glow.spawn();
      const u = Math.random();
      q.x = a.x + (b.x - a.x) * u; q.y = a.y + (b.y - a.y) * u; q.z = a.z + (b.z - a.z) * u;
      q.vx = rand(-0.4, 0.4); q.vy = rand(-0.1, 0.6); q.vz = rand(-0.4, 0.4);
      q.max = rand(0.18, 0.34); q.g = 0; q.drag = 2;
      q.s0 = rand(0.12, 0.22); q.s1 = 0.02;
      q.rx = rand(0, 3); q.ry = rand(0, 3); q.rz = rand(0, 3);
      q.c0.copy(c).multiplyScalar(1.8); q.c1.copy(c).multiplyScalar(0.4);
    }
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
    this.puff(pos, Math.ceil(n * 1.3), 0.66, size * 0.55, 0.9, 3.6);
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
    // burning debris: embers arcing out with streaks
    for (let i = 0; i < Math.round(5 * s); i++) {
      const q = this.glow.spawn();
      q.x = pos.x; q.y = pos.y; q.z = pos.z;
      const a = rand(0, Math.PI * 2), sp = rand(5, 11) * Math.sqrt(s);
      q.vx = Math.cos(a) * sp; q.vz = Math.sin(a) * sp; q.vy = rand(4, 10) * Math.sqrt(s);
      q.max = rand(0.6, 1.1); q.g = 20; q.drag = 0.6; q.floor = 0.05; q.bounce = 0.3;
      q.s0 = rand(0.1, 0.17) * Math.sqrt(s); q.s1 = 0.04; q.stretch = 0.035; q.fadePow = 0.6;
      q.c0.setRGB(2.2, 1.1, 0.3); q.c1.setRGB(1.2, 0.2, 0.03);
    }
    // a lingering column of smoke that drifts up after the fire is gone
    for (let i = 0; i < Math.round(1.5 * s); i++) {
      const q = this.smoke.spawn();
      q.x = pos.x + rand(-0.4, 0.4) * s; q.y = pos.y + rand(0.5, 1.2) * s; q.z = pos.z + rand(-0.4, 0.4) * s;
      q.vx = rand(-0.3, 0.3); q.vy = rand(1.6, 2.6); q.vz = rand(-0.3, 0.3);
      q.max = rand(2.2, 3.2); q.g = 0; q.drag = 0.3;
      q.s0 = rand(0.3, 0.5) * s; q.s1 = rand(0.8, 1.2) * s; q.sPeak = 0.5; q.fadePow = 0;
      const l = rand(0.08, 0.14);
      q.c0.setRGB(l, l * 0.95, l * 0.9); q.c1.setRGB(l * 2.6, l * 2.5, l * 2.4);
      q.rx = rand(0, 3); q.ry = rand(0, 3); q.wy = rand(-0.5, 0.5);
    }
    // secondary pops as fuel and ammo cook off
    const pops = s > 1.2 ? 2 + (Math.random() < 0.5 ? 1 : 0) : 1;
    for (let i = 0; i < pops; i++) {
      this.later.push({ t: rand(0.08, 0.32), s: s * rand(0.35, 0.55), p: new THREE.Vector3(pos.x + rand(-1, 1) * s, pos.y + rand(-0.3, 0.9) * s, pos.z + rand(-1, 1) * s) });
    }
    if (pos.y < 4) this.scorch(pos.x, pos.z, 1.3 * s);
  }

  // Small fire burst (explosion cook-offs).
  fireball(pos, s) {
    for (let i = 0; i < Math.round(6 * s + 2); i++) {
      const q = this.fire.spawn();
      q.x = pos.x + rand(-0.3, 0.3) * s; q.y = pos.y + rand(-0.3, 0.3) * s; q.z = pos.z + rand(-0.3, 0.3) * s;
      const a = rand(0, Math.PI * 2), sp = rand(1, 4) * s;
      q.vx = Math.cos(a) * sp; q.vz = Math.sin(a) * sp; q.vy = rand(0.5, 3) * s;
      q.max = rand(0.25, 0.45); q.g = -1.5; q.drag = 4;
      q.s0 = rand(0.35, 0.6) * s; q.s1 = rand(0.8, 1.2) * s; q.sPeak = 0.3; q.fadePow = 0.4;
      q.c0.setRGB(2.0, 1.4, 0.45); q.c1.setRGB(0.9, 0.16, 0.03);
      q.rx = rand(0, 3); q.ry = rand(0, 3); q.rz = rand(0, 3);
    }
    this.sparks(pos, Math.round(6 * s + 2), 0xffb347, 10);
    const f = this.glow.spawn();
    f.x = pos.x; f.y = pos.y; f.z = pos.z; f.vx = f.vy = f.vz = 0;
    f.max = 0.08; f.g = 0; f.drag = 0; f.s0 = 1.2 * s; f.s1 = 1.8 * s;
    f.c0.setRGB(1.6, 1.1, 0.6); f.c1.setRGB(0.8, 0.3, 0.05);
    f.rx = rand(0, 3); f.ry = rand(0, 3);
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

  // Pixel star: two crossed needles flaring on a weapon (wind-up telegraph).
  glint(pos, color) {
    for (const [sx, sy, sz] of [[0.09, 1.3, 0.09], [1.3, 0.09, 0.09], [0.09, 0.09, 1.3]]) {
      const q = this.glow.spawn();
      q.x = pos.x; q.y = pos.y; q.z = pos.z; q.vx = q.vy = q.vz = 0;
      q.max = 0.26; q.g = 0; q.drag = 0; q.s0 = 1; q.s1 = 0.2;
      q.c0.set(color).multiplyScalar(3); q.c1.set(color).multiplyScalar(1.2);
      q.rx = 0; q.ry = 0; q.rz = 0;
      q.sx = sx; q.sy = sy; q.sz = sz;
    }
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
