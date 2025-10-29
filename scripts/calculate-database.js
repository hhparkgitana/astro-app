#!/usr/bin/env node

/**
 * Bulk Chart Calculator for Famous Charts Database
 *
 * This script pre-calculates all planetary positions, houses, and aspects
 * for each entry in the famous charts database.
 *
 * Usage: npm run calculate-database
 */

const fs = require('fs');
const path = require('path');
const { calculateChart } = require('../src/shared/calculations/chartCalculator.js');

// File paths
const INPUT_FILE = path.join(__dirname, '../src/shared/data/famousCharts.json');
const OUTPUT_FILE = path.join(__dirname, '../src/shared/data/famousChartsCalculated.json');

// Zodiac signs for longitude conversion
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

/**
 * Convert longitude to zodiac sign and degree
 */
function longitudeToSign(longitude) {
  const signIndex = Math.floor(longitude / 30);
  const degreeInSign = longitude % 30;
  return {
    sign: ZODIAC_SIGNS[signIndex],
    degree: degreeInSign
  };
}

/**
 * Parse date and time from chart entry
 */
function parseDateTime(entry) {
  // Parse date (format: YYYY-MM-DD)
  const [year, month, day] = entry.date.split('-').map(Number);

  // Parse time (format: HH:MM)
  let hour = 12, minute = 0;
  if (entry.time) {
    [hour, minute] = entry.time.split(':').map(Number);
  }

  return {
    year,
    month,
    day,
    hour,
    minute,
    latitude: entry.latitude || 0,
    longitude: entry.longitude || 0
  };
}

/**
 * Determine which house a planet is in based on house cusps
 */
function getPlanetHouse(planetLongitude, houses) {
  // Houses array contains the cusp longitudes for houses 1-12
  for (let i = 0; i < 12; i++) {
    const currentCusp = houses[i];
    const nextCusp = houses[(i + 1) % 12];

    // Handle wraparound at 360°
    if (nextCusp > currentCusp) {
      // Normal case: house doesn't cross 0° Aries
      if (planetLongitude >= currentCusp && planetLongitude < nextCusp) {
        return i + 1; // Houses are 1-indexed
      }
    } else {
      // House crosses 0° Aries
      if (planetLongitude >= currentCusp || planetLongitude < nextCusp) {
        return i + 1;
      }
    }
  }

  return 1; // Fallback to house 1
}

/**
 * Check if a planet is retrograde based on velocity
 */
function isRetrograde(velocity) {
  return velocity < 0;
}

/**
 * Format the calculated chart data
 */
function formatCalculatedData(calculationResult, hasAccurateTime) {
  if (!calculationResult.success) {
    return null;
  }

  const { planets, aspects, ascendant, midheaven, descendant, ic, houses } = calculationResult;

  // Format planets
  const formattedPlanets = {};
  const planetKeys = ['SUN', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE', 'PLUTO', 'NORTH_NODE', 'SOUTH_NODE'];
  const planetNames = {
    'SUN': 'sun',
    'MOON': 'moon',
    'MERCURY': 'mercury',
    'VENUS': 'venus',
    'MARS': 'mars',
    'JUPITER': 'jupiter',
    'SATURN': 'saturn',
    'URANUS': 'uranus',
    'NEPTUNE': 'neptune',
    'PLUTO': 'pluto',
    'NORTH_NODE': 'north_node',
    'SOUTH_NODE': 'south_node'
  };

  planetKeys.forEach(key => {
    if (planets[key]) {
      const planet = planets[key];
      const signInfo = longitudeToSign(planet.longitude);

      formattedPlanets[planetNames[key]] = {
        sign: signInfo.sign,
        degree: parseFloat(signInfo.degree.toFixed(2)),
        longitude: parseFloat(planet.longitude.toFixed(2)),
        house: hasAccurateTime ? getPlanetHouse(planet.longitude, houses) : null,
        retrograde: isRetrograde(planet.velocity)
      };
    }
  });

  // Format angles (only if we have accurate birth time)
  const formattedAngles = hasAccurateTime ? {
    ascendant: {
      ...longitudeToSign(ascendant),
      degree: parseFloat((ascendant % 30).toFixed(2)),
      longitude: parseFloat(ascendant.toFixed(2))
    },
    midheaven: {
      ...longitudeToSign(midheaven),
      degree: parseFloat((midheaven % 30).toFixed(2)),
      longitude: parseFloat(midheaven.toFixed(2))
    },
    descendant: {
      ...longitudeToSign(descendant),
      degree: parseFloat((descendant % 30).toFixed(2)),
      longitude: parseFloat(descendant.toFixed(2))
    },
    ic: {
      ...longitudeToSign(ic),
      degree: parseFloat((ic % 30).toFixed(2)),
      longitude: parseFloat(ic.toFixed(2))
    }
  } : null;

  // Format houses (only if we have accurate birth time)
  const formattedHouses = hasAccurateTime ? houses.map((cusp, index) => ({
    number: index + 1,
    ...longitudeToSign(cusp),
    degree: parseFloat((cusp % 30).toFixed(2)),
    longitude: parseFloat(cusp.toFixed(2))
  })) : null;

  // Format aspects
  const formattedAspects = aspects.map(aspect => ({
    planet1: aspect.planet1.toLowerCase().replace(' ', '_'),
    planet2: aspect.planet2.toLowerCase().replace(' ', '_'),
    aspect: aspect.type.toLowerCase(),
    orb: parseFloat(aspect.orb.toFixed(2)),
    applying: aspect.applying
  }));

  return {
    planets: formattedPlanets,
    angles: formattedAngles,
    houses: formattedHouses,
    major_aspects: formattedAspects,
    metadata: {
      calculated_at: new Date().toISOString(),
      accurate_time: hasAccurateTime,
      rodden_rating_note: hasAccurateTime ? null : 'Houses and angles uncertain due to unknown birth time'
    }
  };
}

/**
 * Calculate chart for a single entry
 */
function calculateChartEntry(entry) {
  try {
    const params = parseDateTime(entry);

    // Determine if we have accurate birth time
    // Rodden Ratings: AA/A = reliable, B = approximate, C/DD = uncertain
    const hasAccurateTime = entry.roddenRating && ['AA', 'A', 'B'].includes(entry.roddenRating);

    // Calculate chart
    const result = calculateChart(params);

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    // Format the results
    const formattedData = formatCalculatedData(result, hasAccurateTime);

    return {
      success: true,
      data: formattedData
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main function to process entire database
 */
async function processDatabase(recalculateAll = false) {
  console.log('🌟 Famous Charts Database Calculator\n');
  console.log(`Reading database from: ${INPUT_FILE}`);

  // Read input file
  let charts;
  try {
    const data = fs.readFileSync(INPUT_FILE, 'utf8');
    charts = JSON.parse(data);
  } catch (error) {
    console.error('❌ Error reading input file:', error.message);
    process.exit(1);
  }

  console.log(`Found ${charts.length} charts in database\n`);

  // Statistics
  const stats = {
    total: charts.length,
    processed: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  // Process each chart
  console.log('Processing charts...\n');

  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i];
    const progress = Math.floor((i / charts.length) * 100);

    // Show progress every 10 charts
    if (i % 10 === 0) {
      process.stdout.write(`\r⏳ Progress: ${i}/${charts.length} (${progress}%) - ${stats.success} successful, ${stats.failed} failed`);
    }

    // Skip if already calculated and not recalculating all
    if (!recalculateAll && chart.calculated) {
      stats.skipped++;
      continue;
    }

    // Calculate chart
    const result = calculateChartEntry(chart);
    stats.processed++;

    if (result.success) {
      chart.calculated = result.data;
      stats.success++;
    } else {
      stats.failed++;
      stats.errors.push({
        id: chart.id,
        name: chart.name,
        error: result.error
      });
    }
  }

  // Clear progress line
  process.stdout.write('\r' + ' '.repeat(100) + '\r');

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`   Total charts: ${stats.total}`);
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   ✅ Successful: ${stats.success}`);
  console.log(`   ⏭️  Skipped: ${stats.skipped}`);
  console.log(`   ❌ Failed: ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    stats.errors.forEach(err => {
      console.log(`   - ${err.name} (${err.id}): ${err.error}`);
    });
  }

  // Write output file
  console.log(`\n💾 Writing results to: ${OUTPUT_FILE}`);
  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(charts, null, 2), 'utf8');
    console.log('✅ Successfully wrote output file!');
  } catch (error) {
    console.error('❌ Error writing output file:', error.message);
    process.exit(1);
  }

  console.log('\n✨ Done!\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const recalculateAll = args.includes('--all') || args.includes('-a');

if (recalculateAll) {
  console.log('Running with --all flag: recalculating all charts\n');
}

// Run the script
processDatabase(recalculateAll).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
