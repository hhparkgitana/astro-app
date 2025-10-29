# Database Calculation Scripts

## calculate-database.js

Pre-calculates all planetary positions, houses, and aspects for the famous charts database.

### Usage

**Calculate only new entries** (entries without `calculated` object):
```bash
npm run calculate-database
```

**Recalculate all entries** (even those already calculated):
```bash
npm run calculate-database:all
```

### What it does

The script:
1. Reads `src/shared/data/famousCharts.json`
2. Calculates chart data for each entry using the app's existing chart calculator
3. Writes results to `src/shared/data/famousChartsCalculated.json`

### Output Format

Each chart entry will get a `calculated` object with:

```json
{
  "calculated": {
    "planets": {
      "sun": {
        "sign": "Leo",
        "degree": 12.34,
        "longitude": 132.34,
        "house": 6,
        "retrograde": false
      },
      // ... more planets ...
    },
    "angles": {
      "ascendant": {
        "sign": "Aquarius",
        "degree": 18.04,
        "longitude": 318.04
      },
      // ... more angles ...
    },
    "houses": [
      {
        "number": 1,
        "sign": "Aquarius",
        "degree": 18.04,
        "longitude": 318.04
      },
      // ... 12 houses ...
    ],
    "major_aspects": [
      {
        "planet1": "sun",
        "planet2": "uranus",
        "aspect": "conjunction",
        "orb": 1.2,
        "applying": false
      },
      // ... more aspects ...
    ],
    "metadata": {
      "calculated_at": "2025-01-29T10:00:00.000Z",
      "accurate_time": true,
      "rodden_rating_note": null
    }
  }
}
```

### Handling Uncertain Birth Times

Charts with uncertain birth times (Rodden Rating C or DD) will:
- Still have planet positions calculated (these don't require exact time)
- Have `angles` and `houses` set to `null` (these require accurate birth time)
- Have `metadata.accurate_time` set to `false`
- Include a note in `metadata.rodden_rating_note`

### Settings

- **House System**: Placidus
- **Aspect Orbs**: 8° (conjunction/opposition), 6° (square/trine/sextile)
- **Aspect Types**: Conjunction, Opposition, Square, Trine, Sextile

### Progress & Error Handling

The script shows:
- Real-time progress updates
- Count of successful/failed calculations
- Detailed error messages for failed entries
- Summary report when complete

Failed entries won't stop the entire process - the script continues and reports all errors at the end.

### Notes

- The original `famousCharts.json` is never modified
- Output goes to a new file `famousChartsCalculated.json`
- Running without `--all` flag will skip entries that already have calculated data
- The script uses the same calculation functions as the main app
