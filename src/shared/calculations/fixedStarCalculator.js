/**
 * Fixed Star Calculator
 *
 * Calculates fixed star positions accounting for precession (proper motion)
 * and finds conjunctions with natal planets and angles.
 */

import { getFixedStarsByTier, getFixedStarById } from '../data/fixedStars.js';

/**
 * Julian Day for J2000.0 epoch (January 1, 2000, 12:00 TT)
 */
const J2000_EPOCH = 2451545.0;

/**
 * Convert date to Julian Day
 * @param {Date|string} date - Date object or ISO string
 * @returns {number} Julian Day number
 */
function dateToJulianDay(date) {
  const d = typeof date === 'string' ? new Date(date) : date;

  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1; // JavaScript months are 0-based
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const second = d.getUTCSeconds();

  // Convert to decimal day
  const decimalDay = day + (hour / 24) + (minute / 1440) + (second / 86400);

  // Calculate Julian Day
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;

  let jd = decimalDay + Math.floor((153 * m + 2) / 5) + 365 * y +
           Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  return jd;
}

/**
 * Calculate years elapsed since J2000.0 epoch
 * @param {Date|string} date - Date to calculate from
 * @returns {number} Years elapsed (can be negative for dates before 2000)
 */
function yearsFromJ2000(date) {
  const jd = dateToJulianDay(date);
  const yearsElapsed = (jd - J2000_EPOCH) / 365.25;
  return yearsElapsed;
}

/**
 * Get zodiac sign from ecliptic longitude
 * @param {number} longitude - Ecliptic longitude in degrees (0-360)
 * @returns {string} Zodiac sign name
 */
function getZodiacSign(longitude) {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const normalizedLon = ((longitude % 360) + 360) % 360; // Ensure 0-360
  return signs[Math.floor(normalizedLon / 30)];
}

/**
 * Format position as degrees, minutes, and sign
 * @param {number} longitude - Ecliptic longitude in degrees
 * @returns {string} Formatted position (e.g., "29°52' Leo")
 */
function formatPosition(longitude) {
  const normalizedLon = ((longitude % 360) + 360) % 360;
  const sign = getZodiacSign(normalizedLon);
  const degreeInSign = normalizedLon % 30;
  const degree = Math.floor(degreeInSign);
  const minutes = Math.floor((degreeInSign - degree) * 60);
  return `${degree}°${String(minutes).padStart(2, '0')}' ${sign}`;
}

/**
 * Calculate fixed star position for a given date
 * Accounts for precession (proper motion) from J2000.0 epoch
 *
 * @param {object} star - Fixed star data object
 * @param {Date|string} date - Date to calculate position for
 * @returns {object} Star position with longitude, latitude, sign, etc.
 */
export function calculateFixedStarPosition(star, date) {
  // Calculate years elapsed since J2000.0
  const yearsElapsed = yearsFromJ2000(date);

  // Apply proper motion (precession)
  // Most fixed stars precess at approximately 50.26" per year (0.0139 degrees)
  const currentLongitude = star.longitude2000 + (star.properMotion * yearsElapsed);

  // Normalize to 0-360 range
  const normalizedLongitude = ((currentLongitude % 360) + 360) % 360;

  return {
    starId: star.id,
    starName: star.name,
    longitude: normalizedLongitude,
    latitude: star.latitude, // Latitude stays relatively constant
    sign: getZodiacSign(normalizedLongitude),
    degreeInSign: normalizedLongitude % 30,
    displayPosition: formatPosition(normalizedLongitude),
    magnitude: star.magnitude,
    constellation: star.constellation,
    nature: star.nature,
    interpretation: star.interpretation
  };
}

/**
 * Calculate all fixed star positions for a given date
 *
 * @param {Date|string} date - Date to calculate positions for
 * @param {string} tier - Star tier to use ('tier1', 'tier2', 'all')
 * @returns {Array} Array of star position objects
 */
export function calculateAllFixedStarPositions(date, tier = 'tier1') {
  const stars = getFixedStarsByTier(tier);
  return stars.map(star => calculateFixedStarPosition(star, date));
}

/**
 * Calculate the orb (angular distance) between two longitudes
 * Always returns the shorter arc (0-180 degrees)
 *
 * @param {number} longitude1 - First longitude in degrees
 * @param {number} longitude2 - Second longitude in degrees
 * @returns {number} Orb in degrees (0-180)
 */
function calculateOrb(longitude1, longitude2) {
  let diff = Math.abs(longitude1 - longitude2);
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

/**
 * Check if a planet is applying to (moving toward) a fixed star
 * Compares current orb with orb 1 day in the future
 *
 * @param {object} planet - Planet object with longitude and speed
 * @param {number} starLongitude - Fixed star longitude
 * @returns {boolean} True if applying (orb getting smaller)
 */
function isApplying(planet, starLongitude) {
  if (!planet.speed) return null; // Unknown if no speed data

  // Calculate future position (1 day ahead)
  const futurePlanetLongitude = planet.longitude + planet.speed;

  // Calculate current and future orbs
  const currentOrb = calculateOrb(planet.longitude, starLongitude);
  const futureOrb = calculateOrb(futurePlanetLongitude, starLongitude);

  return futureOrb < currentOrb;
}

/**
 * Find fixed star conjunctions with planets in a natal chart
 *
 * @param {object} chart - Natal chart data with planets and angles
 * @param {string} tier - Star tier to use ('tier1', 'tier2', 'all')
 * @param {number} maxOrb - Maximum orb in degrees (default: use star's individual orb)
 * @returns {Array} Array of conjunction objects, sorted by orb (tightest first)
 */
export function findFixedStarConjunctions(chart, tier = 'tier1', maxOrb = null) {
  const conjunctions = [];

  // Calculate fixed star positions for chart date
  const starPositions = calculateAllFixedStarPositions(chart.date || new Date(), tier);

  // Check conjunctions with planets
  if (chart.planets) {
    for (const planetKey in chart.planets) {
      const planet = chart.planets[planetKey];
      if (!planet || typeof planet.longitude !== 'number') continue;

      for (const starPos of starPositions) {
        const orb = calculateOrb(planet.longitude, starPos.longitude);
        const orbLimit = maxOrb !== null ? maxOrb : starPos.magnitude < 1 ? 2.3 : 1.5;

        if (orb <= orbLimit) {
          conjunctions.push({
            type: 'planet',
            planet: planetKey,
            planetName: planet.name || planetKey,
            planetPosition: planet.longitude,
            planetSign: getZodiacSign(planet.longitude),
            star: starPos.starName,
            starId: starPos.starId,
            starPosition: starPos.longitude,
            starSign: starPos.sign,
            starDisplayPosition: starPos.displayPosition,
            orb: orb,
            isApplying: isApplying(planet, starPos.longitude),
            interpretation: starPos.interpretation,
            nature: starPos.nature,
            magnitude: starPos.magnitude,
            constellation: starPos.constellation
          });
        }
      }
    }
  }

  // Check conjunctions with angles (ASC, MC, DSC, IC)
  const angles = [];

  if (chart.ascendant !== undefined) {
    angles.push({ name: 'Ascendant', key: 'ASC', longitude: chart.ascendant });
    angles.push({ name: 'Descendant', key: 'DSC', longitude: (chart.ascendant + 180) % 360 });
  }

  if (chart.midheaven !== undefined) {
    angles.push({ name: 'Midheaven', key: 'MC', longitude: chart.midheaven });
    angles.push({ name: 'IC', key: 'IC', longitude: (chart.midheaven + 180) % 360 });
  }

  for (const angle of angles) {
    for (const starPos of starPositions) {
      const orb = calculateOrb(angle.longitude, starPos.longitude);
      const orbLimit = maxOrb !== null ? maxOrb : starPos.magnitude < 1 ? 2.3 : 1.5;

      if (orb <= orbLimit) {
        conjunctions.push({
          type: 'angle',
          angle: angle.name,
          angleKey: angle.key,
          anglePosition: angle.longitude,
          angleSign: getZodiacSign(angle.longitude),
          star: starPos.starName,
          starId: starPos.starId,
          starPosition: starPos.longitude,
          starSign: starPos.sign,
          starDisplayPosition: starPos.displayPosition,
          orb: orb,
          isApplying: null, // Angles don't move
          interpretation: starPos.interpretation,
          nature: starPos.nature,
          magnitude: starPos.magnitude,
          constellation: starPos.constellation
        });
      }
    }
  }

  // Sort by orb (tightest conjunctions first)
  return conjunctions.sort((a, b) => a.orb - b.orb);
}

/**
 * Get detailed interpretation for a specific fixed star conjunction
 *
 * @param {object} conjunction - Conjunction object from findFixedStarConjunctions
 * @returns {object} Detailed interpretation with context
 */
export function getFixedStarConjunctionInterpretation(conjunction) {
  const target = conjunction.type === 'planet' ? conjunction.planetName : conjunction.angle;
  const applying = conjunction.isApplying ? ' (applying)' : conjunction.isApplying === false ? ' (separating)' : '';

  return {
    summary: `${target} conjunct ${conjunction.star} (${conjunction.orb.toFixed(2)}° orb${applying})`,
    target: target,
    targetType: conjunction.type,
    star: conjunction.star,
    orb: conjunction.orb,
    orbCategory: conjunction.orb < 1 ? 'very tight' : conjunction.orb < 1.5 ? 'tight' : 'moderate',
    isApplying: conjunction.isApplying,
    nature: conjunction.nature,
    magnitude: conjunction.magnitude,
    constellation: conjunction.constellation,
    positive: conjunction.interpretation.positive,
    negative: conjunction.interpretation.negative,
    general: conjunction.interpretation.general
  };
}

/**
 * Find charts in a collection that have specific fixed star conjunctions
 * Useful for searching famous charts database
 *
 * @param {Array} charts - Array of chart objects
 * @param {string} starId - Fixed star ID to search for
 * @param {string} target - Planet or angle to check (e.g., 'sun', 'ASC')
 * @param {number} maxOrb - Maximum orb in degrees
 * @param {string} tier - Star tier to use
 * @returns {Array} Array of matching charts with conjunction details
 */
export function searchChartsForFixedStarConjunction(charts, starId, target = null, maxOrb = 2, tier = 'tier1') {
  const matches = [];

  for (const chart of charts) {
    const conjunctions = findFixedStarConjunctions(chart, tier, maxOrb);

    // Filter conjunctions for the specified star
    const starConjunctions = conjunctions.filter(c => c.starId === starId);

    // If target specified, filter further
    const relevantConjunctions = target
      ? starConjunctions.filter(c =>
          (c.type === 'planet' && c.planet.toLowerCase() === target.toLowerCase()) ||
          (c.type === 'angle' && c.angleKey.toLowerCase() === target.toLowerCase())
        )
      : starConjunctions;

    if (relevantConjunctions.length > 0) {
      matches.push({
        chart: chart,
        conjunctions: relevantConjunctions
      });
    }
  }

  return matches;
}

/**
 * Get a summary of all fixed star conjunctions in a chart
 * Groups by star and provides statistics
 *
 * @param {object} chart - Natal chart data
 * @param {string} tier - Star tier to use
 * @param {number} maxOrb - Maximum orb in degrees
 * @returns {object} Summary with counts, tightest conjunction, etc.
 */
export function getFixedStarSummary(chart, tier = 'tier1', maxOrb = null) {
  const conjunctions = findFixedStarConjunctions(chart, tier, maxOrb);

  // Group by star
  const byStar = {};
  for (const conj of conjunctions) {
    if (!byStar[conj.starId]) {
      byStar[conj.starId] = [];
    }
    byStar[conj.starId].push(conj);
  }

  // Find tightest conjunction
  const tightest = conjunctions.length > 0 ? conjunctions[0] : null;

  // Count by type
  const planetConjunctions = conjunctions.filter(c => c.type === 'planet');
  const angleConjunctions = conjunctions.filter(c => c.type === 'angle');

  return {
    totalConjunctions: conjunctions.length,
    planetConjunctions: planetConjunctions.length,
    angleConjunctions: angleConjunctions.length,
    uniqueStars: Object.keys(byStar).length,
    tightestConjunction: tightest,
    byType: {
      planet: planetConjunctions,
      angle: angleConjunctions
    },
    all: conjunctions
  };
}

export default {
  calculateFixedStarPosition,
  calculateAllFixedStarPositions,
  findFixedStarConjunctions,
  getFixedStarConjunctionInterpretation,
  searchChartsForFixedStarConjunction,
  getFixedStarSummary,
  formatPosition,
  getZodiacSign
};
