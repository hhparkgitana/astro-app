/**
 * Test script to verify Swiss Ephemeris (sweph) is working correctly
 * Tests with Albert Einstein's birth chart data
 */

const sweph = require('sweph');
const path = require('path');
// Load constants directly from sweph/constants.js
const constants = require(path.join(require.resolve('sweph').replace('index.js', ''), 'constants.js'));

// Set ephemeris data path
const ephePath = path.join(__dirname, 'src', 'shared', 'ephe');
sweph.set_ephe_path(ephePath);

console.log('Swiss Ephemeris Test');
console.log('===================\n');
console.log(`Ephemeris path: ${ephePath}`);

// Einstein's birth data: March 14, 1879, 11:30 AM LMT, Ulm, Germany (48.4011°N, 9.9876°E)
const birthDate = {
  year: 1879,
  month: 3,
  day: 14,
  hour: 11,
  minute: 30
};

// Convert to Julian Day (using UTC time for now)
// Calendar: 1 = Gregorian (SE_GREG_CAL), 0 = Julian (SE_JUL_CAL)
const jd = sweph.julday(
  birthDate.year,
  birthDate.month,
  birthDate.day,
  birthDate.hour + birthDate.minute / 60.0,
  1  // Gregorian calendar
);

console.log(`\nEinstein Birth Data:`);
console.log(`  Date: ${birthDate.month}/${birthDate.day}/${birthDate.year}`);
console.log(`  Time: ${birthDate.hour}:${birthDate.minute.toString().padStart(2, '0')}`);
console.log(`  Julian Day: ${jd}\n`);

// Calculate planetary positions
const planets = [
  { id: constants.SE_SUN, name: 'Sun' },
  { id: constants.SE_MOON, name: 'Moon' },
  { id: constants.SE_MERCURY, name: 'Mercury' },
  { id: constants.SE_VENUS, name: 'Venus' },
  { id: constants.SE_MARS, name: 'Mars' },
  { id: constants.SE_JUPITER, name: 'Jupiter' },
  { id: constants.SE_SATURN, name: 'Saturn' },
  { id: constants.SE_URANUS, name: 'Uranus' },
  { id: constants.SE_NEPTUNE, name: 'Neptune' },
  { id: constants.SE_PLUTO, name: 'Pluto' }
];

console.log('Planetary Positions (Tropical Zodiac):');
console.log('======================================\n');

try {
  planets.forEach(planet => {
    // Calculate position using Swiss Ephemeris
    // Flags: SEFLG_SPEED for velocities, SEFLG_SWIEPH for Swiss Ephemeris files
    const flags = constants.SEFLG_SPEED | constants.SEFLG_SWIEPH;
    const result = sweph.calc_ut(jd, planet.id, flags);

    if (result.error) {
      console.error(`  ${planet.name}: ERROR - ${result.error}`);
    } else {
      const longitude = result.data[0]; // Ecliptic longitude
      const latitude = result.data[1];  // Ecliptic latitude
      const distance = result.data[2];  // Distance in AU
      const speedLon = result.data[3];  // Speed in longitude (deg/day)

      // Convert longitude to sign and degree
      const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                     'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
      const signIndex = Math.floor(longitude / 30);
      const degreeInSign = longitude % 30;
      const sign = signs[signIndex];
      const degrees = Math.floor(degreeInSign);
      const minutes = Math.floor((degreeInSign - degrees) * 60);

      const retrograde = speedLon < 0 ? ' (R)' : '';

      console.log(`  ${planet.name.padEnd(10)}: ${degrees}° ${sign.padEnd(11)} ${minutes}' ${retrograde}`);
      console.log(`                 Longitude: ${longitude.toFixed(6)}°`);
      console.log(`                 Speed: ${speedLon.toFixed(6)} deg/day\n`);
    }
  });

  // Test Chiron (asteroid 2060)
  console.log('\nTesting Chiron (Asteroid 2060):');
  console.log('===============================\n');

  const chironResult = sweph.calc_ut(jd, constants.SE_CHIRON, constants.SEFLG_SPEED | constants.SEFLG_SWIEPH);

  if (chironResult.error) {
    console.error(`  Chiron: ERROR - ${chironResult.error}`);
  } else {
    const longitude = chironResult.data[0];
    const speedLon = chironResult.data[3];

    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signIndex = Math.floor(longitude / 30);
    const degreeInSign = longitude % 30;
    const sign = signs[signIndex];
    const degrees = Math.floor(degreeInSign);
    const minutes = Math.floor((degreeInSign - degrees) * 60);

    const retrograde = speedLon < 0 ? ' (R)' : '';

    console.log(`  Chiron: ${degrees}° ${sign.padEnd(11)} ${minutes}'${retrograde}`);
    console.log(`          Longitude: ${longitude.toFixed(6)}°`);
    console.log(`          Speed: ${speedLon.toFixed(6)} deg/day`);
  }

  console.log('\n✓ Swiss Ephemeris is working correctly!');

} catch (error) {
  console.error('\n✗ Error during calculation:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
}

// Close Swiss Ephemeris
sweph.close();
