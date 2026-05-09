/**
 * terrain.js — Pure terrain / line-of-sight module for FPV Link Budget Estimator.
 *
 * No DOM access. No Leaflet dependency. All functions take inputs and return outputs.
 *
 * Public API:
 *   destinationPoint(lat, lng, bearingDeg, distanceMeters) → {lat, lng}
 *   buildSampleProfile(originLat, originLng, bearingDeg, maxDistanceMeters) → Array
 *   fetchElevations(points) → Promise<Array<number>>
 *   evaluateLineOfSight(elevations, distances, gsElevationMsl, gsAntennaHeightM,
 *                       aircraftAglM, frequencyHz) → {clear, blockingDistanceM, worstClearancePercent}
 *   earthCurvatureDropM(distanceMeters) → number
 *   fresnelRadiusM(d1Meters, totalDistanceMeters, frequencyHz) → number
 */

var EARTH_RADIUS_M       = 6371000;
var RADIO_EARTH_RADIUS_M = 8504000; // 4/3 × Earth radius — accounts for atmospheric refraction
var SPEED_OF_LIGHT       = 3e8;

/**
 * Convert lat/lng + bearing + distance to a destination lat/lng.
 * Uses the spherical Earth approximation (sufficient for FPV ranges).
 */
function destinationPoint(lat, lng, bearingDeg, distanceMeters) {
  var delta   = distanceMeters / EARTH_RADIUS_M;
  var theta   = bearingDeg * Math.PI / 180;
  var phi1    = lat * Math.PI / 180;
  var lambda1 = lng * Math.PI / 180;

  var phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) +
    Math.cos(phi1) * Math.sin(delta) * Math.cos(theta)
  );
  var lambda2 = lambda1 + Math.atan2(
    Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
    Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2)
  );

  return {
    lat: phi2    * 180 / Math.PI,
    lng: lambda2 * 180 / Math.PI
  };
}

/**
 * Build the array of sample points along a bearing from origin to maxDistance.
 * Non-uniform sampling: denser near origin (where Fresnel zones are tightest),
 * sparser at distance. Returns ~14 points per bearing (optimised to stay within
 * Open-Meteo's 100-coords-per-request limit across 36 bearings).
 */
function buildSampleProfile(originLat, originLng, bearingDeg, maxDistanceMeters) {
  var distances = [0, 5, 20, 60, 150, 400];
  var d = 400;
  while (d < maxDistanceMeters) {
    d = d * 1.6;
    if (d >= maxDistanceMeters) break;
    distances.push(Math.round(d));
  }

  // Keep only distances strictly less than max, then append max
  distances = distances.filter(function(x) { return x < maxDistanceMeters; });
  distances.push(maxDistanceMeters);

  // Deduplicate and sort
  distances = distances.filter(function(x, i, arr) { return arr.indexOf(x) === i; });
  distances.sort(function(a, b) { return a - b; });

  return distances.map(function(dist) {
    var pt = dist === 0
      ? { lat: originLat, lng: originLng }
      : destinationPoint(originLat, originLng, bearingDeg, dist);
    return { lat: pt.lat, lng: pt.lng, distanceMeters: dist };
  });
}

/**
 * Fetch elevations for an array of {lat, lng} points from Open-Meteo.
 * Batches into requests of up to 100 coordinates per call.
 * Returns elevations in meters MSL, in the same order as input.
 */
async function fetchElevations(points) {
  var CHUNK_SIZE = 100;
  var CHUNK_DELAY_MS = 400; // pace requests to stay within Open-Meteo rate limits
  var elevations = [];

  for (var i = 0; i < points.length; i += CHUNK_SIZE) {
    if (i > 0) {
      await new Promise(function(resolve) { setTimeout(resolve, CHUNK_DELAY_MS); });
    }

    var chunk = points.slice(i, i + CHUNK_SIZE);
    var lats  = chunk.map(function(p) { return p.lat.toFixed(6); }).join(',');
    var lngs  = chunk.map(function(p) { return p.lng.toFixed(6); }).join(',');
    var url   = 'https://api.open-meteo.com/v1/elevation?latitude=' + lats + '&longitude=' + lngs;

    var response;
    try {
      response = await fetch(url);
    } catch (_) {
      throw new Error('Could not reach elevation service. Check your connection.');
    }
    if (!response.ok) {
      throw new Error('Elevation API error ' + response.status + '. Try again shortly.');
    }
    var data = await response.json();
    if (!data.elevation || !Array.isArray(data.elevation)) {
      throw new Error('Unexpected elevation API response format');
    }
    elevations = elevations.concat(data.elevation);
  }

  return elevations;
}

/**
 * Earth curvature drop at a given distance, in meters.
 * Uses the 4/3 Earth radius approximation for radio propagation.
 * At 10 km ≈ 5.9 m; at 50 km ≈ 147 m.
 */
function earthCurvatureDropM(distanceMeters) {
  return (distanceMeters * distanceMeters) / (2 * RADIO_EARTH_RADIUS_M);
}

/**
 * First Fresnel zone radius at point d1 from one endpoint, total path length totalDistance.
 * Standard formula: r = sqrt(λ × d1 × d2 / (d1 + d2)), λ = c/f.
 * Returns 0 when d1 is 0 or equals totalDistance (Fresnel zone collapses at endpoints).
 */
function fresnelRadiusM(d1Meters, totalDistanceMeters, frequencyHz) {
  var d2 = totalDistanceMeters - d1Meters;
  if (d1Meters <= 0 || d2 <= 0) return 0;
  var lambda = SPEED_OF_LIGHT / frequencyHz;
  return Math.sqrt(lambda * d1Meters * d2 / (d1Meters + d2));
}

/**
 * Determine whether the aircraft has clear line-of-sight along a sampled profile.
 *
 * At each intermediate sample point the direct-path height (linear interpolation
 * between GS antenna tip and aircraft) is compared against the apparent terrain
 * height (raw elevation + Earth curvature). A point is blocked when the direct
 * path clears by less than 60% of the first Fresnel zone radius at that point.
 *
 * @param {Array<number>} elevations  - MSL elevation at each sample (meters)
 * @param {Array<number>} distances   - Distance along profile at each sample (meters)
 * @param {number} gsElevationMsl     - Ground station MSL elevation (meters)
 * @param {number} gsAntennaHeightM   - GS antenna height above ground (meters, default 1.5)
 * @param {number} aircraftAglM       - Aircraft altitude above local terrain (meters)
 * @param {number} frequencyHz        - Operating frequency (Hz)
 * @returns {{ clear: boolean, blockingDistanceM: number|null, worstClearancePercent: number }}
 */
function evaluateLineOfSight(elevations, distances, gsElevationMsl, gsAntennaHeightM,
                              aircraftAglM, frequencyHz) {
  if (gsAntennaHeightM === undefined || gsAntennaHeightM === null) gsAntennaHeightM = 1.5;

  var totalDist   = distances[distances.length - 1];
  var gsHeight    = gsElevationMsl + gsAntennaHeightM;
  var aircraftMsl = elevations[elevations.length - 1] + aircraftAglM;

  var blocked               = false;
  var worstClearancePercent = Infinity;
  var worstDistM            = null;

  // Check every intermediate point (skip origin i=0 and endpoint i=last)
  for (var i = 1; i < distances.length - 1; i++) {
    var d    = distances[i];
    var frac = totalDist > 0 ? d / totalDist : 0;

    // Direct line-of-sight height at this distance
    var directPathHeight = gsHeight + (aircraftMsl - gsHeight) * frac;

    // Apparent terrain: raw elevation + curvature correction
    var apparentTerrain = elevations[i] + earthCurvatureDropM(d);

    // Fresnel radius at this point
    var fresnel = fresnelRadiusM(d, totalDist, frequencyHz);

    // Clearance above apparent terrain
    var clearanceM = directPathHeight - apparentTerrain;

    // Express clearance as percentage of Fresnel radius (60% = practical free-space threshold)
    var clearancePct = fresnel > 0 ? (clearanceM / fresnel) * 100 : (clearanceM > 0 ? Infinity : -Infinity);

    if (clearancePct < worstClearancePercent) {
      worstClearancePercent = clearancePct;
      worstDistM = d;
    }

    if (clearanceM < 0.6 * fresnel) {
      blocked = true;
    }
  }

  return {
    clear:                 !blocked,
    blockingDistanceM:     blocked ? worstDistM : null,
    worstClearancePercent: isFinite(worstClearancePercent) ? worstClearancePercent : 100
  };
}
