// Mech gait, shared by the suits (hero.js), the officers (commander.js) and the grunt crowd (crowd.js). The legs are
// solved rather than swung: each foot follows a path over the ground (planted while it bears weight, then lifted and
// carried forward to the next footfall) and a two-bone IK turns that into thigh and shin angles, so a planted foot
// stays put and the knees never lock. Each foot keeps to its own side of the hips, so a turn or a strafe never steps
// one leg through the other. The cycle runs on distance travelled, a step covering `stride` leg lengths at
// the reference speed (shorter when slower), so the cadence follows the ground speed. On top: a dip and settle of the
// hips after each footfall, the hips riding over the stance leg (sway and roll), the pelvis turning with the stride
// against the chest, a forward lean at speed and a restrained arm swing. The right foot lands at phase 0, the left at
// PI (a footfall every PI).
import { P, RY, RPITCH, RROLL, RYAW } from './rig.js';

// Defaults are the Gundam's; suits override them with `gait` in their config.
export const GAIT = {
  stride: 1.45, // step length at the reference speed, in leg lengths
  duty: [0.58, 0.32], // share of the cycle each foot is down, walking / running (under 0.5 leaves a flight phase)
  back: 0.12, // the stance runs this share of its length behind the hip: land under it, push off well behind
  lift: [0.1, 0.3], // swing foot height, leg lengths
  crouch: 0.03, // hips lowered at a run on top of what the stride needs, leg lengths
  bob: 0.02, impact: 0.035, // hips rise and fall per step, and the dip as the foot lands and takes the weight
  sway: 0.035, roll: 0.05, lat: 0.03, // hips over the stance leg (leg lengths); pelvis drop, chest lean (rad)
  turn: 0.13, counter: 0.6, // pelvis yaw with the stride; the chest turns back against it by this share
  lean: 0.26, pitch: 0.06, // chest and whole-body lean at a run (rad)
  arm: [0.1, 0.08], // arm swing, weapon (right) / shield (left) arm
  carry: [0.28, -0.25, 0.3, 0.12, -0.2], // at a run, on the stance: uArmR, fArmR, hand, uArmL, fArmL
  width: 0.05, // feet set this far outside the hip joints, leg lengths
  keep: 0.6, // the feet never come nearer the line between the hips than this share of their footing out from it
  reach: 0.985, // the most a leg straightens, share of its length
  heel: 0.06, // the foot's rise onto its toe at push-off, leg lengths
  paw: 0.18, // at a run the swing foot reaches this far past its footfall and pulls back to land, leg lengths
  inertia: 0.004, // chest pitch per unit of acceleration (back as it sets off, forward as it stops), 0 for none
};

// Leg geometry from the rig (the rest pose stands on straight legs) plus the style. `speed` is the reference run.
export function gaitSpec(def, speed, style) {
  const s = def.scale, th = def.parts.thighR.pivot;
  const lt = -def.parts.shinR.pivot[1] * s, len = (def.hipHeight + th[1]) * s;
  return { ...GAIT, ...style, speed, lt, ls: len - lt, len, hy: def.hipHeight * s, px: Math.abs(th[0]) * s, py: th[1] * s, pz: th[2] * s };
}

// Per walker: phase, engagement (0 standing .. 1 striding), pelvis twist, inertia spring, and the planted feet.
export const gaitState = () => ({ ph: 0, amp: 0, tw: 0, v: 0, lean: 0, dl: 0, pl: [0, 0], ax: [0, 0], az: [0, 0], ox: [0, 0], oz: [0, 0] });

const LEGS = [['thighR', 'shinR', -1], ['thighL', 'shinL', 1]].map(([t, s, side]) => ({ t: P[t] * 3, s: P[s] * 3, side }));
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const ROT = [RPITCH, RYAW, RROLL, P.hips * 3, P.hips * 3 + 1, P.hips * 3 + 2];
const cs = new Float64Array(12); // cos/sin of the body (pitch, yaw, roll) and hips (x, y, z) rotations
const v = [0, 0, 0];
const rx = (c, s) => { const y = v[1] * c - v[2] * s; v[2] = v[1] * s + v[2] * c; v[1] = y; };
const ry = (c, s) => { const x = v[0] * c + v[2] * s; v[2] = -v[0] * s + v[2] * c; v[0] = x; };
const rz = (c, s) => { const x = v[0] * c - v[1] * s; v[1] = v[0] * s + v[1] * c; v[0] = x; };
// A foot at (x, z) in the root frame, kept at least `m` out on its own side of the hips (turned by cos c, sin s):
// into kp, true if it had to move. Stepping off the facing (a turn, a strafe) would otherwise put a footfall, or carry
// a planted foot, across the other foot's path, and the legs through each other.
const kp = [0, 0];
function keep(side, m, c, s, x, z) {
  const over = m - side * (x * c - z * s);
  if (over <= 0) { kp[0] = x; kp[1] = z; return false; }
  kp[0] = x + side * over * c; kp[1] = z - side * over * s;
  return true;
}

// Pose `t` (holding the stance) for a walker at (x, z) facing `yaw`, moving at `speed` in direction `a` (radians off
// its facing, + to its right). Advances the cycle by the distance covered; returns 1 as a foot lands.
export function gait(t, sp, st, speed, a, dt, x, z, yaw) {
  const L = sp.len, w = speed / sp.speed, k = Math.min(1, w);
  const ease = Math.min(1, dt * 10);
  st.amp += (Math.min(1, w / 0.12) - st.amp) * ease;
  const amp = st.amp;
  // the pelvis turns toward the axis of travel (backing off, away from it) while the chest keeps to the facing
  const ax = Math.abs(a) <= Math.PI / 2 ? a : a - Math.sign(a) * Math.PI;
  st.tw += ((w > 0.05 ? Math.max(-0.8, Math.min(0.8, ax * 0.7)) : 0) - st.tw) * Math.min(1, dt * 6);
  // inertia: the chest lags as the suit sets off and pitches on as it stops, on a loose spring
  if (sp.inertia) {
    const acc = dt > 0 ? ((speed - st.v) / dt) * Math.cos(a) : 0;
    st.dl += ((Math.max(-0.14, Math.min(0.14, -acc * sp.inertia)) - st.lean) * 140 - st.dl * 11) * dt;
    st.lean += st.dl * dt;
  }
  st.v = speed;
  if (amp < 0.02) { st.pl[0] = st.pl[1] = 0; if (!sp.inertia) return 0; }

  // the cycle: step length shrinks with speed (so the cadence rises with it) and for steps across the hips
  const S = sp.stride * L * Math.min(1.25, Math.max(0.3, Math.sqrt(w))) * (1 - 0.3 * Math.abs(Math.sin(a - st.tw)));
  const prev = st.ph;
  st.ph += (speed * dt * Math.PI) / S;
  const fall = amp > 0.4 && Math.floor(st.ph / Math.PI) !== Math.floor(prev / Math.PI) ? 1 : 0;
  if (st.ph > 200) st.ph -= Math.PI * 60;
  const ph = st.ph, sn = Math.sin(ph), cn = Math.cos(ph);
  const q = ph / Math.PI - Math.floor(ph / Math.PI); // step phase: 0 as a foot lands

  const beta = sp.duty[0] + (sp.duty[1] - sp.duty[0]) * k, bs = beta * S;
  const k2 = amp * (0.35 + 0.65 * k); // walking carries a third of the run's sway and swing
  const f = Math.cos(a), fwd = f >= 0 ? f : 0.4 * f;
  // hips: as low as the stride needs to reach its footfalls, plus a crouch at speed; dip as each foot lands
  const up = sp.bob * L * k2;
  const reach = sp.reach * L, wide = sp.width * L;
  const bk = sp.back * bs, r2 = reach * reach - wide * wide;
  const hmax = Math.min(Math.sqrt(Math.max(0.05 * L * L, r2 - (bs - bk) ** 2)), sp.heel * L + Math.sqrt(Math.max(0.05 * L * L, r2 - (bs + bk) ** 2))) - L;
  const y0 = t[RY];
  const hy = Math.min(y0, hmax - up) - sp.crouch * L * k;
  const bob = -up * Math.cos(Math.PI * 2 * (q - 0.2)) - sp.impact * L * k2 * (q < 0.3 ? Math.sin((Math.PI * q) / 0.3) : 0);
  t[RY] = y0 + (hy + bob - y0) * amp - Math.abs(st.lean) * 0.25 * L;
  const pitch = sp.pitch * k * amp * fwd;
  const roll = (sp.sway * sn * k2 * L) / (L + t[RY]);
  t[RPITCH] += pitch;
  t[RROLL] += roll;
  const hipsYaw = -st.tw * amp + sp.turn * cn * k2;
  t[P.hips * 3 + 1] += hipsYaw;
  t[P.hips * 3 + 2] += -roll - sp.roll * sn * k2;
  const T = P.torso * 3, H = P.head * 3;
  t[T] += sp.lean * k * amp * fwd + st.lean;
  t[T + 1] += st.tw * amp - sp.turn * cn * k2 * (1 + sp.counter);
  t[T + 2] += (sp.lat + sp.roll) * sn * k2;
  t[H] -= (sp.lean * k * amp * fwd + pitch) * 0.5;
  t[H + 1] += sp.counter * sp.turn * cn * k2 * 0.6;
  t[H + 2] -= sp.lat * sn * k2 * 0.7;
  // arms: carried higher and tighter at a run, a small swing against the legs (right arm back as the right leg leads)
  const c = sp.carry, ka = amp * k;
  t[P.uArmR * 3] += c[0] * ka + sp.arm[0] * cn * k2;
  t[P.fArmR * 3] += c[1] * ka;
  t[P.hand * 3] += c[2] * ka;
  t[P.uArmL * 3] += c[3] * ka - sp.arm[1] * cn * k2;
  t[P.fArmL * 3] += c[4] * ka;
  if (amp < 0.02) return fall;

  // body and hips rotations, for the hip joints and to bring each foot target into the thigh's frame
  for (let i = 0; i < 6; i++) {
    const r = t[ROT[i]];
    cs[i * 2] = Math.cos(r); cs[i * 2 + 1] = Math.sin(r);
  }
  const dx = -Math.sin(a), dz = Math.cos(a); // travel, root frame (+x is the walker's left)
  const tc = Math.cos(-st.tw * amp), ts = Math.sin(-st.tw * amp);
  const lift = (sp.lift[0] + (sp.lift[1] - sp.lift[0]) * k) * L;
  const fz = L * Math.sin(pitch); // the stance keeps under the leaning hips
  const yc = Math.cos(yaw), ys = Math.sin(yaw);
  const { lt, ls } = sp, foot = sp.px + wide, inner = sp.keep * foot;
  const sl = dx * tc - dz * ts; // the share of the travel across the (turned) hips
  for (let i = 0; i < 2; i++) {
    const leg = LEGS[i];
    // neutral footing under this hip, turned with the pelvis. Stepping sideways, the stance runs across the hips: set
    // it out until its inner end clears the line keep() holds, so a steady strafe needn't drag the planted foot
    const ss = leg.side * sl, end = foot - leg.side * fz * ts + (ss > 0 ? -ss * (bs + bk) : ss * (bs - bk));
    const n0 = leg.side * (foot + Math.max(0, inner - end));
    const nx = n0 * tc + sp.pz * ts, nz = -n0 * ts + sp.pz * tc + fz;
    let p = ph / (Math.PI * 2) + i * 0.5;
    p -= Math.floor(p);
    let tx, ty = 0, tz;
    if (p < beta) {
      // stance: from the footfall ahead to the push-off behind, as far as the body travels meanwhile
      const al = bs * (1 - (2 * p) / beta) - bk;
      keep(leg.side, inner, tc, ts, nx + dx * al, nz + dz * al);
      tx = kp[0]; tz = kp[1];
      ty = sp.heel * L * smooth(0.6, 1, p / beta); // the heel comes up as it pushes off
      if (!st.pl[i]) {
        st.pl[i] = 1;
        st.ax[i] = x + tx * yc + tz * ys; st.az[i] = z - tx * ys + tz * yc;
      } else {
        // held where it landed (unless the suit was shoved or turned too far off it); a turn that would carry it
        // across the other foot's path drags it along its own side instead
        const wx = st.ax[i] - x, wz = st.az[i] - z;
        const moved = keep(leg.side, inner, tc, ts, wx * yc - wz * ys, wx * ys + wz * yc);
        const near = Math.hypot(kp[0] - tx, kp[1] - tz) < 0.45 * L;
        if (near) { tx = kp[0]; tz = kp[1]; }
        if (moved || !near) { st.ax[i] = x + tx * yc + tz * ys; st.az[i] = z - tx * ys + tz * yc; }
      }
      st.ox[i] = tx; st.oz[i] = tz;
    } else {
      // swing: lift off where it pushed off, heel up early, reach and come down on the next footfall
      st.pl[i] = 0;
      const u = (p - beta) / (1 - beta), e = smooth(0, 0.8, u);
      const out = sp.paw * L * k * Math.sin(Math.PI * smooth(0.35, 1, u)); // reaches past the footfall, pulls back to land
      keep(leg.side, inner, tc, ts, st.ox[i] + (nx + dx * (bs - bk) - st.ox[i]) * e + dx * out, st.oz[i] + (nz + dz * (bs - bk) - st.oz[i]) * e + dz * out);
      tx = kp[0]; tz = kp[1];
      const uu = Math.pow(u, 0.8);
      ty = lift * 4 * uu * (1 - uu);
    }
    // hip joint in the root frame: its pivot through the hips' rotation, up to the hips, through the body's
    v[0] = leg.side * sp.px; v[1] = sp.py; v[2] = sp.pz;
    rz(cs[10], cs[11]); ry(cs[8], cs[9]); rx(cs[6], cs[7]);
    v[1] += sp.hy + t[RY];
    rz(cs[4], cs[5]); rx(cs[0], cs[1]); ry(cs[2], cs[3]);
    // hip to foot, back into the thigh's parent frame
    v[0] = tx - v[0]; v[1] = ty - v[1]; v[2] = tz - v[2];
    ry(cs[2], -cs[3]); rx(cs[0], -cs[1]); rz(cs[4], -cs[5]);
    rx(cs[6], -cs[7]); ry(cs[8], -cs[9]); rz(cs[10], -cs[11]);
    // two-bone IK: the knee from the hip-foot distance, the leg bent in the plane through the hip-foot line and the
    // hips' forward, so the knee always points ahead. (Splaying the thigh out before swinging it goes singular once
    // the knee folds far enough to bring the foot level with the hip along the thigh: the splay then flips the thigh
    // out flat to one side or the other, and the knees cross.)
    const d0 = Math.max(1e-6, Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]));
    const d = Math.min(reach, Math.max(Math.abs(lt - ls) + 0.05, d0));
    const ux = v[0] / d0, uy = v[1] / d0, uz = v[2] / d0;
    const kb = Math.acos(Math.max(-1, Math.min(1, (d * d - lt * lt - ls * ls) / (2 * lt * ls))));
    const ah = Math.acos(Math.max(-1, Math.min(1, (lt * lt + d * d - ls * ls) / (2 * lt * d)))); // thigh off the hip-foot line
    // the knee's way: the hips' forward, square to the hip-foot line
    const kn = 1 / Math.sqrt(Math.max(1e-6, 1 - uz * uz));
    const kx = -uz * ux * kn, ky = -uz * uy * kn, kz = (1 - uz * uz) * kn;
    const ca = Math.cos(ah), sa = Math.sin(ah);
    // down the thigh (its -y), and the knee's side of it (its +z); then the thigh's rotation as XYZ Euler angles
    const ex = ux * ca + kx * sa, ey = uy * ca + ky * sa, ez = uz * ca + kz * sa;
    const qx = kx * ca - ux * sa, qy = ky * ca - uy * sa, qz = kz * ca - uz * sa;
    t[leg.t] += (Math.atan2(-qy, qz) - t[leg.t]) * amp;
    t[leg.t + 1] += (Math.asin(Math.max(-1, Math.min(1, qx))) - t[leg.t + 1]) * amp;
    t[leg.t + 2] += (Math.atan2(ex, qy * ez - qz * ey) - t[leg.t + 2]) * amp;
    t[leg.s] += (kb - t[leg.s]) * amp;
    t[leg.s + 1] -= t[leg.s + 1] * amp;
    t[leg.s + 2] -= t[leg.s + 2] * amp;
  }
  return fall;
}
