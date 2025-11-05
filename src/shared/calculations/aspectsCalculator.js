/**
 * Calculate aspects between planets in a natal chart
 *
 * ⚠️ RENDERER PROCESS ONLY - This file uses ES6 exports for use with Vite in the browser.
 * Main process (Node.js) CANNOT import this file - use chartCalculator.js instead,
 * which has the aspect code inlined in CommonJS format.
 */

const ASPECT_TYPES = {
  CONJUNCTION: { angle: 0, symbol: '☌', name: 'Conjunction' },
  SEXTILE: { angle: 60, symbol: '⚹', name: 'Sextile' },
  SQUARE: { angle: 90, symbol: '□', name: 'Square' },
  TRINE: { angle: 120, symbol: '△', name: 'Trine' },
  OPPOSITION: { angle: 180, symbol: '☍', name: 'Opposition' }
};

/**
 * Calculate the angular distance between two longitudes
 * Normalizes to 0-180 degrees
 */
function getAngularDistance(long1, long2) {
  let distance = Math.abs(long1 - long2);
  
  // Normalize to 0-180 (shortest arc)
  if (distance > 180) {
    distance = 360 - distance;
  }
  
  return distance;
}

/**
 * Check if an angular distance matches an aspect within orb
 * @param {number} distance - Current angular distance
 * @param {number} orb - Maximum orb allowed (user preference)
 * @param {number} velocity1 - Velocity of planet 1 (degrees per day)
 * @param {number} velocity2 - Velocity of planet 2 (degrees per day)
 * @param {number} long1 - Longitude of planet 1
 * @param {number} long2 - Longitude of planet 2
 * @param {number} maxOrb - Maximum orb to check (default 10°)
 * @returns {Object|null} Aspect object with inOrb flag, or null if no aspect found within maxOrb
 */
function findAspect(distance, orb = 8, velocity1 = 0, velocity2 = 0, long1 = 0, long2 = 0, maxOrb = 10) {
  for (const [key, aspect] of Object.entries(ASPECT_TYPES)) {
    const diff = Math.abs(distance - aspect.angle);

    // Check against maximum orb to find ALL potential aspects
    if (diff <= maxOrb) {
      // Log when aspect is found
      console.log(`    🎯 Aspect match: ${aspect.name} (${aspect.angle}°)`);
      console.log(`       Distance: ${distance}°, Diff from exact: ${diff}°, User orb: ${orb}°, Max orb: ${maxOrb}°`);

      // Determine if aspect is within user's preferred orb
      const inOrb = diff <= orb;

      // Calculate if applying or separating
      let applying = null;

      if ((velocity1 !== undefined && velocity2 !== undefined) && (velocity1 !== 0 || velocity2 !== 0)) {
        // Calculate how the angular distance is changing over time
        // For planets moving in the same direction (both direct or both retro):
        // - If planet1 is faster, it's catching up to planet2 (distance decreasing)
        // - If planet2 is faster, they're moving apart (distance increasing)

        // Get the longitudinal separation (accounting for zodiac wraparound)
        let separation = (long2 - long1 + 360) % 360;
        if (separation > 180) separation = 360 - separation;

        // Calculate if the angular distance is decreasing (applying) or increasing (separating)
        // The rate of change of distance depends on relative velocity
        const relativeVelocity = velocity2 - velocity1;

        // Determine if they're moving toward or away from each other
        let distanceChangeRate;
        if (long2 > long1 && (long2 - long1) <= 180) {
          // Planet 2 is ahead of planet 1 (normal case)
          distanceChangeRate = relativeVelocity;
        } else if (long1 > long2 && (long1 - long2) <= 180) {
          // Planet 1 is ahead of planet 2
          distanceChangeRate = -relativeVelocity;
        } else {
          // Wraparound case
          distanceChangeRate = long2 > long1 ? -relativeVelocity : relativeVelocity;
        }

        // Now check if orb is getting tighter (applying) or wider (separating)
        // The orb is the difference between actual distance and exact aspect angle
        const currentOrb = diff; // This is Math.abs(distance - aspect.angle)

        // If distance is less than exact angle, increasing distance means approaching exact
        // If distance is more than exact angle, decreasing distance means approaching exact
        if (distance < aspect.angle) {
          // Need distance to increase to reach exact aspect
          applying = distanceChangeRate > 0;
        } else {
          // Need distance to decrease to reach exact aspect
          applying = distanceChangeRate < 0;
        }
      }

      return {
        type: key,
        symbol: aspect.symbol,
        name: aspect.name,
        exactAngle: aspect.angle,
        actualAngle: distance,
        orb: diff,
        applying: applying,
        inOrb: inOrb  // NEW: Flag indicating if aspect is within user's preferred orb
      };
    }
  }

  return null;
}

/**
 * Calculate all aspects between planets
 * 
 * @param {Object} planets - Object with planet data {name, longitude}
 * @param {Object} orbSettings - Custom orb settings (optional)
 * @returns {Array} Array of aspect objects
 */
function calculateAspects(planets, orbSettings = {}) {
  const defaultOrb = orbSettings.default || 8;
  const aspects = [];
  
  // Get array of planet entries
  const planetArray = Object.entries(planets).map(([key, planet]) => ({
    key,
    name: planet.name,
    longitude: planet.longitude,
    velocity: planet.velocity || 0
  }));
  
  // Calculate aspects for each pair (upper triangular matrix)
  for (let i = 0; i < planetArray.length; i++) {
    for (let j = i + 1; j < planetArray.length; j++) {
      const planet1 = planetArray[i];
      const planet2 = planetArray[j];

      // Skip North Node - South Node aspect (always 180° by definition)
      if ((planet1.name === 'North Node' && planet2.name === 'South Node') ||
          (planet1.name === 'South Node' && planet2.name === 'North Node')) {
        continue;
      }

      // Calculate angular distance
      const distance = getAngularDistance(planet1.longitude, planet2.longitude);

      // Check for aspect (pass velocities for applying/separating calculation)
      const aspect = findAspect(
        distance,
        defaultOrb,
        planet1.velocity,
        planet2.velocity,
        planet1.longitude,
        planet2.longitude
      );

      if (aspect) {
        aspects.push({
          planet1: planet1.name,
          planet1Key: planet1.key,
          planet2: planet2.name,
          planet2Key: planet2.key,
          ...aspect
        });
      }
    }
  }
  
  return aspects;
}

/**
 * Get sign of a longitude
 */
function getSign(longitude) {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const signIndex = Math.floor(longitude / 30);
  return signs[signIndex];
}

/**
 * Check if two planets are in the same sign
 */
function isSameSign(long1, long2) {
  return getSign(long1) === getSign(long2);
}

// ES6 exports for renderer process
export {
  calculateAspects,
  getAngularDistance,
  findAspect,
  getSign,
  isSameSign,
  ASPECT_TYPES
};

// CommonJS exports for main process (backwards compatibility)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateAspects,
    getAngularDistance,
    findAspect,
    getSign,
    isSameSign,
    ASPECT_TYPES
  };
}
