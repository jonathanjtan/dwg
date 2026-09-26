// Riddhe Marcenas's MSN-001A1 Delta Plus: beam saber, beam rifle and a shield-mounted grenade launcher. Its charge
// finisher, dash-rush finisher and SP all fold the suit into its waverider flight mode (faked with a pose - arms
// swept back, torso pitched flat, legs tucked, shield forward - rather than a separate model) to ram the target.
import * as THREE from 'three';
import { voxelMesh } from '../core/voxel.js';
import { P } from '../core/rig.js';
import { deltaplusDef, deltaplusWeapons } from '../models/deltaplus.js';
import { MOVES, STANCE, BLADE } from './deltaplus_moves.js';
import { Hero, FLASH } from './hero.js';
import { damp, lerp } from '../core/util.js';
import { Trail } from '../fx/fx.js';

const WEAPON_ID = { saber: 1, rifle: 2 };
const WEAPON_OF = [null, 'saber', 'rifle'];
const RIFLE_SHOT = { dmg: 23, kb: 4, up: 1 };
const CHARGE_SHOT = { dmg: 74, kb: 10, up: 10, big: true, w: 2.4, r: 1.5, speed: 112 };
// Grenade launcher rounds: a single aimed shot (C3 / DC), a three-way fan (C6) and a lighter aerial-barrage round.
const GRENADE = { speed: 48, fuse: 0.5, r: 3.6, dmg: 30, kb: 6, up: 4, big: true, sound: 'bzboom' };
const GRENADE_SPREAD = { speed: 52, fuse: 0.42, r: 3.0, dmg: 20, kb: 5, up: 3, big: true, sound: 'bzboom' };
const GRENADE_AIR = { speed: 50, fuse: 0.4, r: 2.8, dmg: 15, kb: 3, up: 2, lite: true, sp: true, sound: 'bzboom' };
const SABER_COLOR = new THREE.Color(0.9, 2.6, 3.4);
const SABER_TRAIL = 0x5fc8ff;

export const DELTAPLUS = {
  id: 'deltaplus', pilot: 'riddhe', def: deltaplusDef, moves: MOVES, stance: STANCE,
  hp: 1200, run: 9.6, boostSpeed: 24, boostTime: 2.0, sprintSpeed: 18.5, defense: 1.02, power: 1.05,
  nozzles: [[-0.25, 0.15, -0.58], [0.25, 0.15, -0.58]],
  debris: [0xe8ebf2, 0x364683, 0xa8283a], spAirY: 4.7, spAirReach: 7.2,
  impactColor: 0x8fe0ff, ringColor: 0xbfeeff, impactLight: 0x8fe0ff, domeColor: 0x7fd0ff,
  spColor: 0xffc860, spDome: 0xffe0a0, spAura: 0xffc860, hitColor: 0xcfeeff,
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
    this.hilt = voxelMesh(w.hilt, { scale: 0.1 });
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
    this.rifle = voxelMesh(w.rifle, { scale: 0.1 });
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

  onMoveStart(m, w) {
    if (w === 'saber' && this.saberScale < 0.3) this.game.audio.play('ignite');
  }

  onMoveTick(m) {
    const w = this.wpn;
    // the blade goes out as soon as the attack ends; the short hold only bridges one move into the next
    if (w === 'saber') this.saberLit = 0.12;
    else if (w) this.saberLit = 0;
    if (w === 'rifle') this.rifleVis = 0.6;
  }

  onInterrupt() {
    this.saberLit = 0;
  }

  // outside attacks a lit saber is carried angled up and back, so the long blade doesn't plough the ground
  carryPose(t) {
    if (this.saberScale > 0.05 && this.state !== 'attack' && this.state !== 'musou') {
      const h = P.hand * 3;
      t[h] = lerp(t[h], -2.0 - (t[P.uArmR * 3] + t[P.fArmR * 3]), Math.min(1, this.saberScale));
    }
  }

  // Delta Plus-only move effects: the transformation tuck, the waverider ram, its ground shockwave, and the Bio
  // Sensor's flurry pulse.
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
      case 'ram': { // the transformed suit bursts through whatever is in front of it
        this.rig.root.updateMatrixWorld(true);
        const tip = this.rig.nodes.handL.localToWorld(this._v.set(0.25, -0.5, 2.5));
        g.fx.star(tip, 0x9fe8ff, 2.6);
        g.fx.sparks(tip, 18, 0xbfeeff, 18);
        g.fx.light(tip, 0x8fe0ff, 110, 16, 0.3);
        g.audio.play('bzboom', { vol: 0.8 });
        if (g.local === this) { g.camera.shake(0.5); g.camera.kick(4); g.aberr(0.5); }
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
      case 'ring': { // Bio Sensor pulse during the SP flurry
        g.fx.ring(P0, 0.6, 6.5, 0xffc860, 0.4);
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
    const ang = this.heading + (shot.ang || 0);
    if (shot.kind === 'grenade') {
      let aim = ang;
      const tgt = shot.dn ? null : this.aimAt(ang, 26, shot.ang !== undefined ? 0.25 : 0.6);
      if (tgt) aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
      if (tgt && shot.ang === undefined) this.faceShot(aim);
      else this.rig.root.updateMatrixWorld(true);
      const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
      const from = this.grenadeMuzzle(new THREE.Vector3());
      if (shot.dn) {
        const dtgt = this.aimAt(this.heading, 22, 1.2);
        const tx = dtgt ? dtgt.x : this.pos.x + dir.x * 7, tz = dtgt ? dtgt.z : this.pos.z + dir.z * 7;
        dir.set(tx - from.x, (dtgt ? (dtgt.y ?? dtgt.pos?.y ?? 0) + 1.0 : 0) - from.y, tz - from.z).normalize();
      }
      const spec = shot.ang !== undefined ? GRENADE_SPREAD : shot.dn ? GRENADE_AIR : GRENADE;
      g.projectiles.shell(this, from, dir, spec);
      g.fx.muzzle(from, dir, 0xffc860, 1.1);
      g.audio.play('bazooka', { vol: 0.7, pitch: 1.3 });
      if (!shot.dn) { this.vel.x -= dir.x * 4; this.vel.z -= dir.z * 4; }
      return;
    }
    // beam rifle / charge shot
    let aim = ang;
    const tgt = this.aimAt(ang, 34, 0.6);
    if (tgt) this.faceShot(aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z));
    else this.rig.root.updateMatrixWorld(true);
    const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
    const from = this.muzzle(new THREE.Vector3());
    if (shot.kind === 'cshot') {
      g.projectiles.heroBeam(this, from, dir, CHARGE_SHOT);
      g.fx.muzzle(from, dir, 0x8fe0ff, 2);
      g.fx.ring(from, 0.3, 3, FLASH.gold, 0.3, from.y);
      g.audio.play('cshot');
      g.camera.shake(0.45);
      g.camera.kick(5);
      g.aberr(0.6);
      this.vel.x -= dir.x * 7;
      this.vel.z -= dir.z * 7;
    } else {
      g.projectiles.heroBeam(this, from, dir, RIFLE_SHOT);
      g.fx.muzzle(from, dir, 0x8fe0ff, 1);
      g.audio.play('rifle');
      g.camera.shake(0.1);
      g.camera.kick(2);
      this.vel.x -= dir.x * 3;
      this.vel.z -= dir.z * 3;
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
    const lit = wpn === 'saber' || (!wpn && this.saberLit > 0);
    this.saberScale = damp(this.saberScale, lit ? 1 : 0, lit ? 22 : 24, dt);
    this.blade.visible = this.saberScale > 0.02;
    this.blade.scale.set(1, 1, Math.max(0.001, BLADE * this.saberScale));
    const flick = 0.92 + Math.random() * 0.08;
    this.bladeOuter.material.color.copy(SABER_COLOR).multiplyScalar(flick);
  }

  postVisuals(dt, inMove) {
    const wpn = this.heldWeapon(inMove);
    const swinging = inMove && wpn === 'saber';
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    if (dt > 1e-4) this.tipSpeed = damp(this.tipSpeed, this._tip.distanceTo(this._prevTip) / dt, 20, dt);
    this._prevTip.copy(this._tip);
    this.trail.push(this._base, this._tip, swinging && this.blade.visible);
  }

  showWeapon(wpn) {
    this.rifle.visible = wpn === 'rifle';
    this.hilt.visible = !wpn || wpn === 'saber';
  }

  netExtras() {
    const inMove = this.state === 'attack' || this.state === 'musou';
    const wpn = this.heldWeapon(inMove);
    return { sab: this.saberScale, wp: WEAPON_ID[wpn] || 0, sw: inMove && wpn === 'saber' };
  }

  applyNetExtras(s) {
    const wpn = WEAPON_OF[s.wp || 0];
    this.showWeapon(wpn);
    this.blade.visible = s.sab > 0.02;
    this.blade.scale.set(1, 1, Math.max(0.001, BLADE * s.sab));
    this.rig.root.updateMatrixWorld(true);
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    this.trail.push(this._base, this._tip, s.sw && this.blade.visible);
  }
}
