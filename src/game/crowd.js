// Zaku II grunt crowd: instanced rendering + lightweight squad AI.
import * as THREE from 'three';
import { InstancedRig, Clip, makePose, poseFrom, lerpPose, P, RY, RPITCH, RROLL, RYAW } from '../core/rig.js';
import { zakuDef, Z } from '../models/suits.js';
import { SpatialHash, rand, clamp, angleDamp, wrapAngle, damp } from '../core/util.js';
import { lensClear } from '../core/lensclear.js';

const MAX = 300;
const GRAV = 30;
const WALK = 3.7;
const AGGRO = 22; // a garrison squad engages when a pilot comes this close
const LEASH = 60; // ...and falls back to its post once every pilot is this far away
const AIM_T = 1.05; // how long a gunner shows its aim line before the burst

const ZSTANCE = poseFrom({
  y: -0.05, torso: [0.06, 0, 0], head: [0, 0, 0],
  uArmR: [-0.25, 0, -0.18], fArmR: [-0.55, 0, 0], hand: [0.35, 0, 0],
  uArmL: [-0.1, 0, 0.18], fArmL: [-0.45, 0, 0],
  thighR: [-0.12, 0, -0.06], shinR: [0.22, 0, 0], thighL: [-0.08, 0, 0.06], shinL: [0.18, 0, 0],
});
const GUN_STANCE = poseFrom({
  uArmR: [-0.45, 0, -0.1], fArmR: [-1.0, 0, 0], hand: [1.1, 0, 0],
  uArmL: [-0.7, 0, -0.2], fArmL: [-1.1, 0, 0],
}, ZSTANCE);
const GUN_AIM = poseFrom({
  torso: [0, -0.25, 0], head: [0, 0.2, 0],
  uArmR: [-1.5, 0, 0.1], fArmR: [0, 0, 0], hand: [1.55, 0, 0],
  uArmL: [-1.35, 0, -0.45], fArmL: [-0.5, 0, 0],
  thighR: [-0.4, 0, -0.1], shinR: [0.5, 0, 0], thighL: [0.25, 0, 0.1], shinL: [0.1, 0, 0], y: -0.12,
}, ZSTANCE);
const WINDUP = new Clip([
  { t: 0, p: {} },
  { t: 0.5, p: { torso: [-0.25, -0.35, 0], uArmR: [-2.9, 0, -0.25], fArmR: [-0.5, 0, 0], hand: [0.1, 0, 0], uArmL: [-0.5, 0, 0.4], thighR: [0.2, 0, -0.1], thighL: [-0.4, 0, 0.1], shinL: [0.4, 0, 0], y: -0.08 } },
], ZSTANCE);
const STRIKE = new Clip([
  { t: 0, p: { torso: [-0.25, -0.35, 0], uArmR: [-2.9, 0, -0.25], fArmR: [-0.5, 0, 0], hand: [0.1, 0, 0], uArmL: [-0.5, 0, 0.4], thighR: [0.2, 0, -0.1], thighL: [-0.4, 0, 0.1], shinL: [0.4, 0, 0], y: -0.08 } },
  { t: 0.14, p: { torso: [0.5, 0.25, 0], uArmR: [-0.5, 0, -0.1], fArmR: [-0.1, 0, 0], hand: [0.6, 0, 0], uArmL: [0.2, 0, 0.3], thighR: [-0.7, 0, -0.1], shinR: [0.8, 0, 0], thighL: [0.4, 0, 0.1], shinL: [0.2, 0, 0], y: -0.3 }, e: 'snap' },
  { t: 0.6, p: { torso: [0.35, 0.15, 0], y: -0.22 } },
], ZSTANCE);
// Flinch variants (thrown back / twisted / doubled over), each mirrored: a struck line ripples instead of cloning.
const RECOILS = [
  { torso: [-0.78, 0, 0.06], head: [-0.75, 0, 0], uArmR: [-2.4, 0.2, -0.95], uArmL: [-2.3, -0.2, 1.0], fArmR: [-0.3, 0, 0], fArmL: [-0.3, 0, 0], thighR: [0.32, 0, -0.14], thighL: [-0.6, 0, 0.2], shinR: [0.2, 0, 0], shinL: [1.0, 0, 0], y: -0.12 },
  { torso: [-0.62, 0.55, 0.2], head: [-0.65, -0.35, 0.1], uArmR: [-2.85, 0, -0.35], uArmL: [-0.95, 0, 1.35], thighR: [0.4, 0, -0.18], thighL: [-0.35, 0, 0.3], shinR: [0.35, 0, 0], shinL: [0.7, 0, 0], y: -0.12 },
  { torso: [0.72, 0, 0.1], head: [0.2, 0.25, 0], uArmR: [-1.35, 0, -0.75], uArmL: [-1.25, 0, 0.8], thighR: [-0.55, 0, -0.2], thighL: [-0.2, 0, 0.18], shinR: [1.1, 0, 0], shinL: [0.8, 0, 0], y: -0.3 },
].flatMap((r) => { const a = poseFrom(r, ZSTANCE); return [a, mirrorPose(a)]; });

function mirrorPose(src) {
  const out = Float32Array.from(src);
  const swap = [['uArmR', 'uArmL'], ['fArmR', 'fArmL'], ['thighR', 'thighL'], ['shinR', 'shinL']];
  for (const [a, b] of swap) for (let k = 0; k < 3; k++) { out[P[a] * 3 + k] = src[P[b] * 3 + k]; out[P[b] * 3 + k] = src[P[a] * 3 + k]; }
  for (let i = 0; i < 13; i++) { out[i * 3 + 1] *= -1; out[i * 3 + 2] *= -1; }
  out[RROLL] *= -1; out[RYAW] *= -1;
  return out;
}
const hash01 = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const TAU = Math.PI * 2;
const AIRPOSE = poseFrom({ torso: [-0.4, 0, 0], head: [-0.5, 0, 0], uArmR: [-2.2, 0, -0.8], fArmR: [-0.3, 0, 0], uArmL: [-2.2, 0, 0.8], fArmL: [-0.3, 0, 0], thighR: [-0.6, 0, -0.2], shinR: [0.9, 0, 0], thighL: [-0.2, 0, 0.2], shinL: [0.5, 0, 0] }, ZSTANCE);
const DOWNPOSE = poseFrom({ pitch: -1.5, torso: [-0.1, 0, 0], head: [-0.3, 0.4, 0], uArmR: [-0.3, 0, -1.1], uArmL: [-0.2, 0, 1.2], thighR: [-0.5, 0, -0.2], shinR: [0.8, 0, 0], thighL: [0, 0, 0.2], shinL: [0.2, 0, 0], y: 0 }, ZSTANCE);
const GETUP = poseFrom({ pitch: 0, torso: [0.6, 0, 0], head: [-0.2, 0, 0], uArmR: [-0.6, 0, -0.4], uArmL: [-0.6, 0, 0.4], thighR: [-1.1, 0, -0.1], shinR: [1.6, 0, 0], thighL: [-0.4, 0, 0.2], shinL: [1.2, 0, 0], y: -0.55 }, ZSTANCE);
const SPAWN_POSE = poseFrom({ thighR: [-0.7, 0, -0.1], shinR: [1.1, 0, 0], thighL: [-0.2, 0, 0.1], shinL: [0.5, 0, 0], uArmR: [-0.3, 0, -0.6], uArmL: [-0.3, 0, 0.6] }, ZSTANCE);

const EXPLODE_COLORS = [Z.DG, Z.LG, Z.J, 0x2b2e2a];
const HIT_GOLD = [1.0, 0.6, 0.12], HIT_AMBER = [1.0, 0.4, 0.07], HIT_KILL = [1.2, 0.25, 0.12];

export class Crowd {
  constructor(game) {
    this.game = game;
    this.def = zakuDef();
    this.rig = new InstancedRig(this.def, MAX, game.scene);
    lensClear(this.rig.mat);
    this.list = [];
    this.pool = [];
    for (let i = 0; i < MAX; i++) this.pool.push(this.makeGrunt(i));
    this.grid = new SpatialHash(3);
    this.tmp = [];
    this.meleeTokens = 0;
    this.gunTokens = 0;
    this.maxMelee = 3;
    this.maxGun = 1;
    this.nextVolley = 0; // game time before which no gunner may start another aim (shooting is rare, as in Reborn)
    this.boomBudget = 0;
    this.feintUntil = 0;
    this.pressT = 0;
    this._cand = [];
    this.lensHid = new Uint8Array(MAX);
    this._v = new THREE.Vector3();
    this._r = [0, 0];
    this.serial = 0;
  }

  makeGrunt(i) {
    return {
      i, alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, hp: 60, maxHp: 60,
      state: 'idle', t: 0, phase: rand(0, 6), gun: false, cd: 0, token: 0, flash: 0,
      hitIds: [0, 0, 0, 0], hitCursor: 0, ringA: 0, ringR: 6, spin: 0, pitch: 0, roll: 0, aimYaw: 0, aimY: 0,
      pose: makePose(), scale: 1, radius: 0.95, dieT: 0, spawnVy: 0, fired: 0, think: 0, lastHitT: -9,
      kind: 'grunt', height: 3.1, staggerAlt: false, aggro: rand(0.6, 1.2),
      squad: null, slotX: 0, slotZ: 0, press: false, outerR: 13,
    };
  }

  get count() {
    return this.list.length;
  }

  // squad: { x, z, engaged, n, base?, hunt? } — garrisons hold their post around (x, z) until a pilot comes near.
  spawn(x, z, { gun = false, drop = false, yaw = 0, hp = 50, squad = null } = {}) {
    const g = this.pool.pop();
    if (!g) return null;
    g.alive = true;
    g.id = ++this.serial;
    g.x = x; g.z = z; g.y = drop ? rand(18, 30) : 0;
    g.vx = g.vz = 0;
    g.vy = drop ? -rand(10, 16) : 0;
    g.yaw = yaw;
    g.hp = g.maxHp = hp * this.game.difficulty.enemyHp;
    g.gun = gun;
    g.state = drop ? 'drop' : 'idle';
    g.t = 0;
    g.cd = gun ? rand(3, 8) : rand(0.5, 2.5);
    g.token = 0;
    g.flash = 0;
    g.pitch = g.roll = g.spin = 0;
    g.pitchRate = 0; g.pitchTarget = 0; g.shudder = 0; g.hitKind = 0; g.feint = false; g.bounced = false;
    g.hitIds.fill(0);
    g.ringA = rand(0, Math.PI * 2);
    // Reborn's mobs pack in around the pilot: the front rank at arm's length, the rest a body or two behind them
    // (1-3 suit heights), gunners on the rim of the crowd
    g.ringR = gun ? rand(9, 13) : rand(3.4, 5.4);
    g.outerR = rand(5.8, 9.6);
    g.press = false;
    g.squad = squad;
    if (squad) {
      squad.n++;
      g.slotX = x - squad.x;
      g.slotZ = z - squad.z;
    }
    g.think = rand(0, 0.5);
    g.dieT = 0;
    g.scale = rand(0.97, 1.04);
    g.aggro = rand(0.6, 1.3);
    this.list.push(g);
    return g;
  }

  remove(g) {
    g.alive = false;
    this.releaseToken(g);
    if (g.squad) { g.squad.n--; g.squad = null; }
    const idx = this.list.indexOf(g);
    if (idx >= 0) {
      this.list[idx] = this.list[this.list.length - 1];
      this.list.pop();
    }
    this.pool.push(g);
  }

  clear() {
    while (this.list.length) this.remove(this.list[0]);
    this.meleeTokens = this.gunTokens = 0;
  }

  releaseToken(g) {
    if (g.token === 1) this.meleeTokens--;
    if (g.token === 2) this.gunTokens--;
    g.token = 0;
  }

  alreadyHit(g, id) {
    return g.hitIds.includes(id);
  }

  // Called by combat when the hero's attack connects.
  damage(g, dmg, kb, up, fromX, fromZ, id, opts = {}) {
    if (!g.alive || g.state === 'dying' || g.state === 'held') return false;
    if (id && this.alreadyHit(g, id)) return false;
    if (id) {
      g.hitIds[g.hitCursor] = id;
      g.hitCursor = (g.hitCursor + 1) & 3;
    }
    const game = this.game;
    g.hp -= dmg;
    const heavy = up > 6 || kb > 8.5 || !!opts.big;
    g.flash = 1;
    g.hitKind = g.hp <= 0 ? 2 : heavy ? 1 : 0;
    g.shudder = 0.05; // victims hold for ~3 frames, then the reaction carries the weight
    g.lastHitT = game.time;
    this.releaseToken(g);
    if (g.squad) g.squad.engaged = true;
    let dx = g.x - fromX, dz = g.z - fromZ;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    if (opts.pull) { dx = -dx * 0.5; dz = -dz * 0.5; kb = opts.pull; }
    g.yaw = Math.atan2(-dx, -dz);
    // lens cut: bodies blown straight at the camera swing ~75 degrees sideways
    const cam = game.camera.cam.position, h = game.local.pos;
    let cx = cam.x - h.x, cz = cam.z - h.z;
    const cl = Math.hypot(cx, cz) || 1;
    cx /= cl; cz /= cl;
    if (dx * cx + dz * cz > 0.55) {
      const side = dx * cz - dz * cx >= 0 ? 1 : -1, a = 1.3 * side;
      const nx = dx * Math.cos(a) - dz * Math.sin(a), nz = dx * Math.sin(a) + dz * Math.cos(a);
      dx = nx; dz = nz;
    }
    const airborne = g.state === 'air' || g.y > 0.3;
    if (up > 0 || kb > 7.5 || airborne || g.hp <= 0) {
      const ko = g.hp <= 0;
      g.state = 'air';
      g.t = 0;
      g.bounced = false;
      let hf = ko ? Math.max(kb, 8) * 1.35 : kb;
      if (opts.radial) hf *= 0.45; // radial launchers send bodies up, not out
      g.vx = dx * hf;
      g.vz = dz * hf;
      const lift = ko ? Math.max(up, 7.5) : up > 0 ? up : kb > 7.5 ? 5 : 3.5;
      g.vy = airborne ? Math.min(Math.max(g.vy, 0) + lift * 0.6, 9) : lift;
      // plan the tumble so bodies touch down already lying on their backs (KOs cartwheel 450 degrees)
      const flight = (2 * g.vy) / GRAV * 1.25 + Math.sqrt((2 * g.y) / GRAV);
      g.pitchTarget = ko ? -(Math.PI / 2 + TAU) : -Math.PI / 2;
      if (airborne) g.pitchTarget = Math.min(g.pitch, g.pitchTarget);
      g.pitchRate = (g.pitchTarget - g.pitch) / Math.max(0.3, flight);
    } else {
      g.state = 'stagger';
      g.t = 0;
      g.vx = dx * kb;
      g.vz = dz * kb;
      g.staggerAlt = !g.staggerAlt;
    }
    return true;
  }

  kill(g) {
    g.state = 'dying';
    g.t = 0;
    g.dieT = rand(0.35, 0.7);
  }

  // Grabs: a pilot takes hold of a soldier (it stops fighting and goes where the hands put it), then lets go.
  hold(g, holder) {
    this.releaseToken(g);
    g.state = 'held';
    g.holder = holder;
    g.t = 0;
    g.vx = g.vy = g.vz = 0;
    g.flash = 1;
    g.hitKind = 1;
    g.shudder = 0;
    if (g.squad) g.squad.engaged = true;
  }

  place(g, x, y, z, yaw, pitch) {
    g.x = x; g.y = y; g.z = z;
    g.yaw = yaw;
    g.pitch = pitch;
  }

  // Let go with a velocity (a throw, or just dropping it): the body tumbles and lands on its back like a launch.
  fling(g, vx, vy, vz, dmg = 0, big = false) {
    if (!g.alive || g.state !== 'held') return;
    g.holder = null;
    g.hp -= dmg;
    g.flash = dmg ? 1 : 0;
    g.hitKind = g.hp <= 0 ? 2 : big ? 1 : 0;
    g.state = 'air';
    g.t = 0;
    g.bounced = false;
    g.vx = vx; g.vy = vy; g.vz = vz;
    if (Math.hypot(vx, vz) > 0.5) g.yaw = Math.atan2(-vx, -vz);
    const flight = (2 * Math.max(0, vy)) / GRAV * 1.25 + Math.sqrt((2 * Math.max(0, g.y)) / GRAV);
    g.pitchTarget = g.hp <= 0 ? -(Math.PI / 2 + TAU) : -Math.PI / 2;
    g.pitchTarget = Math.min(g.pitch, g.pitchTarget);
    g.pitchRate = (g.pitchTarget - g.pitch) / Math.max(0.3, flight);
    if (dmg) g.lastHitT = this.game.time;
  }

  explodeGrunt(g) {
    const game = this.game;
    const p = this._v.set(g.x, g.y + 1.7, g.z);
    game.fx.explode(p, rand(1.35, 1.6), EXPLODE_COLORS);
    if (this.boomBudget > 0) {
      this.boomBudget--;
      game.audio.play('boom', { vol: 0.95, pitch: rand(0.85, 1.05), at: p });
      // a Zaku going up right next to you rocks the view a little
      const h = game.local.pos, d = Math.hypot(g.x - h.x, g.z - h.z);
      if (d < 10) game.camera.shake(0.07 * (1 - d / 10));
    }
    game.onGruntKilled(g);
    this.remove(g);
  }

  // Each grunt chases the nearest pilot, sticking with its current one unless the other is much closer.
  targetFor(g, players) {
    if (players.length === 1) return players[0];
    let cur = players[g.target || 0];
    if (!cur) cur = players[0];
    const dc = cur.alive ? Math.hypot(cur.pos.x - g.x, cur.pos.z - g.z) : 1e9;
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p === cur || !p.alive || p.state === 'intro') continue;
      if (Math.hypot(p.pos.x - g.x, p.pos.z - g.z) < dc * 0.7) { g.target = i; return p; }
    }
    return cur;
  }

  update(dt) {
    const game = this.game;
    const players = game.players;
    this.boomBudget = Math.min(6, this.boomBudget + dt * 18);
    this.grid.clear();
    for (const g of this.list) this.grid.insert(g, g.x, g.z);
    const tokenScale = game.difficulty.aggression * players.length;
    this.assignPress(dt, players);

    for (let n = 0; n < this.list.length; n++) {
      const g = this.list[n];
      g.flash = Math.max(0, g.flash - dt * 5);
      if (g.shudder > 0) { g.shudder -= dt; continue; }
      g.t += dt;
      g.cd -= dt;
      const hero = this.targetFor(g, players);
      const hx = hero.pos.x, hz = hero.pos.z;
      const heroTargetable = hero.alive && hero.state !== 'intro';
      const dx = hx - g.x, dz = hz - g.z;
      const dist = Math.hypot(dx, dz);
      const toHero = Math.atan2(dx, dz);

      switch (g.state) {
        case 'drop': {
          g.vy = -Math.max(4, Math.min(20, g.y * 1.4));
          g.y += g.vy * dt;
          if (Math.random() < 0.6) {
            game.fx.thruster(this._v.set(g.x, g.y + 1.8, g.z - 0.4), { x: 0, y: -1, z: -0.3 }, 0xffb070, 1.1);
          }
          if (g.y <= 0) {
            g.y = 0;
            g.vy = 0;
            g.state = 'idle';
            g.t = 0;
            game.fx.dust(this._v.set(g.x, 0.1, g.z), 6, 1);
          }
          break;
        }
        case 'idle':
        case 'approach': {
          g.think -= dt;
          const sq = g.squad;
          // garrison: hold the post until a pilot comes close
          if (sq && !sq.engaged) {
            if (heroTargetable && dist < AGGRO) { sq.engaged = true; this.alert(g); }
            else {
              const tx = sq.x + g.slotX, tz = sq.z + g.slotZ;
              let mx = tx - g.x, mz = tz - g.z;
              const ml = Math.hypot(mx, mz);
              const speed = ml > 1.2 ? WALK * 0.8 : 0;
              if (ml > 0.01) { mx /= ml; mz /= ml; }
              g.vx = damp(g.vx, mx * speed, 4, dt);
              g.vz = damp(g.vz, mz * speed, 4, dt);
              g.state = speed > 0 ? 'approach' : 'idle';
              const face = speed > 0 ? Math.atan2(g.vx, g.vz) : dist < 34 ? toHero : Math.atan2(g.slotX, g.slotZ);
              g.yaw = angleDamp(g.yaw, face, 3, dt);
              break;
            }
          }
          // decide on an attack when close and a token is free (only the front rank presses in)
          if (heroTargetable && g.cd <= 0 && g.think <= 0) {
            g.think = rand(0.2, 0.5);
            if (!g.gun && g.press && dist < 11 && this.meleeTokens < this.maxMelee * tokenScale) {
              g.token = 1;
              this.meleeTokens++;
              g.state = 'charge';
              g.t = 0;
              break;
            } else if (g.gun && dist < 22 && dist > 6 && this.gunTokens < this.maxGun * tokenScale && game.time >= this.nextVolley) {
              // one gunner at a time, a few seconds apart: it paints a red aim line, then fires a short burst down it
              g.token = 2;
              this.gunTokens++;
              this.nextVolley = game.time + rand(5, 8) / (game.difficulty.aggression * Math.sqrt(players.length));
              g.state = 'aim';
              g.t = 0;
              g.aimYaw = toHero;
              g.aimY = (hero.pos.y + 1.6 - 2.35) / Math.max(1, dist);
              const fx = Math.sin(toHero), fz = Math.cos(toHero);
              const from = this._v.set(g.x + fx * 1.9 - fz * 0.62, 2.35, g.z + fz * 1.9 + fx * 0.62);
              const L = dist + 8;
              game.fx.aimLine(from, { x: from.x + fx * L, y: from.y + g.aimY * L, z: from.z + fz * L }, AIM_T);
              break;
            }
          }
          // steer toward a ring slot around the hero: the front rank close in, the rest watch from further out
          let tx, tz;
          if (dist > 34) { tx = hx; tz = hz; }
          else {
            // the slot follows each soldier's own bearing (with a slow sidestep) so they close in radially
            // instead of cutting across the hero to a slot on the far side
            g.ringA = angleDamp(g.ringA, Math.atan2(g.x - hx, g.z - hz), 1.5, dt) + dt * 0.08 * (g.i % 2 ? 1 : -1);
            const R = g.gun || g.press ? g.ringR : g.outerR;
            tx = hx + Math.sin(g.ringA) * R;
            tz = hz + Math.cos(g.ringA) * R;
          }
          let mx = tx - g.x, mz = tz - g.z;
          const ml = Math.hypot(mx, mz);
          // close to the ring but never back away from an advancing pilot: gunners plant their feet and shoot
          const inside = dist <= 34 && dist < (g.gun || g.press ? g.ringR : g.outerR) + 0.5;
          const speed = ml > 1.2 && !inside ? WALK * (dist > 34 ? 1.3 : 1) : 0;
          if (ml > 0.01) { mx /= ml; mz /= ml; }
          g.vx = damp(g.vx, mx * speed, 4, dt);
          g.vz = damp(g.vz, mz * speed, 4, dt);
          g.state = speed > 0 ? 'approach' : 'idle';
          const face = dist < 20 ? toHero : Math.atan2(g.vx, g.vz);
          g.yaw = angleDamp(g.yaw, face, 5, dt);
          break;
        }
        case 'charge': {
          // close in for a heat hawk swing
          const want = 2.6;
          const sp = dist > want ? WALK * 1.7 : 0;
          g.vx = damp(g.vx, (dx / (dist || 1)) * sp, 8, dt);
          g.vz = damp(g.vz, (dz / (dist || 1)) * sp, 8, dt);
          g.yaw = angleDamp(g.yaw, toHero, 10, dt);
          if (dist <= want + 0.4) { g.state = 'windup'; g.t = 0; }
          if (g.t > 3.5 || !heroTargetable) { this.releaseToken(g); g.state = 'idle'; g.cd = rand(1, 2); }
          break;
        }
        case 'windup': {
          g.vx = damp(g.vx, 0, 10, dt);
          g.vz = damp(g.vz, 0, 10, dt);
          g.yaw = angleDamp(g.yaw, toHero, 5, dt);
          // telegraph: a star glints on the raised heat hawk; red means the blow will really land
          const T = 0.9 / game.difficulty.speed;
          if (g.t >= T - 0.3 && g.t - dt < T - 0.3) {
            g.feint = game.time < this.feintUntil;
            const fx = Math.sin(g.yaw), fz = Math.cos(g.yaw);
            game.fx.glint(this._v.set(g.x - fx * 0.5 - fz * 0.6, 4.4, g.z - fz * 0.5 + fx * 0.6), g.feint ? 0xffffff : 0xff3040);
          }
          if (g.t >= T) { g.state = 'strike'; g.t = 0; game.audio.play('hawk', { vol: 0.35, at: this._v.set(g.x, 1, g.z) }); }
          break;
        }
        case 'strike': {
          if (g.t >= 0.1 && g.t - dt < 0.1) {
            // hit check: in front and close
            const fx = Math.sin(g.yaw), fz = Math.cos(g.yaw);
            const dot = (dx * fx + dz * fz) / (dist || 1);
            // after a blow lands the ring feints for a few seconds: pressure without a chip-damage grind
            if (!g.feint && dist < 3.6 && dot > 0.35 && hero.pos.y < 2.5 && hero.takeHit(16 + rand(0, 7), g.x, g.z, false)) {
              this.feintUntil = game.time + rand(2.5, 4) / game.difficulty.aggression;
            }
            const lunge = g.feint ? 1.5 : 5; // feints stop short
            g.vx = Math.sin(g.yaw) * lunge;
            g.vz = Math.cos(g.yaw) * lunge;
          }
          g.vx = damp(g.vx, 0, 6, dt);
          g.vz = damp(g.vz, 0, 6, dt);
          if (g.t >= 0.8) { this.releaseToken(g); g.state = 'idle'; g.cd = rand(2.6, 4.8) / g.aggro; }
          break;
        }
        case 'aim': {
          // the burst goes down the painted line: step out of it
          g.vx = damp(g.vx, 0, 8, dt);
          g.vz = damp(g.vz, 0, 8, dt);
          g.yaw = angleDamp(g.yaw, g.aimYaw, 14, dt);
          if (g.t > AIM_T) { g.state = 'fire'; g.t = 0; g.fired = 0; }
          break;
        }
        case 'fire': {
          const shots = 3;
          if (g.fired < shots && g.t >= g.fired * 0.13) {
            g.fired++;
            const fx = Math.sin(g.aimYaw), fz = Math.cos(g.aimYaw);
            const from = this._v.set(g.x + fx * 1.9 - fz * 0.62, 2.35, g.z + fz * 1.9 + fx * 0.62);
            const a = g.aimYaw + rand(-0.025, 0.025);
            game.projectiles.enemyBullet(from, new THREE.Vector3(Math.sin(a), g.aimY, Math.cos(a)).normalize());
          }
          if (g.t > 0.7) { this.releaseToken(g); g.state = 'idle'; g.cd = rand(9, 14) / g.aggro; }
          break;
        }
        case 'stagger': {
          g.vx = damp(g.vx, 0, 7, dt);
          g.vz = damp(g.vz, 0, 7, dt);
          if (g.hp <= 0) this.kill(g);
          else if (g.t > 0.48) { g.state = 'idle'; g.cd = Math.max(g.cd, 0.6); }
          break;
        }
        case 'air': {
          g.vy -= GRAV * (Math.abs(g.vy) < 1.8 ? 0.5 : 1) * dt; // apex hang
          g.y += g.vy * dt;
          g.pitch += g.pitchRate * dt;
          if ((g.pitchRate < 0 && g.pitch < g.pitchTarget) || (g.pitchRate > 0 && g.pitch > g.pitchTarget)) g.pitch = g.pitchTarget;
          if (g.y <= 0 && g.vy < 0) {
            g.y = 0;
            g.pitch = g.pitchTarget;
            game.fx.dust(this._v.set(g.x, 0.1, g.z), 4, 0.9);
            if (!g.bounced && g.vy < -3) {
              g.bounced = true;
              g.vy = Math.min(2.8, -g.vy * 0.28);
              g.pitchRate = 0;
              g.vx *= 0.5;
              g.vz *= 0.5;
              break;
            }
            g.vy = 0;
            g.vx *= 0.3;
            g.vz *= 0.3;
            g.pitch = 0;
            if (g.hp <= 0) this.kill(g);
            else { g.state = 'down'; g.t = 0; }
          }
          break;
        }
        case 'down': {
          g.vx = damp(g.vx, 0, 5, dt);
          g.vz = damp(g.vz, 0, 5, dt);
          if (g.t > 1.0) { g.state = 'getup'; g.t = 0; }
          break;
        }
        case 'getup': {
          if (g.t > 0.5) { g.state = 'idle'; g.cd = rand(1.2, 2.4); }
          break;
        }
        case 'held': {
          if (!g.holder || g.holder.held !== g) this.fling(g, 0, 1, 0, 0); // the holder was interrupted
          break;
        }
        case 'dying': {
          g.vx = damp(g.vx, 0, 4, dt);
          g.vz = damp(g.vz, 0, 4, dt);
          if (g.y > 0) { g.vy -= GRAV * dt; g.y = Math.max(0, g.y + g.vy * dt); }
          g.flash = 0.5 + 0.5 * Math.sin(g.t * 50);
          if (Math.random() < dt * 14) game.fx.sparks(this._v.set(g.x + rand(-0.6, 0.6), g.y + rand(1, 2.6), g.z + rand(-0.6, 0.6)), 4, 0xffc060, 7);
          if (g.t >= g.dieT) { this.explodeGrunt(g); n--; continue; }
          break;
        }
      }

      // separation + hero push
      if (g.state !== 'air' && g.state !== 'drop' && g.state !== 'held') {
        const near = this.grid.query(g.x, g.z, 2.6, this.tmp);
        for (let k = 0; k < near.length; k++) {
          const o = near[k];
          if (o === g) continue;
          const ox = g.x - o.x, oz = g.z - o.z;
          const d2 = ox * ox + oz * oz;
          const min = 2.3;
          if (d2 < min * min && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            const push = (min - d) * 0.5;
            g.x += (ox / d) * push;
            g.z += (oz / d) * push;
          }
        }
        for (const pl of players) {
          if (!pl.alive || pl.pos.y > 2.5) continue;
          const px = pl.pos.x - g.x, pz = pl.pos.z - g.z;
          const pd = Math.hypot(px, pz), min = g.radius + pl.radius;
          if (pd < min && pd > 1e-4) {
            g.x -= (px / pd) * (min - pd);
            g.z -= (pz / pd) * (min - pd);
          }
        }
      }
      g.x += g.vx * dt;
      g.z += g.vz * dt;
      const r = game.world.resolve(g.x, g.z, g.radius, this._r);
      g.x = r[0];
      g.z = r[1];
    }
    // commanders also shove grunts
    for (const c of game.commanders.list) {
      if (!c.alive) continue;
      const near = this.grid.query(c.pos.x, c.pos.z, 2.5, this.tmp);
      for (const g of near) {
        const ox = g.x - c.pos.x, oz = g.z - c.pos.z;
        const d = Math.hypot(ox, oz);
        if (d < 2 && d > 1e-4) { g.x += (ox / d) * (2 - d) * 0.5; g.z += (oz / d) * (2 - d) * 0.5; }
      }
    }
  }

  // A garrison soldier spots a pilot: the mono-eye flares and swings on with its "pyuiin".
  alert(g) {
    const game = this.game;
    const fx = Math.sin(g.yaw), fz = Math.cos(g.yaw);
    const p = this._v.set(g.x + fx * 0.55, 2.95 * g.scale, g.z + fz * 0.55);
    game.fx.glint(p, 0xff2f6e);
    game.audio.play('eye', { at: p });
  }

  // Only the nearest few engaged soldiers per pilot may close in and swing; the rest form a watching ring
  // further out, as in Dynasty Warriors. Re-ranked a few times a second.
  assignPress(dt, players) {
    this.pressT -= dt;
    if (this.pressT > 0) return;
    this.pressT = 0.3;
    const cand = this._cand;
    cand.length = 0;
    for (const g of this.list) {
      g.press = false;
      if (g.gun || g.state === 'drop' || g.state === 'dying') continue;
      if (g.squad && !g.squad.engaged) continue;
      const p = players[g.target || 0] || players[0];
      g.pd = Math.hypot(p.pos.x - g.x, p.pos.z - g.z);
      cand.push(g);
    }
    cand.sort((a, b) => a.pd - b.pd);
    const cap = Math.round(this.game.difficulty.maxPress * (players.length > 1 ? 1.6 : 1));
    for (let i = 0; i < cand.length && i < cap; i++) cand[i].press = true;
  }

  // Garrison squads whose pilots have all wandered off return to their posts.
  leash(squads, players) {
    for (const sq of squads) {
      if (!sq.engaged || sq.hunt) continue;
      let near = Infinity;
      for (const p of players) if (p.alive) near = Math.min(near, Math.hypot(p.pos.x - sq.x, p.pos.z - sq.z));
      if (near > LEASH) sq.engaged = false;
    }
  }

  // ---------- co-op guest: puppets driven by host snapshots ----------
  applyNet(a, states, GF) {
    const byId = this.netMap || (this.netMap = new Map());
    const seen = new Set();
    for (let o = 0; o < a.length; o += GF) {
      const id = a[o];
      seen.add(id);
      let g = byId.get(id);
      const x = a[o + 1] / 100, y = a[o + 2] / 100, z = a[o + 3] / 100, yaw = a[o + 4] / 1000;
      if (!g) {
        g = this.pool.pop();
        if (!g) continue;
        g.alive = true;
        g.x = x; g.y = y; g.z = z; g.yaw = yaw;
        g.phase = Math.random() * 6;
        g.scale = 0.97 + ((id * 7919) % 70) / 1000;
        g.netId = id;
        this.list.push(g);
        byId.set(id, g);
      }
      g.px = g.x; g.py = g.y; g.pz = g.z; g.pyaw = g.yaw;
      g.nx = x; g.ny = y; g.nz = z; g.nyaw = yaw;
      g.state = states[a[o + 5]];
      g.t0 = a[o + 6] / 1000;
      g.vx = a[o + 7] / 100;
      g.vz = a[o + 8] / 100;
      g.flash = a[o + 9] / 1000;
      g.pitch = a[o + 10] / 1000;
      const f = a[o + 11];
      g.gun = !!(f & 1);
      g.staggerAlt = !!(f & 2);
      g.hp = f & 4 ? 0 : 1;
      g.hitKind = (f >> 3) & 3;
      g.shudder = f & 32 ? 0.03 : 0;
      g.i = a[o + 12];
    }
    for (let n = this.list.length - 1; n >= 0; n--) {
      const g = this.list[n];
      if (!seen.has(g.netId)) {
        byId.delete(g.netId);
        g.alive = false;
        this.list[n] = this.list[this.list.length - 1];
        this.list.pop();
        this.pool.push(g);
      }
    }
    this.netAge = 0;
  }

  netInterp(dt) {
    this.netAge = (this.netAge || 0) + dt;
    const k = Math.min(1, this.netAge / 0.05);
    for (const g of this.list) {
      if (g.nx === undefined) continue;
      g.x = g.px + (g.nx - g.px) * k;
      g.y = g.py + (g.ny - g.py) * k;
      g.z = g.pz + (g.nz - g.pz) * k;
      g.yaw = g.pyaw + wrapAngle(g.nyaw - g.pyaw) * k;
      g.t = g.t0 + this.netAge;
      if (g.state === 'drop' && Math.random() < 0.6) this.game.fx.thruster(this._v.set(g.x, g.y + 1.8, g.z - 0.4), { x: 0, y: -1, z: -0.3 }, 0xffb070, 1.1);
    }
  }

  render(dt) {
    const rig = this.rig;
    const list = this.list;
    // lens-side clear (DW-style): soldiers standing between the camera and the hero aren't drawn,
    // except those about to hit him, so the near crowd never walls off the frame
    const cam = this.game.camera.cam.position, hp = this.game.local.pos;
    const ax = cam.x, az = cam.z, abx = hp.x - ax, abz = hp.z - az;
    const L = Math.hypot(abx, abz) || 1;
    const lensOn = this.game.mode !== 'title';
    for (let n = 0; n < list.length; n++) {
      const g = list[n];
      const p = g.pose;
      const base = g.gun ? GUN_STANCE : ZSTANCE;
      let hideAll = false;
      if (lensOn) {
        const front = L - ((g.x - ax) * abx + (g.z - az) * abz) / L;
        const attacking = g.state === 'windup' || g.state === 'strike' || g.state === 'charge';
        const lim = (this.lensHid[n] ? 1.2 : 1.6) + (attacking ? 2.4 : 0);
        hideAll = front > lim;
        this.lensHid[n] = hideAll ? 1 : 0;
      }
      switch (g.state) {
        case 'idle':
        case 'approach':
        case 'charge': {
          const sp = Math.hypot(g.vx, g.vz);
          g.phase += dt * sp * 0.85;
          const w = clamp(sp / WALK, 0, 1);
          p.set(base);
          const s = Math.sin(g.phase), c = Math.cos(g.phase);
          const lean = g.state === 'charge' ? 0.35 : 0.14;
          p[P.torso * 3] += lean * w;
          p[P.torso * 3 + 1] += s * 0.12 * w;
          p[P.thighR * 3] += (-0.75 * s) * w;
          p[P.thighL * 3] += (0.75 * s) * w;
          p[P.shinR * 3] += 1.0 * Math.max(0, c) * w;
          p[P.shinL * 3] += 1.0 * Math.max(0, -c) * w;
          if (!g.gun) p[P.uArmR * 3] += 0.4 * s * w;
          p[P.uArmL * 3] -= 0.4 * s * w;
          p[RY] = -0.05 - Math.abs(c) * 0.09 * w + Math.sin(g.phase * 0.5 + g.i) * 0.01;
          p[RPITCH] = 0; p[RROLL] = 0; p[RYAW] = 0;
          break;
        }
        case 'windup': WINDUP.sample(g.t * 0.9, p); break;
        case 'strike': STRIKE.sample(g.t, p); break;
        case 'aim': lerpPose(p, GUN_STANCE, GUN_AIM, Math.min(1, g.t / 0.25)); break;
        case 'fire': p.set(GUN_AIM); p[P.uArmR * 3] -= (g.t % 0.13 < 0.05 ? 0.12 : 0); break;
        case 'stagger': {
          const rec = RECOILS[((hash01(g.i, 1) * 3) | 0) * 2 + (g.staggerAlt ? 1 : 0)];
          const amp = 0.88 + 0.24 * hash01(g.i, 2);
          if (g.t < 0.22) lerpPose(p, base, rec, Math.min(1, g.t / (0.025 + 0.02 * hash01(g.i, 3))) * amp);
          else lerpPose(p, rec, base, clamp((g.t - 0.22) / 0.2, 0, 1));
          break;
        }
        case 'air': case 'held': p.set(AIRPOSE); p[RPITCH] = g.pitch; break;
        case 'down': p.set(DOWNPOSE); break;
        case 'getup': lerpPose(p, DOWNPOSE, GETUP, clamp(g.t / 0.25, 0, 1)); if (g.t > 0.25) lerpPose(p, GETUP, base, clamp((g.t - 0.25) / 0.2, 0, 1)); break;
        case 'dying': p.set(g.y > 0.1 ? AIRPOSE : DOWNPOSE); p[RPITCH] = -1.2; p[RROLL] = Math.sin(g.t * 30) * 0.1; break;
        case 'drop': p.set(SPAWN_POSE); break;
      }
      const lift = (g.state === 'down' || g.state === 'dying') && g.y < 0.1 ? 0.5 : g.state === 'getup' ? 0.5 * (1 - clamp(g.t / 0.25, 0, 1)) : 0;
      // hit tint: one white-hot frame, then a gold / amber / red (killing blow) wash that decays fast;
      // KO'd bodies keep a red ember while they fly
      let cr = 1, cg = 1, cb = 1;
      const ember = g.hp <= 0 && (g.state === 'air' || g.state === 'dying') ? 0.45 : 0;
      if (g.flash > 0.93) { cr = cg = cb = 2.6; }
      else if (g.flash > 0 || ember) {
        const k = Math.max(ember, g.flash * g.flash) * 1.5;
        const C = g.hitKind === 2 ? HIT_KILL : g.hitKind === 1 ? HIT_AMBER : HIT_GOLD;
        cr = 1 + C[0] * k; cg = 1 + C[1] * k; cb = 1 + C[2] * k;
      }
      const jit = g.shudder > 0 ? Math.sin(g.shudder * 400 + g.i) * 0.07 : 0;
      rig.set(n, g.x + jit, g.y + lift, g.z, g.yaw, g.scale, p, hideAll ? -1 : g.gun ? 1 : 2, cr, cg, cb);
    }
    rig.commit(list.length);
  }
}
