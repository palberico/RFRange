/**
 * terrain.js — Pure terrain / line-of-sight module for FPV Link Budget Estimator.
 *
 * No DOM access. No Leaflet dependency. All functions take inputs and return outputs.
 *
 * Public API:
 *   destinationPoint(lat, lng, bearingDeg, distanceMeters) → {lat, lng}
 *   buildSampleProfile(originLat, originLng, bearingDeg, maxDistanceMeters) → Array (10 pts)
 *   buildRefinementProfile(originLat, originLng, bearingDeg, nearDist, farDist) → Array (4 pts)
 *   findReachDistance(elevations, distances, gsElevMsl, gsAntennaH, aircraftAgl, freq) → {reachM, brokeAtSampleIdx}
 *   fetchElevations(points) → Promise<Array<number>>
 *   evaluateLineOfSight(...) → {clear, blockingDistanceM, worstClearancePercent}  [deprecated]
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
 * Build 10 coarse sample points along a bearing using fractional distances.
 * Logarithmic-ish distribution — denser near origin (tight Fresnel zones),
 * enough resolution at range to locate LOS breaks within ~20%.
 * Refinement pass (buildRefinementProfile) zooms in around any break found here.
 *
 * Note: does NOT include a distance=0 origin — the GS point is prepended
 * separately by the caller when batching elevation requests.
 */
function buildSampleProfile(originLat, originLng, bearingDeg, maxDistanceMeters) {
  var fractions = [0.001, 0.01, 0.04, 0.1, 0.18, 0.3, 0.45, 0.6, 0.78, 1.0];
  return fractions.map(function(f) {
    var dist = Math.max(20, maxDistanceMeters * f);
    var dest = destinationPoint(originLat, originLng, bearingDeg, dist);
    return { lat: dest.lat, lng: dest.lng, distanceMeters: dist };
  });
}

/**
 * Generate 4 refinement samples between two distances on a bearing.
 * Used after a coarse pass identifies the approximate break-point to
 * narrow down the exact LOS-break distance.
 *
 * @param {number} nearDist - The last clear distance (meters)
 * @param {number} farDist  - The first blocked distance (meters)
 * @returns {Array<{lat, lng, distanceMeters}>}
 */
function buildRefinementProfile(originLat, originLng, bearingDeg, nearDist, farDist) {
  var samples = [];
  for (var i = 1; i <= 4; i++) {
    var dist = nearDist + (farDist - nearDist) * (i / 5);
    var dest = destinationPoint(originLat, originLng, bearingDeg, dist);
    samples.push({ lat: dest.lat, lng: dest.lng, distanceMeters: dist });
  }
  return samples;
}

/**
 * Walk a sampled profile and return the first distance at which line-of-sight breaks.
 *
 * For each candidate aircraft position (sample i), checks whether any intermediate
 * terrain sample (j < i) would obstruct the straight line from GS to aircraft,
 * accounting for Earth curvature. If LOS holds to the end, returns full reach.
 *
 * Fresnel zone is intentionally omitted here — this answers "can you receive any
 * signal" (link budget permits some obstruction), not "is this free-space quality."
 * Use evaluateLineOfSight for the stricter 60%-Fresnel check.
 *
 * @param {Array<number>} elevations     - Terrain MSL elevation at each sample
 * @param {Array<number>} distances      - Distance along profile at each sample (meters)
 * @param {number} gsElevationMsl
 * @param {number} gsAntennaHeightM
 * @param {number} aircraftAglM
 * @param {number} frequencyHz           - Kept for API symmetry; not used internally
 * @returns {{ reachM: number, brokeAtSampleIdx: number|null }}
 */
function findReachDistance(elevations, distances, gsElevationMsl, gsAntennaHeightM,
                            aircraftAglM, frequencyHz) {
  var maxDist  = distances[distances.length - 1];
  var gsHeight = gsElevationMsl + (gsAntennaHeightM != null ? gsAntennaHeightM : 1.5);

  for (var i = 1; i < distances.length; i++) {
    var aircraftDist = distances[i];
    var aircraftMsl  = elevations[i] + aircraftAglM;

    var blocked = false;
    for (var j = 1; j < i; j++) {
      var dj           = distances[j];
      var directHeight = gsHeight + (aircraftMsl - gsHeight) * (dj / aircraftDist);
      var requiredHeight = elevations[j] + earthCurvatureDropM(dj);
      if (directHeight < requiredHeight) {
        blocked = true;
        break;
      }
    }

    if (blocked) {
      return { reachM: distances[i - 1], brokeAtSampleIdx: i };
    }
  }

  return { reachM: maxDist, brokeAtSampleIdx: null };
}

/**
 * Fetch elevations for an array of {lat, lng} points from Open-Meteo.
 * Batches into requests of up to 100 coordinates per call.
 * Returns elevations in meters MSL, in the same order as input.
 */
async function fetchElevations(points) {
  var CHUNK_SIZE    = 100;
  var CHUNK_DELAY   = 1500; // ms between chunks — paces burst rate
  var MAX_RETRIES   = 3;
  var elevations    = [];

  for (var i = 0; i < points.length; i += CHUNK_SIZE) {
    if (i > 0) {
      await new Promise(function(resolve) { setTimeout(resolve, CHUNK_DELAY); });
    }

    var chunk = points.slice(i, i + CHUNK_SIZE);
    var lats  = chunk.map(function(p) { return p.lat.toFixed(6); }).join(',');
    var lngs  = chunk.map(function(p) { return p.lng.toFixed(6); }).join(',');
    var url   = 'https://api.open-meteo.com/v1/elevation?latitude=' + lats + '&longitude=' + lngs;

    var response;
    var retryDelay = 2000;

    for (var attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise(function(resolve) { setTimeout(resolve, retryDelay); });
        retryDelay *= 2; // 2 s → 4 s → 8 s
      }

      try {
        response = await fetch(url);
      } catch (_) {
        if (attempt === MAX_RETRIES) {
          throw new Error('Could not reach elevation service. Check your connection.');
        }
        continue;
      }

      if (response.status === 429) {
        if (attempt === MAX_RETRIES) {
          throw new Error('Elevation API rate limited. Wait a moment and try again.');
        }
        continue; // back off and retry
      }

      if (!response.ok) {
        throw new Error('Elevation API error ' + response.status + '. Try again shortly.');
      }

      break; // success — exit retry loop
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
 * @deprecated Use findReachDistance for per-bearing reach analysis.
 * Kept for existing unit tests. Will be removed in a later cleanup pass.
 *
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
