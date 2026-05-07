# Design: Mobile Locate Button + Panel Header Hide

**Date:** 2026-05-06
**Status:** Approved

---

## Problem

1. The existing geolocation button (`LocateControl`) is a Leaflet map control positioned `bottomright`. On mobile, the bottom panel covers it at all times — whether expanded (60vh) or collapsed (120px). Pilots at the field have no way to center the map on their location without scrolling to find the hidden control.

2. When the panel is expanded on mobile, the `panel-body` shows a redundant `<header>` ("FPV Range Estimator / RF Link Budget Calculator") that duplicates content already visible in the `panel-header`. This wastes vertical space that could go to the controls.

---

## Goals

1. Add a locate button to the `panel-header` (always visible on mobile) that centers the map and sets the ground station to the user's GPS position.
2. Hide the `panel-body` header on mobile so the expanded panel shows only controls.
3. Desktop behavior unchanged.

---

## Out of Scope

- Replacing the existing `LocateControl` on desktop
- Automatic location on page load
- Watching position (continuous tracking)

---

## Change 1 — Mobile Locate Button

### HTML

Add a `<button class="mobile-locate-btn" id="mobileLocateBtn">` as a sibling of `panel-toggle-btn` inside `.panel-header`. It must be a sibling — not nested inside the toggle button — to keep valid HTML (no interactive content inside interactive content).

The panel-header needs `position: relative` to anchor the absolute-positioned locate button.

```html
<div class="panel-header">
  <button class="panel-toggle-btn" id="panelToggle" ...>
    <span class="handle-pill" aria-hidden="true"></span>
    <span class="panel-peek-title">FPV Range Estimator</span>
    <div class="peek-row">...</div>
  </button>
  <button class="mobile-locate-btn" id="mobileLocateBtn"
          aria-label="Center on my location">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
    </svg>
  </button>
</div>
```

Visual layout on mobile:
```
[ ——— pill ——— ]
FPV Range Estimator                [⊕]
[ Video x | Control x | Limiting x ]
```

### JS — Extract `locateUser(btnEl)`

The geolocation logic currently lives inline inside `LocateControl`'s click handler. Extract it to a standalone `locateUser(btnEl)` function so both the Leaflet desktop control and the new mobile button can call it.

```
locateUser(btnEl):
  if !navigator.geolocation:
    btnEl.classList.add('locate-error')
    setTimeout(remove 'locate-error', 1500)
    return

  btnEl.classList.add('locating')
  navigator.geolocation.getCurrentPosition(
    success: (pos) =>
      btnEl.classList.remove('locating')
      btnEl.classList.add('locate-success')
      setTimeout(remove 'locate-success', 1500)
      latlng = L.latLng(pos.coords.latitude, pos.coords.longitude)
      map.setView(latlng, 14)
      state.groundStation = latlng
      if !groundMarker:
        groundMarker = L.circleMarker(latlng, {...}).addTo(map)
        els.mapHint.classList.add('hidden')
        els.mapHint.setAttribute('aria-hidden', 'true')
      else:
        groundMarker.setLatLng(latlng)
      recalculate()
      fitMapToCircles()
    error: () =>
      btnEl.classList.remove('locating')
      btnEl.classList.add('locate-error')
      setTimeout(remove 'locate-error', 1500)
    options: { enableHighAccuracy: true, timeout: 10000 }
  )
```

`LocateControl` click handler calls `locateUser(btn)`.

New `initMobileLocate()` function:
```
initMobileLocate():
  btn = document.getElementById('mobileLocateBtn')
  btn.addEventListener('click', () => locateUser(btn))
```

Called from `DOMContentLoaded` after `initMap()`.

### CSS

Inside `@media (max-width: 768px)`:

```css
.panel-header {
  position: relative;  /* added — anchors mobile-locate-btn */
}

.mobile-locate-btn {
  position: absolute;
  right: 16px;
  top: 34px;           /* vertically aligned with peek title text */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mobile-locate-btn:hover,
.mobile-locate-btn:focus-visible {
  color: var(--accent);
  border-color: var(--accent);
}

.mobile-locate-btn.locating {
  color: var(--accent);
  animation: spin 1s linear infinite;
}

.mobile-locate-btn.locate-success {
  color: #34d399;
  border-color: #34d399;
}

.mobile-locate-btn.locate-error {
  color: #f87171;
  border-color: #f87171;
}
```

The `spin` keyframe already exists in `styles.css`. The `mobile-locate-btn` is hidden on desktop because `.panel-header { display: none }` applies at desktop widths.

---

## Change 2 — Hide Panel Body Header on Mobile

Single CSS rule inside `@media (max-width: 768px)`:

```css
.panel-body header {
  display: none;
}
```

Applies in both collapsed (where panel-body is faded out anyway) and expanded states. On desktop the rule doesn't exist, so the desktop header is untouched.

---

## Files

| File | Changes |
|------|---------|
| `index.html` | Add `position: relative` to panel-header div; add `<button class="mobile-locate-btn" id="mobileLocateBtn">` as sibling inside panel-header |
| `js/app.js` | Extract `locateUser(btnEl)` function; refactor `LocateControl` to call it; add `initMobileLocate()` function; call from `DOMContentLoaded` |
| `styles.css` | Add `position: relative` to `.panel-header` inside mobile media query; add `.mobile-locate-btn` and state rules; add `.panel-body header { display: none }` |

---

## Acceptance Criteria

- [ ] Mobile: locate button visible in panel-header at all times (collapsed and expanded)
- [ ] Tapping locate button centers the map on GPS position and sets ground station
- [ ] Loading spinner while geolocation pending; green flash on success; red flash on error
- [ ] Locate button does not trigger panel toggle when tapped
- [ ] Mobile expanded: panel-body header ("FPV Range Estimator" / "RF Link Budget Calculator") is hidden
- [ ] Desktop: locate button invisible (panel-header hidden); existing LocateControl unchanged; panel-body header visible
