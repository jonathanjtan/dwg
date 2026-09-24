// Gundam moveset: keyframed poses + hit timing, Dynasty Warriors style.
// Normal string N1..N6 on attack; charge attack C(n+1) on charge after n normals.
import { Clip, poseFrom } from '../core/rig.js';

const PI = Math.PI;

// Ready stance: saber low and forward, shield up.
export const STANCE = poseFrom({
  y: -0.1,
  hips: [0, 0, 0],
  torso: [0.1, -0.2, 0],
  head: [-0.08, 0.18, 0],
  uArmR: [-0.35, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.35, 0, 0],
  uArmL: [-0.55, 0, 0.3], fArmL: [-1.1, 0, 0], handL: [0, 0.2, 0],
  thighR: [-0.3, 0, -0.12], shinR: [0.42, 0, 0],
  thighL: [-0.05, 0, 0.12], shinL: [0.32, 0, 0],
});

const k = (t, p, e) => ({ t, p, e });
const clip = (keys) => new Clip(keys, STANCE);

const LEGS_LUNGE_R = { thighR: [-0.9, 0, -0.1], shinR: [0.9, 0, 0], thighL: [0.45, 0, 0.1], shinL: [0.35, 0, 0] };
const LEGS_LUNGE_L = { thighL: [-0.9, 0, 0.1], shinL: [0.9, 0, 0], thighR: [0.45, 0, -0.1], shinR: [0.35, 0, 0] };
const LEGS_WIDE = { thighR: [-0.2, 0, -0.45], shinR: [0.6, 0, 0], thighL: [-0.2, 0, 0.45], shinL: [0.6, 0, 0] };

// hit: { t, t1, shape, range, arc, len, width, off, dmg, kb, up, sfx, big }
export const MOVES = {
  N1: {
    dur: 0.46, chain: 0.2, next: 'N2', charge: 'C2', saber: true,
    lunge: [[0.04, 0], [0.16, 1.6]],
    clip: clip([
      k(0, { torso: [0.1, -1.0, 0], uArmR: [0, 0.1, -1.35], fArmR: [-0.3, 0, 0], hand: [1.1, 0, 0], uArmL: [-0.9, 0, 0.5], y: -0.15 }),
      k(0.07, { torso: [0.12, -1.1, 0], uArmR: [0, -0.05, -1.4] }),
      k(0.17, { torso: [0.15, 0.95, 0], uArmR: [0, 1.9, -1.35], fArmR: [-0.15, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.3, 0, 0.9], y: -0.3, ...LEGS_LUNGE_R }, 'snap'),
      k(0.46, { torso: [0.12, 0.5, 0], uArmR: [-0.3, 1.2, -1.0], hand: [0.8, 0, 0], y: -0.22 }),
    ]),
    hits: [{ t: 0.08, t1: 0.19, shape: 'arc', range: 3.9, arc: 170, dmg: 26, kb: 4, up: 0 }],
    swing: 0.08,
  },
  N2: {
    dur: 0.46, chain: 0.2, next: 'N3', charge: 'C3', saber: true,
    lunge: [[0.03, 0], [0.15, 1.5]],
    clip: clip([
      k(0, { torso: [0.12, 0.8, 0], uArmR: [-0.3, 1.9, -1.3], fArmR: [-0.3, 0, 0], hand: [1.1, 0, 0], y: -0.25, ...LEGS_LUNGE_R }),
      k(0.06, { torso: [0.14, 0.9, 0] }),
      k(0.16, { torso: [0.0, -1.0, 0.1], uArmR: [-0.6, -0.3, -1.2], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.2, 0, 0.6], y: -0.3, ...LEGS_LUNGE_L }, 'snap'),
      k(0.46, { torso: [0.05, -0.6, 0.05], uArmR: [-0.5, 0, -0.9], hand: [0.8, 0, 0] }),
    ]),
    hits: [{ t: 0.07, t1: 0.18, shape: 'arc', range: 3.9, arc: 170, dmg: 26, kb: 4.5, up: 0 }],
    swing: 0.07,
  },
  N3: {
    dur: 0.52, chain: 0.24, next: 'N4', charge: 'C4', saber: true,
    lunge: [[0.06, 0], [0.2, 1.8]],
    clip: clip([
      k(0, { torso: [-0.25, -0.2, 0], uArmR: [-2.9, 0, -0.25], fArmR: [-0.3, 0, 0], hand: [0.3, 0, 0], uArmL: [-0.3, 0, 0.5], y: -0.05, head: [0.1, 0, 0] }),
      k(0.09, { torso: [-0.35, -0.25, 0], uArmR: [-3.1, 0, -0.2] }),
      k(0.2, { torso: [0.55, 0, 0], uArmR: [-0.7, 0, -0.1], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.45, head: [-0.3, 0, 0], ...LEGS_LUNGE_R }, 'snap'),
      k(0.52, { torso: [0.35, 0, 0], uArmR: [-0.6, 0, -0.2], y: -0.3 }),
    ]),
    hits: [{ t: 0.12, t1: 0.22, shape: 'arc', range: 4.3, arc: 110, dmg: 32, kb: 6, up: 0 }],
    swing: 0.1,
  },
  N4: {
    dur: 0.62, chain: 0.34, next: 'N5', charge: 'C5', saber: true,
    lunge: [[0.05, 0], [0.4, 1.2]],
    clip: clip([
      k(0, { torso: [0.1, -0.6, 0], uArmR: [0, 0.3, -1.45], fArmR: [0, 0, 0], hand: [1.3, 0, 0], uArmL: [0, 0, 1.3], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.08, { yaw: -0.4, y: -0.35 }),
      k(0.4, { yaw: PI * 2, torso: [0.1, 0.4, 0], y: 0.15 }, 'linear'),
      k(0.62, { yaw: PI * 2, torso: [0.1, 0.2, 0], uArmR: [-0.3, 0.8, -1.2], y: -0.2 }),
    ]),
    hits: [{ t: 0.12, t1: 0.4, shape: 'arc', range: 4.4, arc: 360, dmg: 30, kb: 7, up: 2 }],
    swing: 0.1,
  },
  N5: {
    dur: 0.56, chain: 0.3, next: 'N6', charge: 'C6', saber: true,
    lunge: [[0.1, 0], [0.22, 3.4]],
    clip: clip([
      k(0, { torso: [0.05, -0.8, 0], uArmR: [-0.8, 0, -0.4], fArmR: [-1.8, 0, 0], hand: [1.8, 0, 0], uArmL: [-1.2, 0, 0.4], y: -0.25, ...LEGS_LUNGE_L }),
      k(0.1, { torso: [0.08, -0.95, 0] }),
      k(0.2, { torso: [0.25, 0.35, 0], uArmR: [-1.6, 0, 0.05], fArmR: [0, 0, 0], hand: [1.55, 0, 0], uArmL: [0.3, 0, 0.5], y: -0.4, ...LEGS_LUNGE_R }, 'snap'),
      k(0.56, { torso: [0.2, 0.2, 0], uArmR: [-1.3, 0, -0.1], y: -0.3 }),
    ]),
    hits: [{ t: 0.12, t1: 0.26, shape: 'line', len: 6.2, width: 2.2, dmg: 34, kb: 9, up: 1 }],
    swing: 0.12,
  },
  N6: {
    dur: 0.9, chain: 0.7, next: null, charge: null, saber: true,
    lunge: [[0.05, 0], [0.36, 2.6]],
    air: [[0, 0], [0.2, 2.4], [0.36, 0]],
    clip: clip([
      k(0, { torso: [-0.2, 0, 0], uArmR: [-0.4, 0, -0.3], hand: [0.5, 0, 0], y: -0.4, ...LEGS_WIDE }),
      k(0.18, { torso: [-0.45, 0, 0], uArmR: [-3.2, 0, -0.1], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], uArmL: [-2.8, 0, 0.1], fArmL: [-0.3, 0, 0], thighR: [-1.2, 0, 0], shinR: [1.6, 0, 0], thighL: [-0.6, 0, 0], shinL: [1.2, 0, 0], y: 0 }),
      k(0.36, { torso: [0.75, 0, 0], uArmR: [-0.4, 0, -0.1], fArmR: [0, 0, 0], hand: [0.6, 0, 0], uArmL: [-0.4, 0, 0.4], y: -0.7, head: [-0.3, 0, 0], ...LEGS_WIDE }, 'in'),
      k(0.9, { torso: [0.5, 0, 0], y: -0.5 }),
    ]),
    hits: [{ t: 0.34, t1: 0.4, shape: 'circle', range: 5.6, off: 2.2, dmg: 48, kb: 9, up: 9, big: true }],
    slam: 0.35,
    swing: 0.22,
  },

  // ---- charge attacks ----
  C1: {
    dur: 0.5, chain: 0.3, rifle: true, next: null, charge: 'C1', maxRepeat: 3,
    clip: clip([
      k(0, { torso: [0, -0.5, 0], uArmR: [-1.4, 0, 0.1], fArmR: [-0.2, 0, 0], hand: [1.5, 0, 0], uArmL: [-0.8, 0, 0.2], head: [0, -0.4, 0] }),
      k(0.12, { torso: [0, -0.6, 0], uArmR: [-1.57, 0, 0.12], fArmR: [0, 0, 0], hand: [1.57, 0, 0] }),
      k(0.18, { torso: [-0.1, -0.55, 0], uArmR: [-1.8, 0, 0.1], hand: [1.4, 0, 0], y: -0.05 }, 'snap'),
      k(0.5, { uArmR: [-1.5, 0, 0.1], hand: [1.55, 0, 0] }),
    ]),
    shots: [{ t: 0.15, kind: 'rifle' }],
  },
  C2: {
    dur: 0.72, chain: 0.55, saber: true, next: null, charge: null,
    lunge: [[0.05, 0], [0.25, 1.4]],
    air: [[0, 0], [0.22, 2.2], [0.5, 1.6], [0.72, 0]],
    clip: clip([
      k(0, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.08, { torso: [0.4, -0.35, 0], uArmR: [0.8, 0, -0.35] }),
      k(0.22, { torso: [-0.35, 0.2, 0], uArmR: [-2.9, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.8], thighR: [-1.2, 0, 0], shinR: [1.5, 0, 0], thighL: [0.2, 0, 0], shinL: [0.4, 0, 0], y: 0 }, 'snap'),
      k(0.72, { torso: [0.1, 0, 0], uArmR: [-0.6, 0, -0.3] }),
    ]),
    hits: [{ t: 0.1, t1: 0.24, shape: 'arc', range: 4.2, arc: 130, dmg: 34, kb: 2, up: 13, big: true }],
    swing: 0.1,
  },
  C3: {
    dur: 1.3, chain: 1.15, saber: true, next: null, charge: null, armor: true,
    lunge: [[0, 0], [1.1, 3.5]],
    clip: clip([
      k(0, { torso: [0.1, -0.4, 0], uArmR: [0, 0.3, -1.5], fArmR: [0, 0, 0], hand: [1.35, 0, 0], uArmL: [0, 0, 1.4], fArmL: [0, 0, 0], y: -0.2, yaw: 0, ...LEGS_WIDE }),
      k(1.05, { yaw: PI * 8, y: 0.05 }, 'linear'),
      k(1.3, { yaw: PI * 8, uArmR: [-0.5, 0.5, -1.0], uArmL: [-0.5, 0, 0.4], fArmL: [-1, 0, 0], y: -0.3 }),
    ]),
    hits: [0.12, 0.26, 0.4, 0.54, 0.68, 0.82].map((t) => ({ t, t1: t + 0.12, shape: 'arc', range: 4.6, arc: 360, dmg: 14, kb: 1.5, up: 1.5, pull: 2 }))
      .concat([{ t: 0.95, t1: 1.08, shape: 'arc', range: 5, arc: 360, dmg: 30, kb: 10, up: 5, big: true }]),
    spinTrail: true,
    swing: 0.12, swingEvery: 0.14,
  },
  C4: {
    dur: 0.9, chain: 0.75, rifle: true, next: null, charge: null,
    clip: clip([
      k(0, { torso: [0, -0.5, 0], uArmR: [-1.57, 0, 0.1], fArmR: [0, 0, 0], hand: [1.57, 0, 0], uArmL: [-0.8, 0, 0.2], ...LEGS_WIDE }),
      k(0.15, { torso: [0, -1.1, 0] }),
      k(0.65, { torso: [0, 0.2, 0] }, 'linear'),
      k(0.9, { torso: [0, 0, 0] }),
    ]),
    shots: [0.15, 0.27, 0.39, 0.51, 0.63].map((t, i) => ({ t, kind: 'rifle', ang: -0.55 + i * 0.275 })),
  },
  C5: {
    dur: 0.8, chain: 0.65, saber: true, next: null, charge: null, armor: true,
    lunge: [[0.1, 0], [0.5, 10]],
    clip: clip([
      k(0, { torso: [0.2, 0.5, 0], uArmL: [-1.45, 0, 0.1], fArmL: [-0.3, 0, 0], handL: [0, 0.9, 0], uArmR: [0.3, 0, -0.4], hand: [0.4, 0, 0], y: -0.3, ...LEGS_LUNGE_L }),
      k(0.12, { torso: [0.5, 0.6, 0], y: -0.45 }),
      k(0.5, { torso: [0.55, 0.6, 0] }),
      k(0.8, { torso: [0.2, 0.2, 0], uArmL: [-0.6, 0, 0.3], y: -0.2 }),
    ]),
    hits: [0.12, 0.22, 0.32, 0.42].map((t) => ({ t, t1: t + 0.1, shape: 'circle', range: 2.8, off: 1.2, dmg: 22, kb: 14, up: 4 })),
    boost: [0.08, 0.5],
    swing: 0.1,
  },
  C6: {
    dur: 1.25, chain: 1.1, rifle: true, next: null, charge: null, armor: true,
    clip: clip([
      k(0, { torso: [0, -0.6, 0], uArmR: [-1.57, 0, 0.1], fArmR: [0, 0, 0], hand: [1.57, 0, 0], uArmL: [-1.3, 0, -0.2], fArmL: [-0.9, 0, 0], ...LEGS_WIDE, y: -0.35 }),
      k(0.45, { torso: [0, -0.65, 0] }),
      k(0.55, { torso: [-0.2, -0.55, 0], uArmR: [-1.8, 0, 0.1], y: -0.3 }, 'snap'),
      k(1.25, { torso: [0, -0.4, 0], uArmR: [-1.4, 0, 0.1] }),
    ]),
    shots: [{ t: 0.45, kind: 'mega' }],
    chargeFx: [0.0, 0.45],
  },

  // ---- aerial ----
  JA: {
    dur: 0.5, chain: 0.3, saber: true, next: null, charge: null, isAir: true,
    clip: clip([
      k(0, { torso: [-0.3, -0.2, 0], uArmR: [-2.9, 0, -0.2], hand: [0.3, 0, 0], thighR: [-1.0, 0, 0], shinR: [1.4, 0, 0], thighL: [-0.3, 0, 0], shinL: [1.0, 0, 0] }),
      k(0.18, { torso: [0.6, 0, 0], uArmR: [-0.6, 0, -0.1], hand: [0.4, 0, 0] }, 'snap'),
      k(0.5, { torso: [0.3, 0, 0] }),
    ]),
    hits: [{ t: 0.06, t1: 0.2, shape: 'arc', range: 4, arc: 150, dmg: 26, kb: 4, up: 4, hy: 4 }],
    swing: 0.06,
  },
  JC: {
    dur: 0.75, chain: 0.6, saber: true, next: null, charge: null, isAir: true, plunge: true,
    clip: clip([
      k(0, { torso: [0.6, 0, 0], uArmR: [-2.4, 0, -0.1], fArmR: [0, 0, 0], hand: [1.5, 0, 0], thighR: [-1.4, 0, 0], shinR: [2.0, 0, 0], thighL: [-1.4, 0, 0], shinL: [2.0, 0, 0] }),
      k(0.25, { torso: [0.8, 0, 0], uArmR: [-1.0, 0, 0], hand: [2.2, 0, 0] }),
      k(0.4, { torso: [0.6, 0, 0], y: -0.6, ...LEGS_WIDE }),
      k(0.75, { torso: [0.3, 0, 0], y: -0.3 }),
    ]),
    hits: [{ t: 0, t1: 9, shape: 'circle', range: 5.5, dmg: 40, kb: 8, up: 8, big: true, onLand: true }],
  },

  // ---- SP attack ----
  SP_IN: {
    dur: 1.0, saber: true, armor: true, invuln: true,
    clip: clip([
      k(0, { torso: [0, 0, 0], uArmR: [-0.2, 0, -0.3], hand: [0.2, 0, 0] }),
      k(0.35, { torso: [-0.2, 0.3, 0], uArmR: [-3.0, 0, -0.35], fArmR: [0, 0, 0], hand: [0, 0, 0], uArmL: [-0.2, 0, 0.9], head: [-0.2, 0, 0], y: -0.2, ...LEGS_WIDE }, 'snap'),
      k(1.0, { torso: [-0.25, 0.35, 0] }),
    ]),
  },
  SP_RUSH_A: {
    dur: 0.2, saber: true, armor: true, invuln: true,
    clip: clip([
      k(0, { torso: [0.1, -1.1, 0], uArmR: [0, 0.1, -1.35], hand: [1.1, 0, 0], ...LEGS_LUNGE_R }),
      k(0.12, { torso: [0.15, 1.0, 0], uArmR: [0, 1.9, -1.35], hand: [1.2, 0, 0] }, 'snap'),
      k(0.2, { torso: [0.12, 0.9, 0] }),
    ]),
  },
  SP_RUSH_B: {
    dur: 0.2, saber: true, armor: true, invuln: true,
    clip: clip([
      k(0, { torso: [0.12, 0.9, 0], uArmR: [-0.3, 1.9, -1.3], hand: [1.1, 0, 0], ...LEGS_LUNGE_L }),
      k(0.12, { torso: [0, -1.0, 0.1], uArmR: [-0.6, -0.3, -1.2], hand: [1.2, 0, 0] }, 'snap'),
      k(0.2, { torso: [0, -0.9, 0.1] }),
    ]),
  },
  SP_END: {
    dur: 1.35, saber: true, armor: true, invuln: true,
    air: [[0, 0], [0.35, 4.5], [0.55, 4.6], [0.75, 0]],
    clip: clip([
      k(0, { torso: [-0.2, 0, 0], uArmR: [-0.5, 0, -0.3], y: -0.4, ...LEGS_WIDE }),
      k(0.4, { torso: [-0.5, 0, 0], uArmR: [-3.1, 0, -0.1], fArmR: [0, 0, 0], hand: [0.15, 0, 0], uArmL: [-3.0, 0, 0.1], fArmL: [-0.2, 0, 0], thighR: [-1.2, 0, 0], shinR: [1.6, 0, 0], thighL: [-0.4, 0, 0], shinL: [1.2, 0, 0], y: 0 }),
      k(0.6, { torso: [-0.55, 0, 0] }),
      k(0.76, { torso: [0.85, 0, 0], uArmR: [-0.3, 0, -0.1], hand: [0.6, 0, 0], uArmL: [-0.3, 0, 0.4], y: -0.8, ...LEGS_WIDE }, 'in'),
      k(1.35, { torso: [0.6, 0, 0], y: -0.6 }),
    ]),
    hits: [{ t: 0.74, t1: 0.82, shape: 'circle', range: 11, dmg: 140, kb: 14, up: 12, big: true, sp: true }],
    slam: 0.75,
    giant: [0.3, 1.1],
  },
};
