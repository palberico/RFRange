# Mobile Locate Button + Panel Header Hide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locate button to the mobile panel-header that centers the map on the user's GPS position, and hide the redundant title header inside the expanded panel on mobile.

**Architecture:** Extract the existing geolocation logic from `LocateControl` into a shared `locateUser(btnEl)` function. A new `<button id="mobileLocateBtn">` is added as a sibling (not child) of the toggle button inside `panel-header`, positioned absolutely at the right edge. A single CSS rule hides the `panel-body` `<header>` on mobile. Desktop layout and the existing Leaflet `LocateControl` are untouched.

**Tech Stack:** Vanilla HTML/CSS/JS, no build step, Leaflet 1.9.4 (for `LocateControl` only).

---

## File Map

| File | Changes |
|------|---------|
| `index.html` | Add `<button class="mobile-locate-btn" id="mobileLocateBtn">` after the toggle button, inside `.panel-header` |
| `styles.css` | Add `position: relative` to mobile `.panel-header` rule; add `.mobile-locate-btn` and state styles; add `.panel-body header { display: none }` — all inside `@media (max-width: 768px)` |
| `js/app.js` | Extract `locateUser(btnEl)` before `initMap()`; simplify `LocateControl` click handler to call it; add `initMobileLocate()`; call from `DOMContentLoaded` |

---

## Task 1: HTML — add mobile locate button

**Files:**
- Modify: `index.html:47-48`

- [ ] **Step 1: Add the button between the toggle button and the panel-header closing tag**

In `index.html`, find this section (currently around lines 47–48):
```html
      </button>
    </div>
```
That `</button>` closes the `panel-toggle-btn`. The `</div>` closes `panel-header`. Insert the locate button between them:

```html
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

- [ ] **Step 2: Verify**

Read `index.html` and confirm:
- `<button class="mobile-locate-btn" id="mobileLocateBtn">` exists inside `.panel-header`
- It is a sibling of `panel-toggle-btn`, not nested inside it
- It contains the SVG crosshair icon with `aria-hidden="true"`
- It has `aria-label="Center on my location"`
- Nothing else in the file changed

---

## Task 2: CSS — locate button styles + hide panel-body header

**Files:**
- Modify: `styles.css` — three additions inside `@media (max-width: 768px)`

- [ ] **Step 1: Add `position: relative` to the mobile `.panel-header` rule**

Inside `@media (max-width: 768px)`, find the existing `.panel-header` rule:
```css
  .panel-header {
    display: flex;
    flex-shrink: 0;
  }
```

Replace it with:
```css
  .panel-header {
    display: flex;
    flex-shrink: 0;
    position: relative;
  }
```

- [ ] **Step 2: Add locate button styles + header hide inside the media query**

Still inside `@media (max-width: 768px)`, find the `.peek-divider` rule (the last rule before the closing `}`):
```css
  .peek-divider {
    width: 1px;
    height: 28px;
    background: rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }
}
```

Replace the closing `}` of the media query with the new rules appended before it:
```css
  .peek-divider {
    width: 1px;
    height: 28px;
    background: rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }

  /* Mobile locate button — positioned over the peek title row */
  .mobile-locate-btn {
    position: absolute;
    right: 16px;
    top: 13px;
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
    outline: none;
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

  /* Hide redundant title when panel is expanded on mobile */
  .panel-body header {
    display: none;
  }
}
```

Note: `top: 13px` places the 34px button with its center at ~30px from the top of `panel-header`, vertically aligned with the `panel-peek-title` text. The `spin` keyframe is already defined in `styles.css`.

- [ ] **Step 3: Verify**

Read the `@media (max-width: 768px)` block and confirm:
- `.panel-header` now includes `position: relative`
- `.mobile-locate-btn` rule is present with `position: absolute; right: 16px; top: 13px`
- All four state rules exist: `.mobile-locate-btn.locating`, `.locate-success`, `.locate-error`, and the `:hover/:focus-visible` rule
- `.panel-body header { display: none }` is present inside the media query
- The media query closes correctly with `}`
- No rules outside the media query were changed

---

## Task 3: JS — extract `locateUser()`, add `initMobileLocate()`

**Files:**
- Modify: `js/app.js` — three changes

- [ ] **Step 1: Add the `locateUser(btnEl)` function before `initMap()`**

In `js/app.js`, find the line `function initMap() {` (currently around line 182). Insert the following immediately before it:

```javascript
function locateUser(btnEl) {
  if (!navigator.geolocation) {
    btnEl.classList.add('locate-error');
    setTimeout(() => btnEl.classList.remove('locate-error'), 1500);
    return;
  }
  btnEl.classList.add('locating');
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      btnEl.classList.remove('locating');
      btnEl.classList.add('locate-success');
      setTimeout(() => btnEl.classList.remove('locate-success'), 1500);

      const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
      map.setView(latlng, 14);

      state.groundStation = latlng;
      if (!groundMarker) {
        groundMarker = L.circleMarker(latlng, {
          radius: 6, color: '#fff', weight: 2,
          fillColor: '#3b82f6', fillOpacity: 1
        }).addTo(map);
        els.mapHint.classList.add('hidden');
        els.mapHint.setAttribute('aria-hidden', 'true');
      } else {
        groundMarker.setLatLng(latlng);
      }
      recalculate();
      fitMapToCircles();
    },
    function () {
      btnEl.classList.remove('locating');
      btnEl.classList.add('locate-error');
      setTimeout(() => btnEl.classList.remove('locate-error'), 1500);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

```

- [ ] **Step 2: Simplify the `LocateControl` click handler to call `locateUser`**

Inside `initMap()`, find the `L.DomEvent.on(btn, 'click', ...)` block. It currently spans ~18 lines of inline geolocation logic. Replace the entire block with:

```javascript
      L.DomEvent.on(btn, 'click', function (e) {
        L.DomEvent.preventDefault(e);
        locateUser(btn);
      });
```

The full `onAdd` function after the change:

```javascript
    onAdd: function () {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control locate-control');
      const btn = L.DomUtil.create('a', 'locate-btn', container);
      btn.href = '#';
      btn.title = 'Center on my location';
      btn.setAttribute('role', 'button');
      btn.setAttribute('aria-label', 'Center on my location');
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`;

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(btn, 'click', function (e) {
        L.DomEvent.preventDefault(e);
        locateUser(btn);
      });

      return container;
    }
```

- [ ] **Step 3: Add `initMobileLocate()` and call it from bootstrap**

Find the `// Bootstrap` comment and the `DOMContentLoaded` block at the bottom of the file. Add `initMobileLocate` before it, and add the call inside the bootstrap:

```javascript
function initMobileLocate() {
  const btn = document.getElementById('mobileLocateBtn');
  btn.addEventListener('click', () => locateUser(btn));
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initMap();
  initFadeMarginTooltip();
  initPanelToggle();
  initMobileLocate();
  recalculate();
});
```

- [ ] **Step 4: Verify**

Read `js/app.js` and confirm:
- `locateUser(btnEl)` is defined before `initMap()` and contains the full geolocation logic
- `LocateControl`'s `onAdd` click handler now calls only `locateUser(btn)` — no inline geolocation code remains
- `initMobileLocate()` exists, gets `mobileLocateBtn` by ID, adds a click listener that calls `locateUser(btn)`
- `initMobileLocate()` is called in the `DOMContentLoaded` handler between `initPanelToggle()` and `recalculate()`
- No duplicate geolocation logic anywhere in the file
