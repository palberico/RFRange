// Application State
const state = {
  groundStation: null,
  units: 'imperial',
  fadeMargin: 10,
  videoPreset: '',
  videoAirAntenna: '',
  videoAntenna: '',
  controlPreset: '',
  controlAirAntenna: '',
  controlAntenna: '',
  customVideoPreset: null,
  customVideoAirAntenna: null,
  customVideoAntenna: null,
  customControlPreset: null,
  customControlAirAntenna: null,
  customControlAntenna: null,
};

let map;
let videoCircle = null;
let controlCircle = null;
let groundMarker = null;

// DOM Elements
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

// ── Tooltip ───────────────────────────────────────────────────────────────────

function initInfoTooltip(btn, tip) {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var isOpen = tip.classList.contains('visible');
    tip.classList.toggle('visible', !isOpen);
    tip.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
    btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
  });

  document.addEventListener('click', function() {
    tip.classList.remove('visible');
    tip.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      tip.classList.remove('visible');
      tip.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

function initFadeMarginTooltip() {
  const btn = els.fadeMarginInfoBtn;
  const tip = els.fadeMarginTooltip;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = tip.classList.contains('visible');
    tip.classList.toggle('visible', !isOpen);
    tip.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
    btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
  });

  document.addEventListener('click', () => {
    tip.classList.remove('visible');
    tip.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      tip.classList.remove('visible');
      tip.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

// ── Panel toggle ──────────────────────────────────────────────────────────────

const PANEL_STATE_KEY = 'fpv_panel_state';
var SECTION_STATE_KEY = 'fpv_section_states';

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

  let didDrag = false;

  btn.addEventListener('click', () => {
    if (didDrag) { didDrag = false; return; }
    applyState(!panel.classList.contains('collapsed'));
  });

  let dragStartY = null;
  let dragStartHeight = null;

  btn.addEventListener('touchstart', (e) => {
    didDrag = false;
    dragStartY = e.touches[0].clientY;
    dragStartHeight = panel.offsetHeight;
    panel.style.transition = 'none';
  }, { passive: true });

  btn.addEventListener('touchmove', (e) => {
    if (dragStartY === null) return;
    const delta = dragStartY - e.touches[0].clientY;
    if (Math.abs(delta) > 5) didDrag = true;
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
      didDrag = false;
    });
  }, { passive: true });
}

// ── URL state ─────────────────────────────────────────────────────────────────

/**
 * Builds a state copy with custom hardware values inlined as "custom:..." strings,
 * ready to pass to encodeStateToHash().
 */
function buildHashState() {
  var s = Object.assign({}, state, { zoom: map ? map.getZoom() : 12 });

  // Don't encode blank/unset dropdown fields
  if (!s.videoPreset)       delete s.videoPreset;
  if (!s.videoAirAntenna)   delete s.videoAirAntenna;
  if (!s.videoAntenna)      delete s.videoAntenna;
  if (!s.controlPreset)     delete s.controlPreset;
  if (!s.controlAirAntenna) delete s.controlAirAntenna;
  if (!s.controlAntenna)    delete s.controlAntenna;

  if (s.videoPreset === 'custom' && s.customVideoPreset) {
    var cv = s.customVideoPreset;
    s.videoPreset = 'custom:' + cv.txPowerDbm + ',' + (cv.frequencyHz / 1e6) + ',' + cv.rxSensitivityDbm;
  }
  if (s.videoAirAntenna === 'custom' && s.customVideoAirAntenna) {
    s.videoAirAntenna = 'custom:' + s.customVideoAirAntenna.gainDbi;
  }
  if (s.videoAntenna === 'custom' && s.customVideoAntenna) {
    s.videoAntenna = 'custom:' + s.customVideoAntenna.gainDbi;
  }
  if (s.controlPreset === 'custom' && s.customControlPreset) {
    var cc = s.customControlPreset;
    s.controlPreset = 'custom:' + cc.txPowerDbm + ',' + (cc.frequencyHz / 1e6) + ',' + cc.rxSensitivityDbm;
  }
  if (s.controlAirAntenna === 'custom' && s.customControlAirAntenna) {
    s.controlAirAntenna = 'custom:' + s.customControlAirAntenna.gainDbi;
  }
  if (s.controlAntenna === 'custom' && s.customControlAntenna) {
    s.controlAntenna = 'custom:' + s.customControlAntenna.gainDbi;
  }

  return s;
}

function updateHash() {
  var hash = encodeStateToHash(buildHashState());
  var base = location.pathname + location.search;
  history.replaceState(null, '', hash ? base + '#' + hash : base);
}

/**
 * Expands "custom:..." string values in a decoded hash object into structured
 * custom state objects. Modifies decoded in place.
 */
function expandCustomFromHash(decoded) {
  var presetFields  = ['videoPreset', 'controlPreset'];
  var antennaFields = ['videoAirAntenna', 'videoAntenna', 'controlAirAntenna', 'controlAntenna'];
  var customKeyMap  = {
    videoPreset:       'customVideoPreset',
    controlPreset:     'customControlPreset',
    videoAirAntenna:   'customVideoAirAntenna',
    videoAntenna:      'customVideoAntenna',
    controlAirAntenna: 'customControlAirAntenna',
    controlAntenna:    'customControlAntenna',
  };

  presetFields.forEach(function(field) {
    var val = decoded[field];
    if (!val || val.indexOf('custom:') !== 0) return;
    var parts  = val.slice(7).split(',');
    var txPow  = parseFloat(parts[0]);
    var freqMh = parseFloat(parts[1]);
    var rxSens = parseFloat(parts[2]);
    if (!isNaN(txPow) && !isNaN(freqMh) && !isNaN(rxSens)) {
      decoded[customKeyMap[field]] = { txPowerDbm: txPow, frequencyHz: freqMh * 1e6, rxSensitivityDbm: rxSens };
      decoded[field] = 'custom';
    } else {
      delete decoded[field]; // malformed -- fall through to defaults
    }
  });

  antennaFields.forEach(function(field) {
    var val = decoded[field];
    if (!val || val.indexOf('custom:') !== 0) return;
    var gain = parseFloat(val.slice(7));
    if (!isNaN(gain)) {
      decoded[customKeyMap[field]] = { gainDbi: gain };
      decoded[field] = 'custom';
    } else {
      delete decoded[field];
    }
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(message, options) {
  // Remove any existing toast so rapid calls don't pile up
  var existing = document.querySelector('.toast');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  var toast = document.createElement('div');
  toast.className = 'toast' + (options && options.error ? ' error' : '');
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      toast.classList.add('visible');
    });
  });
  setTimeout(function() {
    toast.classList.remove('visible');
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
  }, 2500);
}

// ── Share ─────────────────────────────────────────────────────────────────────

function handleShare() {
  var url = window.location.href;
  // Use native share sheet only on touch devices; desktop always copies to clipboard.
  if (navigator.maxTouchPoints > 0 && navigator.share) {
    navigator.share({ title: 'FPV Link Budget -- my setup', url: url })
      .catch(function(err) {
        // User cancelled the share sheet — do nothing
        if (err && err.name === 'AbortError') return;
        // Real failure — fall back to clipboard
        copyUrlToClipboard(url);
      });
    return;
  }
  copyUrlToClipboard(url);
}

function copyUrlToClipboard(url) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(function() { showToast('Link copied to clipboard'); })
      .catch(function() { execCommandCopy(url); });
  } else {
    execCommandCopy(url);
  }
}

function execCommandCopy(url) {
  try {
    var ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(ok ? 'Link copied to clipboard' : 'Could not copy link');
  } catch (e) {
    showToast('Could not copy link', { error: true });
  }
}

// ── Custom hardware forms ─────────────────────────────────────────────────────

function validateCustomInput(input, min, max) {
  var error = input.parentElement.querySelector('.field-error');

  // Empty input: treat as "not yet filled" — don't flag as invalid,
  // don't show an error message. Calling code handles the "form not ready"
  // case via the false return value.
  if (input.value === '') {
    if (error) error.classList.remove('visible');
    input.classList.remove('invalid');
    return false;
  }

  var val = parseFloat(input.value);
  if (isNaN(val) || val < min || val > max) {
    if (error) {
      error.textContent = 'Enter ' + min + ' – ' + max;
      error.classList.add('visible');
    }
    input.classList.add('invalid');
    return false;
  }

  if (error) error.classList.remove('visible');
  input.classList.remove('invalid');
  return true;
}

function createCustomForm(formId, fieldDefs) {
  var form = document.createElement('div');
  form.className = 'custom-form';
  form.id = formId;

  fieldDefs.forEach(function(def) {
    var group = document.createElement('div');
    group.className = 'input-group';

    var label = document.createElement('label');
    label.textContent = def.label;

    var input = document.createElement('input');
    input.type = 'number';
    input.className = 'custom-input';
    input.id = formId + '_' + def.id;
    input.min = def.min;
    input.max = def.max;
    input.step = def.step;
    input.placeholder = def.min + ' to ' + def.max;

    var error = document.createElement('span');
    error.className = 'field-error';

    group.appendChild(label);
    group.appendChild(input);
    group.appendChild(error);
    form.appendChild(group);
  });

  return form;
}

function readCustomPresetForm(formEl) {
  var txInput  = formEl.querySelector('[id$="_txPowerDbm"]');
  var frqInput = formEl.querySelector('[id$="_frequencyMhz"]');
  var rxInput  = formEl.querySelector('[id$="_rxSensitivityDbm"]');

  // Run all three validators (no short-circuit) so every invalid field
  // surfaces its own error message.
  var txOk  = validateCustomInput(txInput, 0, 40);
  var frqOk = validateCustomInput(frqInput, 100, 6000);
  var rxOk  = validateCustomInput(rxInput, -150, 0);

  if (!txOk || !frqOk || !rxOk) return null;

  return {
    txPowerDbm:       parseFloat(txInput.value),
    frequencyHz:      parseFloat(frqInput.value) * 1e6,
    rxSensitivityDbm: parseFloat(rxInput.value),
  };
}

function readCustomAntennaForm(formEl) {
  var gainInput = formEl.querySelector('[id$="_gainDbi"]');
  if (!validateCustomInput(gainInput, -10, 30)) return null;
  return { gainDbi: parseFloat(gainInput.value) };
}

function populateCustomPresetForm(formEl, customObj) {
  if (!customObj) return;
  var txInput  = formEl.querySelector('[id$="_txPowerDbm"]');
  var frqInput = formEl.querySelector('[id$="_frequencyMhz"]');
  var rxInput  = formEl.querySelector('[id$="_rxSensitivityDbm"]');
  if (txInput)  txInput.value  = customObj.txPowerDbm;
  if (frqInput) frqInput.value = customObj.frequencyHz / 1e6;
  if (rxInput)  rxInput.value  = customObj.rxSensitivityDbm;
}

function populateCustomAntennaForm(formEl, customObj) {
  if (!customObj) return;
  var gainInput = formEl.querySelector('[id$="_gainDbi"]');
  if (gainInput) gainInput.value = customObj.gainDbi;
}

function syncCustomForm(selectEl, formEl) {
  formEl.classList.toggle('visible', selectEl.value === 'custom');
}

function syncAllCustomForms() {
  [
    ['videoPreset',       'customVideoPresetForm'],
    ['videoAirAntenna',   'customVideoAirAntennaForm'],
    ['videoAntenna',      'customVideoAntennaForm'],
    ['controlPreset',     'customControlPresetForm'],
    ['controlAirAntenna', 'customControlAirAntennaForm'],
    ['controlAntenna',    'customControlAntennaForm'],
  ].forEach(function(pair) {
    var sel  = document.getElementById(pair[0]);
    var form = document.getElementById(pair[1]);
    if (sel && form) syncCustomForm(sel, form);
  });
}

function initCustomForms() {
  var presetDefs = [
    { id: 'txPowerDbm',       label: 'TX Power (dBm)',      min: 0,    max: 40,   step: 0.1 },
    { id: 'frequencyMhz',     label: 'Frequency (MHz)',      min: 100,  max: 6000, step: 1   },
    { id: 'rxSensitivityDbm', label: 'RX Sensitivity (dBm)', min: -150, max: 0,    step: 0.1 },
  ];
  var antDefs = [
    { id: 'gainDbi', label: 'Gain (dBi)', min: -10, max: 30, step: 0.1 },
  ];

  var configs = [
    { select: els.videoPreset,       formId: 'customVideoPresetForm',       defs: presetDefs, stateKey: 'videoPreset',       customKey: 'customVideoPreset',       isPreset: true  },
    { select: els.videoAirAntenna,   formId: 'customVideoAirAntennaForm',   defs: antDefs,    stateKey: 'videoAirAntenna',   customKey: 'customVideoAirAntenna',   isPreset: false },
    { select: els.videoAntenna,      formId: 'customVideoAntennaForm',      defs: antDefs,    stateKey: 'videoAntenna',      customKey: 'customVideoAntenna',      isPreset: false },
    { select: els.controlPreset,     formId: 'customControlPresetForm',     defs: presetDefs, stateKey: 'controlPreset',     customKey: 'customControlPreset',     isPreset: true  },
    { select: els.controlAirAntenna, formId: 'customControlAirAntennaForm', defs: antDefs,    stateKey: 'controlAirAntenna', customKey: 'customControlAirAntenna', isPreset: false },
    { select: els.controlAntenna,    formId: 'customControlAntennaForm',    defs: antDefs,    stateKey: 'controlAntenna',    customKey: 'customControlAntenna',    isPreset: false },
  ];

  configs.forEach(function(cfg) {
    var opt = document.createElement('option');
    opt.value = 'custom';
    opt.textContent = 'Custom…';
    cfg.select.appendChild(opt);

    var form = createCustomForm(cfg.formId, cfg.defs);
    cfg.select.closest('.input-group').insertAdjacentElement('afterend', form);

    cfg.select.addEventListener('change', function() {
      syncCustomForm(cfg.select, form);
      if (cfg.select.value !== 'custom') state[cfg.customKey] = null;
    });

    form.querySelectorAll('.custom-input').forEach(function(input) {
      input.addEventListener('input', function() {
        var result = cfg.isPreset ? readCustomPresetForm(form) : readCustomAntennaForm(form);
        if (result) {
          state[cfg.customKey] = result;
          recalculate();
        }
      });
    });
  });
}

// ── Preset validation (Task 5) ────────────────────────────────────────────────

function validateAndFixState() {
  var lookups = {
    videoPreset:       videoPresets,
    videoAirAntenna:   videoAirAntennas,
    videoAntenna:      videoAntennas,
    controlPreset:     controlPresets,
    controlAirAntenna: controlAirAntennas,
    controlAntenna:    controlAntennas,
  };
  var defaults = {
    videoPreset:       'walksnail_gtpro_700',
    videoAirAntenna:   'stock_dipole',
    videoAntenna:      'stock',
    controlPreset:     'elrs_gemini_50',
    controlAirAntenna: 'stock_dipole',
    controlAntenna:    'stock',
  };
  var hadBadRef = false;

  for (var field in lookups) {
    var val = state[field];
    if (val !== 'custom' && val !== '' && !lookups[field][val]) {
      state[field] = defaults[field];
      hadBadRef = true;
    }
  }

  return hadBadRef;
}

// ── Dropdowns ─────────────────────────────────────────────────────────────────

function populateDropdown(selectEl, data) {
  selectEl.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value    = '';
  placeholder.disabled = true;
  placeholder.textContent = '-- Select --';
  selectEl.appendChild(placeholder);
  for (const [key, item] of Object.entries(data)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = item.name;
    selectEl.appendChild(option);
  }
}

function updateSaveProfileBtn() {
  var basicReady =
    state.videoPreset       && state.videoAirAntenna   && state.videoAntenna &&
    state.controlPreset     && state.controlAirAntenna && state.controlAntenna;

  // If a field is set to 'custom', its companion custom object must be filled
  var customPairs = [
    ['videoPreset',       'customVideoPreset'],
    ['videoAirAntenna',   'customVideoAirAntenna'],
    ['videoAntenna',      'customVideoAntenna'],
    ['controlPreset',     'customControlPreset'],
    ['controlAirAntenna', 'customControlAirAntenna'],
    ['controlAntenna',    'customControlAntenna'],
  ];
  var customsReady = customPairs.every(function(pair) {
    return state[pair[0]] !== 'custom' || state[pair[1]] != null;
  });

  var btn = document.getElementById('saveProfileBtn');
  if (btn) btn.disabled = !(basicReady && customsReady);
}

// ── Apply state to UI ─────────────────────────────────────────────────────────

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

  var customFormMap = [
    { formId: 'customVideoPresetForm',       customKey: 'customVideoPreset',       isPreset: true  },
    { formId: 'customControlPresetForm',     customKey: 'customControlPreset',     isPreset: true  },
    { formId: 'customVideoAirAntennaForm',   customKey: 'customVideoAirAntenna',   isPreset: false },
    { formId: 'customVideoAntennaForm',      customKey: 'customVideoAntenna',      isPreset: false },
    { formId: 'customControlAirAntennaForm', customKey: 'customControlAirAntenna', isPreset: false },
    { formId: 'customControlAntennaForm',    customKey: 'customControlAntenna',    isPreset: false },
  ];
  customFormMap.forEach(function(cfg) {
    var formEl = document.getElementById(cfg.formId);
    if (!formEl) return;
    if (cfg.isPreset) populateCustomPresetForm(formEl, state[cfg.customKey]);
    else              populateCustomAntennaForm(formEl, state[cfg.customKey]);
  });

  syncAllCustomForms();
}

// ── Init UI ───────────────────────────────────────────────────────────────────

function initUI() {
  populateDropdown(els.videoPreset, videoPresets);
  populateDropdown(els.videoAirAntenna, videoAirAntennas);
  populateDropdown(els.videoAntenna, videoAntennas);
  populateDropdown(els.controlPreset, controlPresets);
  populateDropdown(els.controlAirAntenna, controlAirAntennas);
  populateDropdown(els.controlAntenna, controlAntennas);

  // Set initial selections based on state
  els.videoPreset.value       = state.videoPreset;
  els.videoAirAntenna.value   = state.videoAirAntenna;
  els.videoAntenna.value      = state.videoAntenna;
  els.controlPreset.value     = state.controlPreset;
  els.controlAirAntenna.value = state.controlAirAntenna;
  els.controlAntenna.value    = state.controlAntenna;
  els.fadeMargin.value        = state.fadeMargin;
  els.fadeMarginValue.textContent = `${state.fadeMargin} dB`;
  els.unitsToggle.checked     = state.units === 'imperial';

  // Add "Custom…" options and wire custom form listeners
  initCustomForms();

  // Event Listeners
  els.videoPreset.addEventListener('change',       (e) => { state.videoPreset = e.target.value; recalculate(); });
  els.videoAirAntenna.addEventListener('change',   (e) => { state.videoAirAntenna = e.target.value; recalculate(); });
  els.videoAntenna.addEventListener('change',      (e) => { state.videoAntenna = e.target.value; recalculate(); });
  els.controlPreset.addEventListener('change',     (e) => { state.controlPreset = e.target.value; recalculate(); });
  els.controlAirAntenna.addEventListener('change', (e) => { state.controlAirAntenna = e.target.value; recalculate(); });
  els.controlAntenna.addEventListener('change',    (e) => { state.controlAntenna = e.target.value; recalculate(); });

  els.fadeMargin.addEventListener('input', (e) => {
    state.fadeMargin = parseInt(e.target.value, 10);
    els.fadeMarginValue.textContent = `${state.fadeMargin} dB`;
    recalculate();
  });

  els.unitsToggle.addEventListener('change', (e) => {
    state.units = e.target.checked ? 'imperial' : 'metric';
    recalculate();
  });

  var shareBtn       = document.getElementById('shareBtn');
  var mobileShareBtn = document.getElementById('mobileShareBtn');
  if (shareBtn)       shareBtn.addEventListener('click', handleShare);
  if (mobileShareBtn) mobileShareBtn.addEventListener('click', handleShare);
}

// ── Geolocation ───────────────────────────────────────────────────────────────

function locateUser(btnEl) {
  if (btnEl.classList.contains('locating')) return;
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

// ── Map ───────────────────────────────────────────────────────────────────────

function initMap() {
  map = L.map('map', {
    zoomControl: false
  }).setView([20, 0], 2);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  const LocateControl = L.Control.extend({
    options: { position: 'bottomright' },
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
  });
  new LocateControl().addTo(map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  map.on('click', (e) => {
    state.groundStation = e.latlng;

    if (!groundMarker) {
      groundMarker = L.circleMarker(state.groundStation, {
        radius: 6, color: '#fff', weight: 2,
        fillColor: '#3b82f6', fillOpacity: 1
      }).addTo(map);
      els.mapHint.classList.add('hidden');
      els.mapHint.setAttribute('aria-hidden', 'true');
    } else {
      groundMarker.setLatLng(state.groundStation);
    }

    recalculate();
    fitMapToCircles();
    offerSaveLocation(e.latlng.lat, e.latlng.lng);
  });
}

// ── Calculate ─────────────────────────────────────────────────────────────────

function clearReadouts() {
  els.videoRangeDisplay.innerHTML   = '--';
  els.controlRangeDisplay.innerHTML = '--';
  els.limitingFactorDisplay.innerHTML = 'Limiting Factor: <span class="highlight">--</span>';
  els.videoRangePeek.textContent   = '--';
  els.controlRangePeek.textContent = '--';
  els.limitingPeek.textContent     = '--';
  els.limitingPeek.style.color     = '';
}

function recalculate() {
  updateSaveProfileBtn();

  const vLink   = state.videoPreset       === 'custom' ? state.customVideoPreset       : videoPresets[state.videoPreset];
  const vAirAnt = state.videoAirAntenna   === 'custom' ? state.customVideoAirAntenna   : videoAirAntennas[state.videoAirAntenna];
  const vAnt    = state.videoAntenna      === 'custom' ? state.customVideoAntenna      : videoAntennas[state.videoAntenna];
  const cLink   = state.controlPreset     === 'custom' ? state.customControlPreset     : controlPresets[state.controlPreset];
  const cAirAnt = state.controlAirAntenna === 'custom' ? state.customControlAirAntenna : controlAirAntennas[state.controlAirAntenna];
  const cAnt    = state.controlAntenna    === 'custom' ? state.customControlAntenna    : controlAntennas[state.controlAntenna];

  // A custom dropdown is selected but the form isn't filled yet, or no selection made
  if (!vLink || !vAirAnt || !vAnt || !cLink || !cAirAnt || !cAnt) {
    clearReadouts();
    if (state.groundStation && map) {
      if (videoCircle)   { map.removeLayer(videoCircle);   videoCircle = null; }
      if (controlCircle) { map.removeLayer(controlCircle); controlCircle = null; }
    }
    updateHash();
    saveLastState(state);
    return;
  }

  const videoRangeMeters   = calculateMaxRangeMeters(vLink, vAirAnt.gainDbi, vAnt.gainDbi, state.fadeMargin);
  const controlRangeMeters = calculateMaxRangeMeters(cLink, cAirAnt.gainDbi, cAnt.gainDbi, state.fadeMargin);

  const vFormatted = formatRange(videoRangeMeters, state.units);
  const cFormatted = formatRange(controlRangeMeters, state.units);

  els.videoRangeDisplay.innerHTML   = `${vFormatted.value} <span style="font-size: 16px; font-weight: 500">${vFormatted.unit}</span>`;
  els.controlRangeDisplay.innerHTML = `${cFormatted.value} <span style="font-size: 16px; font-weight: 500">${cFormatted.unit}</span>`;

  if (videoRangeMeters < controlRangeMeters) {
    els.limitingFactorDisplay.innerHTML = `Limiting Factor: <span class="highlight" style="color: var(--video-color)">Video Link</span>`;
  } else {
    els.limitingFactorDisplay.innerHTML = `Limiting Factor: <span class="highlight" style="color: var(--control-color)">Control Link</span>`;
  }

  const isVideoLimiting = videoRangeMeters < controlRangeMeters;
  els.videoRangePeek.textContent   = `${vFormatted.value} ${vFormatted.unit}`;
  els.controlRangePeek.textContent = `${cFormatted.value} ${cFormatted.unit}`;
  els.limitingPeek.textContent     = isVideoLimiting ? 'Video' : 'Control';
  els.limitingPeek.style.color     = isVideoLimiting ? 'var(--video-color)' : 'var(--control-color)';

  if (state.groundStation && map) {
    if (videoCircle)   map.removeLayer(videoCircle);
    if (controlCircle) map.removeLayer(controlCircle);

    controlCircle = L.circle(state.groundStation, {
      radius: controlRangeMeters,
      color: '#8b5cf6', weight: 1.5,
      fillColor: '#8b5cf6', fillOpacity: 0.05,
      dashArray: '5, 10'
    }).addTo(map);

    videoCircle = L.circle(state.groundStation, {
      radius: videoRangeMeters,
      color: '#06b6d4', weight: 2,
      fillColor: '#06b6d4', fillOpacity: 0.1
    }).addTo(map);
  }

  updateHash();
  saveLastState(state);
}

function fitMapToCircles() {
  if (controlCircle && map) {
    map.fitBounds(controlCircle.getBounds(), { padding: [50, 50] });
  }
}

// ── Desktop panel collapse ────────────────────────────────────────────────────

var DESKTOP_PANEL_KEY = 'fpv_panel_desktop';

function initDesktopPanelToggle() {
  var panel      = document.querySelector('.ui-panel');
  var collapseBtn = document.getElementById('panelCollapseBtn');
  var reopenBtn   = document.getElementById('panelReopenBtn');

  function setCollapsed(collapsed) {
    panel.classList.toggle('desktop-collapsed', collapsed);
    reopenBtn.classList.toggle('visible', collapsed);
    localStorage.setItem(DESKTOP_PANEL_KEY, collapsed ? 'collapsed' : 'expanded');
  }

  var saved = localStorage.getItem(DESKTOP_PANEL_KEY);
  if (saved === 'collapsed') setCollapsed(true);

  collapseBtn.addEventListener('click', function() { setCollapsed(true); });
  reopenBtn.addEventListener('click',   function() { setCollapsed(false); });
}

// ── Mobile locate ─────────────────────────────────────────────────────────────

function initMobileLocate() {
  const btn = document.getElementById('mobileLocateBtn');
  btn.addEventListener('click', () => locateUser(btn));
}

// ── Ground station restore helper ─────────────────────────────────────────────

function restoreGroundStation(lat, lng, zoom) {
  var latlng = L.latLng(lat, lng);
  state.groundStation = latlng;
  if (!groundMarker) {
    groundMarker = L.circleMarker(latlng, {
      radius: 6, color: '#fff', weight: 2,
      fillColor: '#3b82f6', fillOpacity: 1
    }).addTo(map);
  } else {
    groundMarker.setLatLng(latlng);
  }
  els.mapHint.classList.add('hidden');
  els.mapHint.setAttribute('aria-hidden', 'true');
  map.setView(latlng, zoom || 12);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

var _modalCleanup = null;

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('visible');
  if (_modalCleanup) { _modalCleanup(); _modalCleanup = null; }
}

/**
 * Shows the shared modal dialog.
 * onConfirm(inputValue) is called when the user confirms.
 * Return false from onConfirm to keep the modal open (e.g. validation failed).
 */
function showModal(title, bodyHtml, confirmLabel, onConfirm, isDanger) {
  var overlay    = document.getElementById('modalOverlay');
  var titleEl    = document.getElementById('modalTitle');
  var bodyEl     = document.getElementById('modalBody');
  var confirmBtn = document.getElementById('modalConfirm');
  var cancelBtn  = document.getElementById('modalCancel');

  titleEl.textContent    = title;
  bodyEl.innerHTML       = bodyHtml;
  confirmBtn.textContent = confirmLabel || 'Confirm';
  confirmBtn.className   = isDanger ? 'btn btn-danger' : 'btn btn-primary';
  overlay.classList.add('visible');

  var input = bodyEl.querySelector('input[type="text"]');
  if (input) setTimeout(function() { input.focus(); }, 50);

  function onConfirmClick() {
    var val = input ? input.value.trim() : '';
    var ok = onConfirm(val);
    if (ok !== false) closeModal();
  }
  function onCancelClick() { closeModal(); }
  function onKeyDown(e) {
    if (e.key === 'Escape') onCancelClick();
    if (e.key === 'Enter' && input) onConfirmClick();
  }
  function onOverlayClick(e) { if (e.target === overlay) onCancelClick(); }

  confirmBtn.addEventListener('click', onConfirmClick);
  cancelBtn.addEventListener('click', onCancelClick);
  document.addEventListener('keydown', onKeyDown);
  overlay.addEventListener('click', onOverlayClick);

  _modalCleanup = function() {
    confirmBtn.removeEventListener('click', onConfirmClick);
    cancelBtn.removeEventListener('click', onCancelClick);
    document.removeEventListener('keydown', onKeyDown);
    overlay.removeEventListener('click', onOverlayClick);
  };
}

// ── Profiles ──────────────────────────────────────────────────────────────────

var profilesData = {};

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function populateProfileDropdown() {
  var sel       = document.getElementById('profileSelect');
  var deleteBtn = document.getElementById('deleteProfileBtn');
  var names     = Object.keys(profilesData).sort();

  sel.innerHTML = '';
  var placeholder = document.createElement('option');
  placeholder.value    = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = names.length === 0 ? 'No saved profiles' : '-- Select a profile --';
  sel.appendChild(placeholder);

  names.forEach(function(name) {
    var opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });

  deleteBtn.disabled = !sel.value;
}

function loadProfile(name) {
  var profile = profilesData[name];
  if (!profile) return;
  var fields = ['videoPreset','videoAirAntenna','videoAntenna',
                'controlPreset','controlAirAntenna','controlAntenna',
                'fadeMargin','units',
                'customVideoPreset','customVideoAirAntenna','customVideoAntenna',
                'customControlPreset','customControlAirAntenna','customControlAntenna'];
  fields.forEach(function(f) {
    if (profile[f] !== undefined) state[f] = profile[f];
  });
  applyStateToUI();
  recalculate();
  showToast('Profile "' + name + '" loaded.');
}

function saveProfile(name) {
  profilesData[name] = {
    videoPreset:             state.videoPreset,
    videoAirAntenna:         state.videoAirAntenna,
    videoAntenna:            state.videoAntenna,
    controlPreset:           state.controlPreset,
    controlAirAntenna:       state.controlAirAntenna,
    controlAntenna:          state.controlAntenna,
    fadeMargin:              state.fadeMargin,
    units:                   state.units,
    customVideoPreset:       state.customVideoPreset,
    customVideoAirAntenna:   state.customVideoAirAntenna,
    customVideoAntenna:      state.customVideoAntenna,
    customControlPreset:     state.customControlPreset,
    customControlAirAntenna: state.customControlAirAntenna,
    customControlAntenna:    state.customControlAntenna,
    createdAt:               Date.now(),
  };
  saveProfiles(profilesData);
  populateProfileDropdown();
  document.getElementById('profileSelect').value = name;
  document.getElementById('deleteProfileBtn').disabled = false;
}

function deleteProfile(name) {
  delete profilesData[name];
  saveProfiles(profilesData);
  populateProfileDropdown();
}

function initProfiles() {
  profilesData = loadProfiles();
  populateProfileDropdown();

  var sel       = document.getElementById('profileSelect');
  var deleteBtn = document.getElementById('deleteProfileBtn');

  sel.addEventListener('change', function() {
    deleteBtn.disabled = !sel.value;
    if (sel.value && profilesData[sel.value]) loadProfile(sel.value);
  });

  document.getElementById('saveProfileBtn').addEventListener('click', function() {
    showModal(
      'Save Profile',
      '<label class="modal-label">Profile name</label>' +
      '<input type="text" class="modal-input" placeholder="e.g. Skyhunter LR" maxlength="50">' +
      '<span class="modal-error"></span>',
      'Save',
      function(name) {
        var err = document.querySelector('#modalBody .modal-error');
        if (!name) { if (err) err.textContent = 'Enter a profile name.'; return false; }
        if (profilesData[name]) { if (err) err.textContent = '"' + name + '" already exists.'; return false; }
        saveProfile(name);
        showToast('Profile "' + name + '" saved.');
      }
    );
  });

  deleteBtn.addEventListener('click', function() {
    var name = sel.value;
    if (!name || !profilesData[name]) return;
    showModal(
      'Delete Profile',
      '<p class="modal-message">Delete "<strong>' + escapeHtml(name) + '</strong>"? This cannot be undone.</p>',
      'Delete',
      function() { deleteProfile(name); showToast('Profile deleted.'); },
      true
    );
  });
}

// ── Recent locations ──────────────────────────────────────────────────────────

var recentLocations = [];

function haversineMeters(lat1, lng1, lat2, lng2) {
  var R    = 6371000;
  var toRad = function(d) { return d * Math.PI / 180; };
  var dLat = toRad(lat2 - lat1);
  var dLng = toRad(lng2 - lng1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function renderRecentLocations() {
  var list = document.getElementById('recentLocationsList');
  if (!list) return;
  list.innerHTML = '';

  if (recentLocations.length === 0) {
    var empty = document.createElement('p');
    empty.className = 'locations-empty';
    empty.textContent = 'No saved locations yet.';
    list.appendChild(empty);
    return;
  }

  recentLocations.forEach(function(loc) {
    var label = loc.label || (loc.lat.toFixed(4) + ', ' + loc.lng.toFixed(4));

    var item = document.createElement('div');
    item.className = 'location-item';

    var pinBtn = document.createElement('button');
    pinBtn.className   = 'location-pin-btn';
    pinBtn.textContent = label;
    pinBtn.addEventListener('click', function() {
      restoreGroundStation(loc.lat, loc.lng, 14);
      recalculate();
      fitMapToCircles();
    });

    var delBtn = document.createElement('button');
    delBtn.className = 'location-delete-btn';
    delBtn.setAttribute('aria-label', 'Delete location');
    delBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    delBtn.addEventListener('click', function() {
      var idx = recentLocations.indexOf(loc);
      if (idx !== -1) {
        recentLocations.splice(idx, 1);
        saveRecentLocations(recentLocations);
        renderRecentLocations();
      }
    });

    item.appendChild(pinBtn);
    item.appendChild(delBtn);
    list.appendChild(item);
  });
}

function offerSaveLocation(lat, lng) {
  // If we already have a location within 500m, promote it to the top instead
  // of prompting the user to add a duplicate.
  var nearbyIdx = -1;
  for (var i = 0; i < recentLocations.length; i++) {
    if (haversineMeters(lat, lng, recentLocations[i].lat, recentLocations[i].lng) < 500) {
      nearbyIdx = i;
      break;
    }
  }
  if (nearbyIdx !== -1) {
    if (nearbyIdx === 0) return; // already at the top, nothing to do
    var existing = recentLocations.splice(nearbyIdx, 1)[0];
    recentLocations.unshift(existing);
    saveRecentLocations(recentLocations);
    renderRecentLocations();
    return;
  }

  showModal(
    'Save this location?',
    '<label class="modal-label">Label <span class="modal-optional">(optional)</span></label>' +
    '<input type="text" class="modal-input" placeholder="e.g. Bonneville Salt Flats" maxlength="60">',
    'Save',
    function(label) {
      recentLocations.unshift({
        lat:     parseFloat(lat.toFixed(4)),
        lng:     parseFloat(lng.toFixed(4)),
        label:   label || null,
        savedAt: Date.now(),
      });
      if (recentLocations.length > 5) recentLocations = recentLocations.slice(0, 5);
      saveRecentLocations(recentLocations);
      renderRecentLocations();
    }
  );
}

function initRecentLocations() {
  recentLocations = loadRecentLocations();
  renderRecentLocations();
}

// ── Export / Import ───────────────────────────────────────────────────────────

function exportData() {
  var data = {
    version:         1,
    exportedAt:      new Date().toISOString(),
    lastState:       loadLastState(),
    profiles:        loadProfiles(),
    recentLocations: loadRecentLocations(),
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'fpv-link-budget-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Data exported.');
}

function importData(file) {
  var reader = new FileReader();
  reader.onerror = function() { showToast('Could not read file.', { error: true }); };
  reader.onload  = function(e) {
    var data;
    try { data = JSON.parse(e.target.result); }
    catch (_) { showToast('Invalid JSON file.', { error: true }); return; }

    if (data.version !== 1) {
      showToast('Unsupported export version.', { error: true });
      return;
    }
    if (!data.lastState       || typeof data.lastState !== 'object' ||
        !data.profiles        || typeof data.profiles  !== 'object' ||
        !Array.isArray(data.recentLocations)) {
      showToast('Invalid data file -- missing required fields.', { error: true });
      return;
    }

    showModal(
      'Import Data',
      '<p class="modal-message">This will overwrite your saved profiles and locations. Continue?</p>',
      'Import',
      function() {
        try {
          localStorage.setItem(STORAGE_KEYS.LAST_STATE, JSON.stringify(data.lastState));
          saveProfiles(data.profiles);
          saveRecentLocations(data.recentLocations);
        } catch (err) {
          showToast('Import failed -- storage unavailable.', { error: true });
          return;
        }
        profilesData     = data.profiles;
        recentLocations  = data.recentLocations;
        populateProfileDropdown();
        renderRecentLocations();
        showToast('Data imported.');
      }
    );
  };
  reader.readAsText(file);
}

function initDataActions() {
  document.getElementById('exportBtn').addEventListener('click', exportData);
  var importInput = document.getElementById('importInput');
  importInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
      importData(e.target.files[0]);
      e.target.value = '';
    }
  });

  var mobileExportBtn = document.getElementById('mobileExportBtn');
  var mobileImportBtn = document.getElementById('mobileImportBtn');
  if (mobileExportBtn) mobileExportBtn.addEventListener('click', exportData);
  if (mobileImportBtn) mobileImportBtn.addEventListener('click', function() {
    importInput.click();
  });
}

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

// ── Bootstrap ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initMap();
  initFadeMarginTooltip();
  initPanelToggle();
  initMobileLocate();

  // Priority: defaults → last saved session → URL hash (highest)
  var savedState = loadLastState();
  if (savedState) {
    expandCustomFromHash(savedState);
    Object.assign(state, savedState);
    if (savedState.groundStation) {
      restoreGroundStation(savedState.groundStation.lat, savedState.groundStation.lng,
                           savedState.zoom != null ? savedState.zoom : 12);
    }
    validateAndFixState();
    applyStateToUI();
  }

  if (window.location.hash) {
    var decoded = decodeHashToState(window.location.hash);
    expandCustomFromHash(decoded);
    Object.assign(state, decoded);
    if (decoded.groundStation) {
      restoreGroundStation(decoded.groundStation.lat, decoded.groundStation.lng,
                           decoded.zoom != null ? decoded.zoom : 12);
    }
    if (validateAndFixState()) {
      showToast("Some hardware in this link isn't available -- using defaults.");
    }
    applyStateToUI();
  }

  initDesktopPanelToggle();
  initCollapsibleSections();
  initInfoTooltip(document.getElementById('videoRangeInfoBtn'),   document.getElementById('videoRangeTooltip'));
  initInfoTooltip(document.getElementById('controlRangeInfoBtn'), document.getElementById('controlRangeTooltip'));
  initProfiles();
  initRecentLocations();
  initDataActions();

  recalculate();
  autoLocate();
});

function autoLocate() {
  if (state.groundStation || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      // Only move the map if the user hasn't pinned a location while we were waiting
      if (!state.groundStation) {
        map.setView([pos.coords.latitude, pos.coords.longitude], 13);
      }
    },
    function() { /* permission denied or unavailable — world view stays */ },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}
