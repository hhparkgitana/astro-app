/**
 * Returns Calculator
 *
 * Calculates Solar Returns (when Sun returns to natal position annually)
 * and Lunar Returns (when Moon returns to natal position monthly)
 */

const { DateTime } = require('luxon');

/**
 * Find the exact moment when a planet returns to its natal longitude
 * Uses binary search to find the precise time
 *
 * @param {number} natalLongitude - The natal longitude of the planet
 * @param {Date} startDate - Start of search window
 * @param {Date} endDate - End of search window
 * @param {function} calculateChart - Function to calculate chart at a given moment
 * @param {string} planetKey - Key of planet to track (e.g., 'SUN', 'MOON')
 * @param {object} location - Location object with latitude, longitude, timezone
 * @returns {Promise<{datetime: Date, chart: object}>} The exact return moment and chart
 */
async function findPlanetReturn(
  natalLongitude,
  startDate,
  endDate,
  calculateChart,
  planetKey,
  location
) {
  const PRECISION = 0.01; // Precision in degrees (0.01° = ~36 seconds of arc)
  const MAX_ITERATIONS = 50;

  // Normalize natal longitude to 0-360
  const targetLongitude = ((natalLongitude % 360) + 360) % 360;

  let start = startDate;
  let end = endDate;
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    // Calculate midpoint
    const mid = new Date((start.getTime() + end.getTime()) / 2);

    // Calculate chart at midpoint
    const midChartResponse = await calculateChart({
      year: mid.getFullYear(),
      month: mid.getMonth() + 1,
      day: mid.getDate(),
      hour: mid.getHours(),
      minute: mid.getMinutes(),
      latitude: location.latitude,
      longitude: location.longitude,
      houseSystem: location.houseSystem || 'placidus',
    });

    // Handle IPC response wrapper - if response has success property, it's wrapped
    let midChart;
    if (midChartResponse.success !== undefined) {
      if (!midChartResponse.success) {
        throw new Error(`Failed to calculate chart at ${mid}: ${midChartResponse.error || 'Unknown error'}`);
      }
      midChart = midChartResponse;
    } else {
      midChart = midChartResponse;
    }

    if (!midChart.planets || !midChart.planets[planetKey]) {
      console.error(`Chart validation failed at ${mid}:`, {
        hasPlanets: !!midChart?.planets,
        hasPlanet: !!midChart?.planets?.[planetKey],
        planetKeys: midChart?.planets ? Object.keys(midChart.planets) : []
      });
      throw new Error(`Failed to calculate chart at ${mid}`);
    }

    const currentLongitude = midChart.planets[planetKey].longitude;
    const normalizedCurrent = ((currentLongitude % 360) + 360) % 360;

    // Calculate angular distance (accounting for 360° wrap)
    let diff = normalizedCurrent - targetLongitude;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Check if we've achieved precision
    if (Math.abs(diff) < PRECISION) {
      return {
        datetime: mid,
        chart: midChart,
      };
    }

    // Check velocity to determine search direction
    const velocity = midChart.planets[planetKey].velocity;

    if (velocity > 0) {
      // Planet is moving forward
      if (diff < 0) {
        // Current position is before target, search forward
        start = mid;
      } else {
        // Current position is after target, search backward
        end = mid;
      }
    } else {
      // Planet is moving backward (retrograde)
      if (diff < 0) {
        // Current position is before target, search backward
        end = mid;
      } else {
        // Current position is after target, search forward
        start = mid;
      }
    }

    // Prevent infinite loop if window becomes too small
    if (end.getTime() - start.getTime() < 1000) {
      // Less than 1 second
      return {
        datetime: mid,
        chart: midChart,
      };
    }

    iteration++;
  }

  throw new Error('Failed to converge on return time within max iterations');
}

/**
 * Calculate a Solar Return chart
 *
 * @param {object} natalData - Natal birth data
 * @param {number} returnYear - Year for which to calculate the Solar Return
 * @param {object} returnLocation - Location where the return will occur
 * @param {function} calculateChart - Chart calculation function
 * @returns {Promise<object>} Solar Return chart data
 */
async function calculateSolarReturn(
  natalData,
  returnYear,
  returnLocation,
  calculateChart
) {
  console.log('=== calculateSolarReturn ===');
  console.log('natalData received:', natalData);
  console.log('natalData keys:', Object.keys(natalData));
  console.log('natalData.year:', natalData.year);
  console.log('natalData.month:', natalData.month);

  // Convert natal local time to UTC using Luxon
  const natalLocalTime = DateTime.fromObject({
    year: natalData.year,
    month: natalData.month,
    day: natalData.day,
    hour: natalData.hour,
    minute: natalData.minute,
  }, { zone: natalData.timezone });

  const natalUtcTime = natalLocalTime.toUTC();

  // First, calculate the natal chart to get natal Sun position
  const chartParams = {
    year: natalData.year,
    month: natalData.month,
    day: natalData.day,
    hour: natalData.hour,
    minute: natalData.minute,
    utcYear: natalUtcTime.year,
    utcMonth: natalUtcTime.month,
    utcDay: natalUtcTime.day,
    utcHour: natalUtcTime.hour,
    utcMinute: natalUtcTime.minute,
    latitude: natalData.latitude,
    longitude: natalData.longitude,
    houseSystem: natalData.houseSystem || 'placidus',
  };
  console.log('Calling calculateChart with params:', chartParams);

  const natalChartResponse = await calculateChart(chartParams);

  // Handle IPC response wrapper
  let natalChart;
  if (natalChartResponse.success !== undefined) {
    // IPC response format: {success: true/false, ...data or error}
    if (!natalChartResponse.success) {
      throw new Error(`Failed to calculate natal chart: ${natalChartResponse.error || 'Unknown error'}`);
    }
    natalChart = natalChartResponse;
  } else {
    // Direct calculation result
    natalChart = natalChartResponse;
  }

  if (!natalChart || !natalChart.planets || !natalChart.planets.SUN) {
    console.error('Natal chart validation failed:', {
      hasChart: !!natalChart,
      hasPlanets: !!natalChart?.planets,
      hasSun: !!natalChart?.planets?.SUN,
      chartKeys: natalChart ? Object.keys(natalChart) : [],
      planetKeys: natalChart?.planets ? Object.keys(natalChart.planets) : []
    });
    throw new Error('Failed to calculate natal chart');
  }

  const natalSunLongitude = natalChart.planets.SUN.longitude;

  // For Solar Return, search window is birthday ± 2 days in the return year
  const birthMonth = natalData.month;
  const birthDay = natalData.day;

  // Start search 2 days before birthday
  const startDate = new Date(returnYear, birthMonth - 1, birthDay - 2, 0, 0, 0);
  // End search 2 days after birthday
  const endDate = new Date(returnYear, birthMonth - 1, birthDay + 2, 23, 59, 59);

  // Find the exact return moment
  const returnResult = await findPlanetReturn(
    natalSunLongitude,
    startDate,
    endDate,
    calculateChart,
    'SUN',
    returnLocation
  );

  return {
    ...returnResult.chart,
    returnType: 'solar',
    returnDatetime: returnResult.datetime,
    natalChart: natalChart,
  };
}

/**
 * Calculate a Lunar Return chart
 *
 * @param {object} natalData - Natal birth data
 * @param {number} returnYear - Year for the Lunar Return
 * @param {number} returnMonth - Month for the Lunar Return
 * @param {object} returnLocation - Location where the return will occur
 * @param {function} calculateChart - Chart calculation function
 * @returns {Promise<object>} Lunar Return chart data
 */
async function calculateLunarReturn(
  natalData,
  returnYear,
  returnMonth,
  returnLocation,
  calculateChart
) {
  // Convert natal local time to UTC using Luxon
  const natalLocalTime = DateTime.fromObject({
    year: natalData.year,
    month: natalData.month,
    day: natalData.day,
    hour: natalData.hour,
    minute: natalData.minute,
  }, { zone: natalData.timezone });

  const natalUtcTime = natalLocalTime.toUTC();

  // First, calculate the natal chart to get natal Moon position
  const natalChartResponse = await calculateChart({
    year: natalData.year,
    month: natalData.month,
    day: natalData.day,
    hour: natalData.hour,
    minute: natalData.minute,
    utcYear: natalUtcTime.year,
    utcMonth: natalUtcTime.month,
    utcDay: natalUtcTime.day,
    utcHour: natalUtcTime.hour,
    utcMinute: natalUtcTime.minute,
    latitude: natalData.latitude,
    longitude: natalData.longitude,
    houseSystem: natalData.houseSystem || 'placidus',
  });

  // Handle IPC response wrapper
  let natalChart;
  if (natalChartResponse.success !== undefined) {
    if (!natalChartResponse.success) {
      throw new Error(`Failed to calculate natal chart: ${natalChartResponse.error || 'Unknown error'}`);
    }
    natalChart = natalChartResponse;
  } else {
    natalChart = natalChartResponse;
  }

  if (!natalChart || !natalChart.planets || !natalChart.planets.MOON) {
    console.error('Lunar Return natal chart validation failed:', {
      hasChart: !!natalChart,
      hasPlanets: !!natalChart?.planets,
      hasMoon: !!natalChart?.planets?.MOON,
      chartKeys: natalChart ? Object.keys(natalChart) : [],
      planetKeys: natalChart?.planets ? Object.keys(natalChart.planets) : []
    });
    throw new Error('Failed to calculate natal chart');
  }

  const natalMoonLongitude = natalChart.planets.MOON.longitude;

  // For Lunar Return, search the entire specified month
  // Moon returns approximately every 27.3 days, so within a month we should find it
  const startDate = new Date(returnYear, returnMonth - 1, 1, 0, 0, 0);
  const endDate = new Date(returnYear, returnMonth, 0, 23, 59, 59); // Last day of the month

  // Find the exact return moment
  const returnResult = await findPlanetReturn(
    natalMoonLongitude,
    startDate,
    endDate,
    calculateChart,
    'MOON',
    returnLocation
  );

  return {
    ...returnResult.chart,
    returnType: 'lunar',
    returnDatetime: returnResult.datetime,
    natalChart: natalChart,
  };
}

module.exports = {
  calculateSolarReturn,
  calculateLunarReturn
};
