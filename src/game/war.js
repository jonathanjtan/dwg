// The foot soldiers' war, run alongside the mission (Dynasty Warriors: Gundam's allied and enemy troops). Every field
// belongs to a side. A field its side holds keeps a squad leader and a garrison squatting on it, and calls in more
// troops at regular intervals; troops beyond the garrison form columns that march down the boulevards to the nearest
// enemy field and fight to take it (its leader first). The two armies barely scratch each other (NPC_VS_NPC), so a
// squad-on-squad brawl lasts minutes and fields change hands slowly: the pilots decide the battle.
//
// The mission supplies the config (stage.js WAR): who holds which field at the start, whether each army can take
// fields on its own (allyCapture, recapture), and the production rates and caps. Zeon's fields are the landing zones
// (bases.js): their pods drop the garrison and the stage reinforces it, and the squad leader is a Commander. A
// Federation field's leader is a GM in the allied crowd (game.allies).
import { FIELDS, ROADS, ARENA } from '../world/world.js';
import { rand } from '../core/util.js';

export const NPC_VS_NPC = 0.08; // share of a blow one army's soldiers do to the other's (the pilots' is untouched)
export const LEADER_ARMOR = 0.5; // ...and a field's leader takes half even of that
const MARCH = 3.1; // a column's pace (a soldier walks at 3.7, so the ranks keep up)
const SIGHT = 17; // a soldier takes on enemy soldiers this close...
const REACH = 32; // ...as long as a garrison's are this close to its post (garrisons don't chase far)
const FOCUS = 30; // a column that has reached its target field goes for the field's leader within this range
const ASSAULT = 34; // ...which it has once its anchor is this close to the field's post
const FIELD_R = 30; // a field's ground, around its post
const TAU = Math.PI * 2;

export class War {
  constructor(game) {
    this.game = game;
    this.fields = [];
    this.squads = []; // the Federation's (Zeon's are the stage's)
    this.columns = []; // squads of either army out to take a field
    this.active = false;
    this.cfg = null;
    this._q = [];
    this._nav = null;
    this.reset();
  }

  reset() {
    this.active = false;
    this.cfg = null;
    this.fields = [];
    this.squads = [];
    this.columns = [];
    this.t = 0;
    this.tickT = 0;
    this.stats = { fedSpawned: 0, zeonSent: 0, fedLost: 0, zeonLost: 0, events: [] };
  }

  // cfg: the mission's war (stage.js WAR); nothing for training or the title.
  begin(cfg) {
    this.reset();
    if (!cfg) return;
    this.cfg = cfg;
    this.active = true;
    this.nav();
    for (const def of FIELDS) {
      const c = cfg.fields[def.name];
      if (!c) continue;
      const o = typeof c === 'string' ? { owner: c } : c;
      const x = Math.round(def.cx + (o.post?.[0] || 0)), z = Math.round(def.cz + (o.post?.[1] || 0));
      this.fields.push({
        name: def.name, idx: FIELDS.indexOf(def), def, x, z, owner: o.owner || null, lock: !!o.lock, lz: null, captain: null,
        spawnT: rand(3, 6), sendT: cfg.zeon.every * rand(0.4, 0.8), downT: 0, safeUntil: 0, hostile: 0, own: 0,
      });
    }
    // the Federation's opening garrisons are already on their ground
    for (const f of this.fields) if (f.owner === 'fed') this.installFed(f, false);
  }

  field(name) {
    return this.fields.find((f) => f.name === name);
  }

  // ---------------------------------------------------------------- mission hooks
  // A Zeon pod has landed in its yard: the field's leader is the pod's squad leader now.
  onZoneLanded(lz) {
    const f = this.field(lz.name);
    if (!f) return;
    f.lz = lz;
    f.owner = 'zeon';
    f.sendT = this.cfg.zeon.every * rand(0.5, 1);
  }

  // A landing zone has fallen (to a pilot or to the GMs): a GM squad leader and garrison move in to hold it, the
  // columns that came to take it first.
  onZoneTaken(lz) {
    const f = this.field(lz.name);
    if (!f || !this.active) return;
    this.log(`${f.name} taken`);
    f.owner = 'fed';
    f.safeUntil = this.t + this.cfg.fed.grace;
    for (const sq of this.columns) if (sq.team === 'fed' && sq.target === f && Math.hypot(sq.x - f.x, sq.z - f.z) < 60) this.join(sq, f);
    this.installFed(f, true);
  }

  // Zeon has retaken a field: whatever GMs are left there fight on to take it back.
  lose(f) {
    this.log(`${f.name} lost`);
    f.owner = 'zeon';
    f.captain = null;
    for (const sq of this.squads) if (sq.field === f) { sq.field = null; sq.leader = false; this.attack(sq, f); }
    for (const sq of this.columns) if (sq.team === 'zeon' && sq.target === f) { sq.target = null; sq.march = null; }
    this.game.stage.onZoneLost?.(f.lz);
  }

  log(what) {
    this.stats.events.push([Math.round(this.game.stats.time), what]);
  }

  // A soldier of either army fell to the other's (or a GM to anything): the armies keep their own tally.
  onSoldierDown(crowd, g) {
    if (crowd.team === 'fed') {
      this.stats.fedLost++;
      if (g.captain) for (const f of this.fields) if (f.captain === g) { f.captain = null; f.downT = 0; }
    } else this.stats.zeonLost++;
  }

  // A soldier of a marching column has seen the enemy: the column halts and fights.
  sighted(sq) {
    sq.halt = true;
    sq.fightT = this.t;
  }

  // ---------------------------------------------------------------- targets
  // The nearest enemy soldier (or squad leader) `g` of `crowd` will take on, as a proxy with a pilot's shape; null
  // for none. A column at the field it came to take goes for the field's leader first.
  foeFor(crowd, g) {
    const fed = crowd.team === 'fed', other = crowd.foes, sq = g.squad;
    if (sq && sq.target && sq.assault) {
      const cap = this.leaderOf(sq.target, crowd.team);
      if (cap && cap.alive && Math.hypot(cap.pos.x - g.x, cap.pos.z - g.z) < FOCUS) return cap;
    }
    const reach = sq && !sq.march && !sq.target ? REACH : Infinity;
    const ax = sq ? sq.x : g.x, az = sq ? sq.z : g.z;
    let best = null, bd = SIGHT;
    if (other && other.count) {
      for (const o of other.grid.query(g.x, g.z, SIGHT, this._q)) {
        if (!o.alive || o.hp <= 0 || o.state === 'dying' || o.state === 'drop' || o.state === 'held') continue;
        const d = Math.hypot(o.x - g.x, o.z - g.z);
        if (d >= bd || (reach < Infinity && Math.hypot(o.x - ax, o.z - az) > reach)) continue;
        bd = d;
        best = o.proxy;
      }
    }
    if (fed && this.cfg.allyCapture) {
      for (const c of this.game.commanders.list) {
        if (c.kind !== 'captain' || !c.alive || c.state === 'drop') continue;
        const d = Math.hypot(c.pos.x - g.x, c.pos.z - g.z);
        if (d < bd) { bd = d; best = this.cmdProxy(c); }
      }
    }
    return best;
  }

  // The leader of field f that the `team` attacking it has to fell: the pod's squad leader, or the GM leader.
  leaderOf(f, team) {
    if (team === 'fed') return this.cfg.allyCapture && f.owner === 'zeon' && f.lz?.captain ? this.cmdProxy(f.lz.captain) : null;
    return f.owner === 'fed' && f.captain ? f.captain.proxy : null;
  }

  // A Zeon squad leader whose pilots are away takes on the GMs attacking its post (commander.js asks).
  captainFoe(c) {
    if (!this.active || !this.game.allies.count) return null;
    const time = this.game.time;
    if (time < (c.npcFoeT || 0)) return c.npcFoe && c.npcFoe.alive && c.npcFoe.id === c.npcFoeId ? c.npcFoe : null;
    c.npcFoeT = time + 0.5;
    const home = c.home || c.pos, leash = c.cfg.leash || 30;
    let best = null, bd = 12;
    for (const o of this.game.allies.grid.query(c.pos.x, c.pos.z, bd, this._q)) {
      if (!o.alive || o.hp <= 0 || o.state === 'dying' || o.state === 'drop' || o.state === 'held') continue;
      const d = Math.hypot(o.x - c.pos.x, o.z - c.pos.z);
      if (d < bd && Math.hypot(o.x - home.x, o.z - home.z) < leash) { bd = d; best = o.proxy; }
    }
    c.npcFoe = best;
    c.npcFoeId = best ? best.id : 0;
    return best;
  }

  // A Zeon squad leader as the GMs see it.
  cmdProxy(c) {
    return c.proxy || (c.proxy = {
      npc: true, unit: c, pos: c.pos, state: 'idle',
      get id() { return c.netId; },
      get alive() { return c.alive && c.state !== 'drop' && c.state !== 'dying' && c.state !== 'dead'; },
      takeHit: (dmg, x, z, heavy) => c.damage(dmg * NPC_VS_NPC * LEADER_ARMOR, heavy ? 5 : 2, 0, x, z, 0, { npc: true }),
    });
  }

  // A round from one army's gunner (b.team: 'fed', else Zeon) against the other army's soldiers and squad leaders.
  // True when it hit something.
  bulletHit(b) {
    if (!this.active) return false;
    const g = this.game, fed = b.team === 'fed', crowd = fed ? g.crowd : g.allies;
    const fx = b.p.x - b.d.x * 5, fz = b.p.z - b.d.z * 5;
    if (crowd.count) {
      for (const e of crowd.grid.query(b.p.x, b.p.z, 1.6, this._q)) {
        if (!e.alive || e.hp <= 0 || e.state === 'dying' || e.state === 'drop' || e.state === 'held') continue;
        const dx = b.p.x - e.x, dy = b.p.y - (e.y + 1.6), dz = b.p.z - e.z;
        if (dx * dx + dy * dy * 0.4 + dz * dz < 1.3) { crowd.npcHit(e, b.dmg, fx, fz); return true; }
      }
    }
    if (fed && this.cfg.allyCapture) {
      for (const c of g.commanders.list) {
        if (c.kind !== 'captain' || !c.alive || c.state === 'drop') continue;
        const dx = b.p.x - c.pos.x, dy = b.p.y - (c.pos.y + 1.6), dz = b.p.z - c.pos.z;
        if (dx * dx + dy * dy * 0.4 + dz * dz < 1.5) { c.damage(b.dmg * NPC_VS_NPC * LEADER_ARMOR, 1, 0, fx, fz, 0, { npc: true }); return true; }
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- the war, each frame
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    for (const sq of this.columns) if (sq.march) this.march(sq, dt);
    this.tickT -= dt;
    if (this.tickT > 0) return;
    this.tickT = 0.5;
    this.tick(0.5);
  }

  tick(dt) {
    const g = this.game;
    this.squads = this.squads.filter((sq) => sq.n > 0);
    this.columns = this.columns.filter((sq) => sq.n > 0 && (sq.march || sq.target));
    for (const sq of this.columns) {
      // a column waits for its stragglers (but not forever: one stuck on a corner catches up in the fight)
      sq.waitT = sq.lag > 9 ? (sq.waitT || 0) + dt : 0;
      sq.wait = sq.waitT > 0 && sq.waitT < 8;
      sq.lag = 0;
      if (sq.halt && this.t - sq.fightT > 3) sq.halt = false;
      sq.haltT = sq.halt ? (sq.haltT || 0) + dt : 0;
      this.steer(sq);
    }
    this.census();
    const phase = g.stage.phase;
    if (phase === 'idle' || phase === 'win' || phase === 'lose') return;
    const total = g.allies.count + g.crowd.count;
    for (const f of this.fields) {
      if (f.owner === 'fed') this.tendFed(f, dt, total);
      else if (f.owner === 'zeon' && f.lz && f.lz.captain?.alive && !f.lz.captured) this.tendZeon(f, dt, total);
    }
  }

  // Who stands on each field: the holder's soldiers and the enemy's, within FIELD_R of its post.
  census() {
    const g = this.game;
    for (const f of this.fields) {
      const mine = f.owner === 'fed' ? g.allies : g.crowd, theirs = f.owner === 'fed' ? g.crowd : g.allies;
      f.own = this.count(mine, f.x, f.z);
      f.hostile = this.count(theirs, f.x, f.z);
    }
  }

  count(crowd, x, z) {
    let n = 0;
    if (!crowd.count) return 0;
    for (const o of crowd.grid.query(x, z, FIELD_R, this._q)) if (o.alive && o.hp > 0 && o.state !== 'drop' && Math.hypot(o.x - x, o.z - z) < FIELD_R) n++;
    return n;
  }

  garrisonOf(f) {
    let n = 0;
    for (const sq of this.squads) if (sq.field === f && !sq.leader) n += sq.n;
    return n;
  }

  // A Federation field: its leader calls in a squad at a time, to the garrison until it's full, then as a column to
  // take the nearest enemy field. With the leader down it calls nobody; if Zeon stands on it with no GM left to hold
  // it, the field is Zeon's again (when the mission allows it), else a new leader comes in once the ground is clear.
  tendFed(f, dt, total) {
    const g = this.game, C = this.cfg.fed;
    if (f.captain && !f.captain.alive) f.captain = null;
    if (!f.captain) {
      f.downT += dt;
      if (this.canRetake(f) && f.own === 0 && f.hostile >= 2) { this.lose(f); return; }
      if ((f.hostile === 0 && f.downT > 10) || (f.lock && f.downT > 35)) {
        f.downT = 0;
        f.captain = this.spawnCaptain(f, true);
      }
      return;
    }
    f.spawnT -= dt;
    if (f.spawnT > 0) return;
    f.spawnT = C.every * rand(0.85, 1.15);
    // the garrison always gets its men (up to the GMs' cap); columns only while both armies together are under budget
    const room = Math.min(C.cap - g.allies.count, (this.cfg.max ?? Infinity) - total);
    const gar = this.garrisonOf(f);
    if (gar < C.garrison) {
      const a = rand(0, TAU);
      if (room >= 1) this.fedSquad(f.x + Math.sin(a) * 8, f.z + Math.cos(a) * 8, Math.min(C.squad, C.garrison - gar, room), true, { field: f });
      return;
    }
    const n = Math.min(C.squad, room, this.cfg.budget - total);
    const to = n >= 2 && this.pickTarget('fed', f.x, f.z);
    if (to) this.sendColumn(this.fedSquad(f.x + rand(-4, 4), f.z + rand(-4, 4), n, true), to);
  }

  canRetake(f) {
    return !f.lock && !!f.lz && this.cfg.recapture && this.t > f.safeUntil && !!this.game.stage.canRecapture?.();
  }

  // A Zeon landing zone (the stage reinforces its garrison): every so often a pod brings a column to send against
  // the nearest Federation field, the ones Zeon could take back first.
  tendZeon(f, dt, total) {
    const g = this.game, C = this.cfg.zeon;
    f.sendT -= dt;
    if (f.sendT > 0) return;
    f.sendT = C.every * rand(0.8, 1.2);
    let marching = 0;
    for (const sq of this.columns) if (sq.team === 'zeon') marching += sq.n;
    const room = Math.min(C.cap - marching, this.cfg.budget - total, g.difficulty.maxAlive - g.crowd.count);
    if (room < 3) return;
    const to = this.pickTarget('zeon', f.x, f.z);
    if (!to) return;
    const a = rand(0, TAU);
    const sq = g.stage.garrison(f.x + Math.sin(a) * 7, f.z + Math.cos(a) * 7, Math.min(C.squad, room), null, true);
    sq.team = 'zeon';
    this.stats.zeonSent += sq.n;
    this.sendColumn(sq, to);
  }

  // The enemy field a column from (x, z) goes for: the nearest, give or take, Zeon preferring ones it could take.
  pickTarget(team, x, z) {
    let best = null, bd = Infinity;
    for (const f of this.fields) {
      if (!f.owner || f.owner === team) continue;
      const d = Math.hypot(f.x - x, f.z - z) * rand(0.85, 1.15) + (team === 'zeon' && f.lock ? 150 : 0);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }

  // ---------------------------------------------------------------- troops
  fedSquad(x, z, n, drop, o = {}) {
    const g = this.game, C = this.cfg.fed;
    const sq = { x, z, engaged: false, n: 0, team: 'fed', field: null, target: null, march: null, halt: false, fightT: -9, lag: 0, ...o };
    this.squads.push(sq);
    const gunners = n >= 4 ? 1 : 0;
    let made = 0;
    for (let i = 0; i < n * 3 && made < n; i++) {
      const a = rand(0, TAU), r = rand(1.2, 3 + n * 0.4);
      const px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
      if (g.world.blocked(px, pz, 1.2)) continue;
      if (g.allies.spawn(px, pz, { gun: made < gunners, drop, yaw: a, squad: sq, hp: C.hp })) made++;
    }
    this.stats.fedSpawned += made;
    return sq;
  }

  // The field's GM leader stands at its post (beside a landing zone's pod, where Zeon's stood).
  spawnCaptain(f, drop) {
    const x = f.lz ? f.x + 3.5 : f.x, z = f.lz ? f.z + 3.5 : f.z;
    const sq = { x, z, engaged: false, n: 0, team: 'fed', field: f, leader: true, target: null, march: null };
    this.squads.push(sq);
    return this.game.allies.spawn(x, z, { captain: true, hp: this.cfg.fed.captainHp, drop, squad: sq, yaw: rand(0, TAU) });
  }

  // A field becomes the Federation's: its leader, and a garrison filled out to strength (within the caps).
  installFed(f, drop) {
    const g = this.game, C = this.cfg.fed;
    f.owner = 'fed';
    f.downT = 0;
    f.spawnT = C.every;
    if (!f.captain) f.captain = this.spawnCaptain(f, drop);
    let have = this.garrisonOf(f);
    for (let k = 0; k < 4 && have < C.garrison; k++) {
      const n = Math.min(C.squad, C.garrison - have, C.cap - g.allies.count, (this.cfg.max ?? Infinity) - g.allies.count - g.crowd.count);
      if (n < 1) break;
      const a = rand(0, TAU);
      have += this.fedSquad(f.x + Math.sin(a) * 8, f.z + Math.cos(a) * 8, n, drop, { field: f }).n;
    }
  }

  // ---------------------------------------------------------------- columns
  sendColumn(sq, to) {
    sq.target = to;
    sq.field = null;
    sq.base = null;
    sq.march = { path: this.route(sq.x, sq.z, to.x, to.z), i: 0 };
    sq.halt = sq.wait = sq.assault = false;
    sq.haltT = 0;
    sq.lag = 0;
    sq.fightT = -9;
    if (!this.columns.includes(sq)) this.columns.push(sq);
    return sq;
  }

  // Squad sq, on field f already, fights to take it.
  attack(sq, f) {
    sq.target = f;
    sq.march = { path: [[f.x, f.z]], i: 0 };
    sq.assault = true;
    if (!this.columns.includes(sq)) this.columns.push(sq);
  }

  // Squad sq joins field f's garrison, and takes a post on its ground (the soldiers walk over to it).
  join(sq, f) {
    sq.target = null;
    sq.march = null;
    sq.halt = sq.assault = false;
    if (sq.team === 'fed') sq.field = f;
    else sq.base = f.lz || null;
    if (Math.hypot(sq.x - f.x, sq.z - f.z) > 12) {
      const a = Math.atan2(sq.x - f.x, sq.z - f.z) + rand(-0.6, 0.6);
      sq.x = f.x + Math.sin(a) * 9;
      sq.z = f.z + Math.cos(a) * 9;
    }
  }

  // Walk a column's anchor down its route to the target field's post (its soldiers keep formation on it, see
  // Crowd.keepPost). A skirmish on the way stops it (and it waits for its stragglers); at the enemy's field, or
  // after a long stand-off, it pushes on through the fight at a crawl.
  march(sq, dt) {
    const m = sq.march, f = sq.target;
    if (sq.wait || sq.engaged || m.i >= m.path.length) return;
    if (sq.halt && !sq.assault && sq.haltT < 45 && Math.hypot(sq.x - f.x, sq.z - f.z) > 80) return;
    const [wx, wz] = m.path[m.i];
    const dx = wx - sq.x, dz = wz - sq.z, d = Math.hypot(dx, dz), step = (sq.halt ? MARCH * 0.3 : MARCH) * dt;
    if (d > step) { sq.x += (dx / d) * step; sq.z += (dz / d) * step; return; }
    sq.x = wx;
    sq.z = wz;
    if (++m.i >= m.path.length && f.owner === sq.team) this.join(sq, f);
  }

  // Twice a second: a column close to its target field starts its assault (the leader first, see foeFor). One whose
  // target has become its own side's goes on to the next enemy field, or with none left joins the one it reached.
  steer(sq) {
    const f = sq.target;
    if (!f) return;
    if (!sq.assault && Math.hypot(sq.x - f.x, sq.z - f.z) < ASSAULT) sq.assault = true;
    if (f.owner !== sq.team) return;
    const next = this.pickTarget(sq.team, sq.x, sq.z);
    if (next) this.sendColumn(sq, next);
    else if (sq.assault) this.join(sq, f);
  }

  // ---------------------------------------------------------------- routes
  // Columns keep to open ground: a visibility graph over the boulevard crossings and the fields, built once.
  nav() {
    if (this._nav) return this._nav;
    const nodes = [];
    for (const x of ROADS) for (const z of ROADS) if (Math.abs(x) < ARENA && Math.abs(z) < ARENA) nodes.push([x, z]);
    for (const f of FIELDS) nodes.push([Math.round(f.cx), Math.round(f.cz)]);
    const edges = nodes.map(() => []);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const [ax, az] = nodes[i], [bx, bz] = nodes[j], d = Math.hypot(bx - ax, bz - az);
        if (d > 170 || !this.clear(ax, az, bx, bz)) continue;
        edges[i].push([j, d]);
        edges[j].push([i, d]);
      }
    }
    return (this._nav = { nodes, edges });
  }

  clear(ax, az, bx, bz) {
    const w = this.game.world, n = Math.ceil(Math.hypot(bx - ax, bz - az) / 2);
    for (let k = 1; k < n; k++) if (w.blocked(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, 2)) return false;
    return true;
  }

  // Waypoints from (ax, az) to (bx, bz), ending at b: straight there if the way is open, else the shortest way
  // through the graph.
  route(ax, az, bx, bz) {
    if (this.clear(ax, az, bx, bz)) return [[bx, bz]];
    const { nodes, edges } = this.nav(), N = nodes.length;
    const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const toEnd = nodes.map(([x, z]) => (this.clear(x, z, bx, bz) ? Math.hypot(bx - x, bz - z) : Infinity));
    for (let i = 0; i < N; i++) if (this.clear(ax, az, nodes[i][0], nodes[i][1])) dist[i] = Math.hypot(nodes[i][0] - ax, nodes[i][1] - az);
    let best = Infinity, last = -1;
    for (;;) {
      let u = -1, ud = Infinity;
      for (let i = 0; i < N; i++) if (!done[i] && dist[i] < ud) { ud = dist[i]; u = i; }
      if (u < 0 || ud >= best) break;
      done[u] = 1;
      if (ud + toEnd[u] < best) { best = ud + toEnd[u]; last = u; }
      for (const [v, w] of edges[u]) if (ud + w < dist[v]) { dist[v] = ud + w; prev[v] = u; }
    }
    const path = [[bx, bz]];
    for (let i = last; i >= 0; i = prev[i]) path.unshift(nodes[i]);
    return path;
  }

  // ---------------------------------------------------------------- co-op
  // Guests only need who holds which field (the minimap); their soldiers come in the allied crowd's snapshot.
  netState() {
    return this.fields.map((f) => [f.idx, f.owner === 'fed' ? 1 : f.owner === 'zeon' ? 2 : 0]);
  }

  applyNet(arr) {
    this.fields = (arr || []).map(([idx, o]) => {
      const def = FIELDS[idx];
      return { name: def.name, idx, def, x: def.cx, z: def.cz, owner: o === 1 ? 'fed' : o === 2 ? 'zeon' : null };
    });
  }
}
