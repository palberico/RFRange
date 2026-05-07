# Custom Hardware Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Custom…" to each of the six hardware dropdowns. Selecting it reveals an inline numeric form; the entered values drive the range calculation and round-trip through the URL.

**Architecture:** `initCustomForms()` in `app.js` iterates a config array, appends the option to each select, creates and inserts the form via `createCustomForm()`, and wires listeners. Custom values live in six new `state.custom*` fields. `buildHashState()` inlines them as `custom:...` strings before URL encoding; `expandCustomFromHash()` reverses this on load.

**Tech Stack:** Vanilla JS, no dependencies.

---

## File Map

| File | Changes |
|------|---------|
| `js/app.js` | New functions: `initCustomForms`, `createCustomForm`, `readCustomPresetForm`, `readCustomAntennaForm`, `populateCustomPresetForm`, `populateCustomAntennaForm`, `syncCustomForm`, `syncAllCustomForms`, `validateCustomInput`, `buildHashState`, `expandCustomFromHash`; modified: `recalculate`, `initUI`, `applyStateToUI`, bootstrap |
| `styles.css` | `.custom-form`, `.custom-form.visible`, `.custom-input`, `.custom-input.invalid`, `.field-error`, `.field-error.visible` |

---

## Task 1: JS — custom form infrastructure

- [x] **Step 1: Add six custom state fields** to the `state` object (`customVideoPreset`, `customVideoAirAntenna`, `customVideoAntenna`, `customControlPreset`, `customControlAirAntenna`, `customControlAntenna`, all `null`).

- [x] **Step 2: Add `validateCustomInput(input, min, max)`** — validates a number input, shows/hides `.field-error`, adds/removes `.invalid` class. Returns boolean.

- [x] **Step 3: Add `createCustomForm(formId, fieldDefs)`** — builds a `.custom-form` div with one `.input-group` per field def. Returns the element.

- [x] **Step 4: Add `readCustomPresetForm(formEl)` and `readCustomAntennaForm(formEl)`** — reads and validates form inputs. Uses bitwise `&` to run all validations (show all errors). Returns structured object or `null`.

- [x] **Step 5: Add `populateCustomPresetForm(formEl, customObj)` and `populateCustomAntennaForm(formEl, customObj)`** — fills form inputs from a stored custom state object.

- [x] **Step 6: Add `syncCustomForm(selectEl, formEl)` and `syncAllCustomForms()`** — shows/hides each form based on whether the corresponding select has value `'custom'`.

- [x] **Step 7: Add `initCustomForms()`** — iterates config array, adds "Custom…" option, inserts form, wires change + input listeners. Call from `initUI()`.

---

## Task 2: URL encoding for custom values

- [x] **Step 1: Add `buildHashState()`** — copies state, inlines custom values as `custom:<params>` strings for each active custom field. Used by `updateHash()`.

- [x] **Step 2: Add `expandCustomFromHash(decoded)`** — expands `custom:...` strings in decoded hash back into structured custom state objects. Called before `Object.assign(state, decoded)` in bootstrap.

---

## Task 3: Recalculate + applyStateToUI integration

- [x] **Step 1: Update `recalculate()`** to resolve preset/antenna via `state.*Preset === 'custom' ? state.custom* : lookup[state.*]`. Return early (just call `updateHash()`) if any resolved value is falsy.

- [x] **Step 2: Update `applyStateToUI()`** to populate all six custom forms and call `syncAllCustomForms()`.

---

## Task 4: CSS

- [x] **Step 1: Add styles** for `.custom-form` (collapsed by default with `max-height: 0`), `.custom-form.visible` (expanded), `.custom-input` (matches select styling), `.custom-input.invalid`, `.field-error`, `.field-error.visible`.

---

## Verify

- [ ] Select "Custom…" for video hardware → form appears with smooth transition
- [ ] Enter valid values → range updates in real time
- [ ] Enter out-of-range value → red border + error message; calculation blocked
- [ ] Share URL → custom values encoded as `v=custom:28.5,5800,-95`
- [ ] Open shared URL → form populated and shown, correct calculation
- [ ] Switch back to a preset → form hides, preset calculation runs
