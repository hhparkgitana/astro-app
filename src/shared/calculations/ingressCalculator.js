/**
 * Ingress Calculator Module
 *
 * Calculates exact moments when the Sun enters cardinal signs (ingresses)
 * and generates mundane astrology charts for those moments.
 *
 * Ingress Types:
 * - Aries Ingress (Spring Equinox) - 0° Aries (~March 20)
 * - Cancer Ingress (Summer Solstice) - 0° Cancer (~June 21)
 * - Libra Ingress (Fall Equinox) - 0° Libra (~September 22)
 * - Capricorn Ingress (Winter Solstice) - 0° Capricorn (~December 21)
 *
 * Each ingress chart is valid for approximately 3 months until the next ingress.
 */

const swissCalc = require('./swissEphemerisCalculator');
const sweph = require('sweph');
const path = require('path');

// Load Swiss Ephemeris constants
const constants = require(path.join(require.resolve('sweph').replace('index.js', ''), 'constants.js'));

/**
 * Ingress target longitudes (ecliptic degrees)
 */
const INGRESS_LONGITUDES = {
  aries: 0,        // 0° Aries (Spring Equinox)
  cancer: 90,      // 0° Cancer (Summer Solstice)
  libra: 180,      // 0° Libra (Fall Equinox)
  capricorn: 270   // 0° Capricorn (Winter Solstice)
};

/**
 * Approximate dates for ingresses (for initial search window)
 * These are used as starting points for the binary search
 */
const APPROXIMATE_INGRESS_DATES = {
  aries: { month: 3, day: 20 },       // March 20
  cancer: { month: 6, day: 21 },      // June 21
  libra: { month: 9, day: 22 },       // September 22
  capricorn: { month: 12, day: 21 }   // December 21
};

/**
 * Convert date/time to Julian Day (UTC)
 */
function dateToJulianDay(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // JavaScript months are 0-based
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  const hourDecimal = hour + minute / 60.0 + second / 3600.0;
  return sweph.julday(year, month, day, hourDecimal, 1); // 1 = Gregorian calendar
}

/**
 * Convert Julian Day to JavaScript Date (UTC)
 */
function julianDayToDate(jd) {
  const result = sweph.revjul(jd, 1); // 1 = Gregorian calendar

  const year = result.year;
  const month = result.month - 1; // JavaScript months are 0-based
  const day = result.day;
  const hourDecimal = result.hour;

  const hour = Math.floor(hourDecimal);
  const minute = Math.floor((hourDecimal - hour) * 60);
  const second = Math.floor(((hourDecimal - hour) * 60 - minute) * 60);

  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Get Sun's ecliptic longitude at a specific Julian Day
 */
function getSunLongitude(jd) {
  const flags = constants.SEFLG_SPEED | constants.SEFLG_SWIEPH;
  const result = sweph.calc_ut(jd, constants.SE_SUN, flags);

  if (result.error) {
    throw new Error(`Swiss Ephemeris error calculating Sun position: ${result.error}`);
  }

  return result.data[0]; // Ecliptic longitude in degrees
}

/**
 * Calculate angular distance considering the circular nature of degrees
 * Returns the shortest arc between two longitudes
 */
function angularDistance(lon1, lon2) {
  let diff = lon2 - lon1;

  // Normalize to -180 to +180
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;

  return diff;
}

/**
 * Find exact moment when Sun crosses a specific ecliptic longitude
 * Uses binary search for precision to within 1 second
 *
 * @param {Date} approximateDate - Approximate date of ingress
 * @param {number} targetLongitude - Target ecliptic longitude (0, 90, 180, or 270)
 * @returns {Date} Exact UTC date/time of ingress
 */
function findExactIngressMoment(approximateDate, targetLongitude) {
  // Search window: 2 days before to 2 days after approximate date
  const searchWindowDays = 2;
  const lowDate = new Date(approximateDate);
  lowDate.setUTCDate(lowDate.getUTCDate() - searchWindowDays);

  const highDate = new Date(approximateDate);
  highDate.setUTCDate(highDate.getUTCDate() + searchWindowDays);

  let lowJd = dateToJulianDay(lowDate);
  let highJd = dateToJulianDay(highDate);

  // Binary search to precision of 1 second (1/86400 of a day)
  const precision = 1 / 86400;

  console.log(`\n=== Finding ${targetLongitude}° ingress ===`);
  console.log(`Search window: ${lowDate.toISOString()} to ${highDate.toISOString()}`);

  let iterationCount = 0;
  while (highJd - lowJd > precision) {
    iterationCount++;
    const midJd = (lowJd + highJd) / 2;
    const sunLon = getSunLongitude(midJd);

    // Calculate angular distance from target (considering circular nature)
    // distance > 0 means target is ahead of Sun (Sun needs to move forward in time)
    // distance < 0 means target is behind Sun (Sun needs to move backward in time)
    const distance = angularDistance(sunLon, targetLongitude);

    if (iterationCount <= 5 || Math.abs(distance) < 0.1) {
      console.log(`Iteration ${iterationCount}: Sun at ${sunLon.toFixed(6)}°, distance = ${distance.toFixed(6)}°`);
    }

    if (Math.abs(distance) < 0.0001) {
      // Found it! (within 0.0001 degrees = ~0.36 arcseconds)
      console.log(`✓ Found exact ingress at iteration ${iterationCount}`);
      const resultDate = julianDayToDate(midJd);
      const finalSunLon = getSunLongitude(midJd);
      console.log(`Final Sun position: ${finalSunLon.toFixed(6)}° (target: ${targetLongitude}°)`);
      console.log(`Ingress time: ${resultDate.toISOString()}`);
      return resultDate;
    }

    // Determine which half to search
    // distance = targetLongitude - sunLongitude (normalized to -180 to +180)
    // If distance > 0: target is ahead of Sun, Sun needs to move forward (higher JD)
    // If distance < 0: target is behind Sun, Sun needs to move backward (lower JD)
    if (distance > 0) {
      // Sun hasn't reached target yet, search later times (upper half)
      lowJd = midJd;
    } else {
      // Sun has passed target, search earlier times (lower half)
      highJd = midJd;
    }
  }

  // Return the midpoint of final range
  const resultJd = (lowJd + highJd) / 2;
  const resultDate = julianDayToDate(resultJd);
  const finalSunLon = getSunLongitude(resultJd);
  console.log(`Binary search complete after ${iterationCount} iterations`);
  console.log(`Final Sun position: ${finalSunLon.toFixed(6)}° (target: ${targetLongitude}°)`);
  console.log(`Difference: ${Math.abs(finalSunLon - targetLongitude).toFixed(6)}°`);
  console.log(`Ingress time: ${resultDate.toISOString()}`);
  return resultDate;
}

/**
 * Calculate exact ingress time for a given year and ingress type
 *
 * @param {number} year - Year (e.g., 2025)
 * @param {string} ingressType - Type of ingress ('aries', 'cancer', 'libra', 'capricorn')
 * @returns {Date} Exact UTC date/time of ingress
 */
function calculateIngressTime(year, ingressType) {
  const ingressTypeLower = ingressType.toLowerCase();

  if (!INGRESS_LONGITUDES.hasOwnProperty(ingressTypeLower)) {
    throw new Error(`Invalid ingress type: ${ingressType}. Must be one of: aries, cancer, libra, capricorn`);
  }

  const targetLongitude = INGRESS_LONGITUDES[ingressTypeLower];
  const approxDate = APPROXIMATE_INGRESS_DATES[ingressTypeLower];

  // Create approximate date for this year
  const approximateDate = new Date(Date.UTC(year, approxDate.month - 1, approxDate.day, 12, 0, 0));

  // Find exact moment
  return findExactIngressMoment(approximateDate, targetLongitude);
}

/**
 * Get the next ingress after a given ingress
 * Used to calculate validity period
 */
function getNextIngressType(currentType) {
  const sequence = ['aries', 'cancer', 'libra', 'capricorn'];
  const currentIndex = sequence.indexOf(currentType.toLowerCase());
  return sequence[(currentIndex + 1) % 4];
}

/**
 * Calculate when an ingress chart expires (next ingress time)
 */
function calculateIngressExpiry(year, ingressType) {
  const nextType = getNextIngressType(ingressType);

  // If current ingress is Capricorn, next ingress (Aries) is in next year
  let nextYear = year;
  if (ingressType.toLowerCase() === 'capricorn') {
    nextYear = year + 1;
  }

  return calculateIngressTime(nextYear, nextType);
}

/**
 * Generate full ingress chart for a specific ingress
 *
 * @param {number} year - Year
 * @param {string} ingressType - Type of ingress ('aries', 'cancer', 'libra', 'capricorn')
 * @param {object} location - Location object with { name, latitude, longitude, timezone }
 * @returns {object} Complete ingress chart with metadata
 */
async function generateIngressChart(year, ingressType, location, orb = 8) {
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    throw new Error('Invalid location. Must include latitude and longitude.');
  }

  // Calculate exact ingress time (UTC)
  const ingressTimeUTC = calculateIngressTime(year, ingressType);

  // Calculate expiry time (next ingress)
  const expiryTimeUTC = calculateIngressExpiry(year, ingressType);

  // Generate natal chart for this moment and location
  const chart = swissCalc.calculateChart({
    year: ingressTimeUTC.getUTCFullYear(),
    month: ingressTimeUTC.getUTCMonth() + 1,
    day: ingressTimeUTC.getUTCDate(),
    hour: ingressTimeUTC.getUTCHours(),
    minute: ingressTimeUTC.getUTCMinutes(),
    latitude: location.latitude,
    longitude: location.longitude,
    houseSystem: 'placidus', // Default to Placidus for mundane astrology
    orb: orb
  });

  // Add ingress-specific metadata
  const ingressChart = {
    ...chart,
    chartType: 'ingress',
    ingressType: ingressType.toLowerCase(),
    ingressYear: year,
    location: {
      name: location.name || `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°`,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone || 'UTC'
    },
    ingressTimeUTC: ingressTimeUTC.toISOString(),
    ingressTimeLocal: ingressTimeUTC, // Can be converted to local time in UI
    validFrom: ingressTimeUTC.toISOString(),
    validUntil: expiryTimeUTC.toISOString(),
    validityDays: Math.round((expiryTimeUTC - ingressTimeUTC) / (1000 * 60 * 60 * 24)),
    sunLongitude: chart.planets.SUN.longitude, // Should be very close to target (0, 90, 180, or 270)
    analysis: analyzeIngressChart(chart)
  };

  return ingressChart;
}

/**
 * Analyze ingress chart for key mundane features
 * Identifies the most important factors for interpretation
 */
function analyzeIngressChart(chart) {
  const analysis = {
    angularPlanets: [],
    angleConjunctions: [],
    tightAspects: [],
    dignities: []
  };

  // Define angular orbs (planets within this many degrees of an angle)
  const ANGULAR_ORB = 8; // degrees

  // Check each planet for angular placement
  const angles = [
    { name: 'Ascendant', longitude: chart.ascendant, house: 1 },
    { name: 'IC', longitude: (chart.midheaven + 180) % 360, house: 4 },
    { name: 'Descendant', longitude: (chart.ascendant + 180) % 360, house: 7 },
    { name: 'Midheaven', longitude: chart.midheaven, house: 10 }
  ];

  for (const [planetKey, planet] of Object.entries(chart.planets)) {
    if (!planet || typeof planet.longitude !== 'number') continue;

    // Check proximity to each angle
    for (const angle of angles) {
      const orb = Math.min(
        Math.abs(planet.longitude - angle.longitude),
        360 - Math.abs(planet.longitude - angle.longitude)
      );

      if (orb <= ANGULAR_ORB) {
        analysis.angularPlanets.push({
          planet: planetKey,
          angle: angle.name,
          house: angle.house,
          orb: orb
        });

        // Tight conjunction (within 3°)
        if (orb <= 3) {
          analysis.angleConjunctions.push({
            planet: planetKey,
            angle: angle.name,
            orb: orb
          });
        }
      }
    }
  }

  // Sort angular planets by orb (tightest first)
  analysis.angularPlanets.sort((a, b) => a.orb - b.orb);
  analysis.angleConjunctions.sort((a, b) => a.orb - b.orb);

  // Find tight aspects (can be expanded with aspect calculator)
  // For now, just flag the most important angular placements

  return analysis;
}

/**
 * Generate multiple ingress charts (batch generation)
 *
 * @param {object} options - Batch generation options
 * @param {number[]} options.years - Array of years to generate
 * @param {string[]} options.ingressTypes - Array of ingress types
 * @param {object[]} options.locations - Array of location objects
 * @returns {Array} Array of ingress charts
 */
async function batchGenerateIngresses(options) {
  const { years, ingressTypes, locations } = options;

  const charts = [];

  for (const year of years) {
    for (const ingressType of ingressTypes) {
      for (const location of locations) {
        try {
          const chart = await generateIngressChart(year, ingressType, location);
          charts.push(chart);
        } catch (error) {
          console.error(`Failed to generate ${ingressType} ${year} for ${location.name}:`, error);
        }
      }
    }
  }

  return charts;
}

/**
 * Get all four ingress times for a given year
 * Useful for displaying annual ingress calendar
 */
function getAnnualIngressCalendar(year) {
  return {
    year: year,
    ingresses: {
      aries: calculateIngressTime(year, 'aries'),
      cancer: calculateIngressTime(year, 'cancer'),
      libra: calculateIngressTime(year, 'libra'),
      capricorn: calculateIngressTime(year, 'capricorn')
    }
  };
}

/**
 * Determine which ingress is currently active for a given date and location
 */
function getCurrentActiveIngress(date = new Date()) {
  const year = date.getUTCFullYear();

  // Get all four ingresses for this year
  const ariesTime = calculateIngressTime(year, 'aries');
  const cancerTime = calculateIngressTime(year, 'cancer');
  const libraTime = calculateIngressTime(year, 'libra');
  const capricornTime = calculateIngressTime(year, 'capricorn');

  // Check which ingress the date falls after
  if (date >= capricornTime) {
    return { type: 'capricorn', year: year, ingressTime: capricornTime };
  } else if (date >= libraTime) {
    return { type: 'libra', year: year, ingressTime: libraTime };
  } else if (date >= cancerTime) {
    return { type: 'cancer', year: year, ingressTime: cancerTime };
  } else if (date >= ariesTime) {
    return { type: 'aries', year: year, ingressTime: ariesTime };
  } else {
    // Before Aries of this year, so Capricorn of previous year is active
    const prevCapricorn = calculateIngressTime(year - 1, 'capricorn');
    return { type: 'capricorn', year: year - 1, ingressTime: prevCapricorn };
  }
}

module.exports = {
  calculateIngressTime,
  calculateIngressExpiry,
  generateIngressChart,
  batchGenerateIngresses,
  getAnnualIngressCalendar,
  getCurrentActiveIngress,
  INGRESS_LONGITUDES
};
