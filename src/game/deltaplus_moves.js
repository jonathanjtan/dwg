// Delta Plus moveset after Dynasty Warriors: Gundam Reborn's "ALL MOVES" clip (youtube _fUv7vCfj80): keyframed poses +
// hit timing. Normal string N1..N6 on attack; charge attack C(n+1) on charge after n normals. Tapping charge alone
// fires the beam rifle (mash for a shot combo), holding it fires a charge shot. Weapons: beam saber, beam rifle and a
// shield-mounted grenade launcher. The video showed Basic Combo, Shot Combo, Charge Shot, Charge 2-4, Dash Combo,
// Dash Charge, a "Transform Shot" (the dash rush's auto-finisher: it folds into waverider mode and rams the target
// with the rifle blazing) and Musou/Air Musou; it never got to C5, C6, a jump attack or the charge SP, so those are
// invented in the same spirit - C5/C6 extend the saber/grenade escalation, JA/JC mirror the other suits' air normals,
// and the charge SP stretches the Musou's transformation run into the suit's biggest hit. The waverider is faked with
// a pose (torso pitched flat, arms swept back, legs tucked, shield forward) rather than a separate model, as the
// skill suggests. Reach was measured off gameplay footage in Delta Plus heights (H ~ 3.9 units, 1.15x the Gundam's):
// the saber blade is ~1.3 H, spin rings ~1.4 H, the C6 grenade spread ~2.6 H across, the transform rams ~2 H long.
import { Clip, poseFrom } from '../core/rig.js';

const PI = Math.PI;
export const BLADE = 5.0; // beam saber length (units)

// Ready stance: rifle held low, shield up and forward.
export const STANCE = poseFrom({
  y: -0.1,
  hips: [0, 0, 0],
  torso: [0.1, -0.15, 0],
  head: [-0.08, 0.15, 0],
  uArmR: [-0.3, 0, -0.3], fArmR: [-0.65, 0, 0], hand: [0.3, 0, 0],
  uArmL: [-0.5, 0, 0.35], fArmL: [-1.0, 0, 0], handL: [0, 0.15, 0],
  thighR: [-0.28, 0, -0.12], shinR: [0.4, 0, 0],
  thighL: [-0.05, 0, 0.12], shinL: [0.3, 0, 0],
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
const LEGS_KNEEL = { thighR: [-1.5, 0, -0.2], shinR: [2.3, 0, 0], thighL: [0.3, 0, 0.15], shinL: [1.6, 0, 0] };
const SWEEP_R = { uArmR: [0, -0.2, -1.55], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0] };
const SWEEP_L = { uArmR: [0, 1.9, -1.55], fArmR: [-0.15, 0, 0], hand: [1.2, 0, 0] };
const RIFLE = { torso: [0, -0.5, 0], uArmR: [-1.55, 0, 0.12], fArmR: [0, 0, 0], hand: [1.57, 0, 0], uArmL: [-0.7, 0, 0.35], handL: [0, 0.2, 0], head: [0, -0.35, 0] };
// Charge-shot block: shield swung round to face the shot, rifle braced over the top.
const BLOCK = { torso: [0.05, -0.2, 0], uArmL: [-1.0, 0, 0.35], fArmL: [-0.5, 0, 0], handL: [0, 0.1, 0] };
// Waverider fold: torso pitched near flat, arms swept back along the body, legs tucked, shield forward as a nose.
const FOLD = {
  torso: [1.4, 0, 0], head: [-0.35, 0, 0],
  uArmR: [-2.7, 0, -0.15], fArmR: [-0.1, 0, 0], hand: [0.15, 0, 0],
  uArmL: [-2.85, 0, 0.15], fArmL: [-0.1, 0, 0], handL: [0, 0, 0],
  thighR: [-2.1, 0, -0.1], shinR: [2.4, 0, 0], thighL: [-2.1, 0, 0.1], shinL: [2.4, 0, 0],
};

// hit: { t, t1, shape, range, arc, len, width, off, hy, dmg, kb, up, big, pull, sp } ev: [t, name, arg]; shots:
// { t, kind, ang, dn }; wpn: [t, weapon] (saber | rifle | null); jets: [t0,t1,lift]; slide: [t0,t1,speed]; rate.
export const MOVES = {
  // ---- normal string: five beam saber cuts, the fifth a thruster hop into a launching spin ----
  N1: { // rising diagonal, low left to high right
    dur: 0.48, chain: 0.28, next: 'N2', charge: 'C2', saber: true,
    lunge: [[0.04, 0], [0.17, 1.6]],
    clip: clip([
      k(0, { torso: [0.25, 0.8, 0], uArmR: [0, 1.9, -1.25], fArmR: [-0.2, 0, 0], hand: [1.3, 0, 0], uArmL: [-0.8, 0, 0.5], y: -0.3, ...LEGS_LUNGE_L }),
      k(0.06, { torso: [0.28, 0.9, 0] }),
      k(0.18, { torso: [-0.2, -0.75, 0], uArmR: [-2.3, -0.3, -0.85], fArmR: [-0.1, 0, 0], hand: [0.5, 0, 0], uArmL: [-0.3, 0, 0.8], y: -0.18, ...LEGS_LUNGE_R }, 'snap'),
      k(0.48, { torso: [-0.1, -0.55, 0], uArmR: [-2.0, -0.2, -0.7], y: -0.2 }),
    ]),
    hits: [{ t: 0.07, t1: 0.19, shape: 'arc', range: 6.2, arc: 170, dmg: 26, kb: 4, up: 1.5 }],
    sfx: 'slash_b', swing: 0.07,
  },
  N2: { // flat forehand, right to left
    dur: 0.46, chain: 0.28, next: 'N3', charge: 'C3', saber: true,
    lunge: [[0.03, 0], [0.15, 1.5]],
    clip: clip([
      k(0, { torso: [0.1, -1.0, 0], ...SWEEP_R, hand: [1.1, 0, 0], uArmL: [-0.9, 0, 0.5], y: -0.15, ...LEGS_WIDE }),
      k(0.06, { torso: [0.12, -1.1, 0], uArmR: [0, -0.3, -1.4] }),
      k(0.16, { torso: [0.15, 0.95, 0], ...SWEEP_L, uArmL: [-0.3, 0, 0.9], y: -0.3, ...LEGS_LUNGE_R }, 'snap'),
      k(0.46, { torso: [0.12, 0.5, 0], uArmR: [-0.3, 1.2, -1.0], hand: [0.8, 0, 0], y: -0.22 }),
    ]),
    hits: [{ t: 0.06, t1: 0.17, shape: 'arc', range: 6.4, arc: 190, dmg: 26, kb: 4.5, up: 0 }],
    sfx: 'slash_a', swing: 0.06,
  },
  N3: { // overhead chop
    dur: 0.52, chain: 0.3, next: 'N4', charge: 'C4', saber: true,
    lunge: [[0.06, 0], [0.19, 1.9]],
    clip: clip([
      k(0, { torso: [-0.25, -0.2, 0], uArmR: [-2.9, 0, -0.25], fArmR: [-0.3, 0, 0], hand: [0.3, 0, 0], uArmL: [-0.3, 0, 0.5], y: -0.05, head: [0.1, 0, 0] }),
      k(0.08, { torso: [-0.35, -0.25, 0], uArmR: [-3.1, 0, -0.2] }),
      k(0.19, { torso: [0.55, 0.1, 0], uArmR: [-0.9, 0, -0.1], fArmR: [-0.1, 0, 0], hand: [0.75, 0, 0], y: -0.45, head: [-0.3, 0, 0], ...LEGS_LUNGE_R }, 'snap'),
      k(0.52, { torso: [0.35, 0, 0], uArmR: [-0.8, 0, -0.2], y: -0.3 }),
    ]),
    hits: [{ t: 0.11, t1: 0.21, shape: 'arc', range: 6.8, arc: 110, dmg: 32, kb: 6, up: 0 }],
    sfx: 'slash_h', swing: 0.09,
  },
  N4: { // flat backhand, left to right
    dur: 0.48, chain: 0.3, next: 'N5', charge: 'C5', saber: true,
    lunge: [[0.03, 0], [0.16, 1.5]],
    clip: clip([
      k(0, { torso: [0.12, 0.85, 0], ...SWEEP_L, uArmR: [-0.3, 1.9, -1.3], fArmR: [-0.3, 0, 0], y: -0.25, ...LEGS_LUNGE_R }),
      k(0.05, { torso: [0.14, 0.95, 0] }),
      k(0.16, { torso: [0.0, -1.05, 0.1], uArmR: [-0.3, -0.5, -1.3], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.2, 0, 0.6], y: -0.3, ...LEGS_LUNGE_L }, 'snap'),
      k(0.48, { torso: [0.05, -0.6, 0.05], uArmR: [-0.5, 0, -0.9], hand: [0.8, 0, 0] }),
    ]),
    hits: [{ t: 0.06, t1: 0.17, shape: 'arc', range: 6.4, arc: 200, dmg: 28, kb: 5, up: 0 }],
    sfx: 'slash_b', swing: 0.06,
  },
  N5: { // shield bash to stagger, then a saber thrust
    dur: 0.5, chain: 0.3, next: 'N6', charge: 'C6', saber: true,
    lunge: [[0.04, 0], [0.14, 1.8]],
    clip: clip([
      k(0, { torso: [0.15, 0, 0], uArmL: [-1.1, 0, 0.15], fArmL: [-0.5, 0, 0], handL: [0, 0.1, 0], uArmR: [-0.6, 0, -0.3], fArmR: [-0.9, 0, 0], hand: [0.9, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.14, { torso: [0.35, 0, 0], uArmL: [-1.3, 0, 0.1], y: -0.35, ...LEGS_LUNGE_R }, 'snap'),
      k(0.26, { torso: [0.1, 0, 0], uArmR: [-0.15, 0, -0.15], fArmR: [-0.1, 0, 0], hand: [0.1, 0, 0], y: -0.3 }, 'snap'),
      k(0.5, { torso: [0.1, -0.1, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.7, 0, 0], y: -0.2 }),
    ]),
    hits: [
      { t: 0.1, t1: 0.18, shape: 'circle', range: 3.2, off: 2.0, dmg: 14, kb: 3, up: 1, stop: 1 },
      { t: 0.22, t1: 0.32, shape: 'line', len: 6.6, width: 2.2, dmg: 26, kb: 4, up: 0 },
    ],
    sfxs: [[0.08, 'phit'], [0.24, 'slash_dash']],
  },
  N6: { // thruster hop, then a full-circle cut that launches everything around the suit
    dur: 0.92, chain: 0.7, next: null, charge: null, saber: true,
    lunge: [[0.05, 0], [0.28, 1.6]],
    air: [[0, 0], [0.2, 1.6], [0.48, 1.9], [0.76, 0]],
    jets: [0.05, 0.48, true],
    clip: clip([
      k(0, { torso: [0.1, -0.5, 0], uArmR: [-2.4, 0.2, -0.5], fArmR: [-0.2, 0, 0], hand: [0.5, 0, 0], uArmL: [-0.4, 0, 0.8], y: -0.35, yaw: 0, ...LEGS_WIDE }),
      k(0.19, { torso: [0.1, -0.7, 0], uArmR: [0, 0.2, -1.45], fArmR: [0, 0, 0], hand: [1.3, 0, 0], uArmL: [0, 0, 1.3], y: 0, yaw: -0.4, ...LEGS_AIR }),
      k(0.48, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.76, { yaw: PI * 2, torso: [0.2, 0.2, 0], uArmR: [-0.3, 0.8, -1.2], y: -0.35, ...LEGS_WIDE }),
      k(0.92, { yaw: PI * 2, torso: [0.15, 0.1, 0], y: -0.25 }),
    ]),
    hits: [{ t: 0.22, t1: 0.48, shape: 'arc', range: 6.0, arc: 360, hy: 5, dmg: 42, kb: 5, up: 10, big: true }],
    sfx: 'slash_spin', swing: 0.2,
  },

  // ---- charge attacks ----
  // K alone: beam rifle. Mash K for a shot combo; hold it for a charge shot.
  C1: {
    dur: 0.38, chain: 0.12, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true,
    clip: clip([
      k(0, { ...RIFLE, torso: [0, -0.5, 0], uArmR: [-1.3, 0, 0.1], fArmR: [-0.3, 0, 0], hand: [1.6, 0, 0] }),
      k(0.09, { ...RIFLE }, 'snap'),
      k(0.15, { torso: [-0.1, -0.55, 0], uArmR: [-1.8, 0, 0.1], hand: [1.4, 0, 0], y: -0.05 }, 'snap'),
      k(0.38, { uArmR: [-1.55, 0, 0.1], hand: [1.55, 0, 0] }),
    ]),
    shots: [{ t: 0.11, kind: 'rifle' }],
  },
  C1R: {
    dur: 0.24, chain: 0.09, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true, maxRepeat: 12,
    clip: clip([
      k(0, { ...RIFLE }),
      k(0.05, { torso: [-0.08, -0.55, 0], uArmR: [-1.75, 0, 0.1], hand: [1.42, 0, 0], y: -0.05 }, 'snap'),
      k(0.24, { ...RIFLE }),
    ]),
    shots: [{ t: 0.03, kind: 'rifle' }],
  },
  CS: { // charge shot: the shield swings up to block, gold rings wind up, one heavy beam that throws the target
    dur: 1.15, chain: 0.95, rifle: true, rate: 1, next: null, charge: null, armor: true,
    clip: clip([
      k(0, { ...RIFLE, ...BLOCK, torso: [0.05, -0.2, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.4, { ...RIFLE, ...BLOCK, torso: [0.05, -0.35, 0], y: -0.3 }),
      k(0.55, { ...RIFLE, ...BLOCK, torso: [0, -0.55, 0], y: -0.32 }),
      k(0.62, { torso: [-0.2, -0.5, 0], uArmR: [-1.95, 0, 0.1], hand: [1.75, 0, 0], y: -0.28 }, 'snap'),
      k(1.15, { ...RIFLE, torso: [0, -0.4, 0] }),
    ]),
    ev: [[0.02, 'flash', 'gold'], [0.24, 'flash', 'gold']],
    shots: [{ t: 0.58, kind: 'cshot' }],
    chargeFx: [0.0, 0.55],
  },

  // J K: rising saber cut into a full spin, rings of light winding round the blade.
  C2: {
    dur: 1.35, chain: 1.1, saber: true, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.02, 0], [0.16, 1.4]],
    clip: clip([
      k(0, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.05, { torso: [0.4, -0.35, 0], uArmR: [0.8, 0, -0.35] }),
      k(0.17, { torso: [-0.35, 0.2, 0], uArmR: [-2.9, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.8], y: -0.05, ...LEGS_WIDE }, 'snap'),
      k(0.24, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.3], y: -0.25, yaw: 0 }),
      k(0.62, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.9, { yaw: PI * 2, torso: [-0.15, 0.5, 0], uArmR: [-2.6, 0.5, -0.4], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.2, ...LEGS_LUNGE_L }, 'snap'),
      k(1.35, { yaw: PI * 2, torso: [0.1, -0.2, 0], uArmR: [-0.6, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], y: -0.1 }),
    ]),
    hits: [
      { t: 0.06, t1: 0.18, shape: 'arc', range: 6.0, arc: 140, dmg: 34, kb: 2, up: 13, big: true },
      { t: 0.28, t1: 0.9, shape: 'arc', range: 5.8, arc: 360, hy: 7, dmg: 12, kb: 1, up: 3, sp: false },
    ],
    ev: [[0.21, 'flash', 'gold']],
    sfxs: [[0.04, 'slash_rise'], [0.28, 'slash_spin']],
  },

  // J J K: a saber flurry, then the shield swings round and the grenade launcher goes off point-blank.
  C3: {
    dur: 1.55, chain: 1.3, saber: true, rate: 1, next: null, charge: null, armor: true,
    clip: clip([
      k(0, { torso: [0.1, -0.4, 0], uArmR: [-1.3, 0, -0.4], fArmR: [-0.4, 0, 0], hand: [1.1, 0, 0], y: -0.2, ...LEGS_WIDE }),
      ...[0.13, 0.23, 0.33, 0.43, 0.53].map((t, i) => k(t, i % 2
        ? { torso: [0.15, 0.7, 0], uArmR: [-0.9, 1.5, -1.2], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], y: -0.25, ...LEGS_LUNGE_R }
        : { torso: [0.15, -0.8, 0], uArmR: [-0.6, -0.2, -1.3], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], y: -0.3, ...LEGS_LUNGE_L }, 'snap')),
      k(0.66, { torso: [0.1, -1.0, 0], ...SWEEP_R, y: -0.25, ...LEGS_WIDE }),
      k(0.82, { torso: [0.05, -0.3, 0], uArmL: [-0.9, 0, 0.15], fArmL: [-0.35, 0, 0], handL: [0, 0.1, 0], y: -0.3, ...LEGS_WIDE }, 'snap'),
      k(1.0, { torso: [0.05, -0.3, 0], uArmL: [-0.9, 0, 0.15], y: -0.3 }),
      k(1.55, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.35], y: -0.15 }),
    ]),
    hits: [
      ...[0.16, 0.26, 0.36, 0.46, 0.56].map((t) => ({ t, t1: t + 0.08, shape: 'arc', range: 6.0, arc: 150, dmg: 12, kb: 0.6, up: 0, pull: 1.4, stop: 1 })),
      { t: 0.7, t1: 0.82, shape: 'arc', range: 6.6, arc: 230, dmg: 28, kb: 4, up: 0 },
    ],
    ev: [[0.0, 'flash', 'gold']],
    shots: [{ t: 0.9, kind: 'grenade' }],
    sfxs: [...[0.13, 0.33, 0.53].map((t) => [t, 'slash_fast']), [0.66, 'slash_a']],
  },

  // J J J K: the suit folds into waverider mode, flies a long spinning arc through the target, and comes down in a
  // shockwave landing - the moveset's signature move, matching the video's long "Charge 4".
  C4: {
    dur: 2.2, chain: 1.9, rate: 1, next: null, charge: null, armor: true, invuln: true,
    wpn: [[0, 'saber'], [0.3, null]],
    lunge: [[0.16, 0], [1.1, 11], [1.7, 2]],
    air: [[0, 0], [0.16, 0.4], [0.7, 3.2], [1.5, 3.4], [1.86, 0]],
    jets: [0.14, 1.7, true],
    clip: clip([
      k(0, { torso: [0.1, -0.4, 0], uArmR: [-1.3, 0, -0.4], fArmR: [-0.4, 0, 0], hand: [1.1, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.14, { torso: [0.5, -0.2, 0], uArmR: [-2.6, 0, -0.2], y: -0.05 }, 'snap'),
      k(0.4, { ...FOLD, yaw: 0 }, 'out'),
      k(1.1, { ...FOLD, yaw: PI * 3 }, 'linear'),
      k(1.5, { ...FOLD, yaw: PI * 3 }),
      k(1.7, { torso: [0.75, 0, 0], uArmR: [-0.9, 0, -0.1], fArmR: [-0.5, 0, 0], hand: [1.0, 0, 0], uArmL: [-0.8, 0, 0.15], y: -0.9, head: [-0.4, 0, 0], yaw: PI * 3, ...LEGS_KNEEL }, 'in'),
      k(2.0, { torso: [0.7, 0, 0], y: -0.9, yaw: PI * 3 }),
      k(2.2, { torso: [0.15, -0.2, 0], y: -0.2, yaw: PI * 3, ...LEGS_WIDE }),
    ]),
    hits: [
      { t: 0.08, t1: 0.2, shape: 'arc', range: 6.0, arc: 150, dmg: 30, kb: 3, up: 8, big: true },
      { t: 0.5, t1: 1.5, shape: 'line', len: 8.6, width: 3.2, hy: 8, dmg: 20, kb: 3, up: 3, big: true },
      { t: 1.72, t1: 1.82, shape: 'circle', range: 9.0, dmg: 58, kb: 10, up: 12, big: true },
    ],
    ev: [[0.14, 'flash', 'violet'], [0.4, 'fold'], [1.72, 'shock']],
    sfxs: [[0.12, 'slash_rise'], [0.4, 'draw'], [0.5, 'qb']],
  },

  // ---- invented: the video never got to C5/C6 ----
  // J J J J K: a big rising double cut that carries the target skyward, in the spirit of the other suits' C5s.
  C5: {
    dur: 1.7, chain: 1.5, saber: true, rate: 1, next: null, charge: null, armor: true,
    air: [[0.4, 0], [0.72, 4.4], [1.0, 4.6], [1.35, 0]],
    jets: [0.4, 0.82, true],
    lunge: [[0.4, 0], [0.72, 1.6]],
    clip: clip([
      k(0, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.3], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.32, { yaw: PI * 2, torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.42, { yaw: PI * 2, torso: [0.4, -0.4, 0], uArmR: [0.6, -0.3, -0.5], fArmR: [-0.2, 0, 0], hand: [0.4, 0, 0], y: -0.55, ...LEGS_LUNGE_R }),
      k(0.6, { yaw: PI * 2, torso: [-0.45, 0.3, 0], uArmR: [-3.0, 0.2, -0.3], fArmR: [-0.1, 0, 0], hand: [0.3, 0, 0], uArmL: [-0.3, 0, 0.9], y: 0, ...LEGS_AIR }, 'snap'),
      k(1.0, { yaw: PI * 2, torso: [-0.2, 0.2, 0], uArmR: [-2.7, 0.2, -0.3] }),
      k(1.35, { yaw: PI * 2, torso: [0.3, 0, 0], uArmR: [-0.6, 0, -0.4], y: -0.45, ...LEGS_WIDE }),
      k(1.7, { yaw: PI * 2, torso: [0.1, -0.2, 0], y: -0.15 }),
    ]),
    hits: [
      { t: 0.1, t1: 0.32, shape: 'arc', range: 5.6, arc: 360, dmg: 15, kb: 1, up: 3 },
      { t: 0.44, t1: 0.62, shape: 'arc', range: 6.6, arc: 170, hy: 8, dmg: 42, kb: 3, up: 16, big: true },
    ],
    ev: [[0.0, 'flash', 'gold'], [1.35, 'land']],
    sfxs: [[0.06, 'slash_spin'], [0.44, 'slash_rise']],
  },
  // J J J J J K: the shield plants forward and the grenade launcher fans three rounds out in a burst - the suit's
  // signature ordnance, saved for the biggest charge finisher.
  C6: {
    dur: 1.3, chain: 1.05, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.35, null]],
    clip: clip([
      k(0, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.3], y: -0.3, ...LEGS_WIDE }),
      k(0.2, { torso: [0.1, 0.4, 0] }, 'linear'),
      k(0.36, { torso: [-0.15, 0.1, 0], uArmL: [-1.05, 0, 0.1], fArmL: [-0.45, 0, 0], handL: [0, 0.1, 0], uArmR: [-0.5, 0, -0.3], fArmR: [-0.8, 0, 0], hand: [0.8, 0, 0], y: -0.35, ...LEGS_WIDE }, 'snap'),
      k(0.8, { torso: [-0.15, 0.1, 0], uArmL: [-1.05, 0, 0.1], y: -0.35 }),
      k(1.3, { torso: [0.1, -0.2, 0], uArmL: [-0.5, 0, 0.35], fArmL: [-1.0, 0, 0], handL: [0, 0.15, 0], y: -0.15 }),
    ]),
    hits: [{ t: 0.1, t1: 0.34, shape: 'arc', range: 5.6, arc: 360, dmg: 15, kb: 1, up: 2 }],
    ev: [[0.0, 'flash', 'gold']],
    shots: [{ t: 0.42, kind: 'grenade', ang: -0.3 }, { t: 0.42, kind: 'grenade', ang: 0 }, { t: 0.42, kind: 'grenade', ang: 0.3 }],
    sfxs: [[0.06, 'slash_spin']],
  },

  // ---- boost dash: a thruster rush of paired cuts (keep pressing J); auto-finishes by folding into waverider mode
  // and ramming straight through with the rifle blazing (the video's "Transform Shot") ----
  DA: {
    dur: 0.34, chain: 0.2, saber: true, rate: 1, next: 'DA', charge: 'DC', armor: true, rush: true,
    slide: [0, 0.34, 7.2],
    jets: [0, 0.34, false],
    clip: clip([
      k(0, { torso: [0.35, -0.9, 0], ...SWEEP_R, uArmL: [-1.0, 0, 0.5], y: -0.35, ...LEGS_LUNGE_L }),
      k(0.09, { torso: [0.4, 0.9, 0], ...SWEEP_L, uArmL: [-0.2, 0, 0.9], y: -0.4, ...LEGS_LUNGE_R }, 'snap'),
      k(0.19, { torso: [0.3, 1.0, 0], uArmR: [-0.3, 1.9, -1.3], fArmR: [-0.3, 0, 0] }),
      k(0.29, { torso: [0.35, -0.95, 0], uArmR: [-0.4, -0.4, -1.3], fArmR: [-0.2, 0, 0], y: -0.35, ...LEGS_LUNGE_L }, 'snap'),
      k(0.34, { torso: [0.35, -0.9, 0] }),
    ]),
    hits: [
      { t: 0.03, t1: 0.11, shape: 'arc', range: 6.2, arc: 190, dmg: 14, kb: 1.5, up: 0, pull: 1, stop: 1 },
      { t: 0.21, t1: 0.29, shape: 'arc', range: 6.2, arc: 190, dmg: 14, kb: 1.5, up: 0, pull: 1, stop: 1 },
    ],
    sfxs: [[0.02, 'slash_fast'], [0.19, 'slash_fast']],
  },
  DAF: { // Transform Shot: fold into waverider mode and ram straight through, rifle firing point-blank
    dur: 0.85, rate: 1, next: null, charge: null, armor: true, invuln: true,
    wpn: [[0, null], [0.4, 'rifle']],
    slide: [0.02, 0.55, 15],
    jets: [0, 0.55, false],
    clip: clip([
      k(0, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.12, { ...FOLD, y: -0.1 }, 'snap'),
      k(0.55, { ...FOLD, y: -0.1 }),
      k(0.85, { torso: [0.1, 0, 0], uArmR: [-1.5, 0, 0.1], fArmR: [0, 0, 0], hand: [1.5, 0, 0], y: -0.15 }),
    ]),
    hits: [{ t: 0.1, t1: 0.5, shape: 'line', len: 9.0, width: 3.0, dmg: 40, kb: 8, up: 6, big: true }],
    ev: [[0.1, 'fold'], [0.4, 'ram']],
    shots: [{ t: 0.42, kind: 'rifle' }],
    sfxs: [[0.08, 'draw']],
  },
  DC: { // Dash Charge: a spin of cuts, then the shield swings round for a point-blank grenade blast
    dur: 1.1, chain: 0.9, rate: 1, next: null, charge: null, armor: true,
    saber: true,
    lunge: [[0.56, 0], [0.7, -1.6]],
    jets: [0.56, 0.7, false],
    clip: clip([
      k(0, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.3], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.2, { yaw: PI * 2, torso: [0.1, 0.3, 0] }, 'linear'),
      k(0.4, { yaw: PI * 2, torso: [-0.15, 0.1, 0], uArmL: [-1.05, 0, 0.1], fArmL: [-0.45, 0, 0], handL: [0, 0.1, 0], uArmR: [-0.5, 0, -0.3], fArmR: [-0.8, 0, 0], hand: [0.8, 0, 0], y: -0.35, ...LEGS_LUNGE_R }),
      k(0.55, { yaw: PI * 2, torso: [-0.15, 0.1, 0], uArmL: [-1.05, 0, 0.1], y: -0.35 }),
      k(1.1, { yaw: PI * 2, torso: [0.1, -0.2, 0], uArmL: [-0.5, 0, 0.35], fArmL: [-1.0, 0, 0], handL: [0, 0.15, 0], y: -0.12 }),
    ]),
    hits: [{ t: 0.03, t1: 0.2, shape: 'arc', range: 5.8, arc: 360, dmg: 14, kb: 1, up: 1.5 }],
    ev: [[0.02, 'flash', 'red'], [0.22, 'flash', 'red']],
    shots: [{ t: 0.58, kind: 'grenade' }],
    sfxs: [[0.03, 'slash_spin']],
  },

  // ---- aerial (invented: no jump attack in the video) ----
  JA: {
    dur: 0.48, chain: 0.28, saber: true, next: null, charge: null, isAir: true,
    clip: clip([
      k(0, { torso: [-0.3, -0.2, 0], uArmR: [-2.9, 0, -0.2], hand: [0.3, 0, 0], thighR: [-1.0, 0, 0], shinR: [1.4, 0, 0], thighL: [-0.3, 0, 0], shinL: [1.0, 0, 0] }),
      k(0.17, { torso: [0.6, 0, 0], uArmR: [-0.9, 0, -0.1], hand: [0.7, 0, 0] }, 'snap'),
      k(0.48, { torso: [0.3, 0, 0] }),
    ]),
    hits: [{ t: 0.06, t1: 0.19, shape: 'arc', range: 6.2, arc: 150, dmg: 26, kb: 4, up: 4, hy: 5 }],
    sfx: 'slash_a', swing: 0.06,
  },
  JC: {
    dur: 0.72, chain: 0.58, saber: true, next: null, charge: null, isAir: true, plunge: true,
    clip: clip([
      k(0, { torso: [0.6, 0, 0], uArmR: [-2.4, 0, -0.1], fArmR: [0, 0, 0], hand: [1.5, 0, 0], thighR: [-1.4, 0, 0], shinR: [2.0, 0, 0], thighL: [-1.4, 0, 0], shinL: [2.0, 0, 0] }),
      k(0.24, { torso: [0.8, 0, 0], uArmR: [-1.0, 0, 0], hand: [2.2, 0, 0] }),
      k(0.38, { torso: [0.6, 0, 0], y: -0.6, ...LEGS_WIDE }),
      k(0.72, { torso: [0.3, 0, 0], y: -0.3 }),
    ]),
    hits: [{ t: 0, t1: 9, shape: 'circle', range: 6.4, dmg: 40, kb: 8, up: 8, big: true, onLand: true }],
  },

  // ---- SP attacks ----
  // Ground: a starburst, a saber-and-rifle flurry under whirling Bio-Sensor rings, then the suit folds into waverider
  // mode and rams straight through the target in a blaze of light before the shockwave lands (the video's Musou).
  // Hold SP through the flurry for the charge SP: an even longer transformation run, circling the whole field.
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
    dur: 2.8, rate: 1, saber: true, armor: true, invuln: true, sp: true, loop: 0.3, rushFx: true, steer: 2, spNext: 'SP_TR',
    clip: clip([
      k(0, { torso: [0.15, -0.9, 0], ...SWEEP_R, uArmL: [-0.9, 0, 0.5], y: -0.3, ...LEGS_WIDE }),
      k(0.08, { torso: [0.15, 0.9, 0], ...SWEEP_L, uArmL: [-0.3, 0, 0.9], y: -0.35 }, 'snap'),
      k(0.15, { torso: [-0.2, 0.5, 0], uArmR: [-2.6, 0.5, -0.4], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], y: -0.2 }, 'snap'),
      k(0.23, { torso: [0.4, -0.4, 0], uArmR: [-0.8, -0.2, -0.3], fArmR: [-0.1, 0, 0], hand: [0.9, 0, 0], y: -0.4 }, 'snap'),
      k(0.3, { torso: [0.15, -0.9, 0], ...SWEEP_R, y: -0.3 }),
    ]),
    hits: [
      ...every(0.05, 2.7, 0.075, { shape: 'arc', range: 6.0, arc: 240, dmg: 8, kb: 0.5, up: 0.4, pull: 1.2, sp: true }),
      { t: 2.7, t1: 2.78, shape: 'arc', range: 6.2, arc: 260, dmg: 15, kb: 3, up: 2, sp: true },
    ],
    ev: [[0.02, 'ring'], [1.2, 'ring'], [2.2, 'ring']],
    sfxs: [0.02, 0.1, 0.17, 0.25].flatMap((o) => times(0, 2.7, 0.3).map((t) => [t + o, 'slash_fast'])),
  },
  SP_TR: { // transformation ram: the suit folds, dashes the length of the field and bursts through the target
    dur: 1.3, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SP_OUT',
    wpn: [[0, null], [0.5, 'rifle']],
    lunge: [[0, 0], [0.7, 12]],
    clip: clip([
      k(0, { torso: [0.2, -0.4, 0], uArmR: [-0.3, 0, -0.4], fArmR: [-1.4, 0, 0], hand: [1.7, 0, 0], y: -0.35, ...LEGS_WIDE }),
      k(0.14, { ...FOLD, y: -0.1 }, 'snap'),
      k(0.7, { ...FOLD, y: -0.1 }),
      k(0.86, { torso: [0.8, 0, 0], uArmR: [-1.4, 0, 0.05], fArmR: [0, 0, 0], hand: [1.4, 0, 0], uArmL: [-0.7, 0, 0.1], y: -0.9, head: [-0.4, 0, 0], ...LEGS_KNEEL }, 'in'),
      k(1.3, { torso: [0.7, 0, 0], y: -0.85 }),
    ]),
    hits: [
      { t: 0.08, t1: 0.7, shape: 'line', len: 8.5, width: 3.0, dmg: 24, kb: 0.5, up: 2, sp: true },
      { t: 0.78, t1: 0.9, shape: 'circle', range: 8.0, dmg: 160, kb: 12, up: 12, big: true, sp: true },
    ],
    ev: [[0.14, 'fold'], [0.5, 'ram'], [0.86, 'shock']],
    sfxs: [[0.16, 'draw'], [0.5, 'qb']],
  },
  SP_OUT: {
    dur: 0.55, rate: 1, armor: true, invuln: true, sp: true,
    wpn: [[0, 'rifle'], [0.25, null]],
    clip: clip([
      k(0, { torso: [0.7, 0, 0], uArmR: [-0.8, 0, 0.05], hand: [0.9, 0, 0], y: -0.85, ...LEGS_KNEEL }),
      k(0.55, {}),
    ]),
  },
  SPA_IN: {
    dur: 0.5, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spNext: 'SPA_FIRE',
    wpn: [[0, null]],
    jets: [0, 0.5, true],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -0.5], uArmL: [-0.5, 0, 0.5], ...LEGS_AIR }),
      k(0.3, { torso: [0.3, -0.15, 0], uArmL: [-0.9, 0, 0.15], fArmL: [-0.45, 0, 0], handL: [0, 0.1, 0], ...LEGS_AIR }),
      k(0.5, { torso: [0.35, -0.15, 0], uArmL: [-0.9, 0, 0.15], ...LEGS_AIR }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SPA_FIRE: { // Air Musou: hovering, the grenade launcher fans small bursts out beneath the suit
    dur: 0.4, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spRepeat: 11,
    jets: [0, 0.4, true],
    clip: clip([
      k(0, { torso: [0.35, -0.15, 0], uArmL: [-0.9, 0, 0.15], fArmL: [-0.45, 0, 0], handL: [0, 0.1, 0], ...LEGS_AIR }),
      k(0.14, { torso: [0.15, -0.15, 0] }, 'snap'),
      k(0.4, { torso: [0.35, -0.15, 0] }),
    ]),
    shots: [{ t: 0.1, kind: 'grenade', dn: true }],
  },
  SPC_CH: {
    dur: 1.1, rate: 1, armor: true, invuln: true, sp: true, chargeAura: true, spNext: 'SPC_RUN',
    wpn: [[0, null]],
    clip: clip([
      k(0, { torso: [-0.2, 0.3, 0], uArmR: [-3.0, 0, -0.35], hand: [0, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.35, { ...FOLD, y: -0.1 }),
      k(1.1, { ...FOLD, y: -0.1 }),
    ]),
    ev: [[0.02, 'charge'], [0.35, 'fold'], [1.05, 'burst']],
  },
  SPC_RUN: { // charge SP: the longest transformation run, circling the whole field before the final ram
    dur: 4.2, rate: 1, armor: true, invuln: true, sp: true, rushFx: true, steer: 3.5, spNext: 'SPC_END',
    wpn: [[0, null], [3.9, 'rifle']],
    clip: clip([
      k(0, { ...FOLD, yaw: 0, y: -0.1 }),
      k(4.2, { ...FOLD, yaw: -PI * 3.5, y: -0.1 }, 'linear'),
    ]),
    hits: every(0.15, 4.15, 0.18, { shape: 'circle', range: 5.6, dmg: 13, kb: 4, up: 2, sp: true }),
    sfxs: times(0.1, 4.15, 0.32).map((t) => [t, 'qb']),
  },
  SPC_END: {
    dur: 0.9, rate: 1, armor: true, invuln: true, sp: true,
    wpn: [[0, 'rifle'], [0.75, null]],
    clip: clip([
      k(0, { torso: [0.7, 0, 0], uArmR: [-1.4, 0, 0.05], hand: [1.4, 0, 0], y: -0.9, ...LEGS_KNEEL }),
      k(0.4, { torso: [-0.3, 0.2, 0], uArmR: [-2.6, 0, -0.4], y: -0.15 }, 'out'),
      k(0.9, { torso: [0.1, -0.2, 0], uArmR: [-0.9, 0, -0.3], fArmR: [-0.6, 0, 0], y: -0.2 }),
    ]),
    hits: [{ t: 0.05, t1: 0.15, shape: 'circle', range: 8.5, dmg: 55, kb: 12, up: 14, big: true, sp: true }],
    ev: [[0.05, 'shock']],
  },
};

// timed effects and sounds fire in order
for (const m of Object.values(MOVES)) for (const key of ['ev', 'sfxs']) m[key]?.sort((a, b) => a[0] - b[0]);
