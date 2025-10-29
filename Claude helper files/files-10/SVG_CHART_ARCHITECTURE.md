# Custom SVG Chart Wheel Architecture

## Overview
We're building a custom SVG-based astrological chart wheel to replace the AstroChart library. This gives us full control over multi-wheel charts (natal, transits, progressions) and all visual styling.

## Component Structure

```
ChartWheel (main component)
├── SVG container (viewBox-based for scaling)
├── ZodiacRing (colorful outer ring with signs)
├── HouseRing (house cusps and numbers)
├── PlanetRing (planets at specified radius)
│   ├── NatalPlanets (inner ring)
│   └── TransitPlanets (outer ring)
└── AspectLines (connecting planets)
```

## Coordinate System

### Key Concepts:
- **Astrological longitude**: 0-360° (0° Aries = 0°, 0° Taurus = 30°, etc.)
- **SVG coordinates**: Standard x,y with (0,0) at top-left
- **Chart center**: Middle of the SVG viewBox
- **Angles**: In astrology, 0° is at 9 o'clock position (left), going counter-clockwise
  - In SVG, 0° is at 3 o'clock (right), going clockwise
  - We need to convert between these systems!

### Conversion Formula:
```javascript
// Convert astrological longitude to SVG angle
function longitudeToSVGAngle(longitude) {
  // Astrology: 0° Aries is at left (9 o'clock), counter-clockwise
  // SVG: 0° is at right (3 o'clock), clockwise
  
  // Step 1: Flip direction (360 - longitude makes it clockwise)
  // Step 2: Rotate 90° to start at left instead of right
  return (180 - longitude) * (Math.PI / 180); // Convert to radians
}

// Calculate x,y position on a circle
function pointOnCircle(centerX, centerY, radius, longitude) {
  const angle = longitudeToSVGAngle(longitude);
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle)
  };
}
```

## Chart Dimensions

For a viewBox of 800x800:
```
Center: (400, 400)
Outer radius: 380 (zodiac ring)
Transit ring: ~320
Natal ring: ~260
House ring: ~200
Inner area: 0-180 (for aspect lines)
```

## Rendering Order (back to front)

1. **Background** (optional grid/circle guides)
2. **Aspect lines** (drawn first so they're behind everything)
3. **House cusps** (radial lines)
4. **House numbers**
5. **Zodiac ring** (colored sections with signs)
6. **Planet glyphs** (natal, then transits)
7. **Labels** (As, Ds, Mc, Ic)

## Data Flow

```javascript
// Input data structure
const chartData = {
  planets: {
    SUN: { name: 'Sun', longitude: 270.5 },
    MOON: { name: 'Moon', longitude: 45.2 },
    // ...
  },
  houses: [173.4, 203.2, ...], // 12 house cusps
  aspects: [
    {
      planet1: 'Sun',
      planet2: 'Moon',
      type: 'TRINE',
      orb: 2.3,
      // ...
    }
  ]
};

// For transits, we'll have:
const transitData = {
  planets: { /* same structure */ },
  // houses use natal houses
};
```

## Key Features to Implement

### Phase 1: Basic Single Wheel
- [ ] Zodiac ring with 12 colored sections
- [ ] House cusps as radial lines  
- [ ] House numbers positioned correctly
- [ ] Planet glyphs at correct positions
- [ ] Angle labels (As, Ds, Mc, Ic)

### Phase 2: Aspects
- [ ] Draw aspect lines between planets
- [ ] Color-code by aspect type
- [ ] Vary thickness/opacity by orb
- [ ] Click to toggle visibility

### Phase 3: Multi-Wheel
- [ ] Add transit ring (outer)
- [ ] Transit planet glyphs
- [ ] Transit-to-natal aspect lines
- [ ] Toggle between wheel types

## Zodiac Sign Colors

```javascript
const SIGN_COLORS = {
  'Aries': '#FF6B6B',      // Red
  'Taurus': '#8B4513',     // Brown
  'Gemini': '#FFD93D',     // Yellow
  'Cancer': '#A8E6CF',     // Light blue
  'Leo': '#FF8C42',        // Orange
  'Virgo': '#8B7355',      // Earth brown
  'Libra': '#B4E7CE',      // Light green
  'Scorpio': '#8B0000',    // Dark red
  'Sagittarius': '#9B59B6', // Purple
  'Capricorn': '#654321',  // Dark brown
  'Aquarius': '#6FB1C6',   // Aqua
  'Pisces': '#B4A7D6'      // Lavender
};
```

## Zodiac Sign Glyphs (Unicode)

```javascript
const SIGN_GLYPHS = {
  'Aries': '♈',
  'Taurus': '♉',
  'Gemini': '♊',
  'Cancer': '♋',
  'Leo': '♌',
  'Virgo': '♍',
  'Libra': '♎',
  'Scorpio': '♏',
  'Sagittarius': '♐',
  'Capricorn': '♑',
  'Aquarius': '♒',
  'Pisces': '♓'
};
```

## Planet Glyphs (Unicode)

```javascript
const PLANET_GLYPHS = {
  'Sun': '☉',
  'Moon': '☽',
  'Mercury': '☿',
  'Venus': '♀',
  'Mars': '♂',
  'Jupiter': '♃',
  'Saturn': '♄',
  'Uranus': '♅',
  'Neptune': '♆',
  'Pluto': '♇',
  'North Node': '☊',
  'South Node': '☋'
};
```

## Aspect Symbols & Colors

```javascript
const ASPECT_STYLES = {
  CONJUNCTION: { symbol: '☌', color: '#9B59B6', name: 'Conjunction' },
  SEXTILE: { symbol: '⚹', color: '#3498DB', name: 'Sextile' },
  SQUARE: { symbol: '□', color: '#E74C3C', name: 'Square' },
  TRINE: { symbol: '△', color: '#2ECC71', name: 'Trine' },
  OPPOSITION: { symbol: '☍', color: '#E67E22', name: 'Opposition' }
};
```

## Next Steps

1. Create basic SVG structure with viewBox
2. Implement coordinate conversion functions
3. Render zodiac ring (12 colored sections)
4. Render house cusps and numbers
5. Render planet glyphs at correct positions
6. Add aspect lines
7. Make it interactive

## Tips for Claude Code

- Use React hooks for state management (aspect visibility toggles)
- Keep rendering functions pure and modular
- Use SVG groups `<g>` to organize related elements
- Test with the existing chartData structure
- Start simple - get one element working before adding complexity
