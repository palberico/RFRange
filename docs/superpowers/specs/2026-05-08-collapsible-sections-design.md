# Collapsible Panel Sections — Design Spec

**Date:** 2026-05-08
**Status:** Approved

## Overview

Add accordion-style collapse/expand to the five labeled sections inside the UI panel. Clicking a section header toggles its content. State persists in localStorage. All sections start collapsed.

## Sections in Scope

| Section | `data-section` key |
|---|---|
| Profiles | `profiles` |
| Video Link | `video` |
| Control Link | `control` |
| Recent Locations | `locations` |
| Environment | `environment` |

The Results section (Video Max Range / Control Max Range / Limiting Factor) is **not** collapsible.

## HTML Changes

Each of the five `<section class="controls-section">` elements gets:

1. A `data-section="<key>"` attribute on the `<section>` tag.
2. The `<h2>` text wrapped in a `<button class="section-toggle">` with `aria-expanded="false"` and a chevron SVG on the right.
3. All content after the `<h2>` moved into a new `<div class="section-body">`.
4. `collapsed` class added to the `<section>` by default (overridden by JS on load when localStorage says expanded).

```html
<section class="controls-section collapsed" data-section="profiles">
  <h2>
    <button class="section-toggle" aria-expanded="false">
      Profiles
      <svg class="chevron" ...>...</svg>
    </button>
  </h2>
  <div class="section-body">
    <!-- existing section content -->
  </div>
</section>
```

## CSS Changes

Three rule groups added to `styles.css`:

**Section body animation:**
```css
.section-body {
  max-height: 600px;
  overflow: hidden;
  transition: max-height 0.25s ease;
}
.controls-section.collapsed .section-body {
  max-height: 0;
}
```

**Toggle button styling** — full-width, left-aligned, inherits `h2` appearance, cursor pointer, chevron on the far right via flexbox.

**Chevron rotation:**
```css
.section-toggle .chevron {
  transition: transform 0.25s ease;
}
.controls-section.collapsed .section-toggle .chevron {
  transform: rotate(-90deg);
}
```

## JS Changes (`app.js`)

One new constant and one new function, called at the bottom of `DOMContentLoaded`.

**Constant:**
```js
var SECTION_STATE_KEY = 'fpv_section_states';
```

**`initCollapsibleSections()`:**
1. Read saved state from localStorage (JSON object keyed by `data-section` value, `true` = collapsed). Default: all collapsed.
2. For each `<section>` with a `data-section` attribute:
   - Apply/remove `collapsed` class based on saved state (default collapsed if no saved entry).
   - Set `aria-expanded` on the toggle button accordingly.
   - Wire a `click` listener on the `.section-toggle` button that:
     - Toggles the `collapsed` class on the section.
     - Flips `aria-expanded`.
     - Saves the updated states object back to localStorage.

## Behavior Details

- **Default state:** All five sections collapsed on first visit (no localStorage entry).
- **Persistence:** Each toggle writes the full states object to localStorage immediately.
- **Animation:** `max-height` transition — 0.25s ease. Fast enough to feel snappy, slow enough to read as intentional.
- **No impact on recalculate():** Collapsing a section hides its inputs visually but does not change `state` — values already set remain in effect.

## Files Changed

| File | Change |
|---|---|
| `index.html` | Wrap h2 text in button, add section-body divs, add data-section attrs, add collapsed class |
| `styles.css` | Section body transition, toggle button styles, chevron rotation |
| `js/app.js` | `SECTION_STATE_KEY` constant, `initCollapsibleSections()` function |
