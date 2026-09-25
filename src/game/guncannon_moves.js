// Guncannon moveset after Dynasty Warriors: Gundam Reborn's RX-77-2 (Kai Shiden): the right hand keeps the beam rifle,
// the left fist and the feet do the close work, and the twin 240mm shoulder cannons do everything heavy. Reach was
// measured off gameplay footage in heights (H ~ 3.4 units): the swing arcs sweep ~1.2 H out, and as in the game the
// blow lands a little past the arc (~1.5-1.7 H, level with the Gundam's saber) so it reaches into a crowd packed
// around the suit; the giant swing ~1.9 H, cannon blasts ~1 H across, the radial barrage bursting ~3 H out.
// Move fields as in moves.js, plus: tr: [[t0, t1, 'L' | 'R' | 'FL' | 'FR']] motion trails on the left fist, right fist or
// a foot; can: cannon aim curve (0 barrels up, 1 levelled forward over the shoulders, >1 angled down); hold: where a
// grabbed soldier is carried ('lift' overhead, 'swing' at arm's length while spinning); barrage: [t0, t1, every].
import { Clip, poseFrom } from '../core/rig.js';

const PI = Math.PI;

// Ready stance: rifle low in the right hand, left fist up.
export const GC_STANCE = poseFrom({
  y: -0.1,
  hips: [0, 0, 0],
  torso: [0.08, -0.12, 0],
  head: [-0.05, 0.1, 0],
  uArmR: [-0.2, 0, -0.22], fArmR: [-0.55, 0, 0], hand: [1.1, 0, 0],
  uArmL: [-0.6, 0, 0.28], fArmL: [-1.5, 0, 0],
  thighR: [-0.3, 0, -0.12], shinR: [0.42, 0, 0],
  thighL: [-0.05, 0, 0.12], shinL: [0.32, 0, 0],
});

const k = (t, p, e) => ({ t, p, e });
const clip = (keys) => new Clip(keys, GC_STANCE);
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
const LEGS_BRACE = { thighR: [-0.5, 0, -0.35], shinR: [0.9, 0, 0], thighL: [0.25, 0, 0.35], shinL: [0.5, 0, 0] };
// Left arm: out to the side and cocked back / swept across the front to the right / a straight punch / chambered.
const HOOK_OUT = { uArmL: [0, 0.45, 1.45], fArmL: [-0.7, 0, 0] };
const HOOK_IN = { uArmL: [0, -1.75, 1.45], fArmL: [-0.35, 0, 0] };
const JAB = { uArmL: [-1.5, -0.15, 0.08], fArmL: [-0.05, 0, 0] };
const CHAMBER = { uArmL: [-0.35, 0.25, 0.35], fArmL: [-2.1, 0, 0] };
const UPPER = { uArmL: [-2.7, 0, 0.1], fArmL: [-0.9, 0, 0] };
// Right arm: the rifle levelled at the target / held back out of the way / swung as a right hook.
const RIFLE = { torso: [0, -0.5, 0], uArmR: [-1.57, 0, 0.1], fArmR: [0, 0, 0], hand: [1.57, 0, 0], uArmL: [-0.6, 0, 0.28], fArmL: [-1.5, 0, 0], head: [0, -0.35, 0] };
const RIFLE_BACK = { uArmR: [0.35, 0, -0.35], fArmR: [-0.4, 0, 0], hand: [0.9, 0, 0] };
const ARMS_OUT = { uArmL: [0, 0, 1.5], fArmL: [-0.1, 0, 0], uArmR: [0, 0, -1.5], fArmR: [-0.1, 0, 0], hand: [1.3, 0, 0] };
const BOTH_REACH = { uArmL: [-1.45, -0.2, 0.3], fArmL: [-0.2, 0, 0], uArmR: [-1.45, 0.2, -0.3], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0] };
const OVERHEAD = { uArmL: [-2.95, 0, 0.35], fArmL: [-0.35, 0, 0], uArmR: [-2.95, 0, -0.35], fArmR: [-0.35, 0, 0], hand: [0.5, 0, 0] };

export const GC_MOVES = {
  // ---- normal string: hook, backhand, straight, spinning back kick, roundhouse, a hopping spin that launches ----
  N1: { // left hook
    dur: 0.5, chain: 0.3, next: 'N2', charge: 'C2',
    lunge: [[0.04, 0], [0.18, 1.3]],
    clip: clip([
      k(0, { torso: [0.1, 0.55, 0], ...HOOK_OUT, y: -0.2, ...LEGS_LUNGE_L }),
      k(0.07, { torso: [0.12, 0.65, 0] }),
      k(0.18, { torso: [0.15, -0.7, 0], ...HOOK_IN, y: -0.25, ...LEGS_LUNGE_R }, 'snap'),
      k(0.5, { torso: [0.1, -0.45, 0], uArmL: [-0.5, -1.2, 0.9], fArmL: [-0.9, 0, 0], y: -0.2 }),
    ]),
    hits: [{ t: 0.09, t1: 0.2, shape: 'arc', range: 5.2, arc: 160, dmg: 27, kb: 4, up: 1 }],
    tr: [[0.06, 0.24, 'L']], sfx: 'punch', swing: 0.07,
  },
  N2: { // left backhand, swinging back out across the body
    dur: 0.5, chain: 0.3, next: 'N3', charge: 'C3',
    lunge: [[0.03, 0], [0.16, 1.2]],
    clip: clip([
      k(0, { torso: [0.12, -0.8, 0], uArmL: [-0.2, -1.9, 1.2], fArmL: [-1.4, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.07, { torso: [0.14, -0.9, 0] }),
      k(0.17, { torso: [0.1, 0.75, 0], uArmL: [0, 0.3, 1.5], fArmL: [-0.1, 0, 0], y: -0.25, ...LEGS_LUNGE_L }, 'snap'),
      k(0.5, { torso: [0.1, 0.45, 0], uArmL: [-0.4, 0.2, 1.1], fArmL: [-0.8, 0, 0], y: -0.2 }),
    ]),
    hits: [{ t: 0.07, t1: 0.18, shape: 'arc', range: 5.3, arc: 200, dmg: 27, kb: 4.5, up: 0 }],
    tr: [[0.05, 0.22, 'L']], sfx: 'punch', swing: 0.07,
  },
  N3: { // stepping left straight
    dur: 0.48, chain: 0.3, next: 'N4', charge: 'C4',
    lunge: [[0.05, 0], [0.18, 1.8]],
    clip: clip([
      k(0, { torso: [0.05, 0.5, 0], ...CHAMBER, y: -0.2, ...LEGS_WIDE }),
      k(0.08, { torso: [0.08, 0.6, 0] }),
      k(0.17, { torso: [0.3, -0.45, 0], ...JAB, y: -0.35, ...LEGS_LUNGE_L }, 'snap'),
      k(0.48, { torso: [0.2, -0.3, 0], uArmL: [-1.2, -0.1, 0.2], fArmL: [-0.5, 0, 0], y: -0.3 }),
    ]),
    hits: [{ t: 0.1, t1: 0.2, shape: 'arc', range: 5.8, arc: 110, dmg: 31, kb: 6.5, up: 0 }],
    tr: [[0.08, 0.22, 'L']], sfx: 'punch', swing: 0.09,
  },
  N4: { // spinning back kick: turn away, the right leg drives out behind into the target, keep turning to face it
    dur: 0.62, chain: 0.4, next: 'N5', charge: 'C5',
    lunge: [[0.04, 0], [0.3, 1.4]],
    clip: clip([
      k(0, { torso: [0.1, 0.2, 0], yaw: 0, y: -0.25, ...LEGS_WIDE }),
      k(0.14, { yaw: PI * 0.8, torso: [0.2, 0, 0], uArmL: [-0.8, 0, 0.9], ...RIFLE_BACK, thighR: [-0.4, 0, -0.2], shinR: [1.6, 0, 0], y: -0.15 }),
      k(0.24, { yaw: PI * 1.05, torso: [0.55, 0, 0], thighR: [1.35, 0, -0.1], shinR: [0.05, 0, 0], thighL: [-0.3, 0, 0.1], shinL: [0.5, 0, 0], y: -0.05 }, 'snap'),
      k(0.4, { yaw: PI * 1.5, torso: [0.3, 0, 0], thighR: [0.4, 0, -0.1], shinR: [1.0, 0, 0] }),
      k(0.62, { yaw: PI * 2, torso: [0.1, -0.2, 0], y: -0.2, ...LEGS_WIDE }),
    ]),
    hits: [{ t: 0.17, t1: 0.3, shape: 'arc', range: 5.6, arc: 180, dmg: 33, kb: 6, up: 1 }],
    tr: [[0.14, 0.34, 'FR']], sfx: 'kick', swing: 0.14,
  },
  N5: { // left roundhouse: the body turns right and the leg sweeps round in front
    dur: 0.58, chain: 0.36, next: 'N6', charge: 'C6',
    lunge: [[0.04, 0], [0.22, 1.5]],
    clip: clip([
      k(0, { torso: [0.1, 0.4, 0], yaw: 0.35, uArmL: [-0.8, 0, 0.8], y: -0.25, ...LEGS_WIDE }),
      k(0.08, { yaw: 0.5, thighL: [-0.4, 0, 0.8], shinL: [1.3, 0, 0], thighR: [-0.1, 0, -0.1], shinR: [0.2, 0, 0], y: -0.05 }),
      k(0.22, { yaw: -1.35, torso: [-0.1, -0.2, 0.25], thighL: [-0.35, 0, 1.45], shinL: [0.08, 0, 0], uArmL: [0, 0, 1.2], y: 0.05 }, 'snap'),
      k(0.36, { yaw: -1.5, thighL: [-0.2, 0, 0.9], shinL: [0.8, 0, 0] }),
      k(0.58, { yaw: 0, torso: [0.1, -0.2, 0], uArmL: [-0.6, 0, 0.28], y: -0.2, ...LEGS_WIDE }),
    ]),
    hits: [{ t: 0.1, t1: 0.25, shape: 'arc', range: 5.6, arc: 220, dmg: 33, kb: 5.5, up: 3 }],
    tr: [[0.08, 0.3, 'FL']], sfx: 'kick', swing: 0.09,
  },
  N6: { // a thruster hop into a full spin with both arms out: throws everyone around it into the air
    dur: 0.95, chain: 0.72, next: null, charge: null,
    lunge: [[0.05, 0], [0.3, 1.4]],
    air: [[0, 0], [0.22, 1.4], [0.5, 1.7], [0.78, 0]],
    jets: [0.06, 0.5, true],
    clip: clip([
      k(0, { torso: [0.1, 0.5, 0], uArmL: [-0.3, 0.6, 1.3], fArmL: [-0.9, 0, 0], y: -0.35, yaw: 0, ...LEGS_WIDE }),
      k(0.2, { torso: [0.05, 0.3, 0], ...ARMS_OUT, y: 0, yaw: 0.3, ...LEGS_AIR }),
      k(0.5, { yaw: -PI * 2, torso: [0.05, -0.3, 0] }, 'linear'),
      k(0.78, { yaw: -PI * 2, torso: [0.2, 0, 0], uArmL: [-0.5, 0, 0.8], y: -0.35, ...LEGS_WIDE }),
      k(0.95, { yaw: -PI * 2, torso: [0.1, -0.1, 0], y: -0.2 }),
    ]),
    hits: [{ t: 0.24, t1: 0.5, shape: 'arc', range: 6, arc: 360, hy: 5, dmg: 46, kb: 5, up: 10, big: true }],
    tr: [[0.2, 0.52, 'L'], [0.2, 0.52, 'R']], sfx: 'spin_gc', swing: 0.2,
  },

  // ---- charge attacks ----
  // K alone: the beam rifle. Mash K for a shot combo; hold it for the twin-cannon charge shot.
  C1: {
    dur: 0.4, chain: 0.13, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true,
    clip: clip([
      k(0, { ...RIFLE, torso: [0, -0.45, 0], uArmR: [-1.3, 0, 0.1], fArmR: [-0.3, 0, 0], hand: [1.6, 0, 0] }),
      k(0.1, { ...RIFLE }, 'snap'),
      k(0.16, { torso: [-0.1, -0.5, 0], uArmR: [-1.8, 0, 0.1], hand: [1.4, 0, 0], y: -0.05 }, 'snap'),
      k(0.4, { uArmR: [-1.55, 0, 0.1], hand: [1.55, 0, 0] }),
    ]),
    shots: [{ t: 0.12, kind: 'rifle' }],
  },
  C1R: {
    dur: 0.26, chain: 0.1, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true, maxRepeat: 12,
    clip: clip([
      k(0, { ...RIFLE }),
      k(0.05, { torso: [-0.08, -0.5, 0], uArmR: [-1.75, 0, 0.1], hand: [1.42, 0, 0], y: -0.05 }, 'snap'),
      k(0.26, { ...RIFLE }),
    ]),
    shots: [{ t: 0.03, kind: 'rifle' }],
  },
  CS: { // charge shot: gold rings, the suit braces on its thrusters and both cannons fire; the shells blow the target away
    dur: 1.55, chain: 1.3, rate: 1, next: null, charge: null, armor: true,
    can: [[0.2, 0], [0.5, 1]],
    jets: [0.5, 1.1, false],
    clip: clip([
      k(0, { torso: [0.05, -0.1, 0], uArmL: [-0.8, 0, 0.5], fArmL: [-1.2, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.45, { torso: [0.3, 0, 0], head: [-0.2, 0, 0], ...RIFLE_BACK, uArmL: [-0.2, 0, 0.6], fArmL: [-0.9, 0, 0], y: -0.45, ...LEGS_BRACE }),
      k(0.62, { torso: [0.32, 0, 0] }),
      k(0.66, { torso: [0.12, 0, 0], y: -0.4 }, 'snap'),
      k(0.74, { torso: [0.3, 0, 0], y: -0.45 }),
      k(0.78, { torso: [0.1, 0, 0], y: -0.42 }, 'snap'),
      k(1.2, { torso: [0.25, 0, 0], y: -0.4 }),
      k(1.55, { torso: [0.08, -0.12, 0], y: -0.15 }),
    ]),
    ev: [[0.02, 'flash', 'gold'], [0.26, 'flash', 'gold']],
    shots: [{ t: 0.62, kind: 'heavy', side: 0 }, { t: 0.74, kind: 'heavy', side: 1 }],
  },

  // J K: a thruster-assisted uppercut that carries the Guncannon up with its target.
  C2: {
    dur: 1.35, chain: 1.15, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.24, 0], [0.4, 1.2]],
    air: [[0.28, 0], [0.55, 2.6], [0.8, 2.8], [1.1, 0]],
    jets: [0.28, 0.75, true],
    clip: clip([
      k(0, { torso: [0.35, 0.3, 0], uArmL: [0.4, 0.2, 0.25], fArmL: [-1.4, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.24, { torso: [0.45, 0.4, 0], y: -0.55 }),
      k(0.34, { torso: [-0.3, -0.35, 0], ...UPPER, head: [-0.3, 0, 0], y: 0, ...LEGS_AIR }, 'snap'),
      k(0.8, { torso: [-0.2, -0.3, 0], uArmL: [-2.5, 0, 0.15] }),
      k(1.1, { torso: [0.35, 0, 0], uArmL: [-0.6, 0, 0.4], fArmL: [-1.3, 0, 0], y: -0.45, ...LEGS_WIDE }),
      k(1.35, { torso: [0.1, -0.1, 0], y: -0.15 }),
    ]),
    hits: [{ t: 0.28, t1: 0.44, shape: 'arc', range: 5.3, arc: 160, hy: 7, dmg: 44, kb: 2, up: 15, big: true }],
    tr: [[0.26, 0.5, 'L']],
    ev: [[0.02, 'flash', 'gold'], [1.1, 'land']],
    sfxs: [[0.26, 'uppercut']],
  },

  // J J K: grab the soldier in front, hoist it overhead, hurl it into the sky and shell it with both cannons.
  C3: {
    dur: 2.2, chain: 1.95, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.1, 0], [0.3, 1.8]],
    jets: [0.08, 0.3, false],
    hold: 'lift', holdT: [0.3, 1.02],
    clip: clip([
      k(0, { torso: [0.2, 0, 0], ...BOTH_REACH, y: -0.25, ...LEGS_LUNGE_L }),
      k(0.3, { torso: [0.3, 0, 0], y: -0.3 }),
      k(0.7, { torso: [-0.2, 0, 0], ...OVERHEAD, head: [-0.3, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.95, { torso: [-0.3, 0, 0], y: -0.35 }),
      k(1.05, { torso: [0.2, 0, 0], uArmL: [-2.6, 0, 0.3], uArmR: [-2.6, 0, -0.3], fArmL: [0, 0, 0], fArmR: [0, 0, 0], y: -0.1 }, 'snap'),
      k(1.25, { torso: [-0.35, 0, 0], head: [-0.55, 0, 0], ...RIFLE_BACK, uArmL: [-0.4, 0, 0.6], fArmL: [-1.2, 0, 0], y: -0.35, ...LEGS_BRACE }),
      k(1.46, { torso: [-0.3, 0, 0] }),
      k(1.5, { torso: [-0.15, 0, 0], y: -0.45 }, 'snap'),
      k(1.8, { torso: [-0.2, 0, 0], y: -0.35 }),
      k(2.2, { torso: [0.08, -0.12, 0], head: [-0.05, 0.1, 0], y: -0.15 }),
    ]),
    ev: [[0.0, 'flash', 'violet'], [0.3, 'grab'], [1.02, 'throw', 'up']],
    shots: [{ t: 1.45, kind: 'aa', side: 0 }, { t: 1.53, kind: 'aa', side: 1 }],
    sfxs: [[0.1, 'kick'], [1.0, 'throw']],
  },

  // J J J K: the cannons level over the shoulders and pound the target point-blank, four times.
  C4: {
    dur: 1.9, chain: 1.65, rate: 1, next: null, charge: null, armor: true,
    can: [[0.1, 0], [0.34, 1]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], ...RIFLE_BACK, uArmL: [-0.5, 0, 0.5], fArmL: [-1.3, 0, 0], y: -0.25, ...LEGS_WIDE }),
      k(0.34, { torso: [0.25, 0, 0], y: -0.4, ...LEGS_BRACE }),
      ...[0.42, 0.72, 1.0, 1.28].flatMap((t) => [
        k(t, { torso: [0.28, 0, 0], y: -0.4 }),
        k(t + 0.04, { torso: [0.02, 0, 0], y: -0.33 }, 'snap'),
        k(t + 0.2, { torso: [0.24, 0, 0], y: -0.4 }),
      ]),
      k(1.9, { torso: [0.08, -0.12, 0], y: -0.15 }),
    ]),
    ev: [[0.0, 'flash', 'gold']],
    shots: [0.42, 0.72, 1.0, 1.28].map((t, i) => ({ t, kind: 'pb', side: i % 2, last: i === 3 })),
  },

  // J J J J K: braced on its thrusters, a rapid string of shells that juggles the target higher with every hit.
  C5: {
    dur: 1.75, chain: 1.5, rate: 1, next: null, charge: null, armor: true,
    can: [[0.1, 0], [0.3, 0.72]],
    jets: [0.3, 1.25, false],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], ...RIFLE_BACK, uArmL: [-0.5, 0, 0.5], fArmL: [-1.3, 0, 0], y: -0.25, ...LEGS_WIDE }),
      k(0.3, { torso: [0.15, 0, 0], head: [-0.25, 0, 0], y: -0.45, ...LEGS_BRACE }),
      ...[0.36, 0.47, 0.58, 0.69, 0.8, 0.91, 1.02].flatMap((t) => [
        k(t, { torso: [0.16, 0, 0], y: -0.45 }),
        k(t + 0.03, { torso: [0.0, 0, 0], y: -0.4 }, 'snap'),
      ]),
      k(1.4, { torso: [0.12, 0, 0], y: -0.4 }),
      k(1.75, { torso: [0.08, -0.12, 0], head: [-0.05, 0.1, 0], y: -0.15 }),
    ]),
    ev: [[0.0, 'flash', 'gold']],
    shots: [0.36, 0.47, 0.58, 0.69, 0.8, 0.91, 1.02].map((t, i) => ({ t, kind: 'juggle', side: i % 2, last: i === 6 })),
  },

  // J J J J J K: grab, then the giant swing: round and round with the soldier as a club, and let go.
  C6: {
    dur: 3.0, chain: 2.75, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.08, 0], [0.3, 2.2]],
    jets: [0.06, 0.3, false],
    hold: 'swing', holdT: [0.28, 2.42],
    clip: clip([
      k(0, { torso: [0.25, 0, 0], ...BOTH_REACH, y: -0.25, yaw: 0, ...LEGS_LUNGE_L }),
      k(0.34, { torso: [0.1, 0, 0], y: -0.3 }),
      k(0.5, { torso: [-0.3, 0, 0], ...BOTH_REACH, uArmL: [-1.35, -0.3, 0.2], uArmR: [-1.35, 0.3, -0.2], y: -0.35, yaw: -PI * 0.6, ...LEGS_WIDE }, 'in'),
      k(2.42, { yaw: -PI * 8, torso: [-0.35, 0, 0] }, 'linear'),
      k(2.55, { yaw: -PI * 8.05, torso: [0.25, 0, 0], uArmL: [-2.2, 0, 0.3], uArmR: [-2.2, 0, -0.3], y: -0.15, ...LEGS_LUNGE_L }, 'snap'),
      k(3.0, { yaw: -PI * 8, torso: [0.08, -0.12, 0], ...RIFLE_BACK, uArmL: [-0.6, 0, 0.28], fArmL: [-1.5, 0, 0], y: -0.15 }),
    ]),
    hits: every(0.5, 2.4, 0.14, { shape: 'circle', range: 6.6, dmg: 12, kb: 6, up: 3.5 }),
    ev: [[0.0, 'flash', 'pink'], [0.28, 'grab'], ...times(0.55, 2.4, 0.3).map((t) => [t, 'whirl']), [2.42, 'throw', 'out']],
    sfxs: [[0.1, 'kick'], ...times(0.6, 2.4, 0.3).map((t) => [t, 'spin_gc']), [2.4, 'throw']],
  },

  // ---- boost dash: a rush of punches (keep pressing J), then an uppercut; or a launch and an anti-air blast ----
  DA: {
    dur: 0.36, chain: 0.22, rate: 1, next: 'DA', charge: 'DC', armor: true, rush: true,
    slide: [0, 0.36, 7],
    jets: [0, 0.36, false],
    clip: clip([
      k(0, { torso: [0.35, 0.5, 0], ...CHAMBER, y: -0.35, ...LEGS_LUNGE_L }),
      k(0.09, { torso: [0.4, -0.5, 0], ...JAB, y: -0.4, ...LEGS_LUNGE_R }, 'snap'),
      k(0.18, { torso: [0.3, -0.8, 0], uArmL: [-0.2, -1.9, 1.2], fArmL: [-1.3, 0, 0] }),
      k(0.28, { torso: [0.35, 0.7, 0], uArmL: [0, 0.3, 1.5], fArmL: [-0.1, 0, 0], y: -0.35, ...LEGS_LUNGE_L }, 'snap'),
      k(0.36, { torso: [0.35, 0.5, 0], ...CHAMBER }),
    ]),
    hits: [
      { t: 0.04, t1: 0.12, shape: 'arc', range: 5.1, arc: 170, dmg: 14, kb: 1.5, up: 0, pull: 1, stop: 1 },
      { t: 0.22, t1: 0.31, shape: 'arc', range: 5.1, arc: 210, dmg: 14, kb: 1.5, up: 0, pull: 1, stop: 1 },
    ],
    tr: [[0.03, 0.34, 'L']],
    sfxs: [[0.03, 'punch'], [0.21, 'punch']],
  },
  DAF: {
    dur: 0.8, chain: 0.55, rate: 1, next: null, charge: null, armor: true,
    slide: [0, 0.2, 6],
    air: [[0.08, 0], [0.3, 1.6], [0.6, 0]],
    jets: [0, 0.35, true],
    clip: clip([
      k(0, { torso: [0.35, 0.3, 0], uArmL: [0.4, 0.2, 0.25], fArmL: [-1.4, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.14, { torso: [-0.3, -0.35, 0], ...UPPER, head: [-0.3, 0, 0], y: 0, ...LEGS_AIR }, 'snap'),
      k(0.6, { torso: [0.3, 0, 0], uArmL: [-0.6, 0, 0.4], fArmL: [-1.3, 0, 0], y: -0.4, ...LEGS_WIDE }),
      k(0.8, { torso: [0.1, -0.1, 0], y: -0.15 }),
    ]),
    hits: [{ t: 0.08, t1: 0.2, shape: 'arc', range: 5.3, arc: 190, hy: 6, dmg: 34, kb: 4, up: 12, big: true }],
    tr: [[0.06, 0.3, 'L']],
    ev: [[0.6, 'land']],
    sfxs: [[0.05, 'uppercut']],
  },
  DC: { // dash charge: launch the target, blast it with both cannons as it comes down, back-flip clear of the explosion
    dur: 1.35, chain: 1.15, rate: 1, next: null, charge: null, armor: true,
    air: [[0.62, 0], [0.84, 2.6], [1.08, 0]],
    jets: [0.6, 0.85, true],
    lunge: [[0.62, 0], [1.08, -2.4]],
    clip: clip([
      k(0, { torso: [0.35, 0.3, 0], uArmL: [0.4, 0.2, 0.25], fArmL: [-1.4, 0, 0], y: -0.5, pitch: 0, ...LEGS_LUNGE_R }),
      k(0.12, { torso: [-0.3, -0.35, 0], ...UPPER, head: [-0.3, 0, 0], y: 0, ...LEGS_WIDE }, 'snap'),
      k(0.34, { torso: [-0.4, 0, 0], head: [-0.6, 0, 0], ...RIFLE_BACK, uArmL: [-0.4, 0, 0.6], fArmL: [-1.2, 0, 0], y: -0.4, ...LEGS_BRACE }),
      k(0.5, { torso: [-0.32, 0, 0] }),
      k(0.54, { torso: [-0.15, 0, 0], y: -0.5 }, 'snap'),
      k(0.62, { torso: [-0.1, 0, 0], pitch: 0, y: -0.45, ...LEGS_WIDE }),
      k(0.95, { pitch: -PI * 2, torso: [0.2, 0, 0], y: 0, ...LEGS_AIR }, 'smooth'),
      k(1.08, { pitch: -PI * 2, torso: [0.3, 0, 0], y: -0.5, ...LEGS_WIDE }),
      k(1.35, { pitch: -PI * 2, torso: [0.08, -0.12, 0], y: -0.15 }),
    ]),
    hits: [{ t: 0.04, t1: 0.16, shape: 'arc', range: 5.3, arc: 210, hy: 6, dmg: 30, kb: 2, up: 14, big: true }],
    tr: [[0.03, 0.2, 'L']],
    ev: [[0.02, 'flash', 'pink'], [0.2, 'flash', 'red'], [1.08, 'land']],
    shots: [{ t: 0.5, kind: 'aa', side: 0 }, { t: 0.55, kind: 'aa', side: 1 }],
    sfxs: [[0.03, 'uppercut']],
  },

  // ---- aerial ----
  JA: {
    dur: 0.5, chain: 0.3, next: null, charge: null, isAir: true,
    clip: clip([
      k(0, { torso: [-0.2, 0.4, 0], ...CHAMBER, ...LEGS_AIR }),
      k(0.16, { torso: [0.5, -0.4, 0], uArmL: [-1.1, -0.1, 0.1], fArmL: [0, 0, 0] }, 'snap'),
      k(0.5, { torso: [0.3, -0.2, 0], uArmL: [-0.9, 0, 0.3], fArmL: [-0.6, 0, 0] }),
    ]),
    hits: [{ t: 0.06, t1: 0.2, shape: 'arc', range: 5.1, arc: 160, dmg: 26, kb: 4, up: 4, hy: 5 }],
    tr: [[0.04, 0.22, 'L']], sfx: 'punch', swing: 0.05,
  },
  JC: { // both cannons fired down at the ground ahead mid-jump
    dur: 0.9, chain: 0.7, next: null, charge: null, isAir: true, hang: 0.5,
    can: [[0, 0.3], [0.14, 1.3]],
    clip: clip([
      k(0, { torso: [0.3, 0, 0], ...RIFLE_BACK, uArmL: [-0.4, 0, 0.6], fArmL: [-1.2, 0, 0], ...LEGS_AIR }),
      k(0.2, { torso: [0.5, 0, 0], head: [0.2, 0, 0] }),
      k(0.24, { torso: [0.25, 0, 0] }, 'snap'),
      k(0.9, { torso: [0.35, 0, 0] }),
    ]),
    shots: [{ t: 0.2, kind: 'cannon', dn: true, side: 0 }, { t: 0.28, kind: 'cannon', dn: true, side: 1 }],
  },

  // ---- SP attacks ----
  // Ground: a starburst, then a storm of punches that walks forward, and a last blow that blasts the target away.
  // Hold SP through the starburst for the charge SP (shells fired out in every direction); in the air: hover and
  // shell the target point-blank.
  SP_IN: {
    dur: 0.55, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SP_FL', spHold: 'SPC_CH',
    clip: clip([
      k(0, { torso: [0, 0, 0], ...CHAMBER }),
      k(0.22, { torso: [0.35, 0.2, 0], uArmL: [-0.2, 0.2, 0.5], fArmL: [-2.2, 0, 0], ...RIFLE_BACK, head: [-0.2, 0, 0], y: -0.35, ...LEGS_WIDE }, 'snap'),
      k(0.55, { torso: [0.4, 0.25, 0] }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SP_FL: {
    dur: 3.4, rate: 1, armor: true, invuln: true, sp: true, loop: 0.2, rushFx: true, steer: 3, blur: true, spNext: 'SP_FIN',
    clip: clip([
      k(0, { torso: [0.3, 0.5, 0], ...CHAMBER, uArmR: [-0.9, 0, -0.3], fArmR: [-1.2, 0, 0], hand: [1.3, 0, 0], y: -0.35, ...LEGS_LUNGE_L }),
      k(0.05, { torso: [0.35, -0.4, 0], ...JAB }, 'snap'),
      k(0.1, { torso: [0.3, 0.4, 0], ...CHAMBER, uArmR: [-1.5, 0, -0.1], fArmR: [0, 0, 0], hand: [1.5, 0, 0] }, 'snap'),
      k(0.15, { torso: [0.35, -0.3, 0], uArmL: [-1.4, -0.4, 0.2], fArmL: [-0.2, 0, 0], uArmR: [-0.9, 0, -0.3], fArmR: [-1.2, 0, 0] }, 'snap'),
      k(0.2, { torso: [0.3, 0.5, 0], ...CHAMBER }),
    ]),
    hits: [
      ...every(0.04, 3.3, 0.06, { shape: 'arc', range: 5.3, arc: 160, dmg: 7, kb: 0.4, up: 0.2, pull: 1.3, sp: true }),
      ...every(0.3, 3.3, 0.6, { shape: 'arc', range: 5.9, arc: 220, dmg: 10, kb: 1.5, up: 0.5, sp: true }),
    ],
    tr: [[0, 3.4, 'L']],
    sfxs: times(0, 3.3, 0.1).map((t) => [t + 0.02, 'punch_fast']),
  },
  SP_FIN: {
    dur: 0.95, rate: 1, armor: true, invuln: true, sp: true,
    lunge: [[0.22, 0], [0.34, 2]],
    clip: clip([
      k(0, { torso: [0.2, 0.7, 0], ...CHAMBER, uArmL: [0.2, 0.5, 0.6], y: -0.4, ...LEGS_WIDE }),
      k(0.24, { torso: [0.25, 0.8, 0], y: -0.45 }),
      k(0.32, { torso: [0.35, -0.6, 0], ...JAB, y: -0.5, ...LEGS_LUNGE_L }, 'snap'),
      k(0.7, { torso: [0.3, -0.5, 0] }),
      k(0.95, { torso: [0.08, -0.12, 0], y: -0.15 }),
    ]),
    hits: [{ t: 0.3, t1: 0.4, shape: 'line', len: 8.5, width: 4.2, hy: 5, dmg: 120, kb: 16, up: 8, big: true, sp: true }],
    tr: [[0.26, 0.45, 'L']],
    ev: [[0.33, 'finpunch']],
    sfxs: [[0.3, 'uppercut']],
  },
  SPA_IN: {
    dur: 0.5, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spNext: 'SPA_FIRE',
    can: [[0.1, 0], [0.45, 1.25]],
    jets: [0, 0.5, true],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -0.5], uArmL: [-0.5, 0, 0.5], ...LEGS_AIR }),
      k(0.3, { torso: [0.4, 0, 0], ...RIFLE_BACK, uArmL: [-0.4, 0, 0.6], fArmL: [-1.2, 0, 0], ...LEGS_AIR }),
      k(0.5, { torso: [0.45, 0, 0] }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SPA_FIRE: {
    dur: 0.3, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spRepeat: 16,
    can: [[0, 1.25]],
    jets: [0, 0.3, true],
    clip: clip([
      k(0, { torso: [0.45, 0, 0], ...RIFLE_BACK, uArmL: [-0.4, 0, 0.6], fArmL: [-1.2, 0, 0], ...LEGS_AIR }),
      k(0.08, { torso: [0.3, 0, 0] }, 'snap'),
      k(0.3, { torso: [0.45, 0, 0] }),
    ]),
    shots: [{ t: 0.06, kind: 'cannon', dn: true, alt: true }],
  },
  SPC_CH: {
    dur: 1.1, rate: 1, armor: true, invuln: true, sp: true, chargeAura: true, spNext: 'SPC_BAR',
    can: [[0.3, 0], [0.9, 0.8]],
    clip: clip([
      k(0, { torso: [0.35, 0.2, 0], uArmL: [-0.2, 0.2, 0.5], fArmL: [-2.2, 0, 0], ...RIFLE_BACK, y: -0.35, ...LEGS_WIDE }),
      k(0.35, { torso: [0.45, 0, 0], uArmL: [-0.2, 0, 0.9], fArmL: [-0.8, 0, 0], uArmR: [-0.2, 0, -0.9], fArmR: [-0.8, 0, 0], head: [-0.2, 0, 0], y: -0.55, ...LEGS_WIDE }),
      k(1.1, { torso: [0.5, 0, 0], y: -0.6 }),
    ]),
    ev: [[0.02, 'charge'], [1.05, 'burst']],
  },
  SPC_BAR: { // shells fired out in every direction from both cannons while the suit turns on the spot
    dur: 4.6, rate: 1, armor: true, invuln: true, sp: true, rushFx: true, spNext: 'SPC_END',
    can: [[0, 0.8], [4.4, 0.8], [4.6, 0.3]],
    barrage: [0.1, 4.5, 0.14],
    clip: clip([
      k(0, { torso: [0.2, 0, 0], ...RIFLE_BACK, uArmL: [-0.3, 0, 0.8], fArmL: [-0.9, 0, 0], y: -0.45, yaw: 0, ...LEGS_BRACE }),
      k(4.6, { yaw: -PI * 4 }, 'linear'),
    ]),
  },
  SPC_END: {
    dur: 1.1, rate: 1, armor: true, invuln: true, sp: true,
    can: [[0, 0.3], [0.6, 0]],
    clip: clip([
      k(0, { torso: [0.2, 0, 0], y: -0.45, yaw: 0, ...LEGS_BRACE }),
      k(0.25, { torso: [-0.2, 0, 0], head: [-0.3, 0, 0], y: -0.2 }),
      k(1.1, { torso: [0.08, -0.12, 0], y: -0.15, ...LEGS_WIDE }),
    ]),
    ev: [[0.12, 'finale']],
  },
};

for (const m of Object.values(GC_MOVES)) for (const key of ['ev', 'sfxs']) m[key]?.sort((a, b) => a[0] - b[0]);
