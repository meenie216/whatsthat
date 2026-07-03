// Turns raw DeviceOrientation angles into a camera basis in world (East-North-Up) space.
//
// World frame (W3C deviceorientation): X = East, Y = North, Z = Up.
// Device frame: X = right of screen, Y = top of screen, Z = out of screen toward user.
// The rear camera looks along the device's -Z axis.

import { D2R, R2D } from "./geo.js";

// Rotation matrix (device -> world) from intrinsic Z-X'-Y'' (alpha, beta, gamma).
// Returns a flat row-major 9-element array.
function rotationMatrix(alpha, beta, gamma) {
  const a = (alpha || 0) * D2R;
  const b = (beta || 0) * D2R;
  const g = (gamma || 0) * D2R;

  const cA = Math.cos(a), sA = Math.sin(a);
  const cB = Math.cos(b), sB = Math.sin(b);
  const cG = Math.cos(g), sG = Math.sin(g);

  return [
    cA * cG - sA * sB * sG,  -sA * cB,  cA * sG + sA * sB * cG,
    sA * cG + cA * sB * sG,   cA * cB,  sA * sG - cA * sB * cG,
    -cB * sG,                 sB,       cB * cG,
  ];
}

function mulVec(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

// Rotate a device-frame vector about the device Z axis by the screen orientation
// angle, so the camera basis follows the viewport when the phone is rotated.
function applyScreen(v, screenDeg) {
  const s = -(screenDeg || 0) * D2R;
  const c = Math.cos(s), sn = Math.sin(s);
  return [c * v[0] - sn * v[1], sn * v[0] + c * v[1], v[2]];
}

// Compute the camera's forward / right / up unit vectors in world (ENU) coords.
//   o          : { alpha, beta, gamma }
//   screenDeg  : screen.orientation.angle (0/90/180/270)
export function cameraBasis(o, screenDeg = 0) {
  const m = rotationMatrix(o.alpha, o.beta, o.gamma);
  const forward = mulVec(m, applyScreen([0, 0, -1], screenDeg)); // rear camera direction
  const right = mulVec(m, applyScreen([1, 0, 0], screenDeg));
  const up = mulVec(m, applyScreen([0, 1, 0], screenDeg));
  return { forward, right, up };
}

// Human-readable heading/pitch/roll from a camera basis, for the debug HUD.
export function basisToHPR(basis) {
  const f = basis.forward;
  const heading = (Math.atan2(f[0], f[1]) * R2D + 360) % 360; // clockwise from north
  const pitch = Math.asin(Math.max(-1, Math.min(1, f[2]))) * R2D;
  const roll = Math.atan2(basis.right[2], basis.up[2]) * R2D;
  return { heading, pitch, roll };
}
