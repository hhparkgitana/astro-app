/**
 * Calculate aspects between planets in a natal chart
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
 * @param {number} orb - Maximum orb allowed
 * @param {number} velocity1 - Velocity of planet 1 (degrees per day)
 * @param {number} velocity2 - Velocity of planet 2 (degrees per day)
 * @param {number} long1 - Longitude of planet 1
 * @param {number} long2 - Longitude of planet 2
 */
function findAspect(distance, orb = 8, velocity1 = 0, velocity2 = 0, long1 = 0, long2 = 0) {
  for (const [key, aspect] of Object.entries(ASPECT_TYPES)) {
    const diff = Math.abs(distance - aspect.angle);

    if (diff <= orb) {
      // Calculate if applying or separating
      let applying = null;

      if (velocity1 !== undefined && velocity2 !== undefined) {
        // Calculate relative velocity (how fast they're approaching/separating)
        const relativeVelocity = velocity1 - velocity2;

        // Determine which direction makes them closer to exact aspect
        // If planet1 is "behind" planet2 in zodiac order for this aspect
        let expectedDistance = (long2 - long1 + 360) % 360;
        if (expectedDistance > 180) expectedDistance = 360 - expectedDistance;

        // Compare current distance to exact aspect angle
        if (distance < aspect.angle) {
          // Currently under the exact angle
          // Applying if distance is increasing toward exact angle
          applying = relativeVelocity > 0;
        } else if (distance > aspect.angle) {
          // Currently over the exact angle
          // Applying if distance is decreasing toward exact angle
          applying = relativeVelocity < 0;
        } else {
          // Exact aspect - consider it applying if moving toward tighter orb
          applying = false; // Exact, so technically separating from this point
        }
      }

      return {
        type: key,
        symbol: aspect.symbol,
        name: aspect.name,
        exactAngle: aspect.angle,
        actualAngle: distance,
        orb: diff,
        applying: applying
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

module.exports = {
  calculateAspects,
  getAngularDistance,
  findAspect,
  getSign,
  isSameSign,
  ASPECT_TYPES
};
