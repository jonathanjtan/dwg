// The player's mobile suit: locomotion, boost dash, jumps and hover, dodges, taking hits, the attack runner (keyframed
// poses, root motion, hit windows, shots, timed effects and sounds) and the SP state machine. Each suit (gundam.js,
// guncannon.js) supplies its model, stance, moveset and weapons, and fills in the hooks near the bottom of the class.
import * as THREE from 'three';
import { RigObject, makePose, lerpPose, poseFrom, RY, RYAW, RPITCH, RROLL, P } from '../core/rig.js';
import { clamp, damp, angleDamp, wrapAngle, lerp } from '../core/util.js';

const GRAV = 28;
const ATK_RATE = 0.86; // swings play a touch under keyframed speed: heavier, more deliberate
const REGEN_DELAY = 3.5; // seconds unhit before damaged armor starts to recover
const CHARGE_HOLD = 0.3; // seconds of held charge that turn a rifle shot into a charge shot
const RUSH_MAX = 6; // paired blows in a dash combo before the launching finisher
// Charge-attack swirl colours (gold for most, violet / pink / red on some).
export const FLASH = { gold: 0xffc860, violet: 0xc27aff, red: 0xff5a30, pink: 0xff7ad8 };

export function curve(keys, t) {
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

// suit: { id, pilot, def, moves, stance, hp, run, boostSpeed, boostTime, sprintSpeed, defense, nozzles, flameColor, impactColor,
//         spColor, spAura, spAirY, spAirReach, debris }
export class Hero {
  constructor(game, suit) {
    this.game = game;
    this.suit = suit;
    this.moves = suit.moves;
    this.stance = suit.stance;
    this.run = suit.run;
    this.scene = game.scene;
    this.owned = []; // scene objects besides the rig (weapons, trails) that come and go with the suit
    suit._def = suit._def || suit.def();
    this.rig = new RigObject(suit._def);
    this.boostPose = poseFrom({
      torso: [0.6, 0, 0], head: [-0.4, 0, 0], y: -0.15,
      thighR: [0.45, 0, -0.1], shinR: [0.8, 0, 0], thighL: [0.15, 0, 0.1], shinL: [0.6, 0, 0],
      uArmR: [0.6, 0, -0.45], fArmR: [-0.5, 0, 0], hand: [0.8, 0, 0], uArmL: [0.45, 0, 0.45], fArmL: [-0.8, 0, 0],
      ...suit.boostPose,
    }, this.stance);
    this.pos = new THREE.Vector3(0, 0, -6);
    this.vel = new THREE.Vector3();
    this.heading = 0;
    this.radius = 0.9;
    this.maxHp = suit.hp;
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
    this.saberScale = 0; // the Gundam's lit blade (drives the saber hum)
    this.tipSpeed = 0;
    this.hitSerial = 0;
    this.moveHitIds = [];
    this.firedShots = 0;
    this.lastSwing = -1;
    this.flash = 0;
    this.lie = 0;
    this.spKind = null; // 'ground' | 'air' | 'charge'
    this.spHeld = false; // SP button held since the press (charge SP)
    this.spCount = 0;
    this.chargeHeldT = 0;
    this.rushN = 0;
    this.armorFlash = 0;
    this.boost = 1;
    this.moveYaw = 0; // direction of travel during a dash (the suit may face elsewhere while strafing)
    this.boostWait = 0;
    this.hovering = false;
    this.hpRed = 0; // damage that recovers if the suit avoids being hit for a while
    this.regenWait = 0;
    this.wpn = null; // weapon in hand right now (per suit)

    // backpack flame jets: an outer cone around a white core, shown while the thrusters fire
    const cone = (r, h) => new THREE.ConeGeometry(r, h, 8, 1, true).rotateX(Math.PI).translate(0, -h / 2, 0).rotateX(Math.PI / 2);
    const flameMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    this.nozzles = suit.nozzles || [[-0.25, 0.1, -0.52], [0.25, 0.1, -0.52]];
    this.flames = this.nozzles.map(([x, y, z]) => {
      const f = new THREE.Group();
      f.position.set(x, y, z);
      f.add(new THREE.Mesh(cone(0.2, 1), flameMat(new THREE.Color(0.6, 1.4, 3.2), 0.75)));
      f.add(new THREE.Mesh(cone(0.09, 0.7), flameMat(new THREE.Color(3, 3, 3.2), 1)));
      f.visible = false;
      this.rig.nodes.torso.add(f);
      return f;
    });
    this.flameK = 0;
    this.flameUp = 0;

    this._v = new THREE.Vector3();
    this._w = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._r = [0, 0];
    this.buildWeapons();
    this.attached = false;
  }

  get alive() {
    return this.state !== 'dead';
  }

  // A scene object that belongs to this suit (weapon, trail): added and removed with it.
  own(obj) {
    this.owned.push(obj);
    return obj;
  }

  // Put the suit in the scene (or take it out, when another suit is picked).
  attach(on) {
    if (on === this.attached) return;
    this.attached = on;
    for (const o of [this.rig.root, ...this.owned]) {
      if (on) this.scene.add(o);
      else this.scene.remove(o);
    }
  }

  reset() {
    this.onInterrupt();
    this.pos.set(0, 0, -6);
    this.vel.set(0, 0, 0);
    this.hp = this.maxHp;
    this.hpRed = 0;
    this.sp = 30;
    this.boost = 1;
    this.state = 'move';
    this.heading = 0;
    this.lie = 0;
    this.wpn = null;
    this.spKind = null;
    this.invuln = 0;
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

  // Locked on to a commander: the bearing to it, which the suit keeps facing while it strafes. Null otherwise.
  lockYaw() {
    const t = this.game.lockTarget?.(this);
    return t ? Math.atan2(t.x - this.pos.x, t.z - this.pos.z) : null;
  }

  // Direction of travel relative to where the suit faces: 0 ahead, +-PI/2 to its right / left, PI straight back.
  travelAngle(vx, vz) {
    const h = this.heading;
    const f = vx * Math.sin(h) + vz * Math.cos(h);
    const r = -vx * Math.cos(h) + vz * Math.sin(h);
    return Math.atan2(r, f);
  }

  setState(s) {
    this.snapshotPose();
    this.state = s;
    this.stateT = 0;
  }

  snapshotPose() {
    this.prevPose.set(this.pose);
    // spins and flips end whole turns round: blend out of them the short way
    this.prevPose[RYAW] = wrapAngle(this.prevPose[RYAW]);
    this.prevPose[RPITCH] = wrapAngle(this.prevPose[RPITCH]);
    this.blendT = 0;
  }

  // What the suit swings or shoots at: the locked-on commander when it is in reach, else the nearest enemy in the
  // cone around `want`.
  aimAt(want, range, cone) {
    const lock = this.game.lockTarget?.(this);
    if (lock && Math.hypot(lock.x - this.pos.x, lock.z - this.pos.z) <= range + 4) return lock;
    return this.game.combat.acquire(this.pos, want, range, cone);
  }

  startMove(name, dir) {
    const m = this.moves[name];
    this.snapshotPose();
    this.blendDur = m.rush || m.loop ? 0.05 : 0.08;
    // aim: input direction, then soft lock to the nearest enemy in that cone (or the locked-on commander).
    // Shots and SP attacks turn to find a target anywhere around the suit unless the stick points somewhere;
    // the aerial SP tracks its own targets while it hovers.
    let want = dir ? Math.atan2(dir.x, dir.z) : this.heading;
    if (!(m.sp && m.isAir)) {
      const wide = m.sp || m.rifle || m.shots;
      const range = m.sp ? 22 : m.rifle || m.shots ? 34 : 9;
      const tgt = this.aimAt(want, range, wide ? (dir ? 1.3 : Math.PI) : dir ? 1.0 : 1.4);
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
    this.onMoveStart(m, w);
    this.wpn = w;
    if (m.isAir && !m.sp) this.airAttacks++;
    if (m.plunge) this.vel.y = 6;
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
    this.preUpdate(dt);
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
      case 'sprint': this.updateSprint(dt, act, dir, input); break;
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
    // locked on, the suit keeps its chest to the target: the stick strafes it round and backs it off, a little slower
    const face = this.lockYaw();
    if (face !== null && dir) {
      const f = dir.x * Math.sin(face) + dir.z * Math.cos(face);
      speedMul *= f >= 0 ? 1 - 0.1 * (1 - f) : 0.9 - 0.14 * -f;
    }
    const want = dir ? this.run * dir.mag * speedMul : 0;
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
    if (face !== null) this.heading = angleDamp(this.heading, face, 10, dt);
    else if (dir) this.heading = angleDamp(this.heading, Math.atan2(dir.x, dir.z), 8, dt);
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
    this.phase += dt * sp * 0.62 * (9.4 / this.run);
    // footsteps: every footfall lands with a thud
    if (Math.floor(prev / Math.PI) !== Math.floor(this.phase / Math.PI) && sp > 3) {
      const w = Math.min(1, sp / this.run);
      g.audio.play('step', { vol: (0.45 + 0.4 * w) * (this.suit.stepVol || 1), pitch: this.suit.stepPitch || 1 });
      g.fx.dust(this._v.set(this.pos.x, 0.1, this.pos.z), 3, 0.7);
      if (g.local === this) g.camera.thud(0.07 * w * (this.suit.stepVol || 1));
    }
    if (this.pos.y > 0) this.pos.y = Math.max(0, this.pos.y - dt * 4);
    this.locomotion(dt, sp, sp > 0.5 ? this.travelAngle(this.vel.x, this.vel.z) : 0);
  }

  // Run cycle. `a` is the direction of travel relative to the facing (see travelAngle): strafing, the hips turn
  // toward the step while the chest stays on the target; backing off, the stride runs in reverse and the suit leans
  // back a little.
  locomotion(dt, sp, a = 0) {
    const w = clamp(sp / this.run, 0, 1);
    const ca = Math.cos(a);
    const back = ca < -0.35;
    const ph = back ? -this.phase : this.phase;
    const s = Math.sin(ph), c = Math.cos(ph);
    const twist = back ? 0 : -clamp(a, -1.3, 1.3) * 0.42;
    const lean = 0.32 * Math.max(0, ca) - 0.12 * Math.max(0, -ca);
    const t = this.target;
    t.set(this.stance);
    const idle = Math.sin(this.game.time * 2.2) * 0.02;
    t[RY] = lerp(t[RY] + idle, -0.12 + Math.abs(c) * 0.12, w);
    const set = (name, x, y, z) => {
      const i = P[name] * 3;
      t[i] = lerp(t[i], x, w);
      t[i + 1] = lerp(t[i + 1], y, w);
      t[i + 2] = lerp(t[i + 2], z, w);
    };
    set('torso', lean, -0.15 + s * 0.18 - twist, 0);
    set('head', -0.25 * Math.max(0.3, ca), 0.12 - s * 0.12, 0);
    set('hips', 0, -s * 0.12 + twist, 0);
    set('thighR', -0.9 * s - 0.1, 0, -0.06);
    set('thighL', 0.9 * s - 0.1, 0, 0.06);
    set('shinR', 0.25 + 1.2 * Math.max(0, c), 0, 0);
    set('shinL', 0.25 + 1.2 * Math.max(0, -c), 0, 0);
    this.runArms(set, s, w);
    this.blendPose(dt, 0.12);
  }

  // Arm swing while running (the Gundam pumps its saber arm; other suits override).
  runArms(set, s) {
    set('uArmR', 0.1 + 0.55 * s, 0, -0.35);
    set('fArmR', -0.8, 0, 0);
    set('hand', 0.9, 0, 0);
    set('uArmL', -0.4 - 0.35 * s, 0, 0.3);
    set('fArmL', -1.2, 0, 0);
  }

  blendPose(dt) {
    this.carryPose(this.target);
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
      this.vel.x = Math.sin(a) * this.suit.boostSpeed * 0.7;
      this.vel.z = Math.cos(a) * this.suit.boostSpeed * 0.7;
    } else if (dir) {
      this.vel.x = dir.x * this.run * 1.05;
      this.vel.z = dir.z * this.run * 1.05;
    }
    g.audio.play('qb', { vol: boosted ? 0.8 : 0.55, pitch: 1.12 });
    g.fx.dust(this._v.set(this.pos.x, 0.1, this.pos.z), 8, 1);
  }

  updateAir(dt, act, dir, input) {
    this.hovering = false;
    if (act.musou && this.sp >= this.maxSp) return this.startMusou();
    if (act.attack && this.airAttacks < 2) return this.startMove('JA', dir);
    if (act.charge) return this.startMove('JC', dir);
    if (act.dodge) return this.dodge(dir);
    const face = this.lockYaw();
    if (dir) {
      this.vel.x = damp(this.vel.x, dir.x * this.run, 2.2, dt);
      this.vel.z = damp(this.vel.z, dir.z * this.run, 2.2, dt);
      if (face === null) this.heading = angleDamp(this.heading, Math.atan2(dir.x, dir.z), 5, dt);
    }
    if (face !== null) this.heading = angleDamp(this.heading, face, 8, dt);
    // hold jump past the apex to hover on the backpack thrusters
    if (input?.key('jump') && this.stateT > 0.3 && this.vel.y < 1.5 && this.boost > 0.02) {
      this.hovering = true;
      this.vel.y = damp(this.vel.y, -0.8, 7, dt);
      this.boost -= dt / (this.suit.boostTime * 1.25);
      this.boostWait = 0.5;
      this.thrust(1.5, true);
    } else this.vel.y -= GRAV * dt;
    this.pos.addScaledVector(this.vel, dt);
    if (this.vel.y > 0) this.thrust(1.2, true);
    const t = this.target;
    t.set(this.stance);
    const up = clamp(this.vel.y / 12, -1, 1);
    t.set(poseFrom({
      torso: [0.15 - up * 0.2, -0.1, 0], head: [-0.1, 0.1, 0],
      thighR: [-1.0, 0, -0.1], shinR: [1.5, 0, 0], thighL: [-0.3, 0, 0.1], shinL: [0.8, 0, 0],
      uArmR: [-0.6 + up * 0.3, 0, -0.6], fArmR: [-0.6, 0, 0], hand: [0.8, 0, 0],
      uArmL: [-0.5, 0, 0.6], fArmL: [-1.2, 0, 0], y: 0, ...this.suit.airPose,
    }, this.stance));
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
    this.onInterrupt();
    this.setState('dodge');
    this.blendDur = 0.05;
    this.dodgeDir = { x: dx, z: dz };
    this.moveYaw = Math.atan2(dx, dz);
    const face = this.lockYaw();
    if (face !== null) this.heading = face; // locked on: a side step or back step, still facing the target
    else if (dir) this.heading = Math.atan2(dx, dz);
    this.dodgeBack = !dir || (face !== null && Math.cos(this.travelAngle(dx, dz)) < -0.35);
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
    // keep holding boost to carry the dash into a sustained thruster run (or, with the gauge spent, a boost sprint)
    if (this.stateT > 0.16 && input?.key('dodge')) {
      if (this.boost > 0.08) return this.startBoost();
      if (!this.airDodge) return this.startSprint();
    }
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
    const face = this.lockYaw();
    if (face !== null) this.heading = angleDamp(this.heading, face, 12, dt);
    const side = face !== null ? Math.sin(this.travelAngle(this.dodgeDir.x, this.dodgeDir.z)) : 0;
    const lean = this.dodgeBack ? -0.35 : 0.55 * (1 - Math.abs(side));
    this.target.set(poseFrom({
      torso: [lean, 0, 0], head: [-lean * 0.5, 0, 0], y: -0.25, roll: side * 0.3,
      thighR: [0.5, 0, -0.1], shinR: [0.8, 0, 0], thighL: [0.2, 0, 0.1], shinL: [0.6, 0, 0],
      uArmR: [0.5, 0, -0.5], fArmR: [-0.4, 0, 0], hand: [0.8, 0, 0], uArmL: [0.3, 0, 0.5], fArmL: [-0.6, 0, 0],
    }, this.stance));
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
        if (this.repeat < this.moves[m.charge].maxRepeat) { this.repeat++; return this.startMove(m.charge, dir); }
      }
      if (this.buffer === 'attack' && m.isAir && this.airAttacks < 2 && this.pos.y > 0.8) return this.startMove('JA', dir);
    }
    if (t >= m.chain + 0.05 && act.dodge) return this.dodge(dir);
    if (t >= m.dur) {
      this.onMoveEnd(m);
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
      this.moveT = Math.min(t, m.plunge.hang ?? 0.3);
      t = this.moveT;
      if (this.pos.y <= 0) {
        this.pos.y = 0;
        this.vel.y = 0;
        this.landed = true;
        this.moveT = m.plunge.land ?? 0.36;
        t = this.moveT;
        this.impact(5.5, true);
        m.hits.forEach((h, i) => { if (h.onLand) g.combat.heroStrike(this, h, this.moveHitIds[i]); });
        this.onPlungeLand(m);
      }
    } else if (m.isAir && !m.sp) {
      // aerial attack hangs briefly then falls
      this.vel.y = Math.max(this.vel.y - GRAV * 0.35 * dt, -6);
      if (t < (m.hang ?? 0.2)) this.vel.y = Math.max(this.vel.y, 1.5);
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
      this.onWeapon(w, this.wpn);
      this.wpn = w;
    }
    this.onMoveTick(m, t, prevT, dt);

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
      this.muzzle(this._v, m.chargeFx[2]);
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

  // Timed move effects shared by every suit; suit-specific ones go to suitEvent().
  moveEvent(name, arg) {
    const g = this.game;
    const P = this.pos;
    switch (name) {
      case 'flash': { // charge-attack swirl: tilted rings snap out around the waist, with a star at the chest
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
      case 'charge':
        g.audio.play('spcharge');
        break;
      case 'land': // touching down out of an aerial move
        g.fx.dust(this._v.set(P.x, 0.1, P.z), 12, 1.3);
        g.audio.play('land', { vol: 0.9 });
        if (g.local === this) g.camera.thud(0.22);
        break;
      default:
        this.suitEvent(name, arg);
    }
  }

  // ---------- boost dash ----------
  startBoost() {
    const g = this.game;
    if (this.state !== 'dodge') this.moveYaw = this.heading;
    this.setState('boost');
    this.blendDur = 0.14;
    this.boostSfxT = 0;
    this.hovering = false;
    g.audio.play('qb', { vol: 0.7, pitch: 0.9 });
  }

  updateBoost(dt, act, dir, input) {
    const g = this.game;
    this.boost -= dt / this.suit.boostTime;
    this.boostWait = 0.6;
    if (act.musou && this.sp >= this.maxSp) return this.startMusou();
    if (act.attack) { this.comboStep = 1; this.rushN = 1; return this.startMove('DA', dir); }
    if (act.charge) { this.comboStep = 0; return this.startMove('DC', dir); }
    if (act.jump && this.pos.y < 1) return this.jump(dir, true);
    const air = this.pos.y > 1;
    // gauge spent with boost still held: settle into a boost sprint across the ground
    if (input?.key('dodge') && this.boost <= 0 && !air) return this.startSprint();
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
    this.steerDash(dt, dir, 3.2);
    const sp = this.suit.boostSpeed * Math.min(1, 0.65 + this.stateT * 2.5);
    this.vel.x = Math.sin(this.moveYaw) * sp;
    this.vel.z = Math.cos(this.moveYaw) * sp;
    this.vel.y = 0;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    if (!air) this.pos.y = damp(this.pos.y, 0.3, 8, dt); // skim just above the ground
    this.thrust(1.8, false);
    if (!air && Math.random() < 0.7) g.fx.dust(this._v.set(this.pos.x - Math.sin(this.moveYaw) * 1.5, 0.1, this.pos.z - Math.cos(this.moveYaw) * 1.5), 1, 1.0);
    if (g.local === this) g.camera.kick(6);
    this.target.set(this.boostPose);
    this.target[RY] = -0.15 + Math.sin(this.stateT * 9) * 0.03;
    this.dashLean(this.target);
    this.blendPose(dt);
  }

  // ---------- boost sprint ----------
  // Holding boost once the dash is spent keeps the suit skating on its thrusters at about twice its run: the way to
  // get from one field to the next. It costs no gauge (which refills meanwhile, so a fresh tap of boost dashes
  // again), and attacks come out of it as dash attacks.
  startSprint() {
    if (this.state !== 'dodge' && this.state !== 'boost') this.moveYaw = this.heading;
    this.setState('sprint');
    this.blendDur = 0.22;
    this.hovering = false;
    this.boostSfxT = 0;
  }

  updateSprint(dt, act, dir, input) {
    const g = this.game;
    if (act.musou && this.sp >= this.maxSp) return this.startMusou();
    if (act.attack) { this.comboStep = 1; this.rushN = 1; return this.startMove('DA', dir); }
    if (act.charge) { this.comboStep = 0; return this.startMove('DC', dir); }
    if (act.jump) return this.jump(dir, true);
    if (!input?.key('dodge')) {
      this.setState('move');
      this.blendDur = 0.2;
      this.vel.x *= 0.7;
      this.vel.z *= 0.7;
      g.fx.dust(this._v.set(this.pos.x + Math.sin(this.heading) * 1.2, 0.1, this.pos.z + Math.cos(this.heading) * 1.2), 6, 0.9);
      return;
    }
    this.steerDash(dt, dir, 4.5);
    // ease down from the dash (or up from a walk) to sprint speed
    const want = this.suit.sprintSpeed ?? this.run * 1.9;
    const cur = Math.hypot(this.vel.x, this.vel.z);
    const sp = cur > want ? damp(cur, want, 2.5, dt) : Math.min(want, cur + 28 * dt);
    this.vel.x = Math.sin(this.moveYaw) * sp;
    this.vel.z = Math.cos(this.moveYaw) * sp;
    this.vel.y = 0;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y = damp(this.pos.y, 0.22, 8, dt);
    this.thrust(1.1, false);
    if (Math.random() < 0.45) g.fx.dust(this._v.set(this.pos.x - Math.sin(this.moveYaw) * 1.4, 0.1, this.pos.z - Math.cos(this.moveYaw) * 1.4), 1, 0.8);
    if (g.local === this) g.camera.kick(2.5);
    this.target.set(this.boostPose);
    this.target[RY] = -0.12 + Math.sin(this.stateT * 7) * 0.035;
    this.dashLean(this.target);
    this.blendPose(dt);
  }

  // Dash steering: the stick turns the direction of travel. Locked on, the suit keeps facing its target, so a
  // dash to the side circles it and a dash back backs off; otherwise it turns to face where it's going.
  steerDash(dt, dir, turn) {
    const face = this.lockYaw();
    if (dir) this.moveYaw = angleDamp(this.moveYaw, Math.atan2(dir.x, dir.z), face !== null ? turn * 1.8 : turn, dt);
    this.heading = face !== null ? angleDamp(this.heading, face, 10, dt) : this.moveYaw;
  }

  // A strafing dash leans into its direction of travel instead of forward (and back, when backing off).
  dashLean(t) {
    const a = wrapAngle(this.moveYaw - this.heading);
    if (Math.abs(a) < 0.05) return;
    const ca = Math.cos(a), sa = Math.sin(a);
    const i = P.torso * 3;
    t[i] = t[i] * Math.max(0, ca) - 0.2 * Math.max(0, -ca);
    t[RPITCH] = (t[RPITCH] || 0) * Math.max(0, ca);
    t[RROLL] = (t[RROLL] || 0) + sa * 0.32;
  }

  impact(radius, shake, huge = false) {
    const g = this.game;
    const col = this.suit.impactColor ?? 0xff5fd0;
    const fwd = huge ? 0 : 2.2;
    const c = this._w.set(this.pos.x + Math.sin(this.heading) * fwd, 0.2, this.pos.z + Math.cos(this.heading) * fwd);
    g.fx.ring(c, 0.5, radius * 1.1, huge ? col : this.suit.ringColor ?? 0xffb0e0, huge ? 0.8 : 0.45);
    g.fx.ring(c, 0.3, radius * 0.7, 0xffffff, 0.3);
    g.fx.dust(c, huge ? 40 : 14, huge ? 2.5 : 1.3);
    g.fx.debris(c, huge ? 30 : 10, [0x8a867c, 0x6f6c64, 0x5a5750], huge ? 14 : 8, 0.2);
    g.fx.light(c, this.suit.impactLight ?? 0xff6fd0, huge ? 200 : 50, huge ? 30 : 14, huge ? 0.8 : 0.3);
    g.fx.scorch(c.x, c.z, radius * (huge ? 0.7 : 0.45), huge ? 20 : 10);
    if (g.local === this) g.aberr(huge ? 1.2 : 0.45);
    if (huge) g.fx.dome(this._v.set(c.x, 0, c.z), 1, radius, this.suit.domeColor ?? 0xff4fc0, 0.9);
    if (shake) g.camera.shake(huge ? 1.0 : 0.45);
    g.audio.play(huge ? 'bigboom' : 'slam');
  }

  thrust(strength, up) {
    const g = this.game;
    this.thrustAt = g.time;
    this.thrustUp = up;
    this.thrustPow = strength;
    const torso = this.rig.nodes.torso;
    const q = torso.getWorldQuaternion(this._q);
    for (const [x, y, z] of this.nozzles) {
      const p = torso.localToWorld(this._v.set(x, y, z));
      const d = this._w.set(0, up ? -1 : -0.3, up ? -0.4 : -1).applyQuaternion(q);
      g.fx.thruster(p, d, this.suit.exhaust ?? 0x9fdcff, strength);
    }
  }

  // ---------- damage ----------
  // kind: 'melee' | 'bullet'. Bullets only chip; a flinch grants a short super-armor window so crowds can't stunlock.
  takeHit(dmg, fromX, fromZ, heavy = false, kind = 'melee') {
    const g = this.game;
    if (this.state === 'dead' || this.invuln > 0 || this.state === 'musou' || this.state === 'down' || this.state === 'intro') return false;
    if (this.state === 'attack' && this.move.invuln) return false;
    if (this.state === 'dodge') return false;
    dmg = Math.round(dmg * g.difficulty.dmgTaken * (this.suit.defense ?? 1));
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
    this.onInterrupt();
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
    }, this.stance));
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
    }, this.stance));
    this.blendPose(dt);
  }

  die() {
    const g = this.game;
    this.onInterrupt();
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
      if (this.pos.y <= 0) { this.pos.y = 0; g.fx.explode(this._v.set(this.pos.x, 1.2, this.pos.z), 1.4, this.suit.debris); g.audio.play('boom'); }
    }
    this.lie = Math.min(1, this.lie + dt * 2.5);
    this.target.set(poseFrom({ pitch: -1.5 * this.lie, y: -0.15, torso: [-0.3, 0, 0], uArmR: [-0.3, 0, -1.1], uArmL: [-0.3, 0, 1.1] }, this.stance));
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
    }, this.stance));
    this.blendPose(dt);
    if (this.pos.y <= 0) {
      this.pos.y = 0;
      this.impact(4, true);
      this.setState('move');
      g.onHeroLanded();
    }
  }

  // ---------- SP attack ----------
  // Tap SP: the ground SP. Hold it through the starburst: the charge SP. In the air: the aerial SP.
  // Each SP phase names what follows it: spNext, spHold (taken instead when SP is still held), spRepeat (play n times).
  startMusou() {
    const g = this.game;
    this.onInterrupt();
    this.sp = 0;
    this.spKind = this.pos.y > 1.2 ? 'air' : 'ground';
    if (this.spKind === 'ground') this.pos.y = 0; // out of a hop: the ground SP plants its feet
    this.spHeld = true;
    this.setState('musou');
    this.spPhase(this.spKind === 'air' ? 'SPA_IN' : 'SP_IN');
    this.invuln = 99;
    if (this.spKind === 'air') {
      this.vel.set(0, 0, 0);
      this.spAirY = Math.max(this.pos.y, this.suit.spAirY ?? 4.5);
    }
    // activation shockwave shoves the crowd back so the cut-in has room
    g.combat.heroStrike(this, { shape: 'circle', range: 7, hy: 8, dmg: 5, kb: 12, up: 3, sp: true }, ++this.hitSerial);
    g.fx.ring(this.pos, 0.5, 8, this.suit.spColor ?? 0xff5fd0, 0.6);
    g.fx.dome(this._v.set(this.pos.x, this.pos.y, this.pos.z), 1, 6, this.suit.spDome ?? 0xff7ad8, 0.5);
    g.onMusou();
    g.audio.play('sp');
  }

  spPhase(name, dir, again = false) {
    if (!again) this.spCount = 1;
    this.startMove(name, dir);
    this.state = 'musou';
  }

  updateMusou(dt, act, dir, input) {
    const g = this.game;
    if (!input?.key('musou')) this.spHeld = false;
    const m = this.move, name = this.moveName;
    g.fx.aura(this.pos, this.spKind === 'charge' ? 0x7fe8ff : this.suit.spAura ?? 0xff5fd0, 3, 1.4);
    if (m.chargeAura) {
      // charge SP: a spiky cyan aura builds around the suit
      g.fx.aura(this.pos, 0x9ff4ff, 4, 2);
      g.fx.sparks(this._v.set(this.pos.x, this.pos.y + 2, this.pos.z), 2, 0x9ff4ff, 9);
    }
    // the long phases can be steered
    if (m.steer && dir) {
      this.heading = angleDamp(this.heading, Math.atan2(dir.x, dir.z), 4, dt);
      this.pos.x += dir.x * m.steer * dt;
      this.pos.z += dir.z * m.steer * dt;
    }
    if (this.spKind === 'air') {
      // hover over the fight, drifting toward whatever is being shelled
      this.pos.y = damp(this.pos.y, this.spAirY, 4, dt);
      const tgt = this.aimAt(this.heading, 26, 1.6);
      if (tgt) {
        this.heading = angleDamp(this.heading, Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z), 5, dt);
        if (Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z) > (this.suit.spAirReach ?? 7)) {
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
    if (t < m.dur) return;
    this.onMoveEnd(m);
    if (m.spHold && this.spHeld) {
      this.spKind = 'charge';
      return this.spPhase(m.spHold, dir);
    }
    if (m.spRepeat && this.spCount < m.spRepeat) {
      this.spCount++;
      return this.spPhase(name, dir, true);
    }
    if (m.spNext) return this.spPhase(m.spNext, dir);
    this.endMusou();
  }

  endMusou() {
    this.invuln = 0.6;
    this.wpn = null;
    this.spKind = null;
    this.onEndMusou();
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
    const rig = this.rig;
    rig.root.position.set(this.pos.x, this.pos.y + this.lie * 0.45, this.pos.z);
    rig.root.rotation.y = this.heading;
    rig.applyPose(this.pose);
    const f = Math.max(this.flash, this.armorFlash);
    this.armorFlash = Math.max(0, this.armorFlash - dt * 7);
    rig.setFlash(f * (this.armorFlash > 0 ? 0.18 : 0.35), this.armorFlash > 0 ? 0xffd080 : 0xff5030);
    const inMove = this.state === 'attack' || this.state === 'musou';
    this.preVisuals(dt, inMove);
    this.updateFlames(dt);
    rig.root.updateMatrixWorld(true);
    this.postVisuals(dt, inMove);
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
    return {
      suit: this.suit.id,
      x: this.pos.x, y: this.pos.y + this.lie * 0.45, z: this.pos.z, h: this.heading, st: this.state,
      hp: this.hp, hr: this.hpRed, mhp: this.maxHp, sp: this.sp, fl: Math.max(this.flash, this.armorFlash),
      pose: Array.from(this.pose),
      thr: this.thrustAt && this.game.time - this.thrustAt < 0.06 ? (this.thrustUp ? 2 : 1) : 0,
      ...this.netExtras(),
    };
  }

  // Guest: pose the puppet suit from the host's snapshot (interpolated position).
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
    this.applyNetExtras(s, dt);
    if (s.thr) this.thrust(1.2, s.thr === 2);
    this.updateFlames(dt);
    if (s.st === 'musou') g.fx.aura(this.pos, this.suit.spAura ?? 0xff5fd0, 2, 1.4);
  }

  // ---------- suit hooks ----------
  buildWeapons() {}
  preUpdate() {}
  onMoveStart() {}
  onWeapon() {}
  onMoveTick() {}
  onMoveEnd() {}
  onPlungeLand() {}
  onEndMusou() {}
  // leaving the current move early (hit, dodge, SP, death): let go of anything held, stop what's running
  onInterrupt() {}
  carryPose() {}
  suitEvent() {}
  muzzle(out) {
    return this.rig.nodes.hand.localToWorld(out.set(0, 0.05, 1.45));
  }
  fire() {}
  preVisuals() {}
  postVisuals() {}
  netExtras() { return {}; }
  applyNetExtras() {}
}
