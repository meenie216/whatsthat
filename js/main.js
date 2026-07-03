import { startCamera, requestOrientationPermission, startOrientation, startGeolocation } from "./sensors.js";
import { loadPois, nearby, poiCount } from "./data.js";
import { cameraBasis, basisToHPR } from "./orientation.js";
import { project } from "./projection.js";
import { enuVector } from "./geo.js";
import { Overlay, metaLine } from "./overlay.js";

const $ = (id) => document.getElementById(id);

// Population slider steps map to thresholds.
const POP_STEPS = [0, 1000, 5000, 15000, 50000, 100000, 500000];

const state = {
  observer: null,          // { lat, lon, alt, accuracy }
  orient: { alpha: 0, beta: 90, gamma: 0, source: "–" },
  working: [],             // nearby POIs with bearing/dist/elevation
  rangeKm: 150,
  minPop: 0,
  firstHit: false,
  calibration: 0,          // manual heading offset (deg)
  fov: 63,
  screenDeg: 0,
  dirty: true,             // recompute working set on next frame
};

const overlay = new Overlay($("overlay"));

function status(msg) {
  const el = $("status");
  el.textContent = msg;
  el.classList.toggle("show", !!msg);
  if (msg) setTimeout(() => el.classList.remove("show"), 4000);
}

// ---- Sensor callbacks -----------------------------------------------------

function onOrientation(o) {
  state.orient = o;
  state.orientEvents = (state.orientEvents || 0) + 1;
}

function onPosition(p) {
  const first = !state.observer;
  state.observer = p;
  state.dirty = true;
  $("dbgPos").textContent = `${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}`;
  $("dbgAcc").textContent = `${Math.round(p.accuracy)} m`;
  if (first) status(`Located you (±${Math.round(p.accuracy)} m)`);
}

// ---- Render loop ----------------------------------------------------------

function recomputeWorking() {
  if (!state.observer) return;
  state.working = nearby(state.observer, state.rangeKm, state.minPop);
  state.dirty = false;
}

function frame() {
  requestAnimationFrame(frame);
  if (!state.observer) return;
  if (state.dirty) recomputeWorking();

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Apply manual calibration to alpha (rotates heading).
  const o = { ...state.orient, alpha: (state.orient.alpha || 0) + state.calibration };
  const basis = cameraBasis(o, state.screenDeg);

  const visible = [];
  for (const entry of state.working) {
    const dir = enuVector(entry.bearing, entry.elevation);
    const pr = project(dir, basis, w, h, state.fov);
    if (!pr.ok) continue;
    if (pr.x < -80 || pr.x > w + 80 || pr.y < -80 || pr.y > h + 80) continue;
    visible.push({ entry, pr });
  }

  // Nearest-to-centre first, so labels closest to the reticle win z-order/highlight.
  visible.sort((a, b) => a.pr.offAxisDeg - b.pr.offAxisDeg);

  let items = visible;
  if (state.firstHit && visible.length) items = [visible[0]];
  else items = visible.slice(0, 40); // cap DOM churn

  overlay.render(
    items.map((v, i) => ({
      label: v.entry.poi.n,
      meta: metaLine(v.entry),
      kind: v.entry.poi.k,
      x: v.pr.x,
      y: v.pr.y,
      near: i === 0 && v.pr.offAxisDeg < 4,
    }))
  );

  // Debug HUD
  const hpr = basisToHPR(basis);
  $("dbgHeading").textContent = `${hpr.heading.toFixed(0)}°`;
  $("dbgPitch").textContent = `${hpr.pitch.toFixed(0)}°`;
  $("dbgRoll").textContent = `${hpr.roll.toFixed(0)}°`;
  $("dbgCount").textContent = String(visible.length);
  $("dbgSource").textContent = state.orient.source;

  const v = $("camera");
  $("dbgCam").textContent = state.camError
    ? state.camError
    : v.videoWidth
    ? `${v.videoWidth}×${v.videoHeight}`
    : "no frame yet";
  $("dbgEvents").textContent = String(state.orientEvents || 0);
}

// ---- Controls -------------------------------------------------------------

function wireControls() {
  $("rangeSlider").addEventListener("input", (e) => {
    state.rangeKm = +e.target.value;
    $("rangeOut").textContent = state.rangeKm;
    state.dirty = true;
  });
  $("popSlider").addEventListener("input", (e) => {
    state.minPop = POP_STEPS[+e.target.value];
    $("popOut").textContent = state.minPop.toLocaleString();
    state.dirty = true;
  });
  $("firstHit").addEventListener("change", (e) => (state.firstHit = e.target.checked));
  $("calSlider").addEventListener("input", (e) => {
    state.calibration = +e.target.value;
    $("calOut").textContent = state.calibration;
  });
  $("fovSlider").addEventListener("input", (e) => {
    state.fov = +e.target.value;
    $("fovOut").textContent = state.fov;
  });
  $("menuBtn").addEventListener("click", () => {
    const d = $("debug");
    d.hidden = !d.hidden;
  });

  const updateScreen = () => {
    state.screenDeg = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  };
  window.addEventListener("orientationchange", updateScreen);
  updateScreen();
}

// ---- Boot -----------------------------------------------------------------

async function start() {
  $("startBtn").disabled = true;
  $("debug").hidden = false; // show diagnostics while we get this working

  // iOS requires DeviceOrientationEvent.requestPermission() to run while the tap's
  // user activation is still live. Awaiting the camera prompt first consumes that
  // activation and the motion request silently fails — so request motion FIRST.
  try {
    await requestOrientationPermission();
  } catch (e) {
    status("Motion access denied — compass won't work");
  }
  startOrientation(onOrientation);

  try {
    state.cam = await startCamera($("camera"));
  } catch (e) {
    state.camError = `${e.name}: ${e.message}`;
    status("Camera failed: " + state.camError);
  }

  startGeolocation(onPosition, (err) => status("Location: " + err.message));

  try {
    const n = await loadPois();
    status(`Loaded ${n.toLocaleString()} places`);
  } catch (e) {
    status("Data load failed: " + e.message);
  }

  $("gate").hidden = true;
  $("controls").hidden = false;
  wireControls();
  requestAnimationFrame(frame);
}

$("startBtn").addEventListener("click", start);

// Register service worker for offline / installability (optional, ignore failure).
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
