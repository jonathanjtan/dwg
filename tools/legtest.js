// Dev-only leg check: `const t = await import('/tools/legtest.js'); t.run(null, ['gm'])` in the console (after the
// harness). Drives the suit through the RUNS below at a fixed 60 Hz and measures its legs every frame, in the frame
// of its hips (+x to its left), so a stride that swings one leg through the other shows up as a number rather than
// a frame of video. Per run, in leg lengths: minFoot / minKnee, the least the feet and knees are apart side to side
// (negative: crossed, and `crossed` counts those frames); minLegs, the closest the two legs come in 3D (thigh and
// shin as segments); clear, the least gap between the shins' inner faces; float, the highest a planted foot sits;
// and slip, how far planted feet slide over the ground against the distance covered.
import * as THREE from 'three';

const game = window.game;
const tick = () => { game.last = performance.now() - 1000 / 60; game.frame(); };
const _a = new THREE.Vector3(), _b = new THREE.Vector3();

// closest distance between segments p0-p1 and q0-q1
function segDist(p0, p1, q0, q1) {
  const d1 = p1.clone().sub(p0), d2 = q1.clone().sub(q0), r = p0.clone().sub(q0);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r), c = d1.dot(r), b = d1.dot(d2);
  const den = a * e - b * b;
  let s = den > 1e-9 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
  let t = (b * s + f) / e;
  if (t < 0) { t = 0; s = Math.min(1, Math.max(0, -c / a)); } else if (t > 1) { t = 1; s = Math.min(1, Math.max(0, (b - c) / a)); }
  return p0.clone().addScaledVector(d1, s).distanceTo(q0.clone().addScaledVector(d2, t));
}

// One frame of the local suit's legs, in its hips' frame: hip, knee, foot per side.
export function sample(h = game.hero) {
  const n = h.rig.nodes, sp = h.gaitSpec;
  h.rig.root.updateMatrixWorld(true);
  const local = (v) => n.hips.worldToLocal(v.clone());
  const leg = (side) => ({
    hip: local(n['thigh' + side].getWorldPosition(_a)),
    knee: local(n['shin' + side].getWorldPosition(_a)),
    foot: local(n['shin' + side].localToWorld(_b.set(0, -sp.ls, 0))),
  });
  const L = leg('L'), R = leg('R');
  return {
    L, R,
    foot: L.foot.x - R.foot.x, // side-to-side gap, feet (+: each on its own side)
    knee: L.knee.x - R.knee.x,
    shins: segDist(L.knee, L.foot, R.knee, R.foot), // centre lines; the shins' own thickness is in record()'s `clear`
    legs: Math.min(segDist(L.knee, L.foot, R.knee, R.foot), segDist(L.hip, L.knee, R.knee, R.foot), segDist(R.hip, R.knee, L.knee, L.foot)),
  };
}

// Run `frames` frames, calling `drive(i)` for input each frame, and summarise the legs.
export function record(frames, drive) {
  const h = game.hero, len = h.gaitSpec.len;
  // how far the shin reaches in toward the other leg from its own line (its widest voxel on the inside)
  let rin = 0;
  for (const v of h.rig.def.parts.shinR.model.map.values()) rin = Math.max(rin, (v.x + 1) * h.rig.def.scale);
  const out = { frames: 0, minFoot: 1e9, minKnee: 1e9, minLegs: 1e9, clear: 1e9, crossed: 0, slip: 0, float: 0, worst: null };
  let slid = 0, went = 0, prev = null;
  for (let i = 0; i < frames; i++) {
    game.input.down.clear();
    drive(i);
    tick();
    if (game.hero.state !== 'move') { prev = null; continue; }
    const m = sample();
    const n = game.hero.rig.nodes, ls = game.hero.gaitSpec.ls;
    const feet = [n.shinR.localToWorld(new THREE.Vector3(0, -ls, 0)), n.shinL.localToWorld(new THREE.Vector3(0, -ls, 0))];
    const cur = { feet, pl: [...h.gs.pl], x: h.pos.x, z: h.pos.z };
    if (prev) {
      went += Math.hypot(cur.x - prev.x, cur.z - prev.z);
      for (let j = 0; j < 2; j++) if (cur.pl[j] && prev.pl[j]) {
        slid += Math.hypot(feet[j].x - prev.feet[j].x, feet[j].z - prev.feet[j].z);
        out.float = Math.max(out.float, feet[j].y);
      }
    }
    prev = cur;
    out.frames++;
    if (m.foot < out.minFoot) out.minFoot = m.foot;
    out.clear = Math.min(out.clear, m.shins - 2 * rin);
    if (m.knee < out.minKnee) out.minKnee = m.knee;
    if (m.legs < out.minLegs) { out.minLegs = m.legs; out.worst = { i, amp: +h.gs.amp.toFixed(2), sp: +Math.hypot(h.vel.x, h.vel.z).toFixed(2), foot: +m.foot.toFixed(3), knee: +m.knee.toFixed(3) }; }
    if (m.foot < 0 || m.knee < 0) out.crossed++;
  }
  game.input.down.clear();
  out.slip = +(slid / Math.max(1e-6, went)).toFixed(3);
  for (const k of ['minFoot', 'minKnee', 'minLegs', 'clear', 'float']) out[k] = +(out[k] / len).toFixed(3); // in leg lengths
  return out;
}

function settle() {
  if (game.mode === 'paused') game.mode = 'play'; // the tab lost focus: nothing moves while the menu is up
  for (let i = 0; i < 900 && game.cutsceneT > 0; i++) tick();
  game.stage.phase = 'test';
  const h = game.hero;
  h.reset();
  h.pos.set(0, 0, 0);
  h.vel.set(0, 0, 0);
  h.heading = 0;
  h.state = 'move';
  h.invuln = 999;
  game.camera.yaw = 0;
  game.input.down.clear();
  for (let i = 0; i < 30; i++) tick();
}

const W = 'KeyW', A = 'KeyA', S = 'KeyS', D = 'KeyD';
const hold = (...keys) => () => { for (const k of keys) game.input.down.add(k); };
const zigzag = (i) => { game.input.down.add(W); game.input.down.add((i / 40 | 0) % 2 ? A : D); };
const strafe = (i) => game.input.down.add(i < 100 ? A : i < 200 ? D : S);
const AHEAD = { x: 0, z: 30 }; // a lock-on target: the stick strafes the suit round it and backs it off, chest to it
// name: [frames, drive(frame), { lock: a point to keep the chest on, mag: the stick pushed only this far (a walk) }]
export const RUNS = {
  run: [240, hold(W)],
  walk: [240, hold(W), { mag: 0.35 }],
  walkTurn: [300, zigzag, { mag: 0.35 }],
  zigzag: [300, zigzag],
  circle: [300, () => { game.input.down.add(W); game.input.down.add(A); game.camera.yaw += 0.03; }],
  reverse: [240, (i) => game.input.down.add(i < 90 ? W : S)],
  startStop: [300, (i) => { if ((i / 45 | 0) % 2 === 0) game.input.down.add(W); }],
  side: [240, (i) => game.input.down.add(i < 120 ? A : D)],
  strafe: [300, strafe, { lock: AHEAD }],
  strafeWalk: [300, strafe, { lock: AHEAD, mag: 0.3 }],
  strafeDiag: [240, (i) => { game.input.down.add(i < 120 ? A : D); game.input.down.add(i % 80 < 40 ? W : S); }, { lock: AHEAD }],
};

export async function run(which = null, suits = null) {
  const cr = game.post.render;
  game.post.render = () => {}; // no drawing: it only slows the steps down
  if (game.mode !== 'play') game.start({ training: true });
  for (let i = 0; i < 1500 && !(game.hero.state === 'move' && game.cutsceneT <= 0); i++) tick();
  const res = {};
  try {
    for (const id of suits || [game.hero.suit.id]) {
      if (game.hero.suit.id !== id) game.setSuit(id);
      if (game.hero.suit.id !== id) { res[id] = 'not a solo suit'; continue; }
      if (!game.hero.gaitSpec) continue;
      res[id] = {};
      const h = game.hero;
      for (const [name, [frames, drive, { lock, mag } = {}]] of Object.entries(RUNS)) {
        if (which && !which.includes(name)) continue;
        settle();
        if (lock) game.lockTarget = () => ({ x: lock.x, y: 0, z: lock.z });
        if (mag) h.inputDir = (...a) => { const d = Object.getPrototypeOf(h).inputDir.apply(h, a); if (d) d.mag *= mag; return d; };
        try { res[id][name] = record(frames, drive); } finally { delete game.lockTarget; delete h.inputDir; }
      }
    }
  } finally { game.post.render = cr; }
  return res;
}

// The shape of a straight run, per suit: how high the thighs come up (degrees off straight down), how far the knees
// fold, and how high the swing foot rises (leg lengths).
export function shape(suits = [game.hero.suit.id], frames = 200) {
  const cr = game.post.render;
  game.post.render = () => {};
  const res = {};
  try {
    for (const id of suits) {
      if (game.hero.suit.id !== id) game.setSuit(id);
      if (game.hero.suit.id !== id) { res[id] = 'not a solo suit'; continue; }
      const h = game.hero;
      if (!h.gaitSpec) continue;
      settle();
      let thigh = 0, knee = 0, lift = 0;
      for (let i = 0; i < frames; i++) {
        game.input.down.clear();
        game.input.down.add(W);
        tick();
        if (i < 60) continue;
        const m = sample();
        for (const leg of [m.L, m.R]) {
          const d = leg.knee.clone().sub(leg.hip).normalize();
          thigh = Math.max(thigh, Math.acos(-d.y));
          const a = leg.hip.clone().sub(leg.knee), b = leg.foot.clone().sub(leg.knee);
          knee = Math.max(knee, Math.PI - a.angleTo(b));
        }
        const n = h.rig.nodes, ls = h.gaitSpec.ls;
        for (const s of ['shinL', 'shinR']) lift = Math.max(lift, n[s].localToWorld(_b.set(0, -ls, 0)).y / h.gaitSpec.len);
      }
      res[id] = { thigh: Math.round(thigh * 180 / Math.PI), knee: Math.round(knee * 180 / Math.PI), lift: +lift.toFixed(2) };
    }
  } finally { game.input.down.clear(); game.post.render = cr; }
  return res;
}

export default run;
