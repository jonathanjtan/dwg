// Zaku II grunt crowd: instanced rendering + lightweight squad AI.
import * as THREE from 'three';
import { InstancedRig, Clip, makePose, poseFrom, lerpPose, P, RY, RPITCH, RROLL, RYAW } from '../core/rig.js';
import { zakuDef, Z } from '../models/suits.js';
import { SpatialHash, rand, clamp, angleDamp, wrapAngle, damp } from '../core/util.js';

const MAX = 300;
const GRAV = 30;
const WALK = 4.6;

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
const STAGGER_A = poseFrom({ torso: [-0.5, 0.35, 0.15], head: [-0.4, 0, 0], uArmR: [-0.6, 0, -0.9], uArmL: [-0.6, 0, 0.9], y: -0.15 }, ZSTANCE);
const STAGGER_B = poseFrom({ torso: [-0.5, -0.35, -0.15], head: [-0.4, 0, 0], uArmR: [-0.6, 0, -0.9], uArmL: [-0.6, 0, 0.9], y: -0.15 }, ZSTANCE);
const AIRPOSE = poseFrom({ torso: [-0.4, 0, 0], head: [-0.5, 0, 0], uArmR: [-2.2, 0, -0.8], fArmR: [-0.3, 0, 0], uArmL: [-2.2, 0, 0.8], fArmL: [-0.3, 0, 0], thighR: [-0.6, 0, -0.2], shinR: [0.9, 0, 0], thighL: [-0.2, 0, 0.2], shinL: [0.5, 0, 0] }, ZSTANCE);
const DOWNPOSE = poseFrom({ pitch: -1.5, torso: [-0.1, 0, 0], head: [-0.3, 0.4, 0], uArmR: [-0.3, 0, -1.1], uArmL: [-0.2, 0, 1.2], thighR: [-0.5, 0, -0.2], shinR: [0.8, 0, 0], thighL: [0, 0, 0.2], shinL: [0.2, 0, 0], y: 0 }, ZSTANCE);
const GETUP = poseFrom({ pitch: 0, torso: [0.6, 0, 0], head: [-0.2, 0, 0], uArmR: [-0.6, 0, -0.4], uArmL: [-0.6, 0, 0.4], thighR: [-1.1, 0, -0.1], shinR: [1.6, 0, 0], thighL: [-0.4, 0, 0.2], shinL: [1.2, 0, 0], y: -0.55 }, ZSTANCE);
const SPAWN_POSE = poseFrom({ thighR: [-0.7, 0, -0.1], shinR: [1.1, 0, 0], thighL: [-0.2, 0, 0.1], shinL: [0.5, 0, 0], uArmR: [-0.3, 0, -0.6], uArmL: [-0.3, 0, 0.6] }, ZSTANCE);

const EXPLODE_COLORS = [Z.DG, Z.LG, Z.J, 0x2b2e2a];

export class Crowd {
  constructor(game) {
    this.game = game;
    this.def = zakuDef();
    this.rig = new InstancedRig(this.def, MAX, game.scene);
    this.list = [];
    this.pool = [];
    for (let i = 0; i < MAX; i++) this.pool.push(this.makeGrunt(i));
    this.grid = new SpatialHash(3);
    this.tmp = [];
    this.meleeTokens = 0;
    this.gunTokens = 0;
    this.maxMelee = 3;
    this.maxGun = 3;
    this.boomBudget = 0;
    this._v = new THREE.Vector3();
    this._r = [0, 0];
    this.serial = 0;
  }

  makeGrunt(i) {
    return {
      i, alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, hp: 60, maxHp: 60,
      state: 'idle', t: 0, phase: rand(0, 6), gun: false, cd: 0, token: 0, flash: 0,
      hitIds: [0, 0, 0, 0], hitCursor: 0, ringA: 0, ringR: 6, spin: 0, pitch: 0, roll: 0,
      pose: makePose(), scale: 1, radius: 0.95, dieT: 0, spawnVy: 0, fired: 0, think: 0, lastHitT: -9,
      kind: 'grunt', height: 3.1, staggerAlt: false, aggro: rand(0.6, 1.2),
    };
  }

  get count() {
    return this.list.length;
  }

  spawn(x, z, { gun = false, drop = false, yaw = 0, hp = 60 } = {}) {
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
    g.cd = rand(0.5, 2.5);
    g.token = 0;
    g.flash = 0;
    g.pitch = g.roll = g.spin = 0;
    g.hitIds.fill(0);
    g.ringA = rand(0, Math.PI * 2);
    g.ringR = gun ? rand(12, 17) : rand(4.2, 7.5);
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
    if (!g.alive || g.state === 'dying') return false;
    if (id && this.alreadyHit(g, id)) return false;
    if (id) {
      g.hitIds[g.hitCursor] = id;
      g.hitCursor = (g.hitCursor + 1) & 3;
    }
    const game = this.game;
    g.hp -= dmg;
    g.flash = 1;
    g.lastHitT = game.time;
    this.releaseToken(g);
    let dx = g.x - fromX, dz = g.z - fromZ;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    if (opts.pull) { dx = -dx * 0.5; dz = -dz * 0.5; kb = opts.pull; }
    g.yaw = Math.atan2(-dx, -dz);
    const airborne = g.state === 'air' || g.y > 0.3;
    if (up > 0 || kb > 7.5 || airborne || g.hp <= 0) {
      g.state = 'air';
      g.t = 0;
      g.vx = dx * kb * (g.hp <= 0 ? 1.3 : 1);
      g.vz = dz * kb * (g.hp <= 0 ? 1.3 : 1);
      g.vy = Math.max(airborne ? Math.max(g.vy, 3.5) : 0, up > 0 ? up : kb > 7.5 ? 5 : 3.5);
      g.spin = (Math.random() < 0.5 ? -1 : 1) * rand(3, 7);
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
    const game = this.game;
    g.state = 'dying';
    g.t = 0;
    g.dieT = rand(0.2, 0.45);
  }

  explodeGrunt(g) {
    const game = this.game;
    const p = this._v.set(g.x, g.y + 1.7, g.z);
    game.fx.explode(p, 1.05, EXPLODE_COLORS);
    if (this.boomBudget > 0) {
      this.boomBudget--;
      game.audio.play('boom', { vol: 0.55, pitch: rand(0.85, 1.15), at: p });
    }
    game.onGruntKilled(g);
    this.remove(g);
  }

  update(dt) {
    const game = this.game;
    const hero = game.hero;
    const hx = hero.pos.x, hz = hero.pos.z;
    this.boomBudget = Math.min(6, this.boomBudget + dt * 18);
    this.grid.clear();
    for (const g of this.list) this.grid.insert(g, g.x, g.z);
    const heroTargetable = hero.alive && hero.state !== 'intro';

    for (let n = 0; n < this.list.length; n++) {
      const g = this.list[n];
      g.t += dt;
      g.flash = Math.max(0, g.flash - dt * 6);
      g.cd -= dt;
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
          // decide on an attack when close and a token is free
          if (heroTargetable && g.cd <= 0 && g.think <= 0) {
            g.think = rand(0.15, 0.4);
            if (!g.gun && dist < 11 && this.meleeTokens < this.maxMelee * game.difficulty.aggression) {
              g.token = 1;
              this.meleeTokens++;
              g.state = 'charge';
              g.t = 0;
              break;
            } else if (g.gun && dist < 22 && dist > 5 && this.gunTokens < this.maxGun * game.difficulty.aggression) {
              g.token = 2;
              this.gunTokens++;
              g.state = 'aim';
              g.t = 0;
              break;
            }
          }
          // steer toward ring slot around the hero
          let tx, tz;
          if (dist > 34) { tx = hx; tz = hz; }
          else {
            g.ringA += dt * 0.12 * (g.i % 2 ? 1 : -1);
            tx = hx + Math.sin(g.ringA) * g.ringR;
            tz = hz + Math.cos(g.ringA) * g.ringR;
          }
          let mx = tx - g.x, mz = tz - g.z;
          const ml = Math.hypot(mx, mz);
          const speed = ml > 1.2 ? WALK * (dist > 34 ? 1.25 : 1) : 0;
          if (ml > 0.01) { mx /= ml; mz /= ml; }
          g.vx = damp(g.vx, mx * speed, 5, dt);
          g.vz = damp(g.vz, mz * speed, 5, dt);
          g.state = speed > 0 ? 'approach' : 'idle';
          const face = dist < 20 ? toHero : Math.atan2(g.vx, g.vz);
          g.yaw = angleDamp(g.yaw, face, 6, dt);
          break;
        }
        case 'charge': {
          // close in for a heat hawk swing
          const want = 2.6;
          const sp = dist > want ? WALK * 1.6 : 0;
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
          if (g.t >= 0.65 / game.difficulty.speed) { g.state = 'strike'; g.t = 0; game.audio.play('hawk', { vol: 0.45, at: this._v.set(g.x, 1, g.z) }); }
          break;
        }
        case 'strike': {
          if (g.t >= 0.1 && g.t - dt < 0.1) {
            // hit check: in front and close
            const fx = Math.sin(g.yaw), fz = Math.cos(g.yaw);
            const dot = (dx * fx + dz * fz) / (dist || 1);
            if (dist < 3.6 && dot > 0.35 && hero.pos.y < 2.5) hero.takeHit(15 + rand(0, 6), g.x, g.z, false);
            g.vx = Math.sin(g.yaw) * 5;
            g.vz = Math.cos(g.yaw) * 5;
          }
          g.vx = damp(g.vx, 0, 6, dt);
          g.vz = damp(g.vz, 0, 6, dt);
          if (g.t >= 0.75) { this.releaseToken(g); g.state = 'idle'; g.cd = rand(1.8, 3.8) / g.aggro; }
          break;
        }
        case 'aim': {
          g.vx = damp(g.vx, 0, 8, dt);
          g.vz = damp(g.vz, 0, 8, dt);
          g.yaw = angleDamp(g.yaw, toHero, 8, dt);
          if (g.t > 0.6) { g.state = 'fire'; g.t = 0; g.fired = 0; }
          break;
        }
        case 'fire': {
          g.yaw = angleDamp(g.yaw, toHero, 3, dt);
          const shots = 4;
          if (g.fired < shots && g.t >= g.fired * 0.13) {
            g.fired++;
            const s = this.rig; // muzzle approx: right hand forward
            const fx = Math.sin(g.yaw), fz = Math.cos(g.yaw);
            const rx = -fz, rz = fx;
            const from = this._v.set(g.x + fx * 1.9 + rx * 0.62, 2.35, g.z + fz * 1.9 + rz * 0.62);
            const spread = 0.05;
            const a = g.yaw + rand(-spread, spread);
            const aimY = (hero.pos.y + 1.6 - 2.35) / Math.max(1, dist);
            game.projectiles.enemyBullet(from, new THREE.Vector3(Math.sin(a), aimY, Math.cos(a)).normalize());
          }
          if (g.t > 0.9) { this.releaseToken(g); g.state = 'idle'; g.cd = rand(2.5, 4.5) / g.aggro; }
          break;
        }
        case 'stagger': {
          g.vx = damp(g.vx, 0, 7, dt);
          g.vz = damp(g.vz, 0, 7, dt);
          if (g.hp <= 0) this.kill(g);
          else if (g.t > 0.42) { g.state = 'idle'; g.cd = Math.max(g.cd, 0.4); }
          break;
        }
        case 'air': {
          g.vy -= GRAV * dt;
          g.y += g.vy * dt;
          g.pitch += g.spin * dt * 0.35;
          if (g.y <= 0 && g.vy < 0) {
            g.y = 0;
            g.vy = 0;
            g.vx *= 0.3;
            g.vz *= 0.3;
            game.fx.dust(this._v.set(g.x, 0.1, g.z), 4, 0.9);
            if (g.hp <= 0) this.kill(g);
            else { g.state = 'down'; g.t = 0; }
          }
          break;
        }
        case 'down': {
          g.vx = damp(g.vx, 0, 5, dt);
          g.vz = damp(g.vz, 0, 5, dt);
          if (g.t > 0.9) { g.state = 'getup'; g.t = 0; }
          break;
        }
        case 'getup': {
          if (g.t > 0.45) { g.state = 'idle'; g.cd = rand(0.8, 2); }
          break;
        }
        case 'dying': {
          g.vx = damp(g.vx, 0, 4, dt);
          g.vz = damp(g.vz, 0, 4, dt);
          if (g.y > 0) { g.vy -= GRAV * dt; g.y = Math.max(0, g.y + g.vy * dt); }
          g.flash = 0.5 + 0.5 * Math.sin(g.t * 50);
          if (g.t >= g.dieT) { this.explodeGrunt(g); n--; continue; }
          break;
        }
      }

      // separation + hero push
      if (g.state !== 'air' && g.state !== 'drop') {
        const near = this.grid.query(g.x, g.z, 2.2, this.tmp);
        for (let k = 0; k < near.length; k++) {
          const o = near[k];
          if (o === g) continue;
          const ox = g.x - o.x, oz = g.z - o.z;
          const d2 = ox * ox + oz * oz;
          const min = 1.9;
          if (d2 < min * min && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            const push = (min - d) * 0.5;
            g.x += (ox / d) * push;
            g.z += (oz / d) * push;
          }
        }
        if (dist < g.radius + hero.radius && hero.pos.y < 2.5 && dist > 1e-4) {
          const push = g.radius + hero.radius - dist;
          g.x -= (dx / dist) * push;
          g.z -= (dz / dist) * push;
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

  render(dt) {
    const rig = this.rig;
    const list = this.list;
    for (let n = 0; n < list.length; n++) {
      const g = list[n];
      const p = g.pose;
      const base = g.gun ? GUN_STANCE : ZSTANCE;
      switch (g.state) {
        case 'idle':
        case 'approach':
        case 'charge': {
          const sp = Math.hypot(g.vx, g.vz);
          g.phase += dt * sp * 0.75;
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
          p[RY] = -0.05 - Math.abs(c) * 0.05 * w + Math.sin(g.phase * 0.5 + g.i) * 0.01;
          p[RPITCH] = 0; p[RROLL] = 0; p[RYAW] = 0;
          break;
        }
        case 'windup': WINDUP.sample(g.t * 0.9, p); break;
        case 'strike': STRIKE.sample(g.t, p); break;
        case 'aim': lerpPose(p, GUN_STANCE, GUN_AIM, Math.min(1, g.t / 0.25)); break;
        case 'fire': p.set(GUN_AIM); p[P.uArmR * 3] -= (g.t % 0.13 < 0.05 ? 0.12 : 0); break;
        case 'stagger': lerpPose(p, g.staggerAlt ? STAGGER_A : STAGGER_B, base, clamp((g.t - 0.12) / 0.3, 0, 1)); break;
        case 'air': p.set(AIRPOSE); p[RPITCH] = -Math.min(1.5, Math.abs(g.pitch)); break;
        case 'down': p.set(DOWNPOSE); break;
        case 'getup': lerpPose(p, DOWNPOSE, GETUP, clamp(g.t / 0.25, 0, 1)); if (g.t > 0.25) lerpPose(p, GETUP, base, clamp((g.t - 0.25) / 0.2, 0, 1)); break;
        case 'dying': p.set(g.y > 0.1 ? AIRPOSE : DOWNPOSE); p[RPITCH] = -1.2; p[RROLL] = Math.sin(g.t * 30) * 0.1; break;
        case 'drop': p.set(SPAWN_POSE); break;
      }
      const lift = (g.state === 'down' || g.state === 'dying') && g.y < 0.1 ? 0.5 : g.state === 'getup' ? 0.5 * (1 - clamp(g.t / 0.25, 0, 1)) : 0;
      const f = 1 + g.flash * 2.2;
      rig.set(n, g.x, g.y + lift, g.z, g.yaw, g.scale, p, g.gun ? 1 : 2, f, f, f);
    }
    rig.commit(list.length);
  }
}
