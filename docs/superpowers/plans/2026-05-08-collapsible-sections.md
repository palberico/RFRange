# Collapsible Panel Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add accordion-style collapse/expand to the five labeled sections in the UI panel, with state persisted in localStorage and all sections collapsed by default.

**Architecture:** Each `<section class="controls-section">` gets a clickable `<button class="section-toggle">` inside its `<h2>` and a `<div class="section-body">` wrapping its content. A CSS `max-height` transition animates open/close. A single `initCollapsibleSections()` function in `app.js` reads/writes state to localStorage.

**Tech Stack:** Vanilla JS, CSS transitions, localStorage

---

## File Map

| File | Change |
|---|---|
| `index.html` | Add `data-section` attrs + `collapsed` class to 5 sections; wrap h2 text in `<button class="section-toggle">`; wrap section content in `<div class="section-body">` |
| `styles.css` | Add `.section-toggle` button styles, `.section-body` max-height transition, collapsed override, chevron rotation |
| `js/app.js` | Add `SECTION_STATE_KEY` constant and `initCollapsibleSections()` function; call from `DOMContentLoaded` |

---

## Task 1: HTML — Restructure the five sections

**Files:**
- Modify: `index.html`

Read `index.html` lines 114–201 (the five `<section class="controls-section">` blocks) then apply all five changes below in one edit.

- [ ] **Step 1: Replace the Profiles section**

Find:
```html
        <section class="controls-section">
          <h2>Profiles</h2>
          <div class="input-group">
            <select id="profileSelect"></select>
          </div>
          <div class="profile-buttons">
            <button class="btn btn-secondary" id="saveProfileBtn" disabled>Save As…</button>
            <button class="btn btn-secondary" id="deleteProfileBtn" disabled>Delete</button>
          </div>
        </section>
```

Replace with:
```html
        <section class="controls-section collapsed" data-section="profiles">
          <h2>
            <button class="section-toggle" aria-expanded="false">
              Profiles
              <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </h2>
          <div class="section-body">
            <div class="input-group">
              <select id="profileSelect"></select>
            </div>
            <div class="profile-buttons">
              <button class="btn btn-secondary" id="saveProfileBtn" disabled>Save As…</button>
              <button class="btn btn-secondary" id="deleteProfileBtn" disabled>Delete</button>
            </div>
          </div>
        </section>
```

- [ ] **Step 2: Replace the Video Link section**

Find:
```html
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
```

Replace with:
```html
        <section class="controls-section video-section collapsed" data-section="video">
          <h2>
            <button class="section-toggle" aria-expanded="false">
              Video Link
              <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </h2>
          <div class="section-body">
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
          </div>
        </section>
```

- [ ] **Step 3: Replace the Control Link section**

Find:
```html
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
```

Replace with:
```html
        <section class="controls-section control-section collapsed" data-section="control">
          <h2>
            <button class="section-toggle" aria-expanded="false">
              Control Link
              <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </h2>
          <div class="section-body">
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
          </div>
        </section>
```

- [ ] **Step 4: Replace the Recent Locations section**

Find:
```html
        <section class="controls-section">
          <h2>Recent Locations</h2>
          <div id="recentLocationsList" class="recent-locations-list"></div>
        </section>
```

Replace with:
```html
        <section class="controls-section collapsed" data-section="locations">
          <h2>
            <button class="section-toggle" aria-expanded="false">
              Recent Locations
              <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </h2>
          <div class="section-body">
            <div id="recentLocationsList" class="recent-locations-list"></div>
          </div>
        </section>
```

- [ ] **Step 5: Replace the Environment section**

Find:
```html
        <section class="controls-section global-section">
          <h2>Environment</h2>
```

Replace with:
```html
        <section class="controls-section global-section collapsed" data-section="environment">
          <h2>
            <button class="section-toggle" aria-expanded="false">
              Environment
              <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </h2>
          <div class="section-body">
```

Then find the closing tags of the Environment section:
```html
          </div>
        </section>

        <section class="results-section">
```

Replace with:
```html
          </div>
          </div>
        </section>

        <section class="results-section">
```

- [ ] **Step 6: Verify structure in browser**

Open `index.html` directly in a browser (file:// or local server). All five section headers should be visible. No content should be visible under any header (sections are collapsed by default via the `collapsed` class — CSS isn't wired yet so content will still show, but verify the headers render correctly with no JS errors in the console).

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat: add collapsible section structure to panel"
```

---

## Task 2: CSS — Animate and style the collapsible sections

**Files:**
- Modify: `styles.css`

Add all new rules after the existing `h2` block (after line 215, before `.input-group`).

- [ ] **Step 1: Add section-toggle button styles**

Find this line in `styles.css`:
```css
.input-group {
```

Insert before it:
```css
/* ── Collapsible sections ────────────────────────────────────────────────── */

.section-toggle {
  background: none;
  border: none;
  padding: 0;
  width: 100%;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  font-weight: 600;
  font-family: inherit;
  gap: 8px;
}

.section-toggle:hover {
  color: #e2e8f0;
}

.section-toggle .chevron {
  flex-shrink: 0;
  transition: transform 0.25s ease;
  transform: rotate(-90deg);
}

.controls-section:not(.collapsed) .section-toggle .chevron {
  transform: rotate(0deg);
}

.section-body {
  max-height: 800px;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.controls-section.collapsed .section-body {
  max-height: 0;
}

.controls-section.collapsed h2 {
  margin-bottom: 0;
}

```

- [ ] **Step 2: Verify in browser**

Open the app. All five sections should show their headers only (collapsed). The chevrons should point right (→). Clicking a header does nothing yet (JS not wired). No console errors.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add CSS for collapsible section animation and chevron"
```

---

## Task 3: JS — Wire collapse logic with localStorage persistence

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Add the SECTION_STATE_KEY constant**

Find this line near the top of `app.js`:
```js
const PANEL_STATE_KEY = 'fpv_panel_state';
```

Add directly after it:
```js
var SECTION_STATE_KEY = 'fpv_section_states';
```

- [ ] **Step 2: Add initCollapsibleSections() function**

Find this comment in `app.js`:
```js
// ── Bootstrap ─────────────────────────────────────────────────────────────────
```

Insert the following function immediately before that comment:
```js
// ── Collapsible sections ──────────────────────────────────────────────────────

function initCollapsibleSections() {
  var saved;
  try {
    saved = JSON.parse(localStorage.getItem(SECTION_STATE_KEY)) || {};
  } catch (_) {
    saved = {};
  }

  var sections = document.querySelectorAll('.controls-section[data-section]');
  sections.forEach(function(section) {
    var key = section.getAttribute('data-section');
    var btn = section.querySelector('.section-toggle');
    if (!btn) return;

    // Default: collapsed (true). Only expand if saved state explicitly says false.
    var isCollapsed = saved[key] !== false;
    section.classList.toggle('collapsed', isCollapsed);
    btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');

    btn.addEventListener('click', function() {
      var nowCollapsed = section.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');

      var current;
      try {
        current = JSON.parse(localStorage.getItem(SECTION_STATE_KEY)) || {};
      } catch (_) {
        current = {};
      }
      current[key] = nowCollapsed;
      localStorage.setItem(SECTION_STATE_KEY, JSON.stringify(current));
    });
  });
}

```

- [ ] **Step 3: Call initCollapsibleSections() in DOMContentLoaded**

Find this block near the bottom of `app.js`:
```js
  initDesktopPanelToggle();
  initProfiles();
  initRecentLocations();
  initDataActions();
```

Replace with:
```js
  initDesktopPanelToggle();
  initCollapsibleSections();
  initProfiles();
  initRecentLocations();
  initDataActions();
```

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: wire collapsible section toggle with localStorage persistence"
```

---

## Task 4: Manual Verification

No automated test framework covers DOM interaction + localStorage; verify by hand.

- [ ] **Step 1: Verify default state**

Open the app in a browser with no prior localStorage entry for `fpv_section_states` (use an incognito window or clear storage). All five section headers should be visible; all section bodies should be hidden. Chevrons point right.

- [ ] **Step 2: Verify expand**

Click each section header. The body should animate open (≈0.3s). The chevron should rotate to point down. The `aria-expanded` attribute on the button should flip to `"true"` (inspect via DevTools).

- [ ] **Step 3: Verify collapse**

Click an expanded header again. The body should animate closed. Chevron rotates back to point right. `aria-expanded` back to `"false"`.

- [ ] **Step 4: Verify persistence**

Expand "Video Link" and "Environment". Reload the page (normal reload, not incognito). Those two sections should re-open; the other three should stay collapsed.

- [ ] **Step 5: Verify custom forms still work**

Expand "Video Link". Select "Custom…" from the Hardware dropdown. The custom input form should appear inside the section body as normal. Fill in valid values and confirm the calculation updates.

- [ ] **Step 6: Verify colored dot still shows on Video/Control headers**

The CSS `::before` dot on `.video-section h2` and `.control-section h2` should still render to the left of the button text. If missing, the `h2` flex layout needs `align-items: center` preserved — check that the existing `h2 { display: flex; align-items: center; gap: 8px; }` rule is still intact.
