// Gundam moveset after Dynasty Warriors: Gundam Reborn's RX-78-2 ("ALL MOVES" video, checked beat by beat against it
// and the Koei wiki): keyframed poses + hit timing. Normal string N1..N6 on attack; charge attack C(n+1) on charge
// after n normals. Tapping charge alone fires the beam rifle (mash for a shot combo), holding it fires a charge shot.
// J K is a launcher and the beam javelin thrust up (K again: a shield swing), J J J K cuts with both beam sabers, and
// J x5 K is the "Last Shooting", the rifle fired straight up. Weapons: beam saber (two for C4), beam rifle, beam
// javelin, hyper bazooka, the shield and the Gundam hammer. Reach was measured off gameplay footage in Gundam heights (H ~ 3.4 units): the
// saber blade is ~1.3 H, spin rings ~1.4 H, the C6 shockwave ~2.8 H, a bazooka blast ~1 H, the hammer orbit ~1.5 H.
import { Clip, poseFrom } from '../core/rig.js';

const PI = Math.PI;
export const BLADE = 4.4; // beam saber length (units)
export const HAMMER_R = 5.2; // Gundam hammer orbit radius
const JAV_SLAM = 4.7; // how far ahead SP_JV's slam drives the javelin's tip (and its catch) into the ground

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
// ev: [t, name, arg] timed effects; shots: { t, kind, ang, dn }; wpn: [t, weapon] (saber | sabers (one in each hand) |
// rifle | javelin | bazooka | hammer); jets: [t0, t1, lift]; slide: [t0, t1, speed]; ham: hammer orbit radius curve;
// rate: playback speed; sky: the rifle is held pointing straight up (C6).
// SP phases: spNext (the phase that follows), spHold (taken instead while SP is still held), spRepeat (plays n times),
// steer (move speed while steering), chargeAura, spcStep (seconds of hold per extra SP stock on the charge SP's
// wind-up), stockDur (a frenzy phase's length by stocks spent; hero.js runs it in passes).
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
  // Tapping K: the beam rifle. Reborn (every suit's "Shot Combo", and the wiki's "can shoot up to five times"): a mash
  // fires five shots, about 0.28 s apart here, that make the target flinch, then the rifle comes down. No ammo or
  // reload; the five-shot cap and the recovery after it are the limit. chain = the gap to the next shot (a connecting
  // shot's hit-stop adds ~0.03 s), dur - shot = the recovery after the last one.
  C1: {
    dur: 0.5, chain: 0.33, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true,
    clip: clip([
      k(0, { ...RIFLE, torso: [0, -0.5, 0], uArmR: [-1.3, 0, 0.1], fArmR: [-0.3, 0, 0], hand: [1.6, 0, 0] }),
      k(0.1, { ...RIFLE }, 'snap'),
      k(0.16, { uArmR: [-1.8, 0, 0.1], hand: [1.4, 0, 0] }, 'snap'),
      k(0.4, { uArmR: [-1.55, 0, 0.1], hand: [1.55, 0, 0] }),
    ]),
    shots: [{ t: 0.12, kind: 'rifle' }],
  },
  C1R: {
    dur: 0.41, chain: 0.24, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true, maxRepeat: 5, // five in the footage
    clip: clip([
      k(0, { ...RIFLE }),
      k(0.05, { uArmR: [-1.75, 0, 0.1], hand: [1.42, 0, 0] }, 'snap'),
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
      k(0.64, { uArmR: [-1.95, 0, 0.1], hand: [1.75, 0, 0] }, 'snap'),
      k(1.2, { ...RIFLE, torso: [0, -0.4, 0] }),
    ]),
    ev: [[0.02, 'flash', 'gold'], [0.26, 'flash', 'gold']],
    shots: [{ t: 0.6, kind: 'cshot' }],
    chargeFx: [0.0, 0.58],
  },

  // J K: as in Reborn, a flat cut through the charge flash into a rising launcher, the saber held high, then the beam
  // javelin comes out and thrusts straight up into the airborne target (held, not thrown). K again: C2F.
  C2: {
    dur: 1.5, chain: 0.95, saber: true, rate: 1, next: null, charge: 'C2F', armor: true,
    wpn: [[0, 'saber'], [0.64, 'javelin']],
    lunge: [[0.02, 0], [0.2, 1.2]],
    clip: clip([
      k(0, { torso: [0.1, -0.9, 0], ...SWEEP_R, uArmL: [-0.9, 0, 0.5], y: -0.2, ...LEGS_WIDE }),
      k(0.12, { torso: [0.15, 0.85, 0], ...SWEEP_L, uArmL: [-0.3, 0, 0.9], y: -0.3, ...LEGS_LUNGE_R }, 'snap'),
      k(0.21, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.5, ...LEGS_LUNGE_R }),
      k(0.33, { torso: [-0.35, 0.2, 0], uArmR: [-2.9, 0, -0.3], fArmR: [-0.1, 0, 0], hand: [0.4, 0, 0], uArmL: [-0.2, 0, 0.8], y: -0.05, ...LEGS_WIDE }, 'snap'),
      k(0.6, { torso: [-0.25, 0.3, 0], uArmR: [-2.5, 0.3, -0.6], hand: [0.5, 0, 0], y: -0.1 }),
      k(0.72, { torso: [0.1, -0.3, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-1.5, 0, 0], hand: [0.35, 0, 0], uArmL: [-0.8, 0, 0.4], y: -0.35, head: [0.1, 0, 0], ...LEGS_WIDE }),
      k(0.84, { torso: [-0.2, -0.1, 0], uArmR: [-2.75, 0, -0.05], fArmR: [0, 0, 0], hand: [1.85, 0, 0], uArmL: [-0.5, 0, 0.7], head: [0.4, 0, 0], y: 0, ...LEGS_LUNGE_R }, 'snap'),
      k(1.12, { torso: [-0.15, -0.1, 0], uArmR: [-2.7, 0, -0.05], hand: [1.8, 0, 0], head: [0.35, 0, 0], y: -0.05 }),
      k(1.5, { torso: [0.1, -0.2, 0], uArmR: [-0.6, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], uArmL: [-0.55, 0, 0.3], head: [0, 0, 0], y: -0.1 }),
    ]),
    hits: [
      { t: 0.03, t1: 0.14, shape: 'arc', range: 5.4, arc: 200, dmg: 16, kb: 1, up: 0, pull: 1.2, stop: 1 },
      { t: 0.23, t1: 0.35, shape: 'arc', range: 5.2, arc: 160, dmg: 34, kb: 1.5, up: 15, big: true },
      { t: 0.8, t1: 0.96, shape: 'circle', range: 4.4, off: 1.8, hy: 11, dmg: 50, kb: 3, up: 6, big: true },
    ],
    ev: [[0.0, 'flash', 'gold'], [0.88, 'javtip']],
    sfxs: [[0.03, 'slash_a'], [0.23, 'slash_rise'], [0.78, 'javelin']],
  },
  C2F: { // K again after J K: the shield swung flat across the front, as in Reborn, knocking everything there away
    dur: 0.85, chain: 0.6, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, null]],
    lunge: [[0.02, 0], [0.16, 1.1]],
    clip: clip([
      k(0, { torso: [0.1, -0.8, 0], uArmL: [-1.3, -1.0, 0.3], fArmL: [-0.4, 0, 0], uArmR: [-0.4, 0, -0.5], fArmR: [-0.6, 0, 0], hand: [0.4, 0, 0], y: -0.25, ...LEGS_LUNGE_L }),
      k(0.17, { torso: [0.15, 0.75, 0], uArmL: [-1.45, 0.9, 1.0], fArmL: [-0.2, 0, 0], y: -0.32, ...LEGS_LUNGE_R }, 'snap'),
      k(0.45, { torso: [0.1, 0.6, 0], uArmL: [-1.2, 0.7, 0.9] }),
      k(0.85, { torso: [0.1, -0.2, 0], uArmL: [-0.55, 0, 0.3], fArmL: [-1.1, 0, 0], y: -0.1, ...LEGS_WIDE }),
    ]),
    hits: [{ t: 0.05, t1: 0.2, shape: 'arc', range: 4.9, arc: 210, dmg: 30, kb: 9, up: 3, big: true }],
    sfxs: [[0.02, 'qb'], [0.12, 'slam']],
  },

  // J J K: the hyper bazooka comes off the back and empties five rounds point-blank, as in Reborn.
  C3: {
    dur: 2.4, chain: 2.15, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, null], [0.14, 'bazooka']],
    clip: clip([
      k(0, { torso: [0.1, 0.4, 0], uArmR: [-2.8, 0.3, -0.3], fArmR: [-1.2, 0, 0], hand: [0.4, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.3, { ...SHOULDER, y: -0.3, ...LEGS_WIDE }),
      ...[0.5, 0.82, 1.14, 1.46, 1.78].flatMap((t) => [
        k(t, { ...SHOULDER, y: -0.3 }),
        k(t + 0.05, { uArmR: [-0.75, 0, -0.25] }, 'snap'),
        k(t + 0.26, { ...SHOULDER, y: -0.3 }),
      ]),
      k(2.4, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.9, 0, 0], hand: [0.9, 0, 0], y: -0.12 }),
    ]),
    ev: [[0.0, 'flash', 'violet']],
    shots: [0.5, 0.82, 1.14, 1.46, 1.78].map((t) => ({ t, kind: 'bazooka' })),
    sfxs: [[0.05, 'draw']],
  },

  // J J J K: as in Reborn, the second beam saber comes out: an overhead chop, a cut from each blade crossing in an X,
  // then a thruster rush straight through the target, both blades out ahead, that knocks it clear.
  C4: {
    dur: 2.1, chain: 1.85, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [0.28, 'sabers']],
    lunge: [[0.02, 0], [0.16, 0.8], [1.18, 0.8], [1.55, 9.8]],
    jets: [1.14, 1.55, false],
    clip: clip([
      k(0, { torso: [-0.25, -0.2, 0], uArmR: [-2.9, 0, -0.25], fArmR: [-0.3, 0, 0], hand: [0.3, 0, 0], uArmL: [-0.3, 0, 0.5], y: -0.05, head: [0.1, 0, 0] }),
      k(0.13, { torso: [0.5, 0.1, 0], uArmR: [-0.9, 0, -0.1], fArmR: [-0.1, 0, 0], hand: [0.75, 0, 0], y: -0.4, head: [-0.2, 0, 0], ...LEGS_LUNGE_R }, 'snap'),
      k(0.36, { torso: [0.05, -0.45, 0], uArmR: [-2.4, 0.2, -0.9], fArmR: [-0.1, 0, 0], hand: [0.5, 0, 0], uArmL: [-2.4, -0.2, 0.9], fArmL: [-0.2, 0, 0], head: [0, 0, 0], y: -0.15, ...LEGS_WIDE }),
      k(0.5, { torso: [0.3, 0.6, 0], uArmR: [-0.6, 1.2, -0.6], hand: [1.2, 0, 0], y: -0.32, ...LEGS_LUNGE_R }, 'snap'),
      k(0.72, { torso: [0.3, -0.6, 0], uArmL: [-0.6, -1.2, 0.6], fArmL: [-0.2, 0, 0], y: -0.32, ...LEGS_LUNGE_L }, 'snap'),
      k(1.0, { torso: [0.45, 0, 0], uArmR: [-1.2, 0.5, -0.4], uArmL: [-1.2, -0.5, 0.4], y: -0.4, ...LEGS_LUNGE_R }),
      k(1.16, { torso: [0.6, 0, 0], uArmR: [-0.95, 0.25, -0.3], fArmR: [0, 0, 0], hand: [1.0, 0, 0], uArmL: [-0.95, -0.25, 0.3], fArmL: [-0.1, 0, 0], y: -0.45 }),
      k(1.55, { torso: [0.6, -0.1, 0], y: -0.45 }),
      k(1.75, { torso: [0.1, -0.3, 0], uArmR: [-2.6, 0, -0.6], hand: [0.4, 0, 0], uArmL: [-0.5, 0, 1.2], y: -0.2, ...LEGS_WIDE }),
      k(2.1, { torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.35], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], uArmL: [-0.55, 0, 0.3], fArmL: [-1.1, 0, 0], y: -0.15 }),
    ]),
    hits: [
      { t: 0.05, t1: 0.16, shape: 'arc', range: 5.8, arc: 110, dmg: 22, kb: 1, up: 0 },
      { t: 0.4, t1: 0.52, shape: 'arc', range: 5.6, arc: 170, dmg: 24, kb: 0.8, up: 0, pull: 1 },
      { t: 0.62, t1: 0.74, shape: 'arc', range: 5.6, arc: 170, dmg: 24, kb: 1.5, up: 0, pull: 0.8 },
      ...[1.2, 1.3, 1.4].map((t) => ({ t, t1: t + 0.09, shape: 'circle', range: 3.4, dmg: 20, kb: 3, up: 2 })),
      { t: 1.5, t1: 1.58, shape: 'circle', range: 3.8, off: -1, dmg: 38, kb: 12, up: 6, big: true },
    ],
    ev: [[0.0, 'flash', 'gold']],
    sfxs: [[0.04, 'slash_h'], [0.4, 'slash_b'], [0.62, 'slash_a'], [1.14, 'slash_dash']],
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

  // J J J J J K: "Last Shooting", as in Reborn (and the anime's last duel): a flat cut through the flash, then the beam
  // rifle held straight up and fired into the sky, and a disc of energy races out ~2.8 Gundam heights around.
  C6: {
    dur: 1.55, chain: 1.3, rate: 1, next: null, charge: null, armor: true, sky: true,
    wpn: [[0, 'saber'], [0.32, 'rifle']],
    clip: clip([
      k(0, { torso: [0.1, -0.9, 0], ...SWEEP_R, uArmL: [-0.9, 0, 0.5], y: -0.25, ...LEGS_WIDE }),
      k(0.16, { torso: [0.15, 0.8, 0], ...SWEEP_L, uArmL: [-0.3, 0, 0.9], y: -0.3 }, 'snap'),
      k(0.4, { torso: [0, -0.3, 0], uArmR: [-2.2, 0, -0.2], fArmR: [0, 0, 0], hand: [1.0, 0, 0], uArmL: [-0.6, 0, 0.35], fArmL: [-1.1, 0, 0], head: [-0.3, 0, 0], y: -0.15, ...LEGS_WIDE }),
      k(0.56, { torso: [-0.1, -0.2, 0], uArmR: [-3.0, 0, -0.1], hand: [1.45, 0, 0], head: [-0.45, 0, 0], y: -0.1 }),
      k(0.66, { torso: [-0.15, -0.2, 0], uArmR: [-3.05, 0, -0.1], hand: [1.3, 0, 0], y: -0.22 }, 'snap'),
      k(1.1, { torso: [-0.1, -0.2, 0], uArmR: [-3.0, 0, -0.1], hand: [1.45, 0, 0], y: -0.15 }),
      k(1.55, { torso: [0.1, -0.2, 0], uArmR: [-0.6, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], head: [0, 0, 0], y: -0.1 }),
    ]),
    hits: [
      { t: 0.03, t1: 0.18, shape: 'arc', range: 5.4, arc: 200, dmg: 18, kb: 1, up: 1 },
      { t: 0.62, t1: 0.7, shape: 'circle', range: 9.5, dmg: 55, kb: 5, up: 12, big: true },
    ],
    ev: [[0.0, 'flash', 'gold'], [0.62, 'lastshot']],
    shots: [{ t: 0.6, kind: 'sky' }],
    sfxs: [[0.03, 'slash_a']],
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
  DC: { // dash charge: as in Reborn, saber cuts on the move behind the thrusters, a spinning cut, then the hyper bazooka
    // fired point-blank
    dur: 2.3, chain: 2.05, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'saber'], [1.42, 'bazooka']],
    slide: [0, 1.1, 4.2],
    jets: [0, 1.1, false],
    clip: clip([
      k(0, { torso: [0.35, -0.9, 0], ...SWEEP_R, uArmL: [-1.0, 0, 0.5], y: -0.35, yaw: 0, ...LEGS_LUNGE_L }),
      k(0.1, { torso: [0.4, 0.9, 0], ...SWEEP_L, uArmL: [-0.2, 0, 0.9], y: -0.4, ...LEGS_LUNGE_R }, 'snap'),
      k(0.3, { torso: [0.35, -0.95, 0], uArmR: [-0.4, -0.4, -1.3], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], y: -0.35, ...LEGS_LUNGE_L }, 'snap'),
      k(0.48, { torso: [-0.2, -0.2, 0], uArmR: [-2.8, 0, -0.3], fArmR: [-0.2, 0, 0], hand: [0.3, 0, 0], y: -0.15 }),
      k(0.58, { torso: [0.5, 0.1, 0], uArmR: [-0.9, 0, -0.1], fArmR: [-0.1, 0, 0], hand: [0.75, 0, 0], y: -0.42, ...LEGS_LUNGE_R }, 'snap'),
      k(0.8, { torso: [0.4, 0.9, 0], ...SWEEP_L, y: -0.4 }, 'snap'),
      k(1.0, { torso: [0.35, -0.95, 0], uArmR: [-0.4, -0.4, -1.3], fArmR: [-0.2, 0, 0], hand: [1.2, 0, 0], y: -0.35, ...LEGS_LUNGE_L }, 'snap'),
      k(1.12, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.3], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(1.36, { yaw: PI * 2, torso: [0.1, 0.3, 0] }, 'linear'),
      k(1.56, { yaw: PI * 2, ...SHOULDER, y: -0.35, ...LEGS_LUNGE_R }),
      k(1.7, { yaw: PI * 2, ...SHOULDER, y: -0.35 }),
      k(1.76, { yaw: PI * 2, uArmR: [-0.8, 0, -0.25] }, 'snap'),
      k(2.3, { yaw: PI * 2, torso: [0.1, -0.2, 0], uArmR: [-0.4, 0, -0.3], fArmR: [-0.9, 0, 0], hand: [0.9, 0, 0], y: -0.12 }),
    ]),
    hits: [
      ...[0.03, 0.23, 0.52, 0.73, 0.93].map((t) => ({ t, t1: t + 0.09, shape: 'arc', range: 5.4, arc: 190, dmg: 12, kb: 1, up: 0, pull: 1.2, stop: 1 })),
      { t: 1.14, t1: 1.34, shape: 'arc', range: 5, arc: 360, dmg: 14, kb: 1, up: 1.5 },
    ],
    ev: [[1.12, 'flash', 'pink'], [1.4, 'flash', 'red']],
    shots: [{ t: 1.72, kind: 'blast' }],
    sfxs: [[0.02, 'slash_fast'], [0.22, 'slash_fast'], [0.5, 'slash_h'], [0.72, 'slash_fast'], [0.92, 'slash_fast'], [1.14, 'slash_spin']],
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
  // Ground, as in Reborn: a starburst, a storm of beam javelin thrusts, then the javelin skewers, hoists and slams its
  // target, and the ground erupts in purple lightning. Hold SP through the starburst for the charge SP: the Gundam
  // hammer, swung round for longer the more stocks it takes. In the air: a bazooka barrage.
  SP_IN: {
    dur: 0.55, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SP_FL', spHold: 'SPC_CH',
    wpn: [[0, 'javelin']],
    clip: clip([
      k(0, { torso: [0, 0, 0], uArmR: [-0.2, 0, -0.3], hand: [0.2, 0, 0] }),
      k(0.22, { torso: [-0.2, 0.3, 0], uArmR: [-3.0, 0, -0.35], fArmR: [0, 0, 0], hand: [1.5, 0, 0], uArmL: [-0.2, 0, 0.9], head: [-0.2, 0, 0], y: -0.2, ...LEGS_WIDE }, 'snap'),
      k(0.55, { torso: [-0.25, 0.35, 0] }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SP_FL: { // a storm of javelin thrusts, pink bursts all over whatever is in front
    dur: 3.0, rate: 1, armor: true, invuln: true, sp: true, loop: 0.2, rushFx: true, steer: 2, spNext: 'SP_JV',
    wpn: [[0, 'javelin']],
    clip: clip([
      k(0, { torso: [0.05, -0.5, 0], uArmR: [-0.5, 0, -0.25], fArmR: [-1.3, 0, 0], hand: [1.8, 0, 0], uArmL: [-0.9, 0.3, 0.35], fArmL: [-0.9, 0, 0], y: -0.3, ...LEGS_LUNGE_R }),
      k(0.05, { torso: [0.3, -0.3, 0], uArmR: [-1.45, 0.15, 0], fArmR: [0, 0, 0], hand: [1.45, 0, 0], y: -0.38 }, 'snap'),
      k(0.1, { torso: [0.05, -0.55, 0], uArmR: [-0.5, 0, -0.25], fArmR: [-1.3, 0, 0], hand: [1.8, 0, 0], y: -0.3 }),
      k(0.15, { torso: [0.3, -0.35, 0], uArmR: [-1.6, -0.15, 0], fArmR: [0, 0, 0], hand: [1.6, 0, 0], y: -0.38 }, 'snap'),
      k(0.2, { torso: [0.05, -0.5, 0], uArmR: [-0.5, 0, -0.25], fArmR: [-1.3, 0, 0], hand: [1.8, 0, 0], y: -0.3 }),
    ]),
    hits: [
      ...every(0.05, 2.9, 0.075, { shape: 'arc', range: 6.6, arc: 150, dmg: 9, kb: 0.5, up: 0.4, pull: 1.2, sp: true }),
      { t: 2.9, t1: 2.98, shape: 'arc', range: 6.8, arc: 170, dmg: 16, kb: 3, up: 2, sp: true },
    ],
    ev: times(0.05, 2.95, 0.1).map((t) => [t, 'jab']),
    sfxs: times(0.02, 2.9, 0.2).map((t) => [t, 'javelin']),
  },
  SP_JV: { // as in Reborn: the javelin runs its target through, hoists it overhead on the shaft and drives it into the
    // ground in front, where purple lightning erupts (the body rides the tip from 'skewer' to 'bolt': gundam.js)
    dur: 1.35, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SP_OUT', carry: [0.12, 0.82],
    wpn: [[0, 'javelin']],
    lunge: [[0, 0], [0.16, 2]],
    clip: clip([
      k(0, { torso: [0.2, -0.4, 0], uArmR: [-0.3, 0, -0.4], fArmR: [-1.4, 0, 0], hand: [1.7, 0, 0], y: -0.35, ...LEGS_WIDE }),
      k(0.14, { torso: [0.35, -0.2, 0], uArmR: [-1.5, 0, 0.05], fArmR: [0, 0, 0], hand: [1.5, 0, 0], uArmL: [-0.4, 0, 0.6], y: -0.45, ...LEGS_LUNGE_R }, 'snap'),
      k(0.26, { torso: [0.3, -0.2, 0] }),
      // the hoist: the shaft swings up to stand almost straight, its catch overhead
      k(0.56, { torso: [-0.3, -0.1, 0], uArmR: [-2.7, 0, 0.05], fArmR: [0, 0, 0], hand: [1.5, 0, 0], uArmL: [-1.6, 0, 0.3], fArmL: [-0.6, 0, 0], y: -0.1, head: [0.35, 0, 0], ...LEGS_WIDE }),
      k(0.66, { torso: [-0.38, -0.1, 0], uArmR: [-2.8, 0, 0.05], hand: [1.45, 0, 0] }),
      // the slam: over and down, the catch driven into the ground at the tip
      k(0.8, { torso: [0.55, 0, 0], uArmR: [-1.1, 0, 0.05], fArmR: [0, 0, 0], hand: [0.72, 0, 0], uArmL: [-0.7, 0, 0.1], y: -0.9, head: [-0.4, 0, 0], ...LEGS_KNEEL }, 'in'),
      k(1.35, { torso: [0.5, 0, 0], y: -0.85 }),
    ]),
    hits: [
      { t: 0.08, t1: 0.2, shape: 'line', len: 7.5, width: 2.8, dmg: 30, kb: 0.5, up: 3, sp: true },
      { t: 0.8, t1: 0.86, shape: 'circle', range: 4, off: JAV_SLAM, dmg: 40, kb: 2, up: 5, sp: true },
      { t: 0.82, t1: 0.9, shape: 'circle', range: 7.5, off: JAV_SLAM, dmg: 150, kb: 12, up: 12, big: true, sp: true },
    ],
    ev: [[0.12, 'skewer'], [0.16, 'javtip'], [0.8, 'bolt']],
    sfxs: [[0.04, 'javelin'], [0.3, 'grab'], [0.66, 'slash_down']],
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
      k(0.14, { uArmR: [-1.15, 0, -0.25] }, 'snap'),
      k(0.42, { uArmR: [-0.9, 0, -0.25] }),
    ]),
    shots: [{ t: 0.1, kind: 'bazooka', dn: true }],
  },
  SPC_CH: { // held SP: every 0.6 s held commits another stock to the hammer (hero.js chargeStocks)
    dur: 1.1, rate: 1, armor: true, invuln: true, sp: true, chargeAura: true, spcStep: 0.6, spNext: 'SPC_SWING',
    wpn: [[0, null]],
    clip: clip([
      k(0, { torso: [-0.2, 0.3, 0], uArmR: [-3.0, 0, -0.35], hand: [0, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.35, { torso: [0.45, 0, 0], uArmR: [-0.2, 0, -0.9], fArmR: [-0.8, 0, 0], hand: [0.6, 0, 0], uArmL: [-0.2, 0, 0.9], fArmL: [-0.8, 0, 0], head: [-0.2, 0, 0], y: -0.55, ...LEGS_WIDE }),
      k(1.1, { torso: [0.5, 0, 0], y: -0.6 }),
    ]),
    ev: [[0.02, 'charge'], [1.05, 'burst']],
  },
  SPC_SWING: { // the hammer flung out on its chain as the suit winds up into the turn
    dur: 1.2, rate: 1, armor: true, invuln: true, sp: true, rushFx: true, steer: 3.5, spNext: 'SPC_HAM',
    wpn: [[0, 'hammer']],
    ham: [[0, 0.6], [0.6, HAMMER_R]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -1.5], fArmR: [-0.1, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.8, 0, 0.6], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(1.2, { yaw: -PI * 2 }, 'in'),
    ]),
    hits: every(0.5, 1.2, 0.15, { shape: 'circle', range: 6.2, dmg: 14, kb: 5, up: 3, sp: true }),
    sfxs: [[0.4, 'hammer'], [0.85, 'hammer']],
  },
  SPC_HAM: { // round and round, the suit walking the hammer through the crowd: a pass of four turns, run for as long
    // as the stocks spent buy (about 3.5 s per stock with the wind-up, as in Reborn)
    dur: 2.4, rate: 1, armor: true, invuln: true, sp: true, loop: 0.6, rushFx: true, steer: 3.5, spNext: 'SPC_END',
    stockDur: [2.4, 4.8, 7.2],
    wpn: [[0, 'hammer']],
    ham: [[0, HAMMER_R]],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -1.5], fArmR: [-0.1, 0, 0], hand: [1.2, 0, 0], uArmL: [-0.8, 0, 0.6], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.6, { yaw: -PI * 2 }, 'linear'),
    ]),
    hits: every(0.05, 2.35, 0.15, { shape: 'circle', range: 6.2, dmg: 14, kb: 5, up: 3, sp: true }),
    sfxs: times(0.1, 2.35, 0.3).map((t) => [t, 'hammer']),
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
