// Dev-only war telemetry (war.js): `const w = await import('/tools/wartest.js')` in the console, after the harness.
//   w.skirmish(6)  two even squads, a GM and a Zaku one, left to fight it out far from the pilot: how long it lasts
//   w.campaign(10) the mission with the pilot parked out of the way (invulnerable) for 10 minutes of game time: who
//                  takes which field when, how many soldiers each side has, and what a frame of simulation costs
const game = window.game;
const tick = () => { game.last = performance.now() - 1000 / 60; game.frame(); };
const quiet = (fn) => { const r = game.post.render; game.post.render = () => {}; try { return fn(); } finally { game.post.render = r; } };
const park = (x, z) => { const h = game.hero; h.pos.set(x, 0, z); h.vel.set(0, 0, 0); h.invuln = 1e9; h.hp = h.maxHp; if (h.state === 'intro') h.state = 'move'; };

export function skirmish(n = 6, secs = 600, { gmHp } = {}) {
  const g = game;
  g.start();
  quiet(tick);
  g.crowd.clear(); g.allies.clear(); g.commanders.clear(); g.projectiles.clear();
  g.stage.phase = 'idle'; // no posts, no pods, no production: just the two squads
  const cfg = { fields: {}, allyCapture: true, recapture: true, budget: 999, fed: { every: 12, squad: 4, garrison: 8, cap: 30, hp: gmHp ?? 60, captainHp: 300, grace: 60 }, zeon: { every: 45, squad: 6, cap: 18 } };
  g.war.begin(cfg);
  const zs = { x: -10, z: 60, engaged: false, n: 0 };
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.crowd.spawn(zs.x + Math.sin(a) * 3.5, zs.z + Math.cos(a) * 3.5, { gun: i === 0, squad: zs }); }
  g.war.fedSquad(10, 60, n, false);
  let t = 0, first = null;
  const log = [];
  quiet(() => {
    for (; t < secs; t++) {
      for (let k = 0; k < 60; k++) { park(150, -150); tick(); }
      if (t % 30 === 0) log.push([t, g.crowd.count, g.allies.count]);
      if (first === null && (g.crowd.count < n || g.allies.count < n)) first = t;
      if (!g.crowd.count || !g.allies.count) break;
    }
  });
  return { secs: t, firstKO: first, zaku: g.crowd.count, gm: g.allies.count, log };
}

// skipPlaza: go straight to the landing zones. at: where the pilot is parked. take: zones the pilot takes a minute in
// (their squad leader and half their garrison felled by the pilot), to watch Zeon try to take them back.
export function campaign(minutes = 10, { skipPlaza = true, at = [175, -175], every = 30, take = [] } = {}) {
  const g = game;
  g.start();
  const rows = [];
  let simMs = 0, frames = 0;
  quiet(() => {
    for (let i = 0; i < 400 && g.hero.state === 'intro'; i++) tick();
    if (skipPlaza && g.stage.phase === 'plaza') {
      // as if the pilot had cleared the plaza: its Zeon garrison is gone
      for (const e of [...g.crowd.list]) if (Math.hypot(e.x, e.z) < 48) g.crowd.remove(e);
      g.stage.plazaKos = 999;
      g.stage.startBases();
    }
    for (let s = 0; s < minutes * 60; s++) {
      for (let k = 0; k < 60; k++) {
        park(at[0], at[1]);
        g.cutsceneT = 0;
        const a = performance.now();
        tick();
        simMs += performance.now() - a;
        frames++;
      }
      if (s === 60) {
        for (const lz of g.lz.list) {
          if (!take.includes(lz.name) || !lz.captain?.alive) continue;
          const near = g.crowd.list.filter((e) => Math.hypot(e.x - lz.x, e.z - lz.z) < 35);
          near.slice(0, near.length >> 1).forEach((e) => g.crowd.remove(e));
          lz.captain.damage(1e5, 6, 6, lz.x, lz.z, 0, { sp: true });
        }
      }
      if (s % every === 0) {
        const w = g.war;
        rows.push({
          t: s, phase: g.stage.phase, zeon: g.crowd.count, gm: g.allies.count,
          fields: w.fields.map((f) => `${f.name[0]}:${f.owner === 'fed' ? 'F' : f.owner === 'zeon' ? 'Z' : '-'}${f.owner === 'fed' ? (f.captain ? '+' : '0') : f.lz?.captain?.alive ? `+${Math.round(f.lz.captain.hp)}` : ''}/${f.own}v${f.hostile}`).join(' '),
          cols: w.columns.map((c) => `${c.team[0]}${c.n}>${c.target?.name[0] ?? '?'}${c.march ? '~' : ''}`).join(' '),
        });
      }
      if (g.mode !== 'play') break;
    }
  });
  return { rows, events: g.war.stats.events, stats: { ...g.war.stats, events: undefined }, msPerFrame: +(simMs / frames).toFixed(3), zones: g.stage.zonesTaken };
}
