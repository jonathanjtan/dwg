// Gundam F91 moveset, after Dynasty Warriors: Gundam Reborn's "ALL MOVES" video (F91, 82s), checked beat by beat
// against it and the Koei wiki's DWG2/3 list (the same inputs). Weapons: a yellow beam saber (a second one for C4),
// the beam rifle, the beam shield off the left forearm, the twin back-mounted VSBR that swing forward under the arms
// to fire (the charge shot, C3, C6 and the charge SP's sustained beam), and the beam launcher (the dash charge).
// Burst type MEPE: its charge attacks and SP finishers carry a teal-green "metal peel" afterimage swirl.
// F91 is a smaller, lighter Formula-project suit (~0.85x the Gundam, H ~ 2.9 units): reach below is the Gundam's own
// numbers scaled down by that factor. The footage skips jump attacks (JA/JC), invented here in the same spirit.
import { Clip, poseFrom } from '../core/rig.js';

const PI = Math.PI;
export const BLADE = 3.8; // beam saber length (units) - the Gundam's 4.4 scaled by ~0.85

// Ready stance: saber low and forward, the beam shield disc held out to the left.
export const STANCE = poseFrom({
  y: -0.1,
  hips: [0, 0, 0],
  torso: [0.1, -0.2, 0],
  head: [-0.08, 0.18, 0],
  uArmR: [-0.35, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.35, 0, 0],
  uArmL: [-0.4, 0, 0.35], fArmL: [-1.0, 0, 0], handL: [0, 0.15, 0],
  thighR: [-0.3, 0, -0.12], shinR: [0.42, 0, 0],
  thighL: [-0.05, 0, 0.12], shinL: [0.32, 0, 0],
});

const k = (t, p, e) => ({ t, p, e });
const clip = (keys) => new Clip(keys, STANCE);
// One hit window every `step` seconds over [t0, t1): each gets its own id, so a target is struck once per window.
const times = (t0, t1, step) => {
  const out = [];
  for (let t = t0; t < t1 - 1e-6; t += step) out.push(t);
  return out;
};
const every = (t0, t1, step, spec) => times(t0, t1, step).map((t) => ({ t, t1: t + step * 0.8, ...spec }));

const LEGS_LUNGE_R = { thighR: [-0.9, 0, -0.1], shinR: [0.9, 0, 0], thighL: [0.45, 0, 0.1], shinL: [0.35, 0, 0] };
const LEGS_LUNGE_L = { thighL: [-0.9, 0, 0.1], shinL: [0.9, 0, 0], thighR: [0.45, 0, -0.1], shinR: [0.35, 0, 0] };
const LEGS_WIDE = { thighR: [-0.2, 0, -0.45], shinR: [0.6, 0, 0], thighL: [-0.2, 0, 0.45], shinL: [0.6, 0, 0] };
const LEGS_AIR = { thighR: [-1.0, 0, -0.1], shinR: [1.5, 0, 0], thighL: [-0.3, 0, 0.1], shinL: [0.8, 0, 0] };
const LEGS_KNEEL = { thighR: [-1.5, 0, -0.2], shinR: [2.3, 0, 0], thighL: [0.3, 0, 0.15], shinL: [1.6, 0, 0] };
const SWEEP_R = { uArmR: [0, -0.2, -1.55], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0] };
const SWEEP_L = { uArmR: [0, 1.9, -1.55], fArmR: [-0.15, 0, 0], hand: [1.2, 0, 0] };
const RIFLE = { torso: [0, -0.55, 0], uArmR: [-1.57, 0, 0.12], fArmR: [0, 0, 0], hand: [1.57, 0, 0], uArmL: [-0.8, 0, 0.2], head: [0, -0.4, 0] };
const LAUNCH = { torso: [0.05, -0.35, 0], uArmR: [-0.55, 0, -0.25], fArmR: [-1.3, 0, 0], hand: [1.85, 0, 0], uArmL: [-1.2, 0, -0.15], fArmL: [-0.7, 0, 0], head: [0, -0.3, 0] };
// arms spread wide, level with the shoulders: the VSBR swing down under them from the back to point forward
const VSBR_POSE = { uArmR: [0, -0.3, -1.35], fArmR: [-0.2, 0, 0], uArmL: [0, 0.3, 1.35], fArmL: [-0.2, 0, 0] };

// hit: { t, t1, shape, range, arc, len, width, off, hy, dmg, kb, up, big, pull, sp, stop } ev: [t, name, arg]; shots:
// { t, kind } (rifle | cshot | up | vsbr | vsbrUp | blastUp | mega | megaEnd, see F91.fire); wpn: [t, weapon] (saber |
// sabers (one in each hand) | rifle | launcher); vsbr: [t, aim] curve for the back rifles' swing (0 racked, 1 forward);
// glide: [t0, t1, speed] slides the suit to its left; jets/slide/air/lunge: root motion; rate: playback speed. SP
// phases: spNext, spHold (taken instead while SP is still held), spRepeat, steer, chargeAura, stockDur, stockPower.
export const MOVES = {
  // ---- normal string: six beam saber cuts, the sixth a turning cut into a rising slash that knocks back ----
  N1: { // flat forehand, right to left
    dur: 0.48, chain: 0.3, next: 'N2', charge: 'C2', saber: true,
    lunge: [[0.03, 0], [0.16, 1.3]],
    clip: clip([
      k(0, { torso: [0.1, -1.0, 0], ...SWEEP_R, hand: [1.1, 0, 0], uArmL: [-0.7, 0, 0.4], y: -0.15, ...LEGS_WIDE }),
      k(0.06, { torso: [0.12, -1.1, 0], uArmR: [0, -0.3, -1.4] }),
      k(0.16, { torso: [0.15, 0.9, 0], ...SWEEP_L, uArmL: [-0.25, 0, 0.8], y: -0.28, ...LEGS_LUNGE_R }, 'snap'),
      k(0.48, { torso: [0.12, 0.5, 0], uArmR: [-0.3, 1.1, -1.0], hand: [0.8, 0, 0], y: -0.2 }),
    ]),
    hits: [{ t: 0.06, t1: 0.16, shape: 'arc', range: 4.8, arc: 190, dmg: 24, kb: 4, up: 0 }],
    sfx: 'slash_a', swing: 0.06,
  },
  N2: { // rising diagonal, low left to high right
    dur: 0.5, chain: 0.3, next: 'N3', charge: 'C3', saber: true,
    lunge: [[0.04, 0], [0.17, 1.3]],
    clip: clip([
      k(0, { torso: [0.25, 0.75, 0], uArmR: [0, 1.85, -1.2], fArmR: [-0.2, 0, 0], hand: [1.3, 0, 0], uArmL: [-0.7, 0, 0.45], y: -0.28, ...LEGS_LUNGE_L }),
      k(0.07, { torso: [0.28, 0.85, 0] }),
      k(0.18, { torso: [-0.2, -0.7, 0], uArmR: [-2.2, -0.3, -0.8], fArmR: [-0.1, 0, 0], hand: [0.5, 0, 0], uArmL: [-0.3, 0, 0.75], y: -0.17, ...LEGS_LUNGE_R }, 'snap'),
      k(0.5, { torso: [-0.1, -0.5, 0], uArmR: [-1.9, -0.2, -0.65], y: -0.18 }),
    ]),
    hits: [{ t: 0.07, t1: 0.19, shape: 'arc', range: 4.6, arc: 170, dmg: 24, kb: 4, up: 1.4 }],
    sfx: 'slash_rise', swing: 0.07,
  },
  N3: { // overhead chop
    dur: 0.52, chain: 0.3, next: 'N4', charge: 'C4', saber: true,
    lunge: [[0.06, 0], [0.19, 1.6]],
    clip: clip([
      k(0, { torso: [-0.25, -0.2, 0], uArmR: [-2.8, 0, -0.25], fArmR: [-0.3, 0, 0], hand: [0.3, 0, 0], uArmL: [-0.3, 0, 0.45], y: -0.05, head: [0.1, 0, 0] }),
      k(0.08, { torso: [-0.32, -0.24, 0], uArmR: [-3.0, 0, -0.2] }),
      k(0.19, { torso: [0.5, 0.1, 0], uArmR: [-0.85, 0, -0.1], fArmR: [-0.1, 0, 0], hand: [0.75, 0, 0], y: -0.4, head: [-0.25, 0, 0], ...LEGS_LUNGE_R }, 'snap'),
      k(0.52, { torso: [0.32, 0, 0], uArmR: [-0.75, 0, -0.2], y: -0.27 }),
    ]),
    hits: [{ t: 0.11, t1: 0.2, shape: 'arc', range: 4.9, arc: 110, dmg: 30, kb: 5.5, up: 0 }],
    sfx: 'slash_h', swing: 0.09,
  },
  N4: { // big rising cut, low right to high left
    dur: 0.54, chain: 0.32, next: 'N5', charge: 'C5', saber: true,
    lunge: [[0.05, 0], [0.19, 1.7]],
    clip: clip([
      k(0, { torso: [0.3, -0.85, 0], uArmR: [0.5, -0.4, -0.65], fArmR: [-0.2, 0, 0], hand: [1.3, 0, 0], uArmL: [-0.9, 0, 0.45], y: -0.32, ...LEGS_LUNGE_R }),
      k(0.08, { torso: [0.34, -0.95, 0] }),
      k(0.2, { torso: [-0.3, 0.75, 0], uArmR: [-2.5, 0.55, -0.55], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.3, 0, 0.8], y: -0.14, ...LEGS_LUNGE_L }, 'snap'),
      k(0.54, { torso: [-0.14, 0.5, 0], uArmR: [-2.2, 0.35, -0.45], y: -0.18 }),
    ]),
    hits: [{ t: 0.09, t1: 0.22, shape: 'arc', range: 4.8, arc: 200, dmg: 30, kb: 5.5, up: 2.6 }],
    sfx: 'slash_rise', swing: 0.08,
  },
  N5: { // flat backhand, left to right
    dur: 0.48, chain: 0.3, next: 'N6', charge: 'C6', saber: true,
    lunge: [[0.03, 0], [0.16, 1.3]],
    clip: clip([
      k(0, { torso: [0.12, 0.8, 0], ...SWEEP_L, uArmR: [-0.3, 1.85, -1.25], fArmR: [-0.3, 0, 0], y: -0.24, ...LEGS_LUNGE_R }),
      k(0.06, { torso: [0.14, 0.9, 0] }),
      k(0.16, { torso: [0.0, -1.0, 0.1], uArmR: [-0.3, -0.5, -1.25], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.2, 0, 0.55], y: -0.28, ...LEGS_LUNGE_L }, 'snap'),
      k(0.48, { torso: [0.05, -0.55, 0.05], uArmR: [-0.5, 0, -0.85], hand: [0.8, 0, 0] }),
    ]),
    hits: [{ t: 0.06, t1: 0.17, shape: 'arc', range: 4.8, arc: 200, dmg: 26, kb: 4.6, up: 0 }],
    sfx: 'slash_b', swing: 0.06,
  },
  N6: { // a turning cut all the way round, then a big rising diagonal that knocks the target well back
    dur: 0.86, chain: 0.66, next: null, charge: null, saber: true,
    lunge: [[0.05, 0], [0.26, 1.2], [0.5, 1.2], [0.6, 2.0]],
    clip: clip([
      k(0, { torso: [0.1, -0.5, 0], uArmR: [-2.3, 0.2, -0.5], fArmR: [-0.2, 0, 0], hand: [0.5, 0, 0], uArmL: [-0.4, 0, 0.8], y: -0.32, yaw: 0, ...LEGS_WIDE }),
      k(0.1, { torso: [0.1, -0.7, 0], ...SWEEP_R, uArmL: [0, 0, 1.25], y: -0.28, yaw: -0.3 }),
      k(0.36, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.46, { yaw: PI * 2, torso: [0.35, -0.4, 0], uArmR: [0.5, -0.3, -0.5], fArmR: [-0.2, 0, 0], hand: [0.5, 0, 0], uArmL: [-0.4, 0, 0.6], y: -0.45, ...LEGS_LUNGE_R }),
      k(0.56, { yaw: PI * 2, torso: [-0.35, 0.5, 0], uArmR: [-2.6, 0.3, -0.6], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.8], y: -0.1, ...LEGS_LUNGE_L }, 'snap'),
      k(0.86, { yaw: PI * 2, torso: [-0.15, 0.35, 0], uArmR: [-2.2, 0.2, -0.5], y: -0.2 }),
    ]),
    hits: [
      { t: 0.12, t1: 0.36, shape: 'arc', range: 4.4, arc: 360, dmg: 20, kb: 2, up: 1 },
      { t: 0.5, t1: 0.6, shape: 'arc', range: 4.8, arc: 170, dmg: 34, kb: 10, up: 4, big: true },
    ],
    sfxs: [[0.1, 'slash_spin'], [0.48, 'slash_rise']],
  },

  // ---- charge attacks: K alone is the beam rifle (mash for a shot combo, hold for a charge shot) ----
  C1: {
    dur: 0.4, chain: 0.13, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true,
    clip: clip([
      k(0, { ...RIFLE, torso: [0, -0.5, 0], uArmR: [-1.3, 0, 0.1], fArmR: [-0.3, 0, 0], hand: [1.6, 0, 0] }),
      k(0.1, { ...RIFLE }, 'snap'),
      k(0.16, { uArmR: [-1.8, 0, 0.1], hand: [1.4, 0, 0] }, 'snap'),
      k(0.4, { uArmR: [-1.55, 0, 0.1], hand: [1.55, 0, 0] }),
    ]),
    shots: [{ t: 0.12, kind: 'rifle' }],
  },
  C1R: {
    dur: 0.26, chain: 0.1, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true, maxRepeat: 6, // about six in the footage
    clip: clip([
      k(0, { ...RIFLE }),
      k(0.05, { uArmR: [-1.75, 0, 0.1], hand: [1.42, 0, 0] }, 'snap'),
      k(0.26, { ...RIFLE }),
    ]),
    shots: [{ t: 0.03, kind: 'rifle' }],
  },
  CS: { // charge shot: both VSBR swing forward under the arms and fire together; the heavy beams skid the F91 back
    dur: 1.2, chain: 1.0, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, null]], vsbr: [[0, 0], [0.3, 1], [0.95, 1], [1.2, 0]],
    clip: clip([
      k(0, { torso: [0.1, -0.2, 0], uArmR: [-0.6, 0, -0.5], fArmR: [-0.4, 0, 0], uArmL: [-0.6, 0, 0.5], fArmL: [-0.4, 0, 0], y: -0.18, ...LEGS_WIDE }),
      k(0.3, { torso: [0.15, 0, 0], ...VSBR_POSE, head: [0.05, 0, 0], y: -0.3 }),
      k(0.95, { torso: [0.15, 0, 0], y: -0.3 }),
      k(1.2, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.6, 0, 0], uArmL: [-0.4, 0, 0.3], fArmL: [-0.6, 0, 0], y: -0.15 }),
    ]),
    ev: [[0.02, 'flash', 'mepe'], [0.24, 'flash', 'mepe']],
    shots: [{ t: 0.56, kind: 'cshot' }],
    chargeFx: [0.0, 0.52, 'vsbr'],
    sfxs: [[0.22, 'vsbr']],
  },

  // J K: a cut, the beam shield ground into the target, a launching kick, then the rifle fired up into the target as
  // it goes up (Reborn; the DWG2/3 list: the beam shield, then one rifle shot).
  C2: {
    dur: 1.7, chain: 1.45, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.26, null], [1.0, 'rifle']],
    lunge: [[0.02, 0], [0.14, 1.2], [0.3, 1.2], [0.42, 2.0]],
    clip: clip([
      k(0, { torso: [0.2, 0.7, 0], uArmR: [-0.3, 1.8, -1.2], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.6, 0, 0.5], y: -0.25, ...LEGS_LUNGE_L }),
      k(0.12, { torso: [0.15, -0.8, 0], uArmR: [-0.4, -0.4, -1.25], fArmR: [-0.2, 0, 0], y: -0.3, ...LEGS_LUNGE_R }, 'snap'),
      k(0.3, { torso: [0.25, -0.6, 0], uArmL: [-1.55, 0.2, 0.15], fArmL: [-0.1, 0, 0], handL: [0, 0, 0], uArmR: [-0.2, 0, -0.5], fArmR: [-0.8, 0, 0], hand: [0.4, 0, 0], y: -0.35, ...LEGS_LUNGE_L }, 'snap'),
      ...[0.4, 0.5, 0.6, 0.7].map((t, i) => k(t, { torso: [0.3, i % 2 ? -0.5 : -0.65, 0], uArmL: [-1.6, i % 2 ? 0.1 : 0.25, 0.15] }, 'snap')),
      k(0.78, { torso: [-0.2, -0.3, 0], uArmL: [-0.8, 0, 0.5], fArmL: [-0.6, 0, 0], thighR: [-1.9, 0, -0.1], shinR: [0.2, 0, 0], thighL: [0.2, 0, 0.1], shinL: [0.4, 0, 0], y: -0.05 }),
      k(0.86, { torso: [-0.4, -0.2, 0], thighR: [-2.3, 0, -0.1], shinR: [0, 0, 0] }, 'snap'),
      k(1.05, { ...RIFLE, torso: [-0.25, -0.5, 0], head: [-0.4, -0.3, 0], y: -0.15, ...LEGS_WIDE }),
      k(1.3, { ...RIFLE, torso: [-0.25, -0.5, 0], head: [-0.4, -0.3, 0], y: -0.15 }),
      k(1.7, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], y: -0.12 }),
    ]),
    hits: [
      { t: 0.06, t1: 0.16, shape: 'arc', range: 4.6, arc: 160, dmg: 20, kb: 1, up: 0 },
      ...every(0.32, 0.74, 0.1, { shape: 'line', len: 3.8, width: 3.0, dmg: 7, kb: 0.3, up: 0, pull: 1.2, stop: 1 }),
      { t: 0.8, t1: 0.9, shape: 'arc', range: 4.2, arc: 130, dmg: 30, kb: 2, up: 12, big: true },
    ],
    ev: [[0.2, 'flash', 'mepe'], ...[0.34, 0.44, 0.54, 0.64].map((t) => [t, 'grind'])],
    shots: [{ t: 1.2, kind: 'up' }],
    sfxs: [[0.04, 'slash_a'], [0.78, 'phit']],
  },

  // J J K: a cut and a launching slash, then the VSBR swing forward and one fires, straight up into the target (Reborn;
  // the DWG2/3 list: a shot from the left VSBR).
  C3: {
    dur: 1.5, chain: 1.3, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.62, null]], vsbr: [[0.5, 0], [0.8, 0.62], [1.2, 0.62], [1.5, 0]],
    lunge: [[0.02, 0], [0.14, 1.2], [0.3, 1.2], [0.42, 1.8]],
    clip: clip([
      k(0, { torso: [0.1, -1.0, 0], ...SWEEP_R, uArmL: [-0.7, 0, 0.4], y: -0.15, ...LEGS_WIDE }),
      k(0.12, { torso: [0.15, 0.9, 0], ...SWEEP_L, uArmL: [-0.25, 0, 0.8], y: -0.28, ...LEGS_LUNGE_R }, 'snap'),
      k(0.32, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.45, ...LEGS_LUNGE_R }),
      k(0.44, { torso: [-0.35, 0.2, 0], uArmR: [-2.8, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.75], y: -0.05, ...LEGS_WIDE }, 'snap'),
      k(0.75, { torso: [-0.3, 0, 0], ...VSBR_POSE, head: [-0.45, 0, 0], y: -0.2 }),
      k(1.2, { torso: [-0.3, 0, 0], head: [-0.45, 0, 0], y: -0.2 }),
      k(1.5, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], uArmL: [-0.4, 0, 0.3], fArmL: [-0.8, 0, 0], y: -0.15 }),
    ]),
    hits: [
      { t: 0.06, t1: 0.16, shape: 'arc', range: 4.6, arc: 170, dmg: 20, kb: 1, up: 0 },
      { t: 0.42, t1: 0.54, shape: 'arc', range: 4.6, arc: 150, dmg: 28, kb: 1, up: 11, big: true },
    ],
    ev: [[0.28, 'flash', 'mepe']],
    shots: [{ t: 0.92, kind: 'vsbrUp' }],
    sfxs: [[0.04, 'slash_a'], [0.4, 'slash_rise'], [0.88, 'vsbr']],
  },

  // J J J K: both beam sabers out, spun as vertical wheels at the suit's sides while it glides forward through the
  // target, then a dual spinning cut as it lands (Reborn; the DWG2/3 list has the same move).
  C4: {
    dur: 2.3, chain: 2.1, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.16, 'sabers']],
    lunge: [[0.22, 0], [1.55, 6.5]],
    air: [[0.18, 0], [0.4, 0.9], [1.5, 1.0], [1.7, 0]],
    jets: [0.22, 1.55, false],
    clip: clip([
      k(0, { torso: [0.1, -0.2, 0], uArmR: [-0.9, 0.4, -0.3], fArmR: [-0.9, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.9, -0.4, 0.3], fArmL: [-0.9, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.22, { torso: [0.25, 0, 0], uArmR: [0, 0, -1.5], fArmR: [0, 0, 0], hand: [0, 0, 0], uArmL: [0, 0, 1.5], fArmL: [0, 0, 0], head: [-0.1, 0, 0], y: 0, ...LEGS_AIR }),
      k(1.55, { fArmR: [0, PI * 14, 0], fArmL: [0, -PI * 14, 0] }, 'linear'),
      k(1.7, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.3], fArmL: [-0.15, 0, 0], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(1.98, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(2.3, { yaw: PI * 2, torso: [0.15, -0.2, 0], uArmR: [-0.5, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.5, 0, 0], uArmL: [-0.4, 0, 0.3], fArmL: [-0.8, 0, 0], y: -0.15 }),
    ]),
    hits: [
      ...every(0.3, 1.55, 0.12, { shape: 'arc', range: 4.6, arc: 240, dmg: 9, kb: 0.6, up: 0.8, pull: 1.4, stop: 1 }),
      { t: 1.72, t1: 1.98, shape: 'arc', range: 4.8, arc: 360, dmg: 34, kb: 8, up: 5, big: true },
    ],
    ev: [[0.14, 'flash', 'mepe']],
    sfxs: [...times(0.3, 1.55, 0.25).map((t) => [t, 'slash_fast']), [1.72, 'slash_spin']],
  },

  // J J J J K: a spinning cut, then a lifting stab that drives through the target and carries both up into the air
  // (Reborn; the DWG2/3 list: a lifting stab that pierces and goes airborne).
  C5: {
    dur: 1.9, chain: 1.72, saber: true, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.02, 0], [0.14, 1.0], [0.46, 1.0], [0.62, 3.4]],
    air: [[0.5, 0], [0.9, 4.2], [1.2, 4.4], [1.6, 0]],
    jets: [0.48, 1.0, true],
    clip: clip([
      k(0, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.25], y: -0.28, yaw: 0, ...LEGS_WIDE }),
      k(0.3, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.46, { yaw: PI * 2, torso: [0.45, -0.3, 0], uArmR: [0.2, 0, -0.3], fArmR: [-1.6, 0, 0], hand: [1.6, 0, 0], uArmL: [-0.6, 0, 0.4], y: -0.45, ...LEGS_LUNGE_R }),
      k(0.58, { yaw: PI * 2, torso: [-0.3, 0, 0], uArmR: [-2.4, 0, -0.1], fArmR: [0, 0, 0], hand: [0.7, 0, 0], uArmL: [-0.3, 0, 0.8], y: 0, ...LEGS_AIR }, 'snap'),
      k(1.2, { yaw: PI * 2, torso: [-0.2, 0, 0], uArmR: [-2.6, 0, -0.1] }),
      k(1.6, { yaw: PI * 2, torso: [0.5, 0, 0], uArmR: [-0.7, 0, -0.1], fArmR: [-0.4, 0, 0], hand: [1.1, 0, 0], y: -0.6, ...LEGS_KNEEL }, 'in'),
      k(1.9, { yaw: PI * 2, torso: [0.15, -0.2, 0], uArmR: [-0.5, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.5, 0, 0], y: -0.15, ...LEGS_WIDE }),
    ]),
    hits: [
      { t: 0.05, t1: 0.3, shape: 'arc', range: 4.4, arc: 360, dmg: 16, kb: 1, up: 1 },
      { t: 0.52, t1: 0.66, shape: 'line', len: 5.2, width: 2.6, dmg: 26, kb: 0.5, up: 14, pull: 1.5, big: true },
      ...every(0.7, 1.1, 0.1, { shape: 'circle', range: 3.8, hy: 6, dmg: 7, kb: 0.3, up: 2.5, sp: false }),
    ],
    ev: [[0.28, 'flash', 'mepe'], [1.6, 'land']],
    sfxs: [[0.04, 'slash_spin'], [0.5, 'slash_dash']],
  },

  // J J J J J K: a cut, then a sidestep up into a hover, gliding to one side while the VSBR fire three volleys down at
  // the target (Reborn; the DWG2/3 list: glides in one direction shooting three VSBR shots).
  C6: {
    dur: 2.1, chain: 1.9, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.42, null]], vsbr: [[0.35, 0], [0.62, 1], [1.7, 1], [2.0, 0]],
    lunge: [[0.02, 0], [0.14, 1.2]],
    air: [[0.38, 0], [0.62, 2.4], [1.6, 2.6], [1.9, 0]],
    jets: [0.38, 1.7, true],
    glide: [0.45, 1.7, 4.5],
    clip: clip([
      k(0, { torso: [0.12, 0.8, 0], ...SWEEP_L, uArmR: [-0.3, 1.85, -1.25], fArmR: [-0.3, 0, 0], y: -0.24, ...LEGS_LUNGE_R }),
      k(0.12, { torso: [0.0, -1.0, 0.1], uArmR: [-0.3, -0.5, -1.25], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.2, 0, 0.55], y: -0.28, ...LEGS_LUNGE_L }, 'snap'),
      k(0.4, { torso: [0.1, 0, -0.25], uArmR: [-0.5, 0, -0.6], fArmR: [-0.5, 0, 0], uArmL: [-0.5, 0, 0.6], fArmL: [-0.5, 0, 0], y: -0.3, ...LEGS_WIDE }),
      k(0.62, { torso: [0.35, 0, -0.1], ...VSBR_POSE, head: [0.3, 0, 0], y: 0, ...LEGS_AIR }),
      ...[0.75, 1.1, 1.45].flatMap((t) => [k(t, { torso: [0.35, 0, -0.1] }), k(t + 0.05, { torso: [0.28, 0, -0.1] }, 'snap'), k(t + 0.2, { torso: [0.35, 0, -0.1] })]),
      k(1.9, { torso: [0.4, 0, 0], uArmR: [-0.4, 0, -0.5], uArmL: [-0.4, 0, 0.5], y: -0.4, ...LEGS_KNEEL }, 'in'),
      k(2.1, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.7, 0, 0], uArmL: [-0.4, 0, 0.3], fArmL: [-0.8, 0, 0], y: -0.15, ...LEGS_WIDE }),
    ]),
    hits: [{ t: 0.06, t1: 0.16, shape: 'arc', range: 4.8, arc: 190, dmg: 22, kb: 3, up: 0 }],
    ev: [[0.3, 'flash', 'mepe'], [1.9, 'land']],
    shots: [0.75, 1.1, 1.45].map((t) => ({ t, kind: 'vsbr' })),
    sfxs: [[0.04, 'slash_b'], ...[0.73, 1.08, 1.43].map((t) => [t, 'vsbr'])],
  },

  // ---- boost dash: paired saber cuts (keep pressing J), ending in a launcher or the beam launcher ----
  DA: {
    dur: 0.34, chain: 0.2, saber: true, rate: 1, next: 'DA', charge: 'DC', armor: true, rush: true,
    slide: [0, 0.34, 6.6],
    jets: [0, 0.34, false],
    clip: clip([
      k(0, { torso: [0.32, -0.85, 0], ...SWEEP_R, uArmL: [-0.9, 0, 0.45], y: -0.32, ...LEGS_LUNGE_L }),
      k(0.09, { torso: [0.36, 0.85, 0], ...SWEEP_L, uArmL: [-0.2, 0, 0.8], y: -0.36, ...LEGS_LUNGE_R }, 'snap'),
      k(0.18, { torso: [0.28, 0.9, 0], uArmR: [-0.3, 1.85, -1.25], fArmR: [-0.3, 0, 0] }),
      k(0.28, { torso: [0.32, -0.9, 0], uArmR: [-0.4, -0.4, -1.25], fArmR: [-0.2, 0, 0], y: -0.32, ...LEGS_LUNGE_L }, 'snap'),
      k(0.34, { torso: [0.32, -0.85, 0] }),
    ]),
    hits: [
      { t: 0.03, t1: 0.11, shape: 'arc', range: 4.6, arc: 190, dmg: 12, kb: 1.3, up: 0, pull: 1, stop: 1 },
      { t: 0.2, t1: 0.29, shape: 'arc', range: 4.6, arc: 190, dmg: 12, kb: 1.3, up: 0, pull: 1, stop: 1 },
    ],
    sfxs: [[0.02, 'slash_fast'], [0.18, 'slash_fast']],
  },
  DAF: {
    dur: 0.66, chain: 0.46, saber: true, rate: 1, next: null, charge: null, armor: true,
    slide: [0, 0.18, 5.6],
    jets: [0, 0.18, false],
    clip: clip([
      k(0, { torso: [0.32, -0.3, 0], uArmR: [0.65, 0, -0.3], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.45, ...LEGS_LUNGE_R }),
      k(0.15, { torso: [-0.32, 0.2, 0], uArmR: [-2.8, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.75], y: 0, ...LEGS_WIDE }, 'snap'),
      k(0.66, { torso: [0.1, 0, 0], uArmR: [-0.55, 0, -0.3] }),
    ]),
    hits: [{ t: 0.05, t1: 0.16, shape: 'arc', range: 4.8, arc: 200, dmg: 30, kb: 4, up: 11, big: true }],
    sfx: 'slash_rise', swing: 0.04,
  },
  // Dash charge: a long saber flurry on the rush, a rising cut that launches, then the beam launcher fired up into the
  // target (Reborn; the DWG2/3 list: one beam launcher shot).
  DC: {
    dur: 2.7, chain: 2.45, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [1.72, 'launcher']],
    lunge: [[0, 0], [1.4, 2.6], [1.5, 2.6], [1.6, 3.4]],
    jets: [0, 1.4, false],
    clip: clip([
      ...times(0, 1.4, 0.24).flatMap((t) => [
        k(t, { torso: [0.3, -0.85, 0], ...SWEEP_R, uArmL: [-0.9, 0, 0.45], y: -0.32, ...LEGS_LUNGE_L }),
        k(t + 0.1, { torso: [0.34, 0.85, 0], ...SWEEP_L, uArmL: [-0.2, 0, 0.8], y: -0.36, ...LEGS_LUNGE_R }, 'snap'),
        k(t + 0.22, { torso: [0.3, -0.85, 0], uArmR: [-0.4, -0.4, -1.25], fArmR: [-0.2, 0, 0], y: -0.32, ...LEGS_LUNGE_L }, 'snap'),
      ]),
      k(1.5, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.45, ...LEGS_LUNGE_R }),
      k(1.6, { torso: [-0.35, 0.2, 0], uArmR: [-2.8, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.75], y: -0.05, ...LEGS_WIDE }, 'snap'),
      k(1.85, { ...LAUNCH, torso: [-0.2, -0.35, 0], head: [-0.4, -0.3, 0], y: -0.25, ...LEGS_WIDE }),
      k(2.2, { ...LAUNCH, torso: [-0.2, -0.35, 0], head: [-0.4, -0.3, 0], y: -0.25 }),
      k(2.7, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.9, 0, 0], hand: [0.9, 0, 0], y: -0.1 }),
    ]),
    hits: [
      ...every(0.05, 1.45, 0.12, { shape: 'arc', range: 4.6, arc: 200, dmg: 8, kb: 0.6, up: 0, pull: 1.2, stop: 1 }),
      { t: 1.58, t1: 1.7, shape: 'arc', range: 4.6, arc: 160, dmg: 28, kb: 1, up: 12, big: true },
    ],
    ev: [[0.02, 'flash', 'mepe'], [1.46, 'flash', 'mepe']],
    shots: [{ t: 2.0, kind: 'blastUp' }],
    sfxs: [...times(0.04, 1.4, 0.24).flatMap((t) => [[t, 'slash_fast'], [t + 0.12, 'slash_fast']]), [1.56, 'slash_rise']],
  },

  // ---- aerial ----
  JA: {
    dur: 0.46, chain: 0.28, saber: true, next: null, charge: null, isAir: true,
    clip: clip([
      k(0, { torso: [-0.3, -0.2, 0], uArmR: [-2.8, 0, -0.2], hand: [0.3, 0, 0], thighR: [-1.0, 0, 0], shinR: [1.4, 0, 0], thighL: [-0.3, 0, 0], shinL: [1.0, 0, 0] }),
      k(0.16, { torso: [0.55, 0, 0], uArmR: [-0.9, 0, -0.1], hand: [0.7, 0, 0] }, 'snap'),
      k(0.46, { torso: [0.3, 0, 0] }),
    ]),
    hits: [{ t: 0.05, t1: 0.18, shape: 'arc', range: 4.6, arc: 150, dmg: 24, kb: 4, up: 4, hy: 5 }],
    sfx: 'slash_a', swing: 0.05,
  },
  JC: {
    dur: 0.7, chain: 0.56, saber: true, next: null, charge: null, isAir: true, plunge: true,
    clip: clip([
      k(0, { torso: [0.6, 0, 0], uArmR: [-2.4, 0, -0.1], fArmR: [0, 0, 0], hand: [1.4, 0, 0], thighR: [-1.4, 0, 0], shinR: [2.0, 0, 0], thighL: [-1.4, 0, 0], shinL: [2.0, 0, 0] }),
      k(0.24, { torso: [0.8, 0, 0], uArmR: [-1.0, 0, 0], hand: [2.0, 0, 0] }),
      k(0.38, { torso: [0.6, 0, 0], y: -0.55, ...LEGS_WIDE }),
      k(0.7, { torso: [0.3, 0, 0], y: -0.28 }),
    ]),
    hits: [{ t: 0, t1: 9, shape: 'circle', range: 5.4, dmg: 36, kb: 8, up: 8, big: true, onLand: true }],
  },

  // ---- SP attacks ----
  // Ground: a starburst, a long flurry of drawn-out saber sweeps across the field, then a cross-slash finisher and the
  // M.E.P.E. flash. Hold SP through the starburst for the charge SP: the VSBR swing forward and pour one sustained,
  // steerable mega-beam ahead (longer per stock), ending in a full-power blast and the M.E.P.E. peel. In the air: hover
  // inside a swirling M.E.P.E. afterimage sphere that pulls in and hits everything around it.
  SP_IN: {
    dur: 0.5, rate: 1, saber: true, armor: true, invuln: true, sp: true, spNext: 'SP_FL', spHold: 'SPC_CH',
    clip: clip([
      k(0, { torso: [0, 0, 0], uArmR: [-0.2, 0, -0.3], hand: [0.2, 0, 0] }),
      k(0.2, { torso: [-0.2, 0.3, 0], uArmR: [-2.8, 0, -0.3], fArmR: [0, 0, 0], hand: [0, 0, 0], uArmL: [-0.2, 0, 0.8], head: [-0.2, 0, 0], y: -0.18, ...LEGS_WIDE }, 'snap'),
      k(0.5, { torso: [-0.25, 0.35, 0] }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SP_FL: {
    dur: 3.2, rate: 1, saber: true, armor: true, invuln: true, sp: true, loop: 0.28, rushFx: true, steer: 2.2, spNext: 'SP_FIN',
    clip: clip([
      k(0, { torso: [0.15, -0.85, 0], ...SWEEP_R, uArmL: [-0.8, 0, 0.45], y: -0.28, ...LEGS_WIDE }),
      k(0.07, { torso: [0.15, 0.85, 0], ...SWEEP_L, uArmL: [-0.25, 0, 0.8], y: -0.32 }, 'snap'),
      k(0.14, { torso: [-0.2, 0.45, 0], uArmR: [-2.5, 0.45, -0.4], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.18 }, 'snap'),
      k(0.21, { torso: [0.35, -0.4, 0], uArmR: [-0.75, -0.2, -0.3], fArmR: [-0.1, 0, 0], hand: [0.85, 0, 0], y: -0.35 }, 'snap'),
      k(0.28, { torso: [0.15, -0.85, 0], ...SWEEP_R, y: -0.28 }),
    ]),
    hits: [
      ...every(0.05, 3.1, 0.07, { shape: 'arc', range: 6.4, arc: 240, dmg: 8, kb: 0.5, up: 0.4, pull: 1.1, sp: true }),
      { t: 3.1, t1: 3.18, shape: 'arc', range: 6.6, arc: 260, dmg: 14, kb: 3, up: 2, sp: true },
    ],
    sfxs: [0.02, 0.09, 0.16, 0.23].flatMap((o) => times(0, 3.1, 0.28).map((t) => [t + o, 'slash_fast'])),
  },
  SP_FIN: { // the VSBR swing forward for one last cross-slash, ending in an M.E.P.E. flash
    dur: 1.0, rate: 1, saber: true, armor: true, invuln: true, sp: true,
    wpn: [[0, 'saber']], vsbr: [[0, 0], [0.3, 1], [0.7, 0]],
    clip: clip([
      k(0, { torso: [0.2, -0.3, 0], ...VSBR_POSE, y: -0.15, ...LEGS_WIDE }),
      k(0.3, { torso: [-0.35, 0, 0], uArmR: [-2.6, 0, -0.2], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-2.6, 0, 0.2], fArmL: [-0.4, 0, 0], y: 0, ...LEGS_AIR }, 'snap'),
      k(0.6, { torso: [0.6, 0, 0], uArmR: [-0.6, 0, -0.2], fArmR: [-0.5, 0, 0], uArmL: [-0.6, 0, 0.2], fArmL: [-0.5, 0, 0], y: -0.5, ...LEGS_KNEEL }, 'in'),
      k(1.0, { torso: [0.4, -0.1, 0], y: -0.3, ...LEGS_WIDE }),
    ]),
    hits: [
      { t: 0.24, t1: 0.34, shape: 'circle', range: 5.4, dmg: 55, kb: 3, up: 4, sp: true },
      { t: 0.6, t1: 0.7, shape: 'circle', range: 6.4, dmg: 150, kb: 10, up: 10, big: true, sp: true },
    ],
    ev: [[0.0, 'flash', 'mepe'], [0.28, 'burst']],
    sfxs: [[0.05, 'vsbr']],
  },
  SPA_IN: {
    dur: 0.5, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spNext: 'SPA_LOOP',
    jets: [0, 0.5, true],
    air: [[0, 0], [0.5, 2]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -0.5], uArmL: [-0.3, 0, 0.5], ...LEGS_AIR }),
      k(0.3, { torso: [0.15, 0, 0], uArmR: [-0.15, 0, -0.9], fArmR: [-0.3, 0, 0], uArmL: [-0.15, 0, 0.9], fArmL: [-0.3, 0, 0], ...LEGS_AIR }),
      k(0.5, { torso: [0.15, 0, 0], uArmR: [-0.15, 0, -0.9], uArmL: [-0.15, 0, 0.9], ...LEGS_AIR }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SPA_LOOP: { // hover in place inside a slowly swirling M.E.P.E. afterimage sphere that pulls in and hits all round it
    dur: 0.7, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spRepeat: 8,
    jets: [0, 0.7, true], // no air curve: each pass would stack it on the last (the hero's hover holds the height)
    clip: clip([
      k(0, { torso: [0.15, 0, 0], uArmR: [-0.15, 0, -0.9], fArmR: [-0.3, 0, 0], uArmL: [-0.15, 0, 0.9], fArmL: [-0.3, 0, 0], ...LEGS_AIR }),
      k(0.35, { torso: [0.2, 0, 0] }, 'smooth'),
      k(0.7, { torso: [0.15, 0, 0] }),
    ]),
    ev: [[0.05, 'mepe'], [0.3, 'sphere']],
  },
  SPC_CH: { // the VSBR swing forward and charge while SP is held (each spcStep commits another stock)
    dur: 1.0, rate: 1, armor: true, invuln: true, sp: true, chargeAura: true, spNext: 'SPC_BEAM',
    wpn: [[0, null]], vsbr: [[0, 0], [0.5, 1]],
    clip: clip([
      k(0, { torso: [-0.2, 0.3, 0], uArmR: [-2.8, 0, -0.3], hand: [0, 0, 0], uArmL: [-2.6, 0, 0.3], y: -0.18, ...LEGS_WIDE }),
      k(0.4, { torso: [0.3, 0, 0], ...VSBR_POSE, head: [0.1, 0, 0], y: -0.4, ...LEGS_WIDE }),
      k(1.0, { torso: [0.35, 0, 0], y: -0.45 }),
    ]),
    ev: [[0.02, 'charge'], [0.95, 'burst']],
  },
  SPC_BEAM: { // the twin VSBR pour one sustained mega-beam ahead, steered with the stick: ~3.6 s a stock in the footage
    dur: 1.2, rate: 1, armor: true, invuln: true, sp: true, steer: 0.5, rushFx: true, spNext: 'SPC_END',
    stockDur: [3.6, 7.3, 10.9],
    wpn: [[0, null]], vsbr: [[0, 1]],
    clip: clip([
      k(0, { torso: [0.3, 0, 0], ...VSBR_POSE, head: [0.1, 0, 0], y: -0.45, ...LEGS_WIDE }),
      k(0.6, { torso: [0.34, 0, 0.03], y: -0.47 }),
      k(1.2, { torso: [0.3, 0, 0], y: -0.45 }),
    ]),
    shots: times(0, 1.2, 0.12).map((t) => ({ t, kind: 'mega' })),
    sfxs: times(0, 1.2, 0.3).map((t) => [t, 'vsbr']),
  },
  SPC_END: { // the beam ends in one last full-power blast, then the M.E.P.E. peel sheds green afterimages
    dur: 1.4, rate: 1, armor: true, invuln: true, sp: true,
    stockPower: [1, 1.3, 1.6],
    wpn: [[0, null]], vsbr: [[0, 1], [0.9, 1], [1.2, 0]],
    clip: clip([
      k(0, { torso: [0.35, 0, 0], ...VSBR_POSE, y: -0.45, ...LEGS_WIDE }),
      k(0.18, { torso: [0.42, 0, 0], y: -0.5 }),
      k(0.9, { torso: [0.2, 0, 0], uArmR: [-0.3, 0, -0.9], uArmL: [-0.3, 0, 0.9], y: -0.3 }),
      k(1.4, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.6, 0, 0], uArmL: [-0.4, 0, 0.3], fArmL: [-0.6, 0, 0], y: -0.15 }),
    ]),
    shots: [{ t: 0.2, kind: 'megaEnd' }],
    ev: [[0.12, 'flash', 'mepe'], [0.7, 'mepe'], [1.0, 'mepe']],
  },
};

// timed effects and sounds fire in order
for (const m of Object.values(MOVES)) for (const key of ['ev', 'sfxs']) m[key]?.sort((a, b) => a[0] - b[0]);
