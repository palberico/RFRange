/**
 * URL state encoding/decoding for FPV Link Budget Estimator.
 *
 * Two pure functions — no DOM access, no Leaflet dependency:
 *   encodeStateToHash(state)  → compact hash string (no leading #)
 *   decodeHashToState(hash)   → partial state object, or {} on failure
 *
 * The groundStation field is a plain {lat, lng} object here; callers are
 * responsible for converting to/from L.latLng().
 */

/**
 * Short URL parameter keys for each state field.
 * These must remain stable — changing them breaks existing shared links.
 */
const FIELD_TO_KEY = {
  videoPreset:       'v',
  videoAirAntenna:   'va',
  videoAntenna:      'ga',
  controlPreset:     'c',
  controlAirAntenna: 'ca',
  controlAntenna:    'cga',
  fadeMargin:        'fm',
  units:             'u'
};

const KEY_TO_FIELD = {};
(function buildReverseMap() {
  for (var field in FIELD_TO_KEY) {
    KEY_TO_FIELD[FIELD_TO_KEY[field]] = field;
  }
})();

/**
 * Encodes app state to a URL hash string (without the leading #).
 * All selected (non-empty) values are encoded; blank/null fields are omitted.
 *
 * @param {Object} state - The current app state object
 * @returns {string} Encoded hash string, e.g. "v=walksnail_gtpro_700&fm=15"
 */
function encodeStateToHash(state) {
  var parts = [];

  for (var field in FIELD_TO_KEY) {
    var key = FIELD_TO_KEY[field];
    var value = state[field];

    if (value === undefined || value === null || value === '') continue;

    // units stored internally as 'metric'/'imperial', encode as 'm'/'i'
    if (field === 'units') {
      value = value === 'metric' ? 'm' : 'i';
    }

    parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
  }

  // Ground station: lat/lng rounded to 4 decimal places (~11 m precision)
  if (state.groundStation) {
    var lat = parseFloat(state.groundStation.lat).toFixed(4);
    var lng = parseFloat(state.groundStation.lng).toFixed(4);
    parts.push('lat=' + encodeURIComponent(lat));
    parts.push('lng=' + encodeURIComponent(lng));
  }

  // Map zoom
  if (state.zoom !== undefined && state.zoom !== null) {
    parts.push('z=' + encodeURIComponent(state.zoom));
  }

  return parts.join('&');
}

/**
 * Decodes a URL hash string to a partial state object.
 *
 * Unknown preset/antenna keys are returned as-is so the caller can
 * detect and handle missing hardware references (see Task 5 fallback).
 * Returns {} on empty input or any parse error.
 *
 * @param {string} hash - URL hash (with or without leading #)
 * @returns {Object} Partial state — merge over defaults before use
 */
function decodeHashToState(hash) {
  if (!hash) return {};

  var raw = hash.charAt(0) === '#' ? hash.slice(1) : hash;
  if (!raw) return {};

  try {
    var result = {};
    var decodedLat = null;
    var decodedLng = null;
    var pairs = raw.split('&');

    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if (!pair) continue;

      var eq = pair.indexOf('=');
      if (eq === -1) continue;

      var key   = decodeURIComponent(pair.slice(0, eq));
      var value = decodeURIComponent(pair.slice(eq + 1));

      if (key === 'lat') {
        decodedLat = parseFloat(value);
      } else if (key === 'lng') {
        decodedLng = parseFloat(value);
      } else if (key === 'z') {
        var z = parseFloat(value);
        if (!isNaN(z)) result.zoom = z;
      } else if (KEY_TO_FIELD[key]) {
        var fieldName = KEY_TO_FIELD[key];

        if (fieldName === 'units') {
          result[fieldName] = value === 'm' ? 'metric' : 'imperial';
        } else if (fieldName === 'fadeMargin') {
          var n = parseInt(value, 10);
          if (!isNaN(n)) result[fieldName] = n;
        } else {
          // Preset and antenna keys: pass through as-is.
          // Values starting with "custom:" carry inline custom hardware params.
          result[fieldName] = value;
        }
      }
      // Unknown keys are silently ignored for forward-compatibility.
    }

    // Build groundStation as plain {lat, lng} — caller converts to L.latLng()
    if (decodedLat !== null && decodedLng !== null &&
        !isNaN(decodedLat) && !isNaN(decodedLng)) {
      result.groundStation = { lat: decodedLat, lng: decodedLng };
    }

    return result;
  } catch (_) {
    return {};
  }
}
