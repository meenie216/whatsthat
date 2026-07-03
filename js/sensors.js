// Camera, geolocation and device-orientation plumbing, including the iOS 13+
// permission prompts that must be triggered from a user gesture.

export async function startCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

// iOS requires an explicit permission request for motion/orientation.
export async function requestOrientationPermission() {
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === "function") {
    const res = await D.requestPermission();
    if (res !== "granted") throw new Error("Motion access denied");
  }
}

// Streams orientation. cb receives { alpha, beta, gamma, source }.
// Prefers absolute orientation; falls back to iOS webkitCompassHeading.
export function startOrientation(cb) {
  let source = "relative";

  function handle(e) {
    let alpha = e.alpha;

    if (typeof e.webkitCompassHeading === "number") {
      // iOS: compass heading is clockwise from true north for the top of the
      // device. Convert to the W3C alpha convention (counter-clockwise).
      alpha = 360 - e.webkitCompassHeading;
      source = "ios-compass";
    } else if (e.absolute === true) {
      source = "absolute";
    }

    cb({ alpha, beta: e.beta, gamma: e.gamma, source });
  }

  // deviceorientationabsolute is more reliable on Android where available.
  if ("ondeviceorientationabsolute" in window) {
    window.addEventListener("deviceorientationabsolute", handle, true);
    source = "absolute";
  } else {
    window.addEventListener("deviceorientation", handle, true);
  }

  return () => {
    window.removeEventListener("deviceorientationabsolute", handle, true);
    window.removeEventListener("deviceorientation", handle, true);
  };
}

// Streams GPS. cb receives { lat, lon, alt, accuracy }.
export function startGeolocation(cb, onError) {
  if (!("geolocation" in navigator)) {
    onError?.(new Error("Geolocation unavailable"));
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      const c = pos.coords;
      cb({
        lat: c.latitude,
        lon: c.longitude,
        alt: c.altitude ?? 0,
        accuracy: c.accuracy,
      });
    },
    (err) => onError?.(err),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}
