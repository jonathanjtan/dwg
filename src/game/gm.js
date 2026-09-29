// The RGM-79 GM: the Federation's mass-produced mobile suit, flown by a nameless GM team leader. A pink beam saber,
// the beam spray gun (a short-range gun it holds at rest, as in Reborn) and a long shield it fights with as much as
// it hides behind. Tuned below the Gundam and above the Ball: a real mobile suit, but a production model.
import * as THREE from 'three';
import { P } from '../core/rig.js';
import { gmDef, GM as GM_COLORS, GM_R, GM_MUZZLE } from '../models/gm.js';
import { MOVES, STANCE, BLADE } from './gm_moves.js';
import { Hero, FLASH } from './hero.js';
import { damp, lerp } from '../core/util.js';
import { Trail } from '../fx/fx.js';

const WEAPON_ID = { saber: 1, gun: 2 };
const WEAPON_OF = [null, 'saber', 'gun'];
const PINK = 0xff8ad8;
const SWIRL = 0x7fffc8; // the green-teal swirl Reborn closes the GM's SPs with
// Beam spray gun rounds: short-range beams that stop at the first thing they hit (pierce: 1) and only make it flinch.
// Light: five mashed shots take two seconds and do about 60% of what the saber string does in that time.
const SPRAY = { dmg: 13, kb: 1.5, up: 0, w: 0.8, r: 0.7, speed: 105, max: 0.32, pierce: 1 };
const CS_SHOT = { dmg: 22, kb: 7, up: 4, w: 1.7, r: 1.1, speed: 115, max: 0.36 }; // the charge burst, first two
const CS_LAST = { dmg: 30, kb: 12, up: 8, big: true, w: 2.2, r: 1.3, speed: 115, max: 0.38 }; // ...and the one that throws
const FAN = { dmg: 9, kb: 2, up: 0, w: 0.9, r: 0.7, speed: 100, max: 0.3, pierce: 1 }; // C3's spread volleys
const DOWN = { dmg: 14, kb: 4, up: 1.5, w: 1, r: 0.8, speed: 105, max: 0.3, pierce: 1 }; // C5 / JC, down at a target
const UP = { dmg: 18, kb: 5, up: 5, big: true, w: 1.3, r: 0.9, speed: 110, max: 0.3, pierce: 1 }; // DC, up into the launched target
const SP_SHOT = { dmg: 16, kb: 3, up: 3, sp: true, w: 0.95, r: 0.9, speed: 120, max: 0.4 };
const SWEEP = { dmg: 11, kb: 3, up: 1, sp: true, w: 1.1, r: 0.8, speed: 110, max: 0.34 }; // the held SP's sweep
const SP_FIN = { dmg: 26, kb: 10, up: 6, sp: true, w: 2, r: 1.3, speed: 115, max: 0.4 };
const SABER_COLOR = new THREE.Color(3.1, 0.6, 2.1);
const SABER_TRAIL = 0xff5fc8;

export const GM_SUIT = {
  id: 'gm', pilot: 'gm', def: (R = GM_R) => gmDef(GM_COLORS, R), moves: MOVES, stance: STANCE, guns: ['gun'],
  // Reborn's spec sheet: armor 9746, mobility 465, thruster 820, defense 115. Its blows (power, a shorter blade), speed
  // and thrusters sit below the Gundam's; its staying power (1150 HP at defense 0.98) about level, which is what lets it
  // take Char about half the time in autoplay (the Gundam nearly always, the Ball about 40%).
  hp: 1150, run: 8.6, boostSpeed: 21, boostTime: 1.7, sprintSpeed: 16.8, defense: 0.98, power: 0.92,
  nozzles: [[-0.13, 0.1, -0.34], [0.13, 0.1, -0.34]], // the backpack's two thrusters
  debris: [0xe4e3da, 0xc8302a, 0x676b74], spAirY: 3.2, spAirReach: 6,
  spColor: 0x9fffd8, spDome: 0xbfffe4, spAura: SWIRL,
  airPose: { uArmR: [-0.5, 0, -0.5], fArmR: [-0.6, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.6, 0, 0.5], fArmL: [-1.2, 0, 0] },
  boostPose: { uArmR: [0.5, 0, -0.4], fArmR: [-0.4, 0, 0], hand: [1.3, 0, 0], uArmL: [0.2, 0, 0.45], fArmL: [-1.2, 0, 0] },
  // mid-weight: a shade longer and lower in the stride than the Gundam, lighter on its feet than the Guncannon
  gait: { stride: 1.52, duty: [0.6, 0.34], crouch: 0.065, impact: 0.042, sway: 0.042, roll: 0.055, lat: 0.037, turn: 0.115, lean: 0.29, arm: [0.08, 0.08] },
};

export class GM extends Hero {
  constructor(game) {
    super(game, GM_SUIT);
  }

  buildWeapons() {
    const n = this.rig.nodes;
    n.blade.visible = false; // the crowd's short glowing blade; the suit draws its own
    this.saberLit = 0;
    this.blade = new THREE.Group();
    this.blade.position.z = 0.2;
    const outerGeo = new THREE.BoxGeometry(0.16, 0.16, 1).translate(0, 0, 0.5);
    const coreGeo = new THREE.BoxGeometry(0.065, 0.065, 1.02).translate(0, 0, 0.5);
    this.bladeOuter = new THREE.Mesh(outerGeo, new THREE.MeshBasicMaterial({
      color: SABER_COLOR, toneMapped: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.bladeCore = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 3), toneMapped: false }));
    this.blade.add(this.bladeOuter, this.bladeCore);
    n.hand.add(this.blade);
    this.trail = new Trail(this.scene, SABER_TRAIL, 16);
    this.scene.remove(this.trail.mesh);
    this.own(this.trail.mesh);
    this._base = new THREE.Vector3();
    this._tip = new THREE.Vector3();
    this._prevTip = new THREE.Vector3();
    this._from = new THREE.Vector3();
    this._dir = new THREE.Vector3();
  }

  preUpdate(dt) {
    this.saberLit -= dt;
  }

  onMoveStart(m, w) {
    if (m.dive) this.spAirY = m.dive; // the aerial SP's ram comes down to the ground
    if (w === 'saber' && this.saberScale < 0.3) this.game.audio.play('ignite');
  }

  onWeapon(w) {
    const g = this.game;
    if (w === 'saber' && this.saberScale < 0.3) g.audio.play('ignite');
    else if (w === 'gun') g.audio.play('draw', { vol: 0.5, pitch: 1.2 });
  }

  onMoveTick() {
    // as in Reborn the blade goes out as soon as the attack ends; the short hold only bridges one move into the next
    if (this.wpn === 'saber') this.saberLit = 0.12;
    else if (this.wpn) this.saberLit = 0;
  }

  onInterrupt() {
    this.saberLit = 0;
  }

  // outside attacks a lit saber is carried angled up and back, so the blade doesn't plough the ground
  carryPose(t) {
    if (this.saberScale > 0.05 && this.state !== 'attack' && this.state !== 'musou') {
      const h = P.hand * 3;
      t[h] = lerp(t[h], -2.0 - (t[P.uArmR * 3] + t[P.fArmR * 3]), Math.min(1, this.saberScale));
    }
  }

  suitEvent(name, arg) {
    const g = this.game;
    const P0 = this.pos;
    switch (name) {
      case 'hopback': // CS: as in Reborn, the thrusters hop the GM back ~0.4 of its height as it fires
        this.vel.x -= Math.sin(this.aimYaw) * 13;
        this.vel.z -= Math.cos(this.aimYaw) * 13;
        break;
      case 'shieldhit': { // the shield, lit gold, driven into the target
        this.rig.root.updateMatrixWorld(true);
        const p = this.rig.nodes.handL.localToWorld(this._v.set(0.12, -0.5, 0));
        g.fx.star(p, FLASH.gold, 2.2);
        g.fx.sparks(p, 14, 0xffd070, 13);
        g.fx.light(p, 0xffc860, 90, 14, 0.25);
        break;
      }
      case 'swirl': { // the green swirl that closes the SP, throwing what's close
        const c = this._w.set(P0.x, P0.y + (arg === 'air' ? 0.5 : 0.2), P0.z);
        g.fx.ring(c, 0.5, 7, SWIRL, 0.5, c.y);
        g.fx.ring(c, 0.4, 4.5, 0xdfffee, 0.35, c.y + 1.4, [0.35, -0.2]);
        g.fx.aura(c, SWIRL, 26, 2.6);
        g.fx.sparks(this._v.set(c.x, c.y + 2, c.z), 24, 0xbfffe4, 12);
        g.fx.dome(this._v.set(c.x, P0.y, c.z), 1, 6.5, SWIRL, 0.6);
        g.fx.light(c, SWIRL, 150, 22, 0.45);
        g.audio.play('burst', { vol: 0.8 });
        if (g.local === this) { g.camera.shake(0.5); g.aberr(0.6); }
        break;
      }
    }
  }

  muzzle(out) {
    return this.rig.nodes.gun.localToWorld(out.set(0, 0, GM_MUZZLE));
  }

  // A launched target for the shots that go up (or down) after one, else a point out ahead at height y.
  airPoint(y, out) {
    const t = this.airborneAhead();
    if (t) return out.set(t.x ?? t.pos.x, (t.y ?? t.pos?.y ?? 0) + 1.6, t.z ?? t.pos.z);
    return out.set(this.pos.x + Math.sin(this.heading) * 7, y, this.pos.z + Math.cos(this.heading) * 7);
  }

  fire(shot) {
    const g = this.game;
    const from = this._from, dir = this._dir;
    let spec = SPRAY;
    if (shot.kind === 'up' || shot.kind === 'spup' || shot.kind === 'down') {
      // up at a launched target, or down from the air at one (or at the ground ahead)
      let p;
      if (shot.kind === 'down') {
        const t = this.airborneAhead() || this.aimAt(this.heading, 20, 0.8);
        p = t ? this._w.set(t.x ?? t.pos.x, (t.y ?? t.pos?.y ?? 0) + 1.2, t.z ?? t.pos.z)
          : this._w.set(this.pos.x + Math.sin(this.heading) * 7, 0, this.pos.z + Math.cos(this.heading) * 7);
        spec = DOWN;
      } else {
        p = this.airPoint(this.pos.y + 7, this._w);
        spec = shot.kind === 'up' ? UP : SP_SHOT;
      }
      this.aimGunTo(p.x, p.y, p.z, from);
      dir.set(p.x - from.x, p.y - from.y, p.z - from.z).normalize();
    } else if (shot.kind === 'sweep' || shot.kind === 'spfan') {
      // one shot at a time swept across the front: the gun is swung onto each shot's line
      const a = this.aimYaw + shot.ang;
      this.muzzle(from);
      const p = this._w.set(from.x + Math.sin(a) * 40, from.y, from.z + Math.cos(a) * 40);
      this.aimGunTo(p.x, p.y, p.z, from);
      dir.set(p.x - from.x, p.y - from.y, p.z - from.z).normalize();
      spec = shot.kind === 'sweep' ? SWEEP : SP_SHOT;
    } else if (shot.ang !== undefined) {
      // a spread volley, all its rounds at once: the gun points down the middle of the fan
      const a = this.aimYaw + shot.ang;
      this.gunAim = null;
      this.aimGun(true);
      this.muzzle(from);
      dir.set(Math.sin(a), 0, Math.cos(a));
      spec = shot.kind === 'fan' ? FAN : SP_FIN;
    } else {
      // a straight shot: the nearest enemy in the gun's lane, the gun swung onto it
      const tgt = this.aimAt(this.aimYaw, 30, 0.6);
      const aim = tgt ? Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z) : this.aimYaw;
      this.aimShot(aim, tgt);
      this.muzzle(from);
      dir.set(Math.sin(aim), 0, Math.cos(aim));
      if (shot.kind === 'cs') spec = shot.last ? CS_LAST : CS_SHOT;
    }
    g.projectiles.heroBeam(this, from, dir, spec);
    const heavy = spec === CS_SHOT || spec === CS_LAST || spec === SP_FIN;
    g.fx.muzzle(from, dir, PINK, heavy ? 1.2 : 0.7);
    if (heavy) g.fx.ring(from, 0.2, 1.6, PINK, 0.2, from.y);
    // no recoil on the suit: the charge burst's hop back is its own event, as in the footage
    g.audio.play(heavy ? 'spray_cs' : 'spray', { vol: spec.sp && !heavy ? 0.55 : 0.8 });
    if (g.local === this) {
      g.camera.kick(heavy ? 4 : 1.5);
      if (heavy) g.camera.shake(0.3);
    }
  }

  // in a move: what the move holds; otherwise the spray gun, unless the saber is still lit from the last cut
  heldWeapon(inMove) {
    if (inMove && this.wpn) return this.wpn;
    return this.saberLit > 0 ? 'saber' : 'gun';
  }

  showWeapon(wpn) {
    const n = this.rig.nodes;
    n.saber.visible = wpn === 'saber';
    n.gun.visible = wpn !== 'saber';
  }

  preVisuals(dt, inMove) {
    const wpn = this.heldWeapon(inMove);
    this.showWeapon(wpn);
    const lit = wpn === 'saber';
    this.saberScale = damp(this.saberScale, lit ? 1 : 0, lit ? 22 : 24, dt);
    this.setBlade(this.saberScale);
    this.bladeOuter.material.color.copy(SABER_COLOR).multiplyScalar(0.92 + Math.random() * 0.08);
  }

  postVisuals(dt, inMove) {
    const swinging = inMove && this.wpn === 'saber';
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    // blade tip speed drives the saber hum's swoosh
    if (dt > 1e-4) this.tipSpeed = damp(this.tipSpeed, this._tip.distanceTo(this._prevTip) / dt, 20, dt);
    this._prevTip.copy(this._tip);
    this.trail.push(this._base, this._tip, swinging && this.blade.visible);
  }

  setBlade(s) {
    this.blade.visible = s > 0.02;
    this.blade.scale.set(1, 1, Math.max(0.001, BLADE * s));
  }

  netExtras() {
    const inMove = this.state === 'attack' || this.state === 'musou';
    const wpn = this.heldWeapon(inMove);
    return { sab: this.saberScale, wp: WEAPON_ID[wpn] || 0, sw: inMove && wpn === 'saber' };
  }

  applyNetExtras(s) {
    this.showWeapon(WEAPON_OF[s.wp || 0]);
    this.setBlade(s.sab || 0);
    this.rig.root.updateMatrixWorld(true);
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    this.trail.push(this._base, this._tip, s.sw && this.blade.visible);
  }
}
