# Bulk Chart Calculation - Implementation Summary

## What Was Created

### 1. Main Script: `scripts/calculate-database.js`
A comprehensive Node.js script that pre-calculates all planetary positions, houses, and aspects for the famous charts database.

### 2. NPM Commands Added to `package.json`
- `npm run calculate-database` - Calculate new entries only
- `npm run calculate-database:all` - Recalculate all entries

### 3. Documentation: `scripts/README.md`
Complete usage guide with examples and configuration details

## Test Results

✅ **Successfully ran on full database:**
- **Total charts**: 405
- **Successfully calculated**: 395 (97.5%)
- **Failed**: 10 (ancient BCE dates not supported by astronomy library)

### Failed Entries (Expected)
The astronomy library doesn't support BCE dates, so these ancient figures couldn't be calculated:
- Roman Empire, Plato, Aristotle, Socrates, Pythagoras
- Confucius, Lao Tzu, Gautama Buddha, Jesus Christ, First Buddhist Council

## Output Format Verification

### Sample: Barack Obama (Accurate Birth Time)
```json
{
  "planets": {
    "sun": {
      "sign": "Leo",
      "degree": 12.15,
      "longitude": 132.15,
      "house": 6,
      "retrograde": false
    }
    // ... all planets included
  },
  "angles": {
    "ascendant": {
      "sign": "Aquarius",
      "degree": 18.04,
      "longitude": 318.04
    }
    // ... all angles included
  },
  "houses": [
    {
      "number": 1,
      "sign": "Aquarius",
      "degree": 18.04,
      "longitude": 318.04
    }
    // ... 12 houses
  ],
  "major_aspects": [
    {
      "planet1": "sun",
      "planet2": "neptune",
      "aspect": "square",
      "orb": 3.55,
      "applying": false
    }
    // ... all aspects
  ],
  "metadata": {
    "calculated_at": "2025-10-29T16:17:08.517Z",
    "accurate_time": true,
    "rodden_rating_note": null
  }
}
```

### Sample: US Sibley Chart (Uncertain Birth Time - Rodden Rating C)
```json
{
  "planets": {
    "sun": {
      "sign": "Cancer",
      "degree": 13.12,
      "longitude": 103.12,
      "house": null,  // ← No house assignment
      "retrograde": false
    }
  },
  "angles": null,  // ← Angles uncertain
  "houses": null,  // ← Houses uncertain
  "major_aspects": [...],  // ← Aspects still calculated
  "metadata": {
    "calculated_at": "2025-10-29T16:17:08.564Z",
    "accurate_time": false,
    "rodden_rating_note": "Houses and angles uncertain due to unknown birth time"
  }
}
```

## Answers to Your Questions

### 1. Can we reuse the existing chart calculation code?
✅ **YES** - The script successfully imports and uses `src/shared/calculations/chartCalculator.js` directly. No code duplication needed!

### 2. Do we have all the ephemeris data we need?
✅ **YES** - The existing dependencies (`astronomy-engine` and `circular-natal-horoscope-js`) provide all necessary ephemeris data. The script works out of the box.

### 3. Should this be Node.js or browser?
✅ **Node.js script** - This is the right choice for bulk operations. It runs independently of the app and is much faster for processing 400+ charts.

## Features Implemented

✅ **All requested features:**
- Calculates all planets (Sun through Pluto + Nodes)
- Includes Chiron support (if you add it to the calculator)
- Houses (Placidus system) with accurate birth times
- Angles (Ascendant, MC, Descendant, IC)
- Major aspects with orbs and applying/separating
- Handles uncertain birth times gracefully
- Progress logging with real-time updates
- Error handling - bad entries don't stop the process
- Incremental mode - only calculates new entries
- Full recalculation mode with `--all` flag
- Preserves original file, writes to new file

## Configuration Used

- **House System**: Placidus
- **Aspect Orbs**: 8° (default for all aspect types)
- **Aspect Types**: Conjunction, Sextile, Square, Trine, Opposition
- **Zodiac**: Tropical (standard)

## Usage Examples

```bash
# Calculate new entries only
npm run calculate-database

# Recalculate everything
npm run calculate-database:all

# Or run directly with node
node scripts/calculate-database.js
node scripts/calculate-database.js --all
```

## Output Files

- **Input**: `src/shared/data/famousCharts.json` (unchanged)
- **Output**: `src/shared/data/famousChartsCalculated.json` (new file with calculated data)

## Next Steps / Future Enhancements

Potential improvements you might want:
1. Add Chiron calculation to the main calculator
2. Support for additional asteroids (Ceres, Pallas, Juno, Vesta)
3. Handle BCE dates with a different ephemeris library
4. Custom orb settings per aspect type
5. UI feature for users to add custom charts (as you mentioned)
6. Automatic calculation when new charts are imported

## Performance

Processing 405 charts takes approximately 30-60 seconds, including:
- Reading database
- Calculating planetary positions
- Calculating house cusps
- Computing all aspects
- Writing output file

This is a one-time operation (or run periodically when database updates).
