// Tobia Arronax's XM-X1 Crossbone Gundam X1 Kai: the Crossbone Vanguard's space-pirate ace. A beam zanber and a
// second beam saber for the dual-blade finishers, a one-handed buster gun, a beam shield, the screw whip (a
// wire-guided claw that lashes out and hauls its catch back in), and heat daggers built into the feet. Same melee,
// shot, mobility and thruster spec as the Gundam (Reborn's sheet: 600/600/10000/800/1000) but far less defense (150
// vs the Gundam's 485): a fast, hard-hitting suit that cannot take a real beating.
import * as THREE from 'three';
import { voxelMesh } from '../core/voxel.js';
import { P } from '../core/rig.js';
import { x1kaiDef, x1kaiWeapons } from '../models/x1kai.js';
import { MOVES, STANCE, BLADE, SBLADE, WHIP_R } from './x1kai_moves.js';
import { Hero, curve } from './hero.js';
import { damp, lerp } from '../core/util.js';
import { Trail } from '../fx/fx.js';

const WEAPON_ID = { saber: 1, rifle: 2, cross: 3, whip: 4, shield: 5 };
const WEAPON_OF = [null, 'saber', 'rifle', 'cross', 'whip', 'shield'];
const BUSTER_SHOT = { dmg: 20, kb: 4, up: 1 };
const SABER_COLOR = new THREE.Color(3.2, 0.6, 2.4); // pink-violet, in the family of the game's other beam weapons
const OFF_COLOR = new THREE.Color(1.4, 2.6, 3.2); // the off-hand saber runs a shade cooler, cyan-violet
const SABER_TRAIL = 0xff5fd0;

export const X1KAI = {
  id: 'x1kai', pilot: 'tobia', def: x1kaiDef, moves: MOVES, stance: STANCE,
  hp: 1080, run: 9.4, boostSpeed: 23, boostTime: 1.9, sprintSpeed: 18, defense: 1.28, power: 1.03,
  nozzles: [[0.62, 0.44, -0.44], [-0.62, 0.44, -0.44], [0.62, -0.18, -0.44], [-0.62, -0.18, -0.44]],
  debris: [0xc4c9d6, 0x122c58, 0x1a1a20], spAirY: 4.2, spAirReach: 6.5,
  impactColor: 0xff5fd0, ringColor: 0xffb0e0, impactLight: 0xff6fd0, domeColor: 0xff4fc0,
  spColor: 0xff5fd0, spDome: 0xffa0e0, spAura: 0x8ad8ff,
};

export class X1Kai extends Hero {
  constructor(game) {
    super(game, X1KAI);
  }

  buildWeapons() {
    const w = x1kaiWeapons();
    const hand = this.rig.nodes.hand, handL = this.rig.nodes.handL;
    this.saberLit = 0; this.offLit = 0; this.rifleVis = 0;
    this.offScale = 0;
    this.whipExt = 0; // screw whip's current reach, 0..WHIP_R
    this.spinAngle = 0;
    this.mantleFlare = 0;

    this.hilt = voxelMesh(w.zanberHilt, { scale: 0.1 });
    hand.add(this.hilt);
    this.blade = this.makeBlade(SABER_COLOR, BLADE);
    hand.add(this.blade);

    this.offHilt = voxelMesh(w.saberHilt, { scale: 0.1 });
    handL.add(this.offHilt);
    this.offBlade = this.makeBlade(OFF_COLOR, SBLADE);
    handL.add(this.offBlade);

    this.buster = voxelMesh(w.buster, { scale: 0.1 });
    this.buster.position.set(0, -0.03, 0);
    hand.add(this.buster);
    this.buster.visible = false;

    this.shieldPanel = voxelMesh(w.shieldPanel, { scale: 0.1 });
    handL.add(this.shieldPanel);
    this.shieldPanel.visible = false;

    // screw whip: the claw and its chain live in world space, lashed straight out from the fist
    this.whipHead = this.own(voxelMesh(w.whipHead, { scale: 0.1 }));
    this.whipHead.visible = false;
    this.whipLinks = [];
    for (let i = 0; i < 10; i++) {
      const l = this.own(voxelMesh(w.whipLink, { scale: 0.12 }));
      l.visible = false;
      this.whipLinks.push(l);
    }

    this.trail = new Trail(this.scene, SABER_TRAIL, 16);
    this.scene.remove(this.trail.mesh);
    this.own(this.trail.mesh);
    this._base = new THREE.Vector3();
    this._tip = new THREE.Vector3();
    this._prevTip = new THREE.Vector3();
  }

  makeBlade(color, len) {
    const g = new THREE.Group();
    g.position.z = 0.3;
    const outerGeo = new THREE.BoxGeometry(0.16, 0.16, 1).translate(0, 0, 0.5);
    const coreGeo = new THREE.BoxGeometry(0.065, 0.065, 1.02).translate(0, 0, 0.5);
    const outer = new THREE.Mesh(outerGeo, new THREE.MeshBasicMaterial({
      color, toneMapped: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.7, 3.2), toneMapped: false }));
    g.add(outer, core);
    g.userData.outer = outer;
    g.userData.len = len;
    return g;
  }

  preUpdate(dt) {
    this.saberLit -= dt;
    this.offLit -= dt;
    this.rifleVis -= dt;
  }

  onMoveStart(m, w) {
    if ((w === 'saber' || w === 'cross') && this.saberScale < 0.3) this.game.audio.play('ignite');
  }

  onWeapon(w) {
    const g = this.game;
    if ((w === 'saber' || w === 'cross') && this.saberScale < 0.3) g.audio.play('ignite');
    else if (w === 'rifle' || w === 'whip' || w === 'shield') g.audio.play('draw', { vol: 0.7 });
  }

  onMoveTick(m, t) {
    const w = this.wpn;
    // as in the Gundam, the blade goes out as soon as the attack ends; the short hold only bridges into the next move
    if (w === 'saber' || w === 'cross') this.saberLit = 0.12;
    else if (w) this.saberLit = 0;
    if (w === 'cross') this.offLit = 0.12;
    else if (w) this.offLit = 0;
    if (w === 'rifle') this.rifleVis = 0.6;
    if (m.wh) this.whipExt = curve(m.wh, t);
  }

  onEndMusou() {
    this.whipExt = 0;
  }

  onInterrupt() {
    this.saberLit = 0;
    this.offLit = 0;
  }

  // outside attacks a lit blade is carried angled up and back, so it doesn't plough the ground
  carryPose(t) {
    if (this.saberScale > 0.05 && this.state !== 'attack' && this.state !== 'musou') {
      const h = P.hand * 3;
      t[h] = lerp(t[h], -2.0 - (t[P.uArmR * 3] + t[P.fArmR * 3]), Math.min(1, this.saberScale));
    }
  }

  // X1 Kai-only move effects: the C2 slam shockwave, the screw whip's lash, the SP cross-burst, the SPA meteor dive.
  suitEvent(name) {
    const g = this.game;
    const P0 = this.pos;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    switch (name) {
      case 'shock': { // C2: the heat-dagger slam opens a shockwave under the suit
        const c = this._w.set(P0.x, 0.2, P0.z);
        g.fx.shock(c, 8.6, 0xff5fd0, 0.7);
        g.fx.ring(c, 0.5, 9, 0xffb0e0, 0.55);
        g.fx.dust(c, 26, 2.0);
        g.fx.debris(c, 16, [0xc4c9d6, 0x122c58, 0x1a1a20], 12, 0.2);
        g.fx.light(c, 0xff6fd0, 150, 24, 0.45);
        g.fx.scorch(c.x, c.z, 3.4, 14);
        g.audio.play('shock');
        if (g.local === this) { g.camera.shake(0.6); g.aberr(0.7); }
        break;
      }
      case 'whipout': { // the screw whip's claw snaps out
        g.fx.sparks(this.whipHead.position, 8, 0xa0d0ff, 10);
        g.fx.light(this.whipHead.position, 0x8ad8ff, 60, 10, 0.2);
        g.audio.play('whip', { vol: 0.8 });
        break;
      }
      case 'crossburst': { // SP finisher: both blades meet in an X of light
        const c = this._w.set(P0.x + fx * 2.2, 1.8, P0.z + fz * 2.2);
        g.fx.star(c, 0xffe0f8, 3.2);
        g.fx.star(c, 0xffffff, 2.2);
        g.fx.sparks(c, 22, 0xffb0e8, 20);
        g.fx.ring(c, 0.4, 6, 0xff8ad8, 0.6, c.y, [0.8, 0]);
        g.fx.ring(c, 0.4, 6, 0xff8ad8, 0.6, c.y, [-0.8, 0]);
        g.fx.light(c, 0xff6fd0, 200, 28, 0.55);
        g.audio.play('lightning');
        g.slowmo(0.25, 0.4);
        if (g.local === this) { g.camera.shake(0.9); g.aberr(1.1); }
        break;
      }
      case 'meteor': { // SPA: the heat-dagger dive lands like a meteor
        const c = this._w.set(P0.x, 0.2, P0.z);
        g.fx.shock(c, 9, 0xff9fe0, 0.7);
        g.fx.ring(c, 0.6, 9.5, 0xffd0ee, 0.6);
        g.fx.dust(c, 36, 2.4);
        g.fx.debris(c, 26, [0xc4c9d6, 0x122c58, 0x1a1a20], 15, 0.25);
        g.fx.dome(this._v.set(c.x, 0, c.z), 1, 8, 0xff6fd0, 0.7);
        g.fx.light(c, 0xff6fd0, 200, 28, 0.6);
        g.fx.scorch(c.x, c.z, 3.8, 18);
        g.audio.play('bigboom');
        g.slowmo(0.3, 0.35);
        if (g.local === this) { g.camera.shake(1.0); g.aberr(1.2); }
        break;
      }
    }
  }

  muzzle(out) {
    if (this.wpn === 'rifle' || this.buster.visible) return this.buster.localToWorld(out.set(0, 0.05, 0.7));
    return this.rig.nodes.hand.localToWorld(out.set(0, 0.05, 1.3));
  }

  fire(shot) {
    const g = this.game;
    const ang = this.heading + (shot.ang || 0);
    let aim = ang;
    const tgt = this.aimAt(ang, 30, shot.ang !== undefined ? 0.2 : 0.6);
    if (tgt) aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
    if (tgt && shot.ang === undefined) this.faceShot(aim);
    else this.rig.root.updateMatrixWorld(true);
    const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
    const from = this.muzzle(new THREE.Vector3());
    if (shot.kind === 'blast') {
      g.fx.muzzle(from, dir, 0xff8ad8, 1.5);
      g.projectiles.heroBlast(this, this._w.set(this.pos.x + dir.x * 2.6, this.pos.y + 1.6, this.pos.z + dir.z * 2.6), 3.4, 58, 11, 7);
      g.audio.play('cshot');
      this.vel.x -= dir.x * 6;
      this.vel.z -= dir.z * 6;
      return;
    }
    if (shot.kind === 'spread') {
      // charge shot: five beams fan out from the mantle at once; one shared voice and camera kick, not five
      g.projectiles.heroBeam(this, from, dir, BUSTER_SHOT);
      g.fx.muzzle(from, dir, 0xff8ad8, 1.3);
      if (shot.ang === 0) {
        g.audio.play('cshot');
        g.camera.shake(0.4);
        g.camera.kick(4);
        g.aberr(0.5);
      }
      return;
    }
    g.projectiles.heroBeam(this, from, dir, BUSTER_SHOT);
    g.fx.muzzle(from, dir, 0xff8ad8, 1);
    g.audio.play('rifle', { pitch: 1.1 });
    g.camera.shake(0.1);
    g.camera.kick(2);
    this.vel.x -= dir.x * 3;
    this.vel.z -= dir.z * 3;
  }

  heldWeapon(inMove) {
    let wpn = inMove ? this.wpn : null;
    if (!wpn && this.rifleVis > 0) wpn = 'rifle';
    return wpn;
  }

  preVisuals(dt, inMove) {
    const wpn = this.heldWeapon(inMove);
    this.showWeapon(wpn);
    const lit = wpn === 'saber' || wpn === 'cross' || (!wpn && this.saberLit > 0);
    const offLit = wpn === 'cross' || (!wpn && this.offLit > 0);
    this.saberScale = damp(this.saberScale, lit ? 1 : 0, lit ? 22 : 24, dt);
    this.offScale = damp(this.offScale, offLit ? 1 : 0, offLit ? 22 : 24, dt);
    this.blade.visible = this.saberScale > 0.02;
    this.blade.scale.set(1, 1, Math.max(0.001, BLADE * this.saberScale));
    this.offBlade.visible = this.offScale > 0.02;
    this.offBlade.scale.set(1, 1, Math.max(0.001, SBLADE * this.offScale));
    const flick = 0.92 + Math.random() * 0.08;
    this.blade.userData.outer.material.color.copy(SABER_COLOR).multiplyScalar(flick);
    this.offBlade.userData.outer.material.color.copy(OFF_COLOR).multiplyScalar(flick);

    // the X-shaped thrusters spin faster on the boost, and snap up during the screw whip's vortex or a charge aura
    const speed = Math.hypot(this.vel.x, this.vel.z);
    const rushing = this.move?.spin ? 6 : 0;
    this.spinAngle += (1.1 + speed * 0.35 + rushing) * dt;
    this.rig.nodes.thrusters.rotation.z = this.spinAngle;

    // ABC mantle: a slow idle flutter, flared wide when the buster gun's charge shot opens it for the spread
    const flareWant = this.move?.mantleFlare ? 1 : 0;
    this.mantleFlare = damp(this.mantleFlare, flareWant, 8, dt);
    const sway = Math.sin(this.game.time * 1.6) * 0.05 - Math.min(0.3, speed * 0.02);
    this.rig.nodes.mantle.rotation.x = sway - this.mantleFlare * 0.5;
    this.rig.nodes.mantle.scale.x = 1 + this.mantleFlare * 0.3;
  }

  postVisuals(dt, inMove) {
    const wpn = this.heldWeapon(inMove);
    this.placeWhip(wpn === 'whip' && this.whipExt > 0.3);
    const swinging = inMove && (wpn === 'saber' || wpn === 'cross');
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    if (dt > 1e-4) this.tipSpeed = damp(this.tipSpeed, this._tip.distanceTo(this._prevTip) / dt, 20, dt);
    this._prevTip.copy(this._tip);
    this.trail.push(this._base, this._tip, swinging && this.blade.visible);
  }

  showWeapon(wpn) {
    this.buster.visible = wpn === 'rifle';
    this.hilt.visible = !wpn || wpn === 'saber' || wpn === 'cross';
    this.offHilt.visible = wpn === 'cross';
    this.shieldPanel.visible = wpn === 'shield';
  }

  // Screw whip: the claw and its chain, lashed straight out from the fist along the suit's heading.
  placeWhip(on) {
    this.whipHead.visible = on;
    for (const l of this.whipLinks) l.visible = on;
    if (!on) return;
    const hand = this.rig.nodes.hand.getWorldPosition(this._w);
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    const ext = Math.min(WHIP_R, Math.max(0.4, this.whipExt));
    const hx = hand.x + fx * ext, hz = hand.z + fz * ext;
    this.whipHead.position.set(hx, hand.y, hz);
    this.whipHead.rotation.y = this.heading;
    this.whipHead.rotation.z += 0.5;
    const n = this.whipLinks.length;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, l = this.whipLinks[i];
      l.position.set(lerp(hand.x, hx, u), hand.y - Math.sin(u * Math.PI) * 0.1, lerp(hand.z, hz, u));
      l.lookAt(hx, hand.y, hz);
    }
  }

  netExtras() {
    const inMove = this.state === 'attack' || this.state === 'musou';
    const wpn = this.heldWeapon(inMove);
    return {
      sab: this.saberScale, ofs: this.offScale, wp: WEAPON_ID[wpn] || 0, wh: this.whipExt,
      sw: inMove && (wpn === 'saber' || wpn === 'cross'),
    };
  }

  applyNetExtras(s) {
    const wpn = WEAPON_OF[s.wp || 0];
    this.showWeapon(wpn);
    this.saberScale = s.sab || 0;
    this.offScale = s.ofs || 0;
    this.blade.visible = this.saberScale > 0.02;
    this.blade.scale.set(1, 1, Math.max(0.001, BLADE * this.saberScale));
    this.offBlade.visible = this.offScale > 0.02;
    this.offBlade.scale.set(1, 1, Math.max(0.001, SBLADE * this.offScale));
    this.rig.root.updateMatrixWorld(true);
    this.whipExt = s.wh || 0;
    this.placeWhip(wpn === 'whip' && this.whipExt > 0.3);
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    this.trail.push(this._base, this._tip, s.sw && this.blade.visible);
  }
}
