/**
 * Test the aspects calculator with example data
 */

const { calculateAspects, getAngularDistance } = require('./aspectsCalculator');

// Test data - simplified planet positions
const testPlanets = {
  sun: { name: 'Sun', longitude: 270 },      // 0° Capricorn
  moon: { name: 'Moon', longitude: 30 },     // 0° Taurus (trine to Sun)
  mercury: { name: 'Mercury', longitude: 272 }, // 2° Capricorn (conjunction to Sun)
  venus: { name: 'Venus', longitude: 0 },    // 0° Aries (square to Sun)
  mars: { name: 'Mars', longitude: 90 },     // 0° Cancer (opposition to Sun)
};

console.log('Testing aspect calculations...\n');

// Test 1: Angular distance
console.log('Test 1: Angular Distance');
console.log('Sun (270°) to Moon (30°):', getAngularDistance(270, 30), '° (should be 120° - trine)');
console.log('Sun (270°) to Venus (0°):', getAngularDistance(270, 0), '° (should be 90° - square)');
console.log('Sun (270°) to Mars (90°):', getAngularDistance(270, 90), '° (should be 180° - opposition)');
console.log('Sun (270°) to Mercury (272°):', getAngularDistance(270, 272), '° (should be 2° - conjunction)\n');

// Test 2: Calculate all aspects
console.log('Test 2: All Aspects');
const aspects = calculateAspects(testPlanets);

console.log(`Found ${aspects.length} aspects:\n`);

aspects.forEach(aspect => {
  console.log(`${aspect.planet1} ${aspect.symbol} ${aspect.planet2}`);
  console.log(`  Type: ${aspect.name}`);
  console.log(`  Exact angle: ${aspect.exactAngle}°`);
  console.log(`  Actual angle: ${aspect.actualAngle.toFixed(2)}°`);
  console.log(`  Orb: ${aspect.orb.toFixed(2)}°\n`);
});

// Test 3: Custom orb
console.log('Test 3: Tight Orb (3°)');
const tightAspects = calculateAspects(testPlanets, { default: 3 });
console.log(`Found ${tightAspects.length} aspects with 3° orb\n`);

console.log('All tests complete!');
