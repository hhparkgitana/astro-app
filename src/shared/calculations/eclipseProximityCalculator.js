/**
 * Eclipse Proximity Calculator
 *
 * Calculates eclipse proximity for personal chart birth times.
 * Uses the same database approach as the famous charts enrichment script.
 */

const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

// Zodiac signs
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

/**
 * Get zodiac sign from sign index
 */
function getSignFromIndex(index) {
  return ZODIAC_SIGNS[index] || 'Unknown';
}

/**
 * Format ecliptic longitude as degree/minute/sign
 * @param {number} longitude - Ecliptic longitude (0-360)
 * @returns {string} Formatted position like "21°47' Scorpio"
 */
function formatDegree(longitude) {
  const signIndex = Math.floor(longitude / 30);
  const degree = longitude % 30;
  const wholeDegree = Math.floor(degree);
  const minutes = Math.round((degree - wholeDegree) * 60);
  const sign = getSignFromIndex(signIndex);
  return `${wholeDegree}°${String(minutes).padStart(2, '0')}' ${sign}`;
}

/**
 * Get ephemeris database path
 * Handles both development and production environments
 */
function getEphemerisDbPath() {
  let dbPath;

  if (app && app.isPackaged) {
    // Production: database is in extraResources
    dbPath = path.join(process.resourcesPath, 'ephe', 'ephemeris.db');
  } else {
    // Development: relative to this file
    dbPath = path.join(__dirname, '..', 'data', 'ephemeris.db');
  }

  return dbPath;
}

/**
 * Load all eclipses from database
 * @returns {Array} Array of eclipse records
 */
function loadEclipseDatabase() {
  const dbPath = getEphemerisDbPath();

  try {
    const db = new Database(dbPath, { readonly: true });

    try {
      const stmt = db.prepare('SELECT * FROM eclipses ORDER BY datetime');
      const eclipses = stmt.all();

      console.log(`Eclipse proximity calculator: Loaded ${eclipses.length} eclipses from database`);
      return eclipses;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Error loading eclipse database:', error);
    // Return empty array if database not found or error
    return [];
  }
}

/**
 * Calculate eclipse proximity for a birth date/time
 * @param {Date} birthDateTime - Birth date/time as JavaScript Date object (in UTC)
 * @param {number} maxHours - Maximum hours from birth to consider (default 12)
 * @returns {Object} Eclipse proximity data
 */
function calculateEclipseProximity(birthDateTime, maxHours = 12) {
  // Load eclipse database
  const eclipseDatabase = loadEclipseDatabase();

  if (eclipseDatabase.length === 0) {
    return {
      bornDuringEclipse: false,
      eclipse: null,
      searchThreshold: maxHours,
      error: 'Eclipse database not available'
    };
  }

  const birthMs = birthDateTime.getTime();
  let nearestEclipse = null;
  let nearestHours = Infinity;

  // Find nearest eclipse
  for (const eclipse of eclipseDatabase) {
    const eclipseMs = eclipse.datetime; // Already in milliseconds
    const diffMs = eclipseMs - birthMs;
    const diffHours = Math.abs(diffMs) / (1000 * 60 * 60);

    if (diffHours < nearestHours) {
      nearestHours = diffHours;
      nearestEclipse = {
        ...eclipse,
        hoursFromBirth: diffHours,
        beforeOrAfter: diffMs < 0 ? 'before' : 'after'
      };
    }
  }

  // Check if within threshold
  if (nearestHours <= maxHours) {
    return {
      bornDuringEclipse: true,
      eclipse: {
        type: nearestEclipse.type,
        kind: nearestEclipse.kind,
        dateTime: new Date(nearestEclipse.datetime).toISOString(),
        hoursFromBirth: Math.round(nearestHours * 100) / 100, // 2 decimal places
        sign: getSignFromIndex(nearestEclipse.sign_index),
        degree: Math.round(nearestEclipse.degree_in_sign * 100) / 100,
        longitude: Math.round(nearestEclipse.longitude * 100) / 100,
        formattedPosition: formatDegree(nearestEclipse.longitude),
        beforeOrAfter: nearestEclipse.beforeOrAfter
      },
      searchThreshold: maxHours
    };
  }

  return {
    bornDuringEclipse: false,
    eclipse: null,
    searchThreshold: maxHours
  };
}

module.exports = {
  calculateEclipseProximity,
  loadEclipseDatabase,
  getEphemerisDbPath
};
