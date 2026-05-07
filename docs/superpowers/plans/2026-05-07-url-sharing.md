# URL Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encode full app state into the URL hash so configurations are shareable. Add a share button that copies the URL or triggers the native share sheet.

**Architecture:** New pure module `js/urlState.js` handles encoding/decoding. `js/app.js` reads the hash on load and writes it after every state change via `history.replaceState`. A share button in the panel header invokes `handleShare()`.

**Tech Stack:** Vanilla JS only, no new dependencies.

---

## File Map

| File | Changes |
|------|---------|
| `js/urlState.js` | New module: `encodeStateToHash`, `decodeHashToState`, `DEFAULTS` |
| `js/app.js` | Add `applyStateToUI()`, `updateHash()`, `handleShare()`, `showToast()`; wire hash read on load; call `updateHash()` after every `recalculate()` |
| `index.html` | Add share button to `<header>` (desktop) and `.panel-header` (mobile); add `<script src="js/urlState.js">` |
| `styles.css` | Share button styles; `.toast` styles |
| `tests/url-state.test.html` | Round-trip test page (new) |

---

## Task 1: `js/urlState.js` — encoding module

- [x] **Step 1: Create `js/urlState.js`** with `DEFAULTS`, `FIELD_TO_KEY`, `KEY_TO_FIELD`, `encodeStateToHash(state)`, and `decodeHashToState(hash)` as documented in the design doc.

- [x] **Step 2: Create `tests/url-state.test.html`** with inline assertions covering:
  - Default state → empty hash
  - `decodeHashToState` on empty/null/`#` → `{}`
  - Units `metric` ↔ `u=m` round-trip
  - `fadeMargin` non-default ↔ `fm=15` round-trip
  - Default `fadeMargin` omitted
  - Non-default `videoPreset` round-trip
  - `groundStation` lat/lng rounded to 4 dp and round-tripping
  - Non-default `zoom` round-trip; default zoom omitted
  - Leading `#` stripped cleanly
  - Malformed hash → `{}`
  - Unknown preset key passes through as-is
  - Full round-trip with all fields non-default
  - `custom:` prefix passes through untouched

- [ ] **Step 3: Verify** — open `tests/url-state.test.html` in a browser; all tests pass.

---

## Task 2: Hash read on load + hash write on change

**Files:** `js/app.js`, `index.html`

- [ ] **Step 1: Add `applyStateToUI()` to `js/app.js`**

  After `populateDropdown` calls in `initUI()` but as a standalone function, reads `state` and syncs all UI elements:
  ```javascript
  function applyStateToUI() {
    els.videoPreset.value       = state.videoPreset;
    els.videoAirAntenna.value   = state.videoAirAntenna;
    els.videoAntenna.value      = state.videoAntenna;
    els.controlPreset.value     = state.controlPreset;
    els.controlAirAntenna.value = state.controlAirAntenna;
    els.controlAntenna.value    = state.controlAntenna;
    els.fadeMargin.value        = state.fadeMargin;
    els.fadeMarginValue.textContent = state.fadeMargin + ' dB';
    els.unitsToggle.checked     = state.units === 'imperial';
  }
  ```

- [ ] **Step 2: Add `updateHash()` to `js/app.js`**

  ```javascript
  function updateHash() {
    history.replaceState(null, '', '#' + encodeStateToHash(state));
  }
  ```

- [ ] **Step 3: Wire hash read in the bootstrap**

  In `DOMContentLoaded`, after `initUI()` runs but before `recalculate()`:
  ```javascript
  if (window.location.hash) {
    var decoded = decodeHashToState(window.location.hash);
    // Merge decoded state — missing preset fallback handled in Task 5
    Object.assign(state, decoded);
    // Restore ground station if present
    if (decoded.groundStation) {
      var latlng = L.latLng(decoded.groundStation.lat, decoded.groundStation.lng);
      state.groundStation = latlng;
      groundMarker = L.circleMarker(latlng, {
        radius: 6, color: '#fff', weight: 2,
        fillColor: '#3b82f6', fillOpacity: 1
      }).addTo(map);
      els.mapHint.classList.add('hidden');
      els.mapHint.setAttribute('aria-hidden', 'true');
      map.setView(latlng, decoded.zoom || 14);
    }
    applyStateToUI();
  }
  ```

- [ ] **Step 4: Call `updateHash()` after every `recalculate()`**

  At the end of `recalculate()`, add `updateHash()`.

- [ ] **Step 5: Add `<script src="js/urlState.js">` to `index.html`**

  Load it before `js/app.js`.

- [ ] **Step 6: Verify**
  - Change a dropdown → URL bar updates in real time
  - Copy URL, open in incognito → same state loads
  - Open app with no hash → no errors, behaves as today

---

## Task 3: Share button

**Files:** `index.html`, `js/app.js`, `styles.css`

- [ ] **Step 1: Add share button HTML to `index.html`**

  In `<header>` (desktop): add `<button id="shareBtn" ...>` as a flex sibling of `<h1>`.
  In `.panel-header` (mobile): add `<button id="mobileShareBtn" ...>` before `#mobileLocateBtn`.

- [ ] **Step 2: Add `showToast(message, options)` to `js/app.js`**

  Creates a `.toast.glass-chip` element, appends to body, removes after 2.5 s (CSS transition handles fade).

- [ ] **Step 3: Add `handleShare()` to `js/app.js`**

  Tries `navigator.share`, falls back to `navigator.clipboard.writeText`, shows toast on result.

- [ ] **Step 4: Wire both share buttons** in `initUI()` to call `handleShare()`.

- [ ] **Step 5: Add CSS for share button and toast** in `styles.css`.

- [ ] **Step 6: Verify**
  - Desktop: click share → toast appears, URL in clipboard
  - Mobile: tap share → native share sheet; cancel → clipboard fallback

---

## Task 4: Custom hardware mode

See implementation plan `2026-05-07-custom-hardware.md`.

---

## Task 5: Graceful fallback for missing presets

**Files:** `js/app.js`

- [ ] **Step 1: Add `validateAndFixState()` to `js/app.js`**

  Called after merging hash/stored state, before `applyStateToUI()`. Checks each preset key against its lookup object; replaces unknown keys with the corresponding `DEFAULTS` value. Tracks if any fallback was applied.

- [ ] **Step 2: Show fallback toast if any key was replaced**

  `showToast('Some hardware in this link isn\'t available — using defaults.')`.

- [ ] **Step 3: Verify**

  Manually edit URL hash to `#v=fake_preset_xyz`, reload → app loads with defaults, toast shown, URL self-corrects on next interaction.
