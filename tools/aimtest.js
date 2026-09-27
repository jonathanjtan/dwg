// Dev-only gun alignment check: `(await import('/tools/aimtest.js')).run(['sazabi'])` in the console (after the
// harness). Plays every movetest chain with an enemy standing 30 degrees off the suit's facing, and for each beam,
// shell or rocket fired while a hand-held gun is out, measures the angle between the barrel (the hand's +Z) and the
// projectile's direction, and how far the round starts from the barrel's line. A clean suit reports a few degrees at
// most; 20-35 means the pose points the gun one way and the round goes another.
import { CHAINS, SPS } from './movetest.js';
import { SOLO_ROSTER } from '../src/game/roster.js';

const THREE = await import('three');
const game = window.game;
const tick = () => { game.last = performance.now() - 1000 / 60; game.frame(); };
const GUNS = ['rifle', 'bazooka', 'launcher'];
const deg = (r) => Math.round((r * 180) / Math.PI);

function play(events, frames, { sp = false } = {}) {
  for (let i = 0; i < 900 && game.cutsceneT > 0; i++) tick();
  game.stage.phase = 'test';
  const h = game.hero;
  h.reset();
  h.pos.set(0, 0, 0);
  h.heading = 0;
  h.state = 'move';
  h.invuln = 999;
  if (sp) h.sp = h.maxSp;
  game.crowd.clear();
  game.crowd.spawn(Math.sin(0.52) * 10, Math.cos(0.52) * 10, { yaw: Math.PI, hp: 1e6 });
  const held = [];
  for (let i = 0; i < frames; i++) {
    game.input.down.clear();
    for (const [f, kind, keys, dur = 2] of events) {
      if (f !== i) continue;
      for (const k of keys) game.input.pressed.add(k);
      held.push({ keys, until: i + (kind === 'hold' ? dur : 2) });
    }
    for (const hd of held) if (i < hd.until) for (const k of hd.keys) game.input.down.add(k);
    tick();
  }
  game.input.down.clear();
}

export async function run(ids = null) {
  if (game.mode !== 'play') game.start();
  for (let i = 0; i < 1200 && !(game.hero.state === 'move' && game.cutsceneT <= 0); i++) tick();
  const pj = game.projectiles;
  const out = {};
  for (const r of SOLO_ROSTER) {
    if (ids && !ids.includes(r.id)) continue;
    game.setSuit(r.id);
    const h = game.hero;
    const guns = h.suit.guns || GUNS;
    const worst = {};
    const hooks = ['heroBeam', 'shell', 'rocket'].map((name) => {
      const orig = pj[name];
      pj[name] = function (owner, from, dir, ...rest) {
        const hand = h.rig.nodes.hand;
        // rounds from the gun, not remote weapons (funnels, bits) that fire while it's out
        if (owner === h && guns.includes(h.wpn) && from.distanceTo(hand.getWorldPosition(new THREE.Vector3())) < 4) {
          const barrel = new THREE.Vector3(0, 0, 1).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
          const ang = barrel.angleTo(dir);
          const base = hand.getWorldPosition(new THREE.Vector3());
          const off = new THREE.Vector3().subVectors(from, base).cross(barrel).length(); // distance off the barrel line
          const key = `${h.moveName}:${h.wpn}`;
          const w = worst[key] || (worst[key] = { n: 0, deg: 0, off: 0 });
          w.n++;
          w.deg = Math.max(w.deg, deg(ang));
          w.off = Math.max(w.off, +off.toFixed(2));
        }
        return orig.call(this, owner, from, dir, ...rest);
      };
      return () => { pj[name] = orig; };
    });
    try {
      for (const [ev, frames, opts] of Object.values({ ...CHAINS, ...SPS })) play(ev, frames, opts);
    } finally {
      hooks.forEach((u) => u());
    }
    out[r.id] = Object.entries(worst).map(([k, w]) => `${k} ×${w.n}: ${w.deg}° off the barrel, starts ${w.off} off its line`);
  }
  return out;
}

export default run;
