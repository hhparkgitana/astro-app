/**
 * Famous Charts Database Search Utility
 *
 * Provides filtering capabilities for the calculated famous charts database
 * based on astrological criteria
 */

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const PLANETS = [
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter',
  'saturn', 'uranus', 'neptune', 'pluto', 'north_node', 'south_node'
];

const ASPECT_TYPES = ['conjunction', 'opposition', 'square', 'trine', 'sextile'];

/**
 * Search criteria interface:
 * {
 *   planetInSign: [{ planet: 'moon', sign: 'Pisces' }],
 *   planetInHouse: [{ planet: 'venus', house: 10 }],
 *   ascendantSign: 'Virgo',
 *   aspects: [{ planet1: 'sun', planet2: 'uranus', aspect: 'conjunction', maxOrb: 3 }],
 *   category: 'musicians'
 * }
 */

/**
 * Check if a chart matches planet in sign criteria
 */
function matchesPlanetInSign(chart, criteria) {
  if (!criteria.planetInSign || criteria.planetInSign.length === 0) return true;
  if (!chart.calculated || !chart.calculated.planets) return false;

  return criteria.planetInSign.every(({ planet, sign }) => {
    const planetData = chart.calculated.planets[planet.toLowerCase()];
    if (!planetData) return false;
    return planetData.sign === sign;
  });
}

/**
 * Check if a chart matches planet in house criteria
 */
function matchesPlanetInHouse(chart, criteria) {
  if (!criteria.planetInHouse || criteria.planetInHouse.length === 0) return true;
  if (!chart.calculated || !chart.calculated.planets) return false;

  return criteria.planetInHouse.every(({ planet, house }) => {
    const planetData = chart.calculated.planets[planet.toLowerCase()];
    if (!planetData || planetData.house === null) return false;
    return planetData.house === house;
  });
}

/**
 * Check if a chart matches ascendant sign criteria
 */
function matchesAscendantSign(chart, criteria) {
  if (!criteria.ascendantSign) return true;
  if (!chart.calculated || !chart.calculated.angles || !chart.calculated.angles.ascendant) {
    return false;
  }

  return chart.calculated.angles.ascendant.sign === criteria.ascendantSign;
}

/**
 * Check if a chart has a specific aspect
 */
function matchesAspects(chart, criteria) {
  if (!criteria.aspects || criteria.aspects.length === 0) return true;
  if (!chart.calculated || !chart.calculated.major_aspects) return false;

  return criteria.aspects.every(({ planet1, planet2, aspect, maxOrb }) => {
    return chart.calculated.major_aspects.some(chartAspect => {
      // Check both orderings (planet1-planet2 or planet2-planet1)
      const matchesPlanets =
        (chartAspect.planet1 === planet1.toLowerCase() && chartAspect.planet2 === planet2.toLowerCase()) ||
        (chartAspect.planet1 === planet2.toLowerCase() && chartAspect.planet2 === planet1.toLowerCase());

      const matchesAspectType = !aspect || chartAspect.aspect === aspect.toLowerCase();

      const matchesOrb = !maxOrb || chartAspect.orb <= maxOrb;

      return matchesPlanets && matchesAspectType && matchesOrb;
    });
  });
}

/**
 * Check if a chart matches category criteria
 */
function matchesCategory(chart, criteria) {
  if (!criteria.category) return true;

  const searchTerm = criteria.category.toLowerCase();
  const chartCategory = (chart.category || '').toLowerCase();
  const chartTags = (chart.tags || []).map(tag => tag.toLowerCase());

  // Match if category contains search term or any tag contains it
  return chartCategory.includes(searchTerm) ||
         chartTags.some(tag => tag.includes(searchTerm));
}

/**
 * Search the famous charts database with given criteria
 *
 * @param {Array} chartsDatabase - The famous charts array
 * @param {Object} criteria - Search criteria object
 * @param {Object} options - Search options (e.g., matchMode: 'all' or 'threshold', minMatches: N)
 * @returns {Array} Matching charts
 */
function searchCharts(chartsDatabase, criteria, options = {}) {
  if (!chartsDatabase || !Array.isArray(chartsDatabase)) {
    return [];
  }

  const matchMode = options.matchMode || 'all'; // 'all' or 'threshold'
  const minMatches = options.minMatches || 1;

  return chartsDatabase.filter(chart => {
    // Skip charts without calculated data if we're searching for calculated properties
    const needsCalculatedData =
      criteria.planetInSign ||
      criteria.planetInHouse ||
      criteria.ascendantSign ||
      criteria.aspects;

    if (needsCalculatedData && !chart.calculated) {
      return false;
    }

    if (matchMode === 'all') {
      // All criteria must match (AND logic)
      return (
        matchesPlanetInSign(chart, criteria) &&
        matchesPlanetInHouse(chart, criteria) &&
        matchesAscendantSign(chart, criteria) &&
        matchesAspects(chart, criteria) &&
        matchesCategory(chart, criteria)
      );
    } else if (matchMode === 'threshold') {
      // Count how many individual criteria match
      let matchCount = 0;
      let totalCriteria = 0;

      // Check each planet in sign individually
      if (criteria.planetInSign && criteria.planetInSign.length > 0) {
        criteria.planetInSign.forEach(({ planet, sign }) => {
          totalCriteria++;
          const planetData = chart.calculated?.planets?.[planet.toLowerCase()];
          if (planetData && planetData.sign === sign) {
            matchCount++;
          }
        });
      }

      // Check each planet in house individually
      if (criteria.planetInHouse && criteria.planetInHouse.length > 0) {
        criteria.planetInHouse.forEach(({ planet, house }) => {
          totalCriteria++;
          const planetData = chart.calculated?.planets?.[planet.toLowerCase()];
          if (planetData && planetData.house === house) {
            matchCount++;
          }
        });
      }

      // Check ascendant sign
      if (criteria.ascendantSign) {
        totalCriteria++;
        if (chart.calculated?.angles?.ascendant?.sign === criteria.ascendantSign) {
          matchCount++;
        }
      }

      // Check each aspect individually
      if (criteria.aspects && criteria.aspects.length > 0) {
        criteria.aspects.forEach(({ planet1, planet2, aspect, maxOrb }) => {
          totalCriteria++;
          const hasAspect = chart.calculated?.major_aspects?.some(chartAspect => {
            const matchesPlanets =
              (chartAspect.planet1 === planet1.toLowerCase() && chartAspect.planet2 === planet2.toLowerCase()) ||
              (chartAspect.planet1 === planet2.toLowerCase() && chartAspect.planet2 === planet1.toLowerCase());
            const matchesAspectType = !aspect || chartAspect.aspect === aspect.toLowerCase();
            const matchesOrb = !maxOrb || chartAspect.orb <= maxOrb;
            return matchesPlanets && matchesAspectType && matchesOrb;
          });
          if (hasAspect) {
            matchCount++;
          }
        });
      }

      // Check category
      if (criteria.category) {
        totalCriteria++;
        const searchTerm = criteria.category.toLowerCase();
        const chartCategory = (chart.category || '').toLowerCase();
        const chartTags = (chart.tags || []).map(tag => tag.toLowerCase());
        if (chartCategory.includes(searchTerm) || chartTags.some(tag => tag.includes(searchTerm))) {
          matchCount++;
        }
      }

      return matchCount >= minMatches;
    }

    return false;
  });
}

/**
 * Format search results for display
 *
 * @param {Array} results - Search results
 * @param {Object} criteria - The search criteria used
 * @returns {Object} Formatted results with metadata
 */
function formatSearchResults(results, criteria) {
  return {
    count: results.length,
    criteria: criteria,
    results: results.map(chart => ({
      id: chart.id,
      name: chart.name,
      category: chart.category,
      date: chart.date,
      time: chart.time,
      location: chart.location,
      notes: chart.notes,
      roddenRating: chart.roddenRating,
      // Include matching criteria highlights
      matchedCriteria: getMatchedCriteria(chart, criteria)
    }))
  };
}

/**
 * Get human-readable description of what criteria matched for this chart
 */
function getMatchedCriteria(chart, criteria) {
  const matched = [];

  // Check each planet in sign individually
  if (criteria.planetInSign) {
    criteria.planetInSign.forEach(({ planet, sign }) => {
      const planetData = chart.calculated?.planets?.[planet.toLowerCase()];
      if (planetData && planetData.sign === sign) {
        matched.push(`${capitalizeFirst(planet)} in ${sign}`);
      }
    });
  }

  // Check each planet in house individually
  if (criteria.planetInHouse) {
    criteria.planetInHouse.forEach(({ planet, house }) => {
      const planetData = chart.calculated?.planets?.[planet.toLowerCase()];
      if (planetData && planetData.house === house) {
        matched.push(`${capitalizeFirst(planet)} in ${getOrdinal(house)} house`);
      }
    });
  }

  // Check ascendant sign
  if (criteria.ascendantSign) {
    if (chart.calculated?.angles?.ascendant?.sign === criteria.ascendantSign) {
      matched.push(`${criteria.ascendantSign} rising`);
    }
  }

  // Check each aspect individually
  if (criteria.aspects) {
    criteria.aspects.forEach(({ planet1, planet2, aspect, maxOrb }) => {
      const hasAspect = chart.calculated?.major_aspects?.some(chartAspect => {
        const matchesPlanets =
          (chartAspect.planet1 === planet1.toLowerCase() && chartAspect.planet2 === planet2.toLowerCase()) ||
          (chartAspect.planet1 === planet2.toLowerCase() && chartAspect.planet2 === planet1.toLowerCase());
        const matchesAspectType = !aspect || chartAspect.aspect === aspect.toLowerCase();
        const matchesOrb = !maxOrb || chartAspect.orb <= maxOrb;
        return matchesPlanets && matchesAspectType && matchesOrb;
      });

      if (hasAspect) {
        const aspectStr = aspect ? ` ${aspect}` : '';
        const orbStr = maxOrb ? ` (within ${maxOrb}°)` : '';
        matched.push(`${capitalizeFirst(planet1)}${aspectStr} ${capitalizeFirst(planet2)}${orbStr}`);
      }
    });
  }

  // Check category
  if (criteria.category) {
    const searchTerm = criteria.category.toLowerCase();
    const chartCategory = (chart.category || '').toLowerCase();
    const chartTags = (chart.tags || []).map(tag => tag.toLowerCase());
    if (chartCategory.includes(searchTerm) || chartTags.some(tag => tag.includes(searchTerm))) {
      matched.push(`Category: ${criteria.category}`);
    }
  }

  return matched;
}

/**
 * Helper: Capitalize first letter
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
}

/**
 * Helper: Get ordinal number (1st, 2nd, 3rd, etc.)
 */
function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// CommonJS exports for Node.js (main process)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    searchCharts,
    formatSearchResults,
    ZODIAC_SIGNS,
    PLANETS,
    ASPECT_TYPES
  };
}

// ES6 exports for renderer process
if (typeof exports !== 'undefined') {
  exports.searchCharts = searchCharts;
  exports.formatSearchResults = formatSearchResults;
  exports.ZODIAC_SIGNS = ZODIAC_SIGNS;
  exports.PLANETS = PLANETS;
  exports.ASPECT_TYPES = ASPECT_TYPES;
}
