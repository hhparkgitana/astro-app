#!/usr/bin/env node

/**
 * Eclipse Birth Enrichment Script
 *
 * Enriches the famous charts database with eclipse proximity data.
 * Connects birth times to the nearest eclipses in the eclipse database.
 *
 * Usage: npm run enrich-eclipses
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { DateTime } = require('luxon');

// File paths
const CHARTS_INPUT = path.join(__dirname, '../src/shared/data/famousCharts.json');
const CHARTS_OUTPUT = path.join(__dirname, '../src/shared/data/famousChartsCalculated.json');
const EPHEMERIS_DB = path.join(__dirname, '../src/shared/data/ephemeris.db');

// Zodiac signs
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

/**
 * Get zodiac sign from sign index
 */
function getSignFromIndex(index) {
  return ZODIAC_SIGNS[index] || 'Unknown';
}

/**
 * Format ecliptic longitude as degree/minute/sign
 * @param {number} longitude - Ecliptic longitude (0-360)
 * @returns {string} Formatted position like "21°47' Scorpio"
 */
function formatDegree(longitude) {
  const signIndex = Math.floor(longitude / 30);
  const degree = longitude % 30;
  const wholeDegree = Math.floor(degree);
  const minutes = Math.round((degree - wholeDegree) * 60);
  const sign = getSignFromIndex(signIndex);
  return `${wholeDegree}°${String(minutes).padStart(2, '0')}' ${sign}`;
}

/**
 * Parse birth datetime from chart data
 * @param {Object} chart - Chart object with date, time, timezone
 * @returns {Date|null} Birth datetime in UTC or null if parsing fails
 */
function parseBirthDateTime(chart) {
  try {
    const dateStr = chart.date; // "YYYY-MM-DD"
    const timeStr = chart.time || '12:00'; // "HH:MM" or default to noon
    const timezone = chart.timezone || 'UTC';

    // Parse as local time in the specified timezone
    const localDt = DateTime.fromISO(`${dateStr}T${timeStr}:00`, { zone: timezone });

    if (!localDt.isValid) {
      return null;
    }

    // Convert to UTC and return as JS Date
    return localDt.toUTC().toJSDate();
  } catch (e) {
    console.error(`Error parsing birth time for ${chart.name}:`, e.message);
    return null;
  }
}

/**
 * Load eclipse database from ephemeris.db
 * @returns {Array} Array of eclipse records
 */
function loadEclipseDatabase() {
  const db = new Database(EPHEMERIS_DB, { readonly: true });

  try {
    const stmt = db.prepare('SELECT * FROM eclipses ORDER BY datetime');
    const eclipses = stmt.all();

    console.log(`Loaded ${eclipses.length} eclipses from database`);
    return eclipses;
  } finally {
    db.close();
  }
}

/**
 * Find the nearest eclipse to a birth datetime
 * @param {Date} birthDateTime - Birth date/time in UTC
 * @param {Array} eclipseDatabase - Array of eclipse records
 * @param {number} maxHours - Maximum hours from birth to consider (default 12)
 * @returns {Object} Eclipse proximity data
 */
function calculateEclipseProximity(birthDateTime, eclipseDatabase, maxHours = 12) {
  const birthMs = birthDateTime.getTime();
  let nearestEclipse = null;
  let nearestHours = Infinity;

  for (const eclipse of eclipseDatabase) {
    const eclipseMs = eclipse.datetime; // Already in milliseconds
    const diffMs = eclipseMs - birthMs;
    const diffHours = Math.abs(diffMs) / (1000 * 60 * 60);

    if (diffHours < nearestHours) {
      nearestHours = diffHours;
      nearestEclipse = {
        ...eclipse,
        hoursFromBirth: diffHours,
        beforeOrAfter: diffMs < 0 ? 'before' : 'after'
      };
    }
  }

  // Check if within threshold
  if (nearestHours <= maxHours) {
    return {
      bornDuringEclipse: true,
      eclipse: {
        type: nearestEclipse.type,
        kind: nearestEclipse.kind,
        dateTime: new Date(nearestEclipse.datetime).toISOString(),
        hoursFromBirth: Math.round(nearestHours * 100) / 100, // 2 decimal places
        sign: getSignFromIndex(nearestEclipse.sign_index),
        degree: Math.round(nearestEclipse.degree_in_sign * 100) / 100,
        longitude: Math.round(nearestEclipse.longitude * 100) / 100,
        formattedPosition: formatDegree(nearestEclipse.longitude),
        beforeOrAfter: nearestEclipse.beforeOrAfter
      },
      searchThreshold: maxHours
    };
  }

  return {
    bornDuringEclipse: false,
    eclipse: null,
    searchThreshold: maxHours
  };
}

/**
 * Main enrichment function
 */
async function enrichAllChartsWithEclipseData() {
  console.log('🌟 Eclipse Birth Enrichment Script\n');

  // Load eclipse database
  console.log('Loading eclipse database...');
  const eclipses = loadEclipseDatabase();

  if (eclipses.length === 0) {
    console.error('❌ No eclipses found in database. Run generate-ephemeris first.');
    process.exit(1);
  }

  // Load famous charts
  console.log('Loading famous charts database...');
  let charts;
  try {
    const chartsData = fs.readFileSync(CHARTS_OUTPUT, 'utf8');
    charts = JSON.parse(chartsData);
  } catch (error) {
    console.error('❌ Error reading charts file:', error.message);
    process.exit(1);
  }

  console.log(`Found ${charts.length} charts in database\n`);
  console.log('Processing charts...\n');

  // Statistics
  const stats = {
    total: charts.length,
    processed: 0,
    eclipseBirths: 0,
    solarEclipse: 0,
    lunarEclipse: 0,
    parseErrors: 0,
    byKind: {
      total: 0,
      partial: 0,
      annular: 0,
      penumbral: 0,
      hybrid: 0
    }
  };

  const eclipseBirthList = [];

  // Process each chart
  for (const chart of charts) {
    stats.processed++;

    // Parse birth datetime
    const birthDateTime = parseBirthDateTime(chart);

    if (!birthDateTime) {
      stats.parseErrors++;
      chart.eclipseProximity = {
        bornDuringEclipse: false,
        eclipse: null,
        error: 'Could not parse birth datetime'
      };
      continue;
    }

    // Calculate eclipse proximity
    chart.eclipseProximity = calculateEclipseProximity(
      birthDateTime,
      eclipses,
      12 // 12 hours default threshold
    );

    if (chart.eclipseProximity.bornDuringEclipse) {
      stats.eclipseBirths++;
      const ep = chart.eclipseProximity.eclipse;

      // Count by type
      if (ep.type === 'solar') stats.solarEclipse++;
      if (ep.type === 'lunar') stats.lunarEclipse++;

      // Count by kind
      stats.byKind[ep.kind] = (stats.byKind[ep.kind] || 0) + 1;

      // Add to list
      eclipseBirthList.push({
        name: chart.name,
        category: chart.category,
        date: chart.date,
        time: chart.time,
        eclipse: ep
      });

      console.log(`✓ ${chart.name}: Born ${ep.hoursFromBirth.toFixed(1)}h ${ep.beforeOrAfter} ${ep.kind} ${ep.type} eclipse at ${ep.formattedPosition}`);
    }
  }

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`   Total charts: ${stats.total}`);
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Parse errors: ${stats.parseErrors}`);
  console.log(`   ✨ Eclipse births found: ${stats.eclipseBirths}`);
  console.log(`      Solar eclipses: ${stats.solarEclipse}`);
  console.log(`      Lunar eclipses: ${stats.lunarEclipse}`);
  console.log(`   By kind:`);
  console.log(`      Total: ${stats.byKind.total || 0}`);
  console.log(`      Partial: ${stats.byKind.partial || 0}`);
  console.log(`      Annular: ${stats.byKind.annular || 0}`);
  console.log(`      Penumbral: ${stats.byKind.penumbral || 0}`);
  console.log(`      Hybrid: ${stats.byKind.hybrid || 0}`);

  // Check for known examples
  console.log('\n🔍 Checking for known eclipse birth examples:');
  const knownNames = ['Charles', 'William', 'Kate', 'Middleton', 'Diana'];
  const foundKnown = charts.filter(c =>
    knownNames.some(name => c.name.includes(name))
  );

  foundKnown.forEach(chart => {
    const ep = chart.eclipseProximity;
    if (ep && ep.bornDuringEclipse) {
      console.log(`   ✓ ${chart.name}: YES - ${ep.eclipse.hoursFromBirth.toFixed(1)}h from ${ep.eclipse.type} eclipse`);
    } else {
      console.log(`   ✗ ${chart.name}: No (nearest eclipse > 12 hours)`);
    }
  });

  // Save enriched database
  console.log(`\n💾 Writing enriched database to: ${CHARTS_OUTPUT}`);
  try {
    fs.writeFileSync(CHARTS_OUTPUT, JSON.stringify(charts, null, 2), 'utf8');
    console.log('✅ Successfully wrote enriched database!');
  } catch (error) {
    console.error('❌ Error writing output file:', error.message);
    process.exit(1);
  }

  // Save eclipse birth list for reference
  const listPath = path.join(__dirname, '../src/shared/data/eclipseBirths.json');
  try {
    fs.writeFileSync(listPath, JSON.stringify(eclipseBirthList, null, 2), 'utf8');
    console.log(`✅ Eclipse birth list saved to: ${listPath}`);
  } catch (error) {
    console.warn('⚠️  Could not save eclipse birth list:', error.message);
  }

  console.log('\n✨ Done!\n');
}

// Run the enrichment
enrichAllChartsWithEclipseData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
