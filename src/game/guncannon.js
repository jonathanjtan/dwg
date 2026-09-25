// Kai's RX-77-2 Guncannon: beam rifle in the right hand, fists and feet up close, twin 240mm shoulder cannons for the
// heavy work, and grabs (a hoist-and-throw, the giant swing).
import * as THREE from 'three';
import { voxelMesh } from '../core/voxel.js';
import { RYAW } from '../core/rig.js';
import { guncannonDef, guncannonWeapons } from '../models/suits.js';
import { GC_MOVES, GC_STANCE } from './guncannon_moves.js';
import { Hero, curve } from './hero.js';
import { damp, lerp } from '../core/util.js';
import { Trail } from '../fx/fx.js';

const RIFLE_SHOT = { dmg: 22, kb: 4, up: 1 };
const CANNON_TILT = 1.45; // radians the cannons swing through from upright to level
// 240mm shells: flight speed, fuse, blast radius / damage / throw.
const SHELL = { speed: 70, fuse: 0.5, r: 3.2, dmg: 44, kb: 8, up: 6, big: true, sound: 'cboom' };
const HEAVY_SHELL = { speed: 80, fuse: 0.6, r: 3.9, dmg: 62, kb: 12, up: 9, big: true, smoke: 0.7, sound: 'cboom' };
const RADIAL_SHELL = { speed: 46, fuse: 0.22, r: 3.0, dmg: 22, kb: 7, up: 5, big: false, sp: true, lite: true, smoke: 0.5, sound: 'cboom' };
const TRAIL_COLOR = 0xcfe4ff;

export const GUNCANNON = {
  id: 'guncannon', pilot: 'kai', def: guncannonDef, moves: GC_MOVES, stance: GC_STANCE,
  hp: 1010, run: 8.4, boostSpeed: 20.5, boostTime: 1.55, defense: 0.86,
  nozzles: [[-0.25, 0.1, -0.86], [0.25, 0.1, -0.86]],
  debris: [0xc8342a, 0x3f8f8c, 0x565c69], spAirY: 2.8, spAirReach: 5, stepVol: 1.15, stepPitch: 0.9,
  impactColor: 0xff9a40, ringColor: 0xffd2a0, impactLight: 0xffa050, domeColor: 0xff8a40,
  spColor: 0xffa040, spDome: 0xffc070, spAura: 0x7fe8ff,
  hitColor: 0xffd49a, hitSfx: 'phit', hitSfxHeavy: 'phit_heavy',
  airPose: { uArmR: [-0.3, 0, -0.5], fArmR: [-0.6, 0, 0], hand: [1.1, 0, 0], uArmL: [-0.6, 0, 0.5], fArmL: [-1.4, 0, 0] },
  boostPose: { uArmR: [0.5, 0, -0.4], fArmR: [-0.4, 0, 0], hand: [1.0, 0, 0], uArmL: [0.2, 0, 0.5], fArmL: [-1.4, 0, 0] },
};

export class Guncannon extends Hero {
  constructor(game) {
    super(game, GUNCANNON);
  }

  buildWeapons() {
    const w = guncannonWeapons();
    this.rifle = voxelMesh(w.rifle, { scale: 0.1 });
    this.rifle.position.set(0, -0.05, 0.05);
    this.rig.nodes.hand.add(this.rifle);
    this.cannonAim = 0;
    this.cannonWant = 0;
    this.side = 0; // barrel that fires next
    this.held = null; // grabbed soldier
    this.aaTarget = null; // whatever was thrown or launched, for the cannons to follow up on
    this.radialIdx = 0;
    // motion trails: the left fist, the rifle fist, each foot
    this.trails = {};
    for (const key of ['L', 'R', 'FL', 'FR']) {
      const tr = new Trail(this.scene, TRAIL_COLOR, 12);
      this.scene.remove(tr.mesh);
      this.own(tr.mesh);
      this.trails[key] = tr;
    }
    this.trailOn = {};
    // SP flurry afterimages: ghost fists flickering in front of the suit
    this.ghosts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.42, 0.55), new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.6, 2.2, 2.6), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }), 10);
    this.ghosts.frustumCulled = false;
    this.ghosts.count = 0;
    this.own(this.ghosts);
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._m = new THREE.Matrix4();
    this._s = new THREE.Vector3();
    this._e = new THREE.Euler();
    this._qq = new THREE.Quaternion();
  }

  // ---------- move hooks ----------
  onMoveStart() {
    this.dropHeld();
    this.aaTarget = null;
  }

  onMoveEnd() {
    this.dropHeld();
  }

  onInterrupt() {
    this.dropHeld();
  }

  onMoveTick(m, t, prevT) {
    this.cannonWant = m.can ? curve(m.can, t) : 0;
    this.trailOn = {};
    if (m.tr) for (const [t0, t1, key] of m.tr) if (t >= t0 && t <= t1) this.trailOn[key] = true;
    if (this.held) this.carryHeld(m, t);
    if (m.barrage && t >= m.barrage[0] && t <= m.barrage[1]) {
      const step = m.barrage[2];
      const n = Math.floor((t - m.barrage[0]) / step) - Math.floor(Math.max(0, prevT - m.barrage[0]) / step);
      for (let i = 0; i < Math.min(3, n); i++) this.fireRadial();
      if (prevT <= m.barrage[0]) this.fireRadial();
    }
  }

  // ---------- grabs ----------
  // Take hold of the nearest soldier in front. Officers are too heavy to lift: they take the blow instead.
  grab() {
    const g = this.game;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    let best = null, bd = 5.4;
    for (const e of g.crowd.grid.query(this.pos.x + fx * 2, this.pos.z + fz * 2, 4.5, g.combat.tmp)) {
      if (!e.alive || e.state === 'dying' || e.state === 'drop' || e.state === 'held' || e.y > 3) continue;
      const dx = e.x - this.pos.x, dz = e.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > bd || (dx * fx + dz * fz) / (d || 1) < 0.2) continue;
      best = e;
      bd = d;
    }
    const hand = this.handPoint(this._v);
    if (best) {
      g.crowd.hold(best, this);
      this.held = best;
      g.combat.registerHits(1, { stop: 3 }, this);
      g.fx.sparks(this._w.set(best.x, 2, best.z), 10, 0xffd49a, 9);
      g.audio.play('grab', { vol: 0.9 });
      return;
    }
    for (const c of g.commanders.list) {
      if (!c.alive || c.state === 'drop') continue;
      const dx = c.pos.x - this.pos.x, dz = c.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > 5 || (dx * fx + dz * fz) / (d || 1) < 0.2) continue;
      if (c.damage(38 * g.difficulty.dmgDealt, 3, 6, this.pos.x, this.pos.z, ++this.hitSerial)) {
        g.combat.registerHits(1, { big: true }, this);
        g.fx.hit(this._w.set(c.pos.x, c.pos.y + 2, c.pos.z), 0xffd49a, true);
        g.audio.play('phit_heavy');
        this.aaTarget = c;
      }
      return;
    }
    g.audio.play('grab', { vol: 0.5, pitch: 1.2 });
    g.fx.puff(hand, 3, 0.7, 0.6, 0.5, 1.5);
  }

  // Keep the grabbed soldier in the hands: hoisted overhead, or at arm's length while spinning.
  carryHeld(m, t) {
    const e = this.held, g = this.game;
    if (!e.alive || e.state !== 'held') { this.held = null; return; }
    if (m.hold === 'lift') {
      const u = Math.min(1, Math.max(0, (t - m.holdT[0]) / 0.4));
      const s = u * u * (3 - 2 * u);
      const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
      const d = lerp(2.2, 0.3, s);
      g.crowd.place(e, this.pos.x + fx * d, this.pos.y + lerp(0.8, 4.3, s), this.pos.z + fz * d, this.heading + Math.PI / 2, -Math.PI / 2 * s);
    } else if (m.hold === 'swing') {
      const yaw = this.heading + this.pose[RYAW];
      const u = Math.min(1, Math.max(0, (t - m.holdT[0]) / 0.25));
      const r = lerp(2, 3.4, u);
      g.crowd.place(e, this.pos.x + Math.sin(yaw) * r, this.pos.y + lerp(0.6, 1.5, u), this.pos.z + Math.cos(yaw) * r, yaw + Math.PI, -Math.PI / 2 * u);
    }
  }

  throwHeld(how) {
    const e = this.held, g = this.game;
    this.held = null;
    if (!e || !e.alive || e.state !== 'held') return;
    const mul = g.difficulty.dmgDealt;
    if (how === 'up') {
      // straight up into the sky, for the cannons to meet on the way down
      g.crowd.fling(e, Math.sin(this.heading) * 1.5, 17, Math.cos(this.heading) * 1.5, 26 * mul);
      this.aaTarget = e;
    } else {
      const yaw = this.heading + this.pose[RYAW];
      g.crowd.fling(e, Math.sin(yaw) * 24, 10, Math.cos(yaw) * 24, 70 * mul, true);
      // the body scythes through whoever stands in its way
      g.combat.heroStrike(this, { shape: 'line', len: 9, width: 3.2, dmg: 30, kb: 12, up: 7, big: true }, ++this.hitSerial);
      if (g.local === this) g.camera.shake(0.4);
    }
    g.combat.registerHits(1, { big: true }, this);
  }

  dropHeld() {
    if (!this.held) return;
    const e = this.held;
    this.held = null;
    if (e.alive && e.state === 'held') this.game.crowd.fling(e, 0, 2, 0, 0);
  }

  // A launched enemy still in the air in front (for the anti-air cannon shots).
  airborneAhead() {
    const g = this.game;
    const t = this.aaTarget;
    if (t && (t.alive ?? true) && (t.y ?? t.pos?.y ?? 0) > 0.8 && (t.state === 'air' || t.pos)) return t;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    let best = null, bd = 10;
    for (const e of g.crowd.grid.query(this.pos.x + fx * 3, this.pos.z + fz * 3, 7, g.combat.tmp)) {
      if (!e.alive || e.state !== 'air' || e.y < 1) continue;
      const d = Math.hypot(e.x - this.pos.x, e.z - this.pos.z);
      if (d < bd) { bd = d; best = e; }
    }
    for (const c of g.commanders.list) {
      if (!c.alive || c.pos.y < 1) continue;
      const d = Math.hypot(c.pos.x - this.pos.x, c.pos.z - this.pos.z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  // ---------- events ----------
  suitEvent(name, arg) {
    const g = this.game;
    const P0 = this.pos;
    switch (name) {
      case 'grab': this.grab(); break;
      case 'throw': this.throwHeld(arg); break;
      case 'whirl': { // giant swing: wind rings sweep the ground around the suit
        g.fx.ring(P0, 1.5, 6.4, 0xe8f0ff, 0.45, 0.25, [0.06, 0]);
        g.fx.ring(P0, 1, 5.2, 0xffffff, 0.35, 0.6, [-0.05, 0.04]);
        g.fx.dust(this._v.set(P0.x, 0.1, P0.z), 8, 1.6);
        break;
      }
      case 'finpunch': { // SP finisher: the last punch lands with a blinding flash
        this.rig.root.updateMatrixWorld(true);
        const fist = this.handPoint(this._v);
        g.fx.star(fist, 0xffffff, 3.4);
        g.fx.star(fist, 0x9ff4ff, 2.4);
        g.fx.sparks(fist, 24, 0xcff4ff, 22);
        g.fx.light(fist, 0xbff0ff, 180, 22, 0.4);
        g.fx.ring(fist, 0.4, 5, 0xcff4ff, 0.35, fist.y, [1.4, 0]);
        g.audio.play('phit_heavy');
        g.slowmo(0.3, 0.35);
        if (g.local === this) { g.camera.shake(0.8); g.aberr(1.1); }
        break;
      }
      case 'finale': { // charge SP finisher: a ring of blasts all around the suit
        for (let i = 0; i < 6; i++) {
          const a = this.heading + (i / 6) * Math.PI * 2;
          g.projectiles.heroBlast(this, this._w.set(P0.x + Math.sin(a) * 6.5, 1.4, P0.z + Math.cos(a) * 6.5), 4.2, 60, 12, 10, { sp: true, sound: 'cboom' });
        }
        g.fx.shock(this._w.set(P0.x, 0.2, P0.z), 11, 0xffa050, 0.7);
        g.audio.play('bigboom');
        g.slowmo(0.3, 0.4);
        if (g.local === this) { g.camera.shake(1.0); g.aberr(1.1); }
        break;
      }
    }
  }

  // ---------- guns ----------
  // Left fist (for trails and effects).
  handPoint(out) {
    return this.rig.nodes.fArmL.localToWorld(out.set(0, -0.72, 0));
  }

  // side: 0 right cannon, 1 left; 'rifle' for the beam rifle.
  muzzle(out, side) {
    if (side === 'rifle' || side === undefined) return this.rifle.localToWorld(out.set(0, 0.05, 1.5));
    return this.rig.nodes.cannons.localToWorld(out.set(side ? 0.4 : -0.4, 1.42, -0.05));
  }

  cannonDir(out) {
    return out.set(0, 1, 0).applyQuaternion(this.rig.nodes.cannons.getWorldQuaternion(this._qq)).normalize();
  }

  // One cannon's report: muzzle flash along the barrel, smoke, the sound, a kick through the suit.
  report(side, big = false) {
    const g = this.game;
    const from = this.muzzle(this._a, side);
    const dir = this.cannonDir(this._b);
    g.fx.muzzle(from, dir, 0xffb060, big ? 1.8 : 1.3);
    g.fx.puff(from, big ? 6 : 3, 0.85, big ? 1 : 0.7, 0.8, 2);
    g.audio.play('cannon', { vol: big ? 1 : 0.85 });
    if (g.local === this) { g.camera.shake(big ? 0.35 : 0.18); g.camera.kick(big ? 4 : 2.5); }
    return from;
  }

  nextSide(shot) {
    if (shot.side !== undefined) return shot.side;
    this.side ^= 1;
    return this.side;
  }

  fire(shot) {
    const g = this.game;
    this.rig.root.updateMatrixWorld(true);
    if (shot.kind === 'rifle') {
      let aim = this.heading;
      const tgt = this.aimAt(aim, 34, 0.35);
      if (tgt) aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
      const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
      const from = this.muzzle(new THREE.Vector3(), 'rifle');
      g.projectiles.heroBeam(from, dir, RIFLE_SHOT);
      g.fx.muzzle(from, dir, 0xff8ad8, 1);
      g.audio.play('rifle');
      g.camera.shake(0.1);
      g.camera.kick(2);
      this.vel.x -= dir.x * 3;
      this.vel.z -= dir.z * 3;
      return;
    }
    const side = this.nextSide(shot);
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    if (shot.kind === 'pb') {
      // point-blank: the shell bursts on the target a stride in front
      this.report(side, shot.last);
      const tgt = this.aimAt(this.heading, 6, 0.6);
      const d = tgt ? Math.min(4, Math.max(2.4, Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z))) : 3.2;
      g.projectiles.heroBlast(this, this._w.set(this.pos.x + fx * d, this.pos.y + 2, this.pos.z + fz * d), shot.last ? 3.8 : 3.2, shot.last ? 56 : 34, shot.last ? 14 : 5, shot.last ? 8 : 2, { big: !!shot.last, sound: 'cboom' });
      this.vel.x -= fx * (shot.last ? 7 : 4);
      this.vel.z -= fz * (shot.last ? 7 : 4);
      return;
    }
    if (shot.kind === 'juggle') {
      // quick shells that meet the target and lift it a little higher each time; the recoil kicks up the ground
      this.report(side);
      const tgt = this.aimAt(this.heading, 9, 0.5);
      const tx = tgt ? tgt.x : this.pos.x + fx * 4, tz = tgt ? tgt.z : this.pos.z + fz * 4;
      const ty = tgt ? Math.max(1.6, (tgt.y ?? tgt.pos?.y ?? 0) + 1.6) : 2.2;
      g.projectiles.heroBlast(this, this._w.set(tx, ty, tz), shot.last ? 3.4 : 2.4, shot.last ? 34 : 15, shot.last ? 7 : 1, shot.last ? 12 : 5.5, { lite: !shot.last, big: !!shot.last, sound: 'cboom' });
      g.fx.puff(this._v.set(this.pos.x - fx * 0.8, 0.3, this.pos.z - fz * 0.8), 3, 0.6, 1, 0.6, 3);
      g.fx.dust(this._v, 4, 1);
      return;
    }
    if (shot.kind === 'aa') {
      // anti-air: both cannons fire straight up into whatever was just thrown or launched
      this.report(side, true);
      const tgt = this.airborneAhead();
      const p = tgt ? this._w.set(tgt.x ?? tgt.pos.x, (tgt.y ?? tgt.pos.y) + 1.4, tgt.z ?? tgt.pos.z) : this._w.set(this.pos.x + fx * 1.5, 7, this.pos.z + fz * 1.5);
      const from = this.muzzle(this._a, side);
      g.fx.streak(from, p, 0xfff0d0);
      g.projectiles.heroBlast(this, p, 3.8, 50, 12, 6, { sound: 'cboom' });
      return;
    }
    // 'cannon' / 'heavy': a 240mm shell with a smoke trail
    const from = this.report(side, shot.kind === 'heavy').clone();
    const o = shot.kind === 'heavy' ? HEAVY_SHELL : SHELL;
    let aim = this.heading;
    const tgt = this.aimAt(aim, shot.dn ? 22 : 36, 0.4);
    if (tgt) aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
    const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
    if (shot.dn) {
      const tx = tgt ? tgt.x : this.pos.x + dir.x * 7, tz = tgt ? tgt.z : this.pos.z + dir.z * 7;
      dir.set(tx - from.x, (tgt ? (tgt.y ?? tgt.pos?.y ?? 0) + 1.2 : 0) - from.y, tz - from.z).normalize();
    } else {
      const ty = tgt ? (tgt.y ?? tgt.pos?.y ?? 0) + 1.8 : from.y - 0.4;
      const d = tgt ? Math.max(3, Math.hypot(tgt.x - from.x, tgt.z - from.z)) : 20;
      dir.y = (ty - from.y) / d;
      dir.normalize();
    }
    g.projectiles.shell(this, from, dir, o);
    if (!shot.dn) {
      this.vel.x -= fx * (o === HEAVY_SHELL ? 6 : 4);
      this.vel.z -= fz * (o === HEAVY_SHELL ? 6 : 4);
    }
  }

  // Charge SP: a pair of shells out along the next arms of an eight-pointed star.
  fireRadial() {
    const g = this.game;
    this.rig.root.updateMatrixWorld(true);
    const base = this.heading + this.pose[RYAW];
    for (let k = 0; k < 2; k++) {
      const a = base + ((this.radialIdx + k * 4) % 8) * (Math.PI / 4) + 0.2;
      const from = this.muzzle(this._a, k).clone();
      const dir = new THREE.Vector3(Math.sin(a), -0.04, Math.cos(a));
      g.projectiles.shell(this, from, dir, RADIAL_SHELL);
      g.fx.muzzle(from, dir, 0xffb060, 1);
    }
    this.radialIdx = (this.radialIdx + 1) % 8;
    g.audio.play('cannon', { vol: 0.55, pitch: 1.1 });
  }

  // ---------- visuals ----------
  preVisuals(dt, inMove) {
    if (!inMove) { this.cannonWant = 0; this.trailOn = {}; }
    this.cannonAim = damp(this.cannonAim, this.cannonWant, 12, dt);
    this.rig.nodes.cannons.rotation.x = this.cannonAim * CANNON_TILT;
  }

  postVisuals(dt, inMove) {
    const n = this.rig.nodes;
    // left fist, rifle fist, feet: a ribbon from mid-limb to just past the end
    this.pushTrail('L', n.fArmL, 0.35, 0.9);
    this.pushTrail('R', n.fArmR, 0.35, 0.9);
    this.pushTrail('FL', n.shinL, 0.3, 0.95);
    this.pushTrail('FR', n.shinR, 0.3, 0.95);
    // flurry afterimages
    const blur = inMove && this.move?.blur;
    this.ghosts.count = blur ? 8 : 0;
    if (blur) {
      const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
      for (let i = 0; i < 8; i++) {
        const f = 1.2 + Math.random() * 1.6, s = (Math.random() - 0.5) * 2.2, h = 1.8 + Math.random() * 1.2;
        this._s.setScalar(0.7 + Math.random() * 0.6);
        this._e.set(Math.random() * 0.4, this.heading + (Math.random() - 0.5) * 0.5, 0);
        this._m.compose(this._v.set(this.pos.x + fx * f + fz * s, this.pos.y + h, this.pos.z + fz * f - fx * s), this._qq.setFromEuler(this._e), this._s);
        this.ghosts.setMatrixAt(i, this._m);
      }
      this.ghosts.instanceMatrix.needsUpdate = true;
    }
    this.tipSpeed = 0;
  }

  pushTrail(key, node, a, b) {
    node.localToWorld(this._a.set(0, -a, 0));
    node.localToWorld(this._b.set(0, -b, 0.05));
    this.trails[key].push(this._a, this._b, !!this.trailOn[key]);
  }

  // ---------- co-op ----------
  netExtras() {
    let tr = 0;
    ['L', 'R', 'FL', 'FR'].forEach((key, i) => { if (this.trailOn[key]) tr |= 1 << i; });
    const inMove = this.state === 'attack' || this.state === 'musou';
    return { ca: this.cannonAim, tr, bl: inMove && !!this.move?.blur };
  }

  applyNetExtras(s, dt) {
    this.cannonAim = s.ca || 0;
    this.rig.nodes.cannons.rotation.x = this.cannonAim * CANNON_TILT;
    this.trailOn = {};
    ['L', 'R', 'FL', 'FR'].forEach((key, i) => { if (s.tr & (1 << i)) this.trailOn[key] = true; });
    this.rig.root.updateMatrixWorld(true);
    this.move = s.bl ? { blur: true } : null;
    this.postVisuals(dt, !!s.bl);
  }
}
