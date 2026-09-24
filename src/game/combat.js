// Hit resolution between the Gundam and everything Zeon.
import * as THREE from 'three';
import { wrapAngle } from '../core/util.js';

const SABER = 0xff4fb8;

export class Combat {
  constructor(game) {
    this.game = game;
    this.tmp = [];
    this._v = new THREE.Vector3();
    this.hitSfxBudget = 0;
  }

  update(dt) {
    this.hitSfxBudget = Math.min(4, this.hitSfxBudget + dt * 22);
  }

  // Soft lock-on: nearest target within range and cone of `heading`.
  acquire(pos, heading, range, cone) {
    const g = this.game;
    let best = null, bestScore = Infinity;
    const consider = (x, z, obj, bias) => {
      const dx = x - pos.x, dz = z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > range || d < 0.01) return;
      const a = Math.abs(wrapAngle(Math.atan2(dx, dz) - heading));
      if (a > cone) return;
      const score = d * (1 + a * 0.8) * bias;
      if (score < bestScore) { bestScore = score; best = obj; }
    };
    const near = g.crowd.grid.query(pos.x, pos.z, range, this.tmp);
    for (const e of near) if (e.alive && e.state !== 'dying' && e.state !== 'drop') consider(e.x, e.z, e, 1);
    for (const c of g.commanders.list) if (c.alive && c.state !== 'drop') consider(c.pos.x, c.pos.z, { x: c.pos.x, z: c.pos.z }, 0.7);
    return best;
  }

  inShape(spec, hx, hy, hz, heading, tx, ty, tz, tr) {
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const off = spec.off || 0;
    const cx = hx + fx * off, cz = hz + fz * off;
    const dx = tx - cx, dz = tz - cz;
    const hyMax = spec.hy || 3.2;
    if (ty > hy + hyMax || ty < hy - 2.5) return false;
    if (spec.shape === 'line') {
      const along = dx * fx + dz * fz;
      const lat = Math.abs(dx * fz - dz * fx);
      return along > -1 && along < spec.len + tr && lat < spec.width / 2 + tr * 0.5;
    }
    const d = Math.hypot(dx, dz);
    if (d > spec.range + tr * 0.6) return false;
    if (spec.shape === 'circle' || (spec.arc || 360) >= 360 || d < 1.2) return true;
    const a = Math.abs(wrapAngle(Math.atan2(dx, dz) - heading));
    return a <= (spec.arc * Math.PI) / 360;
  }

  heroStrike(hero, spec, id) {
    const g = this.game;
    const hx = hero.pos.x, hy = hero.pos.y, hz = hero.pos.z, h = hero.heading;
    const reach = (spec.range || spec.len || 4) + (spec.off || 0) + 2;
    const near = g.crowd.grid.query(hx, hz, reach, this.tmp);
    let hits = 0;
    const dmgMul = g.difficulty.dmgDealt * (hero.state === 'musou' ? 1 : 1);
    for (const e of near) {
      if (!e.alive || e.state === 'dying' || e.state === 'drop') continue;
      if (!this.inShape(spec, hx, hy, hz, h, e.x, e.y, e.z, e.radius)) continue;
      const ok = g.crowd.damage(e, spec.dmg * dmgMul, spec.kb, spec.up, hx, hz, id, { pull: spec.pull ? spec.pull : 0 });
      if (!ok) continue;
      hits++;
      this.hitFx(e.x, e.y + 1.8, e.z, spec, hits);
    }
    for (const c of g.commanders.list) {
      if (!c.alive) continue;
      if (!this.inShape(spec, hx, hy, hz, h, c.pos.x, c.pos.y, c.pos.z, c.radius)) continue;
      const ok = c.damage(spec.dmg * dmgMul * (spec.sp ? 0.6 : 1), spec.kb, spec.up, hx, hz, id, { sp: spec.sp });
      if (!ok) continue;
      hits++;
      this.hitFx(c.pos.x, c.pos.y + 1.9, c.pos.z, spec, hits, true);
    }
    if (hits) this.registerHits(hits, spec);
    return hits;
  }

  hitFx(x, y, z, spec, n, boss = false) {
    const g = this.game;
    const p = this._v.set(x, y, z);
    if (n <= 12 || Math.random() < 0.3) g.fx.hit(p, SABER, !!spec.big || boss);
    if (n <= 6) g.fx.debris(p, 2, [0x3e6a3c, 0x78a85a, 0x4b5049], 6, 0.14);
    if (this.hitSfxBudget >= 1) {
      this.hitSfxBudget -= 1;
      g.audio.play('hit', { vol: boss ? 0.9 : 0.6, pitch: 0.9 + Math.random() * 0.3 });
    }
  }

  registerHits(n, spec) {
    const g = this.game;
    const hero = g.hero;
    g.addCombo(n);
    if (hero.state !== 'musou') hero.sp = Math.min(hero.maxSp, hero.sp + n * 0.9);
    // hit-stop sells impact; stronger for heavy blows
    g.hitstop(spec.big ? 0.085 : Math.min(0.06, 0.035 + n * 0.004));
    g.camera.shake(spec.big ? 0.35 : 0.08 + Math.min(0.12, n * 0.01));
  }

  // Projectile (beam) vs targets along a segment.
  beamSweep(ax, ay, az, bx, by, bz, radius, onHit) {
    const g = this.game;
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const half = Math.hypot(bx - ax, bz - az) / 2 + radius + 2;
    const near = g.crowd.grid.query(mx, mz, half, this.tmp);
    const sx = bx - ax, sy = by - ay, sz = bz - az;
    const L2 = sx * sx + sy * sy + sz * sz || 1;
    const test = (tx, ty, tz, r) => {
      let u = ((tx - ax) * sx + (ty - ay) * sy + (tz - az) * sz) / L2;
      u = Math.max(0, Math.min(1, u));
      const px = ax + sx * u - tx, py = ay + sy * u - ty, pz = az + sz * u - tz;
      return px * px + py * py * 0.5 + pz * pz < (radius + r) * (radius + r);
    };
    for (const e of near) {
      if (!e.alive || e.state === 'dying' || e.state === 'drop') continue;
      if (test(e.x, e.y + 1.7, e.z, e.radius)) onHit(e, false);
    }
    for (const c of g.commanders.list) {
      if (!c.alive || c.state === 'drop') continue;
      if (test(c.pos.x, c.pos.y + 1.8, c.pos.z, c.radius)) onHit(c, true);
    }
  }
}
