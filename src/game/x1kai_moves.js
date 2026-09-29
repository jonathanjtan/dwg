// Crossbone Gundam X1 Kai moveset, after Dynasty Warriors: Gundam Reborn's "ALL MOVES" video (space pirate colours,
// the X-shaped main thrusters, the ABC mantle), checked beat by beat against it (the Koei wiki has no entry: the suit
// is Reborn DLC). Ported 1:1 where the video shows it: Basic Combo -> N1-N6, Shot Combo -> C1/C1R (fired from under the
// mantle), Charge Shot -> CS (the mantle comes off and the buster pours one sustained beam; the "five beams" in the
// footage are the X-thrusters' exhaust), Charge 2-6, Dash Combo -> DA/DAF, Dash Charge -> DC (a long spinning thruster
// rush, then a point-blank blast), Musou -> SP_*, Air Musou -> SPA_* (hovering in the mantle, a pink energy orb swells
// round the suit and detonates), Charge Musou -> SPC_* (the screw whip spun out into a pulling vortex, ~2.1 s a
// stock). The suit sheds the mantle for its attacks and is back in it half a second after (x1kai.js). The video skips
// jump attacks, so JA/JC are invented in the spirit of the kit: a quick zanber cut and a heat-dagger plunge.
// Reach measured off the footage in X1 Kai heights (H ~ 3.0 units, the suit runs ~0.88x the Gundam): the zanber blade
// is ~1.5H, the screw whip's lash reaches out to ~2.8H and hauls its catch most of the way back, the charge-6 vortex
// opens to ~3H before it collapses in, and the SPA orb detonates ~3H across.
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
// ev: [t, name, arg]; shots: { t, kind, last } (buster | stream | blast); wpn: [t, weapon] (saber: zanber blade | rifle:
// buster gun | cross: zanber + off-hand beam saber both out | whip: screw whip | shield: beam shield | null: empty
// hands); jets, slide, lunge, air as in moves.js; wh: screw whip extension curve (0..WHIP_R); spin: true marks the
// X-thrusters spinning up; mantle: true keeps the ABC mantle on through the move.
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
  // K alone: the buster gun, from under the mantle. Mash K for a shot combo (about six in the footage); hold it for the
  // charge shot.
  C1: {
    dur: 0.36, chain: 0.12, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true, mantle: true,
    clip: clip([
      k(0, { ...PISTOL }),
      k(0.08, { ...PISTOL }, 'snap'),
      k(0.14, { uArmR: [-1.55, 0, -0.15], hand: [1.65, 0, 0] }, 'snap'),
      k(0.36, { ...PISTOL }),
    ]),
    shots: [{ t: 0.1, kind: 'buster' }],
  },
  C1R: {
    dur: 0.22, chain: 0.08, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true, mantle: true, maxRepeat: 6,
    clip: clip([
      k(0, { ...PISTOL }),
      k(0.04, { uArmR: [-1.5, 0, -0.15], hand: [1.6, 0, 0] }, 'snap'),
      k(0.22, { ...PISTOL }),
    ]),
    shots: [{ t: 0.02, kind: 'buster' }],
  },
  // Charge shot: the mantle comes off, the X-thrusters hop the suit back (~0.4 H) to land braced side-on, and the buster
  // pours one sustained beam into the target with the thrusters blazing behind it.
  CS: {
    dur: 1.4, chain: 1.2, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'rifle']],
    jets: [0.28, 1.2, false],
    air: [[0.28, 0], [0.4, 0.7], [0.54, 0]],
    clip: clip([
      k(0, { ...PISTOL, torso: [0.05, -0.15, 0], y: -0.18, ...LEGS_WIDE }),
      k(0.3, { ...PISTOL, torso: [-0.1, -0.5, 0.1], y: 0, ...LEGS_AIR }),
      k(0.54, { ...PISTOL, torso: [0.05, -0.9, 0.05], uArmR: [-1.6, 0, -0.1], hand: [1.6, 0, 0], y: -0.3, ...LEGS_WIDE }, 'in'),
      k(1.18, { torso: [0.05, -0.9, 0.05], y: -0.3 }),
      k(1.4, { ...PISTOL, torso: [0, -0.15, 0] }),
    ]),
    ev: [[0.02, 'flash', 'violet'], [0.22, 'flash', 'violet'], [0.28, 'hopback']],
    shots: times(0.56, 1.16, 0.05).map((t, i, a) => ({ t, kind: 'stream', first: i === 0, last: i === a.length - 1 })),
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

  // J J K: a rising cut, then the beam shield ground into the target for a long grind (~2.5 s in the footage), a
  // launching slash, and a back-flip away.
  C3: {
    dur: 3.35, chain: 3.1, rate: 1, next: null, charge: null, armor: true, invuln: true, spin: true,
    wpn: [[0, 'saber'], [0.4, 'shield'], [2.6, 'saber']],
    lunge: [[0.02, 0], [0.14, 1.1], [2.62, 1.1], [2.74, 1.8], [2.95, 1.8], [3.25, -0.4]],
    air: [[2.9, 0], [3.06, 1.3], [3.3, 0]],
    clip: clip([
      k(0, { torso: [0.3, -0.3, 0], uArmR: [0.5, -0.3, -0.6], fArmR: [-0.3, 0, 0], hand: [0.3, 0, 0], y: -0.4, ...LEGS_LUNGE_R }),
      k(0.14, { torso: [-0.3, 0.2, 0], uArmR: [-2.6, 0, -0.4], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.1, ...LEGS_WIDE }, 'snap'),
      k(0.4, { ...GUARD, uArmL: [-1.5, 0, 0.2], fArmL: [-0.1, 0, 0], torso: [0.25, 0.3, 0], y: -0.3, ...LEGS_LUNGE_L }),
      ...times(0.52, 2.5, 0.14).map((t, i) => k(t, { torso: [0.25, i % 2 ? 0.2 : 0.4, 0], uArmL: [-1.5, i % 2 ? -0.1 : 0.1, 0.2] }, 'snap')),
      k(2.6, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], uArmL: [-0.4, 0, 0.5], y: -0.45, ...LEGS_LUNGE_R }),
      k(2.7, { torso: [-0.35, 0.2, 0], uArmR: [-2.8, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.05, ...LEGS_WIDE }, 'snap'),
      k(2.92, { torso: [-0.2, 0, 0], y: 0, pitch: 0, ...LEGS_AIR }),
      k(3.2, { torso: [0.3, 0, 0], pitch: -PI * 2, y: -0.3, ...LEGS_KNEEL }),
      k(3.35, { torso: [0.1, -0.15, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.7, 0, 0], y: -0.15, pitch: -PI * 2, ...LEGS_WIDE }),
    ]),
    hits: [
      { t: 0.06, t1: 0.16, shape: 'arc', range: 5.0, arc: 140, dmg: 28, kb: 2, up: 0 },
      ...every(0.45, 2.55, 0.14, { shape: 'line', len: 4.2, width: 3.2, dmg: 7, kb: 0.3, up: 0, pull: 1.3, stop: 1 }),
      { t: 2.68, t1: 2.8, shape: 'arc', range: 5.2, arc: 170, dmg: 32, kb: 1, up: 12, big: true },
    ],
    ev: [[0.0, 'flash', 'gold'], [0.4, 'flash', 'pink'], ...times(0.5, 2.5, 0.28).map((t) => [t, 'grind'])],
    sfxs: [[0.04, 'slash_rise'], [0.4, 'draw'], ...times(0.45, 2.55, 0.28).map((t) => [t, 'slash_fast']), [2.66, 'slash_rise']],
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
  // Dash charge: a long spinning X-thruster rush of hits (~2 s), a slash, then the buster gun fired point-blank.
  DC: {
    dur: 3.1, chain: 2.9, rate: 1, next: null, charge: null, armor: true, spin: true,
    wpn: [[0, 'saber'], [2.3, 'rifle']],
    lunge: [[0, 0], [1.9, 3.5]],
    jets: [0, 1.95, false],
    clip: clip([
      k(0, { torso: [0.2, -0.2, 0], uArmR: [0, 0, -1.3], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], uArmL: [0, 0, 1.3], fArmL: [-0.2, 0, 0], y: -0.25, yaw: 0, ...LEGS_WIDE }),
      k(1.9, { yaw: PI * 10, torso: [0.25, 0.2, 0] }, 'linear'),
      k(2.02, { yaw: PI * 10, torso: [0.12, 0.8, 0], ...SWEEP_L, y: -0.3, ...LEGS_LUNGE_L }),
      k(2.12, { yaw: PI * 10, torso: [0.15, -0.9, 0], ...SWEEP_R, y: -0.35, ...LEGS_LUNGE_R }, 'snap'),
      k(2.4, { yaw: PI * 10, ...PISTOL, torso: [0.1, -0.4, 0.05], y: -0.3 }),
      k(2.52, { yaw: PI * 10, uArmR: [-1.6, 0, -0.1], hand: [1.6, 0, 0] }, 'snap'),
      k(3.1, { yaw: PI * 10, torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.9, 0, 0], hand: [0.9, 0, 0], y: -0.12 }),
    ]),
    hits: [
      ...every(0.05, 1.9, 0.12, { shape: 'circle', range: 4.6, dmg: 7, kb: 0.6, up: 0, pull: 1.3, stop: 1 }),
      { t: 2.06, t1: 2.16, shape: 'arc', range: 5.2, arc: 190, dmg: 22, kb: 2, up: 3 },
    ],
    ev: [[0.02, 'flash', 'pink'], [1.95, 'flash', 'pink']],
    shots: [{ t: 2.5, kind: 'blast' }],
    sfxs: [...times(0.05, 1.9, 0.3).map((t) => [t, 'slash_spin']), [2.04, 'slash_a']],
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
  // Ground: a starburst, both blades out in a long flurry that pulls anyone close in, then a dashing cross-slash
  // finish. Hold SP through the starburst for the charge SP (the screw whip's vortex, ~2.1 s a stock); in the air:
  // a thruster climb, then a pink energy orb swells round the hovering suit and detonates.
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
    dur: 0.5, rate: 1, armor: true, invuln: true, sp: true, isAir: true, mantle: true, spNext: 'SPA_ORB',
    wpn: [[0, null]],
    jets: [0, 0.5, true],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -0.5], uArmL: [-0.5, 0, 0.5], ...LEGS_AIR }),
      k(0.3, { torso: [-0.2, 0, 0], uArmR: [-0.4, 0, -1.0], fArmR: [-0.4, 0, 0], uArmL: [-0.4, 0, 1.0], fArmL: [-0.4, 0, 0], ...LEGS_AIR }),
      k(0.5, { torso: [-0.1, 0, 0], ...LEGS_AIR }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SPA_ORB: { // hovering in the mantle, a pink energy orb swells round the suit, detonates, and leaves a pink pillar
    dur: 3.0, rate: 1, armor: true, invuln: true, sp: true, isAir: true, mantle: true, spin: true,
    wpn: [[0, null]],
    jets: [0, 2.2, true],
    clip: clip([
      k(0, { torso: [-0.1, 0, 0], uArmR: [-0.4, 0, -1.0], fArmR: [-0.4, 0, 0], uArmL: [-0.4, 0, 1.0], fArmL: [-0.4, 0, 0], head: [0, 0, 0], ...LEGS_AIR }),
      k(1.3, { torso: [0.35, 0, 0], uArmR: [-0.9, 0, -0.5], fArmR: [-1.2, 0, 0], uArmL: [-0.9, 0, 0.5], fArmL: [-1.2, 0, 0], head: [0.2, 0, 0] }),
      k(1.45, { torso: [-0.35, 0, 0], uArmR: [-0.3, 0, -2.3], fArmR: [0, 0, 0], uArmL: [-0.3, 0, 2.3], fArmL: [0, 0, 0], head: [-0.3, 0, 0] }, 'snap'),
      k(2.3, { torso: [-0.15, 0, 0], uArmR: [-0.4, 0, -1.5], uArmL: [-0.4, 0, 1.5], head: [-0.1, 0, 0] }),
      k(3.0, { torso: [0.1, 0, 0], uArmR: [-0.4, 0, -0.5], fArmR: [-0.4, 0, 0], uArmL: [-0.4, 0, 0.5], fArmL: [-0.4, 0, 0] }),
    ]),
    ev: [[0.02, 'charge'], ...[0.05, 0.4, 0.75, 1.1].map((t, i) => [t, 'orbgrow', i]), [1.45, 'orbburst'], [2.0, 'pillar']],
    sfxs: [[1.4, 'qb']],
  },
  SPC_CH: {
    dur: 1.05, rate: 1, armor: true, invuln: true, sp: true, chargeAura: true, spNext: 'SPC_WHIRL',
    wpn: [[0, 'whip']],
    wh: [[0, 0], [0.8, 0], [1.05, WHIP_R * 0.8]],
    clip: clip([
      k(0, { torso: [-0.2, 0.3, 0], uArmR: [-0.2, 0, -0.6], fArmR: [-0.7, 0, 0], hand: [1.3, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.35, { torso: [0.4, 0, 0], uArmR: [-0.2, 0, -0.9], fArmR: [-0.7, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.2, 0, 0.9], fArmL: [-0.7, 0, 0], head: [-0.2, 0, 0], y: -0.55, ...LEGS_WIDE }),
      k(1.05, { torso: [0.45, 0, 0], y: -0.6 }),
    ]),
    ev: [[0.02, 'charge'], [1.0, 'burst']],
  },
  SPC_WHIRL: { // the screw whip spun out into a pulling vortex: ~2.1 s a stock in the footage, played in passes
    dur: 2.1, rate: 1, armor: true, invuln: true, sp: true, rushFx: true, steer: 3, spin: true, spNext: 'SPC_END',
    stockDur: [2.1, 4.2, 6.3],
    wpn: [[0, 'whip']],
    wh: [[0, WHIP_R * 0.8], [1.05, WHIP_R], [2.1, WHIP_R * 0.8]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -1.3], fArmR: [-0.1, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.8, 0, 0.6], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(2.1, { yaw: -PI * 6 }, 'linear'),
    ]),
    hits: every(0.1, 2.05, 0.15, { shape: 'circle', range: 5.5, dmg: 18, kb: 4, up: 2.5, pull: 2.2, sp: true }),
    sfxs: times(0.1, 2.05, 0.36).map((t) => [t, 'whip']),
  },
  SPC_END: {
    dur: 0.95, rate: 1, armor: true, invuln: true, sp: true,
    stockPower: [1, 1.3, 1.6],
    wpn: [[0, 'whip'], [0.72, null]],
    wh: [[0, WHIP_R], [0.2, WHIP_R], [0.7, 0.5]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -1.3], hand: [1.2, 0, 0], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.24, { torso: [-0.3, 0.3, 0], uArmR: [-2.5, 0, -0.6], yaw: -PI * 1.1, y: -0.1 }, 'out'),
      k(0.7, { torso: [0.1, -0.2, 0], uArmR: [-0.9, 0, -0.4], fArmR: [-0.6, 0, 0], yaw: -PI * 1.1, y: -0.2 }),
      k(0.95, { yaw: -PI * 1.1 }),
    ]),
    hits: [{ t: 0.16, t1: 0.28, shape: 'circle', range: 6.2, dmg: 90, kb: 12, up: 12, big: true, sp: true }],
    sfxs: [[0.08, 'whip']],
  },
};

for (const m of Object.values(MOVES)) for (const key of ['ev', 'sfxs']) m[key]?.sort((a, b) => a[0] - b[0]);
