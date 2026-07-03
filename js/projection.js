// Projects a world-space direction vector onto screen coordinates given the
// camera basis and a pinhole camera model.

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// Returns { x, y, ok, offAxisDeg } in pixels, or ok:false if behind the camera.
//   dir      : unit direction vector to the POI, world (ENU) frame
//   basis    : { forward, right, up } from orientation.cameraBasis
//   w, h     : viewport pixel size
//   hFovDeg  : horizontal field of view of the camera
export function project(dir, basis, w, h, hFovDeg) {
  const f = dot(dir, basis.forward);
  if (f <= 0.01) return { ok: false };

  const r = dot(dir, basis.right);
  const u = dot(dir, basis.up);

  const hFov = (hFovDeg * Math.PI) / 180;
  const tanH = Math.tan(hFov / 2);
  // Keep pixels square: derive vertical FOV from aspect ratio.
  const tanV = tanH * (h / w);

  const ndcX = r / f / tanH; // -1..1 across width
  const ndcY = u / f / tanV; // -1..1 across height

  const x = (0.5 + ndcX / 2) * w;
  const y = (0.5 - ndcY / 2) * h;

  // Angular distance from screen centre (for "nearest to reticle" ranking).
  const offAxisDeg = (Math.acos(Math.max(-1, Math.min(1, f))) * 180) / Math.PI;

  return { ok: true, x, y, offAxisDeg };
}
