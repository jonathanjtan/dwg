// Riddhe Marcenas's MSN-001A1 Delta Plus: beam saber (also fixed on the rifle as a bayonet), the two beam sabers in
// its shield, beam rifle, a shield-mounted grenade launcher and the waverider's beam cannon. C4, the Transform Shot
// (boost twice) and the SP fold the suit into its waverider flight mode (faked with a pose - arms swept back, torso
// pitched flat, legs tucked, shield forward - rather than a separate model).
import * as THREE from 'three';
import { voxelMesh } from '../core/voxel.js';
import { P } from '../core/rig.js';
import { deltaplusDef, deltaplusWeapons, DELTAPLUS_VOXEL } from '../models/deltaplus.js';
import { MOVES, STANCE, BLADE } from './deltaplus_moves.js';
import { Hero, FLASH } from './hero.js';
import { damp, lerp } from '../core/util.js';
import { Trail } from '../fx/fx.js';

const WEAPON_ID = { saber: 1, rifle: 2, twin: 3, shieldSaber: 4, bayonet: 5 };
const WEAPON_OF = [null, 'saber', 'rifle', 'twin', 'shieldSaber', 'bayonet'];
const RIFLE_SHOT = { dmg: 13, kb: 2.5, up: 0, pierce: 1 }; // K: a flinch, stopped by the first body it hits (Reborn)
const CHARGE_SHOT = { dmg: 74, kb: 10, up: 10, big: true, w: 2.4, r: 1.5, speed: 112 };
const CANNON_SHOT = { dmg: 56, kb: 10, up: 6, big: true, w: 2.6, r: 1.6, speed: 118 }; // Transform Shot, from the nose
const SP_SHOT = { dmg: 30, kb: 3, up: 2, big: true, w: 1.8, r: 1.2, sp: true }; // the SP's three shots down
// the air SP's concentrated beam (a bolt every 0.07 s, no hit-stop) and the swipe that ends it
const SPA_BEAM_SHOT = { dmg: 9, kb: 1, up: 0.5, w: 2.4, r: 1.8, speed: 140, max: 0.35, sp: true };
const SPA_SWIPE_SHOT = { dmg: 20, kb: 10, up: 5, big: true, w: 2.6, r: 1.6, speed: 140, max: 0.3, sp: true };
// Grenade launcher rounds: a single aimed shot (DAF / DC, and C3F's two), a three-way fan and a lighter aerial round.
const GRENADE = { speed: 48, fuse: 0.5, r: 3.6, dmg: 30, kb: 6, up: 4, big: true, sound: 'bzboom' };
const GRENADE_SPREAD = { speed: 52, fuse: 0.42, r: 3.0, dmg: 20, kb: 5, up: 3, big: true, sound: 'bzboom' };
const GRENADE_AIR = { speed: 50, fuse: 0.4, r: 2.8, dmg: 15, kb: 3, up: 2, lite: true, sp: true, sound: 'bzboom' };
const THRUST = { shape: 'line', len: 6.4, width: 2.4, dmg: 14, kb: 0.4, up: 0, pull: 1.4, stop: 1 }; // C3's shield thrust
const SABER_COLOR = new THREE.Color(0.9, 2.6, 3.4);
const SABER_TRAIL = 0x5fc8ff;

export const DELTAPLUS = {
  id: 'deltaplus', pilot: 'riddhe', def: deltaplusDef, moves: MOVES, stance: STANCE,
  hp: 1200, run: 9.6, boostSpeed: 24, boostTime: 2.0, sprintSpeed: 18.5, defense: 1.02, power: 1.05,
  nozzles: [[-0.14, 0.12, -0.34], [0.14, 0.12, -0.34]], // the backpack's two thrusters
  debris: [0xe8ebf2, 0x364683, 0xa8283a], spAirY: 2.2, spAirReach: 9, // the air SP hovers low, as in Reborn
  impactColor: 0x8fe0ff, ringColor: 0xbfeeff, impactLight: 0x8fe0ff, domeColor: 0x7fd0ff,
  spColor: 0xffc860, spDome: 0xffe0a0, spAura: 0xffc860, hitColor: 0xcfeeff,
  gait: { lean: 0.3 },
};

export class DeltaPlus extends Hero {
  constructor(game) {
    super(game, DELTAPLUS);
  }

  buildWeapons() {
    const w = deltaplusWeapons();
    const hand = this.rig.nodes.hand;
    this.saberLit = 0;
    this.rifleVis = 0;
    this.hilt = voxelMesh(w.hilt, { scale: DELTAPLUS_VOXEL });
    hand.add(this.hilt);
    this.blade = new THREE.Group();
    this.blade.position.z = 0.3;
    const outerGeo = new THREE.BoxGeometry(0.16, 0.16, 1).translate(0, 0, 0.5);
    const coreGeo = new THREE.BoxGeometry(0.065, 0.065, 1.02).translate(0, 0, 0.5);
    this.bladeOuter = new THREE.Mesh(outerGeo, new THREE.MeshBasicMaterial({
      color: SABER_COLOR, toneMapped: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.bladeCore = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 3, 3.2), toneMapped: false }));
    this.blade.add(this.bladeOuter, this.bladeCore);
    hand.add(this.blade);
    // the shield's beam sabers: one blade out of its tip, lit for the twin slash (N4) and C3's thrust
    this.bladeS = new THREE.Group();
    this.bladeS.position.set(0.25, -0.55, 1.5);
    this.bladeS.add(new THREE.Mesh(outerGeo, this.bladeOuter.material), new THREE.Mesh(coreGeo, this.bladeCore.material));
    this.rig.nodes.handL.add(this.bladeS);
    this.bladeS.visible = false;
    this.shieldScale = 0;
    this.rifle = voxelMesh(w.rifle, { scale: DELTAPLUS_VOXEL });
    this.rifle.position.set(0, -0.05, 0);
    hand.add(this.rifle);
    this.rifle.visible = false;
    this.trail = new Trail(this.scene, SABER_TRAIL, 16);
    this.scene.remove(this.trail.mesh);
    this.own(this.trail.mesh);
    this._base = new THREE.Vector3();
    this._tip = new THREE.Vector3();
    this._prevTip = new THREE.Vector3();
  }

  preUpdate(dt) {
    this.saberLit -= dt;
    this.rifleVis -= dt;
  }

  // Boost twice (a second tap while the first quick boost is still running) folds the suit into waverider mode: the
  // Transform Shot's run. Caught here, ahead of the hero's own update, so no other suit is touched.
  update(dt, act, input) {
    if (act.dodge && this.state === 'dodge' && this.stateT > 0.04 && this.alive) {
      this.comboStep = 0;
      this.startMove('TS');
      act = { ...act, dodge: false };
    }
    super.update(dt, act, input);
  }

  // C3's K follow-up only comes out if the shield thrust connected (the wiki: "if it connects, tap K").
  startMove(name, dir) {
    if (name === 'C3F' && !this.c3Hit) { this.buffer = null; return; }
    return super.startMove(name, dir);
  }

  onMoveStart(m, w) {
    if ((w === 'saber' || w === 'twin' || w === 'bayonet') && this.saberScale < 0.3) this.game.audio.play('ignite');
    if (m === this.moves.C3) this.c3Hit = false;
    if (!m.sp) this.orbitC = null;
  }

  onMoveTick(m, t, prevT, dt) {
    const w = this.wpn;
    // the blade goes out as soon as the attack ends; the short hold only bridges one move into the next
    if (w === 'saber' || w === 'twin' || w === 'bayonet') this.saberLit = 0.12;
    else if (w) this.saberLit = 0;
    if (w === 'rifle' || w === 'bayonet') this.rifleVis = 0.6;
    if (m.orbit) this.orbitStep(m.orbit, t, dt);
    // the air SP's swipe: the suit turns through the arc, and the beam with it
    if (m.sweep) {
      if (t < m.sweep[0] || this.sweepBase === undefined) this.sweepBase = this.heading;
      const u = Math.min(1, Math.max(0, (t - m.sweep[0]) / (m.sweep[1] - m.sweep[0])));
      this.heading = this.sweepBase + m.sweep[2] + (m.sweep[3] - m.sweep[2]) * u;
    } else this.sweepBase = undefined;
    // the air SP's beam: light gathers at the muzzle while it pours
    if (m.orb) {
      this.muzzle(this._v);
      this.game.fx.aura(this._v, 0xffc860, 2, 0.7);
    }
  }

  // The SP's waverider run: circle the target (picked when the run starts) at radius r, w rad/s, height y; `face`
  // turns the suit to the centre instead of along the circle, `fall` [t0, t1] brings it down to the ground.
  orbitStep(o, t, dt) {
    const P0 = this.pos;
    if (!this.orbitC) {
      const tgt = this.aimAt(this.heading, 22, Math.PI);
      const h = this.heading;
      this.orbitC = { x: tgt ? tgt.x : P0.x + Math.sin(h) * o.r, z: tgt ? tgt.z : P0.z + Math.cos(h) * o.r };
      this.orbitA = Math.atan2(P0.x - this.orbitC.x, P0.z - this.orbitC.z);
      this.orbitR = Math.max(2, Math.hypot(P0.x - this.orbitC.x, P0.z - this.orbitC.z));
    }
    const c = this.orbitC;
    this.orbitA += o.w * dt;
    this.orbitR = damp(this.orbitR, o.r, 3, dt);
    P0.x = c.x + Math.sin(this.orbitA) * this.orbitR;
    P0.z = c.z + Math.cos(this.orbitA) * this.orbitR;
    const falling = o.fall && t > o.fall[0];
    const y = falling ? o.y * (1 - Math.min(1, (t - o.fall[0]) / (o.fall[1] - o.fall[0]))) : o.y;
    P0.y = falling ? y : damp(P0.y, y, 4, dt);
    this.heading = o.face ? Math.atan2(c.x - P0.x, c.z - P0.z) : this.orbitA + Math.PI / 2;
  }

  onInterrupt() {
    this.saberLit = 0;
    this.orbitC = null;
  }

  onEndMusou() {
    this.orbitC = null;
  }

  // outside attacks a lit saber is carried angled up and back, so the long blade doesn't plough the ground
  carryPose(t) {
    if (this.saberScale > 0.05 && this.state !== 'attack' && this.state !== 'musou') {
      const h = P.hand * 3;
      t[h] = lerp(t[h], -2.0 - (t[P.uArmR * 3] + t[P.fArmR * 3]), Math.min(1, this.saberScale));
    }
  }

  // Delta Plus-only move effects: the transformation tuck, C4's landing shockwave, C3's shield thrust, and the SP's
  // vortex and explosion.
  suitEvent(name) {
    const g = this.game;
    const P0 = this.pos;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    switch (name) {
      case 'fold': { // folds into waverider mode: a quick flash off the binders and a whoosh
        this.rig.root.updateMatrixWorld(true);
        g.fx.ring(P0, 0.6, 3.5, 0xbfeeff, 0.35);
        g.audio.play('draw', { vol: 0.8 });
        break;
      }
      case 'shock': { // landing out of a transformation run: a disc of energy races out
        const c = this._w.set(P0.x + fx * 1.2, 0.2, P0.z + fz * 1.2);
        g.fx.shock(c, 9.2, 0x8fe0ff, 0.7);
        g.fx.ring(c, 0.5, 9, 0xbfeeff, 0.55);
        g.fx.dust(c, 26, 2.0);
        g.fx.debris(c, 16, this.suit.debris, 12, 0.2);
        g.fx.light(c, 0x8fe0ff, 150, 24, 0.45);
        g.fx.scorch(c.x, c.z, 3, 13);
        g.audio.play('shock');
        if (g.local === this) { g.camera.shake(0.65); g.aberr(0.75); }
        break;
      }
      case 'thrust': { // C3: the shield's saber driven forward; whether it connects decides C3F
        const n = g.combat.heroStrike(this, THRUST, ++this.hitSerial);
        if (n) this.c3Hit = true;
        const tip = this.bladeS.localToWorld(this._v.set(0, 0, 1));
        g.fx.sparks(tip, 6, 0xbfeeff, 10);
        break;
      }
      case 'vortex': { // SP: the waverider's circling spins up a white vortex round the target, lifting what's in it
        const c = this.orbitC;
        if (!c) break;
        const ctr = this._w.set(c.x, 0, c.z);
        g.fx.ring(ctr, 1, 7.5, 0xf4f8ff, 0.5, 0.3);
        g.fx.ring(ctr, 3, 7, 0xbfeeff, 0.4, 1.4, [0.1, 0]);
        g.fx.dust(ctr, 6, 1.6);
        g.combat.aoe(this, c.x, 0, c.z, 6.5, 6, 0, 2.5, ++this.hitSerial, false, true);
        break;
      }
      case 'spboom': { // SP: the three shots set off a huge explosion at the vortex's heart (~2.5 H)
        const c = this.orbitC || { x: P0.x + fx * 6, z: P0.z + fz * 6 };
        const ctr = this._w.set(c.x, 1.2, c.z);
        g.projectiles.heroBlast(this, ctr, 9.5, 160, 12, 12, { sp: true });
        g.fx.dome(ctr, 2, 10, 0xffe08a, 0.9);
        g.fx.dome(ctr, 1, 6, 0xfff4d0, 0.5);
        g.fx.debris(ctr, 26, [0x8a867c, 0x6f6c64, 0x3a3532], 16, 0.3);
        g.fx.light(ctr, 0xffc860, 240, 34, 0.7);
        g.slowmo(0.3, 0.35);
        if (g.local === this) { g.camera.shake(1.0); g.aberr(1.0); }
        break;
      }
    }
  }

  muzzle(out) {
    const node = this.wpn === 'rifle' || this.rifle.visible ? this.rifle : this.rig.nodes.hand;
    return node.localToWorld(out.set(0, 0.05, 1.5));
  }

  // The grenade launcher's muzzle sits in the shield, on the left arm.
  grenadeMuzzle(out) {
    return this.rig.nodes.handL.localToWorld(out.set(0.25, -0.75, 0.42));
  }

  fire(shot) {
    const g = this.game;
    const k = shot.kind;
    if (k === 'grenade') {
      // the launcher rides on the shield arm: a single round turns the body onto its target, a fan keeps its facing
      let aim = this.heading + (shot.ang || 0);
      const tgt = shot.dn ? null : this.aimAt(aim, 26, shot.ang !== undefined ? 0.25 : 0.6);
      if (tgt) aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
      if (tgt && shot.ang === undefined) this.aimShot(aim, tgt);
      else this.rig.root.updateMatrixWorld(true);
      const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
      const from = this.grenadeMuzzle(new THREE.Vector3());
      if (shot.dn) {
        const dtgt = this.airborneAhead() || this.aimAt(this.heading, 22, 1.2);
        const tx = dtgt ? dtgt.x : this.pos.x + dir.x * 7, tz = dtgt ? dtgt.z : this.pos.z + dir.z * 7;
        dir.set(tx - from.x, (dtgt ? (dtgt.y ?? dtgt.pos?.y ?? 0) + 1.0 : 0) - from.y, tz - from.z).normalize();
      }
      const spec = shot.ang !== undefined ? GRENADE_SPREAD : shot.heavy || !shot.dn ? GRENADE : GRENADE_AIR;
      g.projectiles.shell(this, from, dir, spec);
      g.fx.muzzle(from, dir, 0xffc860, 1.1);
      g.audio.play('bazooka', { vol: 0.7, pitch: 1.3 });
      return;
    }
    if (k === 'cannon') {
      // Transform Shot: the beam cannon, straight out of the waverider's nose (the shield's tip) at the target
      let aim = this.heading;
      const tgt = this.aimAt(aim, 30, 0.6);
      if (tgt) aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
      this.aimShot(aim, tgt);
      const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
      const from = this.rig.nodes.handL.localToWorld(new THREE.Vector3(0.25, -0.5, 2.5));
      g.projectiles.heroBeam(this, from, dir, CANNON_SHOT);
      g.fx.muzzle(from, dir, 0x8fe0ff, 2);
      g.audio.play('cshot');
      if (g.local === this) { g.camera.shake(0.4); g.camera.kick(5); g.aberr(0.5); }
      return;
    }
    if (k === 'spShot' || k === 'beam' || k === 'swipe') {
      // SP shots that aren't level: down into the vortex's heart (spShot), into the air SP's target (beam), or swept
      // along the suit's turn to the ground ahead (swipe)
      const from = new THREE.Vector3();
      let px, py, pz;
      const hx = Math.sin(this.heading), hz = Math.cos(this.heading);
      if (k === 'spShot') {
        const c = this.orbitC || { x: this.pos.x + hx * 6, z: this.pos.z + hz * 6 };
        px = c.x; py = 0.8; pz = c.z;
      } else if (k === 'beam') {
        const tgt = this.aimAt(this.heading, 26, 1.2);
        px = tgt ? tgt.x : this.pos.x + hx * 9; pz = tgt ? tgt.z : this.pos.z + hz * 9;
        py = tgt ? (tgt.y ?? tgt.pos?.y ?? 0) + 1.6 : 0.8;
        if (tgt) this.aimYaw = Math.atan2(px - this.pos.x, pz - this.pos.z);
      } else {
        px = this.pos.x + hx * 10; py = 0.8; pz = this.pos.z + hz * 10;
        this.aimYaw = this.heading;
      }
      this.rig.root.updateMatrixWorld(true);
      this.aimGunTo(px, py, pz, from);
      const dir = new THREE.Vector3(px - from.x, py - from.y, pz - from.z).normalize();
      g.projectiles.heroBeam(this, from, dir, k === 'spShot' ? SP_SHOT : k === 'beam' ? SPA_BEAM_SHOT : SPA_SWIPE_SHOT);
      if (k !== 'beam' || shot.first || Math.random() < 0.3) g.fx.muzzle(from, dir, 0xffd890, k === 'beam' ? 1.4 : 1.8);
      if (g.local === this) g.camera.shake(k === 'beam' ? 0.05 : 0.2);
      if (shot.first) g.audio.play('cshot', { vol: 0.8 });
      return;
    }
    // beam rifle / charge shot
    let aim = this.aimYaw;
    const tgt = this.aimAt(aim, 34, 0.6);
    if (tgt) aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
    this.aimShot(aim, tgt);
    const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
    const from = this.muzzle(new THREE.Vector3());
    if (k === 'cshot') {
      g.projectiles.heroBeam(this, from, dir, CHARGE_SHOT);
      g.fx.muzzle(from, dir, 0x8fe0ff, 2);
      g.fx.ring(from, 0.3, 3, FLASH.gold, 0.3, from.y);
      g.audio.play('cshot');
      g.camera.shake(0.45);
      g.camera.kick(5);
      g.aberr(0.6);
    } else {
      g.projectiles.heroBeam(this, from, dir, RIFLE_SHOT);
      g.fx.muzzle(from, dir, 0x8fe0ff, 1);
      g.audio.play('rifle');
      g.camera.shake(0.1);
      g.camera.kick(2);
    }
  }

  // weapons: whatever the current move holds; the rifle lingers a moment after shooting; otherwise the saber hilt
  heldWeapon(inMove) {
    let wpn = inMove ? this.wpn : null;
    if (!wpn && this.rifleVis > 0) wpn = 'rifle';
    return wpn;
  }

  preVisuals(dt, inMove) {
    const wpn = this.heldWeapon(inMove);
    this.showWeapon(wpn);
    const lit = wpn === 'saber' || wpn === 'twin' || wpn === 'bayonet' || (!wpn && this.saberLit > 0);
    this.saberScale = damp(this.saberScale, lit ? 1 : 0, lit ? 22 : 24, dt);
    this.placeBlade(wpn, this.saberScale);
    const shield = wpn === 'twin' || wpn === 'shieldSaber';
    this.shieldScale = damp(this.shieldScale, shield ? 1 : 0, shield ? 22 : 24, dt);
    this.bladeS.visible = this.shieldScale > 0.02;
    this.bladeS.scale.set(1, 1, Math.max(0.001, BLADE * 0.85 * this.shieldScale));
    const flick = 0.92 + Math.random() * 0.08;
    this.bladeOuter.material.color.copy(SABER_COLOR).multiplyScalar(flick);
  }

  postVisuals(dt, inMove) {
    const wpn = this.heldWeapon(inMove);
    const swinging = inMove && (wpn === 'saber' || wpn === 'twin' || wpn === 'bayonet');
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    if (dt > 1e-4) this.tipSpeed = damp(this.tipSpeed, this._tip.distanceTo(this._prevTip) / dt, 20, dt);
    this._prevTip.copy(this._tip);
    this.trail.push(this._base, this._tip, swinging && this.blade.visible);
  }

  showWeapon(wpn) {
    this.rifle.visible = wpn === 'rifle' || wpn === 'bayonet';
    this.hilt.visible = !wpn || wpn === 'saber' || wpn === 'twin';
  }

  // The hand's blade: on the hilt, or as a bayonet fixed at the rifle's muzzle (shorter).
  placeBlade(wpn, s) {
    const bay = wpn === 'bayonet';
    this.blade.position.z = bay ? 1.45 : 0.3;
    this.blade.visible = s > 0.02;
    this.blade.scale.set(1, 1, Math.max(0.001, BLADE * (bay ? 0.7 : 1) * s));
  }

  netExtras() {
    const inMove = this.state === 'attack' || this.state === 'musou';
    const wpn = this.heldWeapon(inMove);
    return { sab: this.saberScale, shs: this.shieldScale, wp: WEAPON_ID[wpn] || 0, sw: inMove && (wpn === 'saber' || wpn === 'twin' || wpn === 'bayonet') };
  }

  applyNetExtras(s) {
    const wpn = WEAPON_OF[s.wp || 0];
    this.showWeapon(wpn);
    this.placeBlade(wpn, s.sab);
    this.bladeS.visible = (s.shs || 0) > 0.02;
    this.bladeS.scale.set(1, 1, Math.max(0.001, BLADE * 0.85 * (s.shs || 0)));
    this.rig.root.updateMatrixWorld(true);
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    this.trail.push(this._base, this._tip, s.sw && this.blade.visible);
  }
}
