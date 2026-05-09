# FPV Link Budget Estimator

A free-space RF range calculator for FPV drone pilots. Select your video and control hardware, drop a ground station pin on the map, and get a range estimate based on the Friis transmission equation.

Live at **[palberico.github.io/RFRange](https://palberico.github.io/RFRange/)**

---

## Features

- **Link budget math** — Friis free-space path loss, configurable fade margin, per-link antenna gain
- **Environment presets** — Open / Suburban / Treed / Urban fade margin defaults
- **Terrain & line-of-sight analysis** — samples 72 bearings from your ground station using real elevation data and draws red wedges where terrain blocks signal at your chosen altitude
- **Shareable URLs** — every configuration encodes into the URL hash for easy sharing
- **Profiles** — save and reload named hardware configurations
- **Recent locations** — remembers up to 5 pinned ground stations

---

## Terrain Analysis

The terrain feature fetches elevation data from the [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api) (free, no key required) and evaluates line-of-sight along 72 radial bearings (every 5°) out to the limiting link's range.

**How it works:**

1. Sample ~30 points along each bearing using non-uniform spacing (denser near the ground station where Fresnel zones are tightest)
2. Fetch terrain elevation for all points in batches
3. For each bearing, check whether the direct path from your antenna to the aircraft clears the terrain by at least 60% of the first Fresnel zone radius, accounting for Earth curvature
4. Blocked bearings are drawn as red wedges on the map

**Limitations to understand:**

- **Resolution** — Open-Meteo uses GLO-30 (30 m horizontal resolution) satellite elevation data. Small hills, embankments, and urban canyons narrower than ~30 m may not be captured
- **No buildings or foliage** — the model is bare-earth terrain only. A dense treeline will block signal that the model shows as clear; add fade margin to compensate
- **30 m sample spacing near origin** — very close obstructions (a barn 50 m away) may fall between sample points
- **Static snapshot** — terrain is computed on demand, not re-run automatically when you change hardware or altitude. Click "Compute Terrain" again after any change
- **Free-space assumption outside wedges** — clear bearings still use the free-space range estimate. Actual range in those directions depends on fade margin and antenna pattern

**When to trust it:**

The analysis is most reliable for open terrain with distinct topographic features (ridges, valleys, hills). It's a useful sanity check that dramatically outperforms "draw a circle and hope." It is not a substitute for a proper RF survey.

---

## Tech stack

Vanilla JS · Leaflet · Open-Meteo Elevation API · GitHub Pages
