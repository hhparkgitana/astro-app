/**
 * House Calculator Module
 *
 * NOW USING SWISS EPHEMERIS for professional-grade house calculations
 *
 * Swiss Ephemeris provides accurate house calculations for all house systems:
 * Placidus, Koch, Whole Sign, Equal, Campanus, Regiomontanus, etc.
 */

const swissCalc = require('./swissEphemerisCalculator');

/**
 * Calculate Placidus houses using Swiss Ephemeris
 */
function calculatePlacidusHouses(date, latitude, longitude) {
  // Convert JavaScript Date to Julian Day
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // JS months are 0-indexed
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();

  const jd = swissCalc.dateToJulianDay(year, month, day, hour, minute);

  // Calculate houses using Swiss Ephemeris
  const houseData = swissCalc.calculateHouses(jd, latitude, longitude, 'placidus');

  return {
    ascendant: houseData.ascendant,
    mc: houseData.midheaven,
    descendant: houseData.descendant,
    ic: houseData.ic,
    houses: houseData.houses
  };
}

module.exports = { calculatePlacidusHouses };
