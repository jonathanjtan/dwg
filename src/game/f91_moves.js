// Gundam F91 moveset, after Dynasty Warriors: Gundam Reborn's "ALL MOVES" video (F91, 82s). Weapons: beam saber
// (pink, like the Gundam's), beam rifle, the twin back-mounted VSBR that swing forward under the arms to fire, and
// the beam launcher (a handheld cannon, fired point-blank off a dash). Burst type MEPE: its charge attacks and SP
// finishers carry a teal-green "metal peel" afterimage swirl instead of the Gundam's gold.
// F91 is a smaller, lighter Formula-project suit (~0.85x the Gundam): reach below is the Gundam's own numbers scaled
// down by that factor. The footage shows Basic Combo, Shot Combo, Charge Shot and Charge 2-6, Dash Combo, Dash
// Charge, and Musou / Air Musou / Charge Musou; it skips jump attacks (JA/JC), invented here in the same spirit.
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
// { t, kind, ang, dn }; wpn: [t, weapon] (saber | rifle | launcher); vsbr: [t, aim] curve for the back rifles' swing
// (0 racked, 1 forward); jets/slide/air/lunge: root motion; rate: playback speed. SP phases: spNext, spHold (taken
// instead while SP is still held), spRepeat, steer, chargeAura.
export const MOVES = {
  // ---- normal string: six beam saber cuts, the sixth a thruster hop into a launching spin ----
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
  N6: { // thruster hop, then a full-circle cut that throws everything around the suit into the air
    dur: 0.9, chain: 0.68, next: null, charge: null, saber: true,
    lunge: [[0.05, 0], [0.28, 1.5]],
    air: [[0, 0], [0.2, 1.5], [0.46, 1.8], [0.74, 0]],
    jets: [0.06, 0.46, true],
    clip: clip([
      k(0, { torso: [0.1, -0.5, 0], uArmR: [-2.3, 0.2, -0.5], fArmR: [-0.2, 0, 0], hand: [0.5, 0, 0], uArmL: [-0.4, 0, 0.8], y: -0.32, yaw: 0, ...LEGS_WIDE }),
      k(0.19, { torso: [0.1, -0.7, 0], uArmR: [0, 0.2, -1.4], fArmR: [0, 0, 0], hand: [1.3, 0, 0], uArmL: [0, 0, 1.25], y: 0, yaw: -0.4, ...LEGS_AIR }),
      k(0.46, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.74, { yaw: PI * 2, torso: [0.2, 0.2, 0], uArmR: [-0.3, 0.8, -1.15], y: -0.32, ...LEGS_WIDE }),
      k(0.9, { yaw: PI * 2, torso: [0.15, 0.1, 0], y: -0.24 }),
    ]),
    hits: [{ t: 0.22, t1: 0.46, shape: 'arc', range: 4.4, arc: 360, hy: 5, dmg: 40, kb: 5, up: 9, big: true }],
    sfx: 'slash_spin', swing: 0.2,
  },

  // ---- charge attacks: K alone is the beam rifle (mash for a shot combo, hold for a charge shot) ----
  C1: {
    dur: 0.4, chain: 0.13, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true,
    clip: clip([
      k(0, { ...RIFLE, torso: [0, -0.5, 0], uArmR: [-1.3, 0, 0.1], fArmR: [-0.3, 0, 0], hand: [1.6, 0, 0] }),
      k(0.1, { ...RIFLE }, 'snap'),
      k(0.16, { torso: [-0.1, -0.55, 0], uArmR: [-1.8, 0, 0.1], hand: [1.4, 0, 0], y: -0.05 }, 'snap'),
      k(0.4, { uArmR: [-1.55, 0, 0.1], hand: [1.55, 0, 0] }),
    ]),
    shots: [{ t: 0.12, kind: 'rifle' }],
  },
  C1R: {
    dur: 0.26, chain: 0.1, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true, maxRepeat: 12,
    clip: clip([
      k(0, { ...RIFLE }),
      k(0.05, { torso: [-0.08, -0.55, 0], uArmR: [-1.75, 0, 0.1], hand: [1.42, 0, 0], y: -0.05 }, 'snap'),
      k(0.26, { ...RIFLE }),
    ]),
    shots: [{ t: 0.03, kind: 'rifle' }],
  },
  CS: { // charge shot: a scoped charge, then one heavy beam that throws its target
    dur: 1.1, chain: 0.9, rifle: true, rate: 1, next: null, charge: null, armor: true,
    clip: clip([
      k(0, { ...RIFLE, torso: [0.05, -0.2, 0], uArmL: [-1.0, 0, 0.35], y: -0.18, ...LEGS_WIDE }),
      k(0.4, { ...RIFLE, torso: [0.05, -0.35, 0], uArmL: [-0.3, 0.5, 0.9], fArmL: [-0.5, 0, 0], y: -0.28 }),
      k(0.52, { ...RIFLE, torso: [0, -0.55, 0], uArmL: [-0.15, 0, 1.1], y: -0.3 }),
      k(0.58, { torso: [-0.18, -0.5, 0], uArmR: [-1.9, 0, 0.1], hand: [1.7, 0, 0], y: -0.26 }, 'snap'),
      k(1.1, { ...RIFLE, torso: [0, -0.35, 0] }),
    ]),
    ev: [[0.02, 'flash', 'mepe'], [0.24, 'flash', 'mepe']],
    shots: [{ t: 0.54, kind: 'cshot' }],
    chargeFx: [0.0, 0.52],
  },

  // J K: a rising saber launcher into a full spin, then a stomp finisher that erupts underfoot.
  C2: {
    dur: 1.5, chain: 1.3, saber: true, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.02, 0], [0.16, 1.3]],
    air: [[0.95, 0], [1.1, 1.6], [1.5, 0]],
    jets: [0.95, 1.1, true],
    clip: clip([
      k(0, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.45, ...LEGS_LUNGE_R }),
      k(0.05, { torso: [0.4, -0.35, 0], uArmR: [0.8, 0, -0.35] }),
      k(0.17, { torso: [-0.35, 0.2, 0], uArmR: [-2.8, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.75], y: -0.05, ...LEGS_WIDE }, 'snap'),
      k(0.24, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.25], y: -0.22, yaw: 0 }),
      k(0.46, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.75, { yaw: PI * 2, torso: [0.1, -0.3, 0], uArmR: [-0.3, 0, -0.5], fArmR: [-1.2, 0, 0], hand: [1.3, 0, 0], uArmL: [-0.7, 0, 0.4], y: -0.28, ...LEGS_WIDE }),
      k(1.1, { yaw: PI * 2, torso: [0.3, 0, 0], uArmR: [-2.6, 0, -0.15], fArmR: [-0.1, 0, 0], hand: [0.3, 0, 0], y: 0, ...LEGS_AIR }, 'snap'),
      k(1.35, { yaw: PI * 2, torso: [0.75, 0, 0], uArmR: [-0.7, 0, -0.1], fArmR: [-0.4, 0, 0], hand: [1.1, 0, 0], y: -0.85, head: [-0.3, 0, 0], ...LEGS_KNEEL }, 'in'),
      k(1.5, { yaw: PI * 2, torso: [0.2, -0.2, 0], uArmR: [-0.5, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.5, 0, 0], y: -0.15, ...LEGS_WIDE }),
    ]),
    hits: [
      { t: 0.06, t1: 0.18, shape: 'arc', range: 4.6, arc: 140, dmg: 32, kb: 2, up: 11, big: true },
      { t: 0.27, t1: 0.46, shape: 'arc', range: 4.4, arc: 360, hy: 6, dmg: 16, kb: 1, up: 3 },
      { t: 1.16, t1: 1.3, shape: 'circle', range: 5.6, dmg: 46, kb: 6, up: 8, big: true },
    ],
    ev: [[0.21, 'flash', 'mepe'], [1.18, 'flash', 'mepe']],
    sfxs: [[0.04, 'slash_rise'], [0.27, 'slash_spin'], [1.12, 'slash_down']],
  },

  // J J K: a melee launcher, then the beam rifle emptied straight down at the target on the way up and down.
  C3: {
    dur: 2.0, chain: 1.8, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.42, 'rifle']],
    jets: [0.16, 0.5, true],
    air: [[0.16, 0], [0.5, 3.6], [1.7, 3.2], [2.0, 0]],
    clip: clip([
      k(0, { torso: [0.15, -0.4, 0], uArmR: [-1.2, 0, -0.4], fArmR: [-0.4, 0, 0], hand: [1.1, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.16, { torso: [-0.3, 0.1, 0], uArmR: [-2.6, 0, -0.2], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.05, ...LEGS_AIR }, 'snap'),
      k(0.42, { ...RIFLE, torso: [0.5, -0.3, 0], y: 0.1, ...LEGS_AIR }),
      ...[0.62, 0.9, 1.18, 1.46].flatMap((t) => [
        k(t, { ...RIFLE, torso: [0.45, -0.3, 0], y: 0.1 }),
        k(t + 0.06, { torso: [0.2, -0.3, 0], uArmR: [-1.15, 0, 0.15] }, 'snap'),
        k(t + 0.28, { ...RIFLE, torso: [0.45, -0.3, 0], y: 0.1 }),
      ]),
      k(1.7, { ...RIFLE, torso: [0.3, -0.2, 0], y: -0.1 }),
      k(2.0, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], y: -0.15 }),
    ]),
    hits: [{ t: 0.19, t1: 0.44, shape: 'arc', range: 4.4, arc: 150, dmg: 28, kb: 1, up: 10, big: true }],
    shots: [0.62, 0.9, 1.18, 1.46].map((t) => ({ t, kind: 'rifle', dn: true })),
    ev: [[0.14, 'flash', 'mepe']],
    sfxs: [[0.04, 'draw']],
  },

  // J J J K: the VSBR swing forward under the arms and the suit spins through a sustained twin beam whirlwind.
  C4: {
    dur: 2.0, chain: 1.85, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, null]], vsbr: [[0, 0], [0.22, 1], [1.85, 1], [2.0, 0]],
    clip: clip([
      k(0, { torso: [0.1, -0.3, 0], uArmR: [-0.6, 0, -0.5], fArmR: [-0.3, 0, 0], uArmL: [-0.6, 0, 0.5], fArmL: [-0.3, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.22, { torso: [0.1, 0, 0], ...VSBR_POSE, y: -0.1, yaw: 0, ...LEGS_WIDE }),
      k(1.7, { yaw: PI * 4, torso: [0.15, 0, 0], y: -0.1 }, 'linear'),
      k(2.0, { yaw: PI * 4, torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.6, 0, 0], uArmL: [-0.4, 0, 0.3], fArmL: [-0.6, 0, 0], y: -0.15, ...LEGS_WIDE }),
    ]),
    hits: every(0.3, 1.7, 0.16, { shape: 'circle', range: 4.8, dmg: 12, kb: 2, up: 1.5 }),
    ev: [[0.2, 'flash', 'gold']],
    sfxs: [[0.18, 'vsbr']],
  },

  // J J J J K: a dash-slash rush between two targets, a full spin, and a final downward slam.
  C5: {
    dur: 1.9, chain: 1.75, saber: true, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.02, 0], [0.14, 2.1], [0.5, 0], [0.62, 2.2]],
    jets: [0.02, 0.16, false],
    clip: clip([
      k(0, { torso: [0.3, -0.6, 0], uArmR: [0.3, -0.3, -0.6], fArmR: [-0.2, 0, 0], hand: [0.6, 0, 0], y: -0.3, ...LEGS_LUNGE_R }),
      k(0.14, { torso: [-0.25, 0.5, 0], uArmR: [-2.4, 0.2, -0.5], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.15, ...LEGS_LUNGE_L }, 'snap'),
      k(0.36, { torso: [-0.1, 0.2, 0], uArmR: [-2.0, 0.1, -0.4], y: -0.2 }),
      k(0.5, { torso: [0.3, -0.5, 0], uArmR: [0.3, -0.2, -0.5], fArmR: [-0.2, 0, 0], hand: [0.6, 0, 0], y: -0.28, ...LEGS_LUNGE_R }),
      k(0.62, { torso: [-0.25, 0.45, 0], uArmR: [-2.3, 0.2, -0.5], y: -0.14, ...LEGS_LUNGE_L }, 'snap'),
      k(0.8, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.25], y: -0.25, yaw: 0, ...LEGS_WIDE }),
      k(1.1, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(1.3, { yaw: PI * 2, torso: [0.5, 0, 0], uArmR: [-0.7, 0, -0.1], fArmR: [-0.3, 0, 0], hand: [1.0, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(1.9, { yaw: PI * 2, torso: [0.15, -0.2, 0], uArmR: [-0.5, 0, -0.3], y: -0.16, ...LEGS_WIDE }),
    ]),
    hits: [
      { t: 0.15, t1: 0.35, shape: 'arc', range: 4.6, arc: 170, dmg: 22, kb: 2, up: 2, pull: 1.3, stop: 1 },
      { t: 0.63, t1: 0.79, shape: 'arc', range: 4.8, arc: 190, dmg: 24, kb: 2, up: 2, pull: 1.3, stop: 1 },
      { t: 0.85, t1: 1.1, shape: 'arc', range: 4.4, arc: 360, dmg: 16, kb: 1, up: 2 },
      { t: 1.32, t1: 1.44, shape: 'circle', range: 5.4, off: -1, dmg: 38, kb: 10, up: 8, big: true },
    ],
    ev: [[0.0, 'flash', 'mepe']],
    sfxs: [[0.13, 'slash_fast'], [0.61, 'slash_fast'], [0.83, 'slash_spin'], [1.28, 'slash_down']],
  },

  // J J J J J K: a thruster dash straight through the target, a spin, and a ground stab that erupts underfoot.
  C6: {
    dur: 1.6, chain: 1.4, saber: true, rate: 1, next: null, charge: null, armor: true,
    air: [[0.38, 0], [0.56, 2.2], [0.7, 0]],
    jets: [0.38, 0.58, true],
    lunge: [[0, 0], [0.16, 2.6]],
    clip: clip([
      k(0, { torso: [0.2, -0.3, 0], uArmR: [0.4, -0.2, -0.5], fArmR: [-0.2, 0, 0], hand: [0.6, 0, 0], y: -0.2, ...LEGS_LUNGE_R }),
      k(0.16, { torso: [-0.3, 0.1, 0], uArmR: [-2.9, 0.1, -0.2], fArmR: [-0.1, 0, 0], hand: [0.3, 0, 0], y: 0, ...LEGS_WIDE }, 'snap'),
      k(0.36, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.25], y: -0.28, yaw: 0 }),
      k(0.56, { yaw: PI * 2, torso: [-0.3, 0, 0], uArmR: [-2.9, 0, -0.15], fArmR: [-0.2, 0, 0], hand: [-1.4, 0, 0], uArmL: [-2.5, 0, 0.2], fArmL: [-0.3, 0, 0], y: 0, ...LEGS_AIR }),
      k(0.7, { yaw: PI * 2, torso: [0.75, 0, 0], uArmR: [-0.7, 0, -0.05], fArmR: [-0.3, 0, 0], hand: [1.05, 0, 0], uArmL: [-0.7, 0, 0.1], fArmL: [-0.4, 0, 0], y: -0.85, head: [-0.35, 0, 0], ...LEGS_KNEEL }, 'in'),
      k(1.1, { yaw: PI * 2, torso: [0.7, 0, 0], y: -0.85 }),
      k(1.6, { yaw: PI * 2, torso: [0.15, -0.2, 0], uArmR: [-0.5, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.5, 0, 0], y: -0.15, ...LEGS_WIDE }),
    ]),
    hits: [
      { t: 0.05, t1: 0.16, shape: 'line', len: 6.6, width: 2.6, dmg: 34, kb: 4, up: 2, big: true },
      { t: 0.38, t1: 0.56, shape: 'arc', range: 4.4, arc: 360, dmg: 16, kb: 1, up: 2.4 },
      { t: 0.56, t1: 0.66, shape: 'circle', range: 8.2, dmg: 50, kb: 5, up: 11, big: true },
    ],
    ev: [[0.0, 'flash', 'mepe'], [0.56, 'burst']],
    sfxs: [[0.03, 'slash_dash'], [0.4, 'slash_spin']],
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
  DC: { // dash charge: a spinning cut, then the beam launcher fired point-blank
    dur: 1.2, chain: 1.0, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.2, 'launcher']],
    lunge: [[0.5, 0], [0.72, -1.6]],
    jets: [0.5, 0.72, false],
    clip: clip([
      k(0, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.25], y: -0.28, yaw: 0, ...LEGS_WIDE }),
      k(0.2, { yaw: PI * 2, torso: [0.1, 0.3, 0] }, 'linear'),
      k(0.38, { yaw: PI * 2, ...LAUNCH, y: -0.32, ...LEGS_LUNGE_R }),
      k(0.5, { yaw: PI * 2, ...LAUNCH, y: -0.32 }),
      k(0.56, { yaw: PI * 2, torso: [-0.28, -0.3, 0], uArmR: [-0.75, 0, -0.25], y: -0.22, head: [-0.14, -0.3, 0] }, 'snap'),
      k(1.2, { yaw: PI * 2, torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.9, 0, 0], hand: [0.9, 0, 0], y: -0.1 }),
    ]),
    hits: [{ t: 0.03, t1: 0.2, shape: 'arc', range: 4.4, arc: 360, dmg: 14, kb: 1, up: 1.4 }],
    ev: [[0.02, 'flash', 'mepe'], [0.22, 'flash', 'mepe']],
    shots: [{ t: 0.56, kind: 'blast' }],
    sfxs: [[0.03, 'slash_spin']],
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
  // Ground: a starburst, a long VSBR-and-saber flurry, then a cross-slash finisher. Hold SP through the starburst for
  // the charge SP: a corkscrew VSBR drill straight up, then an M.E.P.E. burst on the way back down. In the air: hover
  // and spin up an M.E.P.E. afterimage vortex, pulsing the ground around the suit.
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
    dur: 2.6, rate: 1, saber: true, armor: true, invuln: true, sp: true, loop: 0.28, rushFx: true, steer: 2.2, spNext: 'SP_FIN',
    clip: clip([
      k(0, { torso: [0.15, -0.85, 0], ...SWEEP_R, uArmL: [-0.8, 0, 0.45], y: -0.28, ...LEGS_WIDE }),
      k(0.07, { torso: [0.15, 0.85, 0], ...SWEEP_L, uArmL: [-0.25, 0, 0.8], y: -0.32 }, 'snap'),
      k(0.14, { torso: [-0.2, 0.45, 0], uArmR: [-2.5, 0.45, -0.4], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.18 }, 'snap'),
      k(0.21, { torso: [0.35, -0.4, 0], uArmR: [-0.75, -0.2, -0.3], fArmR: [-0.1, 0, 0], hand: [0.85, 0, 0], y: -0.35 }, 'snap'),
      k(0.28, { torso: [0.15, -0.85, 0], ...SWEEP_R, y: -0.28 }),
    ]),
    hits: [
      ...every(0.05, 2.5, 0.07, { shape: 'arc', range: 4.6, arc: 240, dmg: 8, kb: 0.5, up: 0.4, pull: 1.1, sp: true }),
      { t: 2.5, t1: 2.58, shape: 'arc', range: 4.8, arc: 260, dmg: 14, kb: 3, up: 2, sp: true },
    ],
    sfxs: [0.02, 0.09, 0.16, 0.23].flatMap((o) => times(0, 2.5, 0.28).map((t) => [t + o, 'slash_fast'])),
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
  SPA_LOOP: { // hover in place inside a slowly swirling M.E.P.E. afterimage vortex, pulsing the ground beneath it
    dur: 0.7, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spRepeat: 8,
    jets: [0, 0.7, true],
    air: [[0, 2], [0.35, 2.3], [0.7, 2]],
    clip: clip([
      k(0, { torso: [0.15, 0, 0], uArmR: [-0.15, 0, -0.9], fArmR: [-0.3, 0, 0], uArmL: [-0.15, 0, 0.9], fArmL: [-0.3, 0, 0], ...LEGS_AIR }),
      k(0.35, { torso: [0.2, 0, 0] }, 'smooth'),
      k(0.7, { torso: [0.15, 0, 0] }),
    ]),
    hits: [{ t: 0.28, t1: 0.4, shape: 'circle', range: 5.6, dmg: 14, kb: 2, up: 1, sp: true }],
    ev: [[0.05, 'mepe']],
  },
  SPC_CH: {
    dur: 1.0, rate: 1, armor: true, invuln: true, sp: true, chargeAura: true, spNext: 'SPC_RISE',
    wpn: [[0, 'saber']],
    clip: clip([
      k(0, { torso: [-0.2, 0.3, 0], uArmR: [-2.8, 0, -0.3], hand: [0, 0, 0], uArmL: [-2.6, 0, 0.3], y: -0.18, ...LEGS_WIDE }),
      k(0.32, { torso: [0.4, 0, 0], uArmR: [-0.2, 0, -0.9], fArmR: [-0.8, 0, 0], hand: [0.6, 0, 0], uArmL: [-0.2, 0, 0.9], fArmL: [-0.8, 0, 0], head: [-0.2, 0, 0], y: -0.5, ...LEGS_WIDE }),
      k(1.0, { torso: [0.45, 0, 0], y: -0.55 }),
    ]),
    ev: [[0.02, 'charge'], [0.95, 'burst']],
  },
  SPC_RISE: { // a corkscrew ascent, beam saber and VSBR both out, drilling straight up
    dur: 1.6, rate: 1, armor: true, invuln: true, sp: true, saber: true, spNext: 'SPC_END',
    wpn: [[0, 'saber']], vsbr: [[0, 1]],
    jets: [0, 1.5, true],
    air: [[0, 0], [1.4, 9]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [0, 0, -1.5], fArmR: [-0.1, 0, 0], hand: [1.1, 0, 0], uArmL: [0, 0, 1.5], fArmL: [-0.1, 0, 0], y: -0.2, yaw: 0, ...LEGS_AIR }),
      k(0.2, { yaw: -PI * 0.6 }, 'in'),
      k(1.6, { yaw: -PI * 7.5 }, 'linear'),
    ]),
    hits: every(0.1, 0.5, 0.12, { shape: 'circle', range: 4.4, dmg: 18, kb: 3, up: 4, sp: true }),
    sfxs: times(0.1, 1.55, 0.3).map((t) => [t, 'vsbr']),
  },
  SPC_END: { // fall back to earth trailing green afterimages, and land in an M.E.P.E. shockwave
    dur: 1.0, rate: 1, armor: true, invuln: true, sp: true,
    wpn: [[0, null]], vsbr: [[0, 1], [0.7, 0]],
    air: [[0, 0], [0.8, -9]],
    clip: clip([
      k(0, { torso: [-0.15, 0, 0], uArmR: [0, 0, -1.3], uArmL: [0, 0, 1.3], y: -0.1, ...LEGS_AIR }),
      k(0.7, { torso: [0.3, 0, 0], uArmR: [-0.4, 0, -0.5], uArmL: [-0.4, 0, 0.5], y: -0.3, ...LEGS_KNEEL }, 'in'),
      k(1.0, { torso: [0.1, -0.2, 0], y: -0.15, ...LEGS_WIDE }),
    ]),
    hits: [{ t: 0.72, t1: 0.82, shape: 'circle', range: 6.6, dmg: 60, kb: 12, up: 14, big: true, sp: true }],
    ev: [[0.05, 'mepe'], [0.7, 'mepe']],
  },
};

// timed effects and sounds fire in order
for (const m of Object.values(MOVES)) for (const key of ['ev', 'sfxs']) m[key]?.sort((a, b) => a[0] - b[0]);
