// RGM-79 GM moveset after Dynasty Warriors: Gundam Reborn's GM ("GM ALL MOVES", youtube.com/watch?v=O_LGGjwOO7o,
// checked frame by frame). The Koei wiki has no GM page: its mass-production rule is that such suits get only C1 and
// C2 (DWG2 gave them one charge attack; DWG3 added S,T and a dash charge), and its Reborn entries for the Strike
// Dagger, Zaku Warrior and M1 Astray (the other mass-produced lines) match what the GM footage shows: a string of
// quick cuts while slowly advancing, up to five shots, a charge shot, one S,T, a dash rush and a dash charge.
// From the footage (seconds into the video):
// - J x6 (2.45-5.6): quick paired saber cuts, about half a second a press, ending in a fierce swipe that launches.
// - K (7.75-9.8): the beam spray gun, raised in 0.2 s; five shots 0.35 s apart; the arm is down 0.4 s after the last.
// - K held (12.0-13.6): the charge swirl, then the thrusters hop the GM back about 0.4 of its height while it fires
//   three heavy shots 0.2 s apart; the target is thrown far. The shots themselves don't shove it.
// - J K (15.5-19.0): a flurry of cuts, the gold flash, the shield lit gold and driven into the target, then a low
//   spinning cut that launches it, the saber held straight out after.
// - Dash J (21.1-23.5): a rush of cuts while dashing, ending in a rising cut that launches.
// - Dash K (25.8-29.8): a dashing flurry, a pink flash and a launching cut, a spray-gun shot up at the falling
//   target, then the saber thrust straight up into it as it comes down.
// - SP (31.9-34.3): the burst, a rising strike that throws the target up, the spray gun fired up at it and then
//   across the front, and a green swirl as it ends. One stock.
// - Aerial SP (36.3-39.8): shield first, the GM rams along the ground on its thrusters carrying its target, ending
//   in a teal burst. One stock.
// Not in either source, so made up here from the GM's own tools (saber, spray gun, shield) and tagged `new` on the
// roster: C3 (a fanned spray volley), C4 (a shield rush into a thrust), C5 (launch, then shoot it down from the air),
// C6 (a thruster thrust charge), the jump attacks, and the held SP (the GM braced behind its shield, sweeping the
// spray gun across the front, about 2.6 s a stock).
// Reach: the pink saber is ~1.1 GM heights (BLADE), cuts land ~5-5.4 units out, the C2 spin 5.4, spray shots ~30.
// Everything hits a little lighter than the Gundam's: a mass-produced suit (and the suit's `power` scales it again).
import { Clip, poseFrom } from '../core/rig.js';

const PI = Math.PI;
export const BLADE = 3.8; // beam saber length (units)

// Ready stance, as in the footage: the spray gun low in the right hand, the shield up on the left arm.
export const STANCE = poseFrom({
  y: -0.1,
  torso: [0.08, -0.15, 0],
  head: [-0.06, 0.15, 0],
  uArmR: [-0.25, 0, -0.25], fArmR: [-0.55, 0, 0], hand: [1.15, 0, 0],
  uArmL: [-0.15, 0, 0.2], fArmL: [-0.35, 0, 0], handL: [0, -0.8, 0],
  thighR: [-0.3, 0, -0.12], shinR: [0.42, 0, 0],
  thighL: [-0.05, 0, 0.12], shinL: [0.32, 0, 0],
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
const LEGS_WIDE = { thighR: [-0.2, 0, -0.45], shinR: [0.6, 0, 0], thighL: [-0.2, 0, 0.45], shinL: [0.6, 0, 0] };
const LEGS_AIR = { thighR: [-1.0, 0, -0.1], shinR: [1.5, 0, 0], thighL: [-0.3, 0, 0.1], shinL: [0.8, 0, 0] };
// Saber arm ends: horizontal sweeps swing an outstretched arm around the shoulder, held level so the blade sweeps flat.
const SWEEP_R = { uArmR: [0, -0.2, -1.55], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0] };
const SWEEP_L = { uArmR: [0, 1.9, -1.55], fArmR: [-0.15, 0, 0], hand: [1.2, 0, 0] };
const LOW_L = { torso: [0.25, 0.7, 0], uArmR: [0.2, 1.7, -1.1], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], y: -0.28 }; // cut down to low left
const HIGH_R = { torso: [-0.2, -0.75, 0], uArmR: [-2.3, -0.3, -0.85], fArmR: [-0.1, 0, 0], hand: [0.5, 0, 0], y: -0.18 }; // cut up to high right
const RIGHT = { torso: [0.12, -0.95, 0], ...SWEEP_R, hand: [1.1, 0, 0], y: -0.25 }; // flat cut out to the right
const THRUST_BACK = { torso: [0.1, -0.5, 0], uArmR: [-0.6, 0, -0.35], fArmR: [-1.5, 0, 0], hand: [1.4, 0, 0], y: -0.3 };
const THRUST = { torso: [0.45, -0.2, 0], uArmR: [-1.5, 0, -0.05], fArmR: [0, 0, 0], hand: [1.5, 0, 0], y: -0.42 };
// Beam spray gun held out level (the aim layer points it the rest of the way).
const SPRAY = { torso: [0, -0.5, 0], uArmR: [-1.57, 0, 0.12], fArmR: [0, 0, 0], hand: [1.57, 0, 0], uArmL: [-0.6, 0, 0.3], fArmL: [-1.0, 0, 0], head: [0, -0.35, 0] };
const KICK = { uArmR: [-1.74, 0, 0.12], hand: [1.45, 0, 0] }; // the gun jumps with each shot
// Shield driven ahead: the chest turned to lead with the left side, the forearm raised so the shield stands upright in
// front, its face to the front.
const BASH = { torso: [0.3, 0.7, 0], uArmL: [-0.6, 0, 0.1], fArmL: [-2.1, 0, 0], handL: [0, 1.4, 0], y: -0.35 };
const SHIELD_REST = { uArmL: [-0.15, 0, 0.2], fArmL: [-0.35, 0, 0], handL: [0, -0.8, 0] };
const SLASH = { stop: 1, pull: 0.8 };

// hit: { t, t1, shape, range, arc, len, width, off, hy, dmg, kb, up, big, pull, sp, stop }; shots: { t, kind, ang };
// wpn: [t, weapon] (saber | gun | null); ev: [t, name, arg]; see moves.js for the rest.
// Shot kinds (gm.js fire): spray (the rapid shot), cs (the charge burst), fan (a spread volley), down (at the ground
// or a launched target below), up (at a launched target above).
export const MOVES = {
  // ---- normal string: six presses of quick paired cuts, advancing a little each time; the sixth launches ----
  N1: { // down to the left, then back out to the right
    dur: 0.46, chain: 0.28, next: 'N2', charge: 'C2', saber: true,
    lunge: [[0.03, 0], [0.3, 1.1]],
    clip: clip([
      k(0, { ...HIGH_R, uArmL: [-0.8, 0, 0.4], ...LEGS_LUNGE_R }),
      k(0.1, { ...LOW_L, ...LEGS_LUNGE_L }, 'snap'),
      k(0.19, { torso: [0.27, 0.75, 0] }),
      k(0.29, { ...RIGHT, ...LEGS_LUNGE_R }, 'snap'),
      k(0.46, { torso: [0.1, -0.7, 0], uArmR: [-0.3, -0.3, -1.2] }),
    ]),
    hits: [
      { t: 0.03, t1: 0.12, shape: 'arc', range: 5.1, arc: 170, dmg: 12, kb: 1, up: 0, ...SLASH },
      { t: 0.21, t1: 0.3, shape: 'arc', range: 5.2, arc: 190, dmg: 14, kb: 3, up: 0.5 },
    ],
    sfxs: [[0.02, 'slash_fast'], [0.2, 'slash_fast']],
  },
  N2: { // rising cut up to the left, then an overhead chop
    dur: 0.48, chain: 0.3, next: 'N3', charge: 'C3', saber: true,
    lunge: [[0.03, 0], [0.32, 1.2]],
    clip: clip([
      k(0, { torso: [0.3, -0.9, 0], uArmR: [0.5, -0.4, -0.7], fArmR: [-0.2, 0, 0], hand: [1.3, 0, 0], y: -0.3, ...LEGS_LUNGE_R }),
      k(0.1, { torso: [-0.25, 0.7, 0], uArmR: [-2.5, 0.6, -0.6], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.15, ...LEGS_LUNGE_L }, 'snap'),
      k(0.19, { torso: [-0.3, 0.2, 0], uArmR: [-2.95, 0.1, -0.3], hand: [0.3, 0, 0], y: -0.08 }),
      k(0.31, { torso: [0.5, 0.05, 0], uArmR: [-0.9, 0, -0.1], fArmR: [-0.1, 0, 0], hand: [0.75, 0, 0], y: -0.4, ...LEGS_LUNGE_R }, 'snap'),
      k(0.48, { torso: [0.35, 0, 0], uArmR: [-0.8, 0, -0.2], y: -0.3 }),
    ]),
    hits: [
      { t: 0.03, t1: 0.12, shape: 'arc', range: 5.1, arc: 190, dmg: 12, kb: 1, up: 0, ...SLASH },
      { t: 0.22, t1: 0.32, shape: 'arc', range: 5.4, arc: 110, dmg: 16, kb: 3, up: 0 },
    ],
    sfxs: [[0.02, 'slash_fast'], [0.21, 'slash_h']],
  },
  N3: { // flat forehand, flat backhand
    dur: 0.46, chain: 0.28, next: 'N4', charge: 'C4', saber: true,
    lunge: [[0.03, 0], [0.3, 1.1]],
    clip: clip([
      k(0, { ...RIGHT, torso: [0.1, -1.0, 0], uArmL: [-0.9, 0, 0.5], ...LEGS_WIDE }),
      k(0.1, { torso: [0.15, 0.95, 0], ...SWEEP_L, uArmL: [-0.3, 0, 0.9], y: -0.3, ...LEGS_LUNGE_R }, 'snap'),
      k(0.18, { torso: [0.14, 1.0, 0], uArmR: [-0.3, 1.9, -1.3], fArmR: [-0.3, 0, 0] }),
      k(0.29, { torso: [0, -1.05, 0.1], uArmR: [-0.3, -0.5, -1.3], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.2, 0, 0.6], y: -0.3, ...LEGS_LUNGE_L }, 'snap'),
      k(0.46, { torso: [0.05, -0.6, 0.05], uArmR: [-0.5, 0, -0.9], hand: [0.8, 0, 0] }),
    ]),
    hits: [
      { t: 0.03, t1: 0.12, shape: 'arc', range: 5.2, arc: 200, dmg: 13, kb: 1, up: 0, ...SLASH },
      { t: 0.2, t1: 0.3, shape: 'arc', range: 5.2, arc: 200, dmg: 15, kb: 3, up: 0 },
    ],
    sfxs: [[0.02, 'slash_a'], [0.19, 'slash_b']],
  },
  N4: { // rising cut up to the right, then back down to the left
    dur: 0.48, chain: 0.3, next: 'N5', charge: 'C5', saber: true,
    lunge: [[0.03, 0], [0.3, 1.2]],
    clip: clip([
      k(0, { ...LOW_L, torso: [0.25, 0.8, 0], uArmR: [0, 1.9, -1.25], hand: [1.3, 0, 0], uArmL: [-0.8, 0, 0.5], y: -0.3, ...LEGS_LUNGE_L }),
      k(0.1, { ...HIGH_R, ...LEGS_LUNGE_R }, 'snap'),
      k(0.19, { torso: [-0.22, -0.8, 0], uArmR: [-2.6, -0.35, -0.9] }),
      k(0.29, { ...LOW_L, ...LEGS_LUNGE_L }, 'snap'),
      k(0.48, { torso: [0.2, 0.5, 0], uArmR: [-0.1, 1.3, -1.0], hand: [0.9, 0, 0] }),
    ]),
    hits: [
      { t: 0.03, t1: 0.12, shape: 'arc', range: 5.2, arc: 200, dmg: 13, kb: 1, up: 0, ...SLASH },
      { t: 0.21, t1: 0.31, shape: 'arc', range: 5.2, arc: 190, dmg: 16, kb: 3.5, up: 0 },
    ],
    sfxs: [[0.02, 'slash_rise'], [0.2, 'slash_fast']],
  },
  N5: { // overhead chop, then a thrust
    dur: 0.5, chain: 0.32, next: 'N6', charge: 'C6', saber: true,
    lunge: [[0.03, 0], [0.14, 0.9], [0.22, 0.9], [0.32, 1.9]],
    clip: clip([
      k(0, { torso: [-0.25, -0.2, 0], uArmR: [-2.9, 0, -0.25], fArmR: [-0.3, 0, 0], hand: [0.3, 0, 0], uArmL: [-0.3, 0, 0.5], y: -0.05 }),
      k(0.11, { torso: [0.55, 0.1, 0], uArmR: [-0.9, 0, -0.1], fArmR: [-0.1, 0, 0], hand: [0.75, 0, 0], y: -0.45, ...LEGS_LUNGE_R }, 'snap'),
      k(0.2, { ...THRUST_BACK }),
      k(0.3, { ...THRUST, ...LEGS_LUNGE_R }, 'snap'),
      k(0.5, { torso: [0.3, -0.2, 0], y: -0.35 }),
    ]),
    hits: [
      { t: 0.05, t1: 0.14, shape: 'arc', range: 5.5, arc: 110, dmg: 14, kb: 1, up: 0, ...SLASH },
      { t: 0.25, t1: 0.34, shape: 'line', len: 5.8, width: 2.4, dmg: 18, kb: 5, up: 0.5 },
    ],
    sfxs: [[0.04, 'slash_h'], [0.24, 'slash_dash']],
  },
  N6: { // a cut out to the left, then the "fierce swipe": a rising cut from low that throws its target
    dur: 0.9, chain: 0.7, next: null, charge: null, saber: true,
    lunge: [[0.03, 0], [0.3, 1.4]],
    clip: clip([
      k(0, { ...RIGHT, torso: [0.1, -0.9, 0], uArmL: [-0.9, 0, 0.5], ...LEGS_WIDE }),
      k(0.12, { torso: [0.15, 0.85, 0], ...SWEEP_L, uArmL: [-0.3, 0, 0.9], y: -0.3, ...LEGS_LUNGE_R }, 'snap'),
      k(0.24, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.36, { torso: [-0.35, 0.2, 0], uArmR: [-2.9, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.8], y: -0.05, ...LEGS_WIDE }, 'snap'),
      k(0.7, { torso: [-0.2, 0.2, 0], uArmR: [-2.6, 0.2, -0.5], y: -0.1 }),
      k(0.9, { torso: [0.1, -0.2, 0], uArmR: [-0.6, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], y: -0.1 }),
    ]),
    hits: [
      { t: 0.04, t1: 0.14, shape: 'arc', range: 5.2, arc: 200, dmg: 12, kb: 1, up: 0, ...SLASH },
      { t: 0.26, t1: 0.38, shape: 'arc', range: 5.4, arc: 180, hy: 5, dmg: 34, kb: 4, up: 12, big: true },
    ],
    sfxs: [[0.03, 'slash_fast'], [0.26, 'slash_rise']],
  },

  // ---- charge attacks ----
  // K: the beam spray gun, raised in 0.2 s. Mash K: a shot every 0.35 s (C1R's chain), five in all (maxRepeat); the
  // arm comes down 0.4 s after the last. Hold K: the charge burst. Light shots that only make a target flinch: the
  // mash's single-target damage is about 60% of the saber string's.
  C1: {
    dur: 0.6, chain: 0.535, rate: 1, next: null, charge: 'C1R', shot: true,
    wpn: [[0, 'gun']],
    clip: clip([
      k(0, { ...SPRAY, torso: [0, -0.3, 0], uArmR: [-0.7, 0, -0.1], fArmR: [-0.6, 0, 0], hand: [1.3, 0, 0] }),
      k(0.18, { ...SPRAY }, 'snap'),
      k(0.23, { ...KICK }, 'snap'),
      k(0.45, { ...SPRAY }),
      k(0.6, { ...SPRAY, uArmR: [-1.1, 0, -0.05], hand: [1.3, 0, 0] }),
    ]),
    shots: [{ t: 0.2, kind: 'spray' }],
  },
  C1R: {
    dur: 0.42, chain: 0.335, rate: 1, next: null, charge: 'C1R', shot: true, maxRepeat: 5,
    wpn: [[0, 'gun']],
    clip: clip([
      k(0, { ...SPRAY }),
      k(0.05, { ...KICK }, 'snap'),
      k(0.25, { ...SPRAY }),
      k(0.42, { ...SPRAY, uArmR: [-1.1, 0, -0.05], hand: [1.3, 0, 0] }),
    ]),
    shots: [{ t: 0, kind: 'spray' }],
  },
  CS: { // the charge swirl, a thruster hop back (about 0.4 of the GM's height) and three heavy shots on the way
    dur: 1.6, chain: 1.4, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'gun']],
    air: [[0.4, 0], [0.62, 0.9], [1.1, 0.7], [1.32, 0]],
    jets: [0.4, 1.2, true],
    clip: clip([
      k(0, { ...SPRAY, torso: [0.05, -0.25, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.36, { ...SPRAY, y: -0.32 }),
      k(0.5, { ...SPRAY, torso: [-0.15, -0.45, 0], y: 0, ...LEGS_AIR }),
      ...[0.75, 0.95, 1.15].flatMap((t) => [k(t, { ...SPRAY, torso: [-0.12, -0.5, 0] }), k(t + 0.04, { ...KICK }, 'snap')]),
      k(1.3, { ...SPRAY, y: -0.35, ...LEGS_WIDE }),
      k(1.6, { ...SPRAY, torso: [0, -0.35, 0], y: -0.1 }),
    ]),
    ev: [[0.02, 'flash', 'gold'], [0.26, 'flash', 'gold'], [0.42, 'hopback'], [1.32, 'land']],
    shots: [{ t: 0.76, kind: 'cs' }, { t: 0.96, kind: 'cs' }, { t: 1.16, kind: 'cs', last: true }],
    chargeFx: [0.0, 0.4],
  },

  // J K: as in Reborn, a flurry of cuts, the gold flash, the shield lit gold and driven into the target, then a low
  // spinning cut that throws it high, the saber held straight out after it.
  C2: {
    dur: 2.4, chain: 2.1, rate: 1, next: null, charge: null, saber: true, armor: true,
    lunge: [[0.02, 0], [0.95, 1.6], [1.1, 1.6], [1.26, 2.7]],
    clip: clip([
      k(0, { ...RIGHT, uArmL: [-0.8, 0, 0.4], ...LEGS_WIDE }),
      ...[[0.08, LOW_L], [0.25, HIGH_R], [0.42, LOW_L], [0.59, RIGHT], [0.76, LOW_L], [0.93, HIGH_R]].map(([t, p], i) =>
        k(t, { ...p, ...(i % 2 ? LEGS_LUNGE_R : LEGS_LUNGE_L) }, 'snap')),
      k(1.02, { torso: [0.1, -0.4, 0], uArmR: [-0.5, 0, -0.6], fArmR: [-0.9, 0, 0], hand: [0.6, 0, 0], uArmL: [-0.8, -0.3, 0.6], fArmL: [-1.0, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(1.18, { ...BASH, ...LEGS_LUNGE_L }, 'snap'),
      k(1.42, { ...BASH, torso: [0.4, 0.65, 0], y: -0.38 }),
      k(1.52, { torso: [0.1, -0.6, 0], ...SWEEP_R, ...SHIELD_REST, uArmL: [0, 0, 1.3], fArmL: [-0.3, 0, 0], y: -0.5, yaw: 0, ...LEGS_WIDE }),
      k(1.84, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(1.95, { yaw: PI * 2, torso: [0.15, -0.3, 0], uArmR: [-0.1, -0.9, -1.45], fArmR: [0, 0, 0], hand: [1.5, 0, 0], ...SHIELD_REST, y: -0.3 }),
      k(2.25, { yaw: PI * 2, torso: [0.12, -0.3, 0], y: -0.2 }),
      k(2.4, { yaw: PI * 2, torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.35], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], y: -0.12 }),
    ]),
    hits: [
      ...[0.04, 0.21, 0.38, 0.55, 0.72, 0.89].map((t) => ({ t, t1: t + 0.08, shape: 'arc', range: 5.2, arc: 190, dmg: 7, kb: 0.6, up: 0, pull: 1, stop: 1 })),
      { t: 1.16, t1: 1.28, shape: 'arc', range: 4.4, arc: 130, dmg: 22, kb: 1.5, up: 0.5, big: true },
      { t: 1.56, t1: 1.84, shape: 'arc', range: 5.4, arc: 360, hy: 4.5, dmg: 30, kb: 3, up: 14, big: true },
    ],
    ev: [[1.0, 'flash', 'gold'], [1.16, 'shieldhit']],
    sfxs: [[0.02, 'slash_fast'], [0.19, 'slash_fast'], [0.36, 'slash_fast'], [0.53, 'slash_fast'], [0.7, 'slash_fast'], [0.87, 'slash_fast'], [1.12, 'qb'], [1.18, 'slam'], [1.54, 'slash_spin']],
  },

  // J J K (made up here): the spray gun fanned across the front, three spread volleys.
  C3: {
    dur: 1.45, chain: 1.25, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'gun']],
    clip: clip([
      k(0, { ...SPRAY, torso: [0.05, -0.2, 0], y: -0.25, ...LEGS_WIDE }),
      ...[0.3, 0.62, 0.94].flatMap((t, i) => [k(t, { ...SPRAY, torso: [0.05, -0.5 + (i - 1) * 0.25, 0], y: -0.3 }), k(t + 0.05, { ...KICK }, 'snap')]),
      k(1.45, { ...SPRAY, torso: [0, -0.3, 0], y: -0.12 }),
    ]),
    ev: [[0.0, 'flash', 'gold']],
    shots: [0.3, 0.62, 0.94].flatMap((t) => [-0.44, -0.22, 0, 0.22, 0.44].map((ang) => ({ t, kind: 'fan', ang }))),
  },

  // J J J K (made up here): a thruster rush behind the shield that shoves everything ahead, then a thrust.
  C4: {
    dur: 1.5, chain: 1.3, saber: true, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.06, 0], [0.62, 6.5], [0.76, 6.5], [0.86, 7.6]],
    jets: [0.06, 0.62, false],
    clip: clip([
      k(0, { torso: [0.1, -0.4, 0], uArmR: [-0.5, 0, -0.6], fArmR: [-0.9, 0, 0], hand: [0.6, 0, 0], uArmL: [-0.8, -0.3, 0.6], fArmL: [-1.0, 0, 0], y: -0.25, ...LEGS_WIDE }),
      k(0.12, { ...BASH, uArmR: [-0.4, 0, -0.5], fArmR: [-0.9, 0, 0], ...LEGS_LUNGE_L }, 'snap'),
      k(0.6, { ...BASH, torso: [0.45, 0.7, 0] }),
      k(0.7, { ...THRUST_BACK, ...SHIELD_REST }),
      k(0.8, { ...THRUST, ...LEGS_LUNGE_R }, 'snap'),
      k(1.15, { ...THRUST, torso: [0.35, -0.2, 0] }),
      k(1.5, { torso: [0.1, -0.2, 0], uArmR: [-0.5, 0, -0.35], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], y: -0.12 }),
    ]),
    hits: [
      ...every(0.1, 0.62, 0.1, { shape: 'arc', range: 3.8, arc: 150, dmg: 7, kb: 3, up: 0.3, stop: 1 }),
      { t: 0.78, t1: 0.9, shape: 'line', len: 6.4, width: 2.6, dmg: 30, kb: 10, up: 4, big: true },
    ],
    ev: [[0.0, 'flash', 'gold'], [0.14, 'shieldhit']],
    sfxs: [[0.04, 'qb'], [0.14, 'slam'], [0.78, 'slash_dash']],
  },

  // J J J J K (made up here): a rising cut that carries the GM up with its target, then the spray gun fired down at it.
  C5: {
    dur: 1.85, chain: 1.65, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.5, 'gun']],
    air: [[0.08, 0], [0.42, 4.0], [1.2, 4.3], [1.55, 0]],
    jets: [0.08, 0.6, true],
    lunge: [[0.06, 0], [0.4, 1.2]],
    clip: clip([
      k(0, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.14, { torso: [-0.35, 0.2, 0], uArmR: [-2.9, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.3, 0, 0.8], y: 0, ...LEGS_AIR }, 'snap'),
      k(0.46, { torso: [-0.2, 0.2, 0], uArmR: [-2.6, 0.2, -0.4] }),
      k(0.6, { ...SPRAY, torso: [0.3, -0.4, 0], ...LEGS_AIR }),
      ...[0.75, 0.95, 1.15].flatMap((t) => [k(t, { ...SPRAY, torso: [0.3, -0.45, 0] }), k(t + 0.04, { ...KICK }, 'snap')]),
      k(1.55, { torso: [0.35, 0, 0], y: -0.45, ...LEGS_WIDE }),
      k(1.85, { torso: [0.1, -0.2, 0], y: -0.12 }),
    ]),
    hits: [{ t: 0.06, t1: 0.18, shape: 'arc', range: 5.4, arc: 180, hy: 6, dmg: 26, kb: 2, up: 15, big: true }],
    ev: [[0.0, 'flash', 'gold'], [1.55, 'land']],
    shots: [0.76, 0.96, 1.16].map((t) => ({ t, kind: 'down' })),
    sfxs: [[0.06, 'slash_rise']],
  },

  // J J J J J K (made up here): a crouch through the flash, then a thruster charge with the saber thrust out ahead,
  // straight through whatever is in the line.
  C6: {
    dur: 1.45, chain: 1.25, saber: true, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.3, 0], [0.74, 9.5]],
    jets: [0.28, 0.74, false],
    clip: clip([
      k(0, { ...THRUST_BACK, uArmL: [-0.9, 0, 0.4], y: -0.4, ...LEGS_WIDE }),
      k(0.26, { ...THRUST_BACK, torso: [0.2, -0.6, 0], y: -0.5 }),
      k(0.34, { ...THRUST, torso: [0.6, -0.2, 0], uArmL: [-0.3, 0, 0.7], y: -0.5, ...LEGS_LUNGE_R }, 'snap'),
      k(0.74, { ...THRUST, torso: [0.6, -0.2, 0], y: -0.5 }),
      k(1.05, { ...THRUST, torso: [0.3, -0.2, 0], y: -0.3, ...LEGS_WIDE }),
      k(1.45, { torso: [0.1, -0.2, 0], uArmR: [-0.5, 0, -0.35], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], uArmL: [-0.55, 0, 0.3], y: -0.12 }),
    ]),
    hits: [
      ...every(0.34, 0.74, 0.1, { shape: 'line', len: 5.2, width: 3.0, dmg: 10, kb: 3, up: 1, stop: 1 }),
      { t: 0.74, t1: 0.82, shape: 'circle', range: 4.4, off: 2.2, dmg: 36, kb: 12, up: 7, big: true },
    ],
    ev: [[0.0, 'flash', 'gold']],
    sfxs: [[0.3, 'qb'], [0.34, 'slash_dash'], [0.74, 'slash_h']],
  },

  // ---- boost dash: a rush of paired cuts (keep pressing J), ending in a rising cut that launches ----
  DA: {
    dur: 0.36, chain: 0.22, saber: true, rate: 1, next: 'DA', charge: 'DC', armor: true, rush: true,
    slide: [0, 0.36, 6.5],
    jets: [0, 0.36, false],
    clip: clip([
      k(0, { ...RIGHT, torso: [0.35, -0.9, 0], uArmL: [-1.0, 0, 0.5], y: -0.35, ...LEGS_LUNGE_L }),
      k(0.1, { ...LOW_L, torso: [0.4, 0.8, 0], y: -0.4, ...LEGS_LUNGE_R }, 'snap'),
      k(0.2, { torso: [0.3, 0.9, 0], uArmR: [0, 1.8, -1.2] }),
      k(0.3, { ...HIGH_R, torso: [0.2, -0.8, 0], y: -0.35, ...LEGS_LUNGE_L }, 'snap'),
      k(0.36, { torso: [0.25, -0.85, 0] }),
    ]),
    hits: [
      { t: 0.03, t1: 0.12, shape: 'arc', range: 5.2, arc: 190, dmg: 11, kb: 1.5, up: 0, pull: 1, stop: 1 },
      { t: 0.22, t1: 0.31, shape: 'arc', range: 5.2, arc: 190, dmg: 11, kb: 1.5, up: 0, pull: 1, stop: 1 },
    ],
    sfxs: [[0.02, 'slash_fast'], [0.2, 'slash_fast']],
  },
  DAF: {
    dur: 0.72, chain: 0.5, saber: true, rate: 1, next: null, charge: null, armor: true,
    slide: [0, 0.2, 5.5],
    jets: [0, 0.2, false],
    clip: clip([
      k(0, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.16, { torso: [-0.35, 0.2, 0], uArmR: [-2.9, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.8], y: 0, ...LEGS_WIDE }, 'snap'),
      k(0.72, { torso: [0.1, 0, 0], uArmR: [-0.6, 0, -0.3] }),
    ]),
    hits: [{ t: 0.06, t1: 0.18, shape: 'arc', range: 5.4, arc: 200, dmg: 30, kb: 4, up: 12, big: true }],
    sfx: 'slash_rise', swing: 0.04,
  },
  DC: { // as in Reborn: a dashing flurry, the pink flash and a launching cut, a spray-gun shot up at the target, then
    // the saber thrust straight up into it as it comes down
    dur: 2.65, chain: 2.4, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [1.55, 'gun'], [1.95, 'saber']],
    slide: [0, 1.15, 4.4],
    jets: [0, 1.15, false],
    clip: clip([
      k(0, { ...RIGHT, torso: [0.35, -0.9, 0], uArmL: [-1.0, 0, 0.5], y: -0.35, ...LEGS_LUNGE_L }),
      ...[[0.1, LOW_L], [0.27, HIGH_R], [0.44, LOW_L], [0.61, RIGHT], [0.78, LOW_L], [0.95, HIGH_R], [1.1, LOW_L]].map(([t, p], i) =>
        k(t, { ...p, torso: [p.torso[0] + 0.15, p.torso[1], 0], ...(i % 2 ? LEGS_LUNGE_L : LEGS_LUNGE_R) }, 'snap')),
      k(1.2, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(1.32, { torso: [-0.35, 0.2, 0], uArmR: [-2.9, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.05, ...LEGS_WIDE }, 'snap'),
      k(1.6, { ...SPRAY, torso: [-0.3, -0.4, 0], y: -0.15 }),
      k(1.8, { ...SPRAY, torso: [-0.3, -0.4, 0] }),
      k(1.84, { ...KICK }, 'snap'),
      k(2.02, { torso: [0.2, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-1.6, 0, 0], hand: [0.3, 0, 0], y: -0.45, ...LEGS_WIDE }),
      k(2.14, { torso: [-0.3, -0.1, 0], uArmR: [-3.05, 0, -0.05], fArmR: [0, 0, 0], hand: [0.2, 0, 0], y: -0.05 }, 'snap'),
      k(2.45, { torso: [-0.25, -0.1, 0], uArmR: [-3.0, 0, -0.05] }),
      k(2.65, { torso: [0.1, -0.2, 0], uArmR: [-0.6, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], y: -0.1 }),
    ]),
    hits: [
      ...[0.06, 0.23, 0.4, 0.57, 0.74, 0.91, 1.06].map((t) => ({ t, t1: t + 0.08, shape: 'arc', range: 5.2, arc: 190, dmg: 8, kb: 1, up: 0, pull: 1.2, stop: 1 })),
      { t: 1.24, t1: 1.36, shape: 'arc', range: 5.4, arc: 190, hy: 5, dmg: 24, kb: 1.5, up: 13, big: true },
      { t: 2.12, t1: 2.26, shape: 'circle', range: 3.8, off: 1.2, hy: 9, dmg: 34, kb: 11, up: 5, big: true },
    ],
    ev: [[1.2, 'flash', 'pink']],
    shots: [{ t: 1.8, kind: 'up' }],
    sfxs: [[0.08, 'slash_fast'], [0.25, 'slash_fast'], [0.42, 'slash_fast'], [0.59, 'slash_fast'], [0.76, 'slash_fast'], [0.93, 'slash_fast'], [1.08, 'slash_fast'], [1.24, 'slash_rise'], [2.1, 'javelin']],
  },

  // ---- aerial (made up here) ----
  JA: {
    dur: 0.5, chain: 0.3, saber: true, next: null, charge: null, isAir: true,
    clip: clip([
      k(0, { torso: [-0.3, -0.2, 0], uArmR: [-2.9, 0, -0.2], hand: [0.3, 0, 0], thighR: [-1.0, 0, 0], shinR: [1.4, 0, 0], thighL: [-0.3, 0, 0], shinL: [1.0, 0, 0] }),
      k(0.18, { torso: [0.6, 0, 0], uArmR: [-0.9, 0, -0.1], hand: [0.7, 0, 0] }, 'snap'),
      k(0.5, { torso: [0.3, 0, 0] }),
    ]),
    hits: [{ t: 0.06, t1: 0.2, shape: 'arc', range: 5.2, arc: 150, dmg: 22, kb: 4, up: 4, hy: 5 }],
    sfx: 'slash_a', swing: 0.06,
  },
  JC: { // the spray gun fired down at the ground ahead while hanging on the thrusters
    dur: 0.8, chain: 0.62, next: null, charge: null, isAir: true, hang: 0.55,
    wpn: [[0, 'gun']],
    clip: clip([
      k(0, { ...SPRAY, torso: [0.45, -0.3, 0], ...LEGS_AIR }),
      ...[0.14, 0.3, 0.46].flatMap((t) => [k(t, { ...SPRAY, torso: [0.45, -0.35, 0] }), k(t + 0.04, { ...KICK }, 'snap')]),
      k(0.8, { torso: [0.3, 0, 0] }),
    ]),
    shots: [0.15, 0.31, 0.47].map((t) => ({ t, kind: 'down' })),
  },

  // ---- SP attacks ----
  // Ground, as in Reborn: the burst, a rising strike that throws the target up, the spray gun fired up at it and then
  // across the front, and a green swirl that ends it. Hold SP through the burst (made up here): the GM braces behind
  // its shield and sweeps the spray gun across the front, longer per stock. In the air, as in Reborn: a shield-first
  // thruster ram along the ground that carries its target, ending in a teal burst.
  SP_IN: {
    dur: 0.5, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SP_UP', spHold: 'SPC_CH',
    wpn: [[0, 'saber']],
    clip: clip([
      k(0, { torso: [0, 0, 0], uArmR: [-0.2, 0, -0.3], hand: [0.4, 0, 0] }),
      k(0.22, { torso: [0.2, -0.3, 0], uArmR: [0.5, 0, -0.5], fArmR: [-0.3, 0, 0], hand: [0.3, 0, 0], uArmL: [-1.2, -0.3, 0.4], fArmL: [-0.8, 0, 0], y: -0.4, ...LEGS_WIDE }, 'snap'),
      k(0.5, { torso: [0.3, -0.35, 0], y: -0.45 }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SP_UP: { // shield and saber brought up together: everything close is thrown high
    dur: 0.55, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SP_FIRE',
    wpn: [[0, 'saber']],
    lunge: [[0, 0], [0.14, 1.2]],
    clip: clip([
      k(0, { torso: [0.3, -0.35, 0], uArmR: [0.5, 0, -0.5], fArmR: [-0.3, 0, 0], hand: [0.3, 0, 0], uArmL: [-1.2, -0.3, 0.4], y: -0.45, ...LEGS_WIDE }),
      k(0.14, { torso: [-0.35, 0.1, 0], uArmR: [-2.9, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-2.3, -0.2, 0.5], fArmL: [-0.3, 0, 0], y: 0, ...LEGS_LUNGE_R }, 'snap'),
      k(0.55, { torso: [-0.25, 0.1, 0], uArmR: [-2.7, 0, -0.4], y: -0.1 }),
    ]),
    hits: [{ t: 0.08, t1: 0.2, shape: 'circle', range: 5.4, off: 1, hy: 5, dmg: 40, kb: 2, up: 15, big: true, sp: true }],
    ev: [[0.08, 'shieldhit']],
    sfxs: [[0.06, 'slash_rise'], [0.1, 'slam']],
  },
  SP_FIRE: { // shots up into what it threw, then fanned across the front
    dur: 1.15, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SP_OUT',
    wpn: [[0, 'gun']],
    clip: clip([
      k(0, { ...SPRAY, torso: [-0.3, -0.4, 0], y: -0.15, ...LEGS_WIDE }),
      ...times(0.1, 1.0, 0.1).flatMap((t) => [k(t, { ...SPRAY, torso: [-0.3, -0.45, 0] }), k(t + 0.03, { ...KICK }, 'snap')]),
      k(1.15, { ...SPRAY, torso: [-0.1, -0.4, 0] }),
    ]),
    shots: [
      ...times(0.1, 0.65, 0.1).map((t) => ({ t, kind: 'spup' })),
      ...times(0.7, 1.05, 0.1).map((t, i) => ({ t, kind: 'spfan', ang: [-0.5, 0.5, -0.25, 0.25][i % 4] })),
    ],
  },
  SP_OUT: { // the green swirl closes it, throwing whatever is still close
    dur: 0.8, rate: 1, armor: true, invuln: true, sp: true,
    wpn: [[0, 'gun'], [0.5, null]],
    clip: clip([
      k(0, { ...SPRAY, torso: [-0.1, -0.4, 0], y: -0.2 }),
      k(0.2, { torso: [0.2, 0, 0], uArmR: [-0.4, 0, -0.6], uArmL: [-0.4, 0, 0.6], y: -0.35, ...LEGS_WIDE }),
      k(0.8, {}),
    ]),
    hits: [{ t: 0.12, t1: 0.22, shape: 'circle', range: 6.5, hy: 6, dmg: 48, kb: 10, up: 8, big: true, sp: true }],
    ev: [[0.1, 'swirl']],
  },
  SPC_CH: { // held SP: shield braced, gun up; every 0.6 s held commits another stock (hero.js chargeStocks)
    dur: 1.0, rate: 1, armor: true, invuln: true, sp: true, chargeAura: true, spcStep: 0.6, spNext: 'SPC_FIRE',
    wpn: [[0, 'gun']],
    clip: clip([
      k(0, { torso: [0.3, -0.35, 0], y: -0.45, ...LEGS_WIDE }),
      k(0.35, { ...SPRAY, ...BASH, torso: [0.2, 0.1, 0], y: -0.5, ...LEGS_WIDE }),
      k(1.0, { torso: [0.22, -0.3, 0] }),
    ]),
    ev: [[0.02, 'charge'], [0.95, 'burst']],
  },
  SPC_FIRE: { // the spray gun swept left to right and back across the front, a shot every 0.1 s, as long as the
    // stocks spent buy (one 1.3 s sweep a pass)
    dur: 1.3, rate: 1, armor: true, invuln: true, sp: true, loop: 1.3, steer: 2.5, spNext: 'SPC_END',
    stockDur: [2.6, 5.2, 7.8],
    wpn: [[0, 'gun']],
    clip: clip([
      k(0, { ...SPRAY, ...BASH, torso: [0.2, -0.35, 0], y: -0.5, ...LEGS_WIDE }),
      k(0.65, { torso: [0.2, 0.15, 0] }),
      k(1.3, { torso: [0.2, -0.35, 0] }),
    ]),
    shots: times(0.05, 1.3, 0.1).map((t) => ({ t, kind: 'sweep', ang: -0.6 * Math.cos((t / 1.3) * PI * 2) })),
  },
  SPC_END: { // a last heavy fan, and the swirl
    dur: 1.0, rate: 1, armor: true, invuln: true, sp: true,
    wpn: [[0, 'gun'], [0.7, null]],
    clip: clip([
      k(0, { ...SPRAY, torso: [0.1, -0.5, 0], y: -0.4, ...LEGS_WIDE }),
      k(0.2, { ...KICK }, 'snap'),
      k(0.45, { ...SPRAY }),
      k(1.0, {}),
    ]),
    shots: [-0.4, -0.2, 0, 0.2, 0.4].map((ang) => ({ t: 0.18, kind: 'spfin', ang })),
    hits: [{ t: 0.5, t1: 0.6, shape: 'circle', range: 6.5, hy: 6, dmg: 30, kb: 10, up: 8, big: true, sp: true }],
    ev: [[0.48, 'swirl']],
  },
  SPA_IN: {
    dur: 0.45, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spNext: 'SPA_RAM',
    wpn: [[0, null]],
    jets: [0, 0.45, true],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -0.5], uArmL: [-0.5, 0, 0.5], ...LEGS_AIR }),
      k(0.3, { ...BASH, torso: [0.5, 0.6, 0], uArmR: [0.3, 0, -0.5], fArmR: [-0.6, 0, 0], y: 0, ...LEGS_AIR }),
      k(0.45, { torso: [0.55, 0.3, 0] }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SPA_RAM: { // shield first, flat out along the ground: whatever it meets is carried along in front of it
    dur: 1.8, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spNext: 'SPA_END', dive: 0.35, rushFx: true,
    wpn: [[0, null]],
    slide: [0.02, 1.7, 15],
    jets: [0, 1.8, false],
    clip: clip([
      k(0, { ...BASH, torso: [0.65, 0.6, 0], uArmR: [0.4, 0, -0.5], fArmR: [-0.6, 0, 0], y: 0, ...LEGS_AIR, thighL: [0.5, 0, 0.1], shinL: [0.6, 0, 0] }),
      k(1.8, { torso: [0.7, 0.6, 0] }),
    ]),
    hits: every(0.05, 1.75, 0.1, { shape: 'arc', range: 4.2, arc: 160, hy: 5, dmg: 9, kb: 4, up: 0.6, sp: true }),
    sfxs: [[0.02, 'qb'], ...times(0.1, 1.7, 0.3).map((t) => [t, 'bhit'])],
  },
  SPA_END: { // the teal burst throws everything it carried
    dur: 0.9, rate: 1, armor: true, invuln: true, sp: true, isAir: true,
    wpn: [[0, null]],
    lunge: [[0, 0], [0.3, -1.2]],
    clip: clip([
      k(0, { ...BASH, torso: [0.6, 0.6, 0], y: 0, ...LEGS_AIR }),
      k(0.18, { torso: [-0.3, 0, 0], uArmL: [-0.4, 0, 1.0], fArmL: [-0.4, 0, 0], handL: [0, 0.2, 0], uArmR: [-0.4, 0, -1.0] }, 'snap'),
      k(0.9, { torso: [0.1, 0, 0], ...SHIELD_REST, ...LEGS_WIDE }),
    ]),
    hits: [{ t: 0.1, t1: 0.2, shape: 'circle', range: 6.5, hy: 6, dmg: 44, kb: 12, up: 9, big: true, sp: true }],
    ev: [[0.08, 'swirl', 'air']],
  },
};

// timed effects and sounds fire in order
for (const m of Object.values(MOVES)) for (const key of ['ev', 'sfxs']) m[key]?.sort((a, b) => a[0] - b[0]);
