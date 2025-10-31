/**
 * Composite Chart Calculator
 * Calculates midpoint charts for relationship analysis
 */

/**
 * Calculate the midpoint between two zodiacal longitudes
 * Handles the circular nature of the zodiac (0-360 degrees)
 * @param {number} long1 - First longitude (0-360)
 * @param {number} long2 - Second longitude (0-360)
 * @returns {number} Midpoint longitude (0-360)
 */
function calculateMidpoint(long1, long2) {
  // Calculate both possible midpoints
  const diff = Math.abs(long2 - long1);

  if (diff <= 180) {
    // Planets are less than 180° apart - use simple average
    return (long1 + long2) / 2;
  } else {
    // Planets are more than 180° apart - use the "short way around"
    const midpoint = ((long1 + long2) / 2 + 180) % 360;
    return midpoint;
  }
}

/**
 * Calculate composite (midpoint) chart between two natal charts
 * @param {Object} chartA - Person A's chart data
 * @param {Object} chartB - Person B's chart data
 * @returns {Object} Composite chart with midpoint planets
 */
export function calculateCompositeChart(chartA, chartB) {
  const compositePlanets = {};

  // Calculate midpoints for each planet
  const planetKeys = ['SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS',
                      'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE', 'PLUTO',
                      'NORTH_NODE', 'SOUTH_NODE'];

  planetKeys.forEach(key => {
    if (chartA.planets[key] && chartB.planets[key]) {
      const planetA = chartA.planets[key];
      const planetB = chartB.planets[key];

      compositePlanets[key] = {
        name: planetA.name,
        longitude: calculateMidpoint(planetA.longitude, planetB.longitude),
        velocity: (planetA.velocity + planetB.velocity) / 2  // Average velocity
      };
    }
  });

  return {
    planets: compositePlanets,
    success: true
  };
}

/**
 * Calculate the geographic midpoint between two locations
 * @param {number} lat1 - Latitude of location 1
 * @param {number} lon1 - Longitude of location 1
 * @param {number} lat2 - Latitude of location 2
 * @param {number} lon2 - Longitude of location 2
 * @returns {Object} { latitude, longitude } of midpoint
 */
export function calculateGeographicMidpoint(lat1, lon1, lat2, lon2) {
  // Convert to radians
  const lat1Rad = lat1 * Math.PI / 180;
  const lon1Rad = lon1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const lon2Rad = lon2 * Math.PI / 180;

  // Convert to Cartesian coordinates
  const x1 = Math.cos(lat1Rad) * Math.cos(lon1Rad);
  const y1 = Math.cos(lat1Rad) * Math.sin(lon1Rad);
  const z1 = Math.sin(lat1Rad);

  const x2 = Math.cos(lat2Rad) * Math.cos(lon2Rad);
  const y2 = Math.cos(lat2Rad) * Math.sin(lon2Rad);
  const z2 = Math.sin(lat2Rad);

  // Calculate midpoint in Cartesian coordinates
  const xMid = (x1 + x2) / 2;
  const yMid = (y1 + y2) / 2;
  const zMid = (z1 + z2) / 2;

  // Convert back to latitude/longitude
  const lonMid = Math.atan2(yMid, xMid);
  const hyp = Math.sqrt(xMid * xMid + yMid * yMid);
  const latMid = Math.atan2(zMid, hyp);

  return {
    latitude: latMid * 180 / Math.PI,
    longitude: lonMid * 180 / Math.PI
  };
}

/**
 * Calculate the midpoint date/time between two birth dates
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {Date} Midpoint date
 */
export function calculateMidpointDate(date1, date2) {
  const time1 = date1.getTime();
  const time2 = date2.getTime();
  const midTime = (time1 + time2) / 2;

  return new Date(midTime);
}
