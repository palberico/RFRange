/**
 * localStorage wrapper for FPV Link Budget Estimator.
 * All functions are safe to call in private browsing or when storage is full —
 * they silently return null/{}/[] on failure and log a console warning.
 */

var STORAGE_KEYS = {
  LAST_STATE:       'fpv_last_state',
  PROFILES:         'fpv_profiles',
  RECENT_LOCATIONS: 'fpv_recent_locations',
  PANEL_STATE:      'fpv_panel_state', // already used by initPanelToggle
};

/**
 * Persists app state. Converts groundStation from L.latLng to a plain object
 * so it can be JSON-serialised.
 */
function saveLastState(state) {
  try {
    var toSave = Object.assign({}, state, {
      groundStation: state.groundStation
        ? { lat: state.groundStation.lat, lng: state.groundStation.lng }
        : null
    });
    localStorage.setItem(STORAGE_KEYS.LAST_STATE, JSON.stringify(toSave));
  } catch (e) {
    console.warn('[fpv] could not save state:', e);
  }
}

/** Returns the last saved state object, or null on failure/missing. */
function loadLastState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEYS.LAST_STATE);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[fpv] could not load state:', e);
    return null;
  }
}

function saveProfiles(profiles) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.warn('[fpv] could not save profiles:', e);
  }
}

/** Returns the profiles object, or {} on failure/missing. */
function loadProfiles() {
  try {
    var raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('[fpv] could not load profiles:', e);
    return {};
  }
}

function saveRecentLocations(locations) {
  try {
    localStorage.setItem(STORAGE_KEYS.RECENT_LOCATIONS, JSON.stringify(locations));
  } catch (e) {
    console.warn('[fpv] could not save locations:', e);
  }
}

/** Returns the recent locations array, or [] on failure/missing. */
function loadRecentLocations() {
  try {
    var raw = localStorage.getItem(STORAGE_KEYS.RECENT_LOCATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[fpv] could not load locations:', e);
    return [];
  }
}
