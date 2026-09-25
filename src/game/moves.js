// Gundam moveset after Dynasty Warriors: Gundam Reborn's RX-78-2: keyframed poses + hit timing.
// Normal string N1..N6 on attack; charge attack C(n+1) on charge after n normals. Tapping charge alone fires the beam
// rifle (mash for a shot combo), holding it fires a charge shot. Weapons: beam saber, beam rifle, beam javelin, hyper
// bazooka and the Gundam hammer. Reach was measured off gameplay footage in Gundam heights (H ~ 3.4 units): the
// saber blade is ~1.3 H, spin rings ~1.4 H, the C6 shockwave ~2.8 H, a bazooka blast ~1 H, the hammer orbit ~1.5 H.
import { Clip, poseFrom } from '../core/rig.js';

const PI = Math.PI;
export const BLADE = 4.4; // beam saber length (units)
export const HAMMER_R = 5.2; // Gundam hammer orbit radius

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
// Arm poses: the horizontal saber sweeps swing an outstretched arm around the shoulder (uArmR y with z ~ -1.35).
// The arm is held level (z ~ -1.55) so the long blade sweeps flat instead of raking the ground.
const SWEEP_R = { uArmR: [0, -0.2, -1.55], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0] };
const SWEEP_L = { uArmR: [0, 1.9, -1.55], fArmR: [-0.15, 0, 0], hand: [1.2, 0, 0] };
const RIFLE = { torso: [0, -0.55, 0], uArmR: [-1.57, 0, 0.12], fArmR: [0, 0, 0], hand: [1.57, 0, 0], uArmL: [-0.8, 0, 0.2], head: [0, -0.4, 0] };
const SHOULDER = { torso: [0.05, -0.35, 0], uArmR: [-0.55, 0, -0.25], fArmR: [-1.3, 0, 0], hand: [1.85, 0, 0], uArmL: [-1.2, 0, -0.15], fArmL: [-0.7, 0, 0], head: [0, -0.3, 0] };

// hit: { t, t1, shape, range, arc, len, width, off, hy, dmg, kb, up, big, pull, sp, stop (hit-stop frames) }
// ev: [t, name, arg] timed effects; shots: { t, kind, ang, dn }; wpn: [t, weapon] (saber | rifle | javelin | bazooka |
// hammer); jets: [t0, t1, lift]; slide: [t0, t1, speed]; ham: hammer orbit radius curve; rate: playback speed.
// SP phases: spNext (the phase that follows), spHold (taken instead while SP is still held), spRepeat (plays n times),
// steer (move speed while steering), chargeAura.
export const MOVES = {
  // ---- normal string: six beam saber cuts, the sixth a thruster hop into a launching spin ----
  N1: { // rising diagonal, low left to high right
    dur: 0.5, chain: 0.3, next: 'N2', charge: 'C2', saber: true,
    lunge: [[0.04, 0], [0.18, 1.5]],
    clip: clip([
      k(0, { torso: [0.25, 0.8, 0], uArmR: [0, 1.9, -1.25], fArmR: [-0.2, 0, 0], hand: [1.3, 0, 0], uArmL: [-0.8, 0, 0.5], y: -0.3, ...LEGS_LUNGE_L }),
      k(0.07, { torso: [0.28, 0.9, 0] }),
      k(0.19, { torso: [-0.2, -0.75, 0], uArmR: [-2.3, -0.3, -0.85], fArmR: [-0.1, 0, 0], hand: [0.5, 0, 0], uArmL: [-0.3, 0, 0.8], y: -0.18, ...LEGS_LUNGE_R }, 'snap'),
      k(0.5, { torso: [-0.1, -0.55, 0], uArmR: [-2.0, -0.2, -0.7], y: -0.2 }),
    ]),
    hits: [{ t: 0.08, t1: 0.2, shape: 'arc', range: 5.4, arc: 170, dmg: 26, kb: 4, up: 1.5 }],
    sfx: 'slash_b', swing: 0.07,
  },
  N2: { // flat forehand, right to left
    dur: 0.48, chain: 0.3, next: 'N3', charge: 'C3', saber: true,
    lunge: [[0.03, 0], [0.16, 1.4]],
    clip: clip([
      k(0, { torso: [0.1, -1.0, 0], ...SWEEP_R, hand: [1.1, 0, 0], uArmL: [-0.9, 0, 0.5], y: -0.15, ...LEGS_WIDE }),
      k(0.07, { torso: [0.12, -1.1, 0], uArmR: [0, -0.3, -1.4] }),
      k(0.17, { torso: [0.15, 0.95, 0], ...SWEEP_L, uArmL: [-0.3, 0, 0.9], y: -0.3, ...LEGS_LUNGE_R }, 'snap'),
      k(0.48, { torso: [0.12, 0.5, 0], uArmR: [-0.3, 1.2, -1.0], hand: [0.8, 0, 0], y: -0.22 }),
    ]),
    hits: [{ t: 0.07, t1: 0.18, shape: 'arc', range: 5.6, arc: 190, dmg: 26, kb: 4.5, up: 0 }],
    sfx: 'slash_a', swing: 0.07,
  },
  N3: { // overhead chop
    dur: 0.54, chain: 0.32, next: 'N4', charge: 'C4', saber: true,
    lunge: [[0.06, 0], [0.2, 1.8]],
    clip: clip([
      k(0, { torso: [-0.25, -0.2, 0], uArmR: [-2.9, 0, -0.25], fArmR: [-0.3, 0, 0], hand: [0.3, 0, 0], uArmL: [-0.3, 0, 0.5], y: -0.05, head: [0.1, 0, 0] }),
      k(0.09, { torso: [-0.35, -0.25, 0], uArmR: [-3.1, 0, -0.2] }),
      k(0.2, { torso: [0.55, 0.1, 0], uArmR: [-0.9, 0, -0.1], fArmR: [-0.1, 0, 0], hand: [0.75, 0, 0], y: -0.45, head: [-0.3, 0, 0], ...LEGS_LUNGE_R }, 'snap'),
      k(0.54, { torso: [0.35, 0, 0], uArmR: [-0.8, 0, -0.2], y: -0.3 }),
    ]),
    hits: [{ t: 0.12, t1: 0.22, shape: 'arc', range: 5.9, arc: 110, dmg: 32, kb: 6, up: 0 }],
    sfx: 'slash_h', swing: 0.1,
  },
  N4: { // flat backhand, left to right
    dur: 0.5, chain: 0.32, next: 'N5', charge: 'C5', saber: true,
    lunge: [[0.03, 0], [0.17, 1.4]],
    clip: clip([
      k(0, { torso: [0.12, 0.85, 0], ...SWEEP_L, uArmR: [-0.3, 1.9, -1.3], fArmR: [-0.3, 0, 0], y: -0.25, ...LEGS_LUNGE_R }),
      k(0.06, { torso: [0.14, 0.95, 0] }),
      k(0.17, { torso: [0.0, -1.05, 0.1], uArmR: [-0.3, -0.5, -1.3], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.2, 0, 0.6], y: -0.3, ...LEGS_LUNGE_L }, 'snap'),
      k(0.5, { torso: [0.05, -0.6, 0.05], uArmR: [-0.5, 0, -0.9], hand: [0.8, 0, 0] }),
    ]),
    hits: [{ t: 0.07, t1: 0.18, shape: 'arc', range: 5.6, arc: 200, dmg: 28, kb: 5, up: 0 }],
    sfx: 'slash_b', swing: 0.07,
  },
  N5: { // big rising cut, low right to high left
    dur: 0.56, chain: 0.34, next: 'N6', charge: 'C6', saber: true,
    lunge: [[0.05, 0], [0.2, 1.9]],
    clip: clip([
      k(0, { torso: [0.3, -0.9, 0], uArmR: [0.5, -0.4, -0.7], fArmR: [-0.2, 0, 0], hand: [1.3, 0, 0], uArmL: [-1.0, 0, 0.5], y: -0.35, ...LEGS_LUNGE_R }),
      k(0.08, { torso: [0.34, -1.0, 0] }),
      k(0.21, { torso: [-0.3, 0.8, 0], uArmR: [-2.6, 0.6, -0.6], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.3, 0, 0.9], y: -0.15, ...LEGS_LUNGE_L }, 'snap'),
      k(0.56, { torso: [-0.15, 0.55, 0], uArmR: [-2.3, 0.4, -0.5], y: -0.2 }),
    ]),
    hits: [{ t: 0.09, t1: 0.23, shape: 'arc', range: 5.8, arc: 210, dmg: 32, kb: 6, up: 3 }],
    sfx: 'slash_rise', swing: 0.08,
  },
  N6: { // thruster hop, then a full-circle cut that throws everything around the Gundam into the air
    dur: 0.95, chain: 0.72, next: null, charge: null, saber: true,
    lunge: [[0.05, 0], [0.3, 1.6]],
    air: [[0, 0], [0.22, 1.6], [0.5, 1.9], [0.78, 0]],
    jets: [0.06, 0.5, true],
    clip: clip([
      k(0, { torso: [0.1, -0.5, 0], uArmR: [-2.4, 0.2, -0.5], fArmR: [-0.2, 0, 0], hand: [0.5, 0, 0], uArmL: [-0.4, 0, 0.8], y: -0.35, yaw: 0, ...LEGS_WIDE }),
      k(0.2, { torso: [0.1, -0.7, 0], uArmR: [0, 0.2, -1.45], fArmR: [0, 0, 0], hand: [1.3, 0, 0], uArmL: [0, 0, 1.3], y: 0, yaw: -0.4, ...LEGS_AIR }),
      k(0.5, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.78, { yaw: PI * 2, torso: [0.2, 0.2, 0], uArmR: [-0.3, 0.8, -1.2], y: -0.35, ...LEGS_WIDE }),
      k(0.95, { yaw: PI * 2, torso: [0.15, 0.1, 0], y: -0.25 }),
    ]),
    hits: [{ t: 0.24, t1: 0.5, shape: 'arc', range: 5.2, arc: 360, hy: 5, dmg: 44, kb: 5, up: 10, big: true }],
    sfx: 'slash_spin', swing: 0.22,
  },

  // ---- charge attacks ----
  // K alone: beam rifle. Mash K for a shot combo; hold it for a charge shot.
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
  CS: { // charge shot: gold rings wind up, the shield swings clear, one heavy beam that throws the target
    dur: 1.2, chain: 1.0, rifle: true, rate: 1, next: null, charge: null, armor: true,
    clip: clip([
      k(0, { ...RIFLE, torso: [0.05, -0.2, 0], uArmL: [-1.1, 0, 0.3], y: -0.2, ...LEGS_WIDE }),
      k(0.45, { ...RIFLE, torso: [0.05, -0.35, 0], uArmL: [-0.4, 0.6, 1.0], fArmL: [-0.6, 0, 0], y: -0.3 }),
      k(0.58, { ...RIFLE, torso: [0, -0.6, 0], uArmL: [-0.2, 0, 1.2], y: -0.32 }),
      k(0.64, { torso: [-0.2, -0.55, 0], uArmR: [-1.95, 0, 0.1], hand: [1.75, 0, 0], y: -0.28 }, 'snap'),
      k(1.2, { ...RIFLE, torso: [0, -0.4, 0] }),
    ]),
    ev: [[0.02, 'flash', 'gold'], [0.26, 'flash', 'gold']],
    shots: [{ t: 0.6, kind: 'cshot' }],
    chargeFx: [0.0, 0.58],
  },

  // J K: rising launcher cut, a full spin under the falling target, then the beam javelin thrust up into it.
  C2: {
    dur: 1.8, chain: 1.5, saber: true, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.52, 'javelin']],
    lunge: [[0.02, 0], [0.16, 1.2]],
    clip: clip([
      k(0, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.05, { torso: [0.4, -0.35, 0], uArmR: [0.8, 0, -0.35] }),
      k(0.17, { torso: [-0.35, 0.2, 0], uArmR: [-2.9, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.8], y: -0.05, ...LEGS_WIDE }, 'snap'),
      k(0.24, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.3], y: -0.25, yaw: 0 }),
      k(0.46, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.6, { yaw: PI * 2, torso: [0.1, -0.3, 0], uArmR: [-0.3, 0, -0.5], fArmR: [-1.4, 0, 0], hand: [1.4, 0, 0], uArmL: [-0.8, 0, 0.4], y: -0.3, ...LEGS_WIDE }),
      k(0.95, { yaw: PI * 2, torso: [-0.25, -0.5, 0], uArmR: [-0.9, 0, 0.05], fArmR: [-0.5, 0, 0], hand: [0.9, 0, 0], y: -0.4, ...LEGS_LUNGE_R }),
      k(1.1, { yaw: PI * 2, torso: [-0.35, -0.2, 0], uArmR: [-2.3, 0, 0.05], fArmR: [0, 0, 0], hand: [1.75, 0, 0], y: -0.1, ...LEGS_LUNGE_R }, 'snap'),
      k(1.5, { yaw: PI * 2, torso: [-0.25, -0.2, 0], uArmR: [-2.2, 0, 0.05], hand: [1.65, 0, 0], y: -0.15 }),
      k(1.8, { yaw: PI * 2, torso: [0.1, -0.2, 0], uArmR: [-0.6, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], y: -0.1 }),
    ]),
    hits: [
      { t: 0.06, t1: 0.18, shape: 'arc', range: 5.2, arc: 140, dmg: 34, kb: 2, up: 13, big: true },
      { t: 0.27, t1: 0.46, shape: 'arc', range: 5, arc: 360, hy: 7, dmg: 16, kb: 1, up: 3.5 },
      { t: 1.02, t1: 1.16, shape: 'line', len: 7.4, width: 2.8, hy: 10, dmg: 50, kb: 5, up: 7, big: true },
    ],
    ev: [[0.21, 'flash', 'gold'], [1.08, 'javtip']],
    sfxs: [[0.04, 'slash_rise'], [0.27, 'slash_spin'], [0.98, 'javelin']],
  },

  // J J K: the hyper bazooka comes off the back and empties four rounds point-blank.
  C3: {
    dur: 2.4, chain: 2.15, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, null], [0.14, 'bazooka']],
    clip: clip([
      k(0, { torso: [0.1, 0.4, 0], uArmR: [-2.8, 0.3, -0.3], fArmR: [-1.2, 0, 0], hand: [0.4, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.3, { ...SHOULDER, y: -0.3, ...LEGS_WIDE }),
      ...[0.5, 0.92, 1.34, 1.76].flatMap((t) => [
        k(t, { ...SHOULDER, y: -0.3 }),
        k(t + 0.05, { torso: [-0.18, -0.3, 0], uArmR: [-0.75, 0, -0.25], y: -0.24, head: [-0.1, -0.3, 0] }, 'snap'),
        k(t + 0.3, { ...SHOULDER, y: -0.3 }),
      ]),
      k(2.4, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.9, 0, 0], hand: [0.9, 0, 0], y: -0.12 }),
    ]),
    ev: [[0.0, 'flash', 'violet']],
    shots: [0.5, 0.92, 1.34, 1.76].map((t) => ({ t, kind: 'bazooka' })),
    sfxs: [[0.05, 'draw']],
  },

  // J J J K: a flurry of cuts, a crescent sweep, then a thruster dash straight through the target.
  C4: {
    dur: 2.0, chain: 1.78, saber: true, rate: 1, next: null, charge: null, armor: true,
    lunge: [[1.16, 0], [1.56, 9]],
    jets: [1.12, 1.56, false],
    clip: clip([
      k(0, { torso: [0.1, -0.4, 0], uArmR: [-1.3, 0, -0.4], fArmR: [-0.4, 0, 0], hand: [1.1, 0, 0], y: -0.2, ...LEGS_WIDE }),
      ...[0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75].map((t, i) => k(t, i % 2
        ? { torso: [0.15, 0.7, 0], uArmR: [-0.9, 1.5, -1.2], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], y: -0.25, ...LEGS_LUNGE_R }
        : { torso: [0.15, -0.8, 0], uArmR: [-0.6, -0.2, -1.3], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], y: -0.3, ...LEGS_LUNGE_L }, 'snap')),
      k(0.88, { torso: [0.1, -1.1, 0], ...SWEEP_R, y: -0.25, ...LEGS_WIDE }),
      k(1.02, { torso: [0.2, 1.0, 0], ...SWEEP_L, uArmL: [-0.3, 0, 0.9], y: -0.35, ...LEGS_LUNGE_R }, 'snap'),
      k(1.14, { torso: [0.5, -0.2, 0], uArmR: [0.2, -0.6, -1.2], fArmR: [0, 0, 0], hand: [1.3, 0, 0], uArmL: [0.2, 0, 0.4], y: -0.4, ...LEGS_LUNGE_R }),
      k(1.56, { torso: [0.6, -0.3, 0], uArmR: [0.4, -0.8, -1.2], y: -0.45 }),
      k(1.72, { torso: [0.2, -0.2, 0], uArmR: [0.1, -0.5, -1.0], y: -0.35, ...LEGS_WIDE }),
      k(2.0, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.35], y: -0.15 }),
    ]),
    hits: [
      ...[0.16, 0.26, 0.36, 0.46, 0.56, 0.66, 0.76].map((t) => ({ t, t1: t + 0.08, shape: 'arc', range: 5.2, arc: 150, dmg: 11, kb: 0.6, up: 0, pull: 1.4, stop: 1 })),
      { t: 0.92, t1: 1.06, shape: 'arc', range: 5.8, arc: 230, dmg: 30, kb: 4, up: 0 },
      ...[1.2, 1.3, 1.4].map((t) => ({ t, t1: t + 0.09, shape: 'circle', range: 3.4, dmg: 20, kb: 3, up: 2 })),
      { t: 1.5, t1: 1.58, shape: 'circle', range: 3.8, off: -1, dmg: 34, kb: 12, up: 6, big: true },
    ],
    ev: [[0.0, 'flash', 'gold']],
    sfxs: [...[0.15, 0.35, 0.55, 0.75].map((t) => [t, 'slash_fast']), [0.9, 'slash_a'], [1.14, 'slash_dash']],
  },

  // J J J J K: spin, then a huge rising crescent that carries the Gundam up with its target.
  C5: {
    dur: 1.9, chain: 1.72, saber: true, rate: 1, next: null, charge: null, armor: true,
    air: [[0.44, 0], [0.8, 4.6], [1.12, 4.9], [1.5, 0]],
    jets: [0.44, 0.9, true],
    lunge: [[0.44, 0], [0.8, 1.6]],
    clip: clip([
      k(0, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.3], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.36, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.46, { yaw: PI * 2, torso: [0.4, -0.4, 0], uArmR: [0.6, -0.3, -0.5], fArmR: [-0.2, 0, 0], hand: [0.4, 0, 0], y: -0.55, ...LEGS_LUNGE_R }),
      k(0.66, { yaw: PI * 2, torso: [-0.45, 0.3, 0], uArmR: [-3.0, 0.2, -0.3], fArmR: [-0.1, 0, 0], hand: [0.3, 0, 0], uArmL: [-0.3, 0, 0.9], y: 0, ...LEGS_AIR }, 'snap'),
      k(1.12, { yaw: PI * 2, torso: [-0.2, 0.2, 0], uArmR: [-2.7, 0.2, -0.3] }),
      k(1.5, { yaw: PI * 2, torso: [0.3, 0, 0], uArmR: [-0.6, 0, -0.4], y: -0.45, ...LEGS_WIDE }),
      k(1.9, { yaw: PI * 2, torso: [0.1, -0.2, 0], y: -0.15 }),
    ]),
    hits: [
      { t: 0.1, t1: 0.36, shape: 'arc', range: 5, arc: 360, dmg: 16, kb: 1, up: 3 },
      { t: 0.5, t1: 0.68, shape: 'arc', range: 5.8, arc: 170, hy: 8, dmg: 44, kb: 3, up: 16, big: true },
    ],
    ev: [[0.0, 'flash', 'gold'], [1.5, 'land']],
    sfxs: [[0.08, 'slash_spin'], [0.48, 'slash_rise']],
  },

  // J J J J J K: spin, hop, and a stab into the ground that sends out a shockwave ~2.8 Gundam heights across.
  C6: {
    dur: 1.5, chain: 1.3, saber: true, rate: 1, next: null, charge: null, armor: true,
    air: [[0.4, 0], [0.54, 2.4], [0.66, 0]],
    jets: [0.4, 0.55, true],
    clip: clip([
      k(0, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.3], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.36, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.54, { yaw: PI * 2, torso: [-0.3, 0, 0], uArmR: [-2.9, 0, -0.15], fArmR: [-0.2, 0, 0], hand: [-1.6, 0, 0], uArmL: [-2.6, 0, 0.2], fArmL: [-0.3, 0, 0], y: 0, ...LEGS_AIR }),
      k(0.66, { yaw: PI * 2, torso: [0.8, 0, 0], uArmR: [-0.7, 0, -0.05], fArmR: [-0.3, 0, 0], hand: [1.1, 0, 0], uArmL: [-0.7, 0, 0.1], fArmL: [-0.4, 0, 0], y: -0.95, head: [-0.4, 0, 0], ...LEGS_KNEEL }, 'in'),
      k(1.1, { yaw: PI * 2, torso: [0.75, 0, 0], y: -0.95 }),
      k(1.5, { yaw: PI * 2, torso: [0.15, -0.2, 0], uArmR: [-0.5, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.5, 0, 0], y: -0.15, ...LEGS_WIDE }),
    ]),
    hits: [
      { t: 0.1, t1: 0.36, shape: 'arc', range: 5, arc: 360, dmg: 16, kb: 1, up: 2.5 },
      { t: 0.66, t1: 0.74, shape: 'circle', range: 9.5, dmg: 55, kb: 5, up: 12, big: true },
    ],
    ev: [[0.0, 'flash', 'gold'], [0.66, 'shock']],
    sfxs: [[0.08, 'slash_spin'], [0.5, 'slash_down']],
  },

  // ---- boost dash: a thruster rush of paired cuts (keep pressing J), ending in a launcher or the bazooka ----
  DA: {
    dur: 0.36, chain: 0.22, saber: true, rate: 1, next: 'DA', charge: 'DC', armor: true, rush: true,
    slide: [0, 0.36, 7],
    jets: [0, 0.36, false],
    clip: clip([
      k(0, { torso: [0.35, -0.9, 0], ...SWEEP_R, uArmL: [-1.0, 0, 0.5], y: -0.35, ...LEGS_LUNGE_L }),
      k(0.1, { torso: [0.4, 0.9, 0], ...SWEEP_L, uArmL: [-0.2, 0, 0.9], y: -0.4, ...LEGS_LUNGE_R }, 'snap'),
      k(0.2, { torso: [0.3, 1.0, 0], uArmR: [-0.3, 1.9, -1.3], fArmR: [-0.3, 0, 0] }),
      k(0.3, { torso: [0.35, -0.95, 0], uArmR: [-0.4, -0.4, -1.3], fArmR: [-0.2, 0, 0], y: -0.35, ...LEGS_LUNGE_L }, 'snap'),
      k(0.36, { torso: [0.35, -0.9, 0] }),
    ]),
    hits: [
      { t: 0.03, t1: 0.12, shape: 'arc', range: 5.4, arc: 190, dmg: 14, kb: 1.5, up: 0, pull: 1, stop: 1 },
      { t: 0.22, t1: 0.31, shape: 'arc', range: 5.4, arc: 190, dmg: 14, kb: 1.5, up: 0, pull: 1, stop: 1 },
    ],
    sfxs: [[0.02, 'slash_fast'], [0.2, 'slash_fast']],
  },
  DAF: {
    dur: 0.72, chain: 0.5, saber: true, rate: 1, next: null, charge: null, armor: true,
    slide: [0, 0.2, 6],
    jets: [0, 0.2, false],
    clip: clip([
      k(0, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.16, { torso: [-0.35, 0.2, 0], uArmR: [-2.9, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.8], y: 0, ...LEGS_WIDE }, 'snap'),
      k(0.72, { torso: [0.1, 0, 0], uArmR: [-0.6, 0, -0.3] }),
    ]),
    hits: [{ t: 0.06, t1: 0.18, shape: 'arc', range: 5.6, arc: 200, dmg: 34, kb: 4, up: 12, big: true }],
    sfx: 'slash_rise', swing: 0.04,
  },
  DC: { // dash charge: red shock rings, then the hyper bazooka fired point-blank
    dur: 1.3, chain: 1.1, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.2, 'bazooka']],
    lunge: [[0.56, 0], [0.8, -1.8]],
    jets: [0.56, 0.8, false],
    clip: clip([
      k(0, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.3], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.2, { yaw: PI * 2, torso: [0.1, 0.3, 0] }, 'linear'),
      k(0.4, { yaw: PI * 2, ...SHOULDER, y: -0.35, ...LEGS_LUNGE_R }),
      k(0.55, { yaw: PI * 2, ...SHOULDER, y: -0.35 }),
      k(0.61, { yaw: PI * 2, torso: [-0.3, -0.3, 0], uArmR: [-0.8, 0, -0.25], y: -0.25, head: [-0.15, -0.3, 0] }, 'snap'),
      k(1.3, { yaw: PI * 2, torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.9, 0, 0], hand: [0.9, 0, 0], y: -0.12 }),
    ]),
    hits: [{ t: 0.03, t1: 0.2, shape: 'arc', range: 5, arc: 360, dmg: 14, kb: 1, up: 1.5 }],
    ev: [[0.02, 'flash', 'red'], [0.22, 'flash', 'red']],
    shots: [{ t: 0.56, kind: 'blast' }],
    sfxs: [[0.03, 'slash_spin']],
  },

  // ---- aerial ----
  JA: {
    dur: 0.5, chain: 0.3, saber: true, next: null, charge: null, isAir: true,
    clip: clip([
      k(0, { torso: [-0.3, -0.2, 0], uArmR: [-2.9, 0, -0.2], hand: [0.3, 0, 0], thighR: [-1.0, 0, 0], shinR: [1.4, 0, 0], thighL: [-0.3, 0, 0], shinL: [1.0, 0, 0] }),
      k(0.18, { torso: [0.6, 0, 0], uArmR: [-0.9, 0, -0.1], hand: [0.7, 0, 0] }, 'snap'),
      k(0.5, { torso: [0.3, 0, 0] }),
    ]),
    hits: [{ t: 0.06, t1: 0.2, shape: 'arc', range: 5.4, arc: 150, dmg: 26, kb: 4, up: 4, hy: 5 }],
    sfx: 'slash_a', swing: 0.06,
  },
  JC: {
    dur: 0.75, chain: 0.6, saber: true, next: null, charge: null, isAir: true, plunge: true,
    clip: clip([
      k(0, { torso: [0.6, 0, 0], uArmR: [-2.4, 0, -0.1], fArmR: [0, 0, 0], hand: [1.5, 0, 0], thighR: [-1.4, 0, 0], shinR: [2.0, 0, 0], thighL: [-1.4, 0, 0], shinL: [2.0, 0, 0] }),
      k(0.25, { torso: [0.8, 0, 0], uArmR: [-1.0, 0, 0], hand: [2.2, 0, 0] }),
      k(0.4, { torso: [0.6, 0, 0], y: -0.6, ...LEGS_WIDE }),
      k(0.75, { torso: [0.3, 0, 0], y: -0.3 }),
    ]),
    hits: [{ t: 0, t1: 9, shape: 'circle', range: 6, dmg: 40, kb: 8, up: 8, big: true, onLand: true }],
  },

  // ---- SP attacks ----
  // Ground: a starburst, a long standing flurry, then the beam javelin skewers, lifts and slams, and the ground erupts
  // in purple lightning. Hold SP through the starburst for the charge SP (Gundam hammer); in the air: bazooka barrage.
  SP_IN: {
    dur: 0.55, rate: 1, saber: true, armor: true, invuln: true, sp: true, spNext: 'SP_FL', spHold: 'SPC_CH',
    clip: clip([
      k(0, { torso: [0, 0, 0], uArmR: [-0.2, 0, -0.3], hand: [0.2, 0, 0] }),
      k(0.22, { torso: [-0.2, 0.3, 0], uArmR: [-3.0, 0, -0.35], fArmR: [0, 0, 0], hand: [0, 0, 0], uArmL: [-0.2, 0, 0.9], head: [-0.2, 0, 0], y: -0.2, ...LEGS_WIDE }, 'snap'),
      k(0.55, { torso: [-0.25, 0.35, 0] }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SP_FL: {
    dur: 3.0, rate: 1, saber: true, armor: true, invuln: true, sp: true, loop: 0.3, rushFx: true, steer: 2, spNext: 'SP_JV',
    clip: clip([
      k(0, { torso: [0.15, -0.9, 0], ...SWEEP_R, uArmL: [-0.9, 0, 0.5], y: -0.3, ...LEGS_WIDE }),
      k(0.08, { torso: [0.15, 0.9, 0], ...SWEEP_L, uArmL: [-0.3, 0, 0.9], y: -0.35 }, 'snap'),
      k(0.15, { torso: [-0.2, 0.5, 0], uArmR: [-2.6, 0.5, -0.4], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.2 }, 'snap'),
      k(0.23, { torso: [0.4, -0.4, 0], uArmR: [-0.8, -0.2, -0.3], fArmR: [-0.1, 0, 0], hand: [0.9, 0, 0], y: -0.4 }, 'snap'),
      k(0.3, { torso: [0.15, -0.9, 0], ...SWEEP_R, y: -0.3 }),
    ]),
    hits: [
      ...every(0.05, 2.9, 0.075, { shape: 'arc', range: 5.4, arc: 240, dmg: 9, kb: 0.5, up: 0.4, pull: 1.2, sp: true }),
      { t: 2.9, t1: 2.98, shape: 'arc', range: 5.6, arc: 260, dmg: 16, kb: 3, up: 2, sp: true },
    ],
    sfxs: [0.02, 0.1, 0.17, 0.25].flatMap((o) => times(0, 2.9, 0.3).map((t) => [t + o, 'slash_fast'])),
  },
  SP_JV: {
    dur: 1.25, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SP_OUT',
    wpn: [[0, 'javelin']],
    lunge: [[0, 0], [0.16, 2]],
    clip: clip([
      k(0, { torso: [0.2, -0.4, 0], uArmR: [-0.3, 0, -0.4], fArmR: [-1.4, 0, 0], hand: [1.7, 0, 0], y: -0.35, ...LEGS_WIDE }),
      k(0.14, { torso: [0.35, -0.2, 0], uArmR: [-1.5, 0, 0.05], fArmR: [0, 0, 0], hand: [1.5, 0, 0], uArmL: [-0.4, 0, 0.6], y: -0.45, ...LEGS_LUNGE_R }, 'snap'),
      k(0.3, { torso: [0.3, -0.2, 0] }),
      k(0.6, { torso: [-0.35, 0, 0], uArmR: [-3.0, 0, 0.05], fArmR: [0, 0, 0], hand: [0.2, 0, 0], uArmL: [-2.6, 0, -0.1], fArmL: [-0.4, 0, 0], y: -0.05, head: [0.3, 0, 0], ...LEGS_WIDE }),
      k(0.78, { torso: [0.8, 0, 0], uArmR: [-0.8, 0, 0.05], fArmR: [0, 0, 0], hand: [0.9, 0, 0], uArmL: [-0.7, 0, 0.1], y: -0.9, head: [-0.4, 0, 0], ...LEGS_KNEEL }, 'in'),
      k(1.25, { torso: [0.7, 0, 0], y: -0.85 }),
    ]),
    hits: [
      { t: 0.08, t1: 0.2, shape: 'line', len: 7.5, width: 2.8, dmg: 30, kb: 0.5, up: 3, sp: true },
      { t: 0.74, t1: 0.8, shape: 'circle', range: 5, off: 2.4, dmg: 40, kb: 2, up: 5, sp: true },
      { t: 0.82, t1: 0.9, shape: 'circle', range: 7.5, dmg: 150, kb: 12, up: 12, big: true, sp: true },
    ],
    ev: [[0.16, 'javtip'], [0.8, 'bolt']],
    sfxs: [[0.04, 'javelin'], [0.62, 'slash_down']],
  },
  SP_OUT: {
    dur: 0.55, rate: 1, armor: true, invuln: true, sp: true,
    wpn: [[0, 'javelin'], [0.25, null]],
    clip: clip([
      k(0, { torso: [0.7, 0, 0], uArmR: [-0.8, 0, 0.05], hand: [0.9, 0, 0], y: -0.85, ...LEGS_KNEEL }),
      k(0.55, {}),
    ]),
  },
  SPA_IN: {
    dur: 0.5, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spNext: 'SPA_FIRE',
    wpn: [[0, 'saber'], [0.25, 'bazooka']],
    jets: [0, 0.5, true],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -0.5], uArmL: [-0.5, 0, 0.5], ...LEGS_AIR }),
      k(0.3, { ...SHOULDER, torso: [0.35, -0.3, 0], ...LEGS_AIR }),
      k(0.5, { ...SHOULDER, torso: [0.45, -0.3, 0], uArmR: [-0.9, 0, -0.25], fArmR: [-1.0, 0, 0], hand: [2.1, 0, 0], ...LEGS_AIR }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SPA_FIRE: {
    dur: 0.42, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spRepeat: 11,
    wpn: [[0, 'bazooka']],
    jets: [0, 0.42, true],
    clip: clip([
      k(0, { ...SHOULDER, torso: [0.45, -0.3, 0], uArmR: [-0.9, 0, -0.25], fArmR: [-1.0, 0, 0], hand: [2.1, 0, 0], ...LEGS_AIR }),
      k(0.14, { torso: [0.2, -0.3, 0], uArmR: [-1.15, 0, -0.25] }, 'snap'),
      k(0.42, { torso: [0.45, -0.3, 0], uArmR: [-0.9, 0, -0.25] }),
    ]),
    shots: [{ t: 0.1, kind: 'bazooka', dn: true }],
  },
  SPC_CH: {
    dur: 1.1, rate: 1, armor: true, invuln: true, sp: true, chargeAura: true, spNext: 'SPC_HAM',
    wpn: [[0, null]],
    clip: clip([
      k(0, { torso: [-0.2, 0.3, 0], uArmR: [-3.0, 0, -0.35], hand: [0, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.35, { torso: [0.45, 0, 0], uArmR: [-0.2, 0, -0.9], fArmR: [-0.8, 0, 0], hand: [0.6, 0, 0], uArmL: [-0.2, 0, 0.9], fArmL: [-0.8, 0, 0], head: [-0.2, 0, 0], y: -0.55, ...LEGS_WIDE }),
      k(1.1, { torso: [0.5, 0, 0], y: -0.6 }),
    ]),
    ev: [[0.02, 'charge'], [1.05, 'burst']],
  },
  SPC_HAM: {
    dur: 4.5, rate: 1, armor: true, invuln: true, sp: true, rushFx: true, steer: 3.5, spNext: 'SPC_END',
    wpn: [[0, 'hammer']],
    ham: [[0, 0.6], [0.3, HAMMER_R]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -1.5], fArmR: [-0.1, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.8, 0, 0.6], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.3, { yaw: -PI * 0.5 }, 'in'),
      k(4.5, { yaw: -PI * 14.5 }, 'linear'),
    ]),
    hits: every(0.2, 4.45, 0.17, { shape: 'circle', range: 6.2, dmg: 14, kb: 5, up: 3, sp: true }),
    sfxs: times(0.2, 4.45, 0.316).map((t) => [t, 'hammer']),
  },
  SPC_END: {
    dur: 1.0, rate: 1, armor: true, invuln: true, sp: true,
    wpn: [[0, 'hammer'], [0.85, null]],
    ham: [[0, HAMMER_R], [0.28, HAMMER_R], [0.8, 0.6]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -1.5], hand: [1.2, 0, 0], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.28, { torso: [-0.3, 0.3, 0], uArmR: [-2.6, 0, -0.6], yaw: -PI * 1.1, y: -0.1 }, 'out'),
      k(0.8, { torso: [0.1, -0.2, 0], uArmR: [-0.9, 0, -0.4], fArmR: [-0.6, 0, 0], yaw: -PI * 1.1, y: -0.2 }),
      k(1.0, { yaw: -PI * 1.1 }),
    ]),
    hits: [{ t: 0.18, t1: 0.3, shape: 'circle', range: 6.6, dmg: 60, kb: 12, up: 14, big: true, sp: true }],
    sfxs: [[0.1, 'hammer']],
  },
};

// timed effects and sounds fire in order
for (const m of Object.values(MOVES)) for (const key of ['ev', 'sfxs']) m[key]?.sort((a, b) => a[0] - b[0]);
