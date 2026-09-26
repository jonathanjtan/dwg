// RB-79 Ball moveset after Dynasty Warriors: Gundam Reborn's Ball: a space pod that fights by tumbling into its
// enemies claws first and settles everything else with its 180mm recoilless cannon. From the Reborn footage: the
// basic string is six tumbling claw swipes ending in a launching flip; K fires the cannon (mash for a shot combo,
// hold for one heavy shell); J K is a claw flurry into a rising launcher; the dash combo spins along the ground with
// both arms out; the dash charge spins, flashes violet and fires point-blank; the SP flails both arms in a blur and
// ends in a point-blank blast; the aerial SP rams the target and blasts it. The rest of the charge attacks are built
// from the same tools: a bowling-ball roll, a spinning top, an anti-air cannon juggle and a meteor drop.
// Reach: the claw swipes' white arcs sweep out about two pod widths past the claws (~5 units, level with the
// Guncannon's blows), spins a little further, cannon blasts ~2.6 units across, the meteor drop ~7.5.
//
// The Ball has no legs to pose. Channels: torso [pitch, yaw, roll] tumbles the whole pod about its centre (positive
// pitch rolls it forward, positive roll tips it to its right); head [pitch] aims the cannon (0 straight up, ~1.35
// level, ~2.2 down at the ground ahead); yaw spins it; y is the height of the hover (Ball.carryPose adds the float).
// Move fields as in moves.js, plus: tr: [[t0, t1, 'L' | 'R']] claw trails; blur: afterimage arms (SP flurry);
// roll: [t0, t1] rolling along the ground (dust, rumble); dive: the height an aerial SP phase sinks to (so its
// blows reach the ground).
import { Clip, poseFrom } from '../core/rig.js';

const PI = Math.PI;

// Ready stance: arms raised out to the sides, claws open, cannon tipped a little forward.
export const BALL_STANCE = poseFrom({
  y: 0,
  torso: [0.06, 0, 0],
  head: [0.25, 0, 0],
  uArmR: [-0.4, 0, -1.8], fArmR: [-1.0, 0, 0], hand: [0.3, 0, 0],
  uArmL: [-0.4, 0, 1.8], fArmL: [-1.0, 0, 0], handL: [0.3, 0, 0],
});

const k = (t, p, e) => ({ t, p, e });
const clip = (keys) => new Clip(keys, BALL_STANCE);
const times = (t0, t1, step) => {
  const out = [];
  for (let t = t0; t < t1 - 1e-6; t += step) out.push(t);
  return out;
};
const every = (t0, t1, step, spec) => times(t0, t1, step).map((t) => ({ t, t1: t + step * 0.8, ...spec }));

// Arms (the right arm is on the -X side). OUT: cocked out to the side and back; IN: swept across the front.
const REST = { uArmR: [-0.4, 0, -1.8], fArmR: [-1.0, 0, 0], hand: [0.3, 0, 0], uArmL: [-0.4, 0, 1.8], fArmL: [-1.0, 0, 0], handL: [0.3, 0, 0] };
const R_OUT = { uArmR: [0, -0.55, -1.5], fArmR: [-0.3, 0, 0], hand: [0.2, 0, 0] };
const R_IN = { uArmR: [0, 1.75, -1.5], fArmR: [-0.15, 0, 0], hand: [0, 0, 0] };
const L_OUT = { uArmL: [0, 0.55, 1.5], fArmL: [-0.3, 0, 0], handL: [0.2, 0, 0] };
const L_IN = { uArmL: [0, -1.75, 1.5], fArmL: [-0.15, 0, 0], handL: [0, 0, 0] };
const ARMS_OUT = { uArmR: [0, 0, -1.55], fArmR: [-0.05, 0, 0], hand: [0, 0, 0], uArmL: [0, 0, 1.55], fArmL: [-0.05, 0, 0], handL: [0, 0, 0] };
const ARMS_FWD = { uArmR: [-1.55, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0, 0, 0], uArmL: [-1.55, 0, 0.3], fArmL: [-0.1, 0, 0], handL: [0, 0, 0] };
const ARMS_UP = { uArmR: [-2.8, 0, -0.35], fArmR: [-0.2, 0, 0], uArmL: [-2.8, 0, 0.35], fArmL: [-0.2, 0, 0] };
const ARMS_TUCK = { uArmR: [-0.2, 0, -0.6], fArmR: [-2.5, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.2, 0, 0.6], fArmL: [-2.5, 0, 0], handL: [1.2, 0, 0] };
const ARMS_BACK = { uArmR: [0.8, 0, -1.1], fArmR: [-0.3, 0, 0], uArmL: [0.8, 0, 1.1], fArmL: [-0.3, 0, 0] };
// Cannon: tipped forward at rest / levelled at the target / aimed at the ground ahead / nearly straight up.
const CAN_REST = { head: [0.25, 0, 0] };
const CAN_LEVEL = { head: [1.35, 0, 0] };
const CAN_DOWN = { head: [2.2, 0, 0] };
const CAN_SKY = { head: [0.1, 0, 0] };

export const BALL_MOVES = {
  // ---- normal string: tumbling claw swipes, a somersault, a barrel roll, a spin, and a launching backflip ----
  N1: { // right claw: a thruster lunge and a diagonal swipe across the front
    dur: 0.5, chain: 0.3, next: 'N2', charge: 'C2',
    lunge: [[0.02, 0], [0.16, 1.5]], jets: [0.02, 0.16, false],
    clip: clip([
      k(0, { torso: [0.15, -0.6, 0.35], ...R_OUT }),
      k(0.07, { torso: [0.2, -0.7, 0.4] }),
      k(0.18, { torso: [0.4, 0.65, -0.5], ...R_IN }, 'snap'),
      k(0.5, { torso: [0.15, 0.35, -0.2], uArmR: [-0.3, 1.2, -1.4], fArmR: [-0.6, 0, 0] }),
    ]),
    hits: [{ t: 0.08, t1: 0.2, shape: 'arc', range: 5.0, arc: 160, dmg: 26, kb: 4, up: 1 }],
    tr: [[0.05, 0.24, 'R']], sfx: 'claw', swing: 0.06,
  },
  N2: { // left claw backhand, the pod rolling the other way
    dur: 0.5, chain: 0.3, next: 'N3', charge: 'C3',
    lunge: [[0.02, 0], [0.16, 1.3]], jets: [0.02, 0.16, false],
    clip: clip([
      k(0, { torso: [0.15, 0.6, -0.35], ...L_OUT, uArmR: [-0.3, 1.2, -1.4], fArmR: [-0.6, 0, 0] }),
      k(0.07, { torso: [0.2, 0.7, -0.4] }),
      k(0.18, { torso: [0.4, -0.7, 0.55], ...L_IN }, 'snap'),
      k(0.5, { torso: [0.15, -0.35, 0.2], uArmL: [-0.3, -1.2, 1.4], fArmL: [-0.6, 0, 0], ...R_OUT }),
    ]),
    hits: [{ t: 0.08, t1: 0.2, shape: 'arc', range: 5.1, arc: 190, dmg: 26, kb: 4.5, up: 0 }],
    tr: [[0.05, 0.24, 'L']], sfx: 'claw', swing: 0.06,
  },
  N3: { // forward somersault with both claws out: a wheel of a cut in front
    dur: 0.56, chain: 0.34, next: 'N4', charge: 'C4',
    lunge: [[0.04, 0], [0.3, 2.0]], jets: [0.04, 0.3, false],
    air: [[0.04, 0], [0.18, 0.6], [0.34, 0]],
    clip: clip([
      k(0, { torso: [-0.45, 0, 0], ...ARMS_UP }),
      k(0.06, { torso: [-0.55, 0, 0] }),
      k(0.3, { torso: [PI * 2 - 0.2, 0, 0], ...ARMS_FWD }, 'in'),
      k(0.56, { torso: [PI * 2 + 0.06, 0, 0], ...REST }),
    ]),
    hits: [{ t: 0.12, t1: 0.28, shape: 'arc', range: 5.3, arc: 120, hy: 5, dmg: 30, kb: 6.5, up: 2 }],
    tr: [[0.06, 0.32, 'R'], [0.06, 0.32, 'L']], sfx: 'spin_ball', swing: 0.08,
  },
  N4: { // barrel roll with both arms out: the claws sweep both sides at once
    dur: 0.6, chain: 0.38, next: 'N5', charge: 'C5',
    lunge: [[0.04, 0], [0.3, 1.4]], jets: [0.04, 0.3, false],
    clip: clip([
      k(0, { torso: [0.2, 0, 0.45], ...ARMS_OUT }),
      k(0.08, { torso: [0.2, 0, 0.55] }),
      k(0.34, { torso: [0.2, 0, -PI * 2 + 0.15] }, 'in'),
      k(0.6, { torso: [0.08, 0, -PI * 2], ...REST }),
    ]),
    hits: [{ t: 0.1, t1: 0.3, shape: 'arc', range: 5.2, arc: 240, dmg: 30, kb: 5, up: 2 }],
    tr: [[0.08, 0.34, 'R'], [0.08, 0.34, 'L']], sfx: 'spin_ball', swing: 0.09,
  },
  N5: { // a flat spin, arms out: a full circle
    dur: 0.56, chain: 0.36, next: 'N6', charge: 'C6',
    lunge: [[0.04, 0], [0.24, 1.2]],
    clip: clip([
      k(0, { torso: [0.15, 0, 0], yaw: 0, ...ARMS_OUT }),
      k(0.06, { yaw: -0.35 }),
      k(0.3, { yaw: PI * 2, torso: [0.3, 0, 0] }, 'in'),
      k(0.56, { yaw: PI * 2, torso: [0.08, 0, 0], ...REST }),
    ]),
    hits: [{ t: 0.1, t1: 0.3, shape: 'arc', range: 5.2, arc: 360, dmg: 30, kb: 6, up: 3 }],
    tr: [[0.08, 0.32, 'R'], [0.08, 0.32, 'L']], sfx: 'spin_ball', swing: 0.08,
  },
  N6: { // a thruster hop into a backflip, claws raking up through everything in front: launches
    dur: 0.9, chain: 0.68, next: null, charge: null,
    lunge: [[0.04, 0], [0.3, 1.2]],
    air: [[0.04, 0], [0.26, 1.9], [0.52, 2.1], [0.78, 0]],
    jets: [0.04, 0.45, true],
    clip: clip([
      k(0, { torso: [0.5, 0, 0], ...ARMS_FWD, uArmR: [-0.6, 0, -0.4], uArmL: [-0.6, 0, 0.4] }),
      k(0.08, { torso: [0.6, 0, 0] }),
      k(0.46, { torso: [0.5 - PI * 2, 0, 0], ...ARMS_UP }, 'in'),
      k(0.78, { torso: [0.15 - PI * 2, 0, 0], ...REST, y: -0.15 }),
      k(0.9, { torso: [0.06 - PI * 2, 0, 0], y: 0 }),
    ]),
    hits: [{ t: 0.12, t1: 0.34, shape: 'arc', range: 5.3, arc: 200, hy: 6, dmg: 44, kb: 4, up: 12, big: true }],
    tr: [[0.1, 0.4, 'R'], [0.1, 0.4, 'L']], ev: [[0.78, 'land']], sfx: 'uppercut', swing: 0.1,
  },

  // ---- charge attacks ----
  // K alone: the 180mm cannon. Mash K for a shot combo; hold it for one heavy shell.
  C1: {
    dur: 0.42, chain: 0.15, rate: 1, next: null, charge: 'C1R', shot: true,
    clip: clip([
      k(0, { torso: [0.05, 0, 0], ...CAN_REST }),
      k(0.1, { torso: [0.12, 0, 0], ...CAN_LEVEL }, 'snap'),
      k(0.15, { torso: [-0.14, 0, 0], head: [1.2, 0, 0], y: 0.05 }, 'snap'),
      k(0.42, { torso: [0.08, 0, 0], ...CAN_LEVEL, y: 0 }),
    ]),
    shots: [{ t: 0.12, kind: 'shell' }],
  },
  C1R: {
    dur: 0.33, chain: 0.12, rate: 1, next: null, charge: 'C1R', shot: true, maxRepeat: 8,
    clip: clip([
      k(0, { torso: [0.08, 0, 0], ...CAN_LEVEL }),
      k(0.06, { torso: [-0.14, 0, 0], head: [1.2, 0, 0], y: 0.05 }, 'snap'),
      k(0.33, { torso: [0.08, 0, 0], ...CAN_LEVEL, y: 0 }),
    ]),
    shots: [{ t: 0.04, kind: 'shell' }],
  },
  CS: { // charge shot: gold rings, the pod braces on its thrusters and fires one heavy shell; the recoil shoves it back
    dur: 1.35, chain: 1.1, rate: 1, next: null, charge: null, armor: true,
    jets: [0.4, 0.9, false],
    lunge: [[0.62, 0], [0.8, -1.1]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], ...CAN_REST, ...ARMS_OUT }),
      k(0.45, { torso: [0.25, 0, 0], ...CAN_LEVEL, uArmR: [0.3, 0, -1.3], uArmL: [0.3, 0, 1.3], y: -0.1 }),
      k(0.6, { torso: [0.28, 0, 0] }),
      k(0.66, { torso: [-0.4, 0, 0], head: [1.1, 0, 0], y: 0.1 }, 'snap'),
      k(1.0, { torso: [-0.1, 0, 0], ...CAN_LEVEL, y: 0 }),
      k(1.35, { torso: [0.06, 0, 0], ...CAN_REST, ...REST }),
    ]),
    ev: [[0.02, 'flash', 'gold'], [0.26, 'flash', 'gold']],
    shots: [{ t: 0.62, kind: 'heavy' }],
  },

  // J K: dash in, a tumbling flurry of claw swipes, a gold flash and a rising cut that launches.
  C2: {
    dur: 1.6, chain: 1.35, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.02, 0], [0.2, 2.4]], jets: [0.02, 0.2, false],
    air: [[0.96, 0], [1.2, 2], [1.5, 0]],
    clip: clip([
      k(0, { torso: [0.3, -0.5, 0.4], ...R_OUT, ...L_IN }),
      ...[0.14, 0.33, 0.52, 0.71].flatMap((t, i) => [
        k(t, i % 2 ? { torso: [0.45, -0.7, 0.8], ...R_OUT, ...L_IN } : { torso: [0.45, 0.7, -0.8], ...R_IN, ...L_OUT }, 'snap'),
        k(t + 0.1, { torso: [0.35, i % 2 ? -0.45 : 0.45, i % 2 ? 0.5 : -0.5] }),
      ]),
      k(0.92, { torso: [0.2, 0, 0], ...ARMS_FWD, uArmR: [-0.5, 0, -0.5], uArmL: [-0.5, 0, 0.5] }),
      k(1.14, { torso: [0.2 - PI * 2, 0, 0], ...ARMS_UP }, 'in'),
      k(1.5, { torso: [0.1 - PI * 2, 0, 0], ...REST, y: -0.15 }),
      k(1.6, { torso: [0.06 - PI * 2, 0, 0], y: 0 }),
    ]),
    hits: [
      ...every(0.12, 0.88, 0.19, { shape: 'arc', range: 5.0, arc: 200, dmg: 13, kb: 1, up: 0.5, pull: 1.2, stop: 1 }),
      { t: 1.0, t1: 1.16, shape: 'arc', range: 5.3, arc: 200, hy: 7, dmg: 42, kb: 2, up: 15, big: true },
    ],
    tr: [[0.1, 0.9, 'R'], [0.1, 0.9, 'L'], [0.96, 1.2, 'R'], [0.96, 1.2, 'L']],
    ev: [[0.92, 'flash', 'gold'], [1.5, 'land']],
    sfxs: [[0.12, 'claw'], [0.31, 'claw'], [0.5, 'claw'], [0.69, 'claw'], [0.98, 'uppercut']],
  },

  // J J K: arms tucked in, the pod rolls along the ground like a bowling ball, bowling over everything in its path.
  C3: {
    dur: 1.7, chain: 1.45, rate: 1, next: null, charge: null, armor: true,
    slide: [0.2, 1.25, 11], roll: [0.2, 1.25],
    air: [[1.25, 0], [1.42, 1.3], [1.62, 0]],
    jets: [0.05, 0.25, false],
    clip: clip([
      k(0, { torso: [-0.3, 0, 0], ...ARMS_TUCK, y: 0.1 }),
      k(0.2, { torso: [0.2, 0, 0], y: -0.25 }),
      k(1.25, { torso: [0.2 + PI * 10, 0, 0] }, 'linear'),
      k(1.42, { torso: [PI * 10 + 0.8, 0, 0], ...REST, y: 0.1 }),
      k(1.7, { torso: [PI * 10 + 0.06, 0, 0], y: 0 }),
    ]),
    hits: [
      ...every(0.2, 1.25, 0.1, { shape: 'line', len: 2.6, width: 4.2, dmg: 15, kb: 7, up: 5 }),
      { t: 1.25, t1: 1.35, shape: 'circle', range: 4.2, dmg: 30, kb: 8, up: 6, big: true },
    ],
    ev: [[0.0, 'flash', 'violet'], [1.62, 'land']],
    sfxs: [[0.18, 'qb'], ...times(0.22, 1.25, 0.2).map((t) => [t, 'broll'])],
  },

  // J J J K: a spinning top, both arms out, that drags the crowd in and flings it away at the end.
  C4: {
    dur: 2.05, chain: 1.8, rate: 1, next: null, charge: null, armor: true,
    slide: [0.2, 1.6, 2.2],
    jets: [0.2, 1.6, true],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], ...ARMS_OUT, yaw: 0 }),
      k(0.2, { torso: [0.05, 0, 0.12], yaw: 0.6 }, 'in'),
      k(1.62, { torso: [0.05, 0, -0.12], yaw: PI * 12 }, 'linear'),
      k(1.8, { torso: [0.2, 0, 0], yaw: PI * 12.4, ...ARMS_OUT }, 'out'),
      k(2.05, { torso: [0.06, 0, 0], yaw: PI * 12, ...REST }),
    ]),
    hits: [
      ...every(0.22, 1.6, 0.12, { shape: 'circle', range: 5.0, dmg: 9, kb: 0.5, up: 0.3, pull: 0.8, stop: 1 }),
      { t: 1.62, t1: 1.72, shape: 'circle', range: 5.6, dmg: 40, kb: 13, up: 6, big: true },
    ],
    tr: [[0.2, 1.7, 'R'], [0.2, 1.7, 'L']],
    ev: [[0.0, 'flash', 'gold'], ...times(0.3, 1.6, 0.3).map((t) => [t, 'whirl']), [1.62, 'whirl']],
    sfxs: times(0.22, 1.62, 0.22).map((t) => [t, 'spin_ball']),
  },

  // J J J J K: a claw swipe that launches, then the cannon swings up and shells the target three times in the air.
  C5: {
    dur: 1.7, chain: 1.45, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.04, 0], [0.18, 1.2]],
    clip: clip([
      k(0, { torso: [0.35, 0, 0], ...ARMS_FWD, uArmR: [-0.4, 0, -0.5], uArmL: [-0.4, 0, 0.5] }),
      k(0.14, { torso: [-0.35, 0, 0], ...ARMS_UP }, 'snap'),
      k(0.4, { torso: [-0.3, 0, 0], ...CAN_SKY, ...REST, y: -0.1 }),
      ...[0.55, 0.85, 1.15].flatMap((t) => [
        k(t, { torso: [-0.3, 0, 0] }),
        k(t + 0.04, { torso: [-0.05, 0, 0], y: -0.2 }, 'snap'),
        k(t + 0.2, { torso: [-0.28, 0, 0], y: -0.1 }),
      ]),
      k(1.7, { torso: [0.06, 0, 0], ...CAN_REST, y: 0 }),
    ]),
    hits: [{ t: 0.06, t1: 0.18, shape: 'arc', range: 5.1, arc: 180, hy: 6, dmg: 32, kb: 1, up: 14, big: true }],
    tr: [[0.04, 0.22, 'R'], [0.04, 0.22, 'L']],
    ev: [[0.0, 'flash', 'gold']],
    shots: [0.58, 0.88, 1.18].map((t, i) => ({ t, kind: 'aa', last: i === 2 })),
    sfxs: [[0.05, 'uppercut']],
  },

  // J J J J J K: the meteor drop. Thrusters straight up, a somersault at the top, then down body first: the whole
  // pod hits the ground like a shell.
  C6: {
    dur: 1.75, chain: 1.5, rate: 1, next: null, charge: null, armor: true, invuln: true,
    lunge: [[0.1, 0], [0.9, 2.5]],
    air: [[0.08, 0], [0.5, 7.5], [0.72, 8], [0.95, 0]],
    jets: [0.08, 0.55, true],
    clip: clip([
      k(0, { torso: [0.3, 0, 0], ...ARMS_TUCK, y: -0.2 }),
      k(0.08, { torso: [-0.2, 0, 0], ...ARMS_UP, y: 0 }),
      k(0.72, { torso: [PI * 2 + 0.9, 0, 0], ...ARMS_TUCK }, 'in'),
      k(0.95, { torso: [PI * 2 + 1.1, 0, 0] }),
      k(1.2, { torso: [PI * 2 + 0.2, 0, 0], ...ARMS_OUT, y: -0.3 }, 'snap'),
      k(1.75, { torso: [PI * 2 + 0.06, 0, 0], ...REST, y: 0 }),
    ]),
    hits: [
      { t: 0.95, t1: 1.05, shape: 'circle', range: 7.5, hy: 5, dmg: 72, kb: 14, up: 11, big: true },
    ],
    ev: [[0.0, 'flash', 'red'], [0.95, 'meteor']],
    sfxs: [[0.06, 'qb'], [0.7, 'uppercut']],
  },

  // ---- boost dash: a spin along the ground with both arms out (keep pressing J), then a launching flip; or spins,
  // a violet flash and a point-blank shell ----
  DA: {
    dur: 0.36, chain: 0.22, rate: 1, next: 'DA', charge: 'DC', armor: true, rush: true,
    slide: [0, 0.36, 7],
    jets: [0, 0.36, false],
    clip: clip([
      k(0, { torso: [0.35, 0, 0], ...ARMS_OUT, yaw: 0, y: -0.2 }),
      k(0.34, { torso: [0.35, 0, 0], yaw: PI * 2 }, 'linear'),
      k(0.36, { yaw: PI * 2 }),
    ]),
    hits: [
      { t: 0.04, t1: 0.14, shape: 'arc', range: 4.8, arc: 360, dmg: 14, kb: 1.5, up: 0, pull: 1, stop: 1 },
      { t: 0.22, t1: 0.32, shape: 'arc', range: 4.8, arc: 360, dmg: 14, kb: 1.5, up: 0, pull: 1, stop: 1 },
    ],
    tr: [[0, 0.36, 'R'], [0, 0.36, 'L']],
    sfxs: [[0.02, 'spin_ball']],
  },
  DAF: {
    dur: 0.8, chain: 0.55, rate: 1, next: null, charge: null, armor: true,
    slide: [0, 0.2, 6],
    air: [[0.06, 0], [0.3, 1.8], [0.62, 0]],
    jets: [0, 0.35, true],
    clip: clip([
      k(0, { torso: [0.5, 0, 0], ...ARMS_FWD }),
      k(0.36, { torso: [0.4 - PI * 2, 0, 0], ...ARMS_UP }, 'in'),
      k(0.62, { torso: [0.15 - PI * 2, 0, 0], ...REST, y: -0.15 }),
      k(0.8, { torso: [0.06 - PI * 2, 0, 0], y: 0 }),
    ]),
    hits: [{ t: 0.06, t1: 0.22, shape: 'arc', range: 5.2, arc: 200, hy: 6, dmg: 34, kb: 4, up: 12, big: true }],
    tr: [[0.04, 0.34, 'R'], [0.04, 0.34, 'L']],
    ev: [[0.62, 'land']],
    sfxs: [[0.04, 'uppercut']],
  },
  DC: {
    dur: 1.45, chain: 1.2, rate: 1, next: null, charge: null, armor: true,
    slide: [0, 0.55, 3.5],
    lunge: [[0.84, 0], [1.02, -1.6]],
    jets: [0, 0.55, false],
    clip: clip([
      k(0, { torso: [0.3, 0, 0.5], ...ARMS_OUT, yaw: 0 }),
      k(0.58, { torso: [0.3, 0, -0.5], yaw: PI * 4 }, 'linear'),
      k(0.72, { torso: [0.2, 0, 0], yaw: PI * 4, ...CAN_LEVEL, ...REST }),
      k(0.84, { torso: [0.25, 0, 0] }),
      k(0.88, { torso: [-0.45, 0, 0], head: [1.1, 0, 0], y: 0.15 }, 'snap'),
      k(1.2, { torso: [-0.1, 0, 0], ...CAN_LEVEL, y: 0 }),
      k(1.45, { torso: [0.06, 0, 0], ...CAN_REST }),
    ]),
    hits: [
      ...every(0.04, 0.56, 0.18, { shape: 'arc', range: 4.9, arc: 360, dmg: 16, kb: 1, up: 1, pull: 1.2, stop: 1 }),
    ],
    tr: [[0, 0.58, 'R'], [0, 0.58, 'L']],
    ev: [[0.6, 'flash', 'violet']],
    shots: [{ t: 0.85, kind: 'pb', last: true }],
    sfxs: [[0.02, 'spin_ball'], [0.2, 'spin_ball'], [0.38, 'spin_ball']],
  },

  // ---- aerial ----
  JA: { // a forward tumble, claws out
    dur: 0.5, chain: 0.3, next: null, charge: null, isAir: true,
    clip: clip([
      k(0, { torso: [-0.4, 0, 0], ...ARMS_UP }),
      k(0.26, { torso: [PI * 2 - 0.3, 0, 0], ...ARMS_FWD }, 'in'),
      k(0.5, { torso: [PI * 2 + 0.1, 0, 0], ...REST }),
    ]),
    hits: [{ t: 0.06, t1: 0.24, shape: 'arc', range: 5.0, arc: 170, dmg: 26, kb: 4, up: 4, hy: 5 }],
    tr: [[0.04, 0.28, 'R'], [0.04, 0.28, 'L']], sfx: 'spin_ball', swing: 0.04,
  },
  JC: { // the cannon fired down at the ground ahead mid-jump
    dur: 0.85, chain: 0.65, next: null, charge: null, isAir: true, hang: 0.5,
    clip: clip([
      k(0, { torso: [0.15, 0, 0], ...CAN_REST }),
      k(0.16, { torso: [0.35, 0, 0], ...CAN_DOWN }),
      k(0.22, { torso: [0.05, 0, 0], head: [2.0, 0, 0] }, 'snap'),
      k(0.85, { torso: [0.2, 0, 0], ...CAN_DOWN }),
    ]),
    shots: [{ t: 0.2, kind: 'dn' }],
  },

  // ---- SP attacks ----
  // Ground: a starburst, then both arms flail in a blur while the pod pushes forward, and a point-blank shell ends it.
  // Hold SP through the starburst for the charge SP: the Ball squadron flies in and fires volley after volley.
  // In the air: ram the target and blast it point-blank.
  SP_IN: {
    dur: 0.55, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SP_FL', spHold: 'SPC_CH',
    clip: clip([
      k(0, { torso: [0, 0, 0], ...ARMS_TUCK }),
      k(0.22, { torso: [0.3, 0, 0], ...ARMS_OUT, y: -0.2 }, 'snap'),
      k(0.55, { torso: [0.35, 0, 0] }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SP_FL: {
    dur: 3.0, rate: 1, armor: true, invuln: true, sp: true, loop: 0.24, steer: 3, blur: true, spNext: 'SP_FIN',
    clip: clip([
      k(0, { torso: [0.35, 0.3, -0.2], ...R_OUT, ...L_IN }),
      k(0.06, { torso: [0.4, -0.3, 0.2], ...R_IN, ...L_OUT }, 'snap'),
      k(0.12, { torso: [0.35, 0.2, 0.25], ...ARMS_FWD, uArmR: [-2.2, 0, -0.6] }, 'snap'),
      k(0.18, { torso: [0.4, -0.2, -0.25], ...ARMS_OUT }, 'snap'),
      k(0.24, { torso: [0.35, 0.3, -0.2], ...R_OUT, ...L_IN }, 'snap'),
    ]),
    hits: [
      ...every(0.04, 2.9, 0.06, { shape: 'arc', range: 4.8, arc: 150, dmg: 7, kb: 0.4, up: 0.2, pull: 1.2, sp: true }),
      ...every(0.3, 2.9, 0.6, { shape: 'arc', range: 5.4, arc: 220, dmg: 10, kb: 1.5, up: 0.5, sp: true }),
    ],
    tr: [[0, 3.0, 'R'], [0, 3.0, 'L']],
    sfxs: times(0, 2.9, 0.09).map((t) => [t + 0.02, 'bflail']),
  },
  SP_FIN: {
    dur: 1.1, rate: 1, armor: true, invuln: true, sp: true,
    lunge: [[0.42, 0], [0.62, -2]],
    clip: clip([
      k(0, { torso: [0.2, 0, 0], ...ARMS_OUT, ...CAN_REST }),
      k(0.3, { torso: [0.3, 0, 0], ...CAN_LEVEL, ...ARMS_BACK, y: -0.1 }),
      k(0.4, { torso: [0.32, 0, 0] }),
      k(0.45, { torso: [-0.5, 0, 0], head: [1.05, 0, 0], y: 0.2 }, 'snap'),
      k(0.85, { torso: [-0.2, 0, 0], ...CAN_LEVEL, y: 0 }),
      k(1.1, { torso: [0.06, 0, 0], ...CAN_REST, ...REST }),
    ]),
    ev: [[0.05, 'charge'], [0.43, 'finblast']],
  },
  SPA_IN: {
    dur: 0.5, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spNext: 'SPA_RAM',
    jets: [0, 0.5, true],
    clip: clip([
      k(0, { torso: [0, 0, 0], ...ARMS_TUCK }),
      k(0.25, { torso: [0.3, 0, 0], ...ARMS_OUT }, 'snap'),
      k(0.5, { torso: [0.35, 0, 0] }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SPA_RAM: { // thrusters full: dive at the target and ram it, claws first
    dur: 0.7, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spNext: 'SPA_BLAST', dive: 1.5,
    lunge: [[0, 0], [0.45, 5]],
    jets: [0, 0.5, false],
    clip: clip([
      k(0, { torso: [0.6, 0, 0], ...ARMS_BACK }),
      k(0.35, { torso: [0.7, 0, 0], ...ARMS_FWD }),
      k(0.45, { torso: [-0.2, 0, 0] }, 'snap'),
      k(0.7, { torso: [0.1, 0, 0], ...CAN_LEVEL, ...ARMS_OUT }),
    ]),
    hits: [{ t: 0.3, t1: 0.46, shape: 'arc', range: 4.6, arc: 160, hy: 6, dmg: 40, kb: 3, up: 3, big: true, sp: true }],
    sfxs: [[0.02, 'qb'], [0.4, 'phit_heavy']],
  },
  SPA_BLAST: {
    dur: 1.0, rate: 1, armor: true, invuln: true, sp: true, isAir: true,
    lunge: [[0.2, 0], [0.5, -2.5]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], ...CAN_LEVEL, ...ARMS_OUT }),
      k(0.16, { torso: [0.2, 0, 0] }),
      k(0.21, { torso: [-0.6, 0, 0], head: [1.0, 0, 0] }, 'snap'),
      k(1.0, { torso: [0.1, 0, 0], ...CAN_REST, ...REST }),
    ]),
    ev: [[0.02, 'charge'], [0.2, 'finblast', 'air']],
  },
  // Charge SP: arms up to signal, the squadron drops in round the leader, six volleys, and they peel off.
  SPC_CH: {
    dur: 1.0, rate: 1, armor: true, invuln: true, sp: true, chargeAura: true, spNext: 'SPC_CALL',
    clip: clip([
      k(0, { torso: [0.3, 0, 0], ...ARMS_OUT }),
      k(0.35, { torso: [-0.15, 0, 0], ...ARMS_UP, y: 0.15 }),
      k(1.0, { torso: [-0.2, 0, 0] }),
    ]),
    ev: [[0.02, 'charge'], [0.95, 'burst']],
  },
  SPC_CALL: {
    dur: 1.0, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SPC_FIRE',
    clip: clip([
      k(0, { torso: [-0.2, 0, 0], ...ARMS_UP }),
      k(0.3, { torso: [-0.1, 0, 0], uArmR: [-2.9, 0, -0.9], uArmL: [-0.4, 0, 1.8] }),
      k(0.5, { uArmR: [-2.9, 0, -0.3] }),
      k(0.7, { uArmR: [-2.9, 0, -0.9] }),
      k(1.0, { torso: [0.1, 0, 0], ...CAN_LEVEL, ...REST }),
    ]),
    ev: [[0.02, 'wing']],
  },
  SPC_FIRE: {
    dur: 0.55, rate: 1, armor: true, invuln: true, sp: true, spRepeat: 6, spNext: 'SPC_END',
    clip: clip([
      k(0, { torso: [0.1, 0, 0], ...CAN_LEVEL }),
      k(0.06, { torso: [-0.2, 0, 0], head: [1.2, 0, 0] }, 'snap'),
      k(0.55, { torso: [0.1, 0, 0], ...CAN_LEVEL }),
    ]),
    ev: [[0.04, 'volley']],
    shots: [{ t: 0.04, kind: 'shell', sp: true }],
  },
  SPC_END: {
    dur: 1.0, rate: 1, armor: true, invuln: true, sp: true,
    clip: clip([
      k(0, { torso: [0.1, 0, 0], ...CAN_LEVEL }),
      k(0.3, { torso: [-0.1, 0, 0], ...ARMS_UP, ...CAN_REST }),
      k(1.0, { torso: [0.06, 0, 0], ...REST }),
    ]),
    ev: [[0.1, 'wingout']],
  },
};

for (const m of Object.values(BALL_MOVES)) for (const key of ['ev', 'sfxs']) m[key]?.sort((a, b) => a[0] - b[0]);
