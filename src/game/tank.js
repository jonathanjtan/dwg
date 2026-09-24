// Hayato's RX-75 Guntank: the co-op player's long-range support unit.
// J: 4-missile bursts (4th press: 8-missile salvo). K: twin 120mm cannon lob; after two bursts, a 6-shell barrage.
// Space: thruster hop. L/Shift: tread boost. I/F: full-burst SP. Treads turn the hull; the torso tracks targets.
import * as THREE from 'three';
import { RigObject, makePose, lerpPose, poseFrom, P, RPITCH, RY } from '../core/rig.js';
import { guntankDef } from '../models/suits.js';
import { clamp, damp, angleDamp, wrapAngle, rand } from '../core/util.js';

const SPEED = 8.8;
const GRAV = 30;
const TSTANCE = poseFrom({
  torso: [0.05, 0, 0], head: [0, 0, 0],
  uArmR: [-0.35, 0, -0.15], fArmR: [-1.25, 0, 0], uArmL: [-0.35, 0, 0.15], fArmL: [-1.25, 0, 0],
});

export class Tank {
  constructor(game) {
    this.game = game;
    this.rig = new RigObject(guntankDef());
    game.scene.add(this.rig.root);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.heading = 0;
    this.aim = 0; // torso yaw offset
    this.radius = 1.1;
    this.maxHp = 1500;
    this.hp = this.maxHp;
    this.maxSp = 100;
    this.sp = 30;
    this.spRate = 1.1;
    this.state = 'dead';
    this.stateT = 0;
    this.combo = 0;
    this.comboT = 0;
    this.queue = []; // scheduled shots {t, kind, ...}
    this.cool = 0;
    this.invuln = 0;
    this.flash = 0;
    this.respawnT = 0;
    this.pose = makePose();
    this.target = makePose();
    this.recoil = 0;
    this.pitchKick = 0;
    this.treadPhase = 0;
    this.serial = 5e6;
    this.name = 'guntank';
    this.rig.root.visible = false;
    this._v = new THREE.Vector3();
    this._r = [0, 0];
  }

  get alive() {
    return this.state !== 'dead' && this.state !== 'off';
  }

  spawn(x, z) {
    this.pos.set(x, 26, z);
    this.vel.set(0, -18, 0);
    this.hp = Math.max(this.hp, this.maxHp * 0.6);
    this.state = 'drop';
    this.stateT = 0;
    this.invuln = 2;
    this.rig.root.visible = true;
  }

  remove() {
    this.state = 'off';
    this.rig.root.visible = false;
  }

  // ---------- targeting ----------
  pickTargets(n, range, cone) {
    const g = this.game;
    const out = [];
    const face = this.heading + this.aim;
    const near = g.crowd.grid.query(this.pos.x, this.pos.z, range, []);
    const cands = [];
    for (const e of near) {
      if (!e.alive || e.state === 'dying' || e.state === 'drop') continue;
      const dx = e.x - this.pos.x, dz = e.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > range || d < 1.5) continue;
      if (Math.abs(wrapAngle(Math.atan2(dx, dz) - face)) > cone) continue;
      cands.push({ obj: e, d });
    }
    for (const c of g.commanders.list) {
      if (!c.alive || c.state === 'drop') continue;
      const dx = c.pos.x - this.pos.x, dz = c.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d <= range && Math.abs(wrapAngle(Math.atan2(dx, dz) - face)) <= cone) cands.push({ obj: c, d: d * 0.6 });
    }
    cands.sort((a, b) => a.d - b.d);
    for (let i = 0; i < n && cands.length; i++) out.push(cands[i % cands.length].obj);
    return out;
  }

  aimAt(obj) {
    const x = obj.x ?? obj.pos.x, z = obj.z ?? obj.pos.z;
    return wrapAngle(Math.atan2(x - this.pos.x, z - this.pos.z) - this.heading);
  }

  // ---------- main update ----------
  update(dt, act, dir) {
    const g = this.game;
    if (this.state === 'off') return;
    this.stateT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.flash = Math.max(0, this.flash - dt * 5);
    this.cool -= dt;
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;
    this.recoil = damp(this.recoil, 0, 10, dt);
    this.pitchKick = damp(this.pitchKick, 0, 6, dt);

    switch (this.state) {
      case 'dead':
        this.respawnT -= dt;
        if (this.respawnT <= 0 && g.mode === 'play') {
          const h = g.hero.pos;
          this.spawn(h.x + rand(-6, 6), h.z + rand(-6, 6));
          g.netEvent?.('toast', 'GUNTANK REDEPLOYED', '#7fd6e8');
        }
        return;
      case 'drop': {
        this.vel.y = -Math.max(4, Math.min(20, this.pos.y * 1.5));
        this.pos.y += this.vel.y * dt;
        this.thrust(1.4);
        if (this.pos.y <= 0) {
          this.pos.y = 0;
          this.state = 'move';
          g.fx.ring(this.pos, 0.5, 4.5, 0x9fdcff, 0.5);
          g.fx.dust(this.pos, 14, 1.3);
          g.audio.play('land', { at: this.pos });
        }
        break;
      }
      case 'move':
      case 'air': {
        if (act.musou && this.sp >= this.maxSp) { this.startMusou(); break; }
        if (act.jump && this.state === 'move') {
          this.state = 'air';
          this.vel.y = 10.5;
          g.audio.play('boost', { vol: 0.6, at: this.pos });
          g.fx.dust(this.pos, 8, 1);
        }
        if (act.dodge) { this.dodge(dir); break; }
        if (act.attack && this.cool <= 0) this.burst();
        if (act.charge && this.cool <= 0) this.cannon();
        this.drive(dt, dir, this.state === 'air' ? 0.8 : 1);
        if (this.state === 'air') {
          this.vel.y -= GRAV * dt;
          this.pos.y += this.vel.y * dt;
          if (this.vel.y > 0) this.thrust(1.1);
          if (this.pos.y <= 0) {
            this.pos.y = 0;
            this.vel.y = 0;
            this.state = 'move';
            g.fx.dust(this.pos, 8, 1);
            g.audio.play('land', { vol: 0.6, at: this.pos });
          }
        }
        break;
      }
      case 'dodge': {
        const u = this.stateT / 0.38;
        const sp = 24 * Math.pow(1 - Math.min(1, u), 1.4) + 2;
        this.pos.x += this.dodgeDir.x * sp * dt;
        this.pos.z += this.dodgeDir.z * sp * dt;
        this.thrust(1.3);
        if (Math.random() < 0.6) g.fx.dust(this._v.set(this.pos.x, 0.1, this.pos.z), 1, 0.7);
        if (this.stateT > 0.38) this.state = 'move';
        break;
      }
      case 'hurt':
        this.vel.x = damp(this.vel.x, 0, 8, dt);
        this.vel.z = damp(this.vel.z, 0, 8, dt);
        this.pos.x += this.vel.x * dt;
        this.pos.z += this.vel.z * dt;
        if (this.stateT > 0.3) this.state = 'move';
        break;
      case 'down':
        this.vel.x = damp(this.vel.x, 0, 4, dt);
        this.vel.z = damp(this.vel.z, 0, 4, dt);
        this.pos.x += this.vel.x * dt;
        this.pos.z += this.vel.z * dt;
        if (Math.random() < dt * 8) g.fx.puff(this._v.set(this.pos.x, 2.2, this.pos.z), 1, 0.3, 0.8, 2, 1);
        if (this.stateT > 0.9) { this.state = 'move'; this.invuln = 0.8; }
        break;
      case 'musou':
        this.updateMusou(dt, dir);
        break;
    }

    // scheduled volleys
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i];
      q.t -= dt;
      if (q.t > 0) continue;
      this.queue.splice(i, 1);
      this.fireQueued(q);
    }

    // torso tracks the nearest threat ahead while idle
    if (this.state !== 'musou' && this.queue.length === 0) {
      const tg = this.pickTargets(1, 26, 1.6)[0];
      this.aim = angleDamp(this.aim, tg ? this.aimAt(tg) : 0, 5, dt);
      this.aim = clamp(this.aim, -1.6, 1.6);
    }

    const r = g.world.resolve(this.pos.x, this.pos.z, this.radius, this._r);
    this.pos.x = r[0];
    this.pos.z = r[1];
    this.applyVisuals(dt);
  }

  drive(dt, dir, mul) {
    const g = this.game;
    let want = 0;
    if (dir) {
      const target = Math.atan2(dir.x, dir.z);
      const diff = wrapAngle(target - this.heading);
      this.heading = angleDamp(this.heading, target, 5.5, dt);
      want = SPEED * dir.mag * Math.max(0.25, Math.cos(diff)) * mul;
    }
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const sp = damp(Math.hypot(this.vel.x, this.vel.z), want, want > 0 ? 5 : 8, dt);
    this.vel.x = fx * sp;
    this.vel.z = fz * sp;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.treadPhase += sp * dt;
    if (sp > 2 && this.pos.y < 0.1 && Math.random() < dt * 14) {
      const side = Math.random() < 0.5 ? -0.6 : 0.6;
      g.fx.dust(this._v.set(this.pos.x - fx * 0.9 + fz * side, 0.1, this.pos.z - fz * 0.9 - fx * side), 1, 0.55);
    }
  }

  dodge(dir) {
    const g = this.game;
    const d = dir || { x: -Math.sin(this.heading), z: -Math.cos(this.heading) };
    this.dodgeDir = { x: d.x, z: d.z };
    this.state = 'dodge';
    this.stateT = 0;
    this.invuln = 0.3;
    g.audio.play('boost', { at: this.pos });
  }

  // ---------- weapons ----------
  burst() {
    const g = this.game;
    this.combo = Math.min(4, this.combo + 1);
    this.comboT = 0.9;
    const salvo = this.combo === 4;
    const n = salvo ? 8 : 4;
    const targets = this.pickTargets(n, 34, salvo ? 1.2 : 0.9);
    if (targets[0]) this.aim = this.aimAt(targets[0]);
    for (let i = 0; i < n; i++) this.queue.push({ t: i * (salvo ? 0.05 : 0.07), kind: 'missile', arm: i % 2, target: targets[i] || null, spread: salvo ? (i - n / 2) * 0.12 : rand(-0.1, 0.1) });
    this.cool = salvo ? 0.6 : 0.3;
    if (salvo) this.combo = 0;
  }

  cannon() {
    const g = this.game;
    const barrage = this.combo >= 2;
    const targets = this.pickTargets(barrage ? 6 : 1, 46, barrage ? 1.0 : 0.7);
    const face = this.heading + this.aim;
    if (targets[0]) this.aim = this.aimAt(targets[0]);
    const pointFor = (tg, i) => {
      if (tg) return { x: tg.x ?? tg.pos.x, z: tg.z ?? tg.pos.z };
      const d = 22 + i * 3, a = face + (i - 2.5) * 0.12;
      return { x: this.pos.x + Math.sin(a) * d, z: this.pos.z + Math.cos(a) * d };
    };
    const shots = barrage ? 6 : 2;
    for (let i = 0; i < shots; i++) this.queue.push({ t: 0.18 + i * (barrage ? 0.16 : 0.06), kind: 'shell', side: i % 2, point: pointFor(targets[i] || (barrage ? null : targets[0]), i) });
    this.cool = barrage ? 1.3 : 0.75;
    this.combo = 0;
    g.audio.play('charge', { vol: 0.4, at: this.pos });
  }

  muzzle(kind, side, out) {
    const node = kind === 'shell' ? this.rig.nodes.torso : this.rig.nodes[side ? 'fArmL' : 'fArmR'];
    this.rig.root.updateMatrixWorld(true);
    if (kind === 'shell') return node.localToWorld(out.set(side ? 0.6 : -0.6, 0.78, 1.65));
    return node.localToWorld(out.set(0, -0.72, 0));
  }

  fireQueued(q) {
    const g = this.game;
    const from = this.muzzle(q.kind, q.kind === 'shell' ? q.side : q.arm, new THREE.Vector3());
    if (q.kind === 'missile') {
      const face = this.heading + this.aim + (q.spread || 0);
      const dir = new THREE.Vector3(Math.sin(face), 0.35, Math.cos(face)).normalize();
      g.projectiles.tankMissile(this, from, dir, q.target && q.target.alive ? q.target : null);
      g.fx.sparks(from, 4, 0xffd080, 6, 0.6, dir);
      g.fx.puff(from, 1, 0.5, 0.5, 1, 1);
      g.audio.play('mg', { vol: 0.5, pitch: 1.6, at: from });
      this.recoil = 1;
    } else {
      g.projectiles.tankShell(this, from, q.point);
      g.fx.hit(from, 0xffc060, true);
      g.fx.puff(from, 4, 0.45, 1, 1.5, 2);
      g.fx.light(from, 0xffb060, 40, 12, 0.2);
      g.audio.play('rifle', { vol: 0.7, pitch: 0.55, at: from });
      g.audio.play('slam', { vol: 0.5, at: from });
      this.pitchKick = 1;
      if (g.local === this) g.camera.shake(0.12);
      else g.netEvent('shake', 0.12);
    }
  }

  startMusou() {
    const g = this.game;
    this.sp = 0;
    this.state = 'musou';
    this.stateT = 0;
    this.invuln = 99;
    this.musouShot = 0;
    this.musouShell = 0;
    g.fx.ring(this.pos, 0.5, 8, 0x7fd6e8, 0.6);
    g.combat.aoe(this, this.pos.x, 0, this.pos.z, 6, 5, 11, 3, ++this.serial);
    g.audio.play('sp', { at: this.pos });
    g.onMusou(this);
  }

  updateMusou(dt, dir) {
    const g = this.game;
    const t = this.stateT;
    if (dir) this.heading = angleDamp(this.heading, Math.atan2(dir.x, dir.z), 2, dt);
    g.fx.aura(this.pos, 0x7fd6e8, 2, 1.6);
    if (t > 0.6 && t < 3.0) {
      this.musouShot -= dt;
      this.musouShell -= dt;
      this.aim = Math.sin(t * 3.1) * 1.2;
      if (this.musouShot <= 0) {
        this.musouShot = 0.055;
        const tg = this.pickTargets(6, 38, 2.2);
        this.queue.push({ t: 0, kind: 'missile', arm: (t * 20) & 1, target: tg[(Math.random() * tg.length) | 0] || null, spread: rand(-0.4, 0.4) });
      }
      if (this.musouShell <= 0) {
        this.musouShell = 0.32;
        const tg = this.pickTargets(4, 44, 2.4);
        for (let s = 0; s < 2; s++) {
          const e = tg[(Math.random() * tg.length) | 0];
          const a = this.heading + rand(-1.4, 1.4), d = rand(12, 30);
          this.queue.push({ t: s * 0.06, kind: 'shell', side: s, point: e ? { x: e.x ?? e.pos.x, z: e.z ?? e.pos.z } : { x: this.pos.x + Math.sin(a) * d, z: this.pos.z + Math.cos(a) * d } });
        }
      }
    }
    if (t >= 3.3) {
      // finisher: a ring of shells lands all around
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2, d = 9 + (i % 2) * 5;
        this.queue.push({ t: i * 0.03, kind: 'shell', side: i % 2, point: { x: this.pos.x + Math.sin(a) * d, z: this.pos.z + Math.cos(a) * d } });
      }
      this.state = 'move';
      this.invuln = 1.2;
    }
  }

  thrust(strength) {
    const g = this.game;
    this.thrustAt = g.time;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    for (const side of [-0.5, 0.5]) {
      g.fx.thruster(this._v.set(this.pos.x - fx * 0.8 + fz * side, this.pos.y + 0.6, this.pos.z - fz * 0.8 - fx * side), { x: -fx * 0.3, y: -1, z: -fz * 0.3 }, 0x9fdcff, strength);
    }
  }

  // ---------- damage ----------
  takeHit(dmg, fromX, fromZ, heavy = false, kind = 'melee') {
    const g = this.game;
    if (!this.alive || this.invuln > 0 || this.state === 'musou' || this.state === 'drop' || this.state === 'dodge' || this.state === 'down') return false;
    dmg = Math.round(dmg * g.difficulty.dmgTaken * 0.9);
    this.hp = Math.max(0, this.hp - dmg);
    this.sp = Math.min(this.maxSp, this.sp + dmg * 0.08);
    this.flash = kind === 'bullet' ? 0.35 : 1;
    if (kind !== 'bullet') { if (g.local === this) g.hud.hurt(); else g.netEvent('hurt'); }
    if (kind !== 'bullet') g.fx.hit(this._v.set(this.pos.x, this.pos.y + 1.6, this.pos.z), 0xffa040);
    g.audio.play('hurt', { vol: kind === 'bullet' ? 0.3 : 0.9, at: this.pos });
    if (this.hp <= 0) { this.die(); return true; }
    if (kind === 'bullet') return true;
    const dx = this.pos.x - fromX, dz = this.pos.z - fromZ, l = Math.hypot(dx, dz) || 1;
    this.vel.set((dx / l) * (heavy ? 7 : 3), 0, (dz / l) * (heavy ? 7 : 3));
    this.state = heavy ? 'down' : 'hurt';
    this.stateT = 0;
    return true;
  }

  die() {
    const g = this.game;
    this.state = 'dead';
    this.hp = 0;
    this.respawnT = 8;
    this.queue.length = 0;
    this.rig.root.visible = false;
    g.fx.explode(this._v.set(this.pos.x, 1.4, this.pos.z), 1.8, [0x2f55b0, 0xdde2ea, 0x2a2c30]);
    g.audio.play('bigboom', { at: this.pos });
    g.hud.announce('GUNTANK DOWN', 'REDEPLOYING IN 8 SECONDS', true);
  }

  // ---------- visuals ----------
  computePose(dt) {
    const t = this.target;
    t.set(TSTANCE);
    const moving = Math.hypot(this.vel.x, this.vel.z);
    t[P.torso * 3 + 1] = this.aim;
    t[P.torso * 3] = 0.05 - this.pitchKick * 0.3 + (this.state === 'hurt' ? -0.35 : 0);
    t[P.head * 3] = this.pitchKick * 0.15;
    // arms raise toward the aim and kick on each missile
    const firing = this.queue.length > 0 || this.state === 'musou';
    const armUp = firing ? -0.9 : -0.35;
    t[P.uArmR * 3] = armUp + this.recoil * 0.25;
    t[P.uArmL * 3] = armUp + this.recoil * 0.25;
    t[P.fArmR * 3] = -1.25 + (firing ? 0.35 : 0) + this.recoil * 0.2;
    t[P.fArmL * 3] = -1.25 + (firing ? 0.35 : 0) + this.recoil * 0.2;
    // suspension bob + rock when stunned
    t[RY] = Math.sin(this.treadPhase * 3) * 0.03 * Math.min(1, moving / 4);
    t[RPITCH] = this.state === 'down' ? -0.25 + Math.sin(this.stateT * 20) * 0.05 : -this.pitchKick * 0.06;
    lerpPose(this.pose, this.pose, t, 1 - Math.exp(-18 * dt));
  }

  applyVisuals(dt) {
    const rig = this.rig;
    rig.root.visible = this.alive;
    this.computePose(dt);
    rig.root.position.copy(this.pos);
    rig.root.rotation.y = this.heading;
    rig.applyPose(this.pose);
    rig.setFlash(this.flash * 0.35, 0xff5030);
  }

  // ---------- co-op replication ----------
  netState() {
    return {
      x: this.pos.x, y: this.pos.y, z: this.pos.z, h: this.heading, a: this.aim, st: this.state,
      hp: this.hp, mhp: this.maxHp, sp: this.sp, fl: this.flash, pose: Array.from(this.pose),
      thr: this.thrustAt && this.game.time - this.thrustAt < 0.06 ? 1 : 0, rt: this.respawnT,
    };
  }

  // Guest-side: drive the rig from a network snapshot (position is interpolated by the caller).
  applyNet(s, dt) {
    this.state = s.st;
    this.hp = s.hp;
    this.sp = s.sp;
    this.flash = s.fl;
    this.respawnT = s.rt;
    this.heading = s.h;
    this.aim = s.a;
    this.pose.set(s.pose);
    if (s.thr) this.thrust(1.2);
    if (s.st === 'musou') this.game.fx.aura(this.pos, 0x7fd6e8, 2, 1.6);
    this.rig.root.visible = s.st !== 'dead' && s.st !== 'off';
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.heading;
    this.rig.applyPose(this.pose);
    this.rig.setFlash(this.flash * 0.35, 0xff5030);
  }
}
