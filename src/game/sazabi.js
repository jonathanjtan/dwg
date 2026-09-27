// Char Aznable's MSN-04 Sazabi: the Neo Zeon flagship from Char's Counterattack. A beam tomahawk (whose beam stretches
// out into a giant axe for the charge SP), a beam shot rifle, six funnels that fly off the backpack to surround a
// target, ring the suit or rain beams over the field, a mega particle cannon in the abdomen, and missiles. Reborn's
// sheet gives it the Gundam's melee and shot with less defense (368 vs 485) and far less mobility (559 vs 800), so it
// runs as a big, slow, hard-hitting suit that soaks a little more than the X1 and a little less than the Gundam.
import * as THREE from 'three';
import { voxelMesh } from '../core/voxel.js';
import { P } from '../core/rig.js';
import { sazabiDef, sazabiWeapons, SAZABI_R, SAZABI_VOXEL } from '../models/sazabi.js';
import { MOVES, STANCE, BLADE } from './sazabi_moves.js';
import { Hero, curve } from './hero.js';
import { damp, lerp } from '../core/util.js';
import { Trail } from '../fx/fx.js';

const WEAPON_ID = { saber: 1, rifle: 2 };
const WEAPON_OF = [null, 'saber', 'rifle'];
const RIFLE_SHOT = { dmg: 30, kb: 5, up: 1.5, w: 1.6, r: 1 };
const FUNNEL_SHOT = { dmg: 12, kb: 2, up: 1, r: 0.9, sp: true }; // sp: a funnel's hit doesn't hit-stop the suit
const MISSILE = { speed: 34, fuse: 1.0, r: 3, dmg: 22, kb: 5, up: 4, big: false, lite: true, smoke: 0.6 };
const BLADE_COLOR = new THREE.Color(3.2, 2.5, 0.5); // the footage's tomahawk beam burns yellow-gold
const BLADE_TRAIL = 0xffd040;
const N_FUNNELS = 6;
const FUNNEL_MODE = { tgt: 1, ring: 2, field: 3 };
const FUNNEL_MODE_OF = [null, 'tgt', 'ring', 'field'];

export const SAZABI = {
  id: 'sazabi', pilot: 'charcca', def: sazabiDef, moves: MOVES, stance: STANCE,
  hp: 1260, run: 8.6, boostSpeed: 21.5, boostTime: 2.0, sprintSpeed: 16.8, defense: 1.1, power: 1.06,
  nozzles: [[0.24, 0.07, -0.6], [-0.24, 0.07, -0.6], [0.42, 0.8, -0.8], [-0.42, 0.8, -0.8]], // backpack bells, upper verniers
  flameScale: 1.2, exhaust: 0xffa060,
  debris: [0xb81c2a, 0x1c1c24, 0xe8b830], spAirY: 4.8, spAirReach: 7.5,
  impactColor: 0xffc040, ringColor: 0xffe090, impactLight: 0xffb040, domeColor: 0xff6040,
  spColor: 0xff4a3a, spDome: 0xffa080, spAura: 0xff4a3a, hitColor: 0xffe0a0,
  airPose: { uArmL: [-0.6, 0, 0.5], fArmL: [-1.0, 0, 0] },
};

export class Sazabi extends Hero {
  constructor(game) {
    super(game, SAZABI);
  }

  buildWeapons() {
    const w = sazabiWeapons();
    const hand = this.rig.nodes.hand;
    this.saberLit = 0; this.rifleVis = 0;
    this.bladeLen = 1; // `bl` multiplier: the charge SP's giant axe

    this.hilt = voxelMesh(w.hawk, { scale: SAZABI_VOXEL });
    hand.add(this.hilt);
    this.blade = this.makeBlade();
    hand.add(this.blade);

    this.rifle = voxelMesh(w.rifle, { scale: SAZABI_VOXEL });
    this.rifle.position.set(0, -0.03, 0);
    hand.add(this.rifle);
    this.rifle.visible = false;

    // six funnels, in world space: they fly off the backpack and back
    this.funnels = [];
    for (let i = 0; i < N_FUNNELS; i++) {
      const f = this.own(voxelMesh(w.funnel, { scale: 0.16 / SAZABI_R })); // funnels fly a little larger than life
      f.visible = false;
      this.funnels.push(f);
    }
    this.funnelMode = null;
    this.funnelOut = 0; // 0 docked .. 1 on station
    this.funnelT = 0;
    this.funnelAnchor = new THREE.Vector3();
    this.funnelTarget = null;

    this.trail = new Trail(this.scene, BLADE_TRAIL, 16);
    this.scene.remove(this.trail.mesh);
    this.own(this.trail.mesh);
    this._base = new THREE.Vector3();
    this._tip = new THREE.Vector3();
    this._prevTip = new THREE.Vector3();
    this._home = new THREE.Vector3();
    this._slot = new THREE.Vector3();
    this._f = new THREE.Vector3();
  }

  makeBlade() {
    const g = new THREE.Group();
    g.position.z = 0.45;
    const outer = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1).translate(0, 0, 0.5), new THREE.MeshBasicMaterial({
      color: BLADE_COLOR, toneMapped: false, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.02).translate(0, 0, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3, 2.4), toneMapped: false }));
    // the tomahawk's axe head: a short fan of beam at the base, off to one side
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.32).translate(0, 0.3, 0.2), outer.material);
    g.add(outer, core, head);
    g.userData.outer = outer;
    g.userData.stretch = [outer, core];
    return g;
  }

  preUpdate(dt) {
    this.saberLit -= dt;
    this.rifleVis -= dt;
  }

  onMoveStart(m, w) {
    if (w === 'saber' && this.saberScale < 0.3) this.game.audio.play('ignite');
  }

  onWeapon(w) {
    if (w === 'saber' && this.saberScale < 0.3) this.game.audio.play('ignite');
    else if (w === 'rifle') this.game.audio.play('draw', { vol: 0.7 });
  }

  onMoveTick(m, t) {
    const w = this.wpn;
    if (w === 'saber') this.saberLit = 0.12;
    else if (w) this.saberLit = 0;
    if (w === 'rifle') this.rifleVis = 0.6;
    this.bladeLen = m.bl ? curve(m.bl, t) : 1;
  }

  onMoveEnd() {
    this.bladeLen = 1;
  }

  onEndMusou() {
    this.bladeLen = 1;
    this.recallFunnels();
  }

  onInterrupt() {
    this.saberLit = 0;
    this.bladeLen = 1;
    this.recallFunnels();
  }

  reset() {
    super.reset();
    this.funnelMode = null;
    this.funnelOut = 0;
  }

  recallFunnels() {
    this.funnelMode = null;
    this.funnelTarget = null;
  }

  carryPose(t) {
    if (this.saberScale > 0.05 && this.state !== 'attack' && this.state !== 'musou') {
      const h = P.hand * 3;
      t[h] = lerp(t[h], -2.0 - (t[P.uArmR * 3] + t[P.fArmR * 3]), Math.min(1, this.saberScale));
    }
  }

  // ---------- funnels ----------
  deployFunnels(mode) {
    this.funnelMode = mode;
    this.funnelT = 0;
    this.funnelTarget = null;
    const P0 = this.pos;
    if (mode === 'tgt') {
      const t = this.airborneAhead() || this.aimAt(this.heading, 22, 1.2);
      this.funnelTarget = t;
      if (t) this.funnelAnchor.set(t.x ?? t.pos.x, t.y ?? t.pos?.y ?? 0, t.z ?? t.pos.z);
      else this.funnelAnchor.set(P0.x + Math.sin(this.heading) * 7, 0, P0.z + Math.cos(this.heading) * 7);
    } else this.funnelAnchor.set(P0.x, P0.y, P0.z);
    this.game.audio.play('draw', { vol: 0.8, pitch: 1.4 });
    this.game.fx.sparks(this._v.set(P0.x, P0.y + 4, P0.z), 10, 0xffc860, 10);
  }

  // Where funnel i sits on station for the current mode.
  funnelSlot(i, out) {
    const a = (i / N_FUNNELS) * Math.PI * 2 + this.funnelT * (this.funnelMode === 'field' ? 0.5 : 1.3);
    const A = this.funnelAnchor;
    if (this.funnelMode === 'tgt') return out.set(A.x + Math.sin(a) * 4, A.y + 2.2 + Math.sin(a * 2 + this.funnelT * 3) * 1.2, A.z + Math.cos(a) * 4);
    const P0 = this.pos;
    if (this.funnelMode === 'field') {
      const r = 6 + (i % 3) * 2.6;
      return out.set(P0.x + Math.sin(a) * r, 7.5 + (i % 2), P0.z + Math.cos(a) * r);
    }
    return out.set(P0.x + Math.sin(a) * 4.8, P0.y + 4.2 + (i % 2) * 0.8, P0.z + Math.cos(a) * 4.8);
  }

  updateFunnels(dt) {
    const out = this.funnelMode ? 1 : 0;
    this.funnelOut = damp(this.funnelOut, out, out ? 6 : 5, dt);
    this.funnelT += dt;
    const t = this.funnelTarget;
    if (this.funnelMode === 'tgt' && t && (t.alive ?? true)) {
      const ty = t.y ?? t.pos?.y ?? 0;
      this.funnelAnchor.set(damp(this.funnelAnchor.x, t.x ?? t.pos.x, 8, dt), damp(this.funnelAnchor.y, ty, 8, dt), damp(this.funnelAnchor.z, t.z ?? t.pos.z, 8, dt));
    }
    this.placeFunnels();
  }

  placeFunnels() {
    const on = this.funnelOut > 0.04;
    this.rig.nodes.torso.localToWorld(this._home.set(0, 1.6, -0.8)); // the racks behind the head
    for (let i = 0; i < N_FUNNELS; i++) {
      const f = this.funnels[i];
      f.visible = on;
      if (!on) continue;
      if (this.funnelMode) this.funnelSlot(i, this._slot);
      else this._slot.copy(f.position);
      const u = this.funnelOut;
      const h = this._home;
      const arc = this.funnelMode ? Math.sin(u * Math.PI) * 2.5 : 0; // arc out on the way out; straight home
      f.position.set(lerp(h.x, this._slot.x, u), lerp(h.y, this._slot.y, u) + arc, lerp(h.z, this._slot.z, u));
      // nose toward what it shoots at: the target, the ground below, or straight out from the suit
      if (this.funnelMode === 'tgt') f.lookAt(this.funnelAnchor.x, this.funnelAnchor.y + 1.6, this.funnelAnchor.z);
      else if (this.funnelMode === 'field') f.lookAt(f.position.x + 0.01, 0, f.position.z);
      else if (this.funnelMode === 'ring') f.lookAt(f.position.x * 2 - this.pos.x, f.position.y - 1, f.position.z * 2 - this.pos.z);
    }
  }

  // ---------- Sazabi-only move effects ----------
  suitEvent(name, arg) {
    const g = this.game;
    const P0 = this.pos;
    const fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    switch (name) {
      case 'funnels':
        this.deployFunnels(arg);
        break;
      case 'recall':
        this.recallFunnels();
        break;
      case 'chop': { // N3: the overhead chop bites the ground
        const c = this._w.set(P0.x + fx * 4, 0.2, P0.z + fz * 4);
        g.fx.dust(c, 10, 1.4);
        g.fx.sparks(c, 10, 0xffd060, 10);
        g.fx.scorch(c.x, c.z, 1.6, 8);
        break;
      }
      case 'skid': { // DAF: the belly slam throws up a wake of dust
        const c = this._w.set(P0.x + fx * 2, 0.2, P0.z + fz * 2);
        g.fx.dust(c, 22, 2.0);
        g.fx.debris(c, 12, [0x8a867c, 0x6f6c64, 0xb81c2a], 9, 0.22);
        if (g.local === this) g.camera.shake(0.5);
        break;
      }
      case 'megacharge': { // the abdominal port gathers light
        const c = this.rig.nodes.torso.localToWorld(this._w.set(0, 0.15, 0.4));
        g.fx.star(c, 0xff8ab0, 1.4);
        g.fx.aura(c, 0xff6a9a, 3, 0.8);
        g.audio.play('charge', { vol: 0.6 });
        break;
      }
      case 'mega': { // C2: the mega particle cannon point-blank
        const c = this.rig.nodes.torso.localToWorld(this._w.set(0, 0.15, 0.4));
        const dir = this._f.set(fx, 0, fz);
        g.fx.muzzle(c, dir, 0xff8ab0, 2.4);
        for (let i = 0; i < 3; i++) g.projectiles.heroBeam(this, c, dir, { dmg: 6, kb: 3, up: 2, w: 2, r: 1.4, max: 0.12 });
        g.projectiles.heroBlast(this, this._v.set(P0.x + fx * 3.6, 1.8, P0.z + fz * 3.6), 4.2, 62, 12, 8, { sound: 'cshot' });
        this.vel.x -= fx * 6;
        this.vel.z -= fz * 6;
        if (g.local === this) { g.camera.shake(0.6); g.aberr(0.8); }
        break;
      }
      case 'starburst': { // C3: all six funnels fire at once, a star of light on the catch
        const c = this._w.set(this.funnelAnchor.x, this.funnelAnchor.y + 1.8, this.funnelAnchor.z);
        g.fx.star(c, 0xffffff, 3);
        g.fx.star(c, 0xffe090, 2.2);
        g.fx.sparks(c, 20, 0xffe090, 16);
        g.fx.light(c, 0xffd070, 160, 22, 0.4);
        g.combat.aoe(this, c.x, c.y - 1.6, c.z, 3.4, 30, 6, 6, ++this.hitSerial, true, false);
        g.audio.play('cshot', { vol: 0.8 });
        if (g.local === this) g.aberr(0.6);
        break;
      }
      case 'megabeam': { // SP finisher: the mega particle cannon's full-length beam, a thick column of pink light
        const c = this.rig.nodes.torso.localToWorld(this._w.set(0, 0.15, 0.4));
        const dir = this._f.set(fx, 0, fz);
        g.fx.muzzle(c, dir, 0xff8ab0, 3.2);
        g.fx.star(c, 0xffffff, 3);
        g.fx.light(c, 0xff7aa8, 220, 30, 0.9);
        for (let i = 0; i < 16; i++) {
          const o = this._v.set(c.x + (Math.random() - 0.5) * 1.6, c.y + (Math.random() - 0.5) * 1.6, c.z + (Math.random() - 0.5) * 1.6);
          g.projectiles.heroBeam(this, o, dir, { dmg: 3, kb: 1, up: 1, w: 2, r: 1.2, speed: 60 + i * 5, max: 0.35, sp: true });
        }
        g.audio.play('cshot');
        g.audio.play('lightning', { vol: 0.8 });
        g.slowmo(0.25, 0.4);
        if (g.local === this) { g.camera.shake(1.0); g.aberr(1.2); }
        break;
      }
      case 'burstgreen': { // air SP finisher: one heavy shot, a green-white burst on the ground below
        const tgt = this.aimAt(this.heading, 16, 1.4);
        const x = tgt ? tgt.x : P0.x + fx * 5, z = tgt ? tgt.z : P0.z + fz * 5;
        const from = this.muzzle(new THREE.Vector3());
        const dir = new THREE.Vector3(x - from.x, 1 - from.y, z - from.z).normalize();
        g.projectiles.heroBeam(this, from, dir, { ...RIFLE_SHOT, w: 2, max: 0.2 });
        const c = this._w.set(x, 0.4, z);
        g.fx.dome(c, 1, 8, 0x7fffbe, 0.7);
        g.fx.shock(c, 8.5, 0x9fffd0, 0.7);
        g.fx.star(this._v.set(x, 2, z), 0xe0fff0, 3.4);
        g.fx.light(c, 0x9fffd0, 200, 28, 0.6);
        g.fx.scorch(x, z, 3.8, 18);
        g.projectiles.heroBlast(this, this._v.set(x, 1.5, z), 8, 130, 14, 10, { sp: true, sound: 'bigboom' });
        g.slowmo(0.3, 0.35);
        if (g.local === this) { g.camera.shake(1.0); g.aberr(1.2); }
        break;
      }
      case 'bigaxe': { // charge SP finisher: the giant axe's sweep lands in a ring of fire
        const c = this._w.set(P0.x, 0.2, P0.z);
        g.fx.shock(c, 13, 0xff4a3a, 0.8);
        g.fx.ring(c, 1, 13.5, 0xffc060, 0.7);
        g.fx.dust(c, 40, 2.6);
        g.fx.light(this._v.set(P0.x, 2, P0.z), 0xff6a40, 220, 32, 0.7);
        g.audio.play('bigboom');
        g.slowmo(0.3, 0.4);
        if (g.local === this) { g.camera.shake(1.1); g.aberr(1.3); }
        break;
      }
    }
  }

  muzzle(out) {
    if (this.wpn === 'rifle' || this.rifle.visible) return this.rifle.localToWorld(out.set(0, 0.02, 1.25));
    return this.rig.nodes.hand.localToWorld(out.set(0, 0.05, 1.3));
  }

  fire(shot) {
    const g = this.game;
    if (shot.kind === 'funnel') return this.fireFunnel(shot);
    if (shot.kind === 'missile') {
      // from the shield: four missiles fanned down at the ground ahead
      const from = this.rig.nodes.handL.localToWorld(new THREE.Vector3(0.3, 0, 0));
      const a = this.heading + shot.ang;
      const dir = new THREE.Vector3(Math.sin(a), -0.55, Math.cos(a)).normalize();
      g.projectiles.shell(this, from, dir, MISSILE);
      g.fx.muzzle(from, dir, 0xffb060, 0.8);
      g.audio.play('bazooka', { vol: 0.5, pitch: 1.3 });
      return;
    }
    if (shot.kind === 'down') {
      // air SP: the shot rifle hammers the ground under whatever it's tracking
      const tgt = this.aimAt(this.heading, 18, 1.4);
      const j = () => (Math.random() - 0.5) * 3;
      const x = (tgt ? tgt.x : this.pos.x + Math.sin(this.heading) * 5) + j();
      const z = (tgt ? tgt.z : this.pos.z + Math.cos(this.heading) * 5) + j();
      this.rig.root.updateMatrixWorld(true);
      const from = this.muzzle(new THREE.Vector3());
      const dir = new THREE.Vector3(x - from.x, 0.3 - from.y, z - from.z);
      const dist = dir.length();
      dir.normalize();
      g.projectiles.heroBeam(this, from, dir, { ...RIFLE_SHOT, max: dist / 120 });
      g.fx.muzzle(from, dir, 0xffd060, 1.2);
      g.projectiles.heroBlast(this, this._v.set(x, 0.8, z), 3.6, 34, 8, 6, { sp: true, big: false, sound: 'srifle' });
      g.camera.shake(0.2);
      return;
    }
    // the beam shot rifle
    let aim = this.heading;
    const tgt = this.aimAt(aim, 32, 0.6);
    if (tgt) aim = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
    if (tgt) this.faceShot(aim);
    else this.rig.root.updateMatrixWorld(true);
    const dir = new THREE.Vector3(Math.sin(aim), 0, Math.cos(aim));
    const from = this.muzzle(new THREE.Vector3());
    g.projectiles.heroBeam(this, from, dir, RIFLE_SHOT);
    g.fx.muzzle(from, dir, 0xffd060, 1.3);
    g.audio.play('srifle');
    g.camera.shake(0.15);
    g.camera.kick(3);
    this.vel.x -= dir.x * 4;
    this.vel.z -= dir.z * 4;
  }

  fireFunnel(shot) {
    const g = this.game;
    if (!this.funnelMode || this.funnelOut < 0.5) return;
    const f = this.funnels[shot.i % N_FUNNELS];
    const from = this._f.copy(f.position);
    let dir;
    if (shot.mode === 'rain') {
      // pick something on the ground near this funnel and hit it from above
      const e = g.combat.acquire(from, 0, 7, Math.PI);
      const x = (e ? e.x : from.x) + (Math.random() - 0.5) * 2.5, z = (e ? e.z : from.z) + (Math.random() - 0.5) * 2.5;
      dir = new THREE.Vector3(x - from.x, 0.3 - from.y, z - from.z);
      const dist = dir.length();
      dir.normalize();
      g.projectiles.heroBeam(this, from, dir, { ...FUNNEL_SHOT, max: dist / 120 });
      g.projectiles.heroBlast(this, this._v.set(x, 0.6, z), 2.6, 14, 4, 3, { lite: true, sp: true, big: false, sound: 'funnel' });
      return;
    }
    if (shot.mode === 'out') {
      // straight out from the suit, angled a little down into the crowd
      const dx = from.x - this.pos.x, dz = from.z - this.pos.z, l = Math.hypot(dx, dz) || 1;
      dir = new THREE.Vector3(dx / l, -0.3, dz / l).normalize();
    } else {
      const A = this.funnelAnchor;
      dir = new THREE.Vector3(A.x - from.x + (Math.random() - 0.5), A.y + 1.6 - from.y, A.z - from.z + (Math.random() - 0.5)).normalize();
    }
    g.projectiles.heroBeam(this, from, dir, FUNNEL_SHOT);
    g.fx.muzzle(from, dir, 0xffd060, 0.7);
    g.audio.play('funnel', { at: from });
  }

  heldWeapon(inMove) {
    let wpn = inMove ? this.wpn : null;
    if (!wpn && this.rifleVis > 0) wpn = 'rifle';
    return wpn;
  }

  setBlade() {
    this.blade.visible = this.saberScale > 0.02;
    const len = Math.max(0.001, BLADE * this.saberScale * this.bladeLen);
    for (const m of this.blade.userData.stretch) m.scale.z = len;
    this.blade.children[2].scale.setScalar(Math.max(0.001, this.saberScale) * (0.8 + this.bladeLen * 0.4));
  }

  preVisuals(dt, inMove) {
    const wpn = this.heldWeapon(inMove);
    this.showWeapon(wpn);
    const lit = wpn === 'saber' || (!wpn && this.saberLit > 0);
    this.saberScale = damp(this.saberScale, lit ? 1 : 0, lit ? 22 : 24, dt);
    this.setBlade();
    const flick = 0.92 + Math.random() * 0.08;
    this.blade.userData.outer.material.color.copy(BLADE_COLOR).multiplyScalar(flick * (this.bladeLen > 1.2 ? 1.3 : 1));
  }

  postVisuals(dt, inMove) {
    this.updateFunnels(dt);
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
    this.hilt.visible = wpn !== 'rifle';
  }

  netExtras() {
    const inMove = this.state === 'attack' || this.state === 'musou';
    const wpn = this.heldWeapon(inMove);
    const A = this.funnelAnchor;
    return {
      sab: this.saberScale, bl: this.bladeLen, wp: WEAPON_ID[wpn] || 0, sw: inMove && wpn === 'saber',
      fm: FUNNEL_MODE[this.funnelMode] || 0, fo: this.funnelOut, ft: this.funnelT, fa: [A.x, A.y, A.z],
    };
  }

  applyNetExtras(s) {
    const wpn = WEAPON_OF[s.wp || 0];
    this.showWeapon(wpn);
    this.saberScale = s.sab || 0;
    this.bladeLen = s.bl || 1;
    this.setBlade();
    this.rig.root.updateMatrixWorld(true);
    this.funnelMode = FUNNEL_MODE_OF[s.fm || 0];
    this.funnelOut = s.fo || 0;
    this.funnelT = s.ft || 0;
    if (s.fa) this.funnelAnchor.set(s.fa[0], s.fa[1], s.fa[2]);
    this.placeFunnels();
    this.blade.localToWorld(this._base.set(0, 0, 0.18));
    this.blade.localToWorld(this._tip.set(0, 0, 1));
    this.trail.push(this._base, this._tip, s.sw && this.blade.visible);
  }
}
