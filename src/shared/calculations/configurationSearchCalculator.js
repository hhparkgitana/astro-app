/**
 * Planetary Configuration Search Calculator
 *
 * Searches the ephemeris database for dates/times when specific planetary
 * configurations occur (aspects, sign placements, degree ranges, etc.)
 *
 * Useful for:
 * - Electional astrology (finding auspicious dates)
 * - Mundane astrology research (finding historical patterns)
 * - Transit research
 */

const Database = require('better-sqlite3');
const path = require('path');

// Aspect angles
const ASPECT_ANGLES = {
  conjunction: 0,
  opposition: 180,
  square: 90,
  trine: 120,
  sextile: 60,
  semisextile: 30,
  quincunx: 150
};

// Zodiac signs (0-11 corresponding to Aries-Pisces)
const ZODIAC_SIGNS = {
  aries: 0,
  taurus: 1,
  gemini: 2,
  cancer: 3,
  leo: 4,
  virgo: 5,
  libra: 6,
  scorpio: 7,
  sagittarius: 8,
  capricorn: 9,
  aquarius: 10,
  pisces: 11
};

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle) {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

/**
 * Calculate angular distance between two longitudes considering aspect angle
 */
function getAngularDistance(lon1, lon2, aspectAngle) {
  const diff = normalizeAngle(lon1 - lon2);
  const distance = Math.min(
    Math.abs(diff - aspectAngle),
    Math.abs(diff - aspectAngle + 360),
    Math.abs(diff - aspectAngle - 360)
  );
  return distance;
}

/**
 * Get zodiac sign from longitude
 */
function getZodiacSign(longitude) {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const signIndex = Math.floor(normalizeAngle(longitude) / 30);
  return signs[signIndex];
}

/**
 * Get degree within sign from longitude
 */
function getDegreeInSign(longitude) {
  return normalizeAngle(longitude) % 30;
}

/**
 * Consolidate consecutive timestamps into date ranges
 * Groups results that are within maxGapHours of each other
 */
function consolidateIntoDateRanges(results, maxGapHours = 72) {
  if (results.length === 0) return [];

  const ranges = [];
  let currentRange = {
    startDate: results[0].datetime,
    endDate: results[0].datetime,
    startTimestamp: results[0].timestamp,
    endTimestamp: results[0].timestamp,
    startPositions: results[0].positions,
    endPositions: results[0].positions,
    startData: results[0],  // Keep full data for eclipse results
    endData: results[0]
  };

  for (let i = 1; i < results.length; i++) {
    const timeDiff = results[i].timestamp - currentRange.endTimestamp;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    // If gap is small enough, extend current range
    if (hoursDiff <= maxGapHours) {
      currentRange.endDate = results[i].datetime;
      currentRange.endTimestamp = results[i].timestamp;
      currentRange.endPositions = results[i].positions;
      currentRange.endData = results[i];
    } else {
      // Save current range and start new one
      ranges.push(currentRange);
      currentRange = {
        startDate: results[i].datetime,
        endDate: results[i].datetime,
        startTimestamp: results[i].timestamp,
        endTimestamp: results[i].timestamp,
        startPositions: results[i].positions,
        endPositions: results[i].positions,
        startData: results[i],
        endData: results[i]
      };
    }
  }

  // Don't forget the last range
  ranges.push(currentRange);

  return ranges;
}

/**
 * Search for planetary configurations in ephemeris database
 *
 * @param {Object} criteria - Search criteria
 * @param {Date} startDate - Start of search period
 * @param {Date} endDate - End of search period
 * @param {string} dbPath - Path to ephemeris database
 * @returns {Array} Array of matching datetimes with planetary positions
 *
 * Criteria format:
 * {
 *   aspects: [
 *     { planet1: 'saturn', planet2: 'pluto', aspect: 'square', orb: 2 }
 *   ],
 *   placements: [
 *     { planet: 'uranus', sign: 'gemini' },
 *     { planet: 'mars', minDegree: 120, maxDegree: 150 } // Degree range
 *   ],
 *   retrograde: [
 *     { planet: 'mercury', isRetrograde: true }
 *   ],
 *   eclipses: [
 *     { type: 'solar' },  // any solar eclipse
 *     { type: 'lunar', sign: 'aries' },  // lunar eclipse in Aries
 *     { type: 'solar', sign: 'leo', minDegree: 0, maxDegree: 10 }  // solar eclipse in 0-10° Leo
 *   ]
 * }
 */
function searchPlanetaryConfigurations(criteria, startDate, endDate, dbPath) {
  // Open database
  const db = new Database(dbPath, { readonly: true });

  try {
    // Build WHERE clauses for each criterion
    const whereClauses = [];
    const params = {
      startTime: startDate.getTime(),
      endTime: endDate.getTime()
    };

    // Date range is always required
    whereClauses.push('datetime >= @startTime AND datetime <= @endTime');

    // Add sign placement criteria
    if (criteria.placements) {
      criteria.placements.forEach((placement, index) => {
        const planet = placement.planet.toLowerCase();
        const columnName = `${planet}_lon`;

        if (placement.sign) {
          // Check if planet is in specific sign
          const signIndex = ZODIAC_SIGNS[placement.sign.toLowerCase()];
          const signStart = signIndex * 30;
          const signEnd = (signIndex + 1) * 30;

          // Check if there's an optional degree range within the sign
          if (placement.signMinDegree !== undefined || placement.signMaxDegree !== undefined) {
            const minDeg = placement.signMinDegree !== undefined ? placement.signMinDegree : 0;
            const maxDeg = placement.signMaxDegree !== undefined ? placement.signMaxDegree : 30;
            const absoluteMin = signStart + minDeg;
            const absoluteMax = signStart + maxDeg;
            whereClauses.push(`(${columnName} >= ${absoluteMin} AND ${columnName} <= ${absoluteMax})`);
          } else {
            whereClauses.push(`(${columnName} >= ${signStart} AND ${columnName} < ${signEnd})`);
          }
        } else if (placement.minDegree !== undefined && placement.maxDegree !== undefined) {
          // Check if planet is in degree range
          whereClauses.push(`(${columnName} >= ${placement.minDegree} AND ${columnName} <= ${placement.maxDegree})`);
        }
      });
    }

    // Add retrograde criteria (checking speed)
    if (criteria.retrograde) {
      criteria.retrograde.forEach((retro) => {
        const planet = retro.planet.toLowerCase();
        const speedColumn = `${planet}_speed`;

        if (retro.isRetrograde) {
          whereClauses.push(`${speedColumn} < 0`);
        } else {
          whereClauses.push(`${speedColumn} >= 0`);
        }
      });
    }

    // Build and execute query
    const whereClause = whereClauses.join(' AND ');
    const query = `SELECT * FROM ephemeris WHERE ${whereClause} ORDER BY datetime`;

    const stmt = db.prepare(query);
    let results = stmt.all(params);

    // Post-process to filter aspect criteria (can't do efficiently in SQL)
    if (criteria.aspects && criteria.aspects.length > 0) {
      results = results.filter(row => {
        return criteria.aspects.every(aspectCriteria => {
          // Validate aspect criteria has required fields
          if (!aspectCriteria.aspect) {
            console.error('Invalid aspect criteria: missing aspect type', aspectCriteria);
            return false;
          }

          const aspectAngle = ASPECT_ANGLES[aspectCriteria.aspect.toLowerCase()];
          const orb = aspectCriteria.orb || 2;

          // Get longitude for planet1 (either from database or fixed degree)
          let lon1;
          if (aspectCriteria.planet1FixedDegree !== undefined) {
            lon1 = aspectCriteria.planet1FixedDegree;
          } else if (aspectCriteria.planet1) {
            const planet1 = aspectCriteria.planet1.toLowerCase();
            lon1 = row[`${planet1}_lon`];
          } else {
            console.error('Invalid aspect criteria: neither planet1 nor planet1FixedDegree specified', aspectCriteria);
            return false;
          }

          // Get longitude for planet2 (either from database or fixed degree)
          let lon2;
          if (aspectCriteria.planet2FixedDegree !== undefined) {
            lon2 = aspectCriteria.planet2FixedDegree;
          } else if (aspectCriteria.planet2) {
            const planet2 = aspectCriteria.planet2.toLowerCase();
            lon2 = row[`${planet2}_lon`];
          } else {
            console.error('Invalid aspect criteria: neither planet2 nor planet2FixedDegree specified', aspectCriteria);
            return false;
          }

          const distance = getAngularDistance(lon1, lon2, aspectAngle);
          return distance <= orb;
        });
      });
    }

    // Format results
    const formattedResults = results.map(row => {
      const datetime = new Date(row.datetime);
      const positions = {};

      // Extract all planetary positions
      ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn',
       'uranus', 'neptune', 'pluto', 'north_node'].forEach(planet => {
        if (row[`${planet}_lon`] !== undefined) {
          positions[planet] = {
            longitude: row[`${planet}_lon`],
            sign: getZodiacSign(row[`${planet}_lon`]),
            degreeInSign: getDegreeInSign(row[`${planet}_lon`]).toFixed(2),
            speed: row[`${planet}_speed`],
            isRetrograde: row[`${planet}_speed`] < 0
          };
        }
      });

      return {
        datetime: datetime,
        timestamp: row.datetime,
        positions: positions
      };
    });

    // Consolidate consecutive results into date ranges
    const dateRanges = consolidateIntoDateRanges(formattedResults);

    return {
      ranges: dateRanges,
      totalMatches: formattedResults.length,
      rangeCount: dateRanges.length
    };

  } finally {
    db.close();
  }
}

/**
 * Search for aspects between two planets
 *
 * @param {string} planet1 - First planet name
 * @param {string} planet2 - Second planet name
 * @param {string} aspect - Aspect type (conjunction, square, trine, etc.)
 * @param {number} orb - Maximum orb in degrees
 * @param {Date} startDate - Start of search period
 * @param {Date} endDate - End of search period
 * @param {string} dbPath - Path to ephemeris database
 * @returns {Array} Array of matching dates
 */
function searchAspect(planet1, planet2, aspect, orb, startDate, endDate, dbPath) {
  const criteria = {
    aspects: [{
      planet1: planet1,
      planet2: planet2,
      aspect: aspect,
      orb: orb
    }]
  };

  return searchPlanetaryConfigurations(criteria, startDate, endDate, dbPath);
}

/**
 * Search for planet in sign
 *
 * @param {string} planet - Planet name
 * @param {string} sign - Sign name
 * @param {Date} startDate - Start of search period
 * @param {Date} endDate - End of search period
 * @param {string} dbPath - Path to ephemeris database
 * @returns {Array} Array of matching dates
 */
function searchPlanetInSign(planet, sign, startDate, endDate, dbPath) {
  const criteria = {
    placements: [{
      planet: planet,
      sign: sign
    }]
  };

  return searchPlanetaryConfigurations(criteria, startDate, endDate, dbPath);
}

/**
 * Search for eclipses in ephemeris database
 *
 * @param {Object} criteria - Eclipse search criteria
 * @param {Date} startDate - Start of search period
 * @param {Date} endDate - End of search period
 * @param {string} dbPath - Path to ephemeris database
 * @returns {Object} Object with eclipse ranges and counts
 *
 * Criteria format:
 * {
 *   type: 'solar' or 'lunar' (optional - if omitted, returns both)
 *   sign: 'aries' (optional - zodiac sign name)
 *   minDegree: 0 (optional - minimum degree within sign, 0-29)
 *   maxDegree: 10 (optional - maximum degree within sign, 0-29)
 * }
 */
function searchEclipses(criteria, startDate, endDate, dbPath) {
  const db = new Database(dbPath, { readonly: true });

  try {
    const whereClauses = [];
    const params = {
      startTime: startDate.getTime(),
      endTime: endDate.getTime()
    };

    // Date range is always required
    whereClauses.push('datetime >= @startTime AND datetime <= @endTime');

    // Filter by eclipse type
    if (criteria.type) {
      whereClauses.push(`type = '${criteria.type}'`);
    }

    // Filter by sign
    if (criteria.sign) {
      const signIndex = ZODIAC_SIGNS[criteria.sign.toLowerCase()];
      whereClauses.push(`sign_index = ${signIndex}`);

      // Optional degree range within sign
      if (criteria.minDegree !== undefined || criteria.maxDegree !== undefined) {
        const minDeg = criteria.minDegree !== undefined ? criteria.minDegree : 0;
        const maxDeg = criteria.maxDegree !== undefined ? criteria.maxDegree : 30;
        whereClauses.push(`degree_in_sign >= ${minDeg} AND degree_in_sign <= ${maxDeg}`);
      }
    }

    const whereClause = whereClauses.join(' AND ');
    const query = `SELECT * FROM eclipses WHERE ${whereClause} ORDER BY datetime`;

    const stmt = db.prepare(query);
    const results = stmt.all(params);

    // Format results
    const formattedResults = results.map(row => {
      const datetime = new Date(row.datetime);
      const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                     'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

      return {
        datetime: datetime,
        timestamp: row.datetime,
        type: row.type,
        kind: row.kind,
        longitude: row.longitude,
        sign: signs[row.sign_index],
        degreeInSign: parseFloat(row.degree_in_sign.toFixed(2)),
        positions: {} // Empty positions object for consistency with other searches
      };
    });

    // Consolidate consecutive eclipses into date ranges
    const dateRanges = consolidateIntoDateRanges(formattedResults, 24); // 24 hour gap for eclipses

    return {
      ranges: dateRanges,
      totalMatches: formattedResults.length,
      rangeCount: dateRanges.length
    };

  } finally {
    db.close();
  }
}

/**
 * Get database metadata
 */
function getDatabaseMetadata(dbPath) {
  const db = new Database(dbPath, { readonly: true });

  try {
    const stmt = db.prepare('SELECT * FROM metadata');
    const rows = stmt.all();

    const metadata = {};
    rows.forEach(row => {
      metadata[row.key] = row.value;
    });

    return metadata;
  } finally {
    db.close();
  }
}

module.exports = {
  searchPlanetaryConfigurations,
  searchAspect,
  searchPlanetInSign,
  searchEclipses,
  getDatabaseMetadata,
  ASPECT_ANGLES,
  ZODIAC_SIGNS
};
