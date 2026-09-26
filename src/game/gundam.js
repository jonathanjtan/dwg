// Amuro's RX-78-2: beam saber, beam rifle, beam javelin, hyper bazooka and the Gundam hammer.
import * as THREE from 'three';
import { voxelMesh } from '../core/voxel.js';
import { P } from '../core/rig.js';
import { gundamDef, gundamWeapons } from '../models/suits.js';
import { MOVES, STANCE, BLADE } from './moves.js';
import { Hero, FLASH, curve } from './hero.js';
import { damp, lerp } from '../core/util.js';
import { Trail } from '../fx/fx.js';

const WEAPON_ID = { saber: 1, rifle: 2, javelin: 3, bazooka: 4, hammer: 5 };
const WEAPON_OF = [null, 'saber', 'rifle', 'javelin', 'bazooka', 'hammer'];
// Beam presets: the rapid rifle shot and the heavy charge shot that throws its target.
const RIFLE_SHOT = { dmg: 22, kb: 4, up: 1 };
const CHARGE_SHOT = { dmg: 72, kb: 10, up: 10, big: true, w: 2.4, r: 1.5, speed: 110 };
const SABER_COLOR = new THREE.Color(3.2, 0.55, 1.9);
const SABER_TRAIL = 0xff4fb8;

export const GUNDAM = {
  id: 'gundam', pilot: 'amuro', def: gundamDef, moves: MOVES, stance: STANCE,
  hp: 1200, run: 9.4, boostSpeed: 23, boostTime: 1.9, sprintSpeed: 18, defense: 1,
  debris: [0xe8eaf0, 0x2346a6, 0xcc2230], spAirY: 4.5, spAirReach: 7,
};

export class Gundam extends Hero {
  constructor(game) {
    super(game, GUNDAM);
  }

  buildWeapons() {
    const w = gundamWeapons();
    const hand = this.rig.nodes.hand;
    this.saberLit = 0;
    this.rifleVis = 0;
    this.hamR = 0; // hammer chain length
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
    this.ball = this.own(voxelMesh(w.ball, { scale: 0.1 }));
    this.ball.visible = false;
    this.links = [];
    for (let i = 0; i < 16; i++) {
      const l = this.own(voxelMesh(w.link, { scale: 0.12 }));
      l.visible = false;
      this.links.push(l);
    }
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

  onWeapon(w) {
    const g = this.game;
    if (w === 'saber' && this.saberScale < 0.3) g.audio.play('ignite');
    else if (w === 'javelin' || w === 'bazooka' || w === 'hammer') g.audio.play('draw', { vol: 0.7 });
  }

  onMoveTick(m, t) {
    const w = this.wpn;
    // as in Reborn the blade goes out as soon as the attack ends; the short hold only bridges one move into the next
    if (w === 'saber') this.saberLit = 0.12;
    else if (w) this.saberLit = 0;
    if (w === 'rifle') this.rifleVis = 0.6;
    if (m.ham) this.hamR = curve(m.ham, t);
  }

  onEndMusou() {
    this.hamR = 0;
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

  // Gundam-only move effects: javelin hits, the C6 shockwave, the SP lightning.
  suitEvent(name) {
    const g = this.game;
    const P0 = this.pos;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    switch (name) {
      case 'javtip': { // the beam javelin's head connects
        this.rig.root.updateMatrixWorld(true);
        const tip = this.javelin.localToWorld(this._v.set(0, 0, 4.0));
        g.fx.star(tip, 0xff8ad8, 2.4);
        g.fx.sparks(tip, 16, 0xff8ad8, 16);
        g.fx.light(tip, 0xff6fd0, 90, 14, 0.25);
        break;
      }
      case 'shock': { // C6: the blade goes into the ground and a disc of energy races out
        const c = this._w.set(P0.x + fx * 1.2, 0.2, P0.z + fz * 1.2);
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
        const c = this._w.set(P0.x + fx * 2.4, 0.3, P0.z + fz * 2.4);
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
    }
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
    const tgt = this.aimAt(ang, heavy ? 24 : 34, shot.ang !== undefined ? 0.2 : 0.6);
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

  netExtras() {
    const inMove = this.state === 'attack' || this.state === 'musou';
    const wpn = this.heldWeapon(inMove);
    return { sab: this.saberScale, wp: WEAPON_ID[wpn] || 0, hm: this.hamR, sw: inMove && wpn === 'saber' };
  }

  applyNetExtras(s) {
    const wpn = WEAPON_OF[s.wp || 0];
    this.showWeapon(wpn);
    this.blade.visible = s.sab > 0.02;
    this.blade.scale.set(1, 1, Math.max(0.001, BLADE * s.sab));
    this.rig.root.updateMatrixWorld(true);
    this.hamR = s.hm || 0;
    this.placeHammer(wpn === 'hammer' && this.hamR > 0.3);
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    this.trail.push(this._base, this._tip, s.sw && this.blade.visible);
  }
}
