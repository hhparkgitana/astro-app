#!/usr/bin/env node

/**
 * Test script for the chart search functionality
 * Tests various search criteria to ensure the search engine works correctly
 */

const fs = require('fs');
const path = require('path');
const { searchCharts, formatSearchResults } = require('../src/shared/utils/chartSearch.js');

// Load the calculated charts database
const calculatedChartsPath = path.join(__dirname, '../src/shared/data/famousChartsCalculated.json');
let chartsDatabase;

try {
  const data = fs.readFileSync(calculatedChartsPath, 'utf8');
  chartsDatabase = JSON.parse(data);
  console.log(`✅ Loaded ${chartsDatabase.length} charts from database\n`);
} catch (error) {
  console.error('❌ Failed to load charts database:', error.message);
  console.log('\n💡 Run "npm run calculate-database" first to generate the calculated database.\n');
  process.exit(1);
}

// Test cases
const tests = [
  {
    name: 'Test 1: Planet in Sign (Moon in Pisces)',
    criteria: {
      planetInSign: [{ planet: 'moon', sign: 'Pisces' }]
    }
  },
  {
    name: 'Test 2: Multiple Planet in Sign (Sun in Leo AND Moon in Gemini)',
    criteria: {
      planetInSign: [
        { planet: 'sun', sign: 'Leo' },
        { planet: 'moon', sign: 'Gemini' }
      ]
    }
  },
  {
    name: 'Test 3: Planet in House (Venus in 10th)',
    criteria: {
      planetInHouse: [{ planet: 'venus', house: 10 }]
    }
  },
  {
    name: 'Test 4: Ascendant Sign (Virgo rising)',
    criteria: {
      ascendantSign: 'Virgo'
    }
  },
  {
    name: 'Test 5: Aspect (Sun conjunct Uranus)',
    criteria: {
      aspects: [{ planet1: 'sun', planet2: 'uranus', aspect: 'conjunction' }]
    }
  },
  {
    name: 'Test 6: Aspect with tight orb (Sun conjunct Uranus within 3 degrees)',
    criteria: {
      aspects: [{ planet1: 'sun', planet2: 'uranus', aspect: 'conjunction', maxOrb: 3 }]
    }
  },
  {
    name: 'Test 7: Category (Musicians)',
    criteria: {
      category: 'musicians'
    }
  },
  {
    name: 'Test 8: Combined criteria (Musicians with Venus in 10th)',
    criteria: {
      category: 'musicians',
      planetInHouse: [{ planet: 'venus', house: 10 }]
    }
  },
  {
    name: 'Test 9: Complex combined (Presidents with Mars in Capricorn)',
    criteria: {
      category: 'president',
      planetInSign: [{ planet: 'mars', sign: 'Capricorn' }]
    }
  },
  {
    name: 'Test 10: Threshold matching - at least 2 of 3 (Moon in Pisces, Virgo rising, Sun in Sagittarius)',
    criteria: {
      planetInSign: [
        { planet: 'moon', sign: 'Pisces' },
        { planet: 'sun', sign: 'Sagittarius' }
      ],
      ascendantSign: 'Virgo'
    },
    options: {
      matchMode: 'threshold',
      minMatches: 2
    }
  }
];

// Run tests
console.log('🧪 Running Search Tests\n');
console.log('='.repeat(60));

tests.forEach((test, index) => {
  console.log(`\n${test.name}`);
  console.log('-'.repeat(60));

  try {
    const results = searchCharts(chartsDatabase, test.criteria, test.options || {});
    const formatted = formatSearchResults(results, test.criteria);

    console.log(`✅ Found ${formatted.count} results`);

    if (formatted.count > 0) {
      console.log('\nSample results (first 5):');
      formatted.results.slice(0, 5).forEach((chart, idx) => {
        console.log(`  ${idx + 1}. ${chart.name} (${chart.category})`);
        console.log(`     Matched: ${chart.matchedCriteria.join(', ')}`);
      });

      if (formatted.count > 5) {
        console.log(`  ... and ${formatted.count - 5} more`);
      }
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('\n✨ All tests completed!\n');
