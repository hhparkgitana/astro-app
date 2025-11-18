/**
 * Famous Charts Search Calculator
 *
 * Searches through the famous charts database for charts matching specific criteria
 * (aspects, placements, retrogrades)
 */

import famousChartsData from '../../shared/data/famousChartsCalculated.json';

/**
 * Calculate angle between two longitudes
 * @param {number} lon1 - First longitude in degrees
 * @param {number} lon2 - Second longitude in degrees
 * @returns {number} Angle between planets (0-180 degrees)
 */
function calculateAngleBetween(lon1, lon2) {
  let angle = Math.abs(lon1 - lon2);
  if (angle > 180) {
    angle = 360 - angle;
  }
  return angle;
}

/**
 * Check if two planets form a specific aspect
 * @param {number} lon1 - First planet longitude
 * @param {number} lon2 - Second planet longitude
 * @param {string} aspectType - Type of aspect (conjunction, opposition, etc.)
 * @param {number} orb - Orb tolerance in degrees
 * @returns {boolean} True if aspect is formed
 */
function checkAspect(lon1, lon2, aspectType, orb) {
  const angle = calculateAngleBetween(lon1, lon2);

  const aspectAngles = {
    'conjunction': 0,
    'opposition': 180,
    'square': 90,
    'trine': 120,
    'sextile': 60,
    'semisextile': 30,
    'quincunx': 150
  };

  const targetAngle = aspectAngles[aspectType.toLowerCase()];
  if (targetAngle === undefined) return false;

  const diff = Math.abs(angle - targetAngle);
  return diff <= orb;
}

/**
 * Get planet longitude from chart data
 * @param {object} chart - Famous chart object
 * @param {string} planetName - Planet name (lowercase)
 * @returns {number|null} Planet longitude or null if not found
 */
function getPlanetLongitude(chart, planetName) {
  const planetKey = planetName.toLowerCase().replace(' ', '_');
  const planet = chart.calculated?.planets?.[planetKey];
  return planet?.longitude ?? null;
}

/**
 * Get planet sign from chart data
 * @param {object} chart - Famous chart object
 * @param {string} planetName - Planet name (lowercase)
 * @returns {string|null} Planet sign or null if not found
 */
function getPlanetSign(chart, planetName) {
  const planetKey = planetName.toLowerCase().replace(' ', '_');
  const planet = chart.calculated?.planets?.[planetKey];
  return planet?.sign ?? null;
}

/**
 * Get planet retrograde status from chart data
 * @param {object} chart - Famous chart object
 * @param {string} planetName - Planet name (lowercase)
 * @returns {boolean} True if retrograde
 */
function getPlanetRetrograde(chart, planetName) {
  const planetKey = planetName.toLowerCase().replace(' ', '_');
  const planet = chart.calculated?.planets?.[planetKey];
  return planet?.retrograde ?? false;
}

/**
 * Check if chart matches aspect criterion
 * @param {object} chart - Famous chart object
 * @param {object} criterion - Aspect criterion
 * @returns {boolean} True if matches
 */
function matchesAspectCriterion(chart, criterion) {
  // Get planet longitudes or fixed degrees
  let lon1, lon2;

  if (criterion.planet1FixedDegree !== undefined) {
    lon1 = criterion.planet1FixedDegree;
  } else {
    lon1 = getPlanetLongitude(chart, criterion.planet1);
    if (lon1 === null) return false;
  }

  if (criterion.planet2FixedDegree !== undefined) {
    lon2 = criterion.planet2FixedDegree;
  } else {
    lon2 = getPlanetLongitude(chart, criterion.planet2);
    if (lon2 === null) return false;
  }

  return checkAspect(lon1, lon2, criterion.aspect, criterion.orb);
}

/**
 * Check if chart matches placement criterion
 * @param {object} chart - Famous chart object
 * @param {object} criterion - Placement criterion
 * @returns {boolean} True if matches
 */
function matchesPlacementCriterion(chart, criterion) {
  const planetLon = getPlanetLongitude(chart, criterion.planet);
  if (planetLon === null) return false;

  if (criterion.sign) {
    // Sign-based placement
    const planetSign = getPlanetSign(chart, criterion.planet);
    if (!planetSign) return false;

    if (planetSign.toLowerCase() !== criterion.sign.toLowerCase()) {
      return false;
    }

    // Check degree range within sign if specified
    if (criterion.signMinDegree !== undefined || criterion.signMaxDegree !== undefined) {
      const degreeInSign = planetLon % 30;
      const minDeg = criterion.signMinDegree ?? 0;
      const maxDeg = criterion.signMaxDegree ?? 30;

      if (degreeInSign < minDeg || degreeInSign > maxDeg) {
        return false;
      }
    }

    return true;
  } else {
    // Absolute degree range placement
    return planetLon >= criterion.minDegree && planetLon <= criterion.maxDegree;
  }
}

/**
 * Check if chart matches retrograde criterion
 * @param {object} chart - Famous chart object
 * @param {object} criterion - Retrograde criterion
 * @returns {boolean} True if matches
 */
function matchesRetrogradeCriterion(chart, criterion) {
  const isRetrograde = getPlanetRetrograde(chart, criterion.planet);
  return isRetrograde === criterion.isRetrograde;
}

/**
 * Check if chart matches all criteria
 * @param {object} chart - Famous chart object
 * @param {object} criteria - Search criteria
 * @returns {object|null} Match result with details, or null if no match
 */
function matchesAllCriteria(chart, criteria) {
  const matchDetails = {
    aspects: [],
    placements: [],
    retrogrades: []
  };

  // Check aspect criteria
  if (criteria.aspects && criteria.aspects.length > 0) {
    for (const aspectCriterion of criteria.aspects) {
      if (!matchesAspectCriterion(chart, aspectCriterion)) {
        return null; // Must match all criteria
      }

      // Add match details
      matchDetails.aspects.push({
        planet1: aspectCriterion.planet1 || `${aspectCriterion.planet1FixedDegree}°`,
        planet2: aspectCriterion.planet2 || `${aspectCriterion.planet2FixedDegree}°`,
        aspect: aspectCriterion.aspect,
        orb: aspectCriterion.orb
      });
    }
  }

  // Check placement criteria
  if (criteria.placements && criteria.placements.length > 0) {
    for (const placementCriterion of criteria.placements) {
      if (!matchesPlacementCriterion(chart, placementCriterion)) {
        return null;
      }

      // Add match details
      const planetSign = getPlanetSign(chart, placementCriterion.planet);
      matchDetails.placements.push({
        planet: placementCriterion.planet,
        sign: planetSign,
        criteria: placementCriterion.sign ? `in ${placementCriterion.sign}` :
                  `${placementCriterion.minDegree}°-${placementCriterion.maxDegree}°`
      });
    }
  }

  // Check retrograde criteria
  if (criteria.retrograde && criteria.retrograde.length > 0) {
    for (const retrogradeCriterion of criteria.retrograde) {
      if (!matchesRetrogradeCriterion(chart, retrogradeCriterion)) {
        return null;
      }

      // Add match details
      matchDetails.retrogrades.push({
        planet: retrogradeCriterion.planet,
        status: retrogradeCriterion.isRetrograde ? 'Retrograde' : 'Direct'
      });
    }
  }

  return matchDetails;
}

/**
 * Search famous charts database for matches
 * @param {object} criteria - Search criteria object
 * @returns {Array} Array of matching charts with match details
 */
export function searchFamousCharts(criteria) {
  console.log('Searching famous charts with criteria:', criteria);

  const matches = [];

  for (const chart of famousChartsData) {
    const matchDetails = matchesAllCriteria(chart, criteria);

    if (matchDetails) {
      matches.push({
        chart: chart,
        matchDetails: matchDetails
      });
    }
  }

  console.log(`Found ${matches.length} matching charts`);
  return matches;
}

export default {
  searchFamousCharts
};
