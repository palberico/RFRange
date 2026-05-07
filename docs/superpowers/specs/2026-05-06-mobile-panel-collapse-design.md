# Design: Imperial Default + Collapsible Mobile Panel

**Date:** 2026-05-06
**Status:** Approved

---

## Problem

On mobile (≤768px), the control panel is pinned at 60vh and always visible. FPV pilots use this app at the field: they configure hardware once, then need to read range circles on the map. The current layout sacrifices most of the map viewport to controls the pilot isn't actively using.

---

## Goals

1. Change the default unit system to imperial (target audience is primarily US-based FPV pilots).
2. On mobile only, make the panel a collapsible bottom sheet. Collapsed state exposes the full map. Expanded state restores the current 60vh control view.
3. Desktop layout must not change at all.

---

## Out of Scope

- Changing desktop layout in any way
- Persisting the units preference to localStorage
- Adding new controls or content

---

## Part 1 — Imperial Default

**Change:** `js/app.js` state object: `units: 'imperial'`

The `initUI()` function already sets `els.unitsToggle.checked = state.units === 'imperial'`, so the toggle will reflect the new default on load automatically.

---

## Part 2 — DOM Restructure

`<main class="ui-panel">` is restructured to have two direct children:

```html
<main class="ui-panel">

  <!-- Mobile-only: always visible, never scrolls -->
  <div class="panel-header">
    <button class="panel-toggle-btn" id="panelToggle"
            aria-expanded="false"
            aria-controls="panelBody"
            aria-label="Toggle controls panel">
      <span class="handle-pill" aria-hidden="true"></span>
      <span class="panel-peek-title">FPV Range Estimator</span>
      <div class="peek-row">
        <div class="peek-stat">
          <span class="peek-label">Video</span>
          <span class="peek-value video-peek" id="videoRangePeek">--</span>
        </div>
        <div class="peek-divider" aria-hidden="true"></div>
        <div class="peek-stat">
          <span class="peek-label">Control</span>
          <span class="peek-value control-peek" id="controlRangePeek">--</span>
        </div>
        <div class="peek-divider" aria-hidden="true"></div>
        <div class="peek-stat">
          <span class="peek-label">Limiting</span>
          <span class="peek-value" id="limitingPeek">--</span>
        </div>
      </div>
    </button>
  </div>

  <!-- Full controls: always visible on desktop, collapsible on mobile -->
  <div class="panel-body" id="panelBody">
    <header>...</header>
    <div class="scrollable-content">...</div>  <!-- controls + full result cards -->
    <footer>...</footer>
  </div>

</main>
```

**Key decisions:**
- Peek values use **new IDs** (`videoRangePeek`, `controlRangePeek`, `limitingPeek`). The existing result card IDs (`videoRangeDisplay`, `controlRangeDisplay`, `limitingFactorDisplay`) are unchanged. `recalculate()` updates both sets.
- The full-width `<button>` is the tap target (~120px tall on mobile). The visual pill inside it is `aria-hidden`.
- Limiting peek shows abbreviated text: "Video" or "Control".
- Limiting peek value color: cyan (`var(--video-color)`) when video is limiting, purple (`var(--control-color)`) when control is limiting.
- Video peek value: always cyan. Control peek value: always purple.

---

## Part 3 — CSS

### Desktop (no change)

```css
.panel-header { display: none; }

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
```

`panel-header` is invisible on desktop. `panel-body` replaces the implicit flex behavior the existing children had.

### Mobile (`@media (max-width: 768px)`)

```css
/* Panel sizing and transition */
.ui-panel {
  /* existing positioning preserved */
  height: 60vh;           /* expanded */
  transition: height 250ms ease-out;
}

.ui-panel.collapsed {
  height: 120px;          /* collapsed: just the peek header */
}

/* panel-header: mobile reveal */
.panel-header {
  display: flex;
  flex-shrink: 0;
}

/* Toggle button: full-width tap target */
.panel-toggle-btn {
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px 20px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-main);
  font-family: inherit;
  touch-action: none;     /* allows drag handling without scroll interference */
}

/* Visual handle pill */
.handle-pill {
  width: 36px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

/* Peek title */
.panel-peek-title {
  font-size: 14px;
  font-weight: 600;
}

/* Peek stats row */
.peek-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  justify-content: center;
}

.peek-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.peek-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  font-weight: 600;
}

.peek-value {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.video-peek { color: var(--video-color); }
.control-peek { color: var(--control-color); }

.peek-divider {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

/* panel-body collapse animation */
.panel-body {
  transition: opacity 200ms ease-out;
}

.ui-panel.collapsed .panel-body {
  opacity: 0;
  pointer-events: none;
}
```

The panel's existing `overflow: hidden` clips `panel-body` as the panel height shrinks — no extra tricks needed.

---

## Part 4 — JS: `initPanelToggle()`

New function in `app.js`, called from `DOMContentLoaded`.

```
PANEL_STATE_KEY = 'fpv_panel_state'

On load:
  saved = localStorage.getItem(PANEL_STATE_KEY) ?? 'collapsed'
  if saved === 'collapsed': add .collapsed to panel, set aria-expanded="false"
  else: no .collapsed, aria-expanded="true"

toggle(collapsed):
  panel.classList.toggle('collapsed', collapsed)
  btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
  localStorage.setItem(PANEL_STATE_KEY, collapsed ? 'collapsed' : 'expanded')

button click → toggle(!panel.classList.contains('collapsed'))

Drag (touchstart/touchmove/touchend on button):
  touchstart:
    record startY, startHeight
    panel.style.transition = 'none'   // follow finger without lag

  touchmove:
    delta = startY - touch.clientY    // positive = dragged up
    newH = clamp(startHeight + delta, 120, window.innerHeight * 0.6)
    panel.style.height = newH + 'px'

  touchend:
    delta = startY - changedTouch.clientY
    requestAnimationFrame(() => {
      panel.style.height = ''         // clear inline, let CSS class take over
      panel.style.transition = ''     // restore CSS transition
      if delta > 50: toggle(false)    // expand
      else if delta < -50: toggle(true) // collapse
      // else: snap back to previous class state (no toggle needed)
      reset drag state
    })
```

### `recalculate()` additions

After computing `videoRangeMeters` and `controlRangeMeters`:
```
videoRangePeek.textContent  = `${vFormatted.value} ${vFormatted.unit}`
controlRangePeek.textContent = `${cFormatted.value} ${cFormatted.unit}`
limitingPeek.textContent    = videoRangeMeters < controlRangeMeters ? 'Video' : 'Control'
limitingPeek.style.color    = videoRangeMeters < controlRangeMeters
                                ? 'var(--video-color)'
                                : 'var(--control-color)'
```

---

## Acceptance Criteria

| # | Criterion | Implementation |
|---|-----------|----------------|
| 1 | Default imperial | `state.units = 'imperial'` |
| 2 | Starts collapsed on first mobile load | localStorage default `'collapsed'` |
| 3 | Tap handle toggles | button click → toggle() |
| 4 | Smooth ~250ms transition | `transition: height 250ms ease-out` on `.ui-panel` |
| 5 | Results visible in both states | peek row in `panel-header`; full cards in `panel-body` |
| 6 | Limiting peek color matches link | dynamic `style.color` on `#limitingPeek` |
| 7 | Controls work when expanded | `panel-body` unchanged internally |
| 8 | Scroll inside panel works | tap handler only on `panel-header` button |
| 9 | State persists across reloads | `fpv_panel_state` in localStorage |
| 10 | Desktop unchanged | `panel-header { display: none }` at desktop |
| 11 | Button with aria | `aria-expanded`, `aria-controls`, `aria-label` |
| 12 | Keyboard toggle | native `<button>` handles Enter/Space |
| 13 | Drag-to-toggle | touchstart/move/end with 50px threshold |
