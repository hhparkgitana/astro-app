/**
 * Eclipse Calculator
 *
 * Uses astronomy-engine for eclipse calculations (excellent built-in eclipse functions)
 * while the rest of the app uses Swiss Ephemeris for planetary positions.
 *
 * Note: Swiss Ephemeris has eclipse functions but they are not exposed in the
 * Node.js wrapper (sweph package), so we use astronomy-engine for this specific feature.
 */

const Astronomy = require('astronomy-engine');

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

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle) {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

/**
 * Calculate planet position at a specific time
 */
function calculatePlanetPosition(planetName, date) {
  let ecliptic;

  if (planetName === 'Sun') {
    ecliptic = Astronomy.Ecliptic(Astronomy.GeoVector('Sun', date, true));
  } else if (planetName === 'Moon') {
    ecliptic = Astronomy.Ecliptic(Astronomy.GeoMoon(date));
  } else {
    throw new Error(`Unsupported planet for eclipse calculation: ${planetName}`);
  }

  return {
    longitude: normalizeAngle(ecliptic.elon),
    sign: getZodiacSign(normalizeAngle(ecliptic.elon)),
    date: date
  };
}

/**
 * Find all eclipses in a date range
 *
 * @param {Date} startDate - Start of search period
 * @param {Date} endDate - End of search period
 * @returns {Array} Array of eclipse objects
 */
function findEclipses(startDate, endDate) {
  const eclipses = [];

  try {
    // Find solar eclipses
    let solarSearch = Astronomy.SearchGlobalSolarEclipse(startDate);
    while (solarSearch && solarSearch.peak && solarSearch.peak.date < endDate) {
      const sunPosition = calculatePlanetPosition('Sun', solarSearch.peak.date);

      eclipses.push({
        type: 'solar',
        date: solarSearch.peak.date,
        kind: solarSearch.kind, // 'partial', 'annular', 'total', 'hybrid'
        longitude: sunPosition.longitude,
        sign: sunPosition.sign,
        obscuration: solarSearch.obscuration
      });

      solarSearch = Astronomy.NextGlobalSolarEclipse(solarSearch.peak.date);
    }

    // Find lunar eclipses
    let lunarSearch = Astronomy.SearchLunarEclipse(startDate);
    while (lunarSearch && lunarSearch.peak && lunarSearch.peak.date < endDate) {
      const moonPosition = calculatePlanetPosition('Moon', lunarSearch.peak.date);

      eclipses.push({
        type: 'lunar',
        date: lunarSearch.peak.date,
        kind: lunarSearch.kind, // 'penumbral', 'partial', 'total'
        longitude: moonPosition.longitude,
        sign: moonPosition.sign,
        sdTotal: lunarSearch.sd_total,
        sdPartial: lunarSearch.sd_partial,
        sdPenum: lunarSearch.sd_penum
      });

      lunarSearch = Astronomy.NextLunarEclipse(lunarSearch.peak.date);
    }
  } catch (error) {
    console.error('Error finding eclipses:', error);
    throw error;
  }

  // Sort by date
  return eclipses.sort((a, b) => a.date - b.date);
}

/**
 * Determine which house an eclipse falls in
 */
function determineHouse(eclipseLongitude, houses) {
  if (!houses || houses.length !== 12) {
    return null;
  }

  for (let i = 0; i < houses.length; i++) {
    const currentCusp = houses[i];
    const nextCusp = houses[(i + 1) % 12];

    // Handle wraparound at 360°
    if (nextCusp > currentCusp) {
      if (eclipseLongitude >= currentCusp && eclipseLongitude < nextCusp) {
        return i + 1;
      }
    } else {
      // Wraparound case (e.g., house 12 to house 1)
      if (eclipseLongitude >= currentCusp || eclipseLongitude < nextCusp) {
        return i + 1;
      }
    }
  }

  return 1; // Default to first house if calculation fails
}

/**
 * Calculate angular distance between two longitudes
 */
function getAngularDistance(lon1, lon2) {
  let diff = Math.abs(lon1 - lon2);
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}

/**
 * Find eclipses affecting a specific natal chart
 *
 * @param {Object} natalChart - Natal chart data with planets and houses
 * @param {Date} startDate - Start of search period
 * @param {Date} endDate - End of search period
 * @param {number} orb - Maximum orb to consider (default 3°)
 * @returns {Array} Array of eclipses with natal chart impacts
 */
function findEclipsesAffectingChart(natalChart, startDate, endDate, orb = 3) {
  if (!natalChart || !natalChart.planets) {
    throw new Error('Valid natal chart with planets is required');
  }

  const eclipses = findEclipses(startDate, endDate);

  return eclipses.map(eclipse => {
    // Check which natal planets are within orb
    const affectedPlanets = [];

    Object.entries(natalChart.planets).forEach(([planetKey, planetData]) => {
      if (!planetData || planetData.longitude === undefined) return;

      const distance = getAngularDistance(eclipse.longitude, planetData.longitude);

      if (distance <= orb) {
        affectedPlanets.push({
          planet: planetData.name || planetKey,
          planetKey: planetKey,
          natalLongitude: planetData.longitude,
          natalSign: planetData.sign || getZodiacSign(planetData.longitude),
          orb: distance,
          aspect: distance < 1 ? 'exact' : 'applying'
        });
      }
    });

    // Sort by tightest orb first
    affectedPlanets.sort((a, b) => a.orb - b.orb);

    // Determine which house the eclipse falls in
    const house = natalChart.houses ? determineHouse(eclipse.longitude, natalChart.houses) : null;

    return {
      ...eclipse,
      house: house,
      affectedPlanets: affectedPlanets,
      hasImpact: affectedPlanets.length > 0 || house !== null
    };
  });
}

/**
 * Find eclipses affecting charts in a database
 *
 * @param {Array} chartsDatabase - Array of chart objects with calculated data
 * @param {Date} startDate - Start of search period
 * @param {Date} endDate - End of search period
 * @param {number} orb - Maximum orb to consider (default 3°)
 * @returns {Array} Array of eclipses with affected charts
 */
function findEclipsesDatabaseImpact(chartsDatabase, startDate, endDate, orb = 3) {
  if (!Array.isArray(chartsDatabase)) {
    throw new Error('Charts database must be an array');
  }

  const eclipses = findEclipses(startDate, endDate);

  return eclipses.map(eclipse => {
    const affectedCharts = [];

    chartsDatabase.forEach(chart => {
      if (!chart.calculated || !chart.calculated.planets) return;

      const chartImpacts = [];

      // Check which planets are affected
      Object.entries(chart.calculated.planets).forEach(([planetKey, planetData]) => {
        if (!planetData || planetData.longitude === undefined) return;

        const distance = getAngularDistance(eclipse.longitude, planetData.longitude);

        if (distance <= orb) {
          chartImpacts.push({
            planet: planetData.name || planetKey,
            orb: distance
          });
        }
      });

      // Determine house if available
      const house = chart.calculated.houses ?
        determineHouse(eclipse.longitude, chart.calculated.houses) : null;

      if (chartImpacts.length > 0 || house !== null) {
        affectedCharts.push({
          chartId: chart.id,
          chartName: chart.name,
          category: chart.category,
          date: chart.date,
          location: chart.location,
          house: house,
          impacts: chartImpacts
        });
      }
    });

    return {
      ...eclipse,
      affectedCharts: affectedCharts,
      chartCount: affectedCharts.length
    };
  });
}

/**
 * Format eclipse information for display
 */
function formatEclipseInfo(eclipse) {
  const typeLabel = eclipse.type === 'solar' ? 'Solar Eclipse' : 'Lunar Eclipse';
  const kindLabel = eclipse.kind.charAt(0).toUpperCase() + eclipse.kind.slice(1);

  const dateStr = eclipse.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const timeStr = eclipse.date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  return `${kindLabel} ${typeLabel}
Date: ${dateStr} at ${timeStr}
Position: ${eclipse.sign}`;
}

module.exports = {
  findEclipses,
  findEclipsesAffectingChart,
  findEclipsesDatabaseImpact,
  formatEclipseInfo,
  getZodiacSign,
  calculatePlanetPosition
};
