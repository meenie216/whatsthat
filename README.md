# WhatsThat

Point your phone at the horizon and it labels what's out there — cities, towns,
landmarks and peaks — drawn where they actually are, over the live camera feed.

No computer vision involved: it's pure geometry. The phone knows **where you are**
(GPS) and **which way it's pointing** (compass + tilt), so for every place in its
database it computes the bearing, distance and elevation angle from you, and
projects a label onto the screen where that direction lands.

## How it works

```
GPS ─┐
     ├─► for each POI: bearing + distance + elevation angle (curvature-corrected)
DB ──┘                         │
                               ▼
compass/tilt ─► camera basis (ENU) ─► project direction ─► screen x,y ─► label
```

- `js/geo.js` — haversine distance, great-circle bearing, elevation angle, ENU vectors
- `js/orientation.js` — DeviceOrientation → camera basis in world coords
- `js/projection.js` — world direction → screen pixel via a pinhole model
- `js/sensors.js` — camera / geolocation / orientation plumbing (incl. iOS perms)
- `js/data.js` — loads POIs, filters by range + population
- `js/overlay.js` — pooled AR label DOM nodes
- `js/main.js` — wiring + render loop + controls

## Running it on your phone

Camera, geolocation and (on iOS) motion sensors **require HTTPS**. Pick one:

**Quick tunnel from your laptop**
```bash
python3 -m http.server 8080        # or: npx serve .
cloudflared tunnel --url http://localhost:8080   # gives an https URL
```
Open the https URL on your phone → **Start**. On iOS use Safari; accept the
motion/orientation and location prompts. Add to Home Screen for fullscreen.

**Static hosting** — it's just static files, so GitHub Pages / Cloudflare Pages /
Netlify all work with zero config.

> Plain `http://<lan-ip>` will **not** grant sensor access on iOS — you need real HTTPS.

## Controls

- **Range** — max distance of places to show (5–500 km)
- **Min population** — hide small places
- **Nearest hit only** — show just the single place closest to the centre reticle
- **⚙** — debug HUD with live heading/pitch/roll + two calibration sliders:
  - **Calibrate heading** — nudge the compass offset if labels sit left/right of target
  - **Camera FOV** — match your phone's actual field of view so spacing is correct

## Real data

The app ships with a small `data/pois.sample.json` to prove the pipeline. For the
full worldwide set, build from GeoNames (runs in Docker, no local Python):

```bash
scripts/build_data.sh              # cities ≥5000 pop
scripts/build_data.sh cities1000   # denser
scripts/build_data.sh cities5000 peaks   # + mountains/peaks (large download)
```

Then point `loadPois()` in `js/main.js` at `data/pois.json`.

## Known rough edges (need on-device tuning)

- **Compass accuracy** varies a lot by device and needs figure-8 calibration; the
  heading-offset slider is there to correct a constant bias.
- iOS `webkitCompassHeading` vs Android `deviceorientationabsolute` are handled
  differently in `sensors.js`; verify the debug **heading** reads true north when
  you point north.
- Screen-orientation handling assumes portrait; landscape is applied but untested.
- Icons referenced by the manifest (`icons/icon-192.png`, `-512.png`) aren't
  included yet — add them for a proper installed icon.
```
