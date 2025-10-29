#!/usr/bin/env node

/**
 * Test script for transit calculations
 */

const { findTransitExactitude, findDatabaseImpact, formatDate, getZodiacSign } = require('../src/shared/calculations/transitCalculator.js');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Transit Calculations\n');
console.log('='.repeat(60));

// Test 1: Future transit timing
console.log('\n📅 Test 1: Future Transit Timing');
console.log('-'.repeat(60));
try {
  // When will transiting Saturn conjunct 15° Pisces?
  const natalLongitude = 15 + (11 * 30); // 15° Pisces = 345°
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2027-12-31');

  console.log(`Looking for Saturn conjunction at ${getZodiacSign(natalLongitude)}`);
  console.log(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`);

  const results = findTransitExactitude('saturn', 'conjunction', natalLongitude, startDate, endDate, 2.0);

  console.log(`\n✅ Found ${results.length} exact hit(s):\n`);
  results.forEach((hit, idx) => {
    console.log(`${idx + 1}. ${formatDate(hit.date)}`);
    console.log(`   Transit Saturn at ${getZodiacSign(hit.transitLongitude)}`);
    console.log(`   Orb: ${hit.orb.toFixed(3)}°`);
    console.log(`   ${hit.isRetrograde ? 'Retrograde' : 'Direct'}`);
    console.log('');
  });
} catch (error) {
  console.log(`❌ Test failed: ${error.message}`);
}

// Test 2: Database impact
console.log('\n🎯 Test 2: Database Impact');
console.log('-'.repeat(60));
try {
  // Load database
  const calculatedChartsPath = path.join(__dirname, '../src/shared/data/famousChartsCalculated.json');
  const chartsDatabase = JSON.parse(fs.readFileSync(calculatedChartsPath, 'utf8'));
  console.log(`Loaded ${chartsDatabase.length} charts from database\n`);

  // Which charts have natal Venus at 1-2° Aquarius (where Pluto is now)?
  const transitDate = new Date('2025-01-15');
  const transitPlanet = 'pluto';
  const aspect = 'conjunction';
  const orb = 1.0;

  console.log(`Looking for charts affected by transiting ${transitPlanet.toUpperCase()} ${aspect}`);
  console.log(`Date: ${formatDate(transitDate)}`);
  console.log(`Orb: ${orb}°\n`);

  const results = findDatabaseImpact(transitPlanet, transitDate, 'any', aspect, orb, chartsDatabase);

  console.log(`✅ Found ${results.length} affected chart(s):\n`);
  results.slice(0, 5).forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.chart.name} (${result.chart.category})`);
    console.log(`   Transit ${transitPlanet} at ${getZodiacSign(result.transitLongitude)}`);
    result.matches.forEach(match => {
      console.log(`   → Natal ${match.natalPlanet} at ${match.natalSign} (${match.orb.toFixed(2)}° orb)`);
    });
    console.log('');
  });

  if (results.length > 5) {
    console.log(`   ... and ${results.length - 5} more`);
  }
} catch (error) {
  console.log(`❌ Test failed: ${error.message}`);
}

console.log('\n' + '='.repeat(60));
console.log('✨ Transit tests completed!\n');
