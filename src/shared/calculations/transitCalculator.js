/**
 * Transit Calculator
 *
 * Calculates when transiting planets form exact aspects to natal positions.
 * Handles retrograde periods and finds multiple exact hits.
 *
 * NOW USING SWISS EPHEMERIS for professional-grade accuracy.
 */

const swissCalc = require('./swissEphemerisCalculator');

// Planet name to Swiss Ephemeris ID mapping
const PLANET_IDS = {
  sun: swissCalc.PLANET_IDS.SUN,
  moon: swissCalc.PLANET_IDS.MOON,
  mercury: swissCalc.PLANET_IDS.MERCURY,
  venus: swissCalc.PLANET_IDS.VENUS,
  mars: swissCalc.PLANET_IDS.MARS,
  jupiter: swissCalc.PLANET_IDS.JUPITER,
  saturn: swissCalc.PLANET_IDS.SATURN,
  uranus: swissCalc.PLANET_IDS.URANUS,
  neptune: swissCalc.PLANET_IDS.NEPTUNE,
  pluto: swissCalc.PLANET_IDS.PLUTO
};

// Aspect angles
const ASPECT_ANGLES = {
  conjunction: 0,
  opposition: 180,
  square: 90,
  trine: 120,
  sextile: 60
};

/**
 * Calculate planet position using Swiss Ephemeris
 */
function getPlanetPosition(planetName, date) {
  const planetId = PLANET_IDS[planetName.toLowerCase()];
  if (planetId === undefined) {
    throw new Error(`Unknown planet: ${planetName}`);
  }

  // Convert JavaScript Date to Julian Day
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // JS months are 0-indexed
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();

  const jd = swissCalc.dateToJulianDay(year, month, day, hour, minute);

  // Calculate position using Swiss Ephemeris
  const position = swissCalc.calculateBody(jd, planetId);

  return {
    longitude: normalizeAngle(position.longitude),
    speed: position.speedLongitude // Swiss Ephemeris returns speed directly
  };
}

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle) {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

/**
 * Calculate angular distance between two positions, considering aspect angle
 */
function getAngularDistance(pos1, pos2, aspectAngle) {
  const diff = normalizeAngle(pos1 - pos2);
  // Calculate distance from aspect angle
  const distance = Math.min(
    Math.abs(diff - aspectAngle),
    Math.abs(diff - aspectAngle + 360),
    Math.abs(diff - aspectAngle - 360)
  );
  return distance;
}

/**
 * Find when a transit aspect becomes exact
 *
 * @param {string} transitPlanet - Name of transiting planet (e.g., 'saturn')
 * @param {string} aspect - Aspect type (e.g., 'conjunction', 'square')
 * @param {number} natalLongitude - Natal planet longitude in degrees
 * @param {Date} startDate - Start of search period
 * @param {Date} endDate - End of search period
 * @param {number} maxOrb - Maximum orb to consider (default 1.0)
 * @returns {Array} Array of exact hit objects with date, orb, and transit details
 */
function findTransitExactitude(transitPlanet, aspect, natalLongitude, startDate, endDate, maxOrb = 1.0) {
  const aspectAngle = ASPECT_ANGLES[aspect.toLowerCase()];
  if (aspectAngle === undefined) {
    throw new Error(`Unknown aspect: ${aspect}`);
  }

  const exactHits = [];

  // Step size in milliseconds: 1 day for outer planets, 0.5 days for inner planets
  const msPerDay = 24 * 60 * 60 * 1000;
  const stepSize = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(transitPlanet.toLowerCase()) ? msPerDay : msPerDay / 2;

  let prevDistance = null;
  let prevSpeed = null;
  let prevDate = null;
  let lastHitTime = null;

  // Minimum time between hits to avoid duplicates (30 days in milliseconds)
  const minTimeBetweenHits = 30 * msPerDay;

  // Iterate through the date range
  for (let currentTime = startDate.getTime(); currentTime <= endDate.getTime(); currentTime += stepSize) {
    try {
      const currentDate = new Date(currentTime);
      const transitPos = getPlanetPosition(transitPlanet, currentDate);
      const distance = getAngularDistance(transitPos.longitude, natalLongitude, aspectAngle);

      // Check if we crossed the exact point (distance decreased then increased)
      if (prevDistance !== null && distance <= maxOrb) {
        // If distance is getting smaller, we're approaching exact
        if (distance < prevDistance && prevSpeed !== null) {
          // Continue to next iteration
        } else if (distance > prevDistance && prevDistance < 0.5) {
          // We passed the exact point AND it was close enough to count
          // Also check cooldown period to avoid duplicate detections
          if (lastHitTime === null || (currentTime - lastHitTime) >= minTimeBetweenHits) {
            const exactTime = interpolateExactMoment(prevDate.getTime(), currentTime, prevDistance, distance);
            const exactDate = new Date(exactTime);
            const exactPos = getPlanetPosition(transitPlanet, exactDate);
            const exactDistance = getAngularDistance(exactPos.longitude, natalLongitude, aspectAngle);

            // Determine if retrograde
            const isRetrograde = transitPos.speed < 0;

            exactHits.push({
              date: exactDate,
              orb: exactDistance,
              transitLongitude: exactPos.longitude,
              natalLongitude: natalLongitude,
              aspect: aspect,
              transitPlanet: transitPlanet,
              isRetrograde: isRetrograde,
              speed: transitPos.speed
            });

            lastHitTime = currentTime;
          }
        }
      }

      prevDistance = distance;
      prevSpeed = transitPos.speed;
      prevDate = currentDate;

    } catch (error) {
      console.error(`Error calculating position at ${currentDate}:`, error);
      continue;
    }
  }

  return exactHits;
}

/**
 * Interpolate to find exact moment of aspect
 */
function interpolateExactMoment(time1, time2, dist1, dist2) {
  // Linear interpolation to find where distance = 0
  const ratio = dist1 / (dist1 + dist2);
  return time1 + ratio * (time2 - time1);
}

/**
 * Find which charts in the database are affected by a transit
 *
 * @param {string} transitPlanet - Transiting planet name
 * @param {Date} transitDate - Date of transit
 * @param {string} natalPlanet - Natal planet to check (or 'any' for all)
 * @param {string} aspect - Aspect type
 * @param {number} orb - Maximum orb
 * @param {Array} chartsDatabase - Array of calculated charts
 * @returns {Array} Charts with matching aspects
 */
function findDatabaseImpact(transitPlanet, transitDate, natalPlanet, aspect, orb, chartsDatabase) {
  const aspectAngle = ASPECT_ANGLES[aspect.toLowerCase()];
  if (aspectAngle === undefined) {
    throw new Error(`Unknown aspect: ${aspect}`);
  }

  // Calculate transit position
  const transitPos = getPlanetPosition(transitPlanet, transitDate);

  const affectedCharts = [];

  // Check each chart in database
  chartsDatabase.forEach(chart => {
    if (!chart.calculated || !chart.calculated.planets) return;

    const matches = [];

    // Determine which natal planets to check
    const planetsToCheck = natalPlanet === 'any'
      ? Object.keys(chart.calculated.planets)
      : [natalPlanet.toLowerCase()];

    planetsToCheck.forEach(natalPlanetKey => {
      const natalPlanetData = chart.calculated.planets[natalPlanetKey];
      if (!natalPlanetData || !natalPlanetData.longitude) return;

      const distance = getAngularDistance(transitPos.longitude, natalPlanetData.longitude, aspectAngle);

      if (distance <= orb) {
        matches.push({
          natalPlanet: natalPlanetKey,
          natalLongitude: natalPlanetData.longitude,
          natalSign: natalPlanetData.sign,
          orb: distance,
          aspect: aspect
        });
      }
    });

    if (matches.length > 0) {
      affectedCharts.push({
        chart: {
          id: chart.id,
          name: chart.name,
          category: chart.category,
          date: chart.date,
          time: chart.time,
          location: chart.location
        },
        transitPlanet: transitPlanet,
        transitLongitude: transitPos.longitude,
        transitDate: transitDate,
        matches: matches
      });
    }
  });

  return affectedCharts;
}

/**
 * Format date for display
 */
function formatDate(date) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/**
 * Get zodiac sign from longitude
 */
function getZodiacSign(longitude) {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const signIndex = Math.floor(longitude / 30);
  const degrees = (longitude % 30).toFixed(2);
  return `${degrees}° ${signs[signIndex]}`;
}

// CommonJS exports
module.exports = {
  findTransitExactitude,
  findDatabaseImpact,
  formatDate,
  getZodiacSign,
  PLANET_IDS,
  ASPECT_ANGLES
};
