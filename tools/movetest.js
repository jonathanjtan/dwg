// Dev-only move chain test: `const t = await import('/tools/movetest.js'); t.run()` in the console (after the harness).
// Starts a mission, waits for control, then plays each input sequence at a fixed 60 Hz and records which moves ran.
const game = window.game;
const tick = () => { game.last = performance.now() - 1000 / 60; game.frame(); };

// events: [frame, 'tap' | 'hold', keys, frames held]
function play(events, frames, { sp = false, air = false } = {}) {
  // the mission's cut-scenes (a pod coming down, an officer arriving) take control away: wait them out, and hold the
  // mission where it is so a new one can't start mid-test
  for (let i = 0; i < 900 && game.cutsceneT > 0; i++) tick();
  game.stage.phase = 'test';
  const h = game.hero;
  h.reset();
  h.pos.set(0, 0, 0);
  h.state = 'move';
  h.invuln = 999;
  if (sp) h.sp = h.maxSp;
  const held = [];
  const seen = [];
  const errs = [];
  try {
    for (let i = 0; i < frames; i++) {
      game.input.down.clear();
      for (const [f, kind, keys, dur = 2] of events) {
        if (f === i) {
          for (const k of keys) game.input.pressed.add(k);
          held.push({ keys, until: i + (kind === 'hold' ? dur : 2) });
        }
      }
      for (const hd of held) if (i < hd.until) for (const k of hd.keys) game.input.down.add(k);
      if (air && i === 0) { game.input.pressed.add('Space'); game.input.down.add('Space'); }
      tick();
      const hh = game.hero;
      const name = hh.state === 'attack' || hh.state === 'musou' ? hh.moveName : null;
      if (name && (seen.length === 0 || seen[seen.length - 1].name !== name || hh.moveT < seen[seen.length - 1].t)) seen.push({ name, t: hh.moveT });
      if (name && seen.length) seen[seen.length - 1].t = hh.moveT;
    }
  } catch (e) { errs.push(e.stack); }
  game.input.down.clear();
  return { moves: seen.map((s) => s.name).join(' '), errs };
}

const J = 'KeyJ', K = 'KeyK', I = 'KeyI', L = 'ShiftLeft';
const taps = (key, n, every = 20, from = 0) => Array.from({ length: n }, (_, i) => [from + i * every, 'tap', [key]]);

export const CHAINS = {
  combo: [taps(J, 6, 22), 260],
  c2: [[[0, 'tap', [J]], [22, 'tap', [K]]], 200],
  c3: [[...taps(J, 2, 22), [44, 'tap', [K]]], 260],
  c4: [[...taps(J, 3, 22), [66, 'tap', [K]]], 280],
  c5: [[...taps(J, 4, 22), [88, 'tap', [K]]], 300],
  c6: [[...taps(J, 5, 24), [120, 'tap', [K]]], 360],
  shots: [taps(K, 4, 12), 160],
  cshot: [[[0, 'hold', [K], 60]], 160],
  rush: [[[0, 'hold', [L], 40], ...taps(J, 8, 18, 30)], 330],
  dc: [[[0, 'hold', [L], 40], [30, 'tap', [K]]], 200],
  jump: [[[0, 'hold', ['Space'], 6], [20, 'tap', [J]], [45, 'tap', [J]]], 150],
  jc: [[[0, 'hold', ['Space'], 6], [24, 'tap', [K]]], 150],
};
export const SPS = {
  sp: [[[0, 'tap', [I]]], 900, { sp: true }],
  spHold: [[[0, 'hold', [I], 60]], 1100, { sp: true }],
  spAir: [[[0, 'hold', ['Space'], 8], [22, 'tap', [I]]], 1100, { sp: true }],
};

export async function run(which = null) {
  if (game.mode !== 'play') game.start();
  for (let i = 0; i < 1200 && !(game.hero.state === 'move' && game.cutsceneT <= 0); i++) tick();
  const out = {};
  for (const [name, [ev, frames, opts]] of Object.entries({ ...CHAINS, ...SPS })) {
    if (which && !which.includes(name)) continue;
    out[name] = play(ev, frames, opts);
  }
  return out;
}

export default run;
