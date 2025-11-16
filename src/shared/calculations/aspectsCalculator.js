/**
 * Calculate aspects between planets in a natal chart
 *
 * ⚠️ RENDERER PROCESS ONLY - This file uses ES6 exports for use with Vite in the browser.
 * Main process (Node.js) CANNOT import this file - use chartCalculator.js instead,
 * which has the aspect code inlined in CommonJS format.
 */

const ASPECT_TYPES = {
  CONJUNCTION: { angle: 0, symbol: '☌', name: 'Conjunction' },
  SEMISEXTILE: { angle: 30, symbol: '⚺', name: 'Semi-Sextile' },
  SEXTILE: { angle: 60, symbol: '⚹', name: 'Sextile' },
  SQUARE: { angle: 90, symbol: '□', name: 'Square' },
  TRINE: { angle: 120, symbol: '△', name: 'Trine' },
  QUINCUNX: { angle: 150, symbol: '⚻', name: 'Quincunx' },
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

/**
 * Detect aspect patterns (yods, T-squares, grand trines, grand crosses, kites)
 * @param {Array} aspects - Array of aspect objects with planet1, planet2, type, orb
 * @param {Object} planets - Object of planet objects with name and longitude
 * @returns {Object} Object containing arrays of detected patterns
 */
function detectAspectPatterns(aspects, planets) {
  const patterns = {
    yods: [],
    tSquares: [],
    grandTrines: [],
    grandCrosses: [],
    kites: []
  };

  // Helper to find aspect between two planets
  const findAspectBetween = (p1, p2, aspectType) => {
    return aspects.find(a =>
      (a.planet1 === p1 && a.planet2 === p2 && a.type === aspectType) ||
      (a.planet1 === p2 && a.planet2 === p1 && a.type === aspectType)
    );
  };

  // Detect YODS (Finger of God)
  // Two planets in sextile, both forming quincunx to a third planet (apex)
  aspects.forEach(sextile => {
    if (sextile.type === 'SEXTILE') {
      const p1 = sextile.planet1;
      const p2 = sextile.planet2;

      // Find all planets that form quincunx with both sextile planets
      Object.keys(planets).forEach(apexName => {
        if (apexName === p1 || apexName === p2) return;

        const q1 = findAspectBetween(p1, apexName, 'QUINCUNX');
        const q2 = findAspectBetween(p2, apexName, 'QUINCUNX');

        if (q1 && q2) {
          patterns.yods.push({
            type: 'YOD',
            base1: p1,
            base2: p2,
            apex: apexName,
            sextile: sextile,
            quincunx1: q1,
            quincunx2: q2,
            description: `${p1} and ${p2} in sextile, both quincunx ${apexName}`
          });
        }
      });
    }
  });

  // Detect T-SQUARES
  // Two planets in opposition, third planet squares both
  aspects.forEach(opposition => {
    if (opposition.type === 'OPPOSITION') {
      const p1 = opposition.planet1;
      const p2 = opposition.planet2;

      Object.keys(planets).forEach(apexName => {
        if (apexName === p1 || apexName === p2) return;

        const sq1 = findAspectBetween(p1, apexName, 'SQUARE');
        const sq2 = findAspectBetween(p2, apexName, 'SQUARE');

        if (sq1 && sq2) {
          patterns.tSquares.push({
            type: 'T-SQUARE',
            opposition1: p1,
            opposition2: p2,
            apex: apexName,
            oppositionAspect: opposition,
            square1: sq1,
            square2: sq2,
            description: `${p1} opposite ${p2}, both square ${apexName}`
          });
        }
      });
    }
  });

  // Detect GRAND TRINES
  // Three planets all trine each other
  const planetNames = Object.keys(planets);
  for (let i = 0; i < planetNames.length; i++) {
    for (let j = i + 1; j < planetNames.length; j++) {
      for (let k = j + 1; k < planetNames.length; k++) {
        const p1 = planetNames[i];
        const p2 = planetNames[j];
        const p3 = planetNames[k];

        const t1 = findAspectBetween(p1, p2, 'TRINE');
        const t2 = findAspectBetween(p2, p3, 'TRINE');
        const t3 = findAspectBetween(p3, p1, 'TRINE');

        if (t1 && t2 && t3) {
          patterns.grandTrines.push({
            type: 'GRAND_TRINE',
            planet1: p1,
            planet2: p2,
            planet3: p3,
            trine1: t1,
            trine2: t2,
            trine3: t3,
            description: `${p1}, ${p2}, and ${p3} form a Grand Trine`
          });
        }
      }
    }
  }

  // Detect GRAND CROSSES
  // Four planets: two oppositions crossing, all square each other
  for (let i = 0; i < planetNames.length; i++) {
    for (let j = i + 1; j < planetNames.length; j++) {
      for (let k = j + 1; k < planetNames.length; k++) {
        for (let l = k + 1; l < planetNames.length; l++) {
          const p1 = planetNames[i];
          const p2 = planetNames[j];
          const p3 = planetNames[k];
          const p4 = planetNames[l];

          // Check if we have the required oppositions and squares
          const opp1 = findAspectBetween(p1, p3, 'OPPOSITION');
          const opp2 = findAspectBetween(p2, p4, 'OPPOSITION');

          if (opp1 && opp2) {
            const sq1 = findAspectBetween(p1, p2, 'SQUARE');
            const sq2 = findAspectBetween(p2, p3, 'SQUARE');
            const sq3 = findAspectBetween(p3, p4, 'SQUARE');
            const sq4 = findAspectBetween(p4, p1, 'SQUARE');

            if (sq1 && sq2 && sq3 && sq4) {
              patterns.grandCrosses.push({
                type: 'GRAND_CROSS',
                planet1: p1,
                planet2: p2,
                planet3: p3,
                planet4: p4,
                opposition1: opp1,
                opposition2: opp2,
                squares: [sq1, sq2, sq3, sq4],
                description: `${p1}, ${p2}, ${p3}, and ${p4} form a Grand Cross`
              });
            }
          }
        }
      }
    }
  }

  // Detect KITES
  // Grand trine + one planet opposite one of the trine planets and sextile to the other two
  patterns.grandTrines.forEach(gt => {
    const { planet1, planet2, planet3 } = gt;

    Object.keys(planets).forEach(apexName => {
      if (apexName === planet1 || apexName === planet2 || apexName === planet3) return;

      // Check if apex opposes one trine planet and sextiles the other two
      const opp1 = findAspectBetween(apexName, planet1, 'OPPOSITION');
      const sex2 = findAspectBetween(apexName, planet2, 'SEXTILE');
      const sex3 = findAspectBetween(apexName, planet3, 'SEXTILE');

      if (opp1 && sex2 && sex3) {
        patterns.kites.push({
          type: 'KITE',
          grandTrine: gt,
          apex: apexName,
          opposition: opp1,
          sextiles: [sex2, sex3],
          description: `Kite: ${planet1}, ${planet2}, ${planet3} grand trine with ${apexName} as apex`
        });
        return;
      }

      const opp2 = findAspectBetween(apexName, planet2, 'OPPOSITION');
      const sex1 = findAspectBetween(apexName, planet1, 'SEXTILE');
      const sex3b = findAspectBetween(apexName, planet3, 'SEXTILE');

      if (opp2 && sex1 && sex3b) {
        patterns.kites.push({
          type: 'KITE',
          grandTrine: gt,
          apex: apexName,
          opposition: opp2,
          sextiles: [sex1, sex3b],
          description: `Kite: ${planet1}, ${planet2}, ${planet3} grand trine with ${apexName} as apex`
        });
        return;
      }

      const opp3 = findAspectBetween(apexName, planet3, 'OPPOSITION');
      const sex1b = findAspectBetween(apexName, planet1, 'SEXTILE');
      const sex2b = findAspectBetween(apexName, planet2, 'SEXTILE');

      if (opp3 && sex1b && sex2b) {
        patterns.kites.push({
          type: 'KITE',
          grandTrine: gt,
          apex: apexName,
          opposition: opp3,
          sextiles: [sex1b, sex2b],
          description: `Kite: ${planet1}, ${planet2}, ${planet3} grand trine with ${apexName} as apex`
        });
      }
    });
  });

  return patterns;
}

// ES6 exports for renderer process
export {
  calculateAspects,
  getAngularDistance,
  findAspect,
  getSign,
  isSameSign,
  detectAspectPatterns,
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
    detectAspectPatterns,
    ASPECT_TYPES
  };
}
