# Design: URL State Sharing

**Date:** 2026-05-07
**Status:** Approved

---

## Problem

Every visit to the app starts from the same default configuration. Sharing a setup with someone — e.g. "here's why I'm only getting 3 km with my Walksnail" — requires describing each dropdown choice in text. There's no way to hand someone a link that opens the app in a specific state.

---

## Goals

1. Encode the full app configuration (hardware presets, antennas, fade margin, units, ground station, map zoom) into the URL hash so it can be shared.
2. Restore state from the URL hash on page load, overriding defaults.
3. Keep shared URLs short by omitting fields that equal their default values.
4. Provide a one-tap share button: native share sheet on mobile, clipboard copy on desktop.

---

## Out of Scope

- Server-side link shortening
- QR code generation
- Sharing individual calculation results as images

---

## Changes

### Task 1 — `js/urlState.js` (new module)

Two pure functions with no DOM or Leaflet dependencies:

**`encodeStateToHash(state)`**

Iterates over a `FIELD_TO_KEY` map and writes `key=value` pairs for any field that differs from `DEFAULTS`. Units are encoded as single characters (`m`/`i`). Ground station lat/lng are rounded to 4 decimal places (~11 m). All values pass through `encodeURIComponent`. Returns a string (no leading `#`).

Short key table:

| State field        | URL key |
|--------------------|---------|
| `videoPreset`      | `v`     |
| `videoAirAntenna`  | `va`    |
| `videoAntenna`     | `ga`    |
| `controlPreset`    | `c`     |
| `controlAirAntenna`| `ca`    |
| `controlAntenna`   | `cga`   |
| `fadeMargin`       | `fm`    |
| `units`            | `u`     |
| `groundStation.lat`| `lat`   |
| `groundStation.lng`| `lng`   |
| `zoom`             | `z`     |

**`decodeHashToState(hash)`**

Splits on `&`, decodes each `key=value` pair, and maps short keys back to field names. `units` expands from `m`/`i` to `metric`/`imperial`. `fadeMargin` is parsed as an integer. Preset/antenna keys are returned as-is — unknown keys pass through so callers can detect missing references. `groundStation` is reconstructed as a plain `{lat, lng}` object (callers convert to `L.latLng`). Returns `{}` on empty or malformed input.

**`DEFAULTS` constant** — single source of truth for omission logic. Changing a default here won't re-encode existing links; it just changes which new URLs omit the field.

### Task 2 — Hash read/write in `js/app.js`

- `applyStateToUI()` — reads state and sets all dropdowns, slider, toggle, and map state.
- On load (after `initUI()`): merge URL hash over defaults, call `applyStateToUI()`. If hash contains `lat`/`lng`, place the ground marker and hide the hint chip.
- `updateHash()` — calls `history.replaceState` with the freshly encoded hash after every `recalculate()` call. Uses `replaceState` (not `pushState`) to avoid polluting browser history.
- Zero-hash case unchanged — app behaves exactly as today.

### Task 3 — Share button

**HTML:** `<button id="shareBtn">` added as sibling of the `<h1>` in `<header>` (desktop), and as a sibling of `#mobileLocateBtn` in `.panel-header` (mobile). Both use the same inline SVG share icon.

**JS:** `handleShare()` tries `navigator.share` first (mobile native sheet), falls back to `navigator.clipboard.writeText`, shows a toast on success/failure.

**`showToast(message, options)`:** Fixed-position chip (top-center), fades in then fades out after ~2 s. Reuses the `.glass-chip` visual style from `#map-hint`.

### Task 4 — Custom hardware mode

See separate design doc: `2026-05-07-custom-hardware-design.md`.

### Task 5 — Graceful fallback for missing presets

If `applyStateToUI()` encounters a preset key that isn't in `videoPresets` / `controlPresets` / antenna objects:
- Fall back to the default for that field.
- Show a toast: "Some hardware in this link isn't available — using defaults."
- Update `state` to the fallback so the URL self-corrects on the next change.

---

## Acceptance Criteria

- [ ] URL bar updates in real time as the user changes any control
- [ ] Copying the URL and opening it in an incognito window restores the same configuration
- [ ] Opening the app with no hash behaves exactly as today (no errors)
- [ ] Share button on desktop copies URL to clipboard + shows toast
- [ ] Share button on mobile invokes native share sheet; cancelling falls back to clipboard
- [ ] URL with a missing preset reference loads with defaults and shows toast; URL self-corrects on next interaction
- [ ] Round-trip test page (tests/url-state.test.html) shows all tests passing
