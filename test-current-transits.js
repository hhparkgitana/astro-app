/**
 * Test current transit positions for November 3, 2025
 * Verify Saturn and Uranus positions and aspect calculations
 */

const swissCalc = require('./src/shared/calculations/swissEphemerisCalculator');

console.log('Testing Current Transit Positions');
console.log('=================================\n');

// October 31, 2025, 12:00 UTC (midday)
const transitParams = {
  year: 2025,
  month: 10,
  day: 31,
  hour: 12,
  minute: 0,
  utcYear: 2025,
  utcMonth: 10,
  utcDay: 31,
  utcHour: 12,
  utcMinute: 0,
  latitude: 0,  // Not important for planetary positions
  longitude: 0,
  houseSystem: 'placidus'
};

console.log('Calculating transits for:');
console.log('  Date: October 31, 2025');
console.log('  Time: 12:00 UTC\n');

try {
  const result = swissCalc.calculateChart(transitParams);

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

  const planetsToShow = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
                         'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  Object.entries(result.planets).forEach(([key, planet]) => {
    if (!planetsToShow.includes(planet.name)) return;

    const lon = planet.longitude;
    const signIndex = Math.floor(lon / 30);
    const degreeInSign = lon % 30;
    const sign = signs[signIndex];
    const degrees = Math.floor(degreeInSign);
    const minutes = Math.floor((degreeInSign - degrees) * 60);
    const retrograde = planet.velocity < 0 ? ' (R)' : '';

    console.log(`  ${planet.name.padEnd(12)}: ${degrees.toString().padStart(2)}° ${sign.padEnd(11)} ${minutes.toString().padStart(2)}'${retrograde}`);
    console.log(`  ${' '.repeat(16)}Longitude: ${lon.toFixed(4)}° (velocity: ${planet.velocity.toFixed(4)}°/day)`);
  });

  // Specific focus on Saturn and Uranus
  console.log('\n\n🔍 SATURN-URANUS ANALYSIS:');
  console.log('===========================\n');

  const saturn = result.planets.SATURN;
  const uranus = result.planets.URANUS;

  console.log(`  Saturn longitude: ${saturn.longitude.toFixed(4)}°`);
  console.log(`  Uranus longitude: ${uranus.longitude.toFixed(4)}°\n`);

  // Calculate angular distance
  function getAngularDistance(long1, long2) {
    let distance = Math.abs(long1 - long2);
    if (distance > 180) {
      distance = 360 - distance;
    }
    return distance;
  }

  const distance = getAngularDistance(saturn.longitude, uranus.longitude);
  console.log(`  Angular distance: ${distance.toFixed(4)}°\n`);

  // Check all aspect types
  const ASPECT_TYPES = {
    CONJUNCTION: { angle: 0, symbol: '☌', name: 'Conjunction' },
    SEXTILE: { angle: 60, symbol: '⚹', name: 'Sextile' },
    SQUARE: { angle: 90, symbol: '□', name: 'Square' },
    TRINE: { angle: 120, symbol: '△', name: 'Trine' },
    OPPOSITION: { angle: 180, symbol: '☍', name: 'Opposition' }
  };

  console.log('  Aspect type analysis (orb = 8°):');
  for (const [key, aspect] of Object.entries(ASPECT_TYPES)) {
    const diff = Math.abs(distance - aspect.angle);
    const match = diff <= 8 ? '✓ MATCH' : '✗';
    console.log(`    ${aspect.name.padEnd(12)}: ${aspect.angle}° - diff: ${diff.toFixed(2)}° ${match}`);
  }

  // Find Saturn-Uranus aspect in calculated aspects
  console.log('\n  Saturn-Uranus aspect in calculated aspects:');
  const saturnUranusAspect = result.aspects.find(a =>
    (a.planet1 === 'Saturn' && a.planet2 === 'Uranus') ||
    (a.planet1 === 'Uranus' && a.planet2 === 'Saturn')
  );

  if (saturnUranusAspect) {
    console.log(`    Found: ${saturnUranusAspect.planet1} ${saturnUranusAspect.symbol} ${saturnUranusAspect.planet2}`);
    console.log(`    Type: ${saturnUranusAspect.type} (${saturnUranusAspect.name})`);
    console.log(`    Orb: ${saturnUranusAspect.orb.toFixed(2)}°`);
    console.log(`    Exact angle: ${saturnUranusAspect.exactAngle}°`);
    console.log(`    Actual angle: ${saturnUranusAspect.actualAngle.toFixed(2)}°`);
  } else {
    console.log(`    ✗ No aspect found (distance ${distance.toFixed(2)}° is outside 8° orb for all aspects)`);
  }

  console.log('\n\n✅ Test complete!\n');

} catch (error) {
  console.error('\n❌ Error during calculation:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
