// Sazabi moveset, after Dynasty Warriors: Gundam Reborn's "ALL MOVES" video. Ported from the footage: Basic Combo ->
// N1-N6 (beam tomahawk cuts ending in a rising launcher), Shot Combo -> C1/C1R (the beam shot rifle, heavy and
// slow), Charge Shot -> CS (a boosting stab that launches, then the funnels converge on the catch), Charge 2 -> C2 (a
// tomahawk spin, then the abdominal mega particle cannon point-blank), Charge 3 -> C3 (cuts into a launcher, funnels
// surround the target and fire in a starburst), Charge 4 -> C4 (a thruster spin sweep), Charge 5 -> C5 (a rising
// thruster flurry), Charge 6 -> C6 (cuts and a spin, then the funnels ring the suit and fire in every direction),
// Dash Combo -> DA/DAF (the dash string ends in a full-body slam that skids along the ground, as in the video), Dash
// Charge -> DC (spin cuts into a rising uppercut and a funnel volley at the catch), Musou -> SP_* (the funnels spread
// out wide and rain beams on the field, then the mega particle cannon), Air Musou -> SPA_* (hovering, the shot rifle
// hammers the ground, then one green-white burst on the target), Charge Musou -> SPC_* (a tomahawk-and-funnel frenzy
// finished by the tomahawk's beam stretched out into a giant axe for one sweeping cut). The video skips jump attacks:
// JA is a tomahawk chop and JC a missile volley at the ground, the Sazabi's missiles being on its spec sheet.
// Reach measured off the footage in Sazabi heights (H ~ 3.9 units, a 25m suit): tomahawk cuts land ~1.4H out, the
// spin sweeps ~1.5H, the funnels ring a target at ~1H and the suit at ~1.2H, the SP rain covers ~2.6H around, and the
// charge SP's giant axe reaches ~3.3H.
import { Clip, poseFrom } from '../core/rig.js';

const PI = Math.PI;
export const BLADE = 4.8; // beam tomahawk blade length (units); `bl` scales it

// Ready stance: tomahawk low in the right hand, shield arm across the body, a heavy wide footing.
export const STANCE = poseFrom({
  y: -0.1,
  hips: [0, 0, 0],
  torso: [0.1, -0.2, 0],
  head: [-0.05, 0.2, 0],
  uArmR: [-0.25, 0, -0.35], fArmR: [-0.7, 0, 0], hand: [0.3, 0, 0],
  uArmL: [-0.45, 0, 0.3], fArmL: [-1.0, 0, 0], handL: [0, 0.15, 0],
  thighR: [-0.25, 0, -0.16], shinR: [0.4, 0, 0],
  thighL: [-0.05, 0, 0.16], shinL: [0.3, 0, 0],
});

const k = (t, p, e) => ({ t, p, e });
const clip = (keys) => new Clip(keys, STANCE);
const times = (t0, t1, step) => {
  const out = [];
  for (let t = t0; t < t1 - 1e-6; t += step) out.push(t);
  return out;
};
const every = (t0, t1, step, spec) => times(t0, t1, step).map((t) => ({ t, t1: t + step * 0.8, ...spec }));

const LEGS_LUNGE_R = { thighR: [-0.9, 0, -0.12], shinR: [0.9, 0, 0], thighL: [0.45, 0, 0.12], shinL: [0.35, 0, 0] };
const LEGS_LUNGE_L = { thighL: [-0.9, 0, 0.12], shinL: [0.9, 0, 0], thighR: [0.45, 0, -0.12], shinR: [0.35, 0, 0] };
const LEGS_WIDE = { thighR: [-0.2, 0, -0.45], shinR: [0.6, 0, 0], thighL: [-0.2, 0, 0.45], shinL: [0.6, 0, 0] };
const LEGS_AIR = { thighR: [-1.0, 0, -0.12], shinR: [1.5, 0, 0], thighL: [-0.3, 0, 0.12], shinL: [0.8, 0, 0] };
const LEGS_FLAT = { thighR: [0.2, 0, -0.1], shinR: [0.2, 0, 0], thighL: [0.2, 0, 0.1], shinL: [0.2, 0, 0] };
// Sweeps: the tomahawk arm out to the side and level, so the beam doesn't plough the ground.
const SWEEP_R = { uArmR: [0, -0.2, -1.5], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0] };
const SWEEP_L = { uArmR: [0, 1.85, -1.5], fArmR: [-0.15, 0, 0], hand: [1.2, 0, 0] };
const HIGH = { uArmR: [-2.8, 0, -0.3], fArmR: [-0.2, 0, 0], hand: [0.3, 0, 0] };
const RIFLE = { torso: [0, -0.45, 0.05], uArmR: [-1.35, 0, -0.15], fArmR: [-0.3, 0, 0], hand: [1.5, 0, 0], uArmL: [-0.7, 0, 0.3], fArmL: [-1.1, 0, 0], head: [0, -0.35, 0] };
// Shield held out front, the other arm free: the stance the funnel moves command from.
const COMMAND = { torso: [-0.1, -0.1, 0], head: [-0.2, 0, 0], uArmR: [-0.3, 0, -0.9], fArmR: [-0.3, 0, 0], hand: [0.6, 0, 0], uArmL: [-1.2, 0, 0.4], fArmL: [-0.6, 0, 0] };
const funnels = (t0, step, mode, n = 6, i0 = 0) => Array.from({ length: n }, (_, j) => ({ t: t0 + j * step, kind: 'funnel', i: (i0 + j) % 6, mode }));

// hit: { t, t1, shape, range, arc, len, width, off, hy, dmg, kb, up, pull, big, sp, stop }
// ev: [t, name, arg]: 'funnels' deploys the six funnels ('tgt' around the target, 'ring' round the suit, 'field' wide
// over the field), 'recall' brings them home, 'mega' fires the abdominal mega particle cannon point-blank, 'megabeam'
// the SP's full-length beam, 'burstgreen' the air SP's finishing burst, 'bigaxe' the charge SP's giant cut.
// shots: { t, kind: 'srifle' | 'funnel' | 'down' | 'missile', i (funnel), mode ('tgt' | 'out' | 'rain'), ang }
// wpn: [t, weapon] (saber: beam tomahawk lit | rifle: beam shot rifle | null); bl: blade length multiplier curve.
export const MOVES = {
  // ---- normal string: five tomahawk cuts, then a rising thruster slash that launches ----
  N1: {
    dur: 0.48, chain: 0.3, next: 'N2', charge: 'C2', saber: true,
    lunge: [[0.03, 0], [0.16, 1.5]],
    clip: clip([
      k(0, { torso: [0.2, 0.75, 0], uArmR: [0, 1.85, -1.2], fArmR: [-0.2, 0, 0], hand: [1.3, 0, 0], y: -0.28, ...LEGS_LUNGE_L }),
      k(0.07, { torso: [0.24, 0.85, 0] }),
      k(0.18, { torso: [-0.2, -0.7, 0], uArmR: [-2.2, -0.3, -0.8], fArmR: [-0.1, 0, 0], hand: [0.5, 0, 0], y: -0.16, ...LEGS_LUNGE_R }, 'snap'),
      k(0.48, { torso: [-0.1, -0.5, 0], uArmR: [-1.9, -0.2, -0.65], y: -0.18 }),
    ]),
    hits: [{ t: 0.08, t1: 0.19, shape: 'arc', range: 5.3, arc: 165, dmg: 25, kb: 4, up: 1.5 }],
    sfx: 'slash_b', swing: 0.07,
  },
  N2: {
    dur: 0.46, chain: 0.3, next: 'N3', charge: 'C3', saber: true,
    lunge: [[0.03, 0], [0.16, 1.4]],
    clip: clip([
      k(0, { torso: [0.1, -0.95, 0], ...SWEEP_R, hand: [1.1, 0, 0], y: -0.14, ...LEGS_WIDE }),
      k(0.07, { torso: [0.12, -1.05, 0], uArmR: [0, -0.3, -1.35] }),
      k(0.17, { torso: [0.14, 0.9, 0], ...SWEEP_L, y: -0.28, ...LEGS_LUNGE_R }, 'snap'),
      k(0.46, { torso: [0.1, 0.45, 0], uArmR: [-0.3, 1.15, -0.95], hand: [0.8, 0, 0], y: -0.2 }),
    ]),
    hits: [{ t: 0.07, t1: 0.18, shape: 'arc', range: 5.5, arc: 190, dmg: 25, kb: 4.5, up: 0 }],
    sfx: 'slash_a', swing: 0.07,
  },
  N3: { // overhead chop, the weight of the whole suit behind it
    dur: 0.54, chain: 0.32, next: 'N4', charge: 'C4', saber: true,
    lunge: [[0.05, 0], [0.2, 1.7]],
    clip: clip([
      k(0, { torso: [-0.25, -0.18, 0], uArmR: [-2.9, 0, -0.25], fArmR: [-0.3, 0, 0], hand: [0.3, 0, 0], y: -0.04, head: [0.08, 0, 0] }),
      k(0.09, { torso: [-0.34, -0.22, 0], uArmR: [-3.05, 0, -0.2] }),
      k(0.21, { torso: [0.55, 0.1, 0], uArmR: [-0.9, 0, -0.1], fArmR: [-0.1, 0, 0], hand: [0.75, 0, 0], y: -0.45, head: [-0.28, 0, 0], ...LEGS_LUNGE_R }, 'snap'),
      k(0.54, { torso: [0.34, 0, 0], uArmR: [-0.8, 0, -0.2], y: -0.3 }),
    ]),
    hits: [{ t: 0.12, t1: 0.23, shape: 'arc', range: 5.7, arc: 105, dmg: 33, kb: 6, up: 0 }],
    ev: [[0.22, 'chop']],
    sfx: 'slash_h', swing: 0.1,
  },
  N4: {
    dur: 0.48, chain: 0.3, next: 'N5', charge: 'C5', saber: true,
    lunge: [[0.03, 0], [0.17, 1.4]],
    clip: clip([
      k(0, { torso: [0.1, 0.8, 0], ...SWEEP_L, uArmR: [-0.3, 1.85, -1.25], fArmR: [-0.3, 0, 0], y: -0.22, ...LEGS_LUNGE_R }),
      k(0.06, { torso: [0.12, 0.9, 0] }),
      k(0.17, { torso: [0.0, -1.0, 0.1], uArmR: [-0.3, -0.5, -1.25], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], y: -0.28, ...LEGS_LUNGE_L }, 'snap'),
      k(0.48, { torso: [0.05, -0.55, 0.05], uArmR: [-0.5, 0, -0.85], hand: [0.8, 0, 0] }),
    ]),
    hits: [{ t: 0.07, t1: 0.18, shape: 'arc', range: 5.5, arc: 200, dmg: 27, kb: 5, up: 0 }],
    sfx: 'slash_b', swing: 0.07,
  },
  N5: {
    dur: 0.54, chain: 0.34, next: 'N6', charge: 'C6', saber: true,
    lunge: [[0.04, 0], [0.19, 1.8]],
    clip: clip([
      k(0, { torso: [0.28, -0.85, 0], uArmR: [0.5, -0.4, -0.7], fArmR: [-0.2, 0, 0], hand: [1.3, 0, 0], y: -0.32, ...LEGS_LUNGE_R }),
      k(0.08, { torso: [0.32, -0.95, 0] }),
      k(0.21, { torso: [-0.28, 0.75, 0], uArmR: [-2.5, 0.6, -0.55], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.14, ...LEGS_LUNGE_L }, 'snap'),
      k(0.54, { torso: [-0.14, 0.5, 0], uArmR: [-2.2, 0.4, -0.45], y: -0.18 }),
    ]),
    hits: [{ t: 0.09, t1: 0.23, shape: 'arc', range: 5.6, arc: 200, dmg: 31, kb: 5.5, up: 3 }],
    sfx: 'slash_rise', swing: 0.08,
  },
  N6: { // a thruster-driven rising slash, as in the footage: everything in front goes up with it
    dur: 0.9, chain: 0.7, next: null, charge: null, saber: true,
    lunge: [[0.04, 0], [0.26, 1.6]],
    air: [[0.08, 0], [0.3, 2.0], [0.55, 2.2], [0.8, 0]],
    jets: [0.08, 0.5, true],
    clip: clip([
      k(0, { torso: [0.4, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.08, { torso: [0.45, -0.35, 0] }),
      k(0.26, { torso: [-0.4, 0.25, 0], ...HIGH, uArmL: [-0.2, 0, 0.9], y: 0, ...LEGS_AIR }, 'snap'),
      k(0.55, { torso: [-0.3, 0.2, 0] }),
      k(0.8, { torso: [0.25, 0, 0], uArmR: [-0.8, 0, -0.3], y: -0.35, ...LEGS_WIDE }),
      k(0.9, { torso: [0.12, 0, 0], y: -0.2 }),
    ]),
    hits: [{ t: 0.1, t1: 0.3, shape: 'arc', range: 5.6, arc: 200, hy: 5.5, dmg: 44, kb: 3, up: 11, big: true }],
    ev: [[0.08, 'flash', 'gold'], [0.8, 'land']],
    sfx: 'slash_rise', swing: 0.1,
  },

  // ---- charge attacks ----
  // K alone: the beam shot rifle. Mash K for a slow, heavy shot combo; hold it for the charge shot.
  C1: {
    dur: 0.42, chain: 0.16, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true,
    clip: clip([
      k(0, { ...RIFLE }),
      k(0.1, { ...RIFLE }, 'snap'),
      k(0.16, { torso: [-0.1, -0.47, 0.05], uArmR: [-1.6, 0, -0.15], hand: [1.7, 0, 0], y: -0.06 }, 'snap'),
      k(0.42, { ...RIFLE }),
    ]),
    shots: [{ t: 0.12, kind: 'srifle' }],
  },
  C1R: {
    dur: 0.3, chain: 0.1, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true, maxRepeat: 10,
    clip: clip([
      k(0, { ...RIFLE }),
      k(0.05, { torso: [-0.08, -0.47, 0.05], uArmR: [-1.55, 0, -0.15], hand: [1.65, 0, 0], y: -0.06 }, 'snap'),
      k(0.3, { ...RIFLE }),
    ]),
    shots: [{ t: 0.03, kind: 'srifle' }],
  },
  CS: { // charge shot: boost in, a rising stab that launches, and the funnels converge on the catch
    dur: 1.7, chain: 1.45, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.55, null]],
    lunge: [[0.08, 0], [0.34, 4.2]],
    jets: [0.08, 0.4, false],
    clip: clip([
      k(0, { torso: [0.5, -0.2, 0], uArmR: [0.3, 0, -0.5], fArmR: [-0.6, 0, 0], hand: [0.9, 0, 0], y: -0.35, ...LEGS_LUNGE_R }),
      k(0.3, { torso: [0.6, -0.2, 0], uArmR: [0.4, 0, -0.4], y: -0.45, ...LEGS_LUNGE_R }),
      k(0.42, { torso: [-0.35, 0.2, 0], ...HIGH, y: 0, ...LEGS_WIDE }, 'snap'),
      k(0.6, { ...COMMAND, y: -0.15, ...LEGS_WIDE }),
      k(1.4, { ...COMMAND, torso: [-0.15, -0.1, 0], y: -0.15 }),
      k(1.7, { torso: [0.1, -0.2, 0], y: -0.12 }),
    ]),
    hits: [
      { t: 0.14, t1: 0.36, shape: 'arc', range: 4.4, arc: 120, dmg: 12, kb: 0.5, up: 0.5, pull: 1.5, stop: 1 },
      { t: 0.38, t1: 0.5, shape: 'arc', range: 5.4, arc: 150, hy: 5, dmg: 34, kb: 2, up: 13, big: true },
    ],
    ev: [[0.02, 'flash', 'gold'], [0.55, 'funnels', 'tgt'], [1.5, 'recall']],
    shots: [...funnels(0.78, 0.07, 'tgt'), ...funnels(1.2, 0.04, 'tgt')],
    sfxs: [[0.1, 'qb'], [0.38, 'slash_rise']],
  },

  // J K: a tomahawk spin, then the abdominal mega particle cannon point-blank.
  C2: {
    dur: 1.6, chain: 1.35, saber: true, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.02, 0], [0.2, 1.3], [0.9, 1.3], [1.05, 0.4]],
    clip: clip([
      k(0, { torso: [0.1, -0.6, 0], ...SWEEP_R, y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.42, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.6, { yaw: PI * 2, torso: [-0.3, 0, 0], uArmR: [-0.2, 0, -1.3], uArmL: [-0.2, 0, 1.3], fArmL: [-0.3, 0, 0], head: [-0.2, 0, 0], y: -0.3, ...LEGS_WIDE }),
      k(0.82, { yaw: PI * 2, torso: [-0.45, 0, 0], y: -0.4 }),
      k(0.9, { yaw: PI * 2, torso: [0.15, 0, 0], y: -0.25 }, 'snap'),
      k(1.6, { yaw: PI * 2, torso: [0.1, -0.2, 0], uArmR: [-0.3, 0, -0.35], uArmL: [-0.45, 0, 0.3], fArmL: [-1.0, 0, 0], y: -0.12 }),
    ]),
    hits: [
      { t: 0.06, t1: 0.4, shape: 'arc', range: 5.8, arc: 360, dmg: 16, kb: 1, up: 1, pull: 1.4 },
      { t: 0.2, t1: 0.3, shape: 'arc', range: 5.8, arc: 360, dmg: 16, kb: 1, up: 1, pull: 1.4 },
    ],
    ev: [[0.0, 'flash', 'gold'], [0.6, 'megacharge'], [0.88, 'mega']],
    sfxs: [[0.05, 'slash_spin'], [0.25, 'slash_spin']],
  },

  // J J K: two cuts and a launcher, then all six funnels surround the catch and fire at once.
  C3: {
    dur: 2.0, chain: 1.75, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.75, null]],
    lunge: [[0.02, 0], [0.16, 1.2], [0.36, 2.2]],
    clip: clip([
      k(0, { torso: [0.2, 0.75, 0], uArmR: [0, 1.85, -1.2], fArmR: [-0.2, 0, 0], hand: [1.3, 0, 0], y: -0.28, ...LEGS_LUNGE_L }),
      k(0.13, { torso: [-0.2, -0.7, 0], uArmR: [-2.2, -0.3, -0.8], fArmR: [-0.1, 0, 0], hand: [0.5, 0, 0], y: -0.16, ...LEGS_LUNGE_R }, 'snap'),
      k(0.3, { torso: [0.1, -0.95, 0], ...SWEEP_R, y: -0.14, ...LEGS_WIDE }, 'snap'),
      k(0.38, { torso: [0.14, 0.9, 0], ...SWEEP_L, y: -0.28, ...LEGS_LUNGE_R }, 'snap'),
      k(0.5, { torso: [0.4, -0.3, 0], uArmR: [0.7, 0, -0.35], hand: [0.2, 0, 0], y: -0.45, ...LEGS_LUNGE_R }),
      k(0.62, { torso: [-0.4, 0.25, 0], ...HIGH, y: 0, ...LEGS_WIDE }, 'snap'),
      k(0.85, { ...COMMAND, y: -0.15, ...LEGS_WIDE }),
      k(1.7, { ...COMMAND, torso: [-0.2, -0.1, 0], y: -0.15 }),
      k(2.0, { torso: [0.1, -0.2, 0], y: -0.12 }),
    ]),
    hits: [
      { t: 0.04, t1: 0.14, shape: 'arc', range: 5.3, arc: 170, dmg: 20, kb: 2, up: 1 },
      { t: 0.32, t1: 0.4, shape: 'arc', range: 5.4, arc: 190, dmg: 20, kb: 2, up: 0 },
      { t: 0.54, t1: 0.66, shape: 'arc', range: 5.6, arc: 170, hy: 5, dmg: 30, kb: 1, up: 13, big: true },
    ],
    ev: [[0.0, 'flash', 'gold'], [0.75, 'funnels', 'tgt'], [1.55, 'starburst'], [1.8, 'recall']],
    shots: [...funnels(0.95, 0.08, 'tgt'), ...funnels(1.55, 0, 'tgt')],
    sfxs: [[0.03, 'slash_a'], [0.3, 'slash_b'], [0.54, 'slash_rise']],
  },

  // J J J K: three quick cuts, then a thruster-driven spin sweep that throws everything out.
  C4: {
    dur: 1.55, chain: 1.3, saber: true, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.02, 0], [0.4, 2.2], [0.9, 3.4]],
    jets: [0.5, 1.0, false],
    clip: clip([
      k(0, { torso: [0.15, -0.85, 0], ...SWEEP_R, y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.1, { torso: [0.15, 0.85, 0], ...SWEEP_L, y: -0.34, ...LEGS_LUNGE_R }, 'snap'),
      k(0.2, { torso: [-0.2, 0.5, 0], ...HIGH, y: -0.2 }, 'snap'),
      k(0.32, { torso: [0.45, -0.3, 0], uArmR: [-0.8, -0.2, -0.3], hand: [0.9, 0, 0], y: -0.4, ...LEGS_LUNGE_R }, 'snap'),
      k(0.5, { torso: [0.2, -0.7, 0], ...SWEEP_R, y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(1.0, { torso: [0.2, 0.3, 0], ...SWEEP_R, yaw: PI * 4, y: -0.3 }, 'linear'),
      k(1.2, { torso: [0.1, 0.6, 0], ...SWEEP_L, yaw: PI * 4, y: -0.35 }),
      k(1.55, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.35], yaw: PI * 4, y: -0.15 }),
    ]),
    hits: [
      { t: 0.04, t1: 0.12, shape: 'arc', range: 5.3, arc: 190, dmg: 16, kb: 1, up: 0, stop: 1 },
      { t: 0.14, t1: 0.22, shape: 'arc', range: 5.3, arc: 150, dmg: 16, kb: 1, up: 0, stop: 1 },
      { t: 0.26, t1: 0.34, shape: 'arc', range: 5.5, arc: 110, dmg: 20, kb: 2, up: 0 },
      ...[0.55, 0.7, 0.85].map((t) => ({ t, t1: t + 0.12, shape: 'arc', range: 5.9, arc: 360, dmg: 14, kb: 1.5, up: 1, pull: 1 })),
      { t: 1.0, t1: 1.12, shape: 'arc', range: 6.2, arc: 360, dmg: 40, kb: 13, up: 7, big: true },
    ],
    ev: [[0.0, 'flash', 'gold']],
    sfxs: [[0.03, 'slash_fast'], [0.13, 'slash_fast'], [0.25, 'slash_a'], [0.55, 'slash_spin'], [0.8, 'slash_spin'], [1.0, 'slash_dash']],
  },

  // J J J J K: thrusters lift the suit through a flurry of rising cuts, ending in a climbing upper slash.
  C5: {
    dur: 1.9, chain: 1.7, saber: true, rate: 1, next: null, charge: null, armor: true,
    air: [[0.3, 0], [0.9, 3.0], [1.2, 4.2], [1.5, 4.2], [1.8, 0]],
    jets: [0.3, 1.3, true],
    lunge: [[0.0, 0], [0.3, 1.6], [0.9, 2.4]],
    clip: clip([
      k(0, { torso: [0.2, 0.75, 0], uArmR: [0, 1.85, -1.2], hand: [1.3, 0, 0], y: -0.28, ...LEGS_LUNGE_L }),
      k(0.12, { torso: [-0.2, -0.7, 0], uArmR: [-2.2, -0.3, -0.8], hand: [0.5, 0, 0], y: -0.16, ...LEGS_LUNGE_R }, 'snap'),
      ...[0.3, 0.45, 0.6, 0.75].map((t, i) => k(t, i % 2
        ? { torso: [-0.2, -0.6, 0], uArmR: [-2.4, -0.3, -0.7], hand: [0.4, 0, 0], y: 0, ...LEGS_AIR }
        : { torso: [0.2, 0.7, 0], uArmR: [-0.4, 1.6, -1.2], hand: [1.2, 0, 0], y: 0, ...LEGS_AIR }, 'snap')),
      k(0.95, { torso: [0.5, -0.3, 0], uArmR: [0.7, 0, -0.35], hand: [0.2, 0, 0], ...LEGS_AIR }),
      k(1.1, { torso: [-0.5, 0.3, 0], ...HIGH, ...LEGS_AIR }, 'snap'),
      k(1.5, { torso: [-0.3, 0.2, 0] }),
      k(1.8, { torso: [0.3, 0, 0], uArmR: [-0.6, 0, -0.4], y: -0.45, ...LEGS_WIDE }),
      k(1.9, { torso: [0.12, -0.1, 0], y: -0.2 }),
    ]),
    hits: [
      { t: 0.04, t1: 0.14, shape: 'arc', range: 5.3, arc: 170, dmg: 18, kb: 1, up: 3 },
      ...[0.32, 0.47, 0.62, 0.77].map((t) => ({ t, t1: t + 0.1, shape: 'arc', range: 5.2, arc: 200, hy: 7, dmg: 13, kb: 0.4, up: 2.6, pull: 0.8, sp: false })),
      { t: 1.0, t1: 1.14, shape: 'arc', range: 5.8, arc: 200, hy: 9, dmg: 40, kb: 5, up: 12, big: true },
    ],
    ev: [[0.0, 'flash', 'gold'], [1.8, 'land']],
    sfxs: [[0.03, 'slash_b'], [0.3, 'slash_fast'], [0.45, 'slash_fast'], [0.6, 'slash_fast'], [0.75, 'slash_fast'], [1.0, 'slash_rise']],
  },

  // J J J J J K: cuts and a spin, then a hop as all six funnels ring the suit and fire outward in every direction.
  C6: {
    dur: 2.5, chain: 2.25, rate: 1, next: null, charge: null, armor: true, invuln: true,
    wpn: [[0, 'saber'], [0.8, null]],
    lunge: [[0.02, 0], [0.3, 1.6]],
    air: [[0.8, 0], [1.05, 1.4], [2.0, 1.5], [2.3, 0]],
    jets: [0.8, 2.1, true],
    clip: clip([
      k(0, { torso: [0.2, 0.75, 0], uArmR: [0, 1.85, -1.2], hand: [1.3, 0, 0], y: -0.28, yaw: 0, ...LEGS_LUNGE_L }),
      k(0.12, { torso: [-0.2, -0.7, 0], uArmR: [-2.2, -0.3, -0.8], hand: [0.5, 0, 0], y: -0.16, ...LEGS_LUNGE_R }, 'snap'),
      k(0.3, { torso: [0.15, -0.7, 0], ...SWEEP_R, y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.7, { torso: [0.15, 0.4, 0], ...SWEEP_R, yaw: PI * 2 }, 'linear'),
      k(0.95, { yaw: PI * 2, torso: [-0.3, 0, 0], uArmR: [-0.2, 0, -1.4], fArmR: [0, 0, 0], uArmL: [-0.2, 0, 1.4], fArmL: [0, 0, 0], head: [-0.3, 0, 0], ...LEGS_AIR }),
      k(2.0, { yaw: PI * 2, torso: [-0.25, 0, 0], uArmR: [-0.3, 0, -1.3], uArmL: [-0.3, 0, 1.3] }),
      k(2.3, { yaw: PI * 2, torso: [0.3, 0, 0], uArmR: [-0.4, 0, -0.35], y: -0.4, ...LEGS_WIDE }),
      k(2.5, { yaw: PI * 2, torso: [0.1, -0.2, 0], y: -0.15 }),
    ]),
    hits: [
      { t: 0.04, t1: 0.14, shape: 'arc', range: 5.3, arc: 170, dmg: 20, kb: 1.5, up: 1 },
      { t: 0.32, t1: 0.68, shape: 'arc', range: 5.9, arc: 360, dmg: 22, kb: 2, up: 1.5, pull: 1.4 },
    ],
    ev: [[0.0, 'flash', 'violet'], [0.85, 'funnels', 'ring'], [2.15, 'recall']],
    shots: [...funnels(1.05, 0.05, 'out', 18), ...funnels(1.95, 0, 'out')],
    sfxs: [[0.03, 'slash_a'], [0.32, 'slash_spin'], [0.85, 'qb']],
  },

  // ---- boost dash: tomahawk cuts on the move (keep pressing J), a full-body slam that skids along the ground, or
  // spin cuts into a rising uppercut and a funnel volley ----
  DA: {
    dur: 0.36, chain: 0.22, saber: true, rate: 1, next: 'DA', charge: 'DC', armor: true, rush: true,
    slide: [0, 0.36, 6.8],
    jets: [0, 0.36, false],
    clip: clip([
      k(0, { torso: [0.35, -0.85, 0], ...SWEEP_R, y: -0.32, ...LEGS_LUNGE_L }),
      k(0.1, { torso: [0.4, 0.85, 0], ...SWEEP_L, y: -0.38, ...LEGS_LUNGE_R }, 'snap'),
      k(0.2, { torso: [0.3, 0.95, 0], uArmR: [-0.3, 1.85, -1.25], fArmR: [-0.3, 0, 0] }),
      k(0.31, { torso: [0.35, -0.9, 0], uArmR: [-0.4, -0.4, -1.25], fArmR: [-0.2, 0, 0], y: -0.32, ...LEGS_LUNGE_L }, 'snap'),
      k(0.36, { torso: [0.35, -0.85, 0] }),
    ]),
    hits: [
      { t: 0.03, t1: 0.12, shape: 'arc', range: 5.4, arc: 185, dmg: 14, kb: 1.5, up: 0, pull: 1, stop: 1 },
      { t: 0.21, t1: 0.31, shape: 'arc', range: 5.4, arc: 185, dmg: 14, kb: 1.5, up: 0, pull: 1, stop: 1 },
    ],
    sfxs: [[0.02, 'slash_fast'], [0.2, 'slash_fast']],
  },
  DAF: { // the whole Sazabi throws itself forward and skids along on its front, then heaves back up
    dur: 1.2, chain: 0.95, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.15, null]],
    lunge: [[0.05, 0], [0.3, 3.2], [0.7, 5.2]],
    clip: clip([
      k(0, { torso: [0.4, -0.3, 0], uArmR: [0.7, 0, -0.35], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.16, { pitch: 0.5, torso: [0.5, 0, 0], uArmR: [-2.6, 0, -0.5], uArmL: [-2.6, 0, 0.5], y: 0.2, ...LEGS_FLAT }),
      k(0.3, { pitch: 1.45, torso: [0.1, 0, 0], head: [-0.8, 0, 0], y: 0.05 }, 'in'),
      k(0.72, { pitch: 1.5, torso: [0.1, 0, 0], y: 0 }),
      k(0.95, { pitch: 0.4, torso: [0.4, 0, 0], uArmR: [0.3, 0, -0.6], uArmL: [0.3, 0, 0.6], y: -0.7, thighR: [-1.5, 0, -0.2], shinR: [2.2, 0, 0], thighL: [-0.2, 0, 0.2], shinL: [1.6, 0, 0] }),
      k(1.2, { pitch: 0, torso: [0.1, -0.2, 0], y: -0.15, ...LEGS_WIDE }),
    ]),
    hits: [
      { t: 0.28, t1: 0.36, shape: 'circle', range: 4.2, off: 2.4, dmg: 40, kb: 9, up: 5, big: true },
      { t: 0.36, t1: 0.7, shape: 'circle', range: 3.4, off: 2.6, dmg: 12, kb: 7, up: 2 },
    ],
    ev: [[0.3, 'skid']],
    sfxs: [[0.02, 'qb'], [0.3, 'slam'], [0.32, 'skid']],
  },
  DC: {
    dur: 1.55, chain: 1.3, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.75, null]],
    slide: [0, 0.4, 5],
    jets: [0, 0.65, true],
    air: [[0.4, 0], [0.62, 1.6], [1.2, 1.6], [1.45, 0]],
    clip: clip([
      k(0, { torso: [0.2, -0.6, 0], ...SWEEP_R, y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.36, { torso: [0.2, 0.4, 0], ...SWEEP_R, yaw: PI * 2 }, 'linear'),
      k(0.44, { yaw: PI * 2, torso: [0.4, -0.3, 0], uArmR: [0.7, 0, -0.35], hand: [0.2, 0, 0], y: -0.45, ...LEGS_LUNGE_R }),
      k(0.58, { yaw: PI * 2, torso: [-0.45, 0.25, 0], ...HIGH, y: 0, ...LEGS_AIR }, 'snap'),
      k(0.8, { yaw: PI * 2, ...COMMAND, head: [-0.5, 0, 0], ...LEGS_AIR }),
      k(1.45, { yaw: PI * 2, torso: [0.3, 0, 0], uArmR: [-0.5, 0, -0.35], y: -0.4, ...LEGS_WIDE }),
      k(1.55, { yaw: PI * 2, torso: [0.1, -0.2, 0], y: -0.15 }),
    ]),
    hits: [
      { t: 0.04, t1: 0.36, shape: 'arc', range: 5.6, arc: 360, dmg: 14, kb: 1, up: 0.5, pull: 1.2 },
      { t: 0.18, t1: 0.3, shape: 'arc', range: 5.6, arc: 360, dmg: 14, kb: 1, up: 0.5, pull: 1.2 },
      { t: 0.46, t1: 0.6, shape: 'arc', range: 5.6, arc: 170, hy: 6, dmg: 32, kb: 2, up: 13, big: true },
    ],
    ev: [[0.02, 'flash', 'gold'], [0.72, 'funnels', 'tgt'], [1.4, 'recall']],
    shots: funnels(0.9, 0.06, 'tgt', 8),
    sfxs: [[0.03, 'slash_spin'], [0.46, 'slash_rise'], [1.45, 'land']],
  },

  // ---- aerial ----
  JA: {
    dur: 0.48, chain: 0.28, saber: true, next: null, charge: null, isAir: true,
    clip: clip([
      k(0, { torso: [-0.3, -0.2, 0], ...HIGH, thighR: [-1.0, 0, 0], shinR: [1.4, 0, 0], thighL: [-0.3, 0, 0], shinL: [1.0, 0, 0] }),
      k(0.17, { torso: [0.6, 0, 0], uArmR: [-0.9, 0, -0.1], hand: [0.7, 0, 0] }, 'snap'),
      k(0.48, { torso: [0.3, 0, 0] }),
    ]),
    hits: [{ t: 0.06, t1: 0.19, shape: 'arc', range: 5.3, arc: 150, dmg: 26, kb: 4, up: 4, hy: 5 }],
    sfx: 'slash_h', swing: 0.06,
  },
  JC: { // a missile volley into the ground ahead, from the hover
    dur: 0.8, chain: 0.6, next: null, charge: null, isAir: true, hang: 0.6,
    clip: clip([
      k(0, { torso: [0.35, 0, 0], uArmL: [-1.2, 0, 0.5], fArmL: [-0.4, 0, 0], uArmR: [-0.3, 0, -0.6], head: [0.4, 0, 0], ...LEGS_AIR }),
      k(0.5, { torso: [0.45, 0, 0], uArmL: [-1.0, 0, 0.5] }),
      k(0.8, { torso: [0.2, 0, 0] }),
    ]),
    shots: [-0.3, -0.1, 0.1, 0.3].map((ang, i) => ({ t: 0.12 + i * 0.07, kind: 'missile', ang })),
  },

  // ---- SP attacks ----
  // Ground: a starburst, then the funnels fan out wide and rain beams on the field while the shot rifle picks off
  // what's left, and the abdominal mega particle cannon finishes it. Hold SP through the starburst for the charge SP
  // (a tomahawk-and-funnel frenzy, then a giant beam axe); in the air, the shot rifle hammers the ground.
  SP_IN: {
    dur: 0.55, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SP_RAIN', spHold: 'SPC_CH',
    clip: clip([
      k(0, { torso: [0, 0, 0] }),
      k(0.22, { torso: [-0.25, 0, 0], uArmR: [-0.2, 0, -1.4], fArmR: [0, 0, 0], uArmL: [-0.2, 0, 1.4], fArmL: [0, 0, 0], head: [-0.3, 0, 0], y: -0.2, ...LEGS_WIDE }, 'snap'),
      k(0.55, { torso: [-0.28, 0, 0] }),
    ]),
    ev: [[0.03, 'burst'], [0.4, 'funnels', 'field']],
  },
  SP_RAIN: {
    dur: 3.2, rate: 1, armor: true, invuln: true, sp: true, steer: 2.4, spNext: 'SP_MEGA',
    wpn: [[0, 'rifle']],
    clip: clip([
      k(0, { ...RIFLE, y: -0.15, ...LEGS_WIDE }),
      k(0.5, { ...RIFLE, torso: [0, -0.3, 0] }),
      k(0.55, { torso: [-0.1, -0.35, 0.05], uArmR: [-1.6, 0, -0.15], hand: [1.7, 0, 0] }, 'snap'),
      k(1.0, { ...RIFLE, torso: [0, -0.6, 0] }),
      k(1.6, { ...RIFLE, torso: [0, 0.2, 0] }),
      k(1.65, { torso: [-0.1, 0.15, 0.05], uArmR: [-1.6, 0, -0.15], hand: [1.7, 0, 0] }, 'snap'),
      k(2.4, { ...RIFLE, torso: [0, -0.2, 0] }),
      k(2.45, { torso: [-0.1, -0.25, 0.05], uArmR: [-1.6, 0, -0.15], hand: [1.7, 0, 0] }, 'snap'),
      k(3.2, { ...RIFLE }),
    ]),
    shots: [
      ...times(0.1, 3.1, 0.075).map((t, j) => ({ t, kind: 'funnel', i: j % 6, mode: 'rain' })),
      ...[0.52, 1.62, 2.42].map((t) => ({ t, kind: 'srifle', sp: true })),
    ],
  },
  SP_MEGA: { // the funnels come home and the abdominal mega particle cannon fires straight ahead
    dur: 1.5, rate: 1, armor: true, invuln: true, sp: true,
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -0.35], y: -0.15 }),
      k(0.4, { torso: [-0.35, 0, 0], uArmR: [0.2, 0, -1.0], uArmL: [0.2, 0, 1.0], fArmL: [-0.3, 0, 0], head: [-0.25, 0, 0], y: -0.45, ...LEGS_WIDE }),
      k(0.5, { torso: [-0.5, 0, 0], y: -0.5 }, 'snap'),
      k(1.2, { torso: [-0.45, 0, 0] }),
      k(1.5, { torso: [0.1, -0.2, 0], y: -0.15 }),
    ]),
    hits: [{ t: 0.52, t1: 0.9, shape: 'line', len: 18, width: 4.2, dmg: 40, kb: 6, up: 5, sp: true }, { t: 0.95, t1: 1.02, shape: 'line', len: 18, width: 4.6, dmg: 90, kb: 14, up: 10, big: true, sp: true }],
    ev: [[0.02, 'recall'], [0.1, 'megacharge'], [0.5, 'megabeam']],
  },
  SPA_IN: {
    dur: 0.5, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spNext: 'SPA_FIRE',
    wpn: [[0, 'rifle']],
    jets: [0, 0.5, true],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], ...LEGS_AIR }),
      k(0.25, { torso: [-0.3, 0, 0], uArmR: [-0.2, 0, -1.4], uArmL: [-0.2, 0, 1.4], y: 0.1, ...LEGS_AIR }),
      k(0.5, { torso: [0.2, 0, 0], ...RIFLE, y: 0.1 }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SPA_FIRE: { // hover and hammer the ground with the shot rifle
    dur: 0.42, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spRepeat: 7, spNext: 'SPA_END',
    wpn: [[0, 'rifle']],
    jets: [0, 0.42, true],
    clip: clip([
      k(0, { ...RIFLE, torso: [0.55, -0.3, 0], uArmR: [-0.9, 0, -0.15], ...LEGS_AIR }),
      k(0.05, { torso: [0.45, -0.35, 0], uArmR: [-1.1, 0, -0.15], hand: [1.3, 0, 0] }, 'snap'),
      k(0.42, { torso: [0.55, -0.3, 0], uArmR: [-0.9, 0, -0.15] }),
    ]),
    shots: [{ t: 0.04, kind: 'down' }],
  },
  SPA_END: {
    dur: 1.0, rate: 1, armor: true, invuln: true, sp: true, isAir: true, dive: 1.6,
    wpn: [[0, 'rifle']],
    clip: clip([
      k(0, { ...RIFLE, torso: [0.5, -0.3, 0], ...LEGS_AIR }),
      k(0.3, { torso: [0.4, -0.3, 0], uArmR: [-1.0, 0, -0.15], hand: [1.3, 0, 0] }),
      k(0.36, { torso: [0.2, -0.35, 0], uArmR: [-1.3, 0, -0.15] }, 'snap'),
      k(1.0, { torso: [0.2, -0.2, 0], y: -0.2, ...LEGS_WIDE }),
    ]),
    ev: [[0.02, 'charge'], [0.34, 'burstgreen']],
  },
  SPC_CH: {
    dur: 1.05, rate: 1, armor: true, invuln: true, sp: true, chargeAura: true, spNext: 'SPC_FL',
    wpn: [[0, 'saber']],
    clip: clip([
      k(0, { torso: [-0.2, 0.3, 0], uArmR: [-0.2, 0, -0.6], fArmR: [-0.7, 0, 0], hand: [1.3, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.35, { torso: [0.4, 0, 0], uArmR: [-0.2, 0, -0.9], fArmR: [-0.7, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.2, 0, 0.9], fArmL: [-0.7, 0, 0], head: [-0.2, 0, 0], y: -0.55, ...LEGS_WIDE }),
      k(1.05, { torso: [0.45, 0, 0], y: -0.6 }),
    ]),
    ev: [[0.02, 'charge'], [0.9, 'funnels', 'ring'], [1.0, 'burst']],
  },
  SPC_FL: { // a tomahawk frenzy on the thrusters while the funnels fire from all around
    dur: 3.0, rate: 1, armor: true, invuln: true, sp: true, loop: 0.3, rushFx: true, steer: 2.6, spNext: 'SPC_AXE',
    wpn: [[0, 'saber']],
    jets: [0, 3.0, false],
    clip: clip([
      k(0, { torso: [0.15, -0.85, 0], ...SWEEP_R, y: -0.3, ...LEGS_WIDE }),
      k(0.075, { torso: [0.15, 0.85, 0], ...SWEEP_L, y: -0.34 }, 'snap'),
      k(0.15, { torso: [-0.2, 0.5, 0], ...HIGH, y: -0.2 }, 'snap'),
      k(0.225, { torso: [0.45, -0.4, 0], uArmR: [-0.8, -0.2, -0.3], fArmR: [-0.1, 0, 0], hand: [0.9, 0, 0], y: -0.4 }, 'snap'),
      k(0.3, { torso: [0.15, -0.85, 0], ...SWEEP_R, y: -0.3 }),
    ]),
    hits: every(0.05, 2.95, 0.075, { shape: 'arc', range: 5.4, arc: 250, dmg: 8, kb: 0.5, up: 0.4, pull: 1.3, sp: true }),
    shots: times(0.2, 2.9, 0.12).map((t, j) => ({ t, kind: 'funnel', i: j % 6, mode: 'tgt', sp: true })),
    sfxs: [0.02, 0.095, 0.17, 0.245].flatMap((o) => times(0, 2.95, 0.3).map((t) => [t + o, 'slash_fast'])),
  },
  SPC_AXE: { // the tomahawk's beam stretched out into a giant axe for one sweeping cut
    dur: 1.6, rate: 1, armor: true, invuln: true, sp: true,
    wpn: [[0, 'saber']],
    bl: [[0, 1], [0.35, 3], [1.15, 3], [1.4, 1]],
    clip: clip([
      k(0, { torso: [0.2, -0.9, 0], ...SWEEP_R, uArmL: [-0.2, 0, 1.0], y: -0.35, yaw: 0, ...LEGS_WIDE }),
      k(0.4, { torso: [0.25, -1.0, 0], uArmR: [0, -0.4, -1.45], y: -0.4, yaw: 0 }),
      k(0.95, { torso: [0.2, 0.9, 0], ...SWEEP_L, y: -0.45, yaw: PI * 2, ...LEGS_LUNGE_R }, 'linear'),
      k(1.6, { torso: [0.1, 0.3, 0], uArmR: [-0.4, 0.6, -0.9], y: -0.2, yaw: PI * 2 }),
    ]),
    hits: [
      { t: 0.45, t1: 0.95, shape: 'arc', range: 13, arc: 360, dmg: 50, kb: 3, up: 3, sp: true },
      { t: 0.9, t1: 1.0, shape: 'arc', range: 13, arc: 360, dmg: 150, kb: 15, up: 12, big: true, sp: true },
    ],
    ev: [[0.02, 'recall'], [0.3, 'flash', 'red'], [0.92, 'bigaxe']],
    sfxs: [[0.4, 'slash_spin'], [0.7, 'slash_spin'], [0.9, 'slash_down']],
  },
};

for (const m of Object.values(MOVES)) for (const key of ['ev', 'sfxs', 'shots']) m[key]?.sort((a, b) => (a[0] ?? a.t) - (b[0] ?? b.t));
