// Seabook Arno's Gundam F91: beam saber, beam rifle, the beam launcher, and the twin back-mounted VSBR that swing
// forward under the arms to fire. Burst type MEPE: charge attacks and SP finishers carry a teal-green "metal peel"
// afterimage swirl (see suitEvent 'mepe') instead of the usual gold.
import * as THREE from 'three';
import { voxelMesh } from '../core/voxel.js';
import { P } from '../core/rig.js';
import { f91Def, f91Weapons, VSBR_BEAM } from '../models/f91.js';
import { MOVES, STANCE, BLADE } from './f91_moves.js';
import { Hero, FLASH, curve } from './hero.js';
import { damp, lerp } from '../core/util.js';
import { Trail } from '../fx/fx.js';

const WEAPON_ID = { saber: 1, rifle: 2, launcher: 3 };
const WEAPON_OF = [null, 'saber', 'rifle', 'launcher'];
const RIFLE_SHOT = { dmg: 22, kb: 4, up: 1 };
const CHARGE_SHOT = { dmg: 68, kb: 10, up: 10, big: true, w: 2.2, r: 1.4, speed: 112 };
const SABER_COLOR = new THREE.Color(3.2, 0.55, 1.9);
const SABER_TRAIL = 0xff4fb8;
const VSBR_TRAIL = 0xffe27a;
const VSBR_TILT = 1.5; // radians the VSBR swing through, racked to forward-firing

export const F91_SUIT = {
  id: 'f91', pilot: 'seabook', def: f91Def, moves: MOVES, stance: STANCE,
  hp: 980, run: 8.0, boostSpeed: 19.5, boostTime: 1.5, sprintSpeed: 15.5, defense: 1.12, power: 1.05,
  nozzles: [[-0.22, 0.15, -0.5], [0.22, 0.15, -0.5]],
  debris: [0xf2f4f7, 0x3f6fc4, 0xd8342a], spAirY: 4.2, spAirReach: 6.5,
  impactColor: 0xfff2a0, ringColor: 0xfff6c8, domeColor: 0x9fd8ff,
  spColor: 0x7fffbe, spDome: 0xbfffdc, spAura: 0x7fffbe,
};

export class F91 extends Hero {
  constructor(game) {
    super(game, F91_SUIT);
  }

  buildWeapons() {
    const w = f91Weapons();
    const hand = this.rig.nodes.hand;
    this.saberLit = 0;
    this.rifleVis = 0;
    this.vsbrWant = 0;
    this.vsbrAim = 0;
    this.hilt = voxelMesh(w.hilt, { scale: 0.1 });
    hand.add(this.hilt);
    this.blade = new THREE.Group();
    this.blade.position.z = 0.3;
    const outerGeo = new THREE.BoxGeometry(0.16, 0.16, 1).translate(0, 0, 0.5);
    const coreGeo = new THREE.BoxGeometry(0.065, 0.065, 1.02).translate(0, 0, 0.5);
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
    this.launcher = voxelMesh(w.launcher, { scale: 0.1 });
    this.launcher.position.set(0, 0.1, 0);
    hand.add(this.launcher);
    this.launcher.visible = false;
    this.trail = new Trail(this.scene, SABER_TRAIL, 16);
    this.scene.remove(this.trail.mesh);
    this.own(this.trail.mesh);
    // VSBR beam trails, one per barrel, on when the pair is swung forward and firing
    this.vsbrTrails = { L: new Trail(this.scene, VSBR_TRAIL, 12), R: new Trail(this.scene, VSBR_TRAIL, 12) };
    for (const tr of Object.values(this.vsbrTrails)) { this.scene.remove(tr.mesh); this.own(tr.mesh); }
    this._base = new THREE.Vector3();
    this._tip = new THREE.Vector3();
    this._prevTip = new THREE.Vector3();
    this._vbL = new THREE.Vector3();
    this._vtL = new THREE.Vector3();
    this._vbR = new THREE.Vector3();
    this._vtR = new THREE.Vector3();
  }

  preUpdate(dt) {
    this.saberLit -= dt;
    this.rifleVis -= dt;
  }

  onMoveStart(m, w) {
    if (w === 'saber' && this.saberScale < 0.3) this.game.audio.play('ignite');
  }

  onWeapon(w) {
    const g = this.game;
    if (w === 'saber' && this.saberScale < 0.3) g.audio.play('ignite');
    else if (w === 'launcher') g.audio.play('draw', { vol: 0.7 });
  }

  onMoveTick(m, t) {
    const w = this.wpn;
    if (w === 'saber') this.saberLit = 0.12;
    else if (w) this.saberLit = 0;
    if (w === 'rifle') this.rifleVis = 0.6;
    this.vsbrWant = m.vsbr ? curve(m.vsbr, t) : 0;
  }

  onEndMusou() {
    this.vsbrWant = 0;
  }

  onInterrupt() {
    this.saberLit = 0;
    this.vsbrWant = 0;
  }

  // outside attacks a lit saber is carried angled up and back, so the long blade doesn't plough the ground
  carryPose(t) {
    if (this.saberScale > 0.05 && this.state !== 'attack' && this.state !== 'musou') {
      const h = P.hand * 3;
      t[h] = lerp(t[h], -2.0 - (t[P.uArmR * 3] + t[P.fArmR * 3]), Math.min(1, this.saberScale));
    }
  }

  // F91-only move effects: the M.E.P.E. afterimage discharge (the aerial SP's hover pulse and the charge SP's landing).
  suitEvent(name) {
    const g = this.game;
    const P0 = this.pos;
    switch (name) {
      case 'mepe': {
        const c = this._w.set(P0.x, P0.y + 1.6, P0.z);
        g.fx.ring(P0, 0.6, 6.5, 0x9fffcf, 0.5, P0.y + 0.15);
        g.fx.dome(c, 0.6, 4.5, 0x9fffcf, 0.4);
        g.fx.star(c, 0xe0fff0, 2.2);
        g.fx.sparks(c, 16, 0xbfffdc, 14);
        g.fx.light(c, 0x9fffcf, 120, 18, 0.3);
        g.audio.play('flash', { vol: 0.7 });
        if (g.local === this) g.aberr(0.4);
        break;
      }
    }
  }

  muzzle(out) {
    if (this.wpn === 'launcher') return this.launcher.localToWorld(out.set(0, 0.1, 1.3));
    const node = this.wpn === 'rifle' || this.rifle.visible ? this.rifle : this.rig.nodes.hand;
    return node.localToWorld(out.set(0, 0.05, 1.4));
  }

  fire(shot) {
    const g = this.game;
    const ang = this.heading + (shot.ang || 0);
    const heavy = shot.kind === 'blast';
    let aim = ang;
    const tgt = this.aimAt(ang, heavy ? 20 : 34, shot.ang !== undefined ? 0.2 : 0.6);
    if (tgt) aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
    if (tgt && shot.ang === undefined) this.faceShot(aim);
    else this.rig.root.updateMatrixWorld(true);
    const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
    const from = this.muzzle(new THREE.Vector3());
    if (shot.kind === 'blast') {
      // dash charge: the beam launcher fires point-blank
      g.fx.muzzle(from, dir, VSBR_BEAM, 1.7);
      g.projectiles.heroBlast(this, this._w.set(this.pos.x + dir.x * 3, this.pos.y + 1.8, this.pos.z + dir.z * 3), 3.8, 60, 12, 8);
      g.audio.play('cshot');
      this.vel.x -= dir.x * 6;
      this.vel.z -= dir.z * 6;
      return;
    }
    if (shot.dn) {
      // aerial barrage: aim down at the target, or at the ground ahead
      const tx = tgt ? tgt.x : this.pos.x + dir.x * 8, tz = tgt ? tgt.z : this.pos.z + dir.z * 8;
      dir.set(tx - from.x, (tgt ? (tgt.y ?? tgt.pos?.y ?? 0) + 1.2 : 0) - from.y, tz - from.z).normalize();
    }
    if (shot.kind === 'cshot') {
      g.projectiles.heroBeam(this, from, dir, CHARGE_SHOT);
      g.fx.muzzle(from, dir, VSBR_BEAM, 2);
      g.fx.ring(from, 0.3, 3, FLASH.mepe, 0.3, from.y);
      g.audio.play('cshot');
      g.camera.shake(0.4);
      g.camera.kick(5);
      g.aberr(0.5);
      this.vel.x -= dir.x * 7;
      this.vel.z -= dir.z * 7;
    } else {
      g.projectiles.heroBeam(this, from, dir, RIFLE_SHOT);
      g.fx.muzzle(from, dir, VSBR_BEAM, 1);
      g.audio.play('rifle');
      g.camera.shake(0.1);
      g.camera.kick(2);
      this.vel.x -= dir.x * 3;
      this.vel.z -= dir.z * 3;
    }
  }

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
    this.vsbrAim = damp(this.vsbrAim, this.vsbrWant, 10, dt);
    this.rig.nodes.vsbr.rotation.x = this.vsbrAim * VSBR_TILT;
  }

  postVisuals(dt, inMove) {
    const wpn = this.heldWeapon(inMove);
    const swinging = inMove && wpn === 'saber';
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    if (dt > 1e-4) this.tipSpeed = damp(this.tipSpeed, this._tip.distanceTo(this._prevTip) / dt, 20, dt);
    this._prevTip.copy(this._tip);
    this.trail.push(this._base, this._tip, swinging && this.blade.visible);
    // VSBR ribbons trail from each barrel tip while the pair is swung forward
    const firing = this.vsbrAim > 0.6;
    const vsbr = this.rig.nodes.vsbr;
    vsbr.localToWorld(this._vbL.set(-0.25, 0.4, -0.1));
    vsbr.localToWorld(this._vtL.set(-0.25, 1.0, -0.1));
    vsbr.localToWorld(this._vbR.set(0.25, 0.4, -0.1));
    vsbr.localToWorld(this._vtR.set(0.25, 1.0, -0.1));
    this.vsbrTrails.L.push(this._vbL, this._vtL, firing);
    this.vsbrTrails.R.push(this._vbR, this._vtR, firing);
  }

  showWeapon(wpn) {
    this.rifle.visible = wpn === 'rifle';
    this.launcher.visible = wpn === 'launcher';
    this.hilt.visible = !wpn || wpn === 'saber';
  }

  netExtras() {
    const inMove = this.state === 'attack' || this.state === 'musou';
    const wpn = this.heldWeapon(inMove);
    return { sab: this.saberScale, wp: WEAPON_ID[wpn] || 0, va: this.vsbrAim, sw: inMove && wpn === 'saber' };
  }

  applyNetExtras(s) {
    const wpn = WEAPON_OF[s.wp || 0];
    this.showWeapon(wpn);
    this.blade.visible = s.sab > 0.02;
    this.blade.scale.set(1, 1, Math.max(0.001, BLADE * s.sab));
    this.vsbrAim = s.va || 0;
    this.rig.nodes.vsbr.rotation.x = this.vsbrAim * VSBR_TILT;
    this.rig.root.updateMatrixWorld(true);
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    this.trail.push(this._base, this._tip, s.sw && this.blade.visible);
    const firing = this.vsbrAim > 0.6;
    const vsbr = this.rig.nodes.vsbr;
    vsbr.localToWorld(this._vbL.set(-0.25, 0.4, -0.1));
    vsbr.localToWorld(this._vtL.set(-0.25, 1.0, -0.1));
    vsbr.localToWorld(this._vbR.set(0.25, 0.4, -0.1));
    vsbr.localToWorld(this._vtR.set(0.25, 1.0, -0.1));
    this.vsbrTrails.L.push(this._vbL, this._vtL, firing);
    this.vsbrTrails.R.push(this._vbR, this._vtR, firing);
  }
}
