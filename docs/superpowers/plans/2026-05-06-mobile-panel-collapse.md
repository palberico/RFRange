# Mobile Panel Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the default unit imperial, and add a collapsible bottom-sheet panel on mobile so pilots can expose the full map after configuring their hardware.

**Architecture:** A new `panel-header` div (mobile-only, always visible) holds a full-width toggle button containing a handle pill, title, and compact peek readouts. The existing content is wrapped in `panel-body`. CSS `height` transition on `.ui-panel` drives the collapse animation. JS reads/writes `fpv_panel_state` in localStorage and handles touch drag.

**Tech Stack:** Vanilla HTML/CSS/JS, no build step, no test framework — verification is browser-based.

---

## File Map

| File | Changes |
|------|---------|
| `js/app.js` | Line 6: `'metric'` → `'imperial'`; add 3 peek IDs to `els`; add peek updates in `recalculate()`; add `initPanelToggle()` with localStorage, click, and drag; call it from `DOMContentLoaded` |
| `index.html` | Restructure `<main class="ui-panel">`: add `<div class="panel-header">` before existing content; wrap `<header>` + `.scrollable-content` + `<footer>` in `<div class="panel-body" id="panelBody">` |
| `styles.css` | Add desktop defaults for `.panel-header` / `.panel-body`; expand `@media (max-width: 768px)` block with handle, peek row, toggle button, height transition, and collapsed state |

---

## Task 1: Imperial default

**Files:**
- Modify: `js/app.js:6`

- [ ] **Step 1: Change the units default**

In `js/app.js`, line 6, change:
```javascript
  units: 'metric',
```
to:
```javascript
  units: 'imperial',
```

- [ ] **Step 2: Verify in browser**

Open `index.html` in a browser. The units toggle should show **Imperial** selected on load. The range readouts should show miles/feet immediately (e.g. `1.91 mi` for the default Walksnail GT Pro + stock antennas + 10 dB fade margin). No other behavior should change.

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: default to imperial units"
```

---

## Task 2: DOM restructure — add panel-header and panel-body

**Files:**
- Modify: `index.html:21-119` (the entire `<main class="ui-panel">` block)

- [ ] **Step 1: Replace the `<main class="ui-panel">` block**

Replace everything from `<main class="ui-panel">` through `</main>` with:

```html
  <!-- Glassmorphic UI Panel -->
  <main class="ui-panel">

    <!-- Mobile-only: always visible handle + compact results peek -->
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
      <header>
        <h1>FPV Range Estimator</h1>
        <p class="subtitle">RF Link Budget Calculator</p>
      </header>

      <div class="scrollable-content">
        <section class="controls-section video-section">
          <h2>Video Link</h2>
          <div class="input-group">
            <label for="videoPreset">Hardware</label>
            <select id="videoPreset"></select>
          </div>
          <div class="input-group">
            <label for="videoAirAntenna">Air Antenna</label>
            <select id="videoAirAntenna"></select>
          </div>
          <div class="input-group">
            <label for="videoAntenna">Ground Antenna</label>
            <select id="videoAntenna"></select>
          </div>
        </section>

        <section class="controls-section control-section">
          <h2>Control Link</h2>
          <div class="input-group">
            <label for="controlPreset">Hardware</label>
            <select id="controlPreset"></select>
          </div>
          <div class="input-group">
            <label for="controlAirAntenna">Air Antenna</label>
            <select id="controlAirAntenna"></select>
          </div>
          <div class="input-group">
            <label for="controlAntenna">Ground Antenna</label>
            <select id="controlAntenna"></select>
          </div>
        </section>

        <section class="controls-section global-section">
          <h2>Environment</h2>
          <div class="input-group slider-group">
            <div class="label-row">
              <div class="label-info-group">
                <label for="fadeMargin">Fade Margin</label>
                <button class="info-btn" id="fadeMarginInfoBtn" aria-label="What is fade margin?" aria-expanded="false" aria-controls="fadeMarginTooltip">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <circle cx="7" cy="7" r="6.25" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M7 6.5v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="7" cy="4" r="0.75" fill="currentColor"/>
                  </svg>
                </button>
                <div class="info-tooltip" id="fadeMarginTooltip" role="tooltip" aria-hidden="true">
                  <p class="tooltip-title">Fade Margin</p>
                  <p>A dB safety buffer subtracted from the link budget before computing range. It accounts for degradation the free-space model can't predict.</p>
                  <ul>
                    <li><strong>Raise it</strong> when flying near trees, buildings, or RF interference — or any time reliable link matters more than maximum distance.</li>
                    <li><strong>Lower it</strong> only in open, interference-free conditions to approach the theoretical ceiling.</li>
                  </ul>
                  <p class="tooltip-note">10 dB is a common starting point. Long-range explorers often use 15–20 dB; open-field racers may use 6 dB.</p>
                </div>
              </div>
              <span id="fadeMarginValue" class="value-badge">10 dB</span>
            </div>
            <input type="range" id="fadeMargin" min="0" max="30" value="10" step="1">
            <small class="hint">Higher margin = more conservative estimate</small>
          </div>

          <div class="toggle-group">
            <label>Units</label>
            <div class="toggle">
              <input type="checkbox" id="unitsToggle" class="toggle-checkbox">
              <label for="unitsToggle" class="toggle-label">
                <span class="metric">Metric</span>
                <span class="imperial">Imperial</span>
              </label>
            </div>
          </div>
        </section>

        <section class="results-section">
          <div class="result-card video-result">
            <div class="result-label">Video Max Range</div>
            <div class="result-value" id="videoRangeDisplay">--</div>
          </div>
          <div class="result-card control-result">
            <div class="result-label">Control Max Range</div>
            <div class="result-value" id="controlRangeDisplay">--</div>
          </div>
          <div class="limiting-factor" id="limitingFactorDisplay">
            Limiting Factor: <span class="highlight">--</span>
          </div>
        </section>
      </div>

      <footer>
        <p class="disclaimer">Estimates are theoretical free-space calculations. Real-world range is reduced by terrain, foliage, interference, and antenna patterns.</p>
      </footer>
    </div>

  </main>
```

- [ ] **Step 2: Verify desktop layout unchanged**

Open `index.html` at a desktop viewport width (>768px). The panel must look exactly as before: title at top, controls scrollable in the middle, result cards at the bottom. The `panel-header` div is in the DOM but has no visual presence yet (no CSS for it). No layout regressions.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "refactor: wrap panel content in panel-header / panel-body structure"
```

---

## Task 3: Desktop CSS — panel-header hidden, panel-body flex structure

**Files:**
- Modify: `styles.css` — add before the `@media (max-width: 768px)` block

- [ ] **Step 1: Add panel structure styles**

In `styles.css`, find the comment `/* Responsive */` that precedes the `@media` block. Insert the following immediately before it:

```css
/* Panel structure */
.panel-header {
  display: none; /* shown only on mobile via media query */
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0; /* allows flex child to shrink for scrollable-content to work */
}
```

- [ ] **Step 2: Verify desktop layout**

Reload at desktop width. The panel must look identical to before Task 2: title, controls, results. `panel-header` remains invisible. Scrolling inside the panel must still work. The `scrollable-content` area should scroll when content overflows.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add desktop panel-header/panel-body layout foundation"
```

---

## Task 4: Mobile CSS — panel-header reveal and peek row styles

**Files:**
- Modify: `styles.css` — inside `@media (max-width: 768px)` block

- [ ] **Step 1: Add mobile panel-header styles**

Inside the `@media (max-width: 768px)` block, after the existing `.map-hint { top: 20px; }` rule, add:

```css
  /* Panel header: mobile reveal */
  .panel-header {
    display: flex;
    flex-shrink: 0;
  }

  /* Full-width tap + drag target */
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
    touch-action: none;
  }

  .panel-toggle-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
    border-radius: 24px 24px 0 0;
  }

  /* Visual drag handle pill */
  .handle-pill {
    width: 36px;
    height: 4px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
    flex-shrink: 0;
  }

  .panel-peek-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-main);
  }

  /* Peek results row */
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

  .video-peek  { color: var(--video-color); }
  .control-peek { color: var(--control-color); }

  .peek-divider {
    width: 1px;
    height: 28px;
    background: rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }
```

- [ ] **Step 2: Verify mobile panel header appearance**

Open DevTools, set viewport to 390×844 (iPhone 14). The panel should now show at the bottom with:
- A centered horizontal pill at the very top
- "FPV Range Estimator" text below it
- Three stat columns (Video / Control / Limiting) each with a label and `--` placeholder value
- Total visible height roughly 120px
- No `.collapsed` class yet — the panel is expanded, showing all controls below the header

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: mobile panel-header and peek row styles"
```

---

## Task 5: Mobile CSS — collapsible height transition

**Files:**
- Modify: `styles.css` — inside `@media (max-width: 768px)` block

- [ ] **Step 1: Add height transition and collapsed state**

Still inside `@media (max-width: 768px)`, update the existing `.ui-panel` rule to add a transition, then add the `.collapsed` and `panel-body` rules:

Find the existing mobile `.ui-panel` rule:
```css
  .ui-panel {
    top: auto;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 60vh;
    border-radius: 24px 24px 0 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
  }
```

Replace it with:
```css
  .ui-panel {
    top: auto;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 60vh;
    border-radius: 24px 24px 0 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    transition: height 250ms ease-out;
  }

  .ui-panel.collapsed {
    height: 120px;
  }

  .panel-body {
    transition: opacity 200ms ease-out;
  }

  .ui-panel.collapsed .panel-body {
    opacity: 0;
    pointer-events: none;
  }
```

- [ ] **Step 2: Manually test the transition**

In DevTools console at mobile viewport, run:
```javascript
document.querySelector('.ui-panel').classList.add('collapsed');
```
The panel should animate down to 120px over ~250ms, fading out the controls. Then:
```javascript
document.querySelector('.ui-panel').classList.remove('collapsed');
```
The panel should animate back to 60vh with controls fading in. The peek header (handle + title + stats) must remain visible throughout both states.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: mobile panel height transition and collapsed state"
```

---

## Task 6: JS — peek DOM refs and recalculate() updates

**Files:**
- Modify: `js/app.js:22-38` (the `els` object)
- Modify: `js/app.js:226-238` (the readout update section inside `recalculate()`)

- [ ] **Step 1: Add peek element refs to `els`**

In `js/app.js`, find the closing brace of the `els` object (after `fadeMarginTooltip`). Add three entries before the closing `};`:

```javascript
const els = {
  videoPreset: document.getElementById('videoPreset'),
  videoAirAntenna: document.getElementById('videoAirAntenna'),
  videoAntenna: document.getElementById('videoAntenna'),
  controlPreset: document.getElementById('controlPreset'),
  controlAirAntenna: document.getElementById('controlAirAntenna'),
  controlAntenna: document.getElementById('controlAntenna'),
  fadeMargin: document.getElementById('fadeMargin'),
  fadeMarginValue: document.getElementById('fadeMarginValue'),
  unitsToggle: document.getElementById('unitsToggle'),
  videoRangeDisplay: document.getElementById('videoRangeDisplay'),
  controlRangeDisplay: document.getElementById('controlRangeDisplay'),
  limitingFactorDisplay: document.getElementById('limitingFactorDisplay'),
  mapHint: document.getElementById('map-hint'),
  fadeMarginInfoBtn: document.getElementById('fadeMarginInfoBtn'),
  fadeMarginTooltip: document.getElementById('fadeMarginTooltip'),
  videoRangePeek: document.getElementById('videoRangePeek'),
  controlRangePeek: document.getElementById('controlRangePeek'),
  limitingPeek: document.getElementById('limitingPeek'),
};
```

- [ ] **Step 2: Update recalculate() to populate peek values**

In `recalculate()`, find the `// Determine Limiting Factor` block (currently lines ~233–238). After the `if/else` block that updates `els.limitingFactorDisplay`, add:

```javascript
  // Update mobile peek readouts
  const isVideoLimiting = videoRangeMeters < controlRangeMeters;
  els.videoRangePeek.textContent = `${vFormatted.value} ${vFormatted.unit}`;
  els.controlRangePeek.textContent = `${cFormatted.value} ${cFormatted.unit}`;
  els.limitingPeek.textContent = isVideoLimiting ? 'Video' : 'Control';
  els.limitingPeek.style.color = isVideoLimiting ? 'var(--video-color)' : 'var(--control-color)';
```

The resulting block looks like:

```javascript
  // Determine Limiting Factor
  if (videoRangeMeters < controlRangeMeters) {
    els.limitingFactorDisplay.innerHTML = `Limiting Factor: <span class="highlight" style="color: var(--video-color)">Video Link</span>`;
  } else {
    els.limitingFactorDisplay.innerHTML = `Limiting Factor: <span class="highlight" style="color: var(--control-color)">Control Link</span>`;
  }

  // Update mobile peek readouts
  const isVideoLimiting = videoRangeMeters < controlRangeMeters;
  els.videoRangePeek.textContent = `${vFormatted.value} ${vFormatted.unit}`;
  els.controlRangePeek.textContent = `${cFormatted.value} ${cFormatted.unit}`;
  els.limitingPeek.textContent = isVideoLimiting ? 'Video' : 'Control';
  els.limitingPeek.style.color = isVideoLimiting ? 'var(--video-color)' : 'var(--control-color)';
```

- [ ] **Step 3: Verify peek values populate**

Open at mobile viewport. The three peek stats should show real values immediately on load (e.g. `1.91 mi` / `29.28 mi` / `Video` in cyan). Change any dropdown — the peek values should update instantly. Change to metric — peek values should show km/m.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: wire peek readouts to recalculate"
```

---

## Task 7: JS — initPanelToggle() with localStorage and click handler

**Files:**
- Modify: `js/app.js` — add `initPanelToggle()` function and call it from bootstrap

- [ ] **Step 1: Add the constant and function**

In `js/app.js`, add after the `initFadeMarginTooltip()` function (after line 65) and before `populateDropdown()`:

```javascript
const PANEL_STATE_KEY = 'fpv_panel_state';

function initPanelToggle() {
  const panel = document.querySelector('.ui-panel');
  const btn = document.getElementById('panelToggle');

  function applyState(collapsed) {
    panel.classList.toggle('collapsed', collapsed);
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    localStorage.setItem(PANEL_STATE_KEY, collapsed ? 'collapsed' : 'expanded');
  }

  // Default to collapsed on first visit; restore saved state otherwise
  const saved = localStorage.getItem(PANEL_STATE_KEY) ?? 'collapsed';
  applyState(saved === 'collapsed');

  btn.addEventListener('click', () => {
    applyState(!panel.classList.contains('collapsed'));
  });
}
```

- [ ] **Step 2: Call initPanelToggle() from DOMContentLoaded**

Find the bootstrap block at the bottom of `js/app.js`:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initMap();
  initFadeMarginTooltip();
  recalculate();
});
```

Replace with:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initMap();
  initFadeMarginTooltip();
  initPanelToggle();
  recalculate();
});
```

- [ ] **Step 3: Verify toggle and persistence**

Open at mobile viewport. The panel should start **collapsed** (120px, peek visible, controls hidden). Tap the handle area — the panel should expand to 60vh with a smooth 250ms animation. Tap again — collapses. Reload the page — state is restored (if you left it expanded, it opens expanded; if collapsed, it opens collapsed). Open DevTools → Application → Local Storage and confirm `fpv_panel_state` is being written.

Clear localStorage (`localStorage.removeItem('fpv_panel_state')`), reload — panel defaults to collapsed.

- [ ] **Step 4: Verify desktop is unaffected**

Resize to desktop width (>768px). The panel should behave exactly as before: full height, no toggle button visible, no collapsed class applied. The `panelToggle` button exists in the DOM but `panel-header { display: none }` keeps it invisible.

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat: collapsible panel with localStorage state persistence"
```

---

## Task 8: JS — drag-to-toggle (stretch goal)

**Files:**
- Modify: `js/app.js` — extend `initPanelToggle()` with touch handlers

- [ ] **Step 1: Add drag state variables and touch handlers inside initPanelToggle()**

Inside `initPanelToggle()`, after the `btn.addEventListener('click', ...)` line, add:

```javascript
  // Drag-to-toggle: follow the finger, snap to expanded/collapsed at 50px threshold
  let dragStartY = null;
  let dragStartHeight = null;

  btn.addEventListener('touchstart', (e) => {
    dragStartY = e.touches[0].clientY;
    dragStartHeight = panel.offsetHeight;
    panel.style.transition = 'none'; // follow finger without lag
  }, { passive: true });

  btn.addEventListener('touchmove', (e) => {
    if (dragStartY === null) return;
    const delta = dragStartY - e.touches[0].clientY; // positive = dragged up
    const expandedH = Math.round(window.innerHeight * 0.6);
    const collapsedH = 120;
    const newH = Math.max(collapsedH, Math.min(expandedH, dragStartHeight + delta));
    panel.style.height = newH + 'px';
  }, { passive: true });

  btn.addEventListener('touchend', (e) => {
    if (dragStartY === null) return;
    const delta = dragStartY - e.changedTouches[0].clientY;
    const wasCollapsed = panel.classList.contains('collapsed');
    dragStartY = null;
    dragStartHeight = null;
    requestAnimationFrame(() => {
      panel.style.height = '';      // clear inline, let CSS class take over
      panel.style.transition = '';  // restore CSS transition for snap animation
      if (delta > 50) {
        applyState(false);          // dragged up → expand
      } else if (delta < -50) {
        applyState(true);           // dragged down → collapse
      } else {
        applyState(wasCollapsed);   // short drag → snap back to previous state
      }
    });
  }, { passive: true });
```

The complete `initPanelToggle()` function after this task:

```javascript
function initPanelToggle() {
  const panel = document.querySelector('.ui-panel');
  const btn = document.getElementById('panelToggle');

  function applyState(collapsed) {
    panel.classList.toggle('collapsed', collapsed);
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    localStorage.setItem(PANEL_STATE_KEY, collapsed ? 'collapsed' : 'expanded');
  }

  const saved = localStorage.getItem(PANEL_STATE_KEY) ?? 'collapsed';
  applyState(saved === 'collapsed');

  btn.addEventListener('click', () => {
    applyState(!panel.classList.contains('collapsed'));
  });

  let dragStartY = null;
  let dragStartHeight = null;

  btn.addEventListener('touchstart', (e) => {
    dragStartY = e.touches[0].clientY;
    dragStartHeight = panel.offsetHeight;
    panel.style.transition = 'none';
  }, { passive: true });

  btn.addEventListener('touchmove', (e) => {
    if (dragStartY === null) return;
    const delta = dragStartY - e.touches[0].clientY;
    const expandedH = Math.round(window.innerHeight * 0.6);
    const collapsedH = 120;
    const newH = Math.max(collapsedH, Math.min(expandedH, dragStartHeight + delta));
    panel.style.height = newH + 'px';
  }, { passive: true });

  btn.addEventListener('touchend', (e) => {
    if (dragStartY === null) return;
    const delta = dragStartY - e.changedTouches[0].clientY;
    const wasCollapsed = panel.classList.contains('collapsed');
    dragStartY = null;
    dragStartHeight = null;
    requestAnimationFrame(() => {
      panel.style.height = '';
      panel.style.transition = '';
      if (delta > 50) {
        applyState(false);
      } else if (delta < -50) {
        applyState(true);
      } else {
        applyState(wasCollapsed);
      }
    });
  }, { passive: true });
}
```

- [ ] **Step 2: Verify drag on a real device or DevTools touch simulation**

In Chrome DevTools, enable touch simulation (device toolbar). On the handle area:
- Drag upward more than 50px from a collapsed state → panel should expand and snap
- Drag downward more than 50px from an expanded state → panel should collapse and snap
- Drag less than 50px in either direction → panel should snap back to its pre-drag state
- During the drag, the panel height should follow the finger in real time (no 250ms lag)
- After releasing, the snap animation should play smoothly (~250ms)

- [ ] **Step 3: Final acceptance check**

At mobile viewport, run through all acceptance criteria:
- [ ] Starts collapsed on first load (clear localStorage, reload)
- [ ] Tap toggles between collapsed and expanded
- [ ] Transition is smooth ~250ms
- [ ] Peek readouts show real values (video, control, limiting) in both states
- [ ] Limiting peek color: cyan when video is limiting, purple when control is limiting
- [ ] When expanded, all dropdowns/slider/toggle work; scrolling inside the panel works
- [ ] State persists on reload
- [ ] At desktop width (>768px): panel looks identical to pre-feature, no panel-header visible

- [ ] **Step 4: Final commit**

```bash
git add js/app.js
git commit -m "feat: drag-to-toggle bottom sheet on mobile"
```
