// Seabook Arno's Gundam F91: a yellow beam saber (a second one for C4), beam rifle, the beam shield off the left
// forearm, the beam launcher, and the twin back-mounted VSBR that swing forward under the arms to fire. Burst type
// MEPE: charge attacks and SP finishers carry a teal-green "metal peel" afterimage swirl (see suitEvent 'mepe')
// instead of the usual gold.
import * as THREE from 'three';
import { voxelMesh } from '../core/voxel.js';
import { P } from '../core/rig.js';
import { f91Def, f91Weapons, VSBR_BEAM, SHIELD_GLOW as SHIELD_SPARK, F91_VOXEL } from '../models/f91.js';
import { MOVES, STANCE, BLADE } from './f91_moves.js';
import { Hero, FLASH, curve } from './hero.js';
import { damp, lerp } from '../core/util.js';
import { Trail } from '../fx/fx.js';

const WEAPON_ID = { saber: 1, rifle: 2, launcher: 3, sabers: 4 };
const WEAPON_OF = [null, 'saber', 'rifle', 'launcher', 'sabers'];
const RIFLE_SHOT = { dmg: 22, kb: 4, up: 1 };
const RIFLE_UP = { dmg: 30, kb: 5, up: 5, big: true, w: 1.3 }; // C2: the rifle shot up into the launched target
const VSBR_CHARGE = { dmg: 40, kb: 10, up: 10, big: true, w: 2.2, r: 1.4, speed: 112 }; // the charge shot, one per barrel
const VSBR_SHOT = { dmg: 18, kb: 4, up: 2, w: 1.4, r: 1.0 }; // C6's volleys, one per barrel
const VSBR_UP = { dmg: 34, kb: 5, up: 5, big: true, w: 1.8, r: 1.2 }; // C3: one barrel, up into the launched target
// the charge SP's sustained beam: a bolt from each barrel every 0.12 s (no hit-stop, so the stream keeps its rhythm)
const MEGA_BEAM = { dmg: 10, kb: 2.5, up: 0.8, w: 2.0, r: 2.2, speed: 150, max: 0.26, sp: true };
const MEGA_END = { dmg: 60, kb: 12, up: 12, big: true, w: 3.4, r: 2.2, speed: 130, sp: true };
const SABER_COLOR = new THREE.Color(3.0, 2.3, 0.45); // yellow, as in Reborn
const SABER_TRAIL = 0xffd850;
const VSBR_TRAIL = 0xffe27a;
const VSBR_TILT = 1.5; // radians the VSBR swing through, racked to forward-firing

export const F91_SUIT = {
  id: 'f91', pilot: 'seabook', def: f91Def, moves: MOVES, stance: STANCE,
  hp: 1100, run: 8.0, boostSpeed: 19.5, boostTime: 1.5, sprintSpeed: 15.5, defense: 0.98, power: 1.12,
  nozzles: [[-0.12, 0.12, -0.3], [0.12, 0.12, -0.3]], // the backpack's two thrusters
  debris: [0xf2f4f7, 0x3f6fc4, 0xd8342a], spAirY: 3.0, spAirReach: 6.5, // the air SP hovers about a height up
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
    this.hilt = voxelMesh(w.hilt, { scale: F91_VOXEL });
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
    // the second beam saber (C4), in the left fist: a grip at the end of the left forearm, the blade square to it so a
    // forearm spun about its own axis turns the blade as a wheel
    this.gripL = new THREE.Group();
    this.gripL.position.copy(hand.position).x *= -1;
    this.rig.nodes.fArmL.add(this.gripL);
    this.hiltL = voxelMesh(w.hilt, { scale: F91_VOXEL });
    this.bladeL = new THREE.Group();
    this.bladeL.position.z = 0.3;
    this.bladeL.add(new THREE.Mesh(outerGeo, this.bladeOuter.material), new THREE.Mesh(coreGeo, this.bladeCore.material));
    this.gripL.add(this.hiltL, this.bladeL);
    this.hiltL.visible = this.bladeL.visible = false;
    this.saberScaleL = 0;
    this.rifle = voxelMesh(w.rifle, { scale: F91_VOXEL });
    this.rifle.position.set(0, -0.05, 0);
    hand.add(this.rifle);
    this.rifle.visible = false;
    this.launcher = voxelMesh(w.launcher, { scale: F91_VOXEL });
    this.launcher.position.set(0, 0.1, 0);
    hand.add(this.launcher);
    this.launcher.visible = false;
    this.trail = new Trail(this.scene, SABER_TRAIL, 16);
    this.scene.remove(this.trail.mesh);
    this.own(this.trail.mesh);
    this.trailL = new Trail(this.scene, SABER_TRAIL, 16);
    this.scene.remove(this.trailL.mesh);
    this.own(this.trailL.mesh);
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
    this._baseL = new THREE.Vector3();
    this._tipL = new THREE.Vector3();
    this._fm = new THREE.Vector3();
    this._fd = new THREE.Vector3();
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
    else if (w === 'sabers') g.audio.play('ignite', { pitch: 1.12 });
    else if (w === 'launcher' || w === 'rifle') g.audio.play('draw', { vol: 0.7 });
  }

  onMoveTick(m, t, prevT, dt) {
    const w = this.wpn;
    if (w === 'saber' || w === 'sabers') this.saberLit = 0.12;
    else if (w) this.saberLit = 0;
    if (w === 'rifle') this.rifleVis = 0.6;
    this.vsbrWant = m.vsbr ? curve(m.vsbr, t) : 0;
    // C6: glide off to the suit's left while the VSBR fire, keeping its chest to the target
    if (m.glide && t >= m.glide[0] && t <= m.glide[1]) {
      this.pos.x += Math.cos(this.heading) * m.glide[2] * dt;
      this.pos.z -= Math.sin(this.heading) * m.glide[2] * dt;
    }
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
      case 'grind': { // C2: the beam shield ground into the target throws sparks off its rim
        this.rig.root.updateMatrixWorld(true);
        const s = this.rig.nodes.handL.getWorldPosition(this._w);
        g.fx.sparks(s, 8, SHIELD_SPARK, 12);
        g.fx.light(s, SHIELD_SPARK, 50, 8, 0.12);
        g.audio.play('slash_fast', { vol: 0.5, pitch: 1.3 });
        break;
      }
      case 'sphere': { // air SP: the M.E.P.E. sphere pulses, hauling in and striking everything round and under the suit
        g.combat.aoe(this, P0.x, P0.y * 0.5, P0.z, 6.5, 26, 1.5, 1.2, ++this.hitSerial, false, true);
        g.fx.ring(this._v.set(P0.x, 0, P0.z), 1, 6.5, 0x9fffcf, 0.4, 0.2);
        break;
      }
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

  muzzle(out, which) {
    if (which === 'vsbr') return this.vsbrMuzzle(1, out);
    if (this.wpn === 'launcher') return this.launcher.localToWorld(out.set(0, 0.1, 1.3));
    const node = this.wpn === 'rifle' || this.rifle.visible ? this.rifle : this.rig.nodes.hand;
    return node.localToWorld(out.set(0, 0.05, 1.4));
  }

  // The VSBR barrel tips (side -1 right, +1 left), where the twin back rifles fire once swung forward.
  vsbrMuzzle(side, out) {
    return this.rig.nodes.vsbr.localToWorld(out.set(side * 0.25, 1.05, -0.1));
  }

  fire(shot) {
    const g = this.game;
    const k = shot.kind;
    if (k === 'mega' || k === 'megaEnd') return this.fireMega(k === 'megaEnd');
    // shots up at a launched target (C2's rifle, C3's VSBR, the dash charge's launcher) look for it in the air first
    const up = k === 'up' || k === 'vsbrUp' || k === 'blastUp';
    let aim = this.aimYaw;
    let tgt = up ? this.airborneAhead() : null;
    tgt ||= this.aimAt(aim, k === 'blastUp' ? 20 : 34, 0.6);
    if (tgt) aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
    this.aimShot(aim, tgt);
    const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
    const from = new THREE.Vector3();
    // where a shot that isn't level goes: the target's chest, or failing that a point up (or, from a hover, down) ahead
    const at = (y0) => this._w.set(tgt ? tgt.x : this.pos.x + dir.x * 7, tgt ? (tgt.y ?? tgt.pos?.y ?? 0) + 1.2 : y0, tgt ? tgt.z : this.pos.z + dir.z * 7);
    if (k === 'cshot') {
      // charge shot: both VSBR at once, and the heavy beams skid the F91 back along the line of fire
      for (const side of [-1, 1]) {
        this.vsbrMuzzle(side, from);
        g.projectiles.heroBeam(this, from, dir, VSBR_CHARGE);
        g.fx.muzzle(from, dir, VSBR_BEAM, 2);
      }
      g.fx.ring(from, 0.3, 3, FLASH.mepe, 0.3, from.y);
      g.audio.play('cshot');
      g.camera.shake(0.4);
      g.camera.kick(5);
      g.aberr(0.5);
      // as in Reborn, the heavy beams skid the F91 back about a third of its height along the line of fire (the rifle
      // doesn't)
      this.vel.x -= dir.x * 11;
      this.vel.z -= dir.z * 11;
      return;
    }
    if (k === 'vsbr') {
      // C6: a volley from both barrels, down from the hover at the target
      const p = at(0.6);
      for (const side of [-1, 1]) {
        this.vsbrMuzzle(side, from);
        const d = this._fd.set(p.x - from.x, p.y - from.y, p.z - from.z).normalize();
        g.projectiles.heroBeam(this, from, d, VSBR_SHOT);
        g.fx.muzzle(from, d, VSBR_BEAM, 1.2);
      }
      g.audio.play('rifle', { pitch: 0.9 });
      g.camera.shake(0.12);
      return;
    }
    if (k === 'vsbrUp') {
      // C3: the left barrel alone, up into the launched target
      const p = at(7);
      this.vsbrMuzzle(1, from);
      const d = this._fd.set(p.x - from.x, p.y - from.y, p.z - from.z).normalize();
      g.projectiles.heroBeam(this, from, d, VSBR_UP);
      g.fx.muzzle(from, d, VSBR_BEAM, 1.6);
      if (tgt) g.projectiles.heroBlast(this, p, 2.4, 14, 3, 4, { lite: true });
      g.audio.play('cshot', { vol: 0.7, pitch: 1.2 });
      g.camera.shake(0.2);
      return;
    }
    if (up) {
      // C2's rifle shot or the dash charge's beam launcher, up into the launched target, which bursts
      const p = at(7);
      const px = p.x, py = p.y, pz = p.z;
      this.aimGunTo(px, py, pz, from);
      // down the barrel: at close range the arm can't quite settle on the point, so trust where the gun points
      const d = this._fd.set(0, 0, 1).applyQuaternion(this.rig.nodes.hand.getWorldQuaternion(this._q));
      const heavy = k === 'blastUp';
      g.projectiles.heroBeam(this, from, d, heavy ? VSBR_CHARGE : RIFLE_UP);
      g.fx.muzzle(from, d, VSBR_BEAM, heavy ? 1.8 : 1.2);
      if (tgt) g.projectiles.heroBlast(this, this._w.set(px, py, pz), heavy ? 3.8 : 2.6, heavy ? 40 : 18, heavy ? 10 : 4, heavy ? 6 : 4, { lite: !heavy });
      g.audio.play(heavy ? 'cshot' : 'rifle');
      g.camera.shake(heavy ? 0.35 : 0.12);
      g.camera.kick(heavy ? 4 : 2);
      return;
    }
    this.muzzle(from);
    g.projectiles.heroBeam(this, from, dir, RIFLE_SHOT);
    g.fx.muzzle(from, dir, VSBR_BEAM, 1);
    g.audio.play('rifle');
    g.camera.shake(0.1);
    g.camera.kick(2);
  }

  // Charge SP: the twin VSBR's sustained beam, a bolt from each barrel along the heading (the stick steers it); the
  // last shot is the full-power blast that ends it.
  fireMega(last) {
    const g = this.game;
    this.rig.root.updateMatrixWorld(true);
    const dir = this._fd.set(Math.sin(this.heading), 0, Math.cos(this.heading));
    for (const side of [-1, 1]) {
      const from = this.vsbrMuzzle(side, this._fm);
      g.projectiles.heroBeam(this, from, dir, last ? MEGA_END : MEGA_BEAM);
      if (last || Math.random() < 0.2) g.fx.muzzle(from, dir, VSBR_BEAM, last ? 2.6 : 1.1);
    }
    if (!last) {
      if (g.local === this) g.camera.shake(0.06);
      return;
    }
    const c = this._w.set(this.pos.x + dir.x * 9, 1.6, this.pos.z + dir.z * 9);
    g.projectiles.heroBlast(this, c, 5.5, 120, 12, 12, { sp: true });
    g.fx.dome(c, 1, 6, 0xfff2a0, 0.5);
    g.audio.play('cshot');
    if (g.local === this) { g.camera.shake(0.7); g.camera.kick(6); g.aberr(0.8); }
  }

  heldWeapon(inMove) {
    let wpn = inMove ? this.wpn : null;
    if (!wpn && this.rifleVis > 0) wpn = 'rifle';
    return wpn;
  }

  preVisuals(dt, inMove) {
    const wpn = this.heldWeapon(inMove);
    this.showWeapon(wpn);
    const lit = wpn === 'saber' || wpn === 'sabers' || (!wpn && this.saberLit > 0);
    // in the ground SP the blade is drawn out long for the sweeps across the field (about 2 H in the footage)
    const len = this.state === 'musou' && this.spKind === 'ground' ? 1.7 : 1;
    this.saberScale = damp(this.saberScale, lit ? len : 0, lit ? 22 : 24, dt);
    this.blade.visible = this.saberScale > 0.02;
    this.blade.scale.set(1, 1, Math.max(0.001, BLADE * this.saberScale));
    this.saberScaleL = damp(this.saberScaleL, wpn === 'sabers' ? 1 : 0, 22, dt);
    this.setBladeL(this.saberScaleL);
    const flick = 0.92 + Math.random() * 0.08;
    this.bladeOuter.material.color.copy(SABER_COLOR).multiplyScalar(flick);
    this.vsbrAim = damp(this.vsbrAim, this.vsbrWant, 10, dt);
    this.rig.nodes.vsbr.rotation.x = this.vsbrAim * VSBR_TILT;
  }

  postVisuals(dt, inMove) {
    const wpn = this.heldWeapon(inMove);
    const swinging = inMove && (wpn === 'saber' || wpn === 'sabers');
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    if (dt > 1e-4) this.tipSpeed = damp(this.tipSpeed, this._tip.distanceTo(this._prevTip) / dt, 20, dt);
    this._prevTip.copy(this._tip);
    this.trail.push(this._base, this._tip, swinging && this.blade.visible);
    this.pushTrailL(inMove && wpn === 'sabers');
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
    this.hilt.visible = !wpn || wpn === 'saber' || wpn === 'sabers';
    this.hiltL.visible = wpn === 'sabers';
    this.rig.nodes.handL.visible = wpn !== 'sabers'; // the beam shield goes out while the left hand holds a saber
  }

  setBladeL(s) {
    this.bladeL.visible = s > 0.02;
    this.bladeL.scale.set(1, 1, Math.max(0.001, BLADE * s));
  }

  pushTrailL(on) {
    this.bladeL.localToWorld(this._baseL.set(0, 0, 0.18));
    this.bladeL.localToWorld(this._tipL.set(0, 0, 1));
    this.trailL.push(this._baseL, this._tipL, on && this.bladeL.visible);
  }

  netExtras() {
    const inMove = this.state === 'attack' || this.state === 'musou';
    const wpn = this.heldWeapon(inMove);
    return { sab: this.saberScale, wp: WEAPON_ID[wpn] || 0, va: this.vsbrAim, sw: inMove && (wpn === 'saber' || wpn === 'sabers') };
  }

  applyNetExtras(s) {
    const wpn = WEAPON_OF[s.wp || 0];
    this.showWeapon(wpn);
    this.blade.visible = s.sab > 0.02;
    this.blade.scale.set(1, 1, Math.max(0.001, BLADE * s.sab));
    this.setBladeL(wpn === 'sabers' ? s.sab : 0);
    this.vsbrAim = s.va || 0;
    this.rig.nodes.vsbr.rotation.x = this.vsbrAim * VSBR_TILT;
    this.rig.root.updateMatrixWorld(true);
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    this.trail.push(this._base, this._tip, s.sw && this.blade.visible);
    this.pushTrailL(s.sw && wpn === 'sabers');
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
