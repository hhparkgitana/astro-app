/**
 * Transit Calculator
 *
 * Calculates when transiting planets form exact aspects to natal positions.
 * Handles retrograde periods and finds multiple exact hits.
 */

const Astronomy = require('astronomy-engine');

// Planet name to Astronomy Engine body mapping
const PLANET_BODIES = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto'
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
 * Calculate planet position using astronomy-engine
 */
function getPlanetPosition(planetName, date) {
  const bodyName = PLANET_BODIES[planetName.toLowerCase()];
  if (!bodyName) {
    throw new Error(`Unknown planet: ${planetName}`);
  }

  // Get ecliptic coordinates
  // Moon uses GeoMoon, other bodies use GeoVector
  let ecliptic, nextEcliptic;

  if (bodyName === 'Moon') {
    ecliptic = Astronomy.Ecliptic(Astronomy.GeoMoon(date));
  } else {
    ecliptic = Astronomy.Ecliptic(Astronomy.GeoVector(bodyName, date, true));
  }

  // Calculate speed by checking position 1 hour later
  const nextDate = new Date(date.getTime() + 3600000); // +1 hour

  if (bodyName === 'Moon') {
    nextEcliptic = Astronomy.Ecliptic(Astronomy.GeoMoon(nextDate));
  } else {
    nextEcliptic = Astronomy.Ecliptic(Astronomy.GeoVector(bodyName, nextDate, true));
  }

  // Speed in degrees per day
  let speed = (nextEcliptic.elon - ecliptic.elon) * 24;

  // Handle 360° wraparound
  if (speed > 180) speed -= 360;
  if (speed < -180) speed += 360;

  return {
    longitude: normalizeAngle(ecliptic.elon),
    speed: speed
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
        } else if (distance > prevDistance) {
          // We passed the exact point, interpolate to find exact moment
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
  PLANET_BODIES,
  ASPECT_ANGLES
};
