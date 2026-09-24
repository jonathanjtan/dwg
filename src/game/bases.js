// Zeon landing zones: supply pods that anchor a garrison and keep dropping reinforcements
// until their squad leader falls (Dynasty Warriors "fields").
import * as THREE from 'three';
import { VoxelModel, Palette, voxelMesh } from '../core/voxel.js';
import { rand, damp } from '../core/util.js';

// Open park lots around the plaza (see world.js layout).
export const LZ_SITES = [
  { name: 'ALPHA', x: 52, z: 52 },
  { name: 'BRAVO', x: 0, z: -52 },
  { name: 'CHARLIE', x: -52, z: 52 },
];

const RING_R = 9;
const ZEON = new THREE.Color(3.0, 0.35, 0.3);
const FED = new THREE.Color(0.5, 1.6, 3.0);

const pal = new Palette();
function podModel() {
  const m = new VoxelModel(pal);
  const hull = 0x3d4a36, dark = 0x2a3027, rust = 0x7a5a3a;
  m.ellipsoid(0, 6, 0, 8, 6.5, 8, hull);
  m.clearBox(-9, -8, -9, 9, 0, 9);
  m.box(-9, 0, -9, 8, 1, 8, dark);
  m.box(-6, 12, -6, 5, 12, 5, dark);
  for (const [x, z] of [[-8, -8], [7, -8], [-8, 7], [7, 7]]) m.box(x, -3, z, x, 0, z, 0x4b5049); // landing struts
  for (let a = 0; a < 8; a++) {
    const x = Math.round(Math.sin((a / 8) * Math.PI * 2) * 8), z = Math.round(Math.cos((a / 8) * Math.PI * 2) * 8);
    m.box(x - (x > 0 ? 1 : 0), 3, z - (z > 0 ? 1 : 0), x - (x > 0 ? 1 : 0), 5, z - (z > 0 ? 1 : 0), rust);
  }
  // mono-eye style lamp slits
  for (const s of [-1, 1]) {
    m.box(-2, 6, s * 8, 1, 6, s * 8, 0xff2f4e, { glow: 2.6, jitter: 0 });
    m.box(s * 8, 6, -2, s * 8, 6, 1, 0xff2f4e, { glow: 2.6, jitter: 0 });
  }
  return m;
}
function mastModel() {
  const m = new VoxelModel(pal);
  m.box(-1, 0, -1, 0, 44, 0, 0x5a5f58);
  for (let y = 8; y <= 40; y += 8) m.box(-3, y, -1, 2, y, 0, 0x6f756c);
  m.box(-4, 40, -1, 3, 41, 0, 0x4b5049);
  return m;
}

export class LandingZones {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.podTpl = voxelMesh(podModel(), { scale: 0.25 });
    this.mastTpl = voxelMesh(mastModel(), { scale: 0.25 });
    this.ringGeo = new THREE.RingGeometry(RING_R - 0.45, RING_R, 72).rotateX(-Math.PI / 2);
    this.innerGeo = new THREE.RingGeometry(RING_R * 0.62 - 0.2, RING_R * 0.62, 72).rotateX(-Math.PI / 2);
    this.lampGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    this._v = new THREE.Vector3();
  }

  get active() {
    return this.list.filter((l) => !l.captured);
  }

  clear() {
    for (const l of this.list) this.game.scene.remove(l.root);
    this.list.length = 0;
  }

  add(site, delay = 0, drop = true) {
    const root = new THREE.Group();
    root.position.set(site.x, 0, site.z);
    const pod = this.podTpl.clone();
    const mast = this.mastTpl.clone();
    mast.position.set(0, 3, 0);
    const lamp = new THREE.Mesh(this.lampGeo, new THREE.MeshBasicMaterial({ color: ZEON.clone(), toneMapped: false }));
    lamp.position.set(0, 44 * 0.25 + 0.3, 0);
    mast.add(lamp);
    pod.add(mast);
    const mat = () => new THREE.MeshBasicMaterial({ color: ZEON.clone(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const ring = new THREE.Mesh(this.ringGeo, mat());
    const inner = new THREE.Mesh(this.innerGeo, mat());
    ring.position.y = inner.position.y = 0.07;
    root.add(pod, ring, inner);
    this.game.scene.add(root);
    const lz = {
      name: site.name, site, x: site.x, z: site.z, root, pod, mast, lamp, ring, inner, focus: new THREE.Vector3(site.x, 60, site.z),
      captured: false, landing: drop, delay, y: drop ? 60 : 0, vy: 0, t: 0, fallT: 0, reinforceT: 6,
    };
    pod.position.y = lz.y;
    ring.visible = inner.visible = !drop;
    this.list.push(lz);
    return lz;
  }

  capture(lz) {
    const g = this.game;
    if (lz.captured) return;
    lz.captured = true;
    lz.fallT = 0.001;
    const p = this._v.set(lz.x, 2.5, lz.z);
    g.fx.explode(p, 2.6, [0x3d4a36, 0x7a5a3a, 0x2a3027]);
    g.fx.explode(this._v.set(lz.x + 1.5, 4, lz.z - 1), 1.6, [0x3d4a36, 0x5a5f58]);
    g.fx.ring(this._v.set(lz.x, 0.2, lz.z), 1, RING_R * 1.4, 0x5fd0ff, 0.7);
    g.fx.light(this._v.set(lz.x, 3, lz.z), 0xff9040, 160, 30, 0.6);
    g.audio.play('bigboom', { at: p });
    for (const m of [lz.ring, lz.inner]) m.material.color.copy(FED);
    lz.lamp.material.color.setRGB(0.1, 0.1, 0.1);
  }

  // Pods fall from the colony sky, then idle with a blinking beacon and a breathing ring.
  update(dt, onLanded) {
    const g = this.game;
    for (const lz of this.list) {
      lz.t += dt;
      if (lz.landing) {
        if (lz.t < lz.delay) continue;
        lz.vy = Math.min(lz.vy + 60 * dt, 38);
        lz.y = Math.max(0, lz.y - lz.vy * dt);
        lz.pod.position.y = lz.y;
        lz.focus.y = lz.y;
        if (Math.random() < 0.8) g.fx.thruster(this._v.set(lz.x + rand(-1, 1), lz.y + 0.5, lz.z + rand(-1, 1)), { x: 0, y: -1, z: 0 }, 0xffb070, 2.2);
        if (lz.y <= 0) {
          lz.landing = false;
          lz.ring.visible = lz.inner.visible = true;
          const p = this._v.set(lz.x, 0.2, lz.z);
          g.fx.ring(p, 1, RING_R * 1.3, 0xff8a50, 0.6);
          g.fx.dust(p, 30, 2.2);
          g.fx.debris(p, 16, [0x8a867c, 0x6f6c64], 10, 0.25);
          g.audio.play('slam', { at: p });
          const d = Math.hypot(g.local.pos.x - lz.x, g.local.pos.z - lz.z);
          if (d < 60) g.camera.shake(0.5 * (1 - d / 60));
          onLanded?.(lz);
        }
        continue;
      }
      this.animate(lz, dt);
    }
  }

  animate(lz, dt) {
    const blink = !lz.captured && (lz.t * 1.6) % 1 < 0.5;
    if (!lz.captured) lz.lamp.material.color.copy(ZEON).multiplyScalar(blink ? 1 : 0.15);
    const pulse = 0.5 + 0.5 * Math.sin(lz.t * (lz.captured ? 1.2 : 3));
    lz.ring.material.opacity = lz.captured ? 0.18 + pulse * 0.1 : 0.4 + pulse * 0.35;
    lz.inner.material.opacity = lz.captured ? 0.08 : 0.15 + (1 - pulse) * 0.25;
    lz.inner.rotation.y += dt * 0.3;
    if (lz.fallT > 0 && lz.fallT < 1) {
      // the beacon mast topples once the zone is taken
      lz.fallT = Math.min(1, lz.fallT + dt * 0.9);
      lz.mast.rotation.z = -Math.pow(lz.fallT, 2.2) * 1.45;
      if (lz.fallT >= 1) {
        const tip = this._v.set(lz.x + 11, 0.4, lz.z);
        this.game.fx.dust(tip, 14, 1.4);
        this.game.audio.play('land', { at: tip });
      }
    }
  }

  // Guest: mirror the host's landing zones ([siteIndex, captured, podY]).
  applyNet(arr) {
    for (const [si, cap, y] of arr) {
      const site = LZ_SITES[si];
      let lz = this.list.find((l) => l.site === site);
      if (!lz) { lz = this.add(site, 0, false); }
      lz.y = y;
      lz.pod.position.y = y;
      lz.ring.visible = lz.inner.visible = y <= 0;
      if (cap && !lz.captured) {
        lz.captured = true;
        lz.fallT = 0.001;
        for (const m of [lz.ring, lz.inner]) m.material.color.copy(FED);
        lz.lamp.material.color.setRGB(0.1, 0.1, 0.1);
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (!arr.some(([si]) => LZ_SITES[si] === this.list[i].site)) { this.game.scene.remove(this.list[i].root); this.list.splice(i, 1); }
    }
  }

  netState() {
    return this.list.map((l) => [LZ_SITES.indexOf(l.site), l.captured ? 1 : 0, Math.round(l.y * 10) / 10]);
  }

  guestAnimate(dt) {
    for (const lz of this.list) {
      lz.t += dt;
      if (lz.y > 0) continue;
      this.animate(lz, dt);
    }
  }
}
