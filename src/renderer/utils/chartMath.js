// chartMath.js - Mathematical helpers for SVG chart rendering

/**
 * Convert astrological longitude (0-360°, 0° = Aries, counter-clockwise)
 * to SVG angle (radians, 0 = right/3 o'clock, clockwise)
 */
export function longitudeToSVGAngle(longitude) {
  // In astrology: 0° Aries is at 9 o'clock (left), going counter-clockwise
  // In SVG: 0° is at 3 o'clock (right), going clockwise
  // Formula: (180 - longitude) converts the coordinate system
  return (180 - longitude) * (Math.PI / 180);
}

/**
 * Calculate x,y coordinates for a point on a circle
 * @param {number} centerX - Center x coordinate
 * @param {number} centerY - Center y coordinate
 * @param {number} radius - Radius from center
 * @param {number} longitude - Astrological longitude (0-360)
 * @param {number} ascendant - Ascendant longitude (optional, for natal charts)
 * @returns {object} {x, y} coordinates
 */
export function pointOnCircle(centerX, centerY, radius, longitude, ascendant = 0) {
  // If ascendant is provided, position relative to it (so ascendant is at 9 o'clock)
  // Otherwise use absolute longitude (0° Aries at 9 o'clock)
  const adjustedLongitude = ascendant ? longitude - ascendant : longitude;
  const angle = longitudeToSVGAngle(adjustedLongitude);
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle)
  };
}

/**
 * Get the zodiac sign for a given longitude
 * @param {number} longitude - Astrological longitude (0-360)
 * @returns {string} Sign name
 */
export function getZodiacSign(longitude) {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const signIndex = Math.floor(longitude / 30);
  return signs[signIndex % 12];
}

/**
 * Get the degree within sign for a given longitude
 * @param {number} longitude - Astrological longitude (0-360)
 * @returns {number} Degree within sign (0-29.999...)
 */
export function getDegreeInSign(longitude) {
  return longitude % 30;
}

/**
 * Format a longitude as "degree° sign"
 * @param {number} longitude - Astrological longitude (0-360)
 * @returns {string} Formatted string like "15° Aries"
 */
export function formatLongitude(longitude) {
  const sign = getZodiacSign(longitude);
  const degree = getDegreeInSign(longitude).toFixed(2);
  return `${degree}° ${sign}`;
}

/**
 * Create an SVG path for an arc (used for zodiac sections)
 * @param {number} centerX - Center x
 * @param {number} centerY - Center y
 * @param {number} innerRadius - Inner radius of arc
 * @param {number} outerRadius - Outer radius of arc
 * @param {number} startLongitude - Starting longitude
 * @param {number} endLongitude - Ending longitude
 * @param {number} ascendant - Ascendant longitude (optional)
 * @returns {string} SVG path string
 */
export function createArcPath(centerX, centerY, innerRadius, outerRadius, startLongitude, endLongitude, ascendant = 0) {
  const startInner = pointOnCircle(centerX, centerY, innerRadius, startLongitude, ascendant);
  const endInner = pointOnCircle(centerX, centerY, innerRadius, endLongitude, ascendant);
  const startOuter = pointOnCircle(centerX, centerY, outerRadius, startLongitude, ascendant);
  const endOuter = pointOnCircle(centerX, centerY, outerRadius, endLongitude, ascendant);
  
  // Determine if arc should be large (>180°) or small
  const arcSpan = (endLongitude - startLongitude + 360) % 360;
  const largeArcFlag = arcSpan > 180 ? 1 : 0;
  
  // SVG path: move to start outer, arc to end outer, line to end inner, arc back to start inner, close
  return `
    M ${startOuter.x} ${startOuter.y}
    A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}
    L ${endInner.x} ${endInner.y}
    A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}
    Z
  `;
}

/**
 * Calculate evenly spaced points along a line for circle placement
 * @param {number} x1 - Start x coordinate
 * @param {number} y1 - Start y coordinate
 * @param {number} x2 - End x coordinate
 * @param {number} y2 - End y coordinate
 * @param {number} circleRadius - Radius of circles to be placed
 * @returns {Array} Array of {x, y} coordinates for circle centers
 */
export function calculateCirclePointsAlongLine(x1, y1, x2, y2, circleRadius) {
  // Calculate line length
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lineLength = Math.sqrt(dx * dx + dy * dy);

  // Spacing between circle centers = circle radius (as specified)
  const spacing = circleRadius * 2;

  // Calculate how many circles fit along the line
  const numCircles = Math.floor(lineLength / spacing);

  // If line is too short for even one circle, return midpoint
  if (numCircles < 1) {
    return [{ x: (x1 + x2) / 2, y: (y1 + y2) / 2 }];
  }

  // Calculate actual spacing to distribute circles evenly
  const actualSpacing = lineLength / numCircles;

  // Unit vector along the line
  const unitX = dx / lineLength;
  const unitY = dy / lineLength;

  // Generate circle positions
  const points = [];
  for (let i = 0; i <= numCircles; i++) {
    const distance = i * actualSpacing;
    points.push({
      x: x1 + unitX * distance,
      y: y1 + unitY * distance
    });
  }

  return points;
}

/**
 * Get circle radius based on aspect orb (tighter = bigger)
 * @param {number} orb - Orb in degrees (0-8)
 * @returns {number} Circle radius in pixels
 */
export function getCircleRadiusForOrb(orb) {
  if (orb <= 1) return 4.5;
  if (orb <= 3) return 3.5;
  if (orb <= 5) return 2.5;
  if (orb <= 7) return 2;
  return 1.5;
}

/**
 * Calculate radial zones for chart wheel based on configuration type
 * @param {number} totalRadius - Total available radius (e.g., 400 for 800px chart)
 * @param {string} wheelType - 'single', 'bi', or 'tri'
 * @returns {Object} Zone definitions with innerRadius and outerRadius
 */
export function calculateChartZones(totalRadius, wheelType = 'single') {
  const R = totalRadius;

  if (wheelType === 'single') {
    return {
      aspectLines: { innerRadius: 0, outerRadius: R * 0.35 },  // Increased from 0.25
      houseNumbers: { innerRadius: R * 0.38, outerRadius: R * 0.46, center: R * 0.42 },  // Adjusted
      natalPlanets: { innerRadius: R * 0.48, outerRadius: R * 0.85, center: R * 0.65 },
      zodiacWheel: { innerRadius: R * 0.85, outerRadius: R * 1.0 },
      // Circumscribed boundary circles
      boundaryCircles: [R * 0.35, R * 0.47]
    };
  } else if (wheelType === 'bi') {
    return {
      aspectLines: { innerRadius: 0, outerRadius: R * 0.30 },  // Increased from 0.20
      houseNumbers: { innerRadius: R * 0.31, outerRadius: R * 0.35, center: R * 0.33 },  // Adjusted
      natalPlanets: { innerRadius: R * 0.37, outerRadius: R * 0.51, center: R * 0.44 },  // Adjusted
      transitPlanets: { innerRadius: R * 0.54, outerRadius: R * 0.78, center: R * 0.66 },
      zodiacWheel: { innerRadius: R * 0.80, outerRadius: R * 1.0 },
      // Circumscribed boundary circles
      boundaryCircles: [R * 0.30, R * 0.36, R * 0.52]
    };
  } else if (wheelType === 'tri') {
    return {
      aspectLines: { innerRadius: 0, outerRadius: R * 0.32 },  // INCREASED from 0.25 for more breathing room
      houseNumbers: { innerRadius: R * 0.33, outerRadius: R * 0.38, center: R * 0.355 },  // Adjusted for larger aspect circle
      natalPlanets: { innerRadius: R * 0.40, outerRadius: R * 0.47, center: R * 0.435 },  // Adjusted
      progressionPlanets: { innerRadius: R * 0.50, outerRadius: R * 0.64, center: R * 0.57 },  // Adjusted
      transitPlanets: { innerRadius: R * 0.67, outerRadius: R * 0.85, center: R * 0.76 },  // Adjusted - extends to zodiac
      zodiacWheel: { innerRadius: R * 0.86, outerRadius: R * 1.0 },  // Adjusted to 0.86
      // Circumscribed boundary circles
      boundaryCircles: [R * 0.32, R * 0.39, R * 0.48, R * 0.65]
    };
  }

  // Default to single wheel
  return calculateChartZones(totalRadius, 'single');
}

/**
 * Constants for chart dimensions
 */
export const CHART_CONFIG = {
  size: 800,
  center: 400,
  // Legacy radii - will be replaced by calculateChartZones
  radii: {
    zodiac: 380,
    zodiacInner: 340
  },
  colors: {
    signs: {
      'Aries': '#FF6B6B',
      'Taurus': '#8B4513',
      'Gemini': '#FFD93D',
      'Cancer': '#A8E6CF',
      'Leo': '#FF8C42',
      'Virgo': '#8B7355',
      'Libra': '#B4E7CE',
      'Scorpio': '#8B0000',
      'Sagittarius': '#9B59B6',
      'Capricorn': '#654321',
      'Aquarius': '#6FB1C6',
      'Pisces': '#B4A7D6'
    },
    aspects: {
      CONJUNCTION: '#9B59B6',
      SEMISEXTILE: '#95A5A6',
      SEXTILE: '#3498DB',
      SQUARE: '#E74C3C',
      TRINE: '#2ECC71',
      QUINCUNX: '#8E7CC3',
      OPPOSITION: '#E67E22'
    }
  },
  glyphs: {
    signs: {
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
    },
    planets: {
      // Traditional Planets (always displayed by default)
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
      'South Node': '☋',

      // Centaurs (optional)
      'Chiron': '⚷',
      'Pholus': 'ϕ',
      'Nessus': 'ν',
      'Chariklo': 'χ',

      // Asteroids (optional)
      'Ceres': '⚳',
      'Pallas': '⚴',
      'Juno': '⚵',
      'Vesta': '⚶',

      // Calculated Points (optional)
      'Lilith (Mean)': '⚸',  // Black Moon Lilith (Mean)
      'Lilith (True)': '⚸⃰'  // Black Moon Lilith (True/Oscillating) - with combining asterisk to distinguish
    },
    aspects: {
      'CONJUNCTION': '☌',
      'SEMISEXTILE': '⚺',
      'SEXTILE': '⚹',
      'SQUARE': '□',
      'TRINE': '△',
      'QUINCUNX': '⚻',
      'OPPOSITION': '☍'
    }
  },
  // Body categorization for display settings
  bodyCategories: {
    traditional: [
      'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
      'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
      'North Node', 'South Node'
    ],
    centaurs: ['Chiron', 'Pholus', 'Nessus', 'Chariklo'],
    asteroids: ['Ceres', 'Pallas', 'Juno', 'Vesta'],
    calculatedPoints: ['Lilith (Mean)', 'Lilith (True)']
  },
  // Default display settings (which categories show by default)
  defaultDisplay: {
    traditional: true,
    centaurs: false,
    asteroids: false,
    calculatedPoints: false
  }
};

/**
 * Get the category that a planet belongs to
 * @param {string} planetName - Name of the planet/body
 * @returns {string|null} Category key or null if not found
 */
export function getPlanetCategory(planetName) {
  for (const [category, bodies] of Object.entries(CHART_CONFIG.bodyCategories)) {
    if (bodies.includes(planetName)) {
      return category;
    }
  }
  return null;
}

/**
 * Check if a planet should be displayed based on display settings
 * @param {string} planetName - Name of the planet/body
 * @param {Object} displaySettings - User's display preferences
 * @returns {boolean} True if planet should be displayed
 */
export function shouldDisplayPlanet(planetName, displaySettings = CHART_CONFIG.defaultDisplay) {
  const category = getPlanetCategory(planetName);
  if (!category) return false;
  return displaySettings[category] !== false;
}

/**
 * Filter planets object to only include bodies that should be displayed
 * @param {Object} planets - Planets object from chart calculation
 * @param {Object} displaySettings - User's display preferences
 * @returns {Object} Filtered planets object
 */
export function filterDisplayedPlanets(planets, displaySettings = CHART_CONFIG.defaultDisplay) {
  const filtered = {};
  for (const [key, data] of Object.entries(planets)) {
    const planetName = data.name;
    if (shouldDisplayPlanet(planetName, displaySettings)) {
      filtered[key] = data;
    }
  }
  return filtered;
}

/**
 * Detect planet collision groups (planets within 5° of each other)
 * @param {Object} planets - Planets object from chart calculation
 * @param {number} threshold - Collision threshold in degrees (default 5°)
 * @returns {Array} Array of collision groups, each containing planet keys and positions
 */
export function detectPlanetCollisions(planets, threshold = 5) {
  const planetArray = Object.entries(planets).map(([key, planet]) => ({
    key,
    name: planet.name,
    longitude: planet.longitude
  }));

  // Sort by longitude for easier grouping
  planetArray.sort((a, b) => a.longitude - b.longitude);

  const groups = [];
  const used = new Set();

  for (let i = 0; i < planetArray.length; i++) {
    if (used.has(planetArray[i].key)) continue;

    const group = [planetArray[i]];
    used.add(planetArray[i].key);

    // Check subsequent planets for collisions
    for (let j = i + 1; j < planetArray.length; j++) {
      if (used.has(planetArray[j].key)) continue;

      const distance = Math.abs(planetArray[j].longitude - group[0].longitude);

      // Handle wraparound at 0°/360°
      const wrappedDistance = Math.min(distance, 360 - distance);

      if (wrappedDistance <= threshold) {
        group.push(planetArray[j]);
        used.add(planetArray[j].key);
      } else {
        // Since array is sorted, no more collisions possible
        break;
      }
    }

    groups.push({
      planets: group,
      hasCollision: group.length > 1,
      centerLongitude: group.reduce((sum, p) => sum + p.longitude, 0) / group.length
    });
  }

  return groups;
}

/**
 * Filter aspects to only include those involving displayed planets
 * @param {Array} aspects - Array of aspect objects
 * @param {Object} planets - Planets object (to get planet names)
 * @param {Object} displaySettings - User's display preferences
 * @returns {Array} Filtered aspects array
 */
export function filterAspectsByDisplaySettings(aspects, planets, displaySettings = CHART_CONFIG.defaultDisplay) {
  if (!aspects || !planets) return [];

  return aspects.filter(aspect => {
    // Get planet names from the aspect
    const planet1Name = aspect.planet1; // Aspect already has planet names
    const planet2Name = aspect.planet2;

    // Both planets must be visible
    return shouldDisplayPlanet(planet1Name, displaySettings) &&
           shouldDisplayPlanet(planet2Name, displaySettings);
  });
}

/**
 * Build filtered planet order array based on display settings
 * @param {Array} fullPlanetOrder - Full array of planet names
 * @param {Object} displaySettings - User's display preferences
 * @returns {Array} Filtered planet order array
 */
export function filterPlanetOrder(fullPlanetOrder, displaySettings = CHART_CONFIG.defaultDisplay) {
  return fullPlanetOrder.filter(planetName => shouldDisplayPlanet(planetName, displaySettings));
}
