/**
 * Horary Astrology Analysis Calculator
 *
 * Provides specialized analysis for horary charts including:
 * - Chart radicality checks (considerations before judgment)
 * - Significator identification
 * - Moon analysis (void of course, next aspects)
 * - Essential and accidental dignities
 * - Traditional horary techniques
 */

/**
 * Normalize degree to 0-360 range
 */
function normalizeDegree(deg) {
  while (deg < 0) deg += 360;
  while (deg >= 360) deg -= 360;
  return deg;
}

/**
 * Get the sign of a planet (0-11, where 0=Aries, 1=Taurus, etc.)
 */
function getSign(longitude) {
  return Math.floor(normalizeDegree(longitude) / 30);
}

/**
 * Get degree within sign (0-30)
 */
function getDegreeInSign(longitude) {
  return normalizeDegree(longitude) % 30;
}

/**
 * Planet rulerships for essential dignity
 */
const RULERSHIPS = {
  domicile: {
    0: 'Mars',      // Aries
    1: 'Venus',     // Taurus
    2: 'Mercury',   // Gemini
    3: 'Moon',      // Cancer
    4: 'Sun',       // Leo
    5: 'Mercury',   // Virgo
    6: 'Venus',     // Libra
    7: 'Mars',      // Scorpio (traditional)
    8: 'Jupiter',   // Sagittarius
    9: 'Saturn',    // Capricorn
    10: 'Saturn',   // Aquarius (traditional)
    11: 'Jupiter'   // Pisces (traditional)
  },
  exaltation: {
    0: 'Sun',       // Aries
    1: 'Moon',      // Taurus
    2: null,        // Gemini
    3: 'Jupiter',   // Cancer
    4: null,        // Leo
    5: 'Mercury',   // Virgo
    6: 'Saturn',    // Libra
    7: null,        // Scorpio
    8: null,        // Sagittarius
    9: 'Mars',      // Capricorn
    10: null,       // Aquarius
    11: 'Venus'     // Pisces
  },
  detriment: {
    6: 'Mars',      // Libra
    7: 'Venus',     // Scorpio
    8: 'Mercury',   // Sagittarius
    9: 'Moon',      // Capricorn
    10: 'Sun',      // Aquarius
    11: 'Mercury',  // Pisces
    0: 'Venus',     // Aries
    1: 'Mars',      // Taurus
    2: 'Jupiter',   // Gemini
    3: 'Saturn',    // Cancer
    4: null,        // Leo
    5: 'Jupiter'    // Virgo
  },
  fall: {
    6: 'Sun',       // Libra
    7: 'Moon',      // Scorpio
    8: null,        // Sagittarius
    9: 'Jupiter',   // Capricorn
    10: null,       // Aquarius
    11: 'Mercury',  // Pisces
    0: 'Saturn',    // Aries
    1: null,        // Taurus
    2: null,        // Gemini
    3: 'Mars',      // Cancer
    4: null,        // Leo
    5: 'Venus'      // Virgo
  }
};

/**
 * Triplicity rulerships (day/night rulers)
 */
const TRIPLICITIES = {
  fire: { day: 'Sun', night: 'Jupiter' },      // Aries, Leo, Sagittarius
  earth: { day: 'Venus', night: 'Moon' },      // Taurus, Virgo, Capricorn
  air: { day: 'Saturn', night: 'Mercury' },    // Gemini, Libra, Aquarius
  water: { day: 'Venus', night: 'Mars' }       // Cancer, Scorpio, Pisces
};

const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

/**
 * Get triplicity for a sign
 */
function getTriplicity(signIndex) {
  if ([0, 4, 8].includes(signIndex)) return 'fire';
  if ([1, 5, 9].includes(signIndex)) return 'earth';
  if ([2, 6, 10].includes(signIndex)) return 'air';
  if ([3, 7, 11].includes(signIndex)) return 'water';
  return null;
}

/**
 * Calculate essential dignity for a planet
 */
function calculateEssentialDignity(planetName, longitude, isDayChart) {
  const sign = getSign(longitude);
  const dignities = [];

  // Check domicile (rulership)
  if (RULERSHIPS.domicile[sign] === planetName) {
    dignities.push({ type: 'Domicile (Ruler)', score: 5 });
  }

  // Check exaltation
  if (RULERSHIPS.exaltation[sign] === planetName) {
    dignities.push({ type: 'Exaltation', score: 4 });
  }

  // Check triplicity
  const triplicity = getTriplicity(sign);
  if (triplicity) {
    const tripRuler = isDayChart ? TRIPLICITIES[triplicity].day : TRIPLICITIES[triplicity].night;
    if (tripRuler === planetName) {
      dignities.push({ type: 'Triplicity', score: 3 });
    }
  }

  // Check detriment
  if (RULERSHIPS.detriment[sign] === planetName) {
    dignities.push({ type: 'Detriment', score: -5 });
  }

  // Check fall
  if (RULERSHIPS.fall[sign] === planetName) {
    dignities.push({ type: 'Fall', score: -4 });
  }

  // If no major dignity, planet is peregrine
  if (dignities.length === 0) {
    dignities.push({ type: 'Peregrine (No essential dignity)', score: 0 });
  }

  const totalScore = dignities.reduce((sum, d) => sum + d.score, 0);

  return {
    dignities,
    totalScore,
    strength: totalScore >= 4 ? 'Very Strong' :
              totalScore >= 2 ? 'Strong' :
              totalScore > 0 ? 'Moderately Strong' :
              totalScore === 0 ? 'Peregrine' :
              totalScore >= -3 ? 'Weakened' : 'Very Weak'
  };
}

/**
 * Check if chart is radical (fit to be judged)
 * Returns array of radicality issues
 */
function checkRadicality(chartData) {
  const issues = [];
  const warnings = [];

  // 1. Check Ascendant degree (0-3° or 27-30° are questionable)
  // Houses are array indexed 0-11, where 0 = 1st house
  // Houses array contains just the cusp longitudes (numbers), not objects
  const ascDegree = getDegreeInSign(chartData.houses[0]);
  if (ascDegree < 3) {
    warnings.push({
      type: 'Early Ascendant',
      severity: 'warning',
      message: `Ascendant at ${ascDegree.toFixed(2)}° - Too early (suggests question is premature)`
    });
  } else if (ascDegree > 27) {
    warnings.push({
      type: 'Late Ascendant',
      severity: 'warning',
      message: `Ascendant at ${ascDegree.toFixed(2)}° - Too late (suggests matter already decided)`
    });
  }

  // 2. Check for Saturn in 7th house
  const saturn = chartData.planets.find(p => p.name === 'Saturn');
  if (saturn) {
    const saturnHouse = getHouseForPlanet(saturn.longitude, chartData.houses);
    if (saturnHouse === 7) {
      warnings.push({
        type: 'Saturn in 7th',
        severity: 'warning',
        message: 'Saturn in 7th house (may indicate astrologer\'s judgment is impaired)'
      });
    }
  }

  // 3. Check Moon in Via Combusta (15° Libra to 15° Scorpio)
  const moon = chartData.planets.find(p => p.name === 'Moon');
  if (moon) {
    const moonLon = normalizeDegree(moon.longitude);
    const viaCombustaStart = 6 * 30 + 15; // 15° Libra = 195°
    const viaCombustaEnd = 7 * 30 + 15;    // 15° Scorpio = 225°

    if (moonLon >= viaCombustaStart && moonLon <= viaCombustaEnd) {
      warnings.push({
        type: 'Moon in Via Combusta',
        severity: 'caution',
        message: 'Moon in Via Combusta (15° Libra - 15° Scorpio) - traditional affliction'
      });
    }
  }

  return {
    isRadical: warnings.length === 0 || warnings.every(w => w.severity !== 'critical'),
    issues: warnings.filter(w => w.severity === 'critical'),
    warnings: warnings.filter(w => w.severity === 'warning' || w.severity === 'caution'),
    summary: warnings.length === 0 ?
      'Chart appears radical (fit to be judged)' :
      `Chart has ${warnings.length} consideration(s) before judgment`
  };
}

/**
 * Get house number for a planet's longitude
 * Houses are stored as array indexed 0-11, where 0 = 1st house
 */
function getHouseForPlanet(planetLon, houses) {
  const lon = normalizeDegree(planetLon);

  for (let i = 0; i < 12; i++) {
    const houseLon = normalizeDegree(houses[i]);
    const nextHouseIndex = (i + 1) % 12; // Wrap from 11 to 0
    const nextHouseLon = normalizeDegree(houses[nextHouseIndex]);

    if (nextHouseLon > houseLon) {
      // Normal case: house doesn't cross 0°
      if (lon >= houseLon && lon < nextHouseLon) {
        return i + 1; // Return house number (1-12)
      }
    } else {
      // Handle wrapping around 0°
      if (lon >= houseLon || lon < nextHouseLon) {
        return i + 1; // Return house number (1-12)
      }
    }
  }

  return 1; // Default to 1st house
}

/**
 * Calculate angular separation between two longitudes
 */
function angularSeparation(lon1, lon2) {
  const diff = Math.abs(normalizeDegree(lon1) - normalizeDegree(lon2));
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Find Moon's next applying aspect
 */
function findMoonNextAspect(chartData) {
  const moon = chartData.planets.find(p => p && p.name && typeof p.name === 'string' && p.name.toLowerCase() === 'moon');
  if (!moon) return null;

  const moonLon = normalizeDegree(moon.longitude);
  const moonSign = getSign(moonLon);
  const moonDegInSign = getDegreeInSign(moonLon);

  // Calculate how many degrees until Moon leaves current sign
  const degreesLeftInSign = 30 - moonDegInSign;

  // Major aspects to check
  const aspects = [
    { name: 'Conjunction', angle: 0, orb: 8 },
    { name: 'Sextile', angle: 60, orb: 6 },
    { name: 'Square', angle: 90, orb: 8 },
    { name: 'Trine', angle: 120, orb: 8 },
    { name: 'Opposition', angle: 180, orb: 8 }
  ];

  let closestAspect = null;
  let closestDistance = Infinity;

  // Check aspects to traditional planets only (no asteroids, centaurs, or points)
  // In horary, we only consider the 7 traditional planets
  const traditionalPlanets = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const otherPlanets = chartData.planets.filter(p => p && p.name && traditionalPlanets.includes(p.name.toLowerCase()));

  for (const planet of otherPlanets) {
    const planetLon = normalizeDegree(planet.longitude);
    const separation = angularSeparation(moonLon, planetLon);

    for (const aspect of aspects) {
      const diff = Math.abs(separation - aspect.angle);

      if (diff < aspect.orb) {
        // In horary, we want to find the closest applying aspect
        // For now, we'll accept any aspect within orb as potentially applying
        // (A more sophisticated version would check Moon's motion direction)

        if (diff < closestDistance) {
          closestDistance = diff;
          closestAspect = {
            aspect: aspect.name,
            planet: planet.name,
            currentSeparation: separation.toFixed(2),
            exactAt: aspect.angle,
            orb: diff.toFixed(2),
            withinCurrentSign: diff < degreesLeftInSign
          };
        }
      }
    }
  }

  return closestAspect;
}

/**
 * Check if Moon is void of course
 */
function checkMoonVoidOfCourse(chartData) {
  const nextAspect = findMoonNextAspect(chartData);
  const moon = chartData.planets.find(p => p && p.name && typeof p.name === 'string' && p.name.toLowerCase() === 'moon');

  if (!moon) return null;

  const moonDegInSign = getDegreeInSign(moon.longitude);
  const degreesLeftInSign = 30 - moonDegInSign;

  // Moon is void of course if there's no applying aspect before leaving the sign
  const isVOC = !nextAspect || !nextAspect.withinCurrentSign;

  return {
    isVoidOfCourse: isVOC,
    degreesLeftInSign: degreesLeftInSign.toFixed(2),
    currentSign: SIGN_NAMES[getSign(moon.longitude)],
    message: isVOC ?
      `Moon is Void of Course - will make no more major aspects before leaving ${SIGN_NAMES[getSign(moon.longitude)]}` :
      `Moon will ${nextAspect.aspect} ${nextAspect.planet} before leaving sign`
  };
}

/**
 * Identify significators based on question type
 * For now, we'll identify the basic significators
 */
function identifySignificators(chartData) {
  // Houses are stored as array indexed 0-11, where 0 = 1st house
  // Houses array contains just the cusp longitudes (numbers), not objects
  const ascSign = getSign(chartData.houses[0]);
  const querentRuler = RULERSHIPS.domicile[ascSign];

  console.log('=== SIGNIFICATORS DEBUG ===');
  console.log('1st house longitude:', chartData.houses[0]);
  console.log('Asc sign index:', ascSign, '=', SIGN_NAMES[ascSign]);
  console.log('Querent ruler:', querentRuler);

  // Get 7th house ruler (quesited/other person - most common)
  const descSign = getSign(chartData.houses[6]);
  const quesitedRuler = RULERSHIPS.domicile[descSign];

  console.log('7th house longitude:', chartData.houses[6]);
  console.log('Desc sign index:', descSign, '=', SIGN_NAMES[descSign]);
  console.log('Quesited ruler:', quesitedRuler);

  const querentPlanet = querentRuler ? chartData.planets.find(p => p && p.name && typeof p.name === 'string' && p.name.toLowerCase() === querentRuler.toLowerCase()) : null;
  const quesitedPlanet = quesitedRuler ? chartData.planets.find(p => p && p.name && typeof p.name === 'string' && p.name.toLowerCase() === quesitedRuler.toLowerCase()) : null;

  console.log('Querent planet found:', querentPlanet);
  console.log('Quesited planet found:', quesitedPlanet);

  return {
    querent: {
      house: 1,
      sign: SIGN_NAMES[ascSign],
      ruler: querentRuler,
      planet: querentPlanet
    },
    quesited: {
      house: 7,
      sign: SIGN_NAMES[descSign],
      ruler: quesitedRuler,
      planet: quesitedPlanet,
      note: 'Default to 7th house - adjust based on question type'
    }
  };
}

/**
 * Main horary analysis function
 */
function analyzeHoraryChart(chartData) {
  console.log('=== HORARY ANALYZER DEBUG ===');
  console.log('Full chartData:', chartData);
  console.log('Houses type:', Array.isArray(chartData.houses) ? 'Array' : 'Object');
  console.log('Houses length:', chartData.houses?.length);
  console.log('First house:', chartData.houses?.[0]);
  console.log('Seventh house:', chartData.houses?.[6]);
  console.log('Houses keys:', Object.keys(chartData.houses || {}));

  // Convert planets object to array if needed
  const planetsArray = Array.isArray(chartData.planets)
    ? chartData.planets
    : Object.values(chartData.planets);

  // Convert houses object to array if needed
  const housesArray = Array.isArray(chartData.houses)
    ? chartData.houses
    : Object.values(chartData.houses);

  // Determine if day or night chart (Sun above/below horizon)
  const sun = planetsArray.find(p => p && p.name && typeof p.name === 'string' && p.name.toLowerCase() === 'sun');
  const isDayChart = sun ? getHouseForPlanet(sun.longitude, housesArray) <= 6 : true;

  // Create modified chartData with planets and houses as arrays for internal functions
  const chartDataWithArray = {
    ...chartData,
    planets: planetsArray,
    houses: housesArray
  };

  // Perform all analyses
  const radicality = checkRadicality(chartDataWithArray);
  const significators = identifySignificators(chartDataWithArray);
  const moonVOC = checkMoonVoidOfCourse(chartDataWithArray);
  const moonNextAspect = findMoonNextAspect(chartDataWithArray);

  // Calculate dignities for main significators
  const querentDignity = significators.querent.planet ?
    calculateEssentialDignity(significators.querent.ruler, significators.querent.planet.longitude, isDayChart) : null;

  const quesitedDignity = significators.quesited.planet ?
    calculateEssentialDignity(significators.quesited.ruler, significators.quesited.planet.longitude, isDayChart) : null;

  // Moon dignity
  const moon = planetsArray.find(p => p && p.name && typeof p.name === 'string' && p.name.toLowerCase() === 'moon');
  const moonDignity = moon ? calculateEssentialDignity('Moon', moon.longitude, isDayChart) : null;

  return {
    chartType: isDayChart ? 'Day Chart' : 'Night Chart',
    radicality,
    significators: {
      querent: {
        ...significators.querent,
        dignity: querentDignity
      },
      quesited: {
        ...significators.quesited,
        dignity: quesitedDignity
      }
    },
    moon: {
      voidOfCourse: moonVOC,
      nextAspect: moonNextAspect,
      dignity: moonDignity
    }
  };
}

export {
  analyzeHoraryChart,
  checkRadicality,
  checkMoonVoidOfCourse,
  findMoonNextAspect,
  identifySignificators,
  calculateEssentialDignity
};
