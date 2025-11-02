/**
 * Secondary Progressions Calculator
 *
 * Implements day-for-a-year progression method:
 * - Each day after birth = one year of life
 * - To find progressions for age 30, calculate chart for 30 days after birth
 * - Uses same location as natal chart (progressions don't relocate)
 */

const { calculateChart } = require('./swissEphemerisCalculator.js');

/**
 * Calculate secondary progressions for a given target date or age
 *
 * @param {Object} natalData - Natal birth data
 * @param {number} natalData.year - Birth year
 * @param {number} natalData.month - Birth month (1-12)
 * @param {number} natalData.day - Birth day
 * @param {number} natalData.hour - Birth hour (0-23)
 * @param {number} natalData.minute - Birth minute (0-59)
 * @param {number} natalData.latitude - Birth latitude
 * @param {number} natalData.longitude - Birth longitude
 * @param {string} natalData.houseSystem - House system (default: 'placidus')
 * @param {Object} target - Target date or age
 * @param {Date} [target.date] - Target date for progressions
 * @param {number} [target.age] - Target age in years
 * @returns {Object} Progressed chart data with metadata
 */
function calculateSecondaryProgressions(natalData, target) {
  // Validate inputs
  if (!natalData || typeof natalData !== 'object') {
    throw new Error('Natal data is required');
  }

  if (!target || (target.date === undefined && target.age === undefined)) {
    throw new Error('Target date or age is required');
  }

  // Create natal birth date
  const birthDate = new Date(Date.UTC(
    natalData.year,
    natalData.month - 1,
    natalData.day,
    natalData.hour || 12,
    natalData.minute || 0
  ));

  // Calculate age in years
  let ageInYears;
  let targetDate;

  if (target.date) {
    // Calculate age from target date
    targetDate = new Date(target.date);
    ageInYears = (targetDate - birthDate) / (365.25 * 24 * 60 * 60 * 1000);
  } else {
    // Use provided age
    ageInYears = target.age;
    targetDate = new Date(birthDate.getTime() + (ageInYears * 365.25 * 24 * 60 * 60 * 1000));
  }

  // Calculate progressed date (day-for-a-year)
  // Add one day for each year of life
  const progressedDate = new Date(birthDate.getTime() + (ageInYears * 24 * 60 * 60 * 1000));

  // Extract progressed date components
  const progressedYear = progressedDate.getUTCFullYear();
  const progressedMonth = progressedDate.getUTCMonth() + 1;
  const progressedDay = progressedDate.getUTCDate();
  const progressedHour = progressedDate.getUTCHours();
  const progressedMinute = progressedDate.getUTCMinutes();

  // Calculate progressed chart at natal location
  const progressedChart = calculateChart({
    year: progressedYear,
    month: progressedMonth,
    day: progressedDay,
    hour: progressedHour,
    minute: progressedMinute,
    latitude: natalData.latitude,
    longitude: natalData.longitude,
    houseSystem: natalData.houseSystem || 'placidus'
  });

  // Return progressed chart with metadata
  return {
    ...progressedChart,
    metadata: {
      type: 'secondary_progressions',
      natalDate: {
        year: natalData.year,
        month: natalData.month,
        day: natalData.day,
        hour: natalData.hour,
        minute: natalData.minute
      },
      progressedDate: {
        year: progressedYear,
        month: progressedMonth,
        day: progressedDay,
        hour: progressedHour,
        minute: progressedMinute
      },
      targetDate: {
        year: targetDate.getUTCFullYear(),
        month: targetDate.getUTCMonth() + 1,
        day: targetDate.getUTCDate()
      },
      ageInYears: ageInYears,
      location: {
        latitude: natalData.latitude,
        longitude: natalData.longitude
      }
    }
  };
}

/**
 * Format progressed chart information for display
 *
 * @param {Object} progressedChart - Progressed chart with metadata
 * @returns {string} Formatted description
 */
function formatProgressionInfo(progressedChart) {
  const { metadata } = progressedChart;

  const natalDateStr = `${metadata.natalDate.month}/${metadata.natalDate.day}/${metadata.natalDate.year}`;
  const progressedDateStr = `${metadata.progressedDate.month}/${metadata.progressedDate.day}/${metadata.progressedDate.year}`;
  const targetDateStr = `${metadata.targetDate.month}/${metadata.targetDate.day}/${metadata.targetDate.year}`;

  return `Secondary Progressions for age ${metadata.ageInYears.toFixed(1)} years
Natal Birth: ${natalDateStr}
Target Date: ${targetDateStr}
Progressed Date: ${progressedDateStr} (day-for-a-year method)`;
}

/**
 * Calculate progressed planet movements since birth
 *
 * @param {Object} natalChart - Natal chart data
 * @param {Object} progressedChart - Progressed chart data
 * @returns {Object} Planet movements in degrees
 */
function calculateProgressedMovements(natalChart, progressedChart) {
  const movements = {};

  const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

  planets.forEach(planet => {
    const natalLon = natalChart.planets?.[planet]?.longitude;
    const progressedLon = progressedChart.planets?.[planet]?.longitude;

    if (natalLon !== undefined && progressedLon !== undefined) {
      // Calculate angular distance
      let movement = progressedLon - natalLon;

      // Normalize to -180 to 180 range
      while (movement > 180) movement -= 360;
      while (movement < -180) movement += 360;

      movements[planet] = {
        natal: natalLon,
        progressed: progressedLon,
        movement: movement,
        degreesPerYear: movement / progressedChart.metadata.ageInYears
      };
    }
  });

  return movements;
}

module.exports = {
  calculateSecondaryProgressions,
  formatProgressionInfo,
  calculateProgressedMovements
};
