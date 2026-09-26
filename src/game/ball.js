// The RB-79 Ball: a Federation space pod pressed into service. It floats on its thrusters instead of walking, fights
// by tumbling into the enemy claws first, and does everything heavy with its 180mm recoilless cannon (the head node,
// a turret the moves aim). The charge SP calls in the rest of the squadron.
import * as THREE from 'three';
import { RigObject, RY, RPITCH, P } from '../core/rig.js';
import { ballDef } from '../models/suits.js';
import { BALL_MOVES, BALL_STANCE } from './ball_moves.js';
import { Hero } from './hero.js';
import { clamp, damp, lerp, angleDamp, rand } from '../core/util.js';
import { Trail } from '../fx/fx.js';

const HOVER = 0.32; // how far the pod floats off the ground; move clips pose `y` relative to it
const MUZZLE = 1.55; // cannon muzzle, up the barrel from the turret's pivot
// 180mm shells: flight speed, fuse, blast radius / damage / throw.
const SHELL = { speed: 68, fuse: 0.55, r: 2.8, dmg: 30, kb: 6, up: 4, big: false, smoke: 0.55, sound: 'cboom' };
const HEAVY_SHELL = { speed: 78, fuse: 0.7, r: 4.3, dmg: 74, kb: 12, up: 9, big: true, smoke: 0.8, sound: 'cboom' };
const SP_SHELL = { speed: 64, fuse: 0.6, r: 2.8, dmg: 22, kb: 6, up: 5, big: false, sp: true, lite: true, smoke: 0.5, sound: 'cboom' };
const TRAIL_COLOR = 0x5c6e8a; // dim, so the ribbon stays a bright leading edge instead of blooming into a sheet
const TRAIL_REACH = 1.75; // claw trails run from the claw out to this multiple of its distance from the pod's centre
// The squadron the charge SP calls in: [to the leader's right, ahead] per wingman, landing in turn.
const WINGS = [[-4.2, -1.2], [4.2, -1.2], [-7.6, -4.6], [7.6, -4.6]];
const WING_IN = 0.7; // seconds for a wingman to drop in from the colony sky

// Deliberately weaker than a real mobile suit: thin armor, a slow drift and blows that land lighter. Only its
// thrusters (Reborn's spec sheet: thruster 904, mobility 240) are up with the Gundam's.
export const BALL = {
  id: 'ball', pilot: 'ball', def: ballDef, moves: BALL_MOVES, stance: BALL_STANCE, hover: true,
  hp: 960, run: 6.6, boostSpeed: 22, boostTime: 1.8, sprintSpeed: 16.5, defense: 1.06, power: 0.8,
  nozzles: [[-0.3, -0.4, -0.86], [0.3, -0.4, -0.86]], flameScale: 0.7,
  debris: [0xdadee4, 0xc4602a, 0x5a616d], spAirY: 2.2, spAirReach: 3.5,
  impactColor: 0x9fdcff, ringColor: 0xdcefff, impactLight: 0x9fd8ff, domeColor: 0x7fc8ff,
  spColor: 0x7fe8ff, spDome: 0xa0f0ff, spAura: 0x7fffc8,
  hitColor: 0xd8ecff, hitSfx: 'clawhit', hitSfxHeavy: 'clawhit_heavy',
  airPose: { torso: [0.1, 0, 0], head: [0.2, 0, 0], uArmR: [-0.2, 0, -1.6], fArmR: [-1.2, 0, 0], uArmL: [-0.2, 0, 1.6], fArmL: [-1.2, 0, 0] },
  boostPose: { torso: [0.5, 0, 0], head: [-0.2, 0, 0], y: 0, uArmR: [0.8, 0, -1.1], fArmR: [-0.4, 0, 0], hand: [0.3, 0, 0], uArmL: [0.8, 0, 1.1], fArmL: [-0.4, 0, 0] },
};

export class Ball extends Hero {
  constructor(game) {
    super(game, BALL);
  }

  buildWeapons() {
    // claw trails: big white crescents swept out past each claw, as in the game
    this.trails = {};
    for (const key of ['L', 'R']) {
      const tr = new Trail(this.scene, TRAIL_COLOR, 14);
      this.scene.remove(tr.mesh);
      this.own(tr.mesh);
      this.trails[key] = tr;
    }
    this.trailOn = {};
    // SP flurry afterimages: ghost arms flailing all round the pod
    this.ghosts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 1.5), new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.6, 1.5, 0.7), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }), 12);
    this.ghosts.frustumCulled = false;
    this.ghosts.count = 0;
    this.own(this.ghosts);
    // the squadron: rigs sharing the Ball's model, placed from this.wing (see placeWingmen)
    this.wing = null;
    this.wingmen = WINGS.map(() => {
      const rig = new RigObject(this.suit._def);
      rig.root.visible = false;
      this.own(rig.root);
      return { rig, pose: Float32Array.from(BALL_STANCE), yaw: 0, kick: 0 };
    });
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._c = new THREE.Vector3();
    this._m = new THREE.Matrix4();
    this._s = new THREE.Vector3();
    this._qq = new THREE.Quaternion();
    this._z = new THREE.Vector3(0, 0, 1);
  }

  reset() {
    super.reset();
    this.wing = null;
  }

  // ---------- movement ----------
  // No legs: the pod drifts on its thrusters, tipping into the direction of travel and trailing its arms.
  locomotion(dt, sp, a = 0) {
    const w = clamp(sp / this.run, 0, 1);
    const ca = Math.cos(a), sa = Math.sin(a);
    const tm = this.game.time;
    const t = this.target;
    t.set(this.stance);
    const i = P.torso * 3;
    t[i] += 0.32 * w * ca;
    t[i + 1] += Math.sin(tm * 1.3) * 0.05 * (1 - w); // idling, it turns a little this way and that
    t[i + 2] += 0.3 * w * sa;
    t[P.uArmR * 3] += 0.55 * w;
    t[P.uArmL * 3] += 0.55 * w;
    if (w > 0.15) this.thrust(0.35 + 0.55 * w, false);
    this.blendPose(dt);
  }

  // Every pose floats: the hover and a slow bob go on top of whatever the state or move asked for. Knocked down,
  // the pod tips over on its back on the ground.
  carryPose(t) {
    const down = this.state === 'down' || this.state === 'dead';
    t[RY] += down ? HOVER * (1 - this.lie) : HOVER + Math.sin(this.game.time * 2.4) * 0.05;
    if (down) t[RPITCH] *= 0.75;
  }

  preUpdate(dt) {
    const w = this.wing;
    if (!w) return;
    w.t += dt;
    if (w.out >= 0 && w.t - w.out > 2.2) this.wing = null;
  }

  // ---------- move hooks ----------
  onMoveStart(m) {
    if (m.dive) this.spAirY = m.dive;
  }

  onMoveTick(m, t) {
    const g = this.game;
    this.trailOn = {};
    if (m.tr) for (const [t0, t1, key] of m.tr) if (t >= t0 && t <= t1) this.trailOn[key] = true;
    if (m.roll && t >= m.roll[0] && t <= m.roll[1]) {
      // rolling: dust sprays off the colony floor and the ground shudders under the pod
      if (Math.random() < 0.7) g.fx.dust(this._v.set(this.pos.x, 0.1, this.pos.z), 2, 1.1);
      if (g.local === this && Math.random() < 0.15) g.camera.shake(0.05);
    }
  }

  onInterrupt() {
    this.trailOn = {};
  }

  onEndMusou() {
    if (this.wing && this.wing.out < 0) this.wing.out = this.wing.t;
  }

  // ---------- events ----------
  suitEvent(name, arg) {
    const g = this.game;
    const P0 = this.pos;
    switch (name) {
      case 'whirl': // spinning top: a wind ring sweeps the ground round the pod
        g.fx.ring(P0, 1.2, 5.4, 0xc8d8f0, 0.35, 0.3, [0.06, 0]);
        g.fx.dust(this._v.set(P0.x, 0.1, P0.z), 3, 1.2);
        break;
      case 'meteor': { // the meteor drop lands: a crater's worth of shockwave
        this.impact(7.5, true, true);
        g.fx.shock(this._w.set(P0.x, 0.2, P0.z), 9, 0x9fdcff, 0.7);
        g.audio.play('shock');
        g.slowmo(0.35, 0.3);
        break;
      }
      case 'finblast': { // SP finisher: a point-blank shell that swallows everything in front
        this.rig.root.updateMatrixWorld(true);
        const air = arg === 'air';
        const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
        const c = this._w.set(P0.x + fx * 3.2, air ? Math.max(1.4, P0.y - 0.6) : P0.y + 1.6, P0.z + fz * 3.2);
        this.report(true);
        g.projectiles.heroBlast(this, c, air ? 6.2 : 5.6, 130, 16, 9, { big: true, sp: true, sound: 'bigboom' });
        g.fx.star(c, 0xffffff, 3.4);
        g.fx.star(c, 0xffd090, 2.6);
        g.fx.dome(c, 1, air ? 6 : 5.4, 0xffb060, 0.6);
        g.fx.light(c, 0xffc070, 220, 26, 0.5);
        g.fx.scorch(c.x, c.z, 3.6, 20);
        g.slowmo(0.3, 0.4);
        if (g.local === this) { g.camera.shake(1.0); g.aberr(1.2); }
        break;
      }
      case 'wing': { // charge SP: the squadron is called in round the leader
        this.wing = { t: 0, out: -1, ax: P0.x, az: P0.z, ah: this.heading, yaws: WINGS.map(() => this.heading) };
        for (const wm of this.wingmen) wm.yaw = this.heading;
        g.audio.play('qb', { vol: 0.8, pitch: 0.8 });
        break;
      }
      case 'volley': this.volley(); break;
      case 'wingout':
        if (this.wing && this.wing.out < 0) this.wing.out = this.wing.t;
        g.audio.play('qb', { vol: 0.7, pitch: 0.85 });
        break;
    }
  }

  // ---------- the cannon ----------
  muzzle(out) {
    return this.rig.nodes.head.localToWorld(out.set(0, MUZZLE, 0));
  }

  barrelDir(out) {
    return out.set(0, 1, 0).applyQuaternion(this.rig.nodes.head.getWorldQuaternion(this._qq)).normalize();
  }

  // One report: flash along the barrel, the recoilless back-blast venting out of the breech, the sound, a kick.
  report(big = false) {
    const g = this.game;
    const from = this.muzzle(this._a);
    const dir = this.barrelDir(this._b);
    g.fx.muzzle(from, dir, 0xffb060, big ? 1.8 : 1.2);
    g.fx.puff(from, big ? 5 : 3, 0.85, big ? 1 : 0.7, 0.8, 2);
    g.fx.puff(this.rig.nodes.head.localToWorld(this._c.set(0, 0.25, -0.4)), big ? 4 : 2, 0.75, 0.6, 0.4, 1.2);
    g.audio.play('bcannon', { vol: big ? 1 : 0.85 });
    if (g.local === this) { g.camera.shake(big ? 0.3 : 0.1); g.camera.kick(big ? 3.5 : 2); }
    return from;
  }

  fire(shot) {
    const g = this.game;
    this.rig.root.updateMatrixWorld(true);
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    if (shot.kind === 'pb') {
      // point-blank: the shell bursts on the target a stride in front
      const tgt = this.aimAt(this.heading, 6, 0.7);
      if (tgt) this.faceShot(Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z));
      const ax = Math.sin(this.heading), az = Math.cos(this.heading);
      this.report(true);
      const d = tgt ? clamp(Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z), 2.4, 4) : 3.2;
      g.projectiles.heroBlast(this, this._w.set(this.pos.x + ax * d, this.pos.y + 1.8, this.pos.z + az * d), 3.8, 58, 14, 8, { big: true, sound: 'cboom' });
      this.vel.x -= ax * 6;
      this.vel.z -= az * 6;
      return;
    }
    if (shot.kind === 'aa') {
      // anti-air: straight into whatever the launcher just threw up
      const from = this.report(!!shot.last);
      const tgt = this.airborneAhead();
      const p = tgt ? this._w.set(tgt.x ?? tgt.pos.x, (tgt.y ?? tgt.pos.y) + 1.4, tgt.z ?? tgt.pos.z) : this._w.set(this.pos.x + fx * 2, 6.5, this.pos.z + fz * 2);
      g.fx.streak(from, p, 0xfff0d0);
      g.projectiles.heroBlast(this, p, shot.last ? 3.6 : 2.8, shot.last ? 46 : 26, shot.last ? 12 : 2, shot.last ? 5 : 7, { lite: !shot.last, big: !!shot.last, sound: 'cboom' });
      return;
    }
    // 'shell' / 'heavy' / 'dn': a 180mm shell with a smoke trail
    const heavy = shot.kind === 'heavy';
    const o = heavy ? HEAVY_SHELL : shot.sp ? SP_SHELL : SHELL;
    let aim = this.heading;
    const tgt = this.aimAt(aim, shot.kind === 'dn' ? 22 : 36, 0.6);
    if (tgt) this.faceShot(aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z));
    const from = this.report(heavy).clone();
    const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
    if (shot.kind === 'dn') {
      const tx = tgt ? tgt.x : this.pos.x + dir.x * 6, tz = tgt ? tgt.z : this.pos.z + dir.z * 6;
      dir.set(tx - from.x, (tgt ? (tgt.y ?? tgt.pos?.y ?? 0) + 1.2 : 0) - from.y, tz - from.z).normalize();
      this.vel.y = Math.max(this.vel.y, 3); // the kick holds the pod up a moment
    } else {
      const ty = tgt ? (tgt.y ?? tgt.pos?.y ?? 0) + 1.8 : from.y - 0.4;
      const d = tgt ? Math.max(3, Math.hypot(tgt.x - from.x, tgt.z - from.z)) : 20;
      dir.y = (ty - from.y) / d;
      dir.normalize();
      this.vel.x -= Math.sin(aim) * (heavy ? 5 : 2.5);
      this.vel.z -= Math.cos(aim) * (heavy ? 5 : 2.5);
    }
    g.projectiles.shell(this, from, dir, o);
  }

  // ---------- the squadron ----------
  // Every wingman that has landed picks a target in front of the formation and fires.
  volley() {
    const g = this.game, w = this.wing;
    if (!w || w.out >= 0) return;
    let fired = 0;
    this.wingmen.forEach((wm, i) => {
      if (w.t - i * 0.06 < WING_IN) return;
      const rig = wm.rig;
      rig.root.updateMatrixWorld(true);
      const p = rig.root.position;
      const tgt = g.combat.acquire(p, w.ah, 34, 1.3) || g.combat.acquire(p, w.ah, 34, Math.PI);
      const aim = tgt ? Math.atan2(tgt.x - p.x, tgt.z - p.z) : w.ah + rand(-0.3, 0.3);
      w.yaws[i] = aim;
      wm.yaw = aim;
      rig.root.rotation.y = aim;
      rig.root.updateMatrixWorld(true);
      const from = rig.nodes.head.localToWorld(this._a.set(0, MUZZLE, 0)).clone();
      const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
      const ty = tgt ? (tgt.y ?? 0) + 1.8 : from.y - 0.5;
      const d = tgt ? Math.max(3, Math.hypot(tgt.x - from.x, tgt.z - from.z)) : 18;
      dir.y = (ty - from.y) / d;
      dir.normalize();
      g.projectiles.shell(this, from, dir, SP_SHELL);
      g.fx.muzzle(from, dir, 0xffb060, 1.1);
      g.fx.puff(from, 2, 0.85, 0.7, 0.8, 2);
      wm.kick = 1;
      fired++;
    });
    if (fired) g.audio.play('bcannon', { vol: 0.8, pitch: 0.94 });
  }

  // Pose and place the wingmen from this.wing (the host's timeline, or a co-op snapshot of it): they drop in from the
  // colony sky one after another, hover in formation turning to their targets, and climb away when it's over.
  placeWingmen(dt) {
    const g = this.game, w = this.wing;
    this.wingmen.forEach((wm, i) => {
      const rig = wm.rig;
      if (!w) { rig.root.visible = false; return; }
      const [s, f] = WINGS[i];
      const h = w.ah, rx = -Math.cos(h), rz = Math.sin(h), fx = Math.sin(h), fz = Math.cos(h);
      const u = clamp((w.t - i * 0.06) / WING_IN, 0, 1);
      const e = 1 - (1 - u) ** 3;
      let y = lerp(18, 0, e);
      let lift = u < 1;
      if (w.out >= 0) {
        const o = w.t - w.out - i * 0.1;
        if (o > 0) { y += o * o * 16 + o * 5; lift = true; }
      }
      rig.root.visible = u > 0 && y < 40;
      if (!rig.root.visible) return;
      rig.root.position.set(w.ax + rx * s + fx * f, y, w.az + rz * s + fz * f);
      wm.yaw = angleDamp(wm.yaw, w.yaws[i] ?? h, 10, dt);
      rig.root.rotation.y = wm.yaw;
      wm.kick = damp(wm.kick, 0, 7, dt);
      const p = wm.pose;
      p.set(BALL_STANCE);
      p[RY] = HOVER + Math.sin(g.time * 2.6 + i * 1.7) * 0.06;
      p[P.head * 3] = lerp(0.25, 1.3, e) - wm.kick * 0.15;
      p[P.torso * 3] = (lift ? -0.25 : 0.08) - wm.kick * 0.3;
      rig.applyPose(p);
      if (lift) {
        // thrusters blasting under them on the way in and out
        rig.root.updateMatrixWorld(true);
        for (const nx of [-0.3, 0.3]) {
          const n = rig.nodes.torso.localToWorld(this._c.set(nx, -0.6, -0.3));
          g.fx.thruster(n, this._b.set(0, -1, 0), 0x9fdcff, 1.5);
        }
      }
    });
  }

  // ---------- visuals ----------
  preVisuals(dt, inMove) {
    if (!inMove) this.trailOn = {};
  }

  postVisuals(dt, inMove) {
    const n = this.rig.nodes;
    const c = n.torso.localToWorld(this._c.set(0, 0, 0));
    this.clawTrail('R', n.hand, c);
    this.clawTrail('L', n.handL, c);
    // flurry afterimages: arm-length streaks radiating from the pod at random
    const blur = inMove && this.move?.blur;
    this.ghosts.count = blur ? 10 : 0;
    if (blur) {
      for (let i = 0; i < 10; i++) {
        const yaw = this.heading + rand(-1.7, 1.7), pitch = rand(-0.8, 0.7), len = rand(0.9, 1.5);
        const d = this._b.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
        this._qq.setFromUnitVectors(this._z, d);
        this._s.set(1, 1, len);
        this._m.compose(this._a.copy(c).addScaledVector(d, 0.75 + len * 0.75), this._qq, this._s);
        this.ghosts.setMatrixAt(i, this._m);
      }
      this.ghosts.instanceMatrix.needsUpdate = true;
    }
    this.placeWingmen(dt);
    this.tipSpeed = 0;
  }

  clawTrail(key, node, c) {
    node.localToWorld(this._a.set(0, -0.3, 0));
    this._b.copy(this._a).sub(c).multiplyScalar(TRAIL_REACH).add(c);
    this.trails[key].push(this._a, this._b, !!this.trailOn[key]);
  }

  // ---------- co-op ----------
  netExtras() {
    const inMove = this.state === 'attack' || this.state === 'musou';
    const w = this.wing;
    return {
      tr: (this.trailOn.R ? 1 : 0) | (this.trailOn.L ? 2 : 0), bl: inMove && !!this.move?.blur,
      wg: w ? [w.t, w.out, w.ax, w.az, w.ah, ...w.yaws] : null,
    };
  }

  applyNetExtras(s, dt) {
    this.trailOn = { R: !!(s.tr & 1), L: !!(s.tr & 2) };
    const a = s.wg;
    this.wing = a ? { t: a[0], out: a[1], ax: a[2], az: a[3], ah: a[4], yaws: a.slice(5) } : null;
    this.rig.root.updateMatrixWorld(true);
    this.postVisuals(dt, !!s.bl);
  }
}
