// Delta Plus moveset after Dynasty Warriors: Gundam Reborn's "ALL MOVES" clip (youtube _fUv7vCfj80) and the Koei wiki's
// Reborn list (which says what each input is; the footage says how it looks): keyframed poses + hit timing. Normal
// string N1..N4 on attack (three slashes, then the shield's twin beam sabers cut an X); charge attack C(n+1) on charge
// after n normals. Tapping charge alone fires the beam rifle (mash for up to five shots), holding it fires a charge
// shot. Weapons: beam saber (also fixed on the rifle as a bayonet for the dash string), the shield's two beam sabers,
// beam rifle, a shield-mounted grenade launcher and the waverider's beam cannon. The video showed Basic Combo, Shot
// Combo, Charge Shot, Charge 2-4 (C3 with its K follow-up), Dash Combo, Dash Charge, Transform Shot (boost twice to
// fold into waverider mode, J for the beam cannon) and Musou/Air Musou; it never got to a C5, a jump attack or the
// charge SP, so those are invented in the same spirit: C5 a rising double cut, JA/JC the other suits' air normals, and
// the charge SP the Musou's circling run held longer per stock. The waverider is faked with a pose (torso pitched
// flat, arms swept back, legs tucked, shield forward) rather than a separate model, as the skill suggests. Reach was
// measured off gameplay footage in Delta Plus heights (H ~ 3.9 units, 1.15x the Gundam's): the saber blade is
// ~1.3 H, spin rings ~1.4 H, the SP vortex ~3 H across and its explosion ~2.5 H, the transform rams ~2 H long.
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
// { t, kind, ang, dn, heavy } (rifle | cshot | grenade | cannon | spShot | beam | swipe, see DeltaPlus.fire); wpn: [t,
// weapon] (saber | twin: saber and the shield's sabers | shieldSaber | bayonet: the saber fixed on the rifle | rifle |
// null); jets: [t0,t1,lift]; slide: [t0,t1,speed]; rate. Read in DeltaPlus.onMoveTick: orbit { r, w, y } (circle
// the SP's target in waverider mode), sweep [t0, t1, from, to] (turn the suit through a swipe), orb (the air SP's
// charging orb at the muzzle). SP phases: spNext, spHold, stockDur, stockPower.
export const MOVES = {
  // ---- normal string: three beam saber cuts, then the shield's twin sabers and the hand saber cut an X ----
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
  N4: { // the shield's two beam sabers light, and a twin diagonal slash with the hand saber cuts an X that knocks the
        // target away (Reborn; the wiki's J x4: three slashes, then the shield's twin diagonal strike)
    dur: 0.72, chain: 0.5, next: null, charge: 'C5',
    wpn: [[0, 'saber'], [0.04, 'twin']],
    lunge: [[0.04, 0], [0.18, 1.8]],
    clip: clip([
      k(0, { torso: [-0.2, 0, 0], uArmR: [-2.6, -0.3, -0.6], fArmR: [-0.2, 0, 0], hand: [0.6, 0, 0], uArmL: [-2.5, 0.3, 0.6], fArmL: [-0.3, 0, 0], handL: [0, 0, 0], y: -0.1, head: [0.15, 0, 0], ...LEGS_WIDE }),
      k(0.08, { torso: [-0.3, 0, 0], uArmR: [-2.8, -0.35, -0.7], uArmL: [-2.7, 0.35, 0.7] }),
      k(0.2, { torso: [0.5, 0, 0], uArmR: [-0.5, 0.5, 0.1], fArmR: [-0.1, 0, 0], hand: [0.9, 0, 0], uArmL: [-0.5, -0.5, -0.1], fArmL: [-0.1, 0, 0], y: -0.45, head: [-0.3, 0, 0], ...LEGS_LUNGE_R }, 'snap'),
      k(0.72, { torso: [0.3, 0, 0], uArmR: [-0.6, 0.3, -0.1], uArmL: [-0.6, -0.3, 0.1], y: -0.3 }),
    ]),
    hits: [{ t: 0.12, t1: 0.24, shape: 'arc', range: 6.6, arc: 170, dmg: 38, kb: 9, up: 2, big: true }],
    sfx: 'slash_h', swing: 0.12,
  },

  // ---- charge attacks ----
  // K alone: beam rifle. Mash K for a shot combo (up to five, as the wiki says); hold it for a charge shot.
  C1: {
    dur: 0.38, chain: 0.12, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true,
    clip: clip([
      k(0, { ...RIFLE, torso: [0, -0.5, 0], uArmR: [-1.3, 0, 0.1], fArmR: [-0.3, 0, 0], hand: [1.6, 0, 0] }),
      k(0.09, { ...RIFLE }, 'snap'),
      k(0.15, { uArmR: [-1.8, 0, 0.1], hand: [1.4, 0, 0] }, 'snap'),
      k(0.38, { uArmR: [-1.55, 0, 0.1], hand: [1.55, 0, 0] }),
    ]),
    shots: [{ t: 0.11, kind: 'rifle' }],
  },
  C1R: {
    dur: 0.24, chain: 0.09, rifle: true, rate: 1, next: null, charge: 'C1R', shot: true, maxRepeat: 5,
    clip: clip([
      k(0, { ...RIFLE }),
      k(0.05, { uArmR: [-1.75, 0, 0.1], hand: [1.42, 0, 0] }, 'snap'),
      k(0.24, { ...RIFLE }),
    ]),
    shots: [{ t: 0.03, kind: 'rifle' }],
  },
  CS: { // charge shot: the shield swings up to block, the thrusters brace, one heavy beam that throws the target; the
        // thrusters lift the suit a little after it, and it lands in a crouch (no pushback in the footage)
    dur: 1.3, chain: 1.1, rifle: true, rate: 1, next: null, charge: null, armor: true,
    jets: [0.3, 0.95, true],
    air: [[0.62, 0], [0.84, 0.6], [1.04, 0]],
    clip: clip([
      k(0, { ...RIFLE, ...BLOCK, torso: [0.05, -0.2, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.4, { ...RIFLE, ...BLOCK, torso: [0.05, -0.35, 0], y: -0.3 }),
      k(0.55, { ...RIFLE, ...BLOCK, torso: [0, -0.55, 0], y: -0.32 }),
      k(0.62, { uArmR: [-1.95, 0, 0.1], hand: [1.75, 0, 0] }, 'snap'),
      k(0.84, { ...RIFLE, torso: [0, -0.4, 0], y: 0, ...LEGS_AIR }),
      k(1.04, { torso: [0.35, -0.3, 0], y: -0.55, ...LEGS_KNEEL }, 'in'),
      k(1.3, { ...RIFLE, torso: [0, -0.4, 0], y: -0.15, ...LEGS_WIDE }),
    ]),
    ev: [[0.02, 'flash', 'gold'], [0.24, 'flash', 'gold']],
    shots: [{ t: 0.58, kind: 'cshot' }],
    chargeFx: [0.0, 0.55],
  },

  // J K: a flip kick that launches, then two diagonal saber slashes in the air after the target (Reborn and the wiki).
  C2: {
    dur: 1.75, chain: 1.5, saber: true, rate: 1, next: null, charge: null, armor: true,
    lunge: [[0.02, 0], [0.2, 1.4], [0.55, 1.4], [0.7, 2.2]],
    air: [[0.06, 0], [0.34, 2.2], [0.55, 2.6], [1.1, 3.2], [1.5, 0]],
    jets: [0.5, 1.12, true],
    clip: clip([
      k(0, { torso: [0.4, 0, 0], uArmR: [-0.4, 0, -0.4], fArmR: [-0.6, 0, 0], uArmL: [-0.6, 0, 0.4], y: -0.45, pitch: 0, ...LEGS_LUNGE_R }),
      k(0.1, { torso: [-0.4, 0, 0], thighR: [-2.1, 0, -0.1], shinR: [0.1, 0, 0], thighL: [0.3, 0, 0.1], shinL: [0.6, 0, 0], y: 0 }, 'snap'),
      k(0.42, { torso: [0.3, 0, 0], pitch: -PI * 2, ...LEGS_AIR }),
      k(0.6, { pitch: -PI * 2, torso: [-0.2, -0.6, 0], uArmR: [-2.7, -0.3, -0.7], fArmR: [-0.2, 0, 0], hand: [0.5, 0, 0], uArmL: [-0.4, 0, 0.6] }),
      k(0.7, { pitch: -PI * 2, torso: [0.35, 0.6, 0], uArmR: [-0.4, 1.2, -0.3], fArmR: [-0.1, 0, 0], hand: [0.9, 0, 0] }, 'snap'),
      k(0.84, { pitch: -PI * 2, torso: [-0.2, 0.6, 0], uArmR: [-2.7, 0.4, -0.3], hand: [0.5, 0, 0] }),
      k(0.94, { pitch: -PI * 2, torso: [0.4, -0.6, 0], uArmR: [-0.4, -0.5, -1.0], hand: [1.0, 0, 0] }, 'snap'),
      k(1.5, { pitch: -PI * 2, torso: [0.45, -0.2, 0], uArmR: [-0.6, 0, -0.4], y: -0.6, ...LEGS_KNEEL }, 'in'),
      k(1.75, { pitch: -PI * 2, torso: [0.1, -0.2, 0], uArmR: [-0.6, 0, -0.3], fArmR: [-0.7, 0, 0], hand: [0.6, 0, 0], y: -0.1, ...LEGS_WIDE }),
    ]),
    hits: [
      { t: 0.08, t1: 0.2, shape: 'arc', range: 5.4, arc: 120, dmg: 30, kb: 1, up: 13, big: true },
      { t: 0.68, t1: 0.78, shape: 'arc', range: 6.2, arc: 170, hy: 8, dmg: 22, kb: 1, up: 3 },
      { t: 0.92, t1: 1.02, shape: 'arc', range: 6.2, arc: 170, hy: 8, dmg: 30, kb: 8, up: -4, big: true },
    ],
    ev: [[0.02, 'flash', 'gold'], [1.5, 'land']],
    sfxs: [[0.06, 'phit'], [0.66, 'slash_a'], [0.9, 'slash_b']],
  },

  // J J K: a beam saber thrust from the shield. If it connects, K again (C3F): a kick that launches, a leap after the
  // target with two cuts, then the shield's grenade launcher fires two rounds down into it (Reborn and the wiki).
  C3: {
    dur: 0.95, chain: 0.5, rate: 1, next: null, charge: 'C3F', armor: true,
    wpn: [[0, 'shieldSaber']],
    lunge: [[0.04, 0], [0.2, 2.2]],
    clip: clip([
      k(0, { torso: [0.1, -0.5, 0], uArmL: [-0.6, 0.4, 0.6], fArmL: [-1.2, 0, 0], handL: [0, 0, 0], uArmR: [-0.5, 0, -0.4], fArmR: [-0.8, 0, 0], y: -0.3, ...LEGS_WIDE }),
      k(0.16, { torso: [0.35, 0.6, 0], uArmL: [-1.55, 0.2, 0.05], fArmL: [0, 0, 0], y: -0.4, ...LEGS_LUNGE_L }, 'snap'),
      k(0.4, { torso: [0.35, 0.55, 0], uArmL: [-1.5, 0.2, 0.05] }),
      k(0.95, { torso: [0.1, 0.2, 0], uArmL: [-0.6, 0, 0.4], fArmL: [-1.0, 0, 0], y: -0.2 }),
    ]),
    ev: [[0.0, 'flash', 'gold'], [0.18, 'thrust'], [0.26, 'thrust'], [0.34, 'thrust']],
    sfxs: [[0.14, 'slash_dash']],
  },
  C3F: { // K after a C3 thrust that connected: kick, leap after the target with two cuts, two grenade rounds down into it
    dur: 1.75, chain: 1.55, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, null], [0.36, 'saber'], [0.78, null]],
    lunge: [[0, 0], [0.12, 1.0]],
    air: [[0.16, 0], [0.45, 3.6], [1.15, 3.8], [1.6, 0]],
    jets: [0.16, 1.2, true],
    clip: clip([
      k(0, { torso: [0.2, 0.3, 0], uArmL: [-0.6, 0, 0.4], fArmL: [-1.0, 0, 0], y: -0.3, ...LEGS_WIDE }),
      k(0.08, { torso: [-0.35, 0, 0], thighR: [-2.0, 0, -0.1], shinR: [0.1, 0, 0], thighL: [0.2, 0, 0.1], shinL: [0.5, 0, 0], y: -0.05 }, 'snap'),
      k(0.36, { torso: [0.2, 0, 0], uArmR: [-2.6, 0.3, -0.5], fArmR: [-0.2, 0, 0], hand: [0.5, 0, 0], ...LEGS_AIR }),
      k(0.48, { torso: [0.4, -0.7, 0], uArmR: [-0.4, -0.4, -1.1], hand: [1.1, 0, 0] }, 'snap'),
      k(0.56, { torso: [0.2, 0.7, 0], uArmR: [-0.4, 1.4, -1.0] }),
      k(0.64, { torso: [0.4, -0.6, 0], uArmR: [-0.6, -0.5, -1.2] }, 'snap'),
      k(0.85, { torso: [0.55, 0.2, 0], uArmL: [-0.9, 0, 0.1], fArmL: [-0.2, 0, 0], handL: [0.4, 0, 0], uArmR: [-0.4, 0, -0.4], fArmR: [-0.8, 0, 0], head: [0.3, 0, 0] }),
      k(1.15, { torso: [0.55, 0.2, 0] }),
      k(1.6, { torso: [0.4, 0, 0], y: -0.55, ...LEGS_KNEEL }, 'in'),
      k(1.75, { torso: [0.1, -0.15, 0], uArmL: [-0.5, 0, 0.35], fArmL: [-1.0, 0, 0], y: -0.15, ...LEGS_WIDE }),
    ]),
    hits: [
      { t: 0.06, t1: 0.16, shape: 'arc', range: 5.2, arc: 120, dmg: 24, kb: 1, up: 13, big: true },
      { t: 0.46, t1: 0.54, shape: 'arc', range: 6.2, arc: 170, hy: 8, dmg: 18, kb: 1, up: 2 },
      { t: 0.62, t1: 0.7, shape: 'arc', range: 6.2, arc: 170, hy: 8, dmg: 20, kb: 1, up: 2 },
    ],
    shots: [{ t: 0.92, kind: 'grenade', dn: true, heavy: true }, { t: 1.08, kind: 'grenade', dn: true, heavy: true }],
    ev: [[1.6, 'land']],
    sfxs: [[0.04, 'phit'], [0.46, 'slash_a'], [0.62, 'slash_b']],
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

  // ---- invented: the video never got to a C5 ----
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
  // ---- boost dash: the beam saber fixed on the rifle as a bayonet, two swings a press (keep pressing J), then one
  // grenade round (Reborn; the wiki lists it with the dashing attacks: four bayonet swings, ending in a grenade) ----
  DA: {
    dur: 0.38, chain: 0.22, rate: 1, next: 'DA2', charge: 'DC', armor: true,
    wpn: [[0, 'bayonet']],
    slide: [0, 0.34, 7.2],
    jets: [0, 0.34, false],
    clip: clip([
      k(0, { torso: [0.35, -0.9, 0], ...SWEEP_R, hand: [1.57, 0, 0], uArmL: [-1.0, 0, 0.5], y: -0.35, ...LEGS_LUNGE_L }),
      k(0.09, { torso: [0.4, 0.9, 0], ...SWEEP_L, hand: [1.57, 0, 0], uArmL: [-0.2, 0, 0.9], y: -0.4, ...LEGS_LUNGE_R }, 'snap'),
      k(0.19, { torso: [0.3, 1.0, 0], uArmR: [-0.3, 1.9, -1.3], fArmR: [-0.3, 0, 0] }),
      k(0.29, { torso: [0.35, -0.95, 0], uArmR: [-0.4, -0.4, -1.3], fArmR: [-0.2, 0, 0], y: -0.35, ...LEGS_LUNGE_L }, 'snap'),
      k(0.38, { torso: [0.35, -0.9, 0] }),
    ]),
    hits: [
      { t: 0.03, t1: 0.11, shape: 'arc', range: 6.0, arc: 190, dmg: 15, kb: 1.5, up: 0, pull: 1, stop: 1 },
      { t: 0.21, t1: 0.29, shape: 'arc', range: 6.0, arc: 190, dmg: 15, kb: 1.5, up: 0, pull: 1, stop: 1 },
    ],
    sfxs: [[0.02, 'slash_fast'], [0.19, 'slash_fast']],
  },
  DA2: {
    dur: 0.4, chain: 0.24, rate: 1, next: 'DAF', charge: null, armor: true,
    wpn: [[0, 'bayonet']],
    slide: [0, 0.3, 5],
    jets: [0, 0.3, false],
    clip: clip([
      k(0, { torso: [0.35, -0.95, 0], uArmR: [-0.4, -0.4, -1.3], fArmR: [-0.2, 0, 0], hand: [1.57, 0, 0], y: -0.35, ...LEGS_LUNGE_L }),
      k(0.09, { torso: [-0.2, 0.3, 0], uArmR: [-2.7, 0.3, -0.5], fArmR: [-0.1, 0, 0], y: -0.1, ...LEGS_WIDE }, 'snap'),
      k(0.2, { torso: [-0.25, 0.3, 0] }),
      k(0.3, { torso: [0.55, 0, 0], uArmR: [-0.8, 0, -0.1], fArmR: [-0.1, 0, 0], y: -0.45, ...LEGS_LUNGE_R }, 'snap'),
      k(0.4, { torso: [0.4, 0, 0] }),
    ]),
    hits: [
      { t: 0.04, t1: 0.12, shape: 'arc', range: 6.0, arc: 150, dmg: 15, kb: 1, up: 3, pull: 1, stop: 1 },
      { t: 0.24, t1: 0.33, shape: 'arc', range: 6.2, arc: 120, dmg: 18, kb: 2, up: 0, stop: 1 },
    ],
    sfxs: [[0.03, 'slash_rise'], [0.24, 'slash_h']],
  },
  DAF: { // the dash string's end: the shield swings round and the grenade launcher fires one round point-blank
    dur: 0.8, chain: 0.6, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, 'bayonet']],
    clip: clip([
      k(0, { torso: [0.3, 0, 0], uArmR: [-0.6, 0, -0.3], fArmR: [-0.8, 0, 0], hand: [0.8, 0, 0], y: -0.35, ...LEGS_WIDE }),
      k(0.14, { torso: [-0.15, 0.1, 0], uArmL: [-1.05, 0, 0.1], fArmL: [-0.45, 0, 0], handL: [0, 0.1, 0], y: -0.35, ...LEGS_LUNGE_L }, 'snap'),
      k(0.4, { torso: [-0.15, 0.1, 0], uArmL: [-1.05, 0, 0.1] }),
      k(0.8, { torso: [0.1, -0.2, 0], uArmL: [-0.5, 0, 0.35], fArmL: [-1.0, 0, 0], handL: [0, 0.15, 0], y: -0.15 }),
    ]),
    shots: [{ t: 0.2, kind: 'grenade' }],
  },
  DC: { // Dash Charge: cuts on the rush, a spin, then the shield swings round for a point-blank grenade blast
    dur: 1.5, chain: 1.3, rate: 1, next: null, charge: null, armor: true,
    saber: true,
    slide: [0, 0.3, 5],
    clip: clip([
      k(0, { torso: [0.35, -0.9, 0], ...SWEEP_R, uArmL: [-1.0, 0, 0.5], y: -0.35, ...LEGS_LUNGE_L }),
      k(0.1, { torso: [0.4, 0.9, 0], ...SWEEP_L, uArmL: [-0.2, 0, 0.9], y: -0.4, ...LEGS_LUNGE_R }, 'snap'),
      k(0.24, { torso: [0.35, -0.95, 0], uArmR: [-0.4, -0.4, -1.3], fArmR: [-0.2, 0, 0], y: -0.35, ...LEGS_LUNGE_L }, 'snap'),
      k(0.36, { torso: [0.1, -0.6, 0], ...SWEEP_R, uArmL: [0, 0, 1.3], y: -0.3, yaw: 0, ...LEGS_WIDE }),
      k(0.56, { yaw: PI * 2, torso: [0.1, 0.3, 0] }, 'linear'),
      k(0.76, { yaw: PI * 2, torso: [-0.15, 0.1, 0], uArmL: [-1.05, 0, 0.1], fArmL: [-0.45, 0, 0], handL: [0, 0.1, 0], uArmR: [-0.5, 0, -0.3], fArmR: [-0.8, 0, 0], hand: [0.8, 0, 0], y: -0.35, ...LEGS_LUNGE_R }),
      k(0.92, { yaw: PI * 2, torso: [-0.15, 0.1, 0], uArmL: [-1.05, 0, 0.1], y: -0.35 }),
      k(1.5, { yaw: PI * 2, torso: [0.1, -0.2, 0], uArmL: [-0.5, 0, 0.35], fArmL: [-1.0, 0, 0], handL: [0, 0.15, 0], y: -0.12 }),
    ]),
    hits: [
      { t: 0.06, t1: 0.14, shape: 'arc', range: 6.0, arc: 190, dmg: 14, kb: 1, up: 0, pull: 1, stop: 1 },
      { t: 0.2, t1: 0.28, shape: 'arc', range: 6.0, arc: 190, dmg: 14, kb: 1, up: 0, pull: 1, stop: 1 },
      { t: 0.38, t1: 0.56, shape: 'arc', range: 5.8, arc: 360, dmg: 14, kb: 1, up: 1.5 },
    ],
    ev: [[0.02, 'flash', 'red'], [0.58, 'flash', 'red']],
    shots: [{ t: 0.94, kind: 'grenade' }],
    sfxs: [[0.04, 'slash_fast'], [0.18, 'slash_fast'], [0.38, 'slash_spin']],
  },

  // ---- Transform Shot (boost twice): the suit folds into waverider mode and flies at the target, ramming whatever
  // is in the way; J fires the beam cannon from the nose and it unfolds. Left alone, it unfolds at the end of the run
  // (Reborn's "Transform Shot"; the wiki: boost twice to transform, then attack for the beam cannon). ----
  TS: {
    dur: 1.1, chain: 0.15, rate: 1, next: 'TSF', charge: null, armor: true,
    wpn: [[0, null]],
    slide: [0.05, 1.0, 22],
    air: [[0, 0], [0.2, 1.2], [0.9, 1.2], [1.1, 0]],
    jets: [0.05, 1.0, false],
    clip: clip([
      k(0, { torso: [0.35, -0.3, 0], uArmR: [0.7, 0, -0.35], fArmR: [-0.2, 0, 0], hand: [0.2, 0, 0], y: -0.4, ...LEGS_LUNGE_R }),
      k(0.12, { ...FOLD, y: -0.1 }, 'snap'),
      k(0.9, { ...FOLD, y: -0.1 }),
      k(1.1, { torso: [0.2, 0, 0], uArmR: [-0.6, 0, -0.3], fArmR: [-0.6, 0, 0], y: -0.25 }),
    ]),
    hits: [{ t: 0.15, t1: 1.0, shape: 'line', len: 4.5, width: 3.2, dmg: 16, kb: 6, up: 3 }],
    ev: [[0.08, 'fold']],
    sfxs: [[0.05, 'qb']],
  },
  TSF: { // J in waverider mode: the beam cannon fires from the nose, and the suit unfolds
    dur: 0.8, chain: 0.6, rate: 1, next: null, charge: null, armor: true,
    wpn: [[0, null]],
    slide: [0, 0.18, 10],
    air: [[0, 0], [0.6, -1.2]], // down from the run's height
    clip: clip([
      k(0, { ...FOLD, y: -0.1 }),
      k(0.3, { ...FOLD, y: -0.1 }),
      k(0.55, { torso: [0.2, 0, 0], uArmR: [-0.6, 0, -0.3], fArmR: [-0.6, 0, 0], uArmL: [-0.6, 0, 0.3], fArmL: [-0.8, 0, 0], y: -0.35, ...LEGS_WIDE }),
      k(0.8, { torso: [0.1, -0.15, 0], y: -0.15 }),
    ]),
    shots: [{ t: 0.12, kind: 'cannon' }],
    ev: [[0.45, 'fold']],
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
  // Ground: a starburst, then the suit folds into waverider mode and circles the target at speed, cutting a vortex
  // that catches everything in it; it climbs out, unfolds, and fires three rifle shots down into a huge explosion
  // (Reborn and the wiki). Hold SP through the starburst for the charge SP (not in the footage): the same run,
  // circling ~3.5 s longer for each extra stock, into a bigger blast. In the air: hovering low, the rifle pours a
  // concentrated beam into the target, then swings it sideways to swipe everything away (Reborn and the wiki).
  SP_IN: {
    dur: 0.55, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SP_RUN', spHold: 'SPC_CH',
    wpn: [[0, null]],
    clip: clip([
      k(0, { torso: [0, 0, 0], uArmR: [-0.2, 0, -0.3], hand: [0.2, 0, 0] }),
      k(0.22, { torso: [-0.2, 0.3, 0], uArmR: [-3.0, 0, -0.35], fArmR: [0, 0, 0], hand: [0, 0, 0], uArmL: [-0.2, 0, 0.9], head: [-0.2, 0, 0], y: -0.2, ...LEGS_WIDE }, 'snap'),
      k(0.4, { torso: [-0.25, 0.35, 0] }),
      k(0.55, { ...FOLD, y: -0.1 }),
    ]),
    ev: [[0.04, 'burst'], [0.45, 'fold']],
  },
  SPC_CH: { // held: fold and gather, committing another stock every spcStep while SP stays held
    dur: 1.1, rate: 1, armor: true, invuln: true, sp: true, chargeAura: true, spNext: 'SP_RUN',
    wpn: [[0, null]],
    clip: clip([
      k(0, { torso: [-0.2, 0.3, 0], uArmR: [-3.0, 0, -0.35], hand: [0, 0, 0], y: -0.2, ...LEGS_WIDE }),
      k(0.35, { ...FOLD, y: -0.1 }),
      k(1.1, { ...FOLD, y: -0.1 }),
    ]),
    ev: [[0.02, 'charge'], [0.35, 'fold'], [1.05, 'burst']],
  },
  SP_RUN: { // circling the target in waverider mode, a white vortex spun up behind: ~4.2 s, ~3.5 s more a held stock
    dur: 4.2, rate: 1, armor: true, invuln: true, sp: true, rushFx: true, spNext: 'SP_RISE',
    stockDur: [4.2, 7.7, 11.2],
    orbit: { r: 6.5, w: 5.0, y: 1.0 },
    wpn: [[0, null]],
    clip: clip([
      k(0, { ...FOLD, y: -0.1, roll: 0.35 }),
      k(4.2, { ...FOLD, y: -0.1, roll: 0.35 }),
    ]),
    hits: every(0.05, 4.15, 0.12, { shape: 'circle', range: 4.4, dmg: 9, kb: 1, up: 2, sp: true }),
    ev: times(0.1, 4.15, 0.35).map((t) => [t, 'vortex']),
    sfxs: times(0.05, 4.15, 0.5).map((t) => [t, 'qb']),
  },
  SP_RISE: { // climbs out of the circle, unfolds, and turns the rifle down on the vortex's heart
    dur: 0.8, rate: 1, armor: true, invuln: true, sp: true, spNext: 'SP_FIRE',
    wpn: [[0, null], [0.5, 'rifle']],
    orbit: { r: 6.5, w: 1.5, y: 7.2, face: true },
    jets: [0, 0.8, true],
    clip: clip([
      k(0, { ...FOLD, y: -0.1 }),
      k(0.4, { ...FOLD, torso: [0.9, 0, 0], y: -0.1 }),
      k(0.6, { ...RIFLE, torso: [0.6, -0.4, 0], head: [0.5, -0.3, 0], ...LEGS_AIR }),
      k(0.8, { ...RIFLE, torso: [0.6, -0.4, 0], head: [0.5, -0.3, 0], ...LEGS_AIR }),
    ]),
    ev: [[0.45, 'fold']],
    sfxs: [[0.1, 'qb']],
  },
  SP_FIRE: { // three rifle shots down into the vortex's heart, and it goes up in a huge explosion (~2.5 H)
    dur: 1.6, rate: 1, armor: true, invuln: true, sp: true,
    stockPower: [1, 1.3, 1.6],
    wpn: [[0, 'rifle'], [1.2, null]],
    orbit: { r: 6.5, w: 0, y: 7.2, face: true, fall: [0.95, 1.4] },
    jets: [0, 0.9, true],
    clip: clip([
      k(0, { ...RIFLE, torso: [0.6, -0.4, 0], head: [0.5, -0.3, 0], ...LEGS_AIR }),
      ...[0.1, 0.28, 0.46].map((t) => k(t, { torso: [0.6, -0.4, 0] })),
      k(0.95, { ...RIFLE, torso: [0.5, -0.4, 0], ...LEGS_AIR }),
      k(1.4, { torso: [0.5, 0, 0], uArmR: [-0.8, 0, 0.05], hand: [0.9, 0, 0], y: -0.7, ...LEGS_KNEEL }, 'in'),
      k(1.6, { torso: [0.15, -0.15, 0], y: -0.2, ...LEGS_WIDE }),
    ]),
    shots: [0.1, 0.28, 0.46].map((t) => ({ t, kind: 'spShot' })),
    ev: [[0.62, 'spboom'], [1.4, 'land']],
    sfxs: [[0.1, 'rifle'], [0.28, 'rifle'], [0.46, 'rifle']],
  },
  SPA_IN: {
    dur: 0.5, rate: 1, armor: true, invuln: true, sp: true, isAir: true, spNext: 'SPA_BEAM',
    wpn: [[0, null], [0.3, 'rifle']],
    jets: [0, 0.5, true],
    clip: clip([
      k(0, { torso: [0.1, 0, 0], uArmR: [-0.3, 0, -0.5], uArmL: [-0.5, 0, 0.5], ...LEGS_AIR }),
      k(0.3, { ...RIFLE, torso: [0.2, -0.5, 0], uArmL: [-0.9, 0, 0.3], fArmL: [-0.5, 0, 0], ...LEGS_AIR }),
      k(0.5, { ...RIFLE, torso: [0.2, -0.5, 0], ...LEGS_AIR }),
    ]),
    ev: [[0.04, 'burst']],
  },
  SPA_BEAM: { // hovering low, the rifle gathers light and pours a concentrated beam into the target
    dur: 3.3, rate: 1, armor: true, invuln: true, sp: true, isAir: true, orb: true, spNext: 'SPA_SWIPE',
    wpn: [[0, 'rifle']],
    jets: [0, 3.3, true],
    clip: clip([
      k(0, { ...RIFLE, torso: [0.2, -0.5, 0], uArmL: [-0.9, 0, 0.3], fArmL: [-0.5, 0, 0], ...LEGS_AIR }),
      k(1.6, { torso: [0.25, -0.5, 0.03] }),
      k(3.3, { torso: [0.2, -0.5, 0] }),
    ]),
    shots: times(0.3, 3.3, 0.07).map((t, i) => ({ t, kind: 'beam', first: i === 0 })),
    sfxs: times(0.3, 3.3, 0.8).map((t) => [t, 'charge']),
  },
  SPA_SWIPE: { // the beam swung wide across the field, sweeping everything in front away
    dur: 0.9, rate: 1, armor: true, invuln: true, sp: true, isAir: true,
    wpn: [[0, 'rifle'], [0.75, null]],
    sweep: [0.1, 0.6, -1.0, 1.1],
    jets: [0, 0.7, true],
    clip: clip([
      k(0, { ...RIFLE, torso: [0.2, -0.5, 0], ...LEGS_AIR }),
      k(0.6, { torso: [0.2, -0.3, 0] }),
      k(0.9, { torso: [0.1, -0.1, 0], uArmR: [-0.6, 0, -0.3], fArmR: [-0.5, 0, 0] }),
    ]),
    shots: times(0.1, 0.62, 0.04).map((t) => ({ t, kind: 'swipe' })),
    sfxs: [[0.08, 'cshot']],
  },
};

// timed effects and sounds fire in order
for (const m of Object.values(MOVES)) for (const key of ['ev', 'sfxs']) m[key]?.sort((a, b) => a[0] - b[0]);
