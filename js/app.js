

// Application State
const state = {
  groundStation: null,
  units: 'imperial',
  fadeMargin: 10,
  videoPreset: 'walksnail_gtpro_700',
  videoAirAntenna: 'stock_dipole',
  videoAntenna: 'stock',
  controlPreset: 'elrs_gemini_50',
  controlAirAntenna: 'stock_dipole',
  controlAntenna: 'stock',
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

function populateDropdown(selectEl, data) {
  selectEl.innerHTML = '';
  for (const [key, item] of Object.entries(data)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = item.name;
    selectEl.appendChild(option);
  }
}

function initUI() {
  populateDropdown(els.videoPreset, videoPresets);
  populateDropdown(els.videoAirAntenna, videoAirAntennas);
  populateDropdown(els.videoAntenna, videoAntennas);
  populateDropdown(els.controlPreset, controlPresets);
  populateDropdown(els.controlAirAntenna, controlAirAntennas);
  populateDropdown(els.controlAntenna, controlAntennas);

  // Set initial selections based on state
  els.videoPreset.value = state.videoPreset;
  els.videoAirAntenna.value = state.videoAirAntenna;
  els.videoAntenna.value = state.videoAntenna;
  els.controlPreset.value = state.controlPreset;
  els.controlAirAntenna.value = state.controlAirAntenna;
  els.controlAntenna.value = state.controlAntenna;
  els.fadeMargin.value = state.fadeMargin;
  els.fadeMarginValue.textContent = `${state.fadeMargin} dB`;
  els.unitsToggle.checked = state.units === 'imperial';

  // Event Listeners
  els.videoPreset.addEventListener('change', (e) => { state.videoPreset = e.target.value; recalculate(); });
  els.videoAirAntenna.addEventListener('change', (e) => { state.videoAirAntenna = e.target.value; recalculate(); });
  els.videoAntenna.addEventListener('change', (e) => { state.videoAntenna = e.target.value; recalculate(); });
  els.controlPreset.addEventListener('change', (e) => { state.controlPreset = e.target.value; recalculate(); });
  els.controlAirAntenna.addEventListener('change', (e) => { state.controlAirAntenna = e.target.value; recalculate(); });
  els.controlAntenna.addEventListener('change', (e) => { state.controlAntenna = e.target.value; recalculate(); });
  
  els.fadeMargin.addEventListener('input', (e) => {
    state.fadeMargin = parseInt(e.target.value, 10);
    els.fadeMarginValue.textContent = `${state.fadeMargin} dB`;
    recalculate();
  });

  els.unitsToggle.addEventListener('change', (e) => {
    state.units = e.target.checked ? 'imperial' : 'metric';
    recalculate();
  });
}

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

function initMap() {
  // Default to a somewhat mountainous/interesting location (Swiss Alps)
  const defaultLocation = [46.551, 7.962];
  
  map = L.map('map', {
    zoomControl: false // We'll rely on scroll/pinch for a cleaner look
  }).setView(defaultLocation, 12);
  
  // Add zoom control to bottom right instead of top left
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Add geolocation control
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
        radius: 6,
        color: '#fff',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 1
      }).addTo(map);
      els.mapHint.classList.add('hidden');
      els.mapHint.setAttribute('aria-hidden', 'true');
    } else {
      groundMarker.setLatLng(state.groundStation);
    }

    recalculate();
    fitMapToCircles();
  });
}

function recalculate() {
  // Get presets
  const vLink = videoPresets[state.videoPreset];
  const vAirAnt = videoAirAntennas[state.videoAirAntenna];
  const vAnt = videoAntennas[state.videoAntenna];
  const cLink = controlPresets[state.controlPreset];
  const cAirAnt = controlAirAntennas[state.controlAirAntenna];
  const cAnt = controlAntennas[state.controlAntenna];

  // Calculate math
  const videoRangeMeters = calculateMaxRangeMeters(vLink, vAirAnt.gainDbi, vAnt.gainDbi, state.fadeMargin);
  const controlRangeMeters = calculateMaxRangeMeters(cLink, cAirAnt.gainDbi, cAnt.gainDbi, state.fadeMargin);

  // Update Readouts
  const vFormatted = formatRange(videoRangeMeters, state.units);
  const cFormatted = formatRange(controlRangeMeters, state.units);
  
  els.videoRangeDisplay.innerHTML = `${vFormatted.value} <span style="font-size: 16px; font-weight: 500">${vFormatted.unit}</span>`;
  els.controlRangeDisplay.innerHTML = `${cFormatted.value} <span style="font-size: 16px; font-weight: 500">${cFormatted.unit}</span>`;

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

  // Draw Map Circles if ground station exists
  if (state.groundStation && map) {
    if (videoCircle) map.removeLayer(videoCircle);
    if (controlCircle) map.removeLayer(controlCircle);

    // Draw control first (usually larger) so video is clickable/visible on top
    controlCircle = L.circle(state.groundStation, {
      radius: controlRangeMeters,
      color: '#8b5cf6',
      weight: 1.5,
      fillColor: '#8b5cf6',
      fillOpacity: 0.05,
      dashArray: '5, 10'
    }).addTo(map);

    videoCircle = L.circle(state.groundStation, {
      radius: videoRangeMeters,
      color: '#06b6d4',
      weight: 2,
      fillColor: '#06b6d4',
      fillOpacity: 0.1
    }).addTo(map);
  }
}

function fitMapToCircles() {
  if (controlCircle && map) {
    map.fitBounds(controlCircle.getBounds(), { padding: [50, 50] });
  }
}

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
