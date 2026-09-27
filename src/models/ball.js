// RB-79 Ball, sculpted from reference renders (see core/sculpt.js): a pale grey space pod. A red-orange hexagonal frame
// round the green viewport low on its face; the 180mm low-recoil cannon on a turret on top, a boxy breech and magazine
// under a long dark barrel (the head node, so poses aim it: head pitch 0 points it straight up, ~1.4 levels it
// forward); two jointed tube arms with three-fingered claws low on the front; a thruster block slung underneath and two
// thruster bells at the back. The torso pivot is the sphere's centre, so torso rotations tumble the whole pod in place.
import { Sculpt, box, rbox, ell, cyl, prism, and, sub, both, rot, fn, rigDef } from '../core/sculpt.js';
import { pal } from './suits.js';

export const BALL_R = 2;
const SCALE = 0.1;

const BL = {
  W: 0xd6dade, W2: 0xb0b7c1, W3: 0x8e96a2, O: 0xd4502c, O2: 0x9a3218, G: 0x52f0a0,
  K: 0x575e6a, K2: 0x3a404a, K3: 0x22262d, RD: 0xc8262e,
};
const hexagon = (cx, cy, r) => [...Array(6)].map((_, i) => [cx + Math.cos((i + 0.5) * Math.PI / 3) * r, cy + Math.sin((i + 0.5) * Math.PI / 3) * r]);

function ballBody(R) {
  const s = new Sculpt(pal, R);
  const hull = ell(0, 0, 0, 7.5);
  s.add(hull, BL.W);
  s.paint(and(hull, box(-9, -1.0, -9, 9, -0.5, 9)), BL.W2); // equator seam
  s.paint(and(hull, fn([-9, 4.6, -9], [9, 5.2, 9], (x, y, z) => Math.hypot(x, z) > 3.6)), BL.W2); // ring round the top hatch
  s.paint(and(hull, box(-0.25, -8, -9, 0.25, 8, -2)), BL.W2); // spine seam down the back
  // viewport: a hexagonal frame standing proud, green glass set into it
  const vy = -1.4;
  const frame = and(prism('z', hexagon(0, vy, 3.9), 0, 9), ell(0, 0, 0, 8.2));
  s.add(frame, BL.O);
  s.cut(and(prism('z', hexagon(0, vy, 2.8), 0, 9), sub(ell(0, 0, 0, 8.4), ell(0, 0, 0, 7.6))));
  s.add(and(prism('z', hexagon(0, vy, 2.8), 0, 9), ell(0, 0, 0, 7.6)), BL.G, { glow: 0.9, jitter: 0.02 });
  s.paint(and(frame, fn([-5, -6, 0], [5, 3, 9], (x, y) => y < vy - 2.4)), BL.O2);
  // a Federation badge and a sensor lamp either side of the viewport
  s.paint(and(hull, box(3.8, 2.4, 3, 5.4, 3.4, 9)), BL.RD);
  s.paint(and(hull, box(4.35, 2.4, 3, 4.85, 3.4, 9)), BL.W);
  s.add(cyl('z', -4.6, 2.8, 0.45, 5.4, 6.2), 0xffd070, { glow: 1.6, jitter: 0 });
  // grab handles on the brow
  s.add(both(box(1.6, 5.2, 4.6, 2.2, 5.7, 5.8)), BL.K);
  // arm sockets low on the front sides
  s.add(both(rot(cyl('x', -2.6, 2.6, 1.5, 5.4, 7.6), [0, -0.5, 0], [6.5, -2.6, 2.6])), BL.W3);
  // underneath: a thruster block, two landing thrusters in it
  s.add(rbox(-3.6, -8.6, -4.2, 3.6, -5.6, 2.6, 0.8), BL.W2);
  s.paint(box(-3.7, -8.7, -4.3, 3.7, -8.1, 2.7), BL.W3);
  s.add(both(cyl('y', 2.8, -2.6, 0.9, -8.2, -9.0, 1.2)), BL.K2);
  // back: two thruster bells and a hatch
  s.add(both(cyl('z', 3.0, -3.8, 1.1, -8.3, -6.6)), BL.K);
  s.add(both(cyl('z', 3.0, -3.8, 1.2, -9.3, -8.2, 1.5)), BL.K2);
  s.add(rbox(-2, 0.5, -7.9, 2, 3.8, -6.6, 0.4), BL.W2);
  return s.model;
}

// The 180mm cannon, barrel up from its turret (pivot at the turret's base).
function ballCannon(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('y', 0, 0, 2.6, -0.6, 0.8), BL.K); // turret ring
  s.add(rbox(-1.8, 0.6, -2.4, 1.8, 5.2, 1.6, 0.4), BL.K2); // breech housing
  s.add(rbox(-1.3, 1.2, -4.2, 1.3, 4.4, -2.2, 0.3), BL.K); // magazine box behind it
  s.paint(box(-1.9, 2.4, -2.5, 1.9, 2.8, 1.7), BL.K3);
  s.add(box(-2.4, 3.0, -0.8, -1.8, 4.6, 1.0), BL.K3); // sight on the left
  s.add(cyl('y', 0, 0, 0.75, 5.2, 15.0), BL.K3); // barrel
  s.add(cyl('y', 0, 0, 0.95, 9.2, 9.8), BL.K);
  s.add(cyl('y', 0, 0, 1.05, 14.0, 15.6), BL.K); // muzzle
  s.cut(cyl('y', 0, 0, 0.45, 14.6, 15.7));
  return s.model;
}

// Arm segments: grey tubes with dark joint rings.
function ballUpperArm(R) {
  const s = new Sculpt(pal, R);
  s.add(ell(0, 0, 0, 1.2), BL.K);
  s.add(cyl('y', 0, 0, 0.8, -0.6, -4.6), BL.W2);
  s.add(cyl('y', 0, 0, 0.95, -2.2, -3.0), BL.K2);
  return s.model;
}
function ballForeArm(R) {
  const s = new Sculpt(pal, R);
  s.add(ell(0, 0, 0, 1.05), BL.K2); // elbow
  s.add(cyl('y', 0, 0, 0.7, -0.6, -4.2), BL.W);
  s.add(cyl('y', 0, 0, 0.9, -3.4, -4.3), BL.W3);
  return s.model;
}
// Three-fingered claw, open toward the front: two fingers and a thumb.
function ballClaw(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-1, -1.2, -0.9, 1, 0.4, 0.9, 0.3), BL.K);
  for (const x of [-0.6, 0.6]) {
    s.add(rot(box(x - 0.3, -3.6, 0.2, x + 0.3, -1, 0.8), [-0.35, 0, 0], [x, -1, 0.5]), BL.W3);
    s.add(rot(box(x - 0.3, -4.4, 1.2, x + 0.3, -3.2, 1.8), [0.5, 0, 0], [x, -3.4, 1.5]), BL.K2);
  }
  s.add(rot(box(-0.3, -3.2, -0.8, 0.3, -1, -0.2), [0.4, 0, 0], [0, -1, -0.5]), BL.W3);
  return s.model;
}

export function ballDef(R = BALL_R) {
  const uR = ballUpperArm(R), fR = ballForeArm(R), claw = ballClaw(R);
  return rigDef(R, SCALE, 10.5, {
    hips: { parent: null, pivot: [0, 0, 0], model: null },
    torso: { parent: 'hips', pivot: [0, 0, 0], model: ballBody(R) },
    head: { parent: 'torso', pivot: [0, 7, -0.6], model: ballCannon(R) },
    uArmR: { parent: 'torso', pivot: [-7.8, -2.6, 2.4], model: uR },
    fArmR: { parent: 'uArmR', pivot: [0, -4.8, 0], model: fR },
    hand: { parent: 'fArmR', pivot: [0, -4.4, 0], model: claw },
    uArmL: { parent: 'torso', pivot: [7.8, -2.6, 2.4], model: uR.clone().flipX() },
    fArmL: { parent: 'uArmL', pivot: [0, -4.8, 0], model: fR.clone().flipX() },
    handL: { parent: 'fArmL', pivot: [0, -4.4, 0], model: claw.clone().flipX() },
  });
}
