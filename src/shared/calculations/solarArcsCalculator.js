/**
 * Solar Arc Directions Calculator
 *
 * Calculates Solar Arc Directions by advancing all natal positions by the Sun's
 * average motion (~0.9856° per day, or approximately 1° per year of life).
 *
 * Solar Arcs are a predictive technique where the entire natal chart advances
 * as a unified whole, maintaining all natal aspects while shifting forward in time.
 */

/**
 * Calculate Solar Arc Directions for a given date
 *
 * @param {object} natalChart - The natal chart data with planets, angles, houses
 * @param {Date} natalDate - Birth date
 * @param {Date} targetDate - Date to calculate Solar Arcs for
 * @param {string} method - 'standard' (0.9856° per day) or 'precise' (actual solar arc)
 * @returns {object} Solar Arc chart data
 */
export function calculateSolarArcs(natalChart, natalDate, targetDate, method = 'standard') {
  // Calculate days elapsed since birth
  const birthDate = new Date(natalDate);
  const target = new Date(targetDate);
  const daysElapsed = (target - birthDate) / (1000 * 60 * 60 * 24);

  // Calculate arc amount
  let arcInDegrees;

  if (method === 'precise' && natalChart.planets && natalChart.planets.SUN) {
    // Method 2: Use actual solar arc (would need to calculate Sun position at target date)
    // For now, default to standard method
    // TODO: Implement precise method with actual Sun calculation
    arcInDegrees = daysElapsed * 0.9856;
  } else {
    // Method 1: Standard average solar motion
    arcInDegrees = daysElapsed * 0.9856;
  }

  // Calculate years from birth for display
  const yearsFromBirth = daysElapsed / 365.25;

  // Create Solar Arc chart by advancing all natal positions
  const solarArcChart = {
    planets: {},
    houses: [],
    ascendant: null,
    mc: null,
    ic: null,
    descendant: null,
    arcAmount: arcInDegrees,
    yearsFromBirth: yearsFromBirth,
    targetDate: targetDate,
    method: method
  };

  // Advance all planets
  if (natalChart.planets) {
    for (const planetKey in natalChart.planets) {
      const natalPlanet = natalChart.planets[planetKey];
      solarArcChart.planets[planetKey] = {
        ...natalPlanet,
        longitude: wrapDegrees(natalPlanet.longitude + arcInDegrees),
        // Velocity doesn't change (it's still the natal velocity, just at a new position)
        // Some properties stay the same
        natalLongitude: natalPlanet.longitude, // Store original for reference
        arcAmount: arcInDegrees
      };
    }
  }

  // Advance angles
  if (natalChart.ascendant !== undefined && natalChart.ascendant !== null) {
    solarArcChart.ascendant = wrapDegrees(natalChart.ascendant + arcInDegrees);
  }
  if (natalChart.mc !== undefined && natalChart.mc !== null) {
    solarArcChart.mc = wrapDegrees(natalChart.mc + arcInDegrees);
  }
  if (natalChart.ic !== undefined && natalChart.ic !== null) {
    solarArcChart.ic = wrapDegrees(natalChart.ic + arcInDegrees);
  }
  if (natalChart.descendant !== undefined && natalChart.descendant !== null) {
    solarArcChart.descendant = wrapDegrees(natalChart.descendant + arcInDegrees);
  }

  // Advance house cusps
  if (natalChart.houses && Array.isArray(natalChart.houses)) {
    solarArcChart.houses = natalChart.houses.map(cusp => wrapDegrees(cusp + arcInDegrees));
  }

  return solarArcChart;
}

/**
 * Wrap degrees to 0-360 range
 * @param {number} degrees - Degrees to wrap
 * @returns {number} Wrapped degrees (0-360)
 */
function wrapDegrees(degrees) {
  let wrapped = degrees % 360;
  if (wrapped < 0) wrapped += 360;
  return wrapped;
}

/**
 * Format arc amount for display
 * @param {number} arcInDegrees - Arc amount in degrees
 * @returns {string} Formatted arc (e.g., "35°00'")
 */
export function formatArc(arcInDegrees) {
  const wholeDegrees = Math.floor(arcInDegrees);
  const minutes = Math.round((arcInDegrees - wholeDegrees) * 60);
  return `${wholeDegrees}°${minutes.toString().padStart(2, '0')}'`;
}

/**
 * Get recommended orb for Solar Arc aspects
 * Solar Arcs use tighter orbs than transits (1-2°) because they move slowly
 * @returns {number} Recommended orb in degrees
 */
export function getSolarArcDefaultOrb() {
  return 1.5; // 1.5° is a good middle ground
}
