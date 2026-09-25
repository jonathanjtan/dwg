// Amuro's RX-78-2: controller, animation, weapons.
import * as THREE from 'three';
import { RigObject, makePose, lerpPose, poseFrom, RY, RPITCH, RYAW, POSE_LEN, P } from '../core/rig.js';
import { voxelMesh } from '../core/voxel.js';
import { gundamDef, gundamWeapons } from '../models/suits.js';
import { MOVES, STANCE } from './moves.js';
import { clamp, damp, angleDamp, wrapAngle, lerp } from '../core/util.js';
import { Trail } from '../fx/fx.js';

const RUN = 9.4;
const GRAV = 28;
const BOOST_SPEED = 23;
const BOOST_TIME = 1.9; // seconds of boost dash (or ~2.4 s of hover) on a full gauge
const ATK_RATE = 0.86; // swings play a touch under keyframed speed: heavier, more deliberate
const REGEN_DELAY = 3.5; // seconds unhit before damaged armor starts to recover
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
    this.spPhase = 0;
    this.spRushT = 0;
    this.spRushIdx = 0;
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
    this.trail = new Trail(scene, SABER_TRAIL, 16);
    this.giant = 1;
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
    this.blendDur = name.startsWith('SP_RUSH') ? 0.04 : 0.08;
    // aim: input direction, then soft lock to nearest enemy in that cone
    let want = dir ? Math.atan2(dir.x, dir.z) : this.heading;
    if (!name.startsWith('SP')) {
      const tgt = g.combat.acquire(this.pos, want, m.rifle ? 26 : 9, dir ? 1.0 : 1.4);
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
    this.lungePrev = 0;
    if (!m.isAir && this.pos.y < 0.6) this.pos.y = 0; // out of a ground-skimming boost
    this.airBase = this.pos.y;
    this.moveHitIds = (m.hits || []).map(() => ++this.hitSerial);
    this.landed = false;
    if (m.saber) {
      if (this.saberLit <= 0) g.audio.play('ignite');
      this.saberLit = 2.5;
    }
    if (m.rifle) this.rifleVis = 0.6;
    if (m.isAir) this.airAttacks++;
    if (m.plunge) {
      this.vel.y = 6;
    }
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
      case 'musou': this.updateMusou(dt, act, dir); break;
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
    const g = this.game;
    const m = this.move;
    const prevT = this.moveT;
    this.moveT += dt * (m.rate ?? ATK_RATE);
    let t = this.moveT;

    if (act.attack) this.buffer = 'attack';
    if (act.charge) this.buffer = 'charge';
    if (act.musou && this.sp >= this.maxSp) return this.startMusou();

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
    } else if (m.isAir && !m.plunge) {
      // aerial slash hangs briefly then falls
      this.vel.y = Math.max(this.vel.y - GRAV * 0.35 * dt, -6);
      if (t < 0.2) this.vel.y = Math.max(this.vel.y, 1.5);
      this.pos.y = Math.max(0, this.pos.y + this.vel.y * dt);
      this.pos.x += Math.sin(this.heading) * 3 * dt;
      this.pos.z += Math.cos(this.heading) * 3 * dt;
    } else {
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
    if (m.air) this.pos.y = this.airBase + curve(m.air, t);
    if (m.boost && t >= m.boost[0] && t <= m.boost[1]) this.thrust(1.5, false);

    // hits
    if (m.hits) {
      m.hits.forEach((h, i) => {
        if (h.onLand) return;
        if (t >= h.t && prevT <= h.t1) g.combat.heroStrike(this, h, this.moveHitIds[i]);
      });
    }
    // shots
    if (m.shots) {
      while (this.firedShots < m.shots.length && t >= m.shots[this.firedShots].t) {
        this.fire(m.shots[this.firedShots]);
        this.firedShots++;
      }
    }
    if (m.chargeFx && t >= m.chargeFx[0] && t <= m.chargeFx[1]) {
      this.muzzle(this._v);
      g.fx.aura(this._v, 0xff7ad0, 3, 1.2);
      if (prevT === 0 || Math.floor(prevT * 10) !== Math.floor(t * 10)) g.audio.play('charge', { vol: 0.35 });
    }
    // swing sfx: each move has its own voice, played once per swing
    if (m.swing !== undefined && this.lastSwing < 0 && t >= m.swing) {
      this.lastSwing = 0;
      g.audio.play(m.sfx || 'slash_a', { vol: 0.65 });
    }
    if (m.slam !== undefined && prevT < m.slam && t >= m.slam) this.impact(m.hits?.[0]?.sp ? 11 : 5.6, true, !!m.hits?.[0]?.sp);
    if (m.giant) this.giant = t >= m.giant[0] && t <= m.giant[1] ? damp(this.giant, 5.5, 10, dt) : damp(this.giant, 1, 8, dt);

    m.clip.sample(Math.min(t, m.clip.dur), this.target);
    this.blendPose(dt);

    // chaining
    if (t >= m.chain && this.buffer) {
      if (this.buffer === 'attack' && m.next && !m.isAir) {
        this.comboStep++;
        return this.startMove(m.next, dir);
      }
      if (this.buffer === 'charge' && m.charge) {
        if (m.charge === this.moveName) {
          if (this.repeat < (m.maxRepeat || 1)) { this.repeat++; return this.startMove(m.charge, dir); }
        } else {
          this.comboStep = 0;
          return this.startMove(m.charge, dir);
        }
      }
      if (this.buffer === 'attack' && m.isAir && this.airAttacks < 2 && this.pos.y > 0.8) return this.startMove('JA', dir);
    }
    if (t >= m.chain + 0.05 && act.dodge) return this.dodge(dir);
    if (t >= m.dur) {
      if (this.pos.y > 0.15) { this.setState('air'); this.vel.set(0, -2, 0); }
      else { this.setState('move'); this.blendDur = 0.15; }
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
    if (act.attack) { this.comboStep = 1; return this.startMove('DA', dir); }
    if (act.charge) { this.comboStep = 0; this.repeat = 1; return this.startMove('C1', dir); }
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
    const node = this.rifle.visible ? this.rifle : this.rig.nodes.hand;
    return node.localToWorld(out.set(0, 0.05, 1.45));
  }

  fire(shot) {
    const g = this.game;
    const ang = this.heading + (shot.ang || 0);
    // aim each shot at the nearest enemy in its lane if any
    let aim = ang;
    const tgt = g.combat.acquire(this.pos, ang, 34, shot.ang !== undefined ? 0.2 : 0.35);
    if (tgt) aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
    this.rig.root.updateMatrixWorld(true);
    const from = this.muzzle(new THREE.Vector3());
    const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
    if (shot.kind === 'mega') {
      g.projectiles.megaBeam(from, dir);
      g.camera.shake(0.6);
      g.camera.kick(6);
      g.aberr(0.8);
      g.audio.play('mega');
      this.vel.x -= dir.x * 8;
      this.vel.z -= dir.z * 8;
    } else {
      g.projectiles.heroBeam(from, dir);
      g.audio.play('rifle');
      g.camera.shake(0.14);
      g.camera.kick(2.5);
      this.vel.x -= dir.x * 4;
      this.vel.z -= dir.z * 4;
    }
    g.fx.muzzle(from, dir, 0xff8ad8, shot.kind === 'mega' ? 1.8 : 1);
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
  startMusou() {
    const g = this.game;
    this.sp = 0;
    this.setState('musou');
    this.spPhase = 0;
    this.startMove('SP_IN');
    this.state = 'musou';
    this.invuln = 99;
    // activation shockwave shoves the crowd back so the cut-in has room
    g.combat.heroStrike(this, { shape: 'circle', range: 7, dmg: 5, kb: 12, up: 3, sp: true }, ++this.hitSerial);
    g.fx.ring(this.pos, 0.5, 8, 0xff5fd0, 0.6);
    g.fx.dome(this._v.set(this.pos.x, 0, this.pos.z), 1, 6, 0xff7ad8, 0.5);
    g.onMusou();
    g.audio.play('sp');
  }

  updateMusou(dt, act, dir) {
    const g = this.game;
    const m = this.move;
    const prevT = this.moveT;
    this.moveT += dt;
    const t = this.moveT;
    g.fx.aura(this.pos, 0xff5fd0, 3, 1.4);
    if (this.spPhase === 0) {
      m.clip.sample(Math.min(t, m.clip.dur), this.target);
      this.blendPose(dt);
      if (t >= m.dur) {
        this.spPhase = 1;
        this.spRushT = 0;
        this.spRushIdx = 0;
        this.startMove('SP_RUSH_A', dir);
        this.state = 'musou';
      }
    } else if (this.spPhase === 1) {
      this.spRushT += dt;
      if (dir) this.heading = angleDamp(this.heading, Math.atan2(dir.x, dir.z), 5, dt);
      const sp = 8.5;
      this.pos.x += Math.sin(this.heading) * sp * dt;
      this.pos.z += Math.cos(this.heading) * sp * dt;
      this.thrust(1.2, false);
      m.clip.sample(Math.min(t, m.clip.dur), this.target);
      this.blendPose(dt);
      if (prevT < 0.06 && t >= 0.06) {
        g.combat.heroStrike(this, { shape: 'arc', range: 5.2, arc: 220, dmg: 22, kb: 3, up: 3.5, sp: true }, ++this.hitSerial);
        g.audio.play('slash_fast', { vol: 0.55 });
      }
      if (t >= m.dur) {
        this.spRushIdx++;
        if (this.spRushT > 2.6) {
          this.spPhase = 2;
          this.startMove('SP_END', dir);
          this.state = 'musou';
        } else {
          this.startMove(this.spRushIdx % 2 ? 'SP_RUSH_B' : 'SP_RUSH_A', dir);
          this.state = 'musou';
        }
      }
    } else {
      m.clip.sample(Math.min(t, m.clip.dur), this.target);
      this.blendPose(dt);
      if (m.air) this.pos.y = this.airBase + curve(m.air, t);
      if (t < 0.4) this.thrust(1.8, true);
      if (m.giant) this.giant = t >= m.giant[0] && t <= m.giant[1] ? damp(this.giant, 6, 8, dt) : damp(this.giant, 1, 8, dt);
      m.hits.forEach((h, i) => {
        if (t >= h.t && prevT <= h.t1) g.combat.heroStrike(this, h, this.moveHitIds[i]);
      });
      if (prevT < 0.56 && t >= 0.56) g.audio.play('slash_down', { vol: 0.8 });
      if (prevT < m.slam && t >= m.slam) {
        this.impact(11, true, true);
        g.slowmo(0.25, 0.5);
      }
      if (t >= m.dur) {
        this.invuln = 0.6;
        this.giant = 1;
        this.setState('move');
        this.blendDur = 0.2;
      }
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

    // weapons
    const rifleMove = (this.state === 'attack' && this.move.rifle);
    const showRifle = rifleMove || this.rifleVis > 0;
    this.rifle.visible = showRifle;
    this.hilt.visible = !showRifle;
    const lit = !showRifle && (this.saberLit > 0 || this.state === 'musou');
    this.saberScale = damp(this.saberScale, lit ? 1 : 0, lit ? 22 : 10, dt);
    this.blade.visible = this.saberScale > 0.02;
    const len = 2.1 * this.saberScale * this.giant;
    const thick = 1 + (this.giant - 1) * 0.45;
    this.blade.scale.set(thick, thick, Math.max(0.001, len));
    const flick = 0.92 + Math.random() * 0.08;
    this.bladeOuter.material.color.copy(SABER_COLOR).multiplyScalar(flick);

    this.updateFlames(dt);
    rig.root.updateMatrixWorld(true);
    const swinging = (this.state === 'attack' && this.move.saber) || this.state === 'musou';
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    // blade tip speed drives the saber hum's swoosh
    if (dt > 1e-4) this.tipSpeed = damp(this.tipSpeed, this._tip.distanceTo(this._prevTip) / dt, 20, dt);
    this._prevTip.copy(this._tip);
    this.trail.push(this._base, this._tip, swinging && this.blade.visible);
    if (this.giant > 1.2) g.fx.aura(this._tip, 0xff5fd0, 2, 1.0);
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
    const swinging = (this.state === 'attack' && this.move.saber) || this.state === 'musou';
    return {
      x: this.pos.x, y: this.pos.y + this.lie * 0.45, z: this.pos.z, h: this.heading, st: this.state,
      hp: this.hp, hr: this.hpRed, mhp: this.maxHp, sp: this.sp, fl: Math.max(this.flash, this.armorFlash),
      pose: Array.from(this.pose), sab: this.saberScale, gi: this.giant, rf: this.rifle.visible, sw: swinging,
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
    this.rifle.visible = s.rf;
    this.hilt.visible = !s.rf;
    this.blade.visible = s.sab > 0.02;
    const len = 2.1 * s.sab * s.gi, thick = 1 + (s.gi - 1) * 0.45;
    this.blade.scale.set(thick, thick, Math.max(0.001, len));
    rig.root.updateMatrixWorld(true);
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
