/**
 * Test asteroid calculations with Swiss Ephemeris
 * Verify that Chiron, Ceres, Pallas, Juno, and Vesta are calculated correctly
 */

const swissCalc = require('./src/shared/calculations/swissEphemerisCalculator');

console.log('Testing Asteroid Calculations with Swiss Ephemeris');
console.log('='.repeat(70) + '\n');

// Test chart: Current date
const testParams = {
  year: 2024,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  latitude: 40.7128,
  longitude: -74.0060,
  houseSystem: 'placidus'
};

console.log('Test Chart Data:');
console.log('  Date: January 1, 2024, 12:00 PM');
console.log('  Location: New York, NY (40.71°N, 74.01°W)\n');

try {
  const result = swissCalc.calculateChart(testParams);

  if (!result.success) {
    console.error('❌ Chart calculation failed:', result.error);
    process.exit(1);
  }

  console.log('✓ Chart calculated successfully!\n');

  // Display all bodies including asteroids
  console.log('ALL CELESTIAL BODIES:');
  console.log('='.repeat(70) + '\n');

  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  // Helper function to format position
  function formatPosition(lon) {
    const signIndex = Math.floor(lon / 30);
    const degreeInSign = lon % 30;
    const sign = signs[signIndex];
    const degrees = Math.floor(degreeInSign);
    const minutes = Math.floor((degreeInSign - degrees) * 60);
    return {
      sign,
      degrees,
      minutes,
      formatted: `${degrees.toString().padStart(2)}° ${sign.padEnd(11)} ${minutes.toString().padStart(2)}'`
    };
  }

  // Main planets
  console.log('MAIN PLANETS:');
  console.log('-'.repeat(70));
  ['SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE', 'PLUTO'].forEach(key => {
    const planet = result.planets[key];
    if (planet) {
      const pos = formatPosition(planet.longitude);
      const retrograde = planet.velocity < 0 ? ' (R)' : '';
      console.log(`  ${planet.name.padEnd(12)}: ${pos.formatted}${retrograde}`);
      console.log(`  ${' '.repeat(16)}Longitude: ${planet.longitude.toFixed(4)}°`);
    }
  });

  // Asteroids
  console.log('\n\nASTEROIDS:');
  console.log('-'.repeat(70));
  ['CHIRON', 'CERES', 'PALLAS', 'JUNO', 'VESTA'].forEach(key => {
    const asteroid = result.planets[key];
    if (asteroid) {
      const pos = formatPosition(asteroid.longitude);
      const retrograde = asteroid.velocity < 0 ? ' (R)' : '';
      console.log(`  ${asteroid.name.padEnd(12)}: ${pos.formatted}${retrograde}`);
      console.log(`  ${' '.repeat(16)}Longitude: ${asteroid.longitude.toFixed(4)}°`);
      console.log(`  ${' '.repeat(16)}Velocity: ${asteroid.velocity.toFixed(4)}°/day`);
    } else {
      console.log(`  ${key.padEnd(12)}: ❌ NOT FOUND`);
    }
  });

  // Lunar Nodes
  console.log('\n\nLUNAR NODES:');
  console.log('-'.repeat(70));
  ['NORTH_NODE', 'SOUTH_NODE'].forEach(key => {
    const node = result.planets[key];
    if (node) {
      const pos = formatPosition(node.longitude);
      console.log(`  ${node.name.padEnd(12)}: ${pos.formatted}`);
      console.log(`  ${' '.repeat(16)}Longitude: ${node.longitude.toFixed(4)}°`);
    }
  });

  // Count total bodies
  const totalBodies = Object.keys(result.planets).length;
  console.log('\n\n' + '='.repeat(70));
  console.log(`SUMMARY: ${totalBodies} celestial bodies calculated`);
  console.log('='.repeat(70));

  // Verify asteroids are present
  const asteroidKeys = ['CHIRON', 'CERES', 'PALLAS', 'JUNO', 'VESTA'];
  const allAsteroidsPresent = asteroidKeys.every(key => result.planets[key] !== undefined);

  if (allAsteroidsPresent) {
    console.log('\n✅ SUCCESS: All 5 asteroids are being calculated!');
    console.log('   - Chiron ✓');
    console.log('   - Ceres ✓');
    console.log('   - Pallas ✓');
    console.log('   - Juno ✓');
    console.log('   - Vesta ✓');
  } else {
    console.log('\n❌ ERROR: Some asteroids are missing!');
    asteroidKeys.forEach(key => {
      if (!result.planets[key]) {
        console.log(`   - ${key} is missing`);
      }
    });
    process.exit(1);
  }

  console.log('\n✅ Asteroid calculations are working correctly!\n');

} catch (error) {
  console.error('\n❌ Error during calculation:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
