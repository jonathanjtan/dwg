// Crossbone Gundam X1 Kai moveset, after Dynasty Warriors: Gundam Reborn's "ALL MOVES" video (space pirate colours,
// the X-shaped main thrusters, the ABC mantle). Ported 1:1 where the video shows it: Basic Combo -> N1-N6, Shot Combo
// -> C1/C1R, Charge Shot -> CS (a five-beam spread from the buster gun, not one heavy bolt), Charge 2-6, Dash Combo ->
// DA/DAF, Dash Charge -> DC, Musou -> SP_*, Air Musou -> SPA_* (a meteoric dive, closer to the Ball's than the
// Gundam's), Charge Musou -> SPC_* (the screw whip spun out into a widening, pulling vortex). The video skips jump
// attacks, so JA/JC are invented in the spirit of the kit: a quick zanber cut and a heat-dagger plunge.
// Reach measured off the footage in X1 Kai heights (H ~ 3.0 units, the suit runs ~0.88x the Gundam): the zanber blade
// is ~1.5H, the screw whip's lash reaches out to ~2.8H and hauls its catch most of the way back, the charge-6 vortex
// opens to ~3H before it collapses in, and the SPA meteor dive lands a shock ~3H across.
import { Clip, poseFrom } from '../core/rig.js';

const PI = Math.PI;
export const BLADE = 4.6; // zanber blade length (units)
export const SBLADE = 3.0; // off-hand beam saber, drawn for the dual-blade finishers
export const WHIP_R = 8.6; // screw whip max extension

// Ready stance: zanber low and back, mantle hanging, weight forward on the balls of the feet.
export const STANCE = poseFrom({
  y: -0.08,
  hips: [0, 0, 0],
  torso: [0.12, -0.15, 0],
  head: [-0.06, 0.15, 0],
  uArmR: [-0.3, 0, -0.3], fArmR: [-0.75, 0, 0], hand: [0.3, 0, 0],
  uArmL: [-0.5, 0, 0.35], fArmL: [-0.9, 0, 0], handL: [0, 0.15, 0],
  thighR: [-0.28, 0, -0.12], shinR: [0.4, 0, 0],
  thighL: [-0.06, 0, 0.12], shinL: [0.3, 0, 0],
});

const k = (t, p, e) => ({ t, p, e });
const clip = (keys) => new Clip(keys, STANCE);
const times = (t0, t1, step) => {
  const out = [];
  for (let t = t0; t < t1 - 1e-6; t += step) out.push(t);
  return out;
};
const every = (t0, t1, step, spec) => times(t0, t1, step).map((t) => ({ t, t1: t + step * 0.8, ...spec }));

const LEGS_LUNGE_R = { thighR: [-0.9, 0, -0.1], shinR: [0.9, 0, 0], thighL: [0.45, 0, 0.1], shinL: [0.35, 0, 0] };
const LEGS_LUNGE_L = { thighL: [-0.9, 0, 0.1], shinL: [0.9, 0, 0], thighR: [0.45, 0, -0.1], shinR: [0.35, 0, 0] };
const LEGS_WIDE = { thighR: [-0.2, 0, -0.42], shinR: [0.6, 0, 0], thighL: [-0.2, 0, 0.42], shinL: [0.6, 0, 0] };
const LEGS_AIR = { thighR: [-1.0, 0, -0.1], shinR: [1.5, 0, 0], thighL: [-0.3, 0, 0.1], shinL: [0.8, 0, 0] };
const LEGS_KNEEL = { thighR: [-1.4, 0, -0.2], shinR: [2.1, 0, 0], thighL: [0.3, 0, 0.15], shinL: [1.5, 0, 0] };
// Sweeps: the zanber arm swept out to the side, held level (z ~ -1.5) so the long blade doesn't rake the ground.
const SWEEP_R = { uArmR: [0, -0.2, -1.5], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0] };
const SWEEP_L = { uArmR: [0, 1.85, -1.5], fArmR: [-0.15, 0, 0], hand: [1.2, 0, 0] };
const PISTOL = { torso: [0, -0.4, 0.05], uArmR: [-1.35, 0, -0.15], fArmR: [-0.35, 0, 0], hand: [1.5, 0, 0], uArmL: [-0.6, 0, 0.25], head: [0, -0.3, 0] };
const GUARD = { torso: [0.05, -0.25, -0.1], uArmL: [-0.9, 0, 1.15], fArmL: [-0.5, 0, 0], handL: [0.3, 0, 0], uArmR: [-0.4, 0, -0.3] };
// Off-hand saber drawn for a dual-blade cross: right sweeps low-to-high, left high-to-low, meeting in an X.
const CROSS_R = { uArmR: [0, -0.3, -1.5], fArmR: [-0.15, 0, 0], hand: [1.2, 0, 0] };
const CROSS_L = { uArmL: [0, 0.3, 1.5], fArmL: [-0.15, 0, 0], handL: [1.2, 0, 0] };

// hit: { t, t1, shape, range, arc, len, width, off, hy, dmg, kb, up, pull, big, sp, stop }
// ev: [t, name, arg]; shots: { t, kind, ang, dn }; wpn: [t, weapon] (saber: zanber blade | rifle: buster gun |
// cross: zanber + off-hand beam saber both out | whip: screw whip | shield: beam shield | null: empty hands); jets,
// slide, lunge, air as in moves.js; wh: screw whip extension curve (0..WHIP_R); spin: true marks the X-thrusters
// spinning up.
export const MOVES = {
  // ---- normal string: five zanber cuts and a dual-blade cross that launches everything around the suit ----
  N1: {
    dur: 0.46, chain: 0.28, next: 'N2', charge: 'C2', saber: true,
    lunge: [[0.03, 0], [0.15, 1.5]],
    clip: clip([
      k(0, { torso: [0.22, 0.75, 0], uArmR: [0, 1.85, -1.2], fArmR: [-0.2, 0, 0], hand: [1.3, 0, 0], uArmL: [-0.8, 0, 0.5], y: -0.28, ...LEGS_LUNGE_L }),
      k(0.06, { torso: [0.25, 0.85, 0] }),
      k(0.17, { torso: [-0.2, -0.7, 0], uArmR: [-2.2, -0.3, -0.8], fArmR: [-0.1, 0, 0], hand: [0.5, 0, 0], uArmL: [-0.3, 0, 0.8], y: -0.16, ...LEGS_LUNGE_R }, 'snap'),
      k(0.46, { torso: [-0.1, -0.5, 0], uArmR: [-1.9, -0.2, -0.65], y: -0.18 }),
    ]),
    hits: [{ t: 0.07, t1: 0.18, shape: 'arc', range: 5.0, arc: 165, dmg: 24, kb: 4, up: 1.5 }],
    sfx: 'slash_b', swing: 0.06,
  },
  N2: {
    dur: 0.44, chain: 0.28, next: 'N3', charge: 'C3', saber: true,
    lunge: [[0.03, 0], [0.15, 1.4]],
    clip: clip([
      k(0, { torso: [0.1, -0.95, 0], ...SWEEP_R, hand: [1.1, 0, 0], uArmL: [-0.9, 0, 0.5], y: -0.14, ...LEGS_WIDE }),
      k(0.06, { torso: [0.12, -1.05, 0], uArmR: [0, -0.3, -1.35] }),
      k(0.16, { torso: [0.14, 0.9, 0], ...SWEEP_L, uArmL: [-0.3, 0, 0.85], y: -0.28, ...LEGS_LUNGE_R }, 'snap'),
      k(0.44, { torso: [0.1, 0.45, 0], uArmR: [-0.3, 1.15, -0.95], hand: [0.8, 0, 0], y: -0.2 }),
    ]),
    hits: [{ t: 0.06, t1: 0.17, shape: 'arc', range: 5.2, arc: 185, dmg: 24, kb: 4.5, up: 0 }],
    sfx: 'slash_a', swing: 0.06,
  },
  N3: {
    dur: 0.5, chain: 0.3, next: 'N4', charge: 'C4', saber: true,
    lunge: [[0.05, 0], [0.18, 1.7]],
    clip: clip([
      k(0, { torso: [-0.22, -0.18, 0], uArmR: [-2.8, 0, -0.25], fArmR: [-0.3, 0, 0], hand: [0.3, 0, 0], uArmL: [-0.3, 0, 0.5], y: -0.04, head: [0.08, 0, 0] }),
      k(0.08, { torso: [-0.32, -0.22, 0], uArmR: [-3.0, 0, -0.2] }),
      k(0.19, { torso: [0.5, 0.1, 0], uArmR: [-0.9, 0, -0.1], fArmR: [-0.1, 0, 0], hand: [0.75, 0, 0], y: -0.42, head: [-0.28, 0, 0], ...LEGS_LUNGE_R }, 'snap'),
      k(0.5, { torso: [0.32, 0, 0], uArmR: [-0.8, 0, -0.2], y: -0.28 }),
    ]),
    hits: [{ t: 0.11, t1: 0.21, shape: 'arc', range: 5.4, arc: 105, dmg: 30, kb: 5.5, up: 0 }],
    sfx: 'slash_h', swing: 0.09,
  },
  N4: {
    dur: 0.46, chain: 0.3, next: 'N5', charge: 'C5', saber: true,
    lunge: [[0.03, 0], [0.16, 1.4]],
    clip: clip([
      k(0, { torso: [0.1, 0.8, 0], ...SWEEP_L, uArmR: [-0.3, 1.85, -1.25], fArmR: [-0.3, 0, 0], y: -0.22, ...LEGS_LUNGE_R }),
      k(0.05, { torso: [0.12, 0.9, 0] }),
      k(0.16, { torso: [0.0, -1.0, 0.1], uArmR: [-0.3, -0.5, -1.25], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.2, 0, 0.6], y: -0.28, ...LEGS_LUNGE_L }, 'snap'),
      k(0.46, { torso: [0.05, -0.55, 0.05], uArmR: [-0.5, 0, -0.85], hand: [0.8, 0, 0] }),
    ]),
    hits: [{ t: 0.06, t1: 0.17, shape: 'arc', range: 5.2, arc: 195, dmg: 26, kb: 5, up: 0 }],
    sfx: 'slash_b', swing: 0.06,
  },
  N5: {
    dur: 0.52, chain: 0.32, next: 'N6', charge: 'C6', saber: true,
    lunge: [[0.04, 0], [0.18, 1.8]],
    clip: clip([
      k(0, { torso: [0.28, -0.85, 0], uArmR: [0.5, -0.4, -0.7], fArmR: [-0.2, 0, 0], hand: [1.3, 0, 0], uArmL: [-1.0, 0, 0.5], y: -0.32, ...LEGS_LUNGE_R }),
      k(0.07, { torso: [0.32, -0.95, 0] }),
      k(0.2, { torso: [-0.28, 0.75, 0], uArmR: [-2.5, 0.6, -0.55], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.3, 0, 0.9], y: -0.14, ...LEGS_LUNGE_L }, 'snap'),
      k(0.52, { torso: [-0.14, 0.5, 0], uArmR: [-2.2, 0.4, -0.45], y: -0.18 }),
    ]),
    hits: [{ t: 0.08, t1: 0.22, shape: 'arc', range: 5.4, arc: 200, dmg: 30, kb: 5.5, up: 3 }],
    sfx: 'slash_rise', swing: 0.07,
  },
  N6: { // both blades drawn: an X-shaped cross-slash that hop-launches everything around the suit
    dur: 0.85, chain: 0.66, next: null, charge: null,
    wpn: [[0, 'saber'], [0.15, 'cross']],
    lunge: [[0.04, 0], [0.26, 1.3]],
    air: [[0, 0], [0.2, 1.4], [0.46, 1.6], [0.7, 0]],
    jets: [0.05, 0.46, true], spin: true,
    clip: clip([
      k(0, { torso: [0.1, -0.4, 0], ...CROSS_R, uArmL: [-0.5, 0, 0.6], fArmL: [-0.7, 0, 0], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.18, { torso: [0.05, 0, 0], ...CROSS_R, ...CROSS_L, y: 0, ...LEGS_AIR }),
      k(0.46, { yaw: PI * 1.6, torso: [0.15, 0, 0], uArmR: [-1.9, -0.2, -1.1], uArmL: [-1.9, 0.2, 1.1] }, 'linear'),
      k(0.7, { yaw: PI * 1.6, torso: [0.15, 0.1, 0], uArmR: [-0.3, 0.6, -1.0], y: -0.32, ...LEGS_WIDE }),
      k(0.85, { yaw: PI * 1.6, torso: [0.1, 0.05, 0], y: -0.22 }),
    ]),
    hits: [{ t: 0.2, t1: 0.44, shape: 'arc', range: 5.1, arc: 360, hy: 5, dmg: 42, kb: 5, up: 9, big: true }],
    ev: [[0.14, 'flash', 'pink']],
    sfx: 'slash_spin', swing: 0.2,
  },

  // ---- charge attacks ----
  // K alone: the buster gun. Mash K for a shot combo; hold it for a five-beam spread off the mantle's edge.
  C1: {
    dur: 0.36, chain: 0.12, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true,
    clip: clip([
      k(0, { ...PISTOL }),
      k(0.08, { ...PISTOL }, 'snap'),
      k(0.14, { torso: [-0.08, -0.42, 0.05], uArmR: [-1.55, 0, -0.15], hand: [1.65, 0, 0], y: -0.04 }, 'snap'),
      k(0.36, { ...PISTOL }),
    ]),
    shots: [{ t: 0.1, kind: 'buster' }],
  },
  C1R: {
    dur: 0.22, chain: 0.08, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true, maxRepeat: 14,
    clip: clip([
      k(0, { ...PISTOL }),
      k(0.04, { torso: [-0.06, -0.42, 0.05], uArmR: [-1.5, 0, -0.15], hand: [1.6, 0, 0], y: -0.04 }, 'snap'),
      k(0.22, { ...PISTOL }),
    ]),
    shots: [{ t: 0.02, kind: 'buster' }],
  },
  CS: { // charge shot: the mantle flares wide, five beams fan out from it at once
    dur: 1.1, chain: 0.9, rate: 1, next: null, charge: null, armor: true, mantleFlare: true,
    wpn: [[0, 'rifle']],
    clip: clip([
      k(0, { ...PISTOL, torso: [0.05, -0.15, 0], y: -0.18, ...LEGS_WIDE }),
      k(0.4, { ...PISTOL, torso: [0.05, -0.25, 0.1], y: -0.26 }),
      k(0.55, { torso: [-0.1, -0.3, 0.1], uArmR: [-1.65, 0, -0.1], hand: [1.7, 0, 0], y: -0.28 }, 'snap'),
      k(1.1, { ...PISTOL, torso: [0, -0.15, 0] }),
    ]),
    ev: [[0.02, 'flash', 'violet'], [0.22, 'flash', 'violet']],
    shots: [-0.16, -0.08, 0, 0.08, 0.16].map((ang) => ({ t: 0.56, kind: 'spread', ang })),
    chargeFx: [0.0, 0.5],
  },

  // J K: a rising zanber launcher, a full spin, then a heat-dagger plunge that slams down with a cross shockwave.
  C2: {
    dur: 1.55, chain: 1.3, saber: true, rate: 1, next: null, charge: null, armor: true, spin: true,
    lunge: [[0.02, 0], [0.16, 1.2]],
    air: [[0.18, 0], [0.5, 3.6], [0.78, 3.8], [1.06, 0]],
    jets: [0.18, 0.8, true],
    clip: clip([
      k(0, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.06, { torso: [0.4, -0.35, 0] }),
      k(0.18, { torso: [-0.35, 0.2, 0], uArmR: [-2.8, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.8], y: 0, ...LEGS_AIR }, 'snap'),
      k(0.46, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.78, { yaw: PI * 2, torso: [0.6, 0, 0], uArmR: [-2.3, 0, -0.1], fArmR: [0, 0, 0], hand: [1.5, 0, 0], y: -0.1, ...LEGS_KNEEL }),
      k(1.06, { yaw: PI * 2, torso: [0.75, 0, 0], y: -1.0, ...LEGS_KNEEL }, 'in'),
      k(1.55, { yaw: PI * 2, torso: [0.15, -0.2, 0], uArmR: [-0.5, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.5, 0, 0], y: -0.15, ...LEGS_WIDE }),
    ]),
    hits: [
      { t: 0.05, t1: 0.17, shape: 'arc', range: 5.0, arc: 140, dmg: 34, kb: 2, up: 12, big: true },
      { t: 0.22, t1: 0.44, shape: 'arc', range: 4.8, arc: 360, hy: 6.5, dmg: 15, kb: 1, up: 3 },
      { t: 1.06, t1: 1.14, shape: 'circle', range: 8.6, dmg: 52, kb: 6, up: 9, big: true },
    ],
    ev: [[0.2, 'flash', 'gold'], [1.06, 'shock']],
    sfxs: [[0.04, 'slash_rise'], [0.22, 'slash_spin'], [1.0, 'slash_down']],
  },

  // J J K: a rising cut, then the beam shield snapped up and spun in a shielding parry that flings a burst outward.
  C3: {
    dur: 1.65, chain: 1.4, rate: 1, next: null, charge: null, armor: true, invuln: true, spin: true,
    wpn: [[0, 'saber'], [0.4, 'shield']],
    lunge: [[0.02, 0], [0.14, 1.1]],
    clip: clip([
      k(0, { torso: [0.3, -0.3, 0], uArmR: [0.5, -0.3, -0.6], fArmR: [-0.3, 0, 0], hand: [0.3, 0, 0], y: -0.4, ...LEGS_LUNGE_R }),
      k(0.14, { torso: [-0.3, 0.2, 0], uArmR: [-2.6, 0, -0.4], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.1, ...LEGS_WIDE }, 'snap'),
      k(0.4, { ...GUARD, torso: [0, -0.1, 0], y: -0.2, yaw: 0, ...LEGS_WIDE }),
      k(1.35, { ...GUARD, torso: [0, -0.1, 0], y: -0.2, yaw: PI * 5 }, 'linear'),
      k(1.5, { ...GUARD, uArmL: [-0.8, 0, 1.4], y: -0.35, yaw: PI * 5 }, 'snap'),
      k(1.65, { torso: [0.05, -0.15, 0], uArmL: [-0.4, 0, 0.5], fArmL: [-0.8, 0, 0], y: -0.15, yaw: PI * 5 }),
    ]),
    hits: [
      { t: 0.06, t1: 0.16, shape: 'arc', range: 5.0, arc: 140, dmg: 28, kb: 2, up: 6 },
      ...every(0.45, 1.32, 0.16, { shape: 'circle', range: 4.2, dmg: 10, kb: 1.5, up: 0.5, pull: 0.6, stop: 1 }),
      { t: 1.42, t1: 1.52, shape: 'circle', range: 5.6, dmg: 32, kb: 10, up: 6, big: true },
    ],
    ev: [[0.0, 'flash', 'gold'], [0.4, 'flash', 'pink']],
    sfxs: [[0.04, 'slash_rise'], [0.4, 'draw'], ...times(0.45, 1.32, 0.32).map((t) => [t, 'slash_fast'])],
  },

  // J J J K: the screw whip's claw shoots out and hauls its catch back into a short zanber flurry.
  C4: {
    dur: 1.5, chain: 1.28, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'whip'], [0.5, 'saber']],
    wh: [[0, 0.5], [0.28, WHIP_R], [0.5, 1.5]],
    clip: clip([
      k(0, { torso: [0.1, -0.3, 0], uArmR: [-0.2, 0, -0.5], fArmR: [-0.8, 0, 0], hand: [1.5, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.12, { torso: [0.2, -0.35, 0], uArmR: [-0.5, 0, -1.1], fArmR: [-0.2, 0, 0], hand: [0.9, 0, 0] }),
      k(0.28, { torso: [0.05, -0.2, 0], uArmR: [-0.7, 0, -1.35] }, 'snap'),
      k(0.5, { torso: [-0.1, -0.1, 0], uArmR: [-1.4, 0, -0.6], fArmR: [-0.6, 0, 0], hand: [1.0, 0, 0], y: -0.15, ...LEGS_LUNGE_R }, 'snap'),
      k(0.66, { torso: [0.15, 0.7, 0], ...SWEEP_L, uArmL: [-0.3, 0, 0.9], y: -0.3, ...LEGS_LUNGE_L }, 'snap'),
      k(0.82, { torso: [0.5, -0.2, 0], uArmR: [0.2, -0.5, -1.15], fArmR: [0, 0, 0], hand: [1.3, 0, 0], y: -0.35, ...LEGS_LUNGE_R }),
      k(1.1, { torso: [0.55, -0.3, 0], uArmR: [0.35, -0.7, -1.1], y: -0.4 }),
      k(1.3, { torso: [0.2, -0.2, 0], uArmR: [0.05, -0.4, -0.9], y: -0.3, ...LEGS_WIDE }),
      k(1.5, { torso: [0.1, -0.2, 0], uArmR: [-0.3, 0, -0.35], y: -0.15 }),
    ]),
    hits: [
      { t: 0.16, t1: 0.34, shape: 'line', len: WHIP_R, width: 1.6, dmg: 20, kb: 0.5, up: 1, pull: 3.5, sp: false },
      { t: 0.52, t1: 0.64, shape: 'arc', range: 4.8, arc: 220, dmg: 22, kb: 3, up: 2 },
      { t: 0.74, t1: 0.86, shape: 'arc', range: 5.0, arc: 210, dmg: 26, kb: 4, up: 0 },
      { t: 1.26, t1: 1.36, shape: 'circle', range: 3.6, off: -1, dmg: 32, kb: 11, up: 6, big: true },
    ],
    ev: [[0.0, 'flash', 'gold'], [0.28, 'whipout']],
    sfxs: [[0.12, 'whip'], [0.52, 'slash_a'], [0.74, 'slash_fast'], [1.1, 'slash_dash']],
  },

  // J J J J K: launch skyward, chase up with a spinning flurry, and slam the target back down.
  C5: {
    dur: 1.85, chain: 1.68, saber: true, rate: 1, next: null, charge: null, armor: true, spin: true,
    air: [[0.42, 0], [0.7, 4.2], [1.1, 4.5], [1.46, 0]],
    jets: [0.42, 0.95, true],
    lunge: [[0.42, 0], [0.7, 1.5]],
    clip: clip([
      k(0, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.3], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.34, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.44, { yaw: PI * 2, torso: [0.4, -0.4, 0], uArmR: [0.6, -0.3, -0.5], fArmR: [-0.2, 0, 0], hand: [0.4, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.64, { yaw: PI * 2, torso: [-0.4, 0.3, 0], uArmR: [-2.9, 0.2, -0.3], fArmR: [-0.1, 0, 0], hand: [0.3, 0, 0], uArmL: [-0.3, 0, 0.9], y: 0, ...LEGS_AIR }, 'snap'),
      ...[0.78, 0.9, 1.02].map((t) => k(t, { yaw: PI * 2, torso: [t % 0.24 < 0.12 ? 0.5 : -0.4, 0, 0], uArmR: [-1.4, 0.4, -0.9] }, 'snap')),
      k(1.46, { yaw: PI * 2, torso: [0.3, 0, 0], uArmR: [-0.6, 0, -0.4], y: -0.45, ...LEGS_WIDE }),
      k(1.85, { yaw: PI * 2, torso: [0.1, -0.2, 0], y: -0.15 }),
    ]),
    hits: [
      { t: 0.1, t1: 0.34, shape: 'arc', range: 4.9, arc: 360, dmg: 15, kb: 1, up: 3 },
      { t: 0.48, t1: 0.64, shape: 'arc', range: 5.6, arc: 160, hy: 8, dmg: 30, kb: 1, up: 12, big: true },
      ...[0.78, 0.9, 1.02].map((t) => ({ t, t1: t + 0.08, shape: 'circle', range: 4.4, hy: 9, dmg: 14, kb: 0.5, up: 1, sp: false })),
      { t: 1.14, t1: 1.24, shape: 'circle', range: 5.2, hy: 8, dmg: 34, kb: 6, up: -6, big: true },
    ],
    ev: [[0.0, 'flash', 'gold'], [1.46, 'land']],
    sfxs: [[0.08, 'slash_spin'], [0.46, 'slash_rise'], [0.78, 'slash_fast'], [0.9, 'slash_fast'], [1.02, 'slash_fast']],
  },

  // J J J J J K: the screw whip spun out wide into a widening vortex that hauls everything nearby in, then a
  // thruster dash straight through for the finish.
  C6: {
    dur: 1.9, chain: 1.65, rate: 1, next: null, charge: null, armor: true, invuln: true, spin: true,
    wpn: [[0, 'whip'], [1.1, 'saber']],
    wh: [[0, 0.5], [0.9, WHIP_R], [1.1, 0.6]],
    lunge: [[1.1, 0], [1.4, 8]],
    jets: [1.06, 1.4, false],
    clip: clip([
      k(0, { torso: [0.1, -0.5, 0], uArmR: [-0.2, 0, -0.6], fArmR: [-0.7, 0, 0], hand: [1.4, 0, 0], y: -0.25, yaw: 0, ...LEGS_WIDE }),
      k(0.9, { torso: [0.1, -0.5, 0], uArmR: [-0.4, 0, -1.3], fArmR: [-0.2, 0, 0], hand: [0.9, 0, 0], yaw: PI * 2.2 }, 'linear'),
      k(1.1, { torso: [-0.1, -0.15, 0], uArmR: [-1.3, 0, -0.5], fArmR: [-0.5, 0, 0], hand: [1.1, 0, 0], y: -0.15, yaw: PI * 2.2, ...LEGS_LUNGE_R }, 'snap'),
      k(1.35, { torso: [0.4, -0.2, 0], uArmR: [0.1, -0.4, -1.1], fArmR: [0, 0, 0], hand: [1.3, 0, 0], y: -0.35, yaw: PI * 2.2, ...LEGS_LUNGE_R }),
      k(1.6, { torso: [0.2, -0.2, 0], uArmR: [-0.1, -0.2, -0.7], y: -0.25, yaw: PI * 2.2, ...LEGS_WIDE }),
      k(1.9, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.35], y: -0.15, yaw: PI * 2.2 }),
    ]),
    hits: [
      ...[0.15, 0.35, 0.55].map((t, i) => ({ t, t1: t + 0.14, shape: 'circle', range: 4.2 + i * 1.8, dmg: 10, kb: 0.4, up: 0.3, pull: 2.6, stop: 1 })),
      { t: 1.16, t1: 1.3, shape: 'circle', range: 3.6, off: -1, dmg: 30, kb: 1, up: 2 },
      { t: 1.42, t1: 1.52, shape: 'circle', range: 4.0, off: -1, dmg: 44, kb: 12, up: 8, big: true },
    ],
    ev: [[0.0, 'flash', 'violet'], [0.15, 'whipout']],
    sfxs: [[0.15, 'whip'], [1.1, 'slash_a'], [1.35, 'slash_dash']],
  },

  // ---- boost dash: paired zanber cuts (keep pressing J), a launching finisher, or the shield bash into a
  // point-blank buster blast ----
  DA: {
    dur: 0.34, chain: 0.2, saber: true, rate: 1, next: 'DA', charge: 'DC', armor: true, rush: true,
    slide: [0, 0.34, 7.2],
    jets: [0, 0.34, false],
    clip: clip([
      k(0, { torso: [0.35, -0.85, 0], ...SWEEP_R, uArmL: [-1.0, 0, 0.5], y: -0.32, ...LEGS_LUNGE_L }),
      k(0.09, { torso: [0.4, 0.85, 0], ...SWEEP_L, uArmL: [-0.2, 0, 0.9], y: -0.38, ...LEGS_LUNGE_R }, 'snap'),
      k(0.19, { torso: [0.3, 0.95, 0], uArmR: [-0.3, 1.85, -1.25], fArmR: [-0.3, 0, 0] }),
      k(0.29, { torso: [0.35, -0.9, 0], uArmR: [-0.4, -0.4, -1.25], fArmR: [-0.2, 0, 0], y: -0.32, ...LEGS_LUNGE_L }, 'snap'),
      k(0.34, { torso: [0.35, -0.85, 0] }),
    ]),
    hits: [
      { t: 0.03, t1: 0.11, shape: 'arc', range: 5.1, arc: 185, dmg: 13, kb: 1.5, up: 0, pull: 1, stop: 1 },
      { t: 0.2, t1: 0.29, shape: 'arc', range: 5.1, arc: 185, dmg: 13, kb: 1.5, up: 0, pull: 1, stop: 1 },
    ],
    sfxs: [[0.02, 'slash_fast'], [0.19, 'slash_fast']],
  },
  DAF: {
    dur: 0.68, chain: 0.46, saber: true, rate: 1, next: null, charge: null, armor: true,
    slide: [0, 0.18, 6],
    jets: [0, 0.18, false],
    clip: clip([
      k(0, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.15, { torso: [-0.35, 0.2, 0], uArmR: [-2.8, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.8], y: 0, ...LEGS_WIDE }, 'snap'),
      k(0.68, { torso: [0.1, 0, 0], uArmR: [-0.6, 0, -0.3] }),
    ]),
    hits: [{ t: 0.05, t1: 0.17, shape: 'arc', range: 5.4, arc: 195, dmg: 32, kb: 4, up: 11, big: true }],
    sfx: 'slash_rise', swing: 0.03,
  },
  DC: { // dash charge: the beam shield snaps up for a bash, then the buster gun fires point-blank
    dur: 1.2, chain: 1.0, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'shield'], [0.55, 'rifle']],
    lunge: [[0.5, 0], [0.7, -1.6]],
    jets: [0.5, 0.7, false],
    clip: clip([
      k(0, { ...GUARD, y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.18, { yaw: PI * 2, ...GUARD }, 'linear'),
      k(0.38, { yaw: PI * 2, ...GUARD, y: -0.35, ...LEGS_LUNGE_R }),
      k(0.5, { yaw: PI * 2, ...GUARD, y: -0.35 }),
      k(0.56, { yaw: PI * 2, ...PISTOL, torso: [-0.3, -0.3, 0.05], y: -0.25 }, 'snap'),
      k(1.2, { yaw: PI * 2, torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.9, 0, 0], hand: [0.9, 0, 0], y: -0.12 }),
    ]),
    hits: [{ t: 0.03, t1: 0.18, shape: 'arc', range: 4.6, arc: 360, dmg: 13, kb: 1, up: 1.5 }],
    ev: [[0.02, 'flash', 'pink'], [0.2, 'flash', 'pink']],
    shots: [{ t: 0.5, kind: 'blast' }],
    sfxs: [[0.03, 'slash_spin']],
  },

  // ---- aerial ----
  JA: {
    dur: 0.46, chain: 0.26, saber: true, next: null, charge: null, isAir: true,
    clip: clip([
      k(0, { torso: [-0.3, -0.2, 0], uArmR: [-2.8, 0, -0.2], hand: [0.3, 0, 0], thighR: [-1.0, 0, 0], shinR: [1.4, 0, 0], thighL: [-0.3, 0, 0], shinL: [1.0, 0, 0] }),
      k(0.16, { torso: [0.6, 0, 0], uArmR: [-0.9, 0, -0.1], hand: [0.7, 0, 0] }, 'snap'),
      k(0.46, { torso: [0.3, 0, 0] }),
    ]),
    hits: [{ t: 0.05, t1: 0.18, shape: 'arc', range: 5.0, arc: 150, dmg: 24, kb: 4, up: 4, hy: 5 }],
    sfx: 'slash_a', swing: 0.05,
  },
  JC: { // heat-dagger plunge: feet first, blades out
    dur: 0.7, chain: 0.56, next: null, charge: null, isAir: true, plunge: { hang: 0.32, land: 0.34 },
    clip: clip([
      k(0, { torso: [0.15, 0, 0], uArmR: [-0.3, 0, -0.5], fArmR: [-0.6, 0, 0], hand: [1.1, 0, 0], uArmL: [-0.3, 0, 0.5], fArmL: [-0.6, 0, 0], thighR: [-1.3, 0, -0.15], shinR: [1.8, 0, 0], thighL: [-1.3, 0, 0.15], shinL: [1.8, 0, 0] }),
      k(0.32, { torso: [0.25, 0, 0], thighR: [-1.5, 0, -0.15], shinR: [2.2, 0, 0], thighL: [-1.5, 0, 0.15], shinL: [2.2, 0, 0] }),
      k(0.4, { torso: [0.2, 0, 0], y: -0.6, ...LEGS_WIDE }),
      k(0.7, { torso: [0.1, 0, 0], y: -0.3 }),
    ]),
    hits: [{ t: 0, t1: 9, shape: 'circle', range: 5.6, dmg: 38, kb: 8, up: 7, big: true, onLand: true }],
    sfxs: [[0.02, 'slash_fast']],
  },

  // ---- SP attacks ----
  // Ground: a starburst, both blades out in a long standing flurry that pulls anyone close in, then a dashing
  // cross-slash finish. Hold SP through the starburst for the charge SP (the screw whip's vortex); in the air:
  // a thruster climb and a meteoric heat-dagger dive.
  SP_IN: {
    dur: 0.5, rate: 1, saber: true, armor: true, invuln: true, sp: true, spNext: 'SP_FL', spHold: 'SPC_CH',
    wpn: [[0, 'saber'], [0.22, 'cross']],
    clip: clip([
      k(0, { torso: [0, 0, 0], uArmR: [-0.2, 0, -0.3], hand: [0.2, 0, 0] }),
      k(0.2, { torso: [-0.2, 0.3, 0], uArmR: [-2.8, 0, -0.35], fArmR: [0, 0, 0], hand: [0, 0, 0], uArmL: [-0.2, 0, 0.9], head: [-0.2, 0, 0], y: -0.2, ...LEGS_WIDE }, 'snap'),
      k(0.5, { torso: [-0.24, 0.35, 0] }),
    ]),
    ev: [[0.03, 'burst']],
  },
  SP_FL: {
    dur: 2.8, rate: 1, armor: true, invuln: true, sp: true, loop: 0.28, rushFx: true, steer: 2.2, spin: true, spNext: 'SP_CROSS',
    wpn: [[0, 'cross']],
    clip: clip([
      k(0, { torso: [0.15, -0.85, 0], ...SWEEP_R, ...CROSS_L, y: -0.3, ...LEGS_WIDE }),
      k(0.07, { torso: [0.15, 0.85, 0], ...SWEEP_L, ...CROSS_R, y: -0.34 }, 'snap'),
      k(0.14, { torso: [-0.2, 0.5, 0], uArmR: [-2.5, 0.5, -0.4], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.2 }, 'snap'),
      k(0.21, { torso: [0.4, -0.4, 0], uArmR: [-0.8, -0.2, -0.3], fArmR: [-0.1, 0, 0], hand: [0.9, 0, 0], y: -0.4 }, 'snap'),
      k(0.28, { torso: [0.15, -0.85, 0], ...SWEEP_R, y: -0.3 }),
    ]),
    hits: [
      ...every(0.05, 2.7, 0.07, { shape: 'arc', range: 5.0, arc: 250, dmg: 8, kb: 0.5, up: 0.4, pull: 1.3, sp: true }),
      { t: 2.7, t1: 2.78, shape: 'arc', range: 5.2, arc: 260, dmg: 15, kb: 3, up: 2, sp: true },
    ],
    sfxs: [0.02, 0.09, 0.16, 0.23].flatMap((o) => times(0, 2.7, 0.28).map((t) => [t + o, 'slash_fast'])),
  },
  SP_CROSS: {
    dur: 1.15, rate: 1, armor: true, invuln: true, sp: true,
    wpn: [[0, 'cross']],
    lunge: [[0, 0], [0.14, 6.5]],
    clip: clip([
      k(0, { torso: [0.3, -0.2, 0], uArmR: [-0.3, -0.3, -0.6], fArmR: [-0.4, 0, 0], hand: [0.9, 0, 0], uArmL: [-0.3, 0.3, 0.6], fArmL: [-0.4, 0, 0], y: -0.35, ...LEGS_WIDE }),
      k(0.12, { torso: [-0.1, 0, 0], ...CROSS_R, ...CROSS_L, y: -0.1, ...LEGS_LUNGE_R }, 'snap'),
      k(0.45, { torso: [0.55, 0, 0], uArmR: [0.1, -0.3, -0.9], uArmL: [0.1, 0.3, 0.9], y: -0.15 }),
      k(0.7, { torso: [-0.3, 0, 0], head: [0.4, 0, 0], y: 0.05 }, 'snap'),
      k(1.15, { torso: [0.06, 0, 0], uArmR: [-0.4, 0, -0.35], y: -0.15 }),
    ]),
    hits: [
      { t: 0.06, t1: 0.16, shape: 'line', len: 7.0, width: 3.0, dmg: 34, kb: 1, up: 3, sp: true },
      { t: 0.66, t1: 0.74, shape: 'circle', range: 7.2, dmg: 140, kb: 12, up: 12, big: true, sp: true },
    ],
    ev: [[0.1, 'flash', 'pink'], [0.68, 'crossburst']],
    sfxs: [[0.05, 'slash_dash'], [0.5, 'slash_spin']],
  },
  SPA_IN: {
    dur: 0.5, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spNext: 'SPA_DIVE',
    wpn: [[0, 'saber']],
    jets: [0, 0.5, true],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -0.5], uArmL: [-0.5, 0, 0.5], ...LEGS_AIR }),
      k(0.3, { torso: [-0.3, 0, 0], uArmR: [-2.5, 0, -0.3], uArmL: [-2.5, 0, 0.3], y: 0.1, ...LEGS_AIR }),
      k(0.5, { torso: [-0.35, 0, 0], y: 0.15, ...LEGS_AIR }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SPA_DIVE: { // heat daggers out, a meteoric plunge that opens a crater
    dur: 0.9, rate: 1, armor: true, invuln: true, sp: true, isAir: true, dive: 1.6,
    lunge: [[0, 0], [0.4, 3]],
    clip: clip([
      k(0, { torso: [-0.35, 0, 0], uArmR: [-2.5, 0, -0.3], uArmL: [-2.5, 0, 0.3], y: 0.15 }),
      k(0.35, { torso: [0.7, 0, 0], uArmR: [-0.4, 0, -0.15], uArmL: [-0.4, 0, 0.15], thighR: [-1.2, 0, -0.1], shinR: [1.7, 0, 0], thighL: [-1.2, 0, 0.1], shinL: [1.7, 0, 0] }),
      k(0.45, { torso: [0.55, 0, 0], y: -0.5, ...LEGS_WIDE }, 'snap'),
      k(0.9, { torso: [0.15, -0.2, 0], y: -0.15 }),
    ]),
    hits: [{ t: 0.44, t1: 0.54, shape: 'circle', range: 8.5, dmg: 130, kb: 14, up: 10, big: true, sp: true }],
    ev: [[0.02, 'charge'], [0.44, 'meteor']],
    sfxs: [[0.34, 'qb']],
  },
  SPC_CH: {
    dur: 1.05, rate: 1, armor: true, invuln: true, sp: true, chargeAura: true, spNext: 'SPC_WHIRL',
    wpn: [[0, 'whip']],
    clip: clip([
      k(0, { torso: [-0.2, 0.3, 0], uArmR: [-0.2, 0, -0.6], fArmR: [-0.7, 0, 0], hand: [1.3, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.35, { torso: [0.4, 0, 0], uArmR: [-0.2, 0, -0.9], fArmR: [-0.7, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.2, 0, 0.9], fArmL: [-0.7, 0, 0], head: [-0.2, 0, 0], y: -0.55, ...LEGS_WIDE }),
      k(1.05, { torso: [0.45, 0, 0], y: -0.6 }),
    ]),
    ev: [[0.02, 'charge'], [1.0, 'burst']],
  },
  SPC_WHIRL: { // the screw whip spins out into a slowly widening, pulling vortex
    dur: 4.2, rate: 1, armor: true, invuln: true, sp: true, rushFx: true, steer: 3, spin: true, spNext: 'SPC_END',
    wpn: [[0, 'whip']],
    wh: [[0, 0.6], [0.3, WHIP_R * 0.55], [4.2, WHIP_R]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -1.3], fArmR: [-0.1, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.8, 0, 0.6], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.3, { yaw: -PI * 0.5 }, 'in'),
      k(4.2, { yaw: -PI * 13.5 }, 'linear'),
    ]),
    hits: every(0.2, 4.15, 0.18, { shape: 'circle', range: 5.5, dmg: 11, kb: 4, up: 2.5, pull: 2.2, sp: true }),
    sfxs: times(0.2, 4.15, 0.36).map((t) => [t, 'whip']),
  },
  SPC_END: {
    dur: 0.95, rate: 1, armor: true, invuln: true, sp: true,
    wpn: [[0, 'whip'], [0.72, null]],
    wh: [[0, WHIP_R], [0.2, WHIP_R], [0.7, 0.5]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -1.3], hand: [1.2, 0, 0], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.24, { torso: [-0.3, 0.3, 0], uArmR: [-2.5, 0, -0.6], yaw: -PI * 1.1, y: -0.1 }, 'out'),
      k(0.7, { torso: [0.1, -0.2, 0], uArmR: [-0.9, 0, -0.4], fArmR: [-0.6, 0, 0], yaw: -PI * 1.1, y: -0.2 }),
      k(0.95, { yaw: -PI * 1.1 }),
    ]),
    hits: [{ t: 0.16, t1: 0.28, shape: 'circle', range: 6.2, dmg: 56, kb: 12, up: 12, big: true, sp: true }],
    sfxs: [[0.08, 'whip']],
  },
};

for (const m of Object.values(MOVES)) for (const key of ['ev', 'sfxs']) m[key]?.sort((a, b) => a[0] - b[0]);
