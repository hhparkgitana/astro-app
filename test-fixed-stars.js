/**
 * Test Fixed Star calculations with Swiss Ephemeris
 * Research the fixstar API and test major fixed stars
 */

const sweph = require('sweph');
const path = require('path');

// Load constants
const constants = require(path.join(require.resolve('sweph').replace('index.js', ''), 'constants.js'));

// Set ephemeris path
const ephePath = path.join(__dirname, 'src', 'shared', 'ephe');
sweph.set_ephe_path(ephePath);

console.log('Testing Fixed Star Calculations with Swiss Ephemeris');
console.log('='.repeat(70) + '\n');

// Test date: January 1, 2024
const year = 2024;
const month = 1;
const day = 1;
const hour = 12;
const minute = 0;

// Calculate Julian Day
const hourDecimal = hour + minute / 60.0;
const jd = sweph.julday(year, month, day, hourDecimal, 1);

console.log(`Test Date: ${month}/${day}/${year} ${hour}:${minute.toString().padStart(2, '0')}`);
console.log(`Julian Day: ${jd}\n`);

// Major fixed stars used in astrology
const fixedStars = [
  'Regulus',      // Alpha Leonis - Royal Star
  'Spica',        // Alpha Virginis - Royal Star
  'Antares',      // Alpha Scorpii - Royal Star
  'Fomalhaut',    // Alpha Piscis Austrini - Royal Star
  'Aldebaran',    // Alpha Tauri - Royal Star
  'Algol',        // Beta Persei - Most famous fixed star
  'Sirius',       // Alpha Canis Majoris - Brightest star
  'Vega',         // Alpha Lyrae
  'Arcturus',     // Alpha Bootis
  'Betelgeuse',   // Alpha Orionis
  'Rigel',        // Beta Orionis
  'Altair',       // Alpha Aquilae
  'Pollux',       // Beta Geminorum
  'Deneb',        // Alpha Cygni
  'Procyon'       // Alpha Canis Minoris
];

console.log('FIXED STAR POSITIONS:');
console.log('='.repeat(70) + '\n');

const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
               'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

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

// Try different API variations to find the correct one
console.log('Testing Swiss Ephemeris Fixed Star API...\n');

// Check what fixed star functions are available
console.log('Available functions in sweph:');
Object.keys(sweph).filter(key => key.toLowerCase().includes('star')).forEach(key => {
  console.log(`  - ${key}`);
});
console.log('');

// Try to calculate fixed star positions
fixedStars.forEach(starName => {
  try {
    // The Swiss Ephemeris uses fixstar_ut() or similar
    // Star names need to be preceded with a comma: ",Aldebaran"
    const fullStarName = `,${starName}`;

    // Try fixstar_ut if it exists
    if (sweph.fixstar_ut) {
      const result = sweph.fixstar_ut(fullStarName, jd, constants.SEFLG_SWIEPH);

      if (result && !result.error) {
        const lon = result.data[0];
        const lat = result.data[1];
        const distance = result.data[2];
        const pos = formatPosition(lon);

        console.log(`${starName.padEnd(15)}: ${pos.formatted}`);
        console.log(`${''.padEnd(17)}Longitude: ${lon.toFixed(4)}°`);
        console.log(`${''.padEnd(17)}Latitude: ${lat.toFixed(4)}°`);
        console.log('');
      } else if (result.error) {
        console.log(`${starName.padEnd(15)}: ERROR - ${result.error}`);
      }
    } else if (sweph.fixstar) {
      // Try alternative API
      const result = sweph.fixstar(fullStarName, jd, constants.SEFLG_SWIEPH);

      if (result && !result.error) {
        const lon = result.data[0];
        const lat = result.data[1];
        const distance = result.data[2];
        const pos = formatPosition(lon);

        console.log(`${starName.padEnd(15)}: ${pos.formatted}`);
        console.log(`${''.padEnd(17)}Longitude: ${lon.toFixed(4)}°`);
        console.log(`${''.padEnd(17)}Latitude: ${lat.toFixed(4)}°`);
        console.log('');
      } else if (result.error) {
        console.log(`${starName.padEnd(15)}: ERROR - ${result.error}`);
      }
    } else {
      console.log('❌ No fixed star function found in sweph package');
      process.exit(1);
    }
  } catch (error) {
    console.log(`${starName.padEnd(15)}: EXCEPTION - ${error.message}`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('Fixed star API test complete');
console.log('='.repeat(70) + '\n');
