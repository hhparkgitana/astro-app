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
 * Constants for chart dimensions
 */
export const CHART_CONFIG = {
  size: 800,
  center: 400,
  radii: {
    zodiac: 380,        // Outer zodiac ring
    zodiacInner: 340,   // Inner edge of zodiac ring
    transit: 320,       // Transit planet ring
    natal: 260,         // Natal planet ring  
    houses: 240,        // House cusp lines extend to here
    housesInner: 180,   // House numbers placed here
    aspectOuter: 240,   // Aspect lines drawn within this
    aspectInner: 0      // Aspect lines can go to center
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
      SEXTILE: '#3498DB',
      SQUARE: '#E74C3C',
      TRINE: '#2ECC71',
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
    },
    aspects: {
      'CONJUNCTION': '☌',
      'SEXTILE': '⚹',
      'SQUARE': '□',
      'TRINE': '△',
      'OPPOSITION': '☍'
    }
  }
};
