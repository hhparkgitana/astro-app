/**
 * Swiss Ephemeris Calculator Module
 *
 * Professional-grade astrological calculations using Swiss Ephemeris.
 * This is the industry standard used by Astro.com, Solar Fire, and all major astrology software.
 *
 * Replaces astronomy-engine with Swiss Ephemeris for:
 * - Planetary positions (Sun through Pluto)
 * - Lunar nodes (True Node and Mean Node)
 * - House calculations (Placidus, Koch, Whole Sign, etc.)
 * - Asteroids (Chiron, Ceres, Pallas, Juno, Vesta, etc.)
 * - High precision ephemeris data
 */

const sweph = require('sweph');
const path = require('path');
const { app } = require('electron');

// Load Swiss Ephemeris constants
const constants = require(path.join(require.resolve('sweph').replace('index.js', ''), 'constants.js'));

// Set ephemeris data path
// In development: use relative path from this file
// In production: use extraResources folder
let ephePath;
if (app && app.isPackaged) {
  // Production: ephemeris files are in Resources/ephe (outside the asar)
  ephePath = path.join(process.resourcesPath, 'ephe');
} else {
  // Development: relative to this file
  ephePath = path.join(__dirname, '..', 'ephe');
}

sweph.set_ephe_path(ephePath);
console.log('Swiss Ephemeris initialized with data path:', ephePath);

// Planet ID mappings (Swiss Ephemeris constants)
const PLANET_IDS = {
  SUN: constants.SE_SUN,           // 0
  MOON: constants.SE_MOON,         // 1
  MERCURY: constants.SE_MERCURY,   // 2
  VENUS: constants.SE_VENUS,       // 3
  MARS: constants.SE_MARS,         // 4
  JUPITER: constants.SE_JUPITER,   // 5
  SATURN: constants.SE_SATURN,     // 6
  URANUS: constants.SE_URANUS,     // 7
  NEPTUNE: constants.SE_NEPTUNE,   // 8
  PLUTO: constants.SE_PLUTO,       // 9
  MEAN_NODE: constants.SE_MEAN_NODE,     // 10 (Mean North Node)
  TRUE_NODE: constants.SE_TRUE_NODE,     // 11 (True North Node)
  MEAN_LILITH: constants.SE_MEAN_APOG,   // 12 (Mean Lunar Apogee / Black Moon Lilith)
  TRUE_LILITH: constants.SE_OSCU_APOG,   // 13 (True/Oscillating Black Moon Lilith)
  CHIRON: constants.SE_CHIRON,     // 15 (Centaur)
  PHOLUS: constants.SE_PHOLUS,     // 16 (Centaur)
  CERES: constants.SE_CERES,       // 17 (Asteroid)
  PALLAS: constants.SE_PALLAS,     // 18 (Asteroid)
  JUNO: constants.SE_JUNO,         // 19 (Asteroid)
  VESTA: constants.SE_VESTA        // 20 (Asteroid)
};

// House system codes
const HOUSE_SYSTEMS = {
  placidus: 'P',
  koch: 'K',
  whole_sign: 'W',
  equal: 'E',
  campanus: 'C',
  regiomontanus: 'R',
  porphyry: 'O',
  morinus: 'M',
  topocentric: 'T'
};

/**
 * Convert date/time to Julian Day
 */
function dateToJulianDay(year, month, day, hour, minute) {
  const hourDecimal = hour + minute / 60.0;
  return sweph.julday(year, month, day, hourDecimal, 1); // 1 = Gregorian calendar
}

/**
 * Calculate position of a celestial body
 */
function calculateBody(jd, bodyId) {
  const flags = constants.SEFLG_SPEED | constants.SEFLG_SWIEPH;
  const result = sweph.calc_ut(jd, bodyId, flags);

  if (result.error) {
    throw new Error(`Swiss Ephemeris error for body ${bodyId}: ${result.error}`);
  }

  return {
    longitude: result.data[0],      // Ecliptic longitude (degrees)
    latitude: result.data[1],       // Ecliptic latitude (degrees)
    distance: result.data[2],       // Distance in AU
    speedLongitude: result.data[3], // Speed in longitude (degrees/day)
    speedLatitude: result.data[4],  // Speed in latitude
    speedDistance: result.data[5]   // Speed in distance
  };
}

/**
 * Calculate house cusps and angles using Swiss Ephemeris
 */
function calculateHouses(jd, latitude, longitude, houseSystem = 'placidus') {
  const hsys = HOUSE_SYSTEMS[houseSystem] || 'P'; // Default to Placidus

  const result = sweph.houses(jd, latitude, longitude, hsys);

  if (result.error) {
    throw new Error(`Swiss Ephemeris houses error: ${result.error}`);
  }

  // Swiss Ephemeris returns:
  // result.data.houses = array of 12 or 36 house cusps (depending on system)
  // result.data.points = [Ascendant, MC, ARMC, Vertex, EquatorialAscendant, ...]

  const houses = result.data.houses.slice(0, 12); // Get first 12 houses
  const ascendant = result.data.points[0];
  const mc = result.data.points[1];

  return {
    houses: houses,
    ascendant: ascendant,
    midheaven: mc,
    descendant: (ascendant + 180) % 360,
    ic: (mc + 180) % 360,
    vertex: result.data.points[3] || null
  };
}

/**
 * Main chart calculation function
 * Compatible with existing chartCalculator.js API
 */
function calculateChart(params) {
  const {
    year,
    month,
    day,
    hour,
    minute,
    utcYear,
    utcMonth,
    utcDay,
    utcHour,
    utcMinute,
    latitude,
    longitude,
    houseSystem = 'placidus'
  } = params;

  try {
    console.log('chartCalculator - Received params:', params);

    // CRITICAL: Use UTC time for Julian Day calculation
    // Swiss Ephemeris requires Universal Time (UT) for accurate calculations
    const useUtcYear = utcYear !== undefined ? utcYear : year;
    const useUtcMonth = utcMonth !== undefined ? utcMonth : month;
    const useUtcDay = utcDay !== undefined ? utcDay : day;
    const useUtcHour = utcHour !== undefined ? utcHour : hour;
    const useUtcMinute = utcMinute !== undefined ? utcMinute : minute;

    // Convert to Julian Day using UTC time
    const jd = dateToJulianDay(useUtcYear, useUtcMonth, useUtcDay, useUtcHour, useUtcMinute);

    // Create UTC date for reference
    const date = new Date(Date.UTC(useUtcYear, useUtcMonth - 1, useUtcDay, useUtcHour, useUtcMinute));
    console.log('chartCalculator - UTC Date object:', date);
    console.log('chartCalculator - Julian Day:', jd);

    // Calculate all planetary positions
    const planets = {};

    // Main planets
    const planetList = [
      { key: 'SUN', id: PLANET_IDS.SUN, name: 'Sun' },
      { key: 'MOON', id: PLANET_IDS.MOON, name: 'Moon' },
      { key: 'MERCURY', id: PLANET_IDS.MERCURY, name: 'Mercury' },
      { key: 'VENUS', id: PLANET_IDS.VENUS, name: 'Venus' },
      { key: 'MARS', id: PLANET_IDS.MARS, name: 'Mars' },
      { key: 'JUPITER', id: PLANET_IDS.JUPITER, name: 'Jupiter' },
      { key: 'SATURN', id: PLANET_IDS.SATURN, name: 'Saturn' },
      { key: 'URANUS', id: PLANET_IDS.URANUS, name: 'Uranus' },
      { key: 'NEPTUNE', id: PLANET_IDS.NEPTUNE, name: 'Neptune' },
      { key: 'PLUTO', id: PLANET_IDS.PLUTO, name: 'Pluto' }
    ];

    // Centaurs
    const centaurList = [
      { key: 'CHIRON', id: PLANET_IDS.CHIRON, name: 'Chiron' },
      { key: 'PHOLUS', id: PLANET_IDS.PHOLUS, name: 'Pholus' }
    ];

    // Asteroids
    const asteroidList = [
      { key: 'CERES', id: PLANET_IDS.CERES, name: 'Ceres' },
      { key: 'PALLAS', id: PLANET_IDS.PALLAS, name: 'Pallas' },
      { key: 'JUNO', id: PLANET_IDS.JUNO, name: 'Juno' },
      { key: 'VESTA', id: PLANET_IDS.VESTA, name: 'Vesta' }
    ];

    // Calculated Points
    const calculatedPointsList = [
      { key: 'MEAN_LILITH', id: PLANET_IDS.MEAN_LILITH, name: 'Lilith (Mean)' },
      { key: 'TRUE_LILITH', id: PLANET_IDS.TRUE_LILITH, name: 'Lilith (True)' }
    ];

    for (const planet of planetList) {
      const position = calculateBody(jd, planet.id);
      planets[planet.key] = {
        name: planet.name,
        longitude: position.longitude,
        velocity: position.speedLongitude
      };
    }

    // Calculate Centaurs
    for (const centaur of centaurList) {
      const position = calculateBody(jd, centaur.id);
      planets[centaur.key] = {
        name: centaur.name,
        longitude: position.longitude,
        velocity: position.speedLongitude
      };
    }

    // Calculate Asteroids
    for (const asteroid of asteroidList) {
      const position = calculateBody(jd, asteroid.id);
      planets[asteroid.key] = {
        name: asteroid.name,
        longitude: position.longitude,
        velocity: position.speedLongitude
      };
    }

    // Calculate Calculated Points (Lilith, etc.)
    for (const point of calculatedPointsList) {
      const position = calculateBody(jd, point.id);
      planets[point.key] = {
        name: point.name,
        longitude: position.longitude,
        velocity: position.speedLongitude
      };
    }

    // Calculate True North Node and South Node
    const trueNodePosition = calculateBody(jd, PLANET_IDS.TRUE_NODE);
    planets.NORTH_NODE = {
      name: 'North Node',
      longitude: trueNodePosition.longitude,
      velocity: trueNodePosition.speedLongitude
    };

    planets.SOUTH_NODE = {
      name: 'South Node',
      longitude: (trueNodePosition.longitude + 180) % 360,
      velocity: trueNodePosition.speedLongitude
    };

    // Calculate houses and angles
    const houseData = calculateHouses(jd, latitude, longitude, houseSystem);

    // Calculate aspects (reuse existing aspect calculation logic)
    const aspects = calculateAspects(planets);

    return {
      success: true,
      planets: planets,
      aspects: aspects,
      ascendant: houseData.ascendant,
      midheaven: houseData.midheaven,
      descendant: houseData.descendant,
      ic: houseData.ic,
      houses: houseData.houses,
      vertex: houseData.vertex,
      date: date.toISOString()
    };

  } catch (error) {
    console.error('Chart calculation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// ASPECT CALCULATION (same logic as chartCalculator.js)
// ============================================================================

const ASPECT_TYPES = {
  CONJUNCTION: { angle: 0, symbol: '☌', name: 'Conjunction', isMajor: true },
  SEMISEXTILE: { angle: 30, symbol: '⚺', name: 'Semi-Sextile', isMajor: false },
  SEXTILE: { angle: 60, symbol: '⚹', name: 'Sextile', isMajor: true },
  SQUARE: { angle: 90, symbol: '□', name: 'Square', isMajor: true },
  TRINE: { angle: 120, symbol: '△', name: 'Trine', isMajor: true },
  QUINCUNX: { angle: 150, symbol: '⚻', name: 'Quincunx', isMajor: false },
  OPPOSITION: { angle: 180, symbol: '☍', name: 'Opposition', isMajor: true }
};

function getAngularDistance(long1, long2) {
  let distance = Math.abs(long1 - long2);
  if (distance > 180) {
    distance = 360 - distance;
  }
  return distance;
}

function findAspect(distance, orb = 8, velocity1 = 0, velocity2 = 0, long1 = 0, long2 = 0) {
  for (const [key, aspect] of Object.entries(ASPECT_TYPES)) {
    // Use the same orb for all aspects (controlled by slider)
    const diff = Math.abs(distance - aspect.angle);
    if (diff <= orb) {
      let applying = null;
      if ((velocity1 !== undefined && velocity2 !== undefined) && (velocity1 !== 0 || velocity2 !== 0)) {
        let separation = (long2 - long1 + 360) % 360;
        if (separation > 180) separation = 360 - separation;
        const relativeVelocity = velocity2 - velocity1;
        let distanceChangeRate;
        if (long2 > long1 && (long2 - long1) <= 180) {
          distanceChangeRate = relativeVelocity;
        } else if (long1 > long2 && (long1 - long2) <= 180) {
          distanceChangeRate = -relativeVelocity;
        } else {
          distanceChangeRate = long2 > long1 ? -relativeVelocity : relativeVelocity;
        }
        const currentOrb = diff;
        if (distance < aspect.angle) {
          applying = distanceChangeRate > 0;
        } else {
          applying = distanceChangeRate < 0;
        }
      }
      return {
        type: key,
        symbol: aspect.symbol,
        name: aspect.name,
        exactAngle: aspect.angle,
        actualAngle: distance,
        orb: diff,
        applying: applying,
        isMajor: aspect.isMajor
      };
    }
  }
  return null;
}

function calculateAspects(planets, orbSettings = {}) {
  const defaultOrb = orbSettings.default || 8;
  const aspects = [];
  const planetArray = Object.entries(planets).map(([key, planet]) => ({
    key,
    name: planet.name,
    longitude: planet.longitude,
    velocity: planet.velocity || 0
  }));
  for (let i = 0; i < planetArray.length; i++) {
    for (let j = i + 1; j < planetArray.length; j++) {
      const planet1 = planetArray[i];
      const planet2 = planetArray[j];
      // Skip North Node - South Node aspects (they're always opposite)
      if ((planet1.name === 'North Node' && planet2.name === 'South Node') ||
          (planet1.name === 'South Node' && planet2.name === 'North Node')) {
        continue;
      }
      const distance = getAngularDistance(planet1.longitude, planet2.longitude);
      const aspect = findAspect(distance, defaultOrb, planet1.velocity, planet2.velocity, planet1.longitude, planet2.longitude);
      if (aspect) {
        aspects.push({
          planet1: planet1.name,
          planet1Key: planet1.key,
          planet2: planet2.name,
          planet2Key: planet2.key,
          ...aspect
        });
      }
    }
  }
  return aspects;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  calculateChart,
  calculateBody,
  calculateHouses,
  dateToJulianDay,
  PLANET_IDS,
  HOUSE_SYSTEMS
};
