// Amuro's RX-78-2: controller, animation, weapons (beam saber, beam rifle, beam javelin, hyper bazooka, Gundam hammer).
import * as THREE from 'three';
import { RigObject, makePose, lerpPose, poseFrom, RY, RPITCH, RYAW, POSE_LEN, P } from '../core/rig.js';
import { voxelMesh } from '../core/voxel.js';
import { gundamDef, gundamWeapons } from '../models/suits.js';
import { MOVES, STANCE, BLADE } from './moves.js';
import { clamp, damp, angleDamp, wrapAngle, lerp } from '../core/util.js';
import { Trail } from '../fx/fx.js';

const RUN = 9.4;
const GRAV = 28;
const BOOST_SPEED = 23;
const BOOST_TIME = 1.9; // seconds of boost dash (or ~2.4 s of hover) on a full gauge
const ATK_RATE = 0.86; // swings play a touch under keyframed speed: heavier, more deliberate
const REGEN_DELAY = 3.5; // seconds unhit before damaged armor starts to recover
const CHARGE_HOLD = 0.3; // seconds of held charge that turn a rifle shot into a charge shot
const RUSH_MAX = 6; // paired cuts in a dash combo before the launching finisher
const AIR_SHOTS = 11; // bazooka rounds in the aerial SP
const WEAPON_ID = { saber: 1, rifle: 2, javelin: 3, bazooka: 4, hammer: 5 };
const WEAPON_OF = [null, 'saber', 'rifle', 'javelin', 'bazooka', 'hammer'];
// Charge-attack swirl colours (gold for most, violet as the bazooka comes out, red for the dash charge).
const FLASH = { gold: 0xffc860, violet: 0xc27aff, red: 0xff5a30 };
// Beam presets: the rapid rifle shot and the heavy charge shot that throws its target.
const RIFLE_SHOT = { dmg: 22, kb: 4, up: 1 };
const CHARGE_SHOT = { dmg: 72, kb: 10, up: 10, big: true, w: 2.4, r: 1.5, speed: 110 };
const SABER_COLOR = new THREE.Color(3.2, 0.55, 1.9);
const SABER_TRAIL = 0xff4fb8;

const BOOST_POSE = poseFrom({
  torso: [0.6, 0, 0], head: [-0.4, 0, 0], y: -0.15,
  thighR: [0.45, 0, -0.1], shinR: [0.8, 0, 0], thighL: [0.15, 0, 0.1], shinL: [0.6, 0, 0],
  uArmR: [0.6, 0, -0.45], fArmR: [-0.5, 0, 0], hand: [0.8, 0, 0], uArmL: [0.45, 0, 0.45], fArmL: [-0.8, 0, 0],
}, STANCE);

function curve(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i];
      const u = (t - a[0]) / (b[0] - a[0]);
      const s = u * u * (3 - 2 * u);
      return a[1] + (b[1] - a[1]) * s;
    }
  }
  return keys[keys.length - 1][1];
}

export class Hero {
  constructor(game) {
    this.game = game;
    const scene = game.scene;
    this.rig = new RigObject(gundamDef());
    scene.add(this.rig.root);
    this.pos = new THREE.Vector3(0, 0, -6);
    this.vel = new THREE.Vector3();
    this.heading = 0;
    this.radius = 0.9;
    this.maxHp = 1200;
    this.hp = this.maxHp;
    this.maxSp = 100;
    this.sp = 30;
    this.state = 'move';
    this.stateT = 0;
    this.move = null;
    this.moveName = '';
    this.moveT = 0;
    this.comboStep = 0;
    this.repeat = 0;
    this.buffer = null;
    this.invuln = 0;
    this.phase = 0;
    this.pose = makePose();
    this.target = makePose();
    this.prevPose = makePose();
    this.blendT = 1;
    this.blendDur = 0.08;
    this.onGround = true;
    this.airAttacks = 0;
    this.saberLit = 0;
    this.saberScale = 0;
    this.rifleVis = 0;
    this.hitSerial = 0;
    this.moveHitIds = [];
    this.firedShots = 0;
    this.lastSwing = -1;
    this.flash = 0;
    this.lie = 0;
    this.spKind = null; // 'ground' | 'air' | 'charge'
    this.spHeld = false; // SP button held since the press (charge SP)
    this.spShots = 0;
    this.chargeHeldT = 0;
    this.rushN = 0;
    this.armorFlash = 0;
    this.boost = 1;
    this.boostWait = 0;
    this.hovering = false;
    this.hpRed = 0; // damage that recovers if the Gundam avoids being hit for a while
    this.regenWait = 0;

    // weapons
    const w = gundamWeapons();
    const hand = this.rig.nodes.hand;
    this.hilt = voxelMesh(w.hilt, { scale: 0.1 });
    hand.add(this.hilt);
    this.blade = new THREE.Group();
    this.blade.position.z = 0.3;
    const outerGeo = new THREE.BoxGeometry(0.17, 0.17, 1).translate(0, 0, 0.5);
    const coreGeo = new THREE.BoxGeometry(0.07, 0.07, 1.02).translate(0, 0, 0.5);
    this.bladeOuter = new THREE.Mesh(outerGeo, new THREE.MeshBasicMaterial({
      color: SABER_COLOR, toneMapped: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.bladeCore = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 3), toneMapped: false }));
    this.blade.add(this.bladeOuter, this.bladeCore);
    hand.add(this.blade);
    this.rifle = voxelMesh(w.rifle, { scale: 0.1 });
    this.rifle.position.set(0, -0.05, 0);
    hand.add(this.rifle);
    this.rifle.visible = false;
    this.javelin = voxelMesh(w.javelin, { scale: 0.1 });
    this.javelin.position.set(0, -0.05, 0);
    this.bazooka = voxelMesh(w.bazooka, { scale: 0.1 });
    this.bazooka.position.set(0, 0.12, 0);
    this.grip = voxelMesh(w.grip, { scale: 0.1 });
    for (const m of [this.javelin, this.bazooka, this.grip]) { m.visible = false; hand.add(m); }
    // the hammer's ball and chain live in world space, swung out from the fist
    this.ball = voxelMesh(w.ball, { scale: 0.1 });
    this.ball.visible = false;
    scene.add(this.ball);
    this.links = [];
    for (let i = 0; i < 16; i++) {
      const l = voxelMesh(w.link, { scale: 0.12 });
      l.visible = false;
      scene.add(l);
      this.links.push(l);
    }
    this.wpn = null; // weapon in hand right now (saber | rifle | javelin | bazooka | hammer)
    this.hamR = 0; // hammer chain length
    this.trail = new Trail(scene, SABER_TRAIL, 16);
    // backpack flame jets: a blue outer cone around a white core, shown while the thrusters fire
    const cone = (r, h) => new THREE.ConeGeometry(r, h, 8, 1, true).rotateX(Math.PI).translate(0, -h / 2, 0).rotateX(Math.PI / 2);
    const flameMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    this.flames = [-0.25, 0.25].map((sx) => {
      const f = new THREE.Group();
      f.position.set(sx, 0.1, -0.52);
      f.add(new THREE.Mesh(cone(0.2, 1), flameMat(new THREE.Color(0.6, 1.4, 3.2), 0.75)));
      f.add(new THREE.Mesh(cone(0.09, 0.7), flameMat(new THREE.Color(3, 3, 3.2), 1)));
      f.visible = false;
      this.rig.nodes.torso.add(f);
      return f;
    });
    this.flameK = 0;
    this.flameUp = 0;
    this.tipSpeed = 0;
    this._prevTip = new THREE.Vector3();

    this._v = new THREE.Vector3();
    this._w = new THREE.Vector3();
    this._base = new THREE.Vector3();
    this._tip = new THREE.Vector3();
    this._r = [0, 0];
  }

  get alive() {
    return this.state !== 'dead';
  }

  reset() {
    this.pos.set(0, 0, -6);
    this.vel.set(0, 0, 0);
    this.hp = this.maxHp;
    this.hpRed = 0;
    this.sp = 30;
    this.boost = 1;
    this.state = 'move';
    this.heading = 0;
    this.lie = 0;
  }

  // ---------- helpers ----------
  inputDir(input, camFwd) {
    const mx = input.move.x, my = input.move.y;
    if (Math.abs(mx) < 0.01 && Math.abs(my) < 0.01) return null;
    // camera forward (fx,fz); screen-right is (-fz, fx) in this handedness
    const fx = camFwd.x, fz = camFwd.z;
    const rx = -fz, rz = fx;
    const x = fx * my + rx * mx;
    const z = fz * my + rz * mx;
    const l = Math.hypot(x, z);
    return { x: x / l, z: z / l, mag: Math.min(1, Math.hypot(mx, my)) };
  }

  setState(s) {
    this.snapshotPose();
    this.state = s;
    this.stateT = 0;
  }

  snapshotPose() {
    this.prevPose.set(this.pose);
    this.prevPose[RYAW] = wrapAngle(this.prevPose[RYAW]);
    this.blendT = 0;
  }

  startMove(name, dir) {
    const m = MOVES[name];
    const g = this.game;
    this.snapshotPose();
    this.blendDur = m.rush || m.loop ? 0.05 : 0.08;
    // aim: input direction, then soft lock to nearest enemy in that cone
    let want = dir ? Math.atan2(dir.x, dir.z) : this.heading;
    if (!m.sp) {
      const tgt = g.combat.acquire(this.pos, want, m.rifle || m.shots ? 26 : 9, dir ? 1.0 : 1.4);
      if (tgt) want = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
    }
    this.heading = want;
    this.state = 'attack';
    this.move = m;
    this.moveName = name;
    this.moveT = 0;
    this.buffer = null;
    this.firedShots = 0;
    this.lastSwing = -1;
    this.evIdx = 0;
    this.sfxIdx = 0;
    this.lungePrev = 0;
    if (!m.isAir && this.pos.y < 0.6) this.pos.y = 0; // out of a ground-skimming boost
    this.airBase = this.pos.y;
    this.moveHitIds = (m.hits || []).map(() => ++this.hitSerial);
    this.landed = false;
    const w = this.weaponAt(m, 0);
    if (w === 'saber' && this.saberScale < 0.3) g.audio.play('ignite');
    this.wpn = w;
    if (m.isAir && !m.sp) this.airAttacks++;
    if (m.plunge) {
      this.vel.y = 6;
    }
  }

  // Weapon in hand at move time t: the move's weapon timeline, else its saber / rifle flag.
  weaponAt(m, t) {
    if (!m.wpn) return m.saber ? 'saber' : m.rifle ? 'rifle' : null;
    let w = null;
    for (const [t0, name] of m.wpn) if (t >= t0) w = name;
    return w;
  }

  // ---------- main update ----------
  update(dt, act, input) {
    const g = this.game;
    this.stateT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.poiseT = Math.max(0, (this.poiseT || 0) - dt);
    this.flash = Math.max(0, this.flash - dt * 5);
    this.saberLit -= dt;
    this.rifleVis -= dt;
    // hold charge through a rifle shot for a charge shot
    this.chargeHeldT = act.chargeHeld ? this.chargeHeldT + dt : 0;
    const camFwd = g.camera.forward();
    const dir = this.inputDir(input, camFwd);
    // boost gauge refills once the thrusters have rested
    this.boostWait -= dt;
    if (this.state !== 'boost' && !this.hovering && this.boostWait <= 0) this.boost = Math.min(1, this.boost + dt * (this.pos.y < 0.3 ? 0.62 : 0.2));
    // damaged armor recovers when left alone (red part of the HP bar)
    this.regenWait -= dt;
    if (this.regenWait <= 0 && this.hpRed > 0 && this.alive) {
      const r = Math.min(this.hpRed, this.maxHp * 0.04 * dt);
      this.hp += r;
      this.hpRed -= r;
    }

    switch (this.state) {
      case 'move': this.updateMove(dt, act, dir); break;
      case 'air': this.updateAir(dt, act, dir, input); break;
      case 'attack': this.updateAttack(dt, act, dir); break;
      case 'dodge': this.updateDodge(dt, act, dir, input); break;
      case 'boost': this.updateBoost(dt, act, dir, input); break;
      case 'hurt': this.updateHurt(dt); break;
      case 'down': this.updateDown(dt, act); break;
      case 'musou': this.updateMusou(dt, act, dir, input); break;
      case 'dead': this.updateDead(dt); break;
      case 'intro': this.updateIntro(dt); break;
    }

    // collisions with static world
    const r = g.world.resolve(this.pos.x, this.pos.z, this.radius, this._r);
    this.pos.x = r[0];
    this.pos.z = r[1];
    if (this.pos.y < 0) this.pos.y = 0;

    this.applyVisuals(dt);
  }

  groundMove(dt, dir, speedMul = 1) {
    const want = dir ? RUN * dir.mag * speedMul : 0;
    const tx = dir ? dir.x * want : 0, tz = dir ? dir.z * want : 0;
    // a mobile suit has mass: it builds up to a run and plants its feet to stop
    const acc = dir ? 32 : 28;
    const dx = tx - this.vel.x, dz = tz - this.vel.z;
    const dl = Math.hypot(dx, dz);
    const step = Math.min(dl, acc * dt);
    if (dl > 1e-4) {
      this.vel.x += (dx / dl) * step;
      this.vel.z += (dz / dl) * step;
    }
    if (dir) this.heading = angleDamp(this.heading, Math.atan2(dir.x, dir.z), 8, dt);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
  }

  updateMove(dt, act, dir) {
    const g = this.game;
    if (act.musou && this.sp >= this.maxSp) return this.startMusou();
    if (act.attack) { this.comboStep = 1; return this.startMove('N1', dir); }
    if (act.charge) { this.comboStep = 0; this.repeat = 1; return this.startMove('C1', dir); }
    if (act.jump) return this.jump(dir);
    if (act.dodge) return this.dodge(dir);
    this.groundMove(dt, dir);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const prev = this.phase;
    this.phase += dt * sp * 0.62;
    // footsteps: every footfall lands with a thud
    if (Math.floor(prev / Math.PI) !== Math.floor(this.phase / Math.PI) && sp > 3) {
      const w = Math.min(1, sp / RUN);
      g.audio.play('step', { vol: 0.45 + 0.4 * w });
      g.fx.dust(this._v.set(this.pos.x, 0.1, this.pos.z), 3, 0.7);
      if (g.local === this) g.camera.thud(0.07 * w);
    }
    if (this.pos.y > 0) this.pos.y = Math.max(0, this.pos.y - dt * 4);
    this.locomotion(dt, sp);
  }

  locomotion(dt, sp) {
    const w = clamp(sp / RUN, 0, 1);
    const ph = this.phase;
    const s = Math.sin(ph), c = Math.cos(ph);
    const t = this.target;
    t.set(STANCE);
    const idle = Math.sin(this.game.time * 2.2) * 0.02;
    t[RY] = lerp(-0.1 + idle, -0.12 + Math.abs(c) * 0.12, w);
    const set = (name, x, y, z) => {
      const i = P[name] * 3;
      t[i] = lerp(t[i], x, w);
      t[i + 1] = lerp(t[i + 1], y, w);
      t[i + 2] = lerp(t[i + 2], z, w);
    };
    set('torso', 0.32, -0.15 + s * 0.18, 0);
    set('head', -0.25, 0.12 - s * 0.12, 0);
    set('hips', 0, -s * 0.12, 0);
    set('thighR', -0.9 * s - 0.1, 0, -0.06);
    set('thighL', 0.9 * s - 0.1, 0, 0.06);
    set('shinR', 0.25 + 1.2 * Math.max(0, c), 0, 0);
    set('shinL', 0.25 + 1.2 * Math.max(0, -c), 0, 0);
    set('uArmR', 0.1 + 0.55 * s, 0, -0.35);
    set('fArmR', -0.8, 0, 0);
    set('hand', 0.9, 0, 0);
    set('uArmL', -0.4 - 0.35 * s, 0, 0.3);
    set('fArmL', -1.2, 0, 0);
    this.blendPose(dt, 0.12);
  }

  blendPose(dt) {
    // outside attacks a lit saber is carried angled up and back, so the long blade doesn't plough the ground
    if (this.saberScale > 0.05 && this.state !== 'attack' && this.state !== 'musou') {
      const t = this.target, h = P.hand * 3;
      t[h] = lerp(t[h], -2.0 - (t[P.uArmR * 3] + t[P.fArmR * 3]), Math.min(1, this.saberScale));
    }
    this.blendT = Math.min(1, this.blendT + dt / this.blendDur);
    if (this.blendT < 1) lerpPose(this.pose, this.prevPose, this.target, this.blendT * this.blendT * (3 - 2 * this.blendT));
    else this.pose.set(this.target);
  }

  jump(dir, boosted = false) {
    const g = this.game;
    this.setState('air');
    this.blendDur = 0.1;
    this.vel.y = boosted ? 15.5 : 14.5;
    this.onGround = false;
    this.airAttacks = 0;
    if (boosted) {
      const a = dir ? Math.atan2(dir.x, dir.z) : this.heading;
      this.vel.x = Math.sin(a) * BOOST_SPEED * 0.7;
      this.vel.z = Math.cos(a) * BOOST_SPEED * 0.7;
    } else if (dir) {
      this.vel.x = dir.x * RUN * 1.05;
      this.vel.z = dir.z * RUN * 1.05;
    }
    g.audio.play('qb', { vol: boosted ? 0.8 : 0.55, pitch: 1.12 });
    g.fx.dust(this._v.set(this.pos.x, 0.1, this.pos.z), 8, 1);
  }

  updateAir(dt, act, dir, input) {
    const g = this.game;
    this.hovering = false;
    if (act.musou && this.sp >= this.maxSp) return this.startMusou();
    if (act.attack && this.airAttacks < 2) return this.startMove('JA', dir);
    if (act.charge) return this.startMove('JC', dir);
    if (act.dodge) return this.dodge(dir);
    if (dir) {
      this.vel.x = damp(this.vel.x, dir.x * RUN, 2.2, dt);
      this.vel.z = damp(this.vel.z, dir.z * RUN, 2.2, dt);
      this.heading = angleDamp(this.heading, Math.atan2(dir.x, dir.z), 5, dt);
    }
    // hold jump past the apex to hover on the backpack thrusters
    if (input?.key('jump') && this.stateT > 0.3 && this.vel.y < 1.5 && this.boost > 0.02) {
      this.hovering = true;
      this.vel.y = damp(this.vel.y, -0.8, 7, dt);
      this.boost -= dt / (BOOST_TIME * 1.25);
      this.boostWait = 0.5;
      this.thrust(1.5, true);
    } else this.vel.y -= GRAV * dt;
    this.pos.addScaledVector(this.vel, dt);
    if (this.vel.y > 0) this.thrust(1.2, true);
    const t = this.target;
    t.set(STANCE);
    const up = clamp(this.vel.y / 12, -1, 1);
    const pz = poseFrom({
      torso: [0.15 - up * 0.2, -0.1, 0], head: [-0.1, 0.1, 0],
      thighR: [-1.0, 0, -0.1], shinR: [1.5, 0, 0], thighL: [-0.3, 0, 0.1], shinL: [0.8, 0, 0],
      uArmR: [-0.6 + up * 0.3, 0, -0.6], fArmR: [-0.6, 0, 0], hand: [0.8, 0, 0],
      uArmL: [-0.5, 0, 0.6], fArmL: [-1.2, 0, 0], y: 0,
    }, STANCE);
    t.set(pz);
    this.blendPose(dt);
    if (this.pos.y <= 0 && this.vel.y < 0) this.land();
  }

  land(hard = false) {
    const g = this.game;
    this.pos.y = 0;
    this.vel.y = 0;
    this.onGround = true;
    this.hovering = false;
    this.setState('move');
    this.blendDur = 0.12;
    this.vel.x *= 0.5;
    this.vel.z *= 0.5;
    g.fx.dust(this._v.set(this.pos.x, 0.1, this.pos.z), hard ? 16 : 10, hard ? 1.5 : 1.1);
    g.audio.play('land', { vol: hard ? 1 : 0.75 });
    if (g.local === this) g.camera.thud(hard ? 0.3 : 0.18);
  }

  dodge(dir) {
    const g = this.game;
    let dx, dz;
    if (dir) { dx = dir.x; dz = dir.z; }
    else { dx = -Math.sin(this.heading); dz = -Math.cos(this.heading); }
    this.setState('dodge');
    this.blendDur = 0.05;
    this.dodgeDir = { x: dx, z: dz };
    this.dodgeBack = !dir;
    if (dir) this.heading = Math.atan2(dx, dz);
    this.invuln = 0.3;
    this.airDodge = this.pos.y > 0.2;
    // quick boost: the exhaust detonates out of the backpack and the view lurches with it
    g.audio.play('qb');
    if (g.local === this) { g.camera.kick(8); g.camera.shake(0.12); }
    for (let i = 0; i < 3; i++) this.thrust(2.6, false);
    g.fx.puff(this._v.set(this.pos.x - dx * 1.2, this.pos.y + 1.8, this.pos.z - dz * 1.2), 4, 0.6, 0.8, 0.4, 3);
  }

  updateDodge(dt, act, dir, input) {
    const g = this.game;
    // keep holding boost to carry the dash into a sustained thruster run
    if (this.stateT > 0.16 && input?.key('dodge') && this.boost > 0.08) return this.startBoost();
    const T = 0.36;
    const u = this.stateT / T;
    const sp = 30 * Math.pow(1 - Math.min(1, u), 1.5) + 2;
    this.vel.x = this.dodgeDir.x * sp;
    this.vel.z = this.dodgeDir.z * sp;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    if (this.airDodge) {
      this.pos.y = Math.max(0, this.pos.y - dt * 2);
    }
    this.thrust(1.4, false);
    if (Math.random() < 0.5) g.fx.dust(this._v.set(this.pos.x, 0.1, this.pos.z), 1, 0.6);
    const lean = this.dodgeBack ? -0.35 : 0.55;
    this.target.set(poseFrom({
      torso: [lean, 0, 0], head: [-lean * 0.5, 0, 0], y: -0.25,
      thighR: [0.5, 0, -0.1], shinR: [0.8, 0, 0], thighL: [0.2, 0, 0.1], shinL: [0.6, 0, 0],
      uArmR: [0.5, 0, -0.5], fArmR: [-0.4, 0, 0], hand: [0.8, 0, 0], uArmL: [0.3, 0, 0.5], fArmL: [-0.6, 0, 0],
    }, STANCE));
    this.blendPose(dt);
    if (this.stateT >= T) {
      if (this.pos.y > 0.2) { this.setState('air'); this.vel.y = 0; }
      else { this.setState('move'); this.blendDur = 0.12; }
    }
    // allow chaining into attacks out of a dash
    if (this.stateT > 0.18) {
      if (act.attack) { this.comboStep = 1; this.startMove('N1', dir); }
      else if (act.charge) { this.comboStep = 0; this.repeat = 1; this.startMove('C1', dir); }
    }
  }

  updateAttack(dt, act, dir) {
    const m = this.move;
    if (act.attack) this.buffer = 'attack';
    if (act.charge) this.buffer = 'charge';
    if (act.musou && this.sp >= this.maxSp) return this.startMusou();
    // charge held through a rifle shot: the charge shot (once per hold)
    if (m.shot && this.chargeHeldT >= CHARGE_HOLD) {
      this.chargeHeldT = -99;
      return this.startMove('CS', dir);
    }
    const t = this.stepMove(dt, dir);

    // chaining
    if (t >= m.chain && this.buffer) {
      if (this.buffer === 'attack' && m.next && !m.isAir) {
        if (m.rush) return this.startMove(++this.rushN > RUSH_MAX ? 'DAF' : 'DA', dir);
        this.comboStep++;
        return this.startMove(m.next, dir);
      }
      if (this.buffer === 'charge' && m.charge) {
        if (!m.shot) {
          this.comboStep = 0;
          return this.startMove(m.charge, dir);
        }
        if (this.repeat < MOVES[m.charge].maxRepeat) { this.repeat++; return this.startMove(m.charge, dir); }
      }
      if (this.buffer === 'attack' && m.isAir && this.airAttacks < 2 && this.pos.y > 0.8) return this.startMove('JA', dir);
    }
    if (t >= m.chain + 0.05 && act.dodge) return this.dodge(dir);
    if (t >= m.dur) {
      if (this.pos.y > 0.15) { this.setState('air'); this.vel.set(0, -2, 0); }
      else { this.setState('move'); this.blendDur = 0.15; }
    }
  }

  // Advance the current move: root motion, weapon changes, hits, shots, timed effects and sounds, then the pose.
  // Shared by ordinary attacks and the SP phases; returns the move time.
  stepMove(dt, dir) {
    const g = this.game;
    const m = this.move;
    const prevT = this.moveT;
    this.moveT += dt * (m.rate ?? ATK_RATE);
    let t = this.moveT;

    // plunge: fall fast until landing, then play the impact part of the clip
    if (m.plunge && !this.landed) {
      this.vel.y -= 90 * dt;
      this.pos.y += this.vel.y * dt;
      this.pos.x += Math.sin(this.heading) * 4 * dt;
      this.pos.z += Math.cos(this.heading) * 4 * dt;
      this.thrust(1.3, true);
      this.moveT = Math.min(t, 0.3);
      t = this.moveT;
      if (this.pos.y <= 0) {
        this.pos.y = 0;
        this.vel.y = 0;
        this.landed = true;
        this.moveT = 0.36;
        t = 0.36;
        this.impact(5.5, true);
        m.hits.forEach((h, i) => g.combat.heroStrike(this, h, this.moveHitIds[i]));
      }
    } else if (m.isAir && !m.sp) {
      // aerial slash hangs briefly then falls
      this.vel.y = Math.max(this.vel.y - GRAV * 0.35 * dt, -6);
      if (t < 0.2) this.vel.y = Math.max(this.vel.y, 1.5);
      this.pos.y = Math.max(0, this.pos.y + this.vel.y * dt);
      this.pos.x += Math.sin(this.heading) * 3 * dt;
      this.pos.z += Math.cos(this.heading) * 3 * dt;
    } else if (!m.isAir) {
      // slight steering between swings
      if (dir && t < 0.1) this.heading = angleDamp(this.heading, Math.atan2(dir.x, dir.z), 6, dt);
      this.vel.x = damp(this.vel.x, 0, 10, dt);
      this.vel.z = damp(this.vel.z, 0, 10, dt);
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
    }

    // root motion
    if (m.lunge) {
      const d = curve(m.lunge, t);
      const dd = d - (this.lungePrev || 0);
      this.lungePrev = d;
      this.pos.x += Math.sin(this.heading) * dd;
      this.pos.z += Math.cos(this.heading) * dd;
    }
    if (m.slide && t >= m.slide[0] && t <= m.slide[1]) {
      this.pos.x += Math.sin(this.heading) * m.slide[2] * dt;
      this.pos.z += Math.cos(this.heading) * m.slide[2] * dt;
    }
    if (m.air) this.pos.y = this.airBase + curve(m.air, t);
    if (m.jets && t >= m.jets[0] && t <= m.jets[1]) this.thrust(1.5, m.jets[2]);

    // weapon in hand
    const w = this.weaponAt(m, t);
    if (w !== this.wpn) {
      if (w === 'saber' && this.saberScale < 0.3) g.audio.play('ignite');
      else if (w === 'javelin' || w === 'bazooka' || w === 'hammer') g.audio.play('draw', { vol: 0.7 });
      this.wpn = w;
    }
    if (w === 'saber') this.saberLit = 1.4;
    else if (w) this.saberLit = 0;
    if (w === 'rifle') this.rifleVis = 0.6;
    if (m.ham) this.hamR = curve(m.ham, t);

    // hits
    if (m.hits) {
      m.hits.forEach((h, i) => {
        if (h.onLand) return;
        if (t >= h.t && prevT <= h.t1) g.combat.heroStrike(this, h, this.moveHitIds[i]);
      });
    }
    // shots
    if (m.shots) {
      while (this.firedShots < m.shots.length && t >= m.shots[this.firedShots].t) this.fire(m.shots[this.firedShots++]);
    }
    // timed effects and sounds
    if (m.ev) while (this.evIdx < m.ev.length && t >= m.ev[this.evIdx][0]) this.moveEvent(m.ev[this.evIdx][1], m.ev[this.evIdx++][2]);
    if (m.sfxs) while (this.sfxIdx < m.sfxs.length && t >= m.sfxs[this.sfxIdx][0]) g.audio.play(m.sfxs[this.sfxIdx++][1], { vol: 0.65 });
    if (m.chargeFx && t >= m.chargeFx[0] && t <= m.chargeFx[1]) {
      this.muzzle(this._v);
      g.fx.aura(this._v, FLASH.gold, 2, 0.9);
      if (prevT === 0 || Math.floor(prevT * 8) !== Math.floor(t * 8)) g.audio.play('charge', { vol: 0.35 });
    }
    // swing sfx: each move has its own voice, played once per swing
    if (m.swing !== undefined && this.lastSwing < 0 && t >= m.swing) {
      this.lastSwing = 0;
      g.audio.play(m.sfx || 'slash_a', { vol: 0.65 });
    }

    m.clip.sample(m.loop ? t % m.loop : Math.min(t, m.clip.dur), this.target);
    this.blendPose(dt);
    return t;
  }

  // Timed move effects: charge-attack swirls, the SP starburst, javelin hits, the C6 shockwave, SP lightning.
  moveEvent(name, arg) {
    const g = this.game;
    const P = this.pos;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    switch (name) {
      case 'flash': { // tilted rings snap out around the waist, with a star at the chest
        const c = FLASH[arg] || FLASH.gold;
        const y = P.y + 1.9;
        g.fx.ring(P, 0.8, 3.4, c, 0.32, y, [0.5, 0.3]);
        g.fx.ring(P, 0.6, 3.0, c, 0.28, y + 0.5, [-0.4, -0.5]);
        g.fx.ring(P, 1.0, 3.8, c, 0.34, y - 0.6, [0.15, -0.2]);
        const chest = this._v.set(P.x, y, P.z);
        g.fx.star(chest, c, 1.6);
        g.fx.light(chest, c, 60, 12, 0.25);
        g.audio.play('flash', { vol: 0.75 });
        break;
      }
      case 'burst': { // SP activation starburst
        const c = this._v.set(P.x, P.y + 2, P.z);
        g.fx.star(c, 0xc8f4ff, 3.2);
        g.fx.star(c, 0xffffff, 2.4);
        g.fx.sparks(c, 26, 0xbfefff, 20);
        g.fx.light(c, 0xbfefff, 160, 24, 0.4);
        g.fx.ring(P, 0.5, 7, 0xbfefff, 0.45, P.y + 0.2);
        g.audio.play('burst');
        break;
      }
      case 'javtip': { // the beam javelin's head connects
        this.rig.root.updateMatrixWorld(true);
        const tip = this.javelin.localToWorld(this._v.set(0, 0, 4.0));
        g.fx.star(tip, 0xff8ad8, 2.4);
        g.fx.sparks(tip, 16, 0xff8ad8, 16);
        g.fx.light(tip, 0xff6fd0, 90, 14, 0.25);
        break;
      }
      case 'shock': { // C6: the blade goes into the ground and a disc of energy races out
        const c = this._w.set(P.x + fx * 1.2, 0.2, P.z + fz * 1.2);
        g.fx.shock(c, 9.5, 0xff6fd0, 0.75);
        g.fx.ring(c, 0.5, 10, 0xffb0e0, 0.6);
        g.fx.dust(c, 30, 2.2);
        g.fx.debris(c, 18, [0x8a867c, 0x6f6c64, 0x5a5750], 12, 0.2);
        g.fx.light(c, 0xff6fd0, 160, 26, 0.5);
        g.fx.scorch(c.x, c.z, 3, 14);
        g.audio.play('shock');
        if (g.local === this) { g.camera.shake(0.7); g.aberr(0.8); }
        break;
      }
      case 'bolt': { // SP finisher: purple lightning erupts where the javelin hits the ground
        const c = this._w.set(P.x + fx * 2.4, 0.3, P.z + fz * 2.4);
        g.fx.bolts(c, 7.5, 0xc27aff, 10);
        g.fx.dome(c, 1, 7, 0xc27aff, 0.7);
        g.fx.shock(c, 8, 0xb070ff, 0.6);
        g.fx.star(this._v.set(c.x, 1.5, c.z), 0xe0c0ff, 3);
        g.fx.light(c, 0xb070ff, 220, 32, 0.7);
        g.fx.debris(c, 24, [0x8a867c, 0x6f6c64, 0x5a5750], 14, 0.2);
        g.fx.scorch(c.x, c.z, 4, 16);
        g.audio.play('lightning');
        g.slowmo(0.25, 0.45);
        if (g.local === this) { g.camera.shake(1.0); g.aberr(1.2); }
        break;
      }
      case 'charge':
        g.audio.play('spcharge');
        break;
      case 'land': // touching down out of an aerial move
        g.fx.dust(this._v.set(P.x, 0.1, P.z), 12, 1.3);
        g.audio.play('land', { vol: 0.9 });
        if (g.local === this) g.camera.thud(0.22);
        break;
    }
  }

  // ---------- boost dash ----------
  startBoost() {
    const g = this.game;
    this.setState('boost');
    this.blendDur = 0.14;
    this.boostSfxT = 0;
    this.hovering = false;
    g.audio.play('qb', { vol: 0.7, pitch: 0.9 });
  }

  updateBoost(dt, act, dir, input) {
    const g = this.game;
    this.boost -= dt / BOOST_TIME;
    this.boostWait = 0.6;
    if (act.musou && this.sp >= this.maxSp) return this.startMusou();
    if (act.attack) { this.comboStep = 1; this.rushN = 1; return this.startMove('DA', dir); }
    if (act.charge) { this.comboStep = 0; return this.startMove('DC', dir); }
    if (act.jump && this.pos.y < 1) return this.jump(dir, true);
    const air = this.pos.y > 1;
    if (!input?.key('dodge') || this.boost <= 0) {
      // cut the thrusters: skid to a stop (or fall, if airborne)
      if (air) { this.setState('air'); this.vel.y = 0; this.stateT = 0.3; return; }
      this.setState('move');
      this.blendDur = 0.18;
      this.vel.x *= 0.6;
      this.vel.z *= 0.6;
      g.fx.dust(this._v.set(this.pos.x + Math.sin(this.heading) * 1.2, 0.1, this.pos.z + Math.cos(this.heading) * 1.2), 10, 1.1);
      g.audio.play('skid', { vol: 0.6 });
      return;
    }
    if (dir) this.heading = angleDamp(this.heading, Math.atan2(dir.x, dir.z), 3.2, dt);
    const sp = BOOST_SPEED * Math.min(1, 0.65 + this.stateT * 2.5);
    this.vel.x = Math.sin(this.heading) * sp;
    this.vel.z = Math.cos(this.heading) * sp;
    this.vel.y = 0;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    if (!air) this.pos.y = damp(this.pos.y, 0.3, 8, dt); // skim just above the ground
    this.thrust(1.8, false);
    if (!air && Math.random() < 0.7) g.fx.dust(this._v.set(this.pos.x - Math.sin(this.heading) * 1.5, 0.1, this.pos.z - Math.cos(this.heading) * 1.5), 1, 1.0);
    if (g.local === this) g.camera.kick(6);
    this.target.set(BOOST_POSE);
    this.target[RY] = -0.15 + Math.sin(this.stateT * 9) * 0.03;
    this.blendPose(dt);
  }

  impact(radius, shake, huge = false) {
    const g = this.game;
    const fwd = huge ? 0 : 2.2;
    const c = this._w.set(this.pos.x + Math.sin(this.heading) * fwd, 0.2, this.pos.z + Math.cos(this.heading) * fwd);
    g.fx.ring(c, 0.5, radius * 1.1, huge ? 0xff5fd0 : 0xffb0e0, huge ? 0.8 : 0.45);
    g.fx.ring(c, 0.3, radius * 0.7, 0xffffff, 0.3);
    g.fx.dust(c, huge ? 40 : 14, huge ? 2.5 : 1.3);
    g.fx.debris(c, huge ? 30 : 10, [0x8a867c, 0x6f6c64, 0x5a5750], huge ? 14 : 8, 0.2);
    g.fx.light(c, 0xff6fd0, huge ? 200 : 50, huge ? 30 : 14, huge ? 0.8 : 0.3);
    g.fx.scorch(c.x, c.z, radius * (huge ? 0.7 : 0.45), huge ? 20 : 10);
    if (g.local === this) g.aberr(huge ? 1.2 : 0.45);
    if (huge) g.fx.dome(this._v.set(c.x, 0, c.z), 1, radius, 0xff4fc0, 0.9);
    if (shake) g.camera.shake(huge ? 1.0 : 0.45);
    g.audio.play(huge ? 'bigboom' : 'slam');
  }

  muzzle(out) {
    if (this.wpn === 'bazooka') return this.bazooka.localToWorld(out.set(0, 0.05, 1.35));
    const node = this.wpn === 'rifle' || this.rifle.visible ? this.rifle : this.rig.nodes.hand;
    return node.localToWorld(out.set(0, 0.05, 1.45));
  }

  fire(shot) {
    const g = this.game;
    const ang = this.heading + (shot.ang || 0);
    const heavy = shot.kind === 'bazooka' || shot.kind === 'blast';
    // aim each shot at the nearest enemy in its lane if any
    let aim = ang;
    const tgt = g.combat.acquire(this.pos, ang, heavy ? 24 : 34, shot.ang !== undefined ? 0.2 : 0.35);
    if (tgt) aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
    this.rig.root.updateMatrixWorld(true);
    const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
    const from = this.muzzle(new THREE.Vector3());
    if (shot.kind === 'blast') {
      // dash charge: the bazooka goes off point-blank
      g.fx.muzzle(from, dir, 0xffb060, 1.6);
      g.projectiles.heroBlast(this, this._w.set(this.pos.x + dir.x * 3, this.pos.y + 1.8, this.pos.z + dir.z * 3), 3.8, 64, 12, 8);
      g.audio.play('bazooka');
      this.vel.x -= dir.x * 6;
      this.vel.z -= dir.z * 6;
      return;
    }
    if (shot.dn) {
      // aerial barrage: aim down at the target, or at the ground ahead
      const tx = tgt ? tgt.x : this.pos.x + dir.x * 8, tz = tgt ? tgt.z : this.pos.z + dir.z * 8;
      dir.set(tx - from.x, (tgt ? (tgt.y || 0) + 1.2 : 0) - from.y, tz - from.z).normalize();
    }
    if (shot.kind === 'bazooka') {
      g.projectiles.rocket(this, from, dir);
      g.fx.muzzle(from, dir, 0xffb060, 1.4);
      g.fx.puff(from, 4, 0.7, 0.8, 0.6, 2);
      g.audio.play('bazooka');
      g.camera.shake(0.2);
      g.camera.kick(3);
      if (!shot.dn) {
        this.vel.x -= dir.x * 5;
        this.vel.z -= dir.z * 5;
      }
    } else if (shot.kind === 'cshot') {
      g.projectiles.heroBeam(from, dir, CHARGE_SHOT);
      g.fx.muzzle(from, dir, 0xff8ad8, 2);
      g.fx.ring(from, 0.3, 3, FLASH.gold, 0.3, from.y);
      g.audio.play('cshot');
      g.camera.shake(0.45);
      g.camera.kick(5);
      g.aberr(0.6);
      this.vel.x -= dir.x * 7;
      this.vel.z -= dir.z * 7;
    } else {
      g.projectiles.heroBeam(from, dir, RIFLE_SHOT);
      g.fx.muzzle(from, dir, 0xff8ad8, 1);
      g.audio.play('rifle');
      g.camera.shake(0.1);
      g.camera.kick(2);
      this.vel.x -= dir.x * 3;
      this.vel.z -= dir.z * 3;
    }
  }

  thrust(strength, up) {
    const g = this.game;
    this.thrustAt = g.time;
    this.thrustUp = up;
    this.thrustPow = strength;
    const torso = this.rig.nodes.torso;
    for (const sx of [-0.25, 0.25]) {
      const p = torso.localToWorld(this._v.set(sx, 0.1, -0.52));
      const d = this._w.set(0, up ? -1 : -0.3, up ? -0.4 : -1).applyQuaternion(torso.getWorldQuaternion(new THREE.Quaternion()));
      g.fx.thruster(p, d, 0x9fdcff, strength);
    }
  }

  // ---------- damage ----------
  // kind: 'melee' | 'bullet'. Bullets only chip; a flinch grants a short super-armor window so crowds can't stunlock.
  takeHit(dmg, fromX, fromZ, heavy = false, kind = 'melee') {
    const g = this.game;
    if (this.state === 'dead' || this.invuln > 0 || this.state === 'musou' || this.state === 'down' || this.state === 'intro') return false;
    if (this.state === 'attack' && this.move.invuln) return false;
    if (this.state === 'dodge') return false;
    dmg = Math.round(dmg * g.difficulty.dmgTaken);
    this.hp = Math.max(0, this.hp - dmg);
    this.hpRed = Math.min(this.maxHp - this.hp, this.hpRed + dmg * g.difficulty.recover);
    this.regenWait = REGEN_DELAY;
    this.sp = Math.min(this.maxSp, this.sp + dmg * 0.08);
    this.flash = kind === 'bullet' ? 0.35 : 1;
    g.stats.damageTaken += dmg;
    if (kind !== 'bullet') g.hud.hurt();
    if (kind !== 'bullet' || Math.random() < 0.3) g.fx.hit(this._v.set(this.pos.x, this.pos.y + 1.8, this.pos.z), 0xffa040);
    if (kind === 'bullet') g.audio.play('ping', { vol: 0.45 });
    else g.audio.play('hurt', { vol: heavy ? 1 : 0.85 });
    g.camera.shake(heavy ? 0.5 : kind === 'bullet' ? 0.05 : 0.2);
    if (heavy && g.local === this) g.aberr(1);
    if (this.hp <= 0) {
      this.die(fromX, fromZ);
      return true;
    }
    const armored = (this.state === 'attack' && this.move.armor) || this.poiseT > 0;
    if (kind === 'bullet' || (armored && !heavy)) {
      if (kind !== 'bullet') this.armorFlash = 1;
      return true;
    }
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ;
    const l = Math.hypot(dx, dz) || 1;
    if (heavy) {
      this.setState('down');
      this.blendDur = 0.06;
      this.vel.set((dx / l) * 10, 8, (dz / l) * 10);
      this.heading = Math.atan2(-dx, -dz);
      this.downPhase = 'fly';
    } else {
      this.setState('hurt');
      this.blendDur = 0.04;
      this.vel.set((dx / l) * 4, 0, (dz / l) * 4);
      this.hurtDir = Math.random() < 0.5 ? 1 : -1;
      this.poiseT = 1.4;
    }
    return true;
  }

  updateHurt(dt) {
    this.vel.x = damp(this.vel.x, 0, 8, dt);
    this.vel.z = damp(this.vel.z, 0, 8, dt);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y = Math.max(0, this.pos.y - 12 * dt);
    this.target.set(poseFrom({
      torso: [-0.45, 0.3 * this.hurtDir, 0.15 * this.hurtDir], head: [-0.3, 0, 0], y: -0.2,
      uArmR: [-0.9, 0, -0.9], fArmR: [-0.5, 0, 0], uArmL: [-0.9, 0, 0.9], fArmL: [-0.5, 0, 0],
    }, STANCE));
    this.blendPose(dt);
    if (this.stateT > 0.28) { this.setState('move'); this.blendDur = 0.12; }
  }

  updateDown(dt, act) {
    const g = this.game;
    if (this.downPhase === 'fly') {
      this.vel.y -= GRAV * dt;
      this.pos.addScaledVector(this.vel, dt);
      this.lie = Math.min(1, this.lie + dt * 3);
      if (this.pos.y <= 0 && this.vel.y < 0) {
        this.pos.y = 0;
        this.vel.set(this.vel.x * 0.3, 0, this.vel.z * 0.3);
        this.downPhase = 'lie';
        this.stateT = 0;
        g.fx.dust(this._v.set(this.pos.x, 0.1, this.pos.z), 12, 1.3);
        g.audio.play('land');
        g.camera.shake(0.3);
      }
    } else if (this.downPhase === 'lie') {
      this.vel.x = damp(this.vel.x, 0, 6, dt);
      this.vel.z = damp(this.vel.z, 0, 6, dt);
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      this.lie = 1;
      if (this.stateT > 0.55 || (this.stateT > 0.2 && (act.jump || act.dodge))) {
        this.downPhase = 'up';
        this.stateT = 0;
        this.invuln = 1.0;
      }
    } else {
      this.lie = Math.max(0, 1 - this.stateT / 0.4);
      if (this.stateT > 0.4) { this.lie = 0; this.setState('move'); this.blendDur = 0.1; }
    }
    this.target.set(poseFrom({
      pitch: -1.45 * this.lie, y: -0.15 * this.lie,
      torso: [-0.2, 0, 0], head: [-0.2 * this.lie, 0, 0],
      uArmR: [-0.4, 0, -1.0], uArmL: [-0.4, 0, 1.0],
      thighR: [-0.4 * this.lie, 0, -0.1], shinR: [0.6 * this.lie, 0, 0], thighL: [-0.1, 0, 0.1], shinL: [0.3, 0, 0],
    }, STANCE));
    this.blendPose(dt);
  }

  die() {
    const g = this.game;
    this.setState('dead');
    this.hp = 0;
    this.hpRed = 0;
    this.downPhase = 'fly';
    this.vel.set(-Math.sin(this.heading) * 6, 9, -Math.cos(this.heading) * 6);
    g.onHeroDeath();
  }

  updateDead(dt) {
    const g = this.game;
    if (this.pos.y > 0 || this.vel.y > 0) {
      this.vel.y -= GRAV * dt;
      this.pos.addScaledVector(this.vel, dt);
      if (this.pos.y <= 0) { this.pos.y = 0; g.fx.explode(this._v.set(this.pos.x, 1.2, this.pos.z), 1.4, [0xe8eaf0, 0x2346a6, 0xcc2230]); g.audio.play('boom'); }
    }
    this.lie = Math.min(1, this.lie + dt * 2.5);
    this.target.set(poseFrom({ pitch: -1.5 * this.lie, y: -0.15, torso: [-0.3, 0, 0], uArmR: [-0.3, 0, -1.1], uArmL: [-0.3, 0, 1.1] }, STANCE));
    this.blendPose(dt);
  }

  // Launch intro: descend from the colony sky with thrusters.
  startIntro() {
    this.state = 'intro';
    this.stateT = 0;
    this.pos.set(0, 26, -16);
    this.vel.set(0, -18, 5);
  }

  updateIntro(dt) {
    const g = this.game;
    this.vel.y = -Math.max(4, Math.min(18, this.pos.y * 1.6));
    this.pos.addScaledVector(this.vel, dt);
    this.vel.z = damp(this.vel.z, 0, 1.5, dt);
    this.thrust(1.6, true);
    this.target.set(poseFrom({
      torso: [0.1, 0, 0], thighR: [-0.7, 0, -0.1], shinR: [1.1, 0, 0], thighL: [-0.2, 0, 0.1], shinL: [0.5, 0, 0],
      uArmR: [-0.3, 0, -0.5], uArmL: [-0.5, 0, 0.5],
    }, STANCE));
    this.blendPose(dt);
    if (this.pos.y <= 0) {
      this.pos.y = 0;
      this.impact(4, true);
      this.setState('move');
      g.onHeroLanded();
    }
  }

  // ---------- SP attack ----------
  // Tap SP on the ground: saber flurry into the javelin and a lightning blast. Hold it through the starburst: the
  // Gundam hammer. In the air: hover and shell the crowd with the hyper bazooka.
  startMusou() {
    const g = this.game;
    this.sp = 0;
    this.spKind = this.pos.y > 1.2 ? 'air' : 'ground';
    if (this.spKind === 'ground') this.pos.y = 0; // out of a hop: the ground SP plants its feet
    this.spHeld = true;
    this.spShots = 0;
    this.setState('musou');
    this.startMove(this.spKind === 'air' ? 'SPA_IN' : 'SP_IN');
    this.state = 'musou';
    this.invuln = 99;
    if (this.spKind === 'air') {
      this.vel.set(0, 0, 0);
      this.spAirY = Math.max(this.pos.y, 4.5);
    }
    // activation shockwave shoves the crowd back so the cut-in has room
    g.combat.heroStrike(this, { shape: 'circle', range: 7, hy: 8, dmg: 5, kb: 12, up: 3, sp: true }, ++this.hitSerial);
    g.fx.ring(this.pos, 0.5, 8, 0xff5fd0, 0.6);
    g.fx.dome(this._v.set(this.pos.x, this.pos.y, this.pos.z), 1, 6, 0xff7ad8, 0.5);
    g.onMusou();
    g.audio.play('sp');
  }

  spPhase(name, dir) {
    this.startMove(name, dir);
    this.state = 'musou';
  }

  updateMusou(dt, act, dir, input) {
    const g = this.game;
    if (!input?.key('musou')) this.spHeld = false;
    const name = this.moveName;
    const chest = this._v.set(this.pos.x, this.pos.y + 2, this.pos.z);
    g.fx.aura(this.pos, this.spKind === 'charge' ? 0x7fe8ff : 0xff5fd0, 3, 1.4);
    if (name === 'SPC_CH') {
      // charge SP: a spiky cyan aura builds around the suit
      g.fx.aura(this.pos, 0x9ff4ff, 4, 2);
      g.fx.sparks(chest, 2, 0x9ff4ff, 9);
    }
    // the long phases can be steered
    if ((name === 'SP_FL' || name === 'SPC_HAM') && dir) {
      this.heading = angleDamp(this.heading, Math.atan2(dir.x, dir.z), 4, dt);
      const sp = name === 'SPC_HAM' ? 3.5 : 2;
      this.pos.x += dir.x * sp * dt;
      this.pos.z += dir.z * sp * dt;
    }
    if (this.spKind === 'air') {
      // hover over the fight, drifting toward whatever is being shelled
      this.pos.y = damp(this.pos.y, this.spAirY, 4, dt);
      const tgt = g.combat.acquire(this.pos, this.heading, 26, 1.6);
      if (tgt) {
        this.heading = angleDamp(this.heading, Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z), 5, dt);
        if (Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z) > 7) {
          this.pos.x += Math.sin(this.heading) * 4 * dt;
          this.pos.z += Math.cos(this.heading) * 4 * dt;
        }
      } else if (dir) {
        this.heading = angleDamp(this.heading, Math.atan2(dir.x, dir.z), 4, dt);
        this.pos.x += dir.x * 4 * dt;
        this.pos.z += dir.z * 4 * dt;
      }
    }
    const t = this.stepMove(dt, dir);
    if (t < this.move.dur) return;
    switch (name) {
      case 'SP_IN':
        if (this.spHeld) {
          this.spKind = 'charge';
          return this.spPhase('SPC_CH', dir);
        }
        return this.spPhase('SP_FL', dir);
      case 'SP_FL': return this.spPhase('SP_JV', dir);
      case 'SP_JV': return this.spPhase('SP_OUT', dir);
      case 'SPA_IN':
        this.spShots = 1;
        return this.spPhase('SPA_FIRE', dir);
      case 'SPA_FIRE':
        if (this.spShots++ < AIR_SHOTS) return this.spPhase('SPA_FIRE', dir);
        break;
      case 'SPC_CH': return this.spPhase('SPC_HAM', dir);
      case 'SPC_HAM': return this.spPhase('SPC_END', dir);
    }
    this.endMusou();
  }

  endMusou() {
    this.invuln = 0.6;
    this.wpn = null;
    this.hamR = 0;
    this.spKind = null;
    if (this.pos.y > 0.3) {
      this.setState('air');
      this.vel.set(0, 0, 0);
      this.stateT = 0.3;
    } else {
      this.setState('move');
      this.blendDur = 0.2;
    }
  }

  // ---------- visuals ----------
  applyVisuals(dt) {
    const g = this.game;
    const rig = this.rig;
    rig.root.position.set(this.pos.x, this.pos.y + this.lie * 0.45, this.pos.z);
    rig.root.rotation.y = this.heading;
    rig.applyPose(this.pose);
    const f = Math.max(this.flash, this.armorFlash);
    this.armorFlash = Math.max(0, this.armorFlash - dt * 7);
    rig.setFlash(f * (this.armorFlash > 0 ? 0.18 : 0.35), this.armorFlash > 0 ? 0xffd080 : 0xff5030);

    // weapons: whatever the current move holds; the rifle lingers a moment after shooting; otherwise the saber hilt
    const inMove = this.state === 'attack' || this.state === 'musou';
    let wpn = inMove ? this.wpn : null;
    if (!wpn && this.rifleVis > 0) wpn = 'rifle';
    this.showWeapon(wpn);
    const lit = wpn === 'saber' || (!wpn && this.saberLit > 0);
    this.saberScale = damp(this.saberScale, lit ? 1 : 0, lit ? 22 : 10, dt);
    this.blade.visible = this.saberScale > 0.02;
    this.blade.scale.set(1, 1, Math.max(0.001, BLADE * this.saberScale));
    const flick = 0.92 + Math.random() * 0.08;
    this.bladeOuter.material.color.copy(SABER_COLOR).multiplyScalar(flick);

    this.updateFlames(dt);
    rig.root.updateMatrixWorld(true);
    this.placeHammer(wpn === 'hammer' && this.hamR > 0.3);
    const swinging = inMove && wpn === 'saber';
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    // blade tip speed drives the saber hum's swoosh
    if (dt > 1e-4) this.tipSpeed = damp(this.tipSpeed, this._tip.distanceTo(this._prevTip) / dt, 20, dt);
    this._prevTip.copy(this._tip);
    this.trail.push(this._base, this._tip, swinging && this.blade.visible);
  }

  showWeapon(wpn) {
    this.rifle.visible = wpn === 'rifle';
    this.javelin.visible = wpn === 'javelin';
    this.bazooka.visible = wpn === 'bazooka';
    this.grip.visible = wpn === 'hammer';
    this.hilt.visible = !wpn || wpn === 'saber';
  }

  // Hammer ball on its chain, flung out from the fist along the arm's bearing to the current chain length.
  placeHammer(on) {
    this.ball.visible = on;
    for (const l of this.links) l.visible = on;
    if (!on) return;
    const hand = this.rig.nodes.hand.getWorldPosition(this._w);
    const dx = hand.x - this.pos.x, dz = hand.z - this.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const R = Math.max(this.hamR, d + 0.4);
    const bx = this.pos.x + (dx / d) * R, bz = this.pos.z + (dz / d) * R;
    const by = Math.max(0.5, hand.y - 0.2);
    this.ball.position.set(bx, by, bz);
    this.ball.rotation.y += 0.35;
    this.ball.rotation.x += 0.2;
    const n = this.links.length;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, l = this.links[i];
      l.position.set(lerp(hand.x, bx, u), lerp(hand.y, by, u) - Math.sin(u * Math.PI) * 0.12, lerp(hand.z, bz, u));
      l.lookAt(bx, by, bz);
      if (i % 2) l.rotateZ(Math.PI / 2);
    }
  }

  // Flame length follows the most recent thrust() call; nozzles tilt down for lift, back for dashes.
  updateFlames(dt) {
    const g = this.game;
    const on = this.thrustAt !== undefined && g.time - this.thrustAt < 0.07;
    const want = on ? 0.55 + (this.thrustPow || 1) * 0.45 : 0;
    this.flameK = damp(this.flameK, want, on ? 30 : 12, Math.max(dt, 1 / 240));
    this.flameUp = damp(this.flameUp, this.thrustUp ? 1 : 0, 12, Math.max(dt, 1 / 240));
    const vis = this.flameK > 0.04;
    for (const f of this.flames) {
      f.visible = vis;
      if (!vis) continue;
      const w = 0.75 + this.flameK * 0.35;
      f.scale.set(w, w, this.flameK * (0.9 + Math.random() * 0.35));
      f.rotation.x = -(0.28 + 0.95 * this.flameUp);
    }
  }

  // ---------- co-op replication ----------
  netState() {
    const inMove = this.state === 'attack' || this.state === 'musou';
    let wpn = inMove ? this.wpn : null;
    if (!wpn && this.rifleVis > 0) wpn = 'rifle';
    return {
      x: this.pos.x, y: this.pos.y + this.lie * 0.45, z: this.pos.z, h: this.heading, st: this.state,
      hp: this.hp, hr: this.hpRed, mhp: this.maxHp, sp: this.sp, fl: Math.max(this.flash, this.armorFlash),
      pose: Array.from(this.pose), sab: this.saberScale, wp: WEAPON_ID[wpn] || 0, hm: this.hamR, sw: inMove && wpn === 'saber',
      thr: this.thrustAt && this.game.time - this.thrustAt < 0.06 ? (this.thrustUp ? 2 : 1) : 0,
    };
  }

  // Guest: pose the puppet Gundam from the host's snapshot (interpolated position).
  applyNet(s, dt) {
    const g = this.game;
    this.state = s.st;
    this.hp = s.hp;
    this.hpRed = s.hr || 0;
    this.maxHp = s.mhp;
    this.sp = s.sp;
    this.heading = s.h;
    this.pose.set(s.pose);
    const rig = this.rig;
    rig.root.position.copy(this.pos);
    rig.root.rotation.y = this.heading;
    rig.applyPose(this.pose);
    rig.setFlash(s.fl * 0.35, 0xff5030);
    rig.root.visible = true;
    const wpn = WEAPON_OF[s.wp || 0];
    this.showWeapon(wpn);
    this.blade.visible = s.sab > 0.02;
    this.blade.scale.set(1, 1, Math.max(0.001, BLADE * s.sab));
    rig.root.updateMatrixWorld(true);
    this.hamR = s.hm || 0;
    this.placeHammer(wpn === 'hammer' && this.hamR > 0.3);
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    this.trail.push(this._base, this._tip, s.sw && this.blade.visible);
    if (s.thr) this.thrust(1.2, s.thr === 2);
    this.updateFlames(dt);
    if (s.st === 'musou') g.fx.aura(this.pos, 0xff5fd0, 2, 1.4);
  }

  // world position of blade tip (for hit sparks)
  bladeTip(out) {
    return out.copy(this._tip);
  }
}
