# Design: Custom Hardware Mode

**Date:** 2026-05-07
**Status:** Approved

---

## Problem

The preset dropdowns only cover common off-the-shelf hardware. Users with prototype boards, modified firmware, unusual antennas, or hardware that isn't in the list have no way to use the calculator.

---

## Goals

1. Let users enter raw RF parameters (TX power, frequency, RX sensitivity, antenna gain) for any hardware.
2. Round-trip custom values through the URL hash so they can be shared.
3. Validate inputs so invalid numbers don't produce nonsensical results.

---

## Out of Scope

- Saving custom hardware as a named preset (that's Sprint 2 Profiles)
- Supporting more than one custom configuration at a time per link

---

## Changes

### Six custom forms — one per dropdown

Each of the six dropdowns (video preset, video air antenna, video ground antenna, control preset, control air antenna, control ground antenna) gets a **"Custom…"** option appended at the end.

Selecting it reveals an inline form directly below the dropdown with a **200ms max-height + opacity transition**.

**Preset dropdowns** (video hardware, control hardware) show three fields:
- TX Power (dBm) — valid range 0–40
- Frequency (MHz) — valid range 100–6000
- RX Sensitivity (dBm) — valid range −150–0

**Antenna dropdowns** show one field:
- Gain (dBi) — valid range −10–30

### State model

Custom values are stored in six new state fields, one per dropdown:

```
customVideoPreset:       { txPowerDbm, frequencyHz, rxSensitivityDbm } | null
customVideoAirAntenna:   { gainDbi } | null
customVideoAntenna:      { gainDbi } | null
customControlPreset:     { txPowerDbm, frequencyHz, rxSensitivityDbm } | null
customControlAirAntenna: { gainDbi } | null
customControlAntenna:    { gainDbi } | null
```

The main preset/antenna fields (`state.videoPreset` etc.) hold the string `'custom'` when a custom form is active. `recalculate()` checks for `=== 'custom'` and uses the corresponding custom object.

If `'custom'` is selected but the form is incomplete, `recalculate()` returns early without updating the display.

### URL encoding

`buildHashState()` in `app.js` inlines custom values before calling `encodeStateToHash()`:

| State | Encoded as |
|-------|-----------|
| `videoPreset: 'custom'`, `customVideoPreset: {28.5, 5.8GHz, -95}` | `v=custom%3A28.5%2C5800%2C-95` |
| `videoAirAntenna: 'custom'`, `customVideoAirAntenna: {3.5}` | `va=custom%3A3.5` |

Format: `custom:<value1>[,<value2>,<value3>]`  
Preset: `custom:<txPowerDbm>,<frequencyMhz>,<rxSensitivityDbm>`  
Antenna: `custom:<gainDbi>`

On decode, `expandCustomFromHash()` in `app.js` splits `custom:...` strings back into structured state objects before the hash is merged into state.

### Validation

All three `validateCustomInput()` calls run even if an earlier one fails (bitwise `&` instead of `&&`), so all error messages appear simultaneously. Invalid inputs show a `.field-error` span beneath the input. Calculation is blocked until all fields are valid.

### Visual style

The inline form uses the same dark glass `.custom-input` styling as the existing `select` elements — same background, border, padding, border-radius. Error state adds a red border (`.custom-input.invalid`). The form slides in with `max-height` + `opacity` transition (~200ms).

---

## Files

| File | Changes |
|------|---------|
| `js/app.js` | New: `initCustomForms`, `createCustomForm`, `readCustomPresetForm`, `readCustomAntennaForm`, `populateCustomPresetForm`, `populateCustomAntennaForm`, `syncCustomForm`, `syncAllCustomForms`, `validateCustomInput`, `buildHashState` (custom inlining), `expandCustomFromHash`; modified: `recalculate`, `initUI`, `applyStateToUI`, bootstrap |
| `styles.css` | New: `.custom-form`, `.custom-form.visible`, `.custom-input`, `.custom-input.invalid`, `.field-error`, `.field-error.visible` |

---

## Acceptance Criteria

- [ ] Selecting "Custom…" reveals the form with a smooth transition
- [ ] Calculation uses the entered values; display updates in real time
- [ ] Invalid input shows an error and blocks recalculation
- [ ] Custom values round-trip through the URL (`v=custom:28.5,5800,-95`)
- [ ] Loading a custom URL populates and shows the form correctly
- [ ] Switching back from Custom to a preset hides the form and recalculates with the preset
