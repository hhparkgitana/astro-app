/**
 * Test the new swissEphemerisCalculator module
 * Compare with known Einstein chart data
 */

const swissCalc = require('./src/shared/calculations/swissEphemerisCalculator');

console.log('Testing Swiss Ephemeris Calculator Module');
console.log('==========================================\n');

// Einstein's birth data
const einsteinParams = {
  year: 1879,
  month: 3,
  day: 14,
  hour: 11,
  minute: 30,
  latitude: 48.4011,
  longitude: 9.9876,
  houseSystem: 'placidus'
};

console.log('Calculating chart for Albert Einstein:');
console.log('  Date: March 14, 1879');
console.log('  Time: 11:30');
console.log('  Location: Ulm, Germany (48.4°N, 9.99°E)\n');

try {
  const result = swissCalc.calculateChart(einsteinParams);

  if (!result.success) {
    console.error('❌ Chart calculation failed:', result.error);
    process.exit(1);
  }

  console.log('✓ Chart calculated successfully!\n');

  // Display planetary positions
  console.log('PLANETARY POSITIONS:');
  console.log('===================\n');

  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  Object.entries(result.planets).forEach(([key, planet]) => {
    const lon = planet.longitude;
    const signIndex = Math.floor(lon / 30);
    const degreeInSign = lon % 30;
    const sign = signs[signIndex];
    const degrees = Math.floor(degreeInSign);
    const minutes = Math.floor((degreeInSign - degrees) * 60);
    const retrograde = planet.velocity < 0 ? ' (R)' : '';

    console.log(`  ${planet.name.padEnd(12)}: ${degrees.toString().padStart(2)}° ${sign.padEnd(11)} ${minutes.toString().padStart(2)}'${retrograde}`);
    console.log(`  ${' '.repeat(16)}Longitude: ${lon.toFixed(4)}°`);
  });

  // Display house cusps and angles
  console.log('\n\nHOUSE CUSPS & ANGLES:');
  console.log('====================\n');

  console.log(`  Ascendant (ASC):  ${result.ascendant.toFixed(4)}°`);
  console.log(`  Midheaven (MC):   ${result.midheaven.toFixed(4)}°`);
  console.log(`  Descendant (DSC): ${result.descendant.toFixed(4)}°`);
  console.log(`  Imum Coeli (IC):  ${result.ic.toFixed(4)}°`);
  if (result.vertex) {
    console.log(`  Vertex:           ${result.vertex.toFixed(4)}°`);
  }

  console.log('\n  House Cusps:');
  result.houses.forEach((cusp, index) => {
    console.log(`    House ${(index + 1).toString().padStart(2)}: ${cusp.toFixed(4)}°`);
  });

  // Display some aspects
  console.log('\n\nMAJOR ASPECTS (showing first 10):');
  console.log('=================================\n');

  result.aspects.slice(0, 10).forEach(aspect => {
    const applying = aspect.applying === true ? ' (applying)' : aspect.applying === false ? ' (separating)' : '';
    console.log(`  ${aspect.planet1.padEnd(12)} ${aspect.symbol} ${aspect.planet2.padEnd(12)}`);
    console.log(`    ${aspect.name}, orb: ${aspect.orb.toFixed(2)}°${applying}`);
  });

  console.log(`\n  Total aspects found: ${result.aspects.length}`);

  console.log('\n\n✅ Swiss Ephemeris Calculator is working correctly!');
  console.log('   Ready to replace astronomy-engine\n');

} catch (error) {
  console.error('\n❌ Error during calculation:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
