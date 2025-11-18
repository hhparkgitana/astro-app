/**
 * Astrocartography Calculator
 *
 * Calculates planetary lines for astrocartography maps.
 * For each planet, calculates where its four angular positions cross Earth's surface:
 * - Ascendant (ASC): Planet rising on eastern horizon
 * - Descendant (DSC): Planet setting on western horizon
 * - Midheaven (MC): Planet at highest point in sky
 * - Imum Coeli (IC): Planet at lowest point
 */

/**
 * Helper: Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Helper: Convert radians to degrees
 */
function toDegrees(radians) {
  return radians * 180 / Math.PI;
}

/**
 * Helper: Normalize longitude to -180 to +180 range
 */
function normalizeLongitude(lon) {
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}

/**
 * Helper: Normalize angle to 0-360 range
 */
function normalizeAngle(angle) {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

/**
 * Convert ecliptic coordinates (longitude/latitude) to equatorial coordinates (RA/Dec)
 * @param {number} eclipticLon - Ecliptic longitude in degrees
 * @param {number} eclipticLat - Ecliptic latitude in degrees
 * @returns {object} {ra, dec} in degrees
 */
function eclipticToEquatorial(eclipticLon, eclipticLat) {
  const epsilon = 23.4397; // Obliquity of ecliptic (degrees)

  const lambda = toRadians(eclipticLon);
  const beta = toRadians(eclipticLat);
  const eps = toRadians(epsilon);

  // Calculate Right Ascension
  const ra = Math.atan2(
    Math.sin(lambda) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps),
    Math.cos(lambda)
  );

  // Calculate Declination
  const dec = Math.asin(
    Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lambda)
  );

  return {
    ra: normalizeAngle(toDegrees(ra)),
    dec: toDegrees(dec)
  };
}

/**
 * Calculate GMST (Greenwich Mean Sidereal Time) for a given Julian Day
 * @param {number} jd - Julian Day
 * @returns {number} GMST in degrees
 */
function calculateGMST(jd) {
  // Calculate centuries from J2000.0
  const T = (jd - 2451545.0) / 36525.0;

  // GMST at 0h UT (in degrees)
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
             0.000387933 * T * T - (T * T * T) / 38710000.0;

  return normalizeAngle(gmst);
}

/**
 * Calculate Local Sidereal Time
 * @param {number} gmst - Greenwich Mean Sidereal Time in degrees
 * @param {number} longitude - Observer longitude in degrees (positive east)
 * @returns {number} LST in degrees
 */
function calculateLST(gmst, longitude) {
  return normalizeAngle(gmst + longitude);
}

/**
 * Calculate Julian Day from UTC date/time
 * @param {Date} date - JavaScript Date object (in UTC)
 * @returns {number} Julian Day
 */
function dateToJulianDay(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;

  let jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y +
            Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  let jd = jdn + (hour - 12) / 24.0 + minute / 1440.0 + second / 86400.0;

  return jd;
}

/**
 * Calculate Ascendant line coordinates for a planet
 * Returns longitude where planet is on eastern horizon for each latitude
 * @param {number} planetRA - Planet's right ascension in degrees
 * @param {number} planetDec - Planet's declination in degrees
 * @param {number} gmst - Greenwich Mean Sidereal Time in degrees
 * @returns {Array} Array of {lat, lon} coordinates
 */
function calculateAscendantLine(planetRA, planetDec, gmst) {
  const coordinates = [];

  // Iterate through latitudes from -80° to +80° (avoid poles where calculations break down)
  for (let lat = -80; lat <= 80; lat += 1) {
    try {
      // Calculate hour angle when planet is on horizon
      const cosH = -Math.tan(toRadians(lat)) * Math.tan(toRadians(planetDec));

      // Check if planet rises/sets at this latitude
      if (Math.abs(cosH) > 1) {
        // Planet is circumpolar or never rises - skip this latitude
        continue;
      }

      // Hour angle (negative because planet is rising in the east)
      const H = -toDegrees(Math.acos(cosH));

      // LST when planet is on eastern horizon
      const lst = normalizeAngle(planetRA + H);

      // Convert LST to longitude
      const lon = normalizeLongitude(lst - gmst);

      coordinates.push({ lat, lon });
    } catch (e) {
      // Skip any calculation errors
      continue;
    }
  }

  return coordinates;
}

/**
 * Calculate Descendant line coordinates for a planet
 * Returns longitude where planet is on western horizon for each latitude
 * @param {number} planetRA - Planet's right ascension in degrees
 * @param {number} planetDec - Planet's declination in degrees
 * @param {number} gmst - Greenwich Mean Sidereal Time in degrees
 * @returns {Array} Array of {lat, lon} coordinates
 */
function calculateDescendantLine(planetRA, planetDec, gmst) {
  const coordinates = [];

  for (let lat = -80; lat <= 80; lat += 1) {
    try {
      const cosH = -Math.tan(toRadians(lat)) * Math.tan(toRadians(planetDec));

      if (Math.abs(cosH) > 1) {
        continue;
      }

      // Hour angle (positive because planet is setting in the west)
      const H = toDegrees(Math.acos(cosH));

      const lst = normalizeAngle(planetRA + H);
      const lon = normalizeLongitude(lst - gmst);

      coordinates.push({ lat, lon });
    } catch (e) {
      continue;
    }
  }

  return coordinates;
}

/**
 * Calculate Midheaven (MC) line coordinates for a planet
 * Returns longitude where planet is at highest point (culmination)
 * MC line is vertical (constant longitude, varies by latitude)
 * @param {number} planetRA - Planet's right ascension in degrees
 * @param {number} gmst - Greenwich Mean Sidereal Time in degrees
 * @returns {Array} Array of {lat, lon} coordinates
 */
function calculateMCLine(planetRA, gmst) {
  // MC line is where planet's RA equals local sidereal time
  // This gives a vertical line (constant longitude)
  const lon = normalizeLongitude(planetRA - gmst);

  // Return coordinates for all latitudes (it's a vertical line)
  const coordinates = [];
  for (let lat = -80; lat <= 80; lat += 5) {
    coordinates.push({ lat, lon });
  }

  return coordinates;
}

/**
 * Calculate Imum Coeli (IC) line coordinates for a planet
 * Returns longitude where planet is at lowest point (anti-culmination)
 * IC line is vertical (constant longitude), 180° opposite to MC
 * @param {number} planetRA - Planet's right ascension in degrees
 * @param {number} gmst - Greenwich Mean Sidereal Time in degrees
 * @returns {Array} Array of {lat, lon} coordinates
 */
function calculateICLine(planetRA, gmst) {
  // IC line is 180° opposite to MC
  const lon = normalizeLongitude(planetRA - gmst + 180);

  const coordinates = [];
  for (let lat = -80; lat <= 80; lat += 5) {
    coordinates.push({ lat, lon });
  }

  return coordinates;
}

/**
 * Calculate all astrocartography lines for a single planet
 * @param {object} planet - Planet data with longitude, latitude, name
 * @param {Date} birthDate - Birth date/time (JavaScript Date in UTC)
 * @returns {object} Object with ascendant, descendant, mc, ic line coordinates
 */
function calculatePlanetLines(planet, birthDate) {
  // Convert ecliptic coordinates to equatorial
  const { ra, dec } = eclipticToEquatorial(planet.longitude, planet.latitude || 0);

  // Calculate GMST for birth time
  const jd = dateToJulianDay(birthDate);
  const gmst = calculateGMST(jd);

  // Calculate all four lines
  return {
    ascendant: calculateAscendantLine(ra, dec, gmst),
    descendant: calculateDescendantLine(ra, dec, gmst),
    mc: calculateMCLine(ra, gmst),
    ic: calculateICLine(ra, gmst)
  };
}

/**
 * Main function: Calculate all planetary lines for astrocartography
 * @param {object} chartData - Chart data with planets and birth info
 * @returns {object} Object keyed by planet name, each containing line coordinates
 */
export function calculateAstrocartographyLines(chartData) {
  if (!chartData || !chartData.planets) {
    console.error('Invalid chart data for astrocartography');
    return {};
  }

  // Extract birth date from chart data
  // Assuming chartData has birthDate or we can construct it from date/time fields
  let birthDate;
  if (chartData.birthDate) {
    birthDate = new Date(chartData.birthDate);
  } else if (chartData.date) {
    // chartData.date might be an ISO string or Date object
    birthDate = new Date(chartData.date);
  } else if (chartData.utcYear && chartData.utcMonth && chartData.utcDay) {
    birthDate = new Date(Date.UTC(
      chartData.utcYear,
      chartData.utcMonth - 1,
      chartData.utcDay,
      chartData.utcHour || 0,
      chartData.utcMinute || 0
    ));
  } else if (chartData.year && chartData.month && chartData.day) {
    // Try local time fields
    birthDate = new Date(
      chartData.year,
      chartData.month - 1,
      chartData.day,
      chartData.hour || 0,
      chartData.minute || 0
    );
  } else {
    console.error('Could not determine birth date for astrocartography');
    console.error('chartData:', chartData);
    return {};
  }

  console.log('Calculating astrocartography for birth date:', birthDate);

  const planetLines = {};

  // Iterate through all planets in the chart
  for (const [key, planetData] of Object.entries(chartData.planets)) {
    try {
      // Calculate lines for this planet
      const lines = calculatePlanetLines(planetData, birthDate);
      planetLines[planetData.name] = lines;

      console.log(`Calculated astrocartography lines for ${planetData.name}`);
    } catch (error) {
      console.error(`Error calculating astrocartography for ${planetData.name}:`, error);
    }
  }

  return planetLines;
}

/**
 * Get interpretations for planetary lines
 * @param {string} planetName - Name of planet
 * @param {string} lineType - Type of line (ascendant, descendant, mc, ic)
 * @returns {string} Interpretation text
 */
export function getLineInterpretation(planetName, lineType) {
  const interpretations = {
    Sun: {
      ascendant: "Places where your identity and self-expression are emphasized. You shine brightly and are noticed.",
      descendant: "Locations where partnerships and relationships with others help you grow and shine.",
      mc: "Areas where career success, public recognition, and leadership opportunities are heightened.",
      ic: "Regions where you feel at home, connected to roots, and can recharge your vitality."
    },
    Moon: {
      ascendant: "Locations where emotions are close to the surface. You feel sensitive and intuitive.",
      descendant: "Places where emotional connections in relationships are deepened.",
      mc: "Areas where career in nurturing, public service, or emotional work is favored.",
      ic: "Regions that feel like home, where family and domestic life are most fulfilling."
    },
    Mercury: {
      ascendant: "Places where communication, learning, and mental activity are heightened.",
      descendant: "Locations where intellectual partnerships and stimulating conversations flourish.",
      mc: "Areas favorable for careers in writing, teaching, media, or communication.",
      ic: "Regions where study, writing, and intellectual pursuits feel natural."
    },
    Venus: {
      ascendant: "Locations where charm, beauty, and social grace are enhanced.",
      descendant: "Places where love, romance, and harmonious partnerships are favored.",
      mc: "Areas where careers in art, beauty, diplomacy, or entertainment thrive.",
      ic: "Regions where comfort, pleasure, and aesthetic beauty in the home are emphasized."
    },
    Mars: {
      ascendant: "Places where energy, assertiveness, and courage are amplified.",
      descendant: "Locations where passionate, dynamic relationships and conflicts may arise.",
      mc: "Areas where ambitious career pursuits and competitive success are favored.",
      ic: "Regions where active home life or property development are emphasized."
    },
    Jupiter: {
      ascendant: "Locations where optimism, growth, and opportunities are abundant.",
      descendant: "Places where relationships bring expansion, learning, and good fortune.",
      mc: "Areas where career success, recognition, and advancement are highlighted.",
      ic: "Regions where a sense of abundance and philosophical grounding is felt."
    },
    Saturn: {
      ascendant: "Places where discipline, responsibility, and hard work are required.",
      descendant: "Locations where serious, committed relationships and partnerships form.",
      mc: "Areas where career requires persistence but brings lasting achievement.",
      ic: "Regions where establishing foundations and dealing with family karma occur."
    },
    Uranus: {
      ascendant: "Locations where sudden changes, innovation, and independence are highlighted.",
      descendant: "Places where unusual, exciting, or unpredictable relationships occur.",
      mc: "Areas where unconventional careers and sudden opportunities arise.",
      ic: "Regions where home life is unconventional or experiences sudden changes."
    },
    Neptune: {
      ascendant: "Places where imagination, spirituality, and idealism are enhanced.",
      descendant: "Locations where spiritual or idealistic relationships form, but clarity may be lacking.",
      mc: "Areas where careers in arts, healing, or spirituality are favored.",
      ic: "Regions where a deep spiritual connection or sense of transcendence is felt."
    },
    Pluto: {
      ascendant: "Locations where transformation, intensity, and personal power are emphasized.",
      descendant: "Places where deep, transformative, and intense relationships occur.",
      mc: "Areas where career involves power, transformation, or dealing with crises.",
      ic: "Regions where deep psychological work and ancestral healing occur."
    },
    "North Node": {
      ascendant: "Places where destiny and life purpose are activated.",
      descendant: "Locations where karmic relationships that promote growth occur.",
      mc: "Areas where career aligns with soul purpose and destiny.",
      ic: "Regions where family karma and ancestral patterns can be resolved."
    },
    "South Node": {
      ascendant: "Places where past-life patterns and old habits are strong.",
      descendant: "Locations where familiar but potentially limiting relationships occur.",
      mc: "Areas where career draws on past-life skills but may feel limiting.",
      ic: "Regions where ancestral patterns and comfort zones are emphasized."
    },
    Chiron: {
      ascendant: "Locations where healing wounds and mentoring others are highlighted.",
      descendant: "Places where relationships involve healing or trigger old wounds.",
      mc: "Areas where careers in healing, teaching, or counseling are favored.",
      ic: "Regions where family wounds can be healed and wisdom gained."
    }
  };

  return interpretations[planetName]?.[lineType] || "Interpretation not available.";
}

export default {
  calculateAstrocartographyLines,
  getLineInterpretation
};
