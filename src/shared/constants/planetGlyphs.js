/**
 * Centralized Planet Glyphs and Display Configuration
 *
 * This module provides a single source of truth for:
 * - Astrological glyphs (Unicode symbols) for all celestial bodies
 * - Body categorization (traditional planets, centaurs, asteroids, calculated points)
 * - Default display settings (which bodies show by default)
 * - Helper functions for display logic
 *
 * Usage in components:
 *   import { PLANET_GLYPHS, shouldDisplayBody } from '@shared/constants/planetGlyphs';
 */

/**
 * Complete mapping of planet/body names to Unicode astrological glyphs
 */
export const PLANET_GLYPHS = {
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

  // Lunar Nodes (traditional)
  'North Node': '☊',
  'South Node': '☋',

  // Centaurs (optional)
  'Chiron': '⚷',
  'Pholus': '⯛',  // Note: Pholus has no official Unicode glyph, using approximation

  // Asteroids (optional)
  'Ceres': '⚳',
  'Pallas': '⚴',
  'Juno': '⚵',
  'Vesta': '⚶',

  // Calculated Points (optional)
  'Lilith (Mean)': '⚸',
  'Lilith (True)': '⚸',

  // Angles (always displayed)
  'Ascendant': 'AC',
  'Midheaven': 'MC',
  'Descendant': 'DC',
  'IC': 'IC'
};

/**
 * Body categorization for organizing celestial objects
 */
export const BODY_CATEGORIES = {
  traditional: [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    'North Node', 'South Node'
  ],
  centaurs: [
    'Chiron', 'Pholus'
  ],
  asteroids: [
    'Ceres', 'Pallas', 'Juno', 'Vesta'
  ],
  calculatedPoints: [
    'Lilith (Mean)', 'Lilith (True)'
  ],
  angles: [
    'Ascendant', 'Midheaven', 'Descendant', 'IC'
  ]
};

/**
 * Default display settings - which categories show by default
 * Optional bodies require user to toggle them on
 */
export const DEFAULT_DISPLAY = {
  traditional: true,    // Main planets + nodes always visible
  centaurs: false,      // Optional: Chiron, Pholus
  asteroids: false,     // Optional: Ceres, Pallas, Juno, Vesta
  calculatedPoints: false,  // Optional: Lilith (Mean/True)
  angles: true          // Angles always visible
};

/**
 * User-friendly category labels for UI controls
 */
export const CATEGORY_LABELS = {
  traditional: 'Traditional Planets',
  centaurs: 'Centaurs',
  asteroids: 'Asteroids',
  calculatedPoints: 'Calculated Points',
  angles: 'Angles'
};

/**
 * Category descriptions for UI tooltips/help text
 */
export const CATEGORY_DESCRIPTIONS = {
  traditional: 'Sun through Pluto, plus North and South Nodes',
  centaurs: 'Small celestial bodies between Jupiter and Neptune (Chiron, Pholus)',
  asteroids: 'Main belt asteroids (Ceres, Pallas, Juno, Vesta)',
  calculatedPoints: 'Mathematical points like Black Moon Lilith',
  angles: 'Chart angles (Ascendant, Midheaven, etc.)'
};

/**
 * Get the category that a body belongs to
 * @param {string} bodyName - Name of the celestial body
 * @returns {string|null} Category key or null if not found
 */
export function getBodyCategory(bodyName) {
  for (const [category, bodies] of Object.entries(BODY_CATEGORIES)) {
    if (bodies.includes(bodyName)) {
      return category;
    }
  }
  return null;
}

/**
 * Check if a body should be displayed based on display settings
 * @param {string} bodyName - Name of the celestial body
 * @param {Object} displaySettings - User's display preferences (defaults to DEFAULT_DISPLAY)
 * @returns {boolean} True if body should be displayed
 */
export function shouldDisplayBody(bodyName, displaySettings = DEFAULT_DISPLAY) {
  const category = getBodyCategory(bodyName);
  if (!category) return false;
  return displaySettings[category] !== false;
}

/**
 * Filter a planets object to only include bodies that should be displayed
 * @param {Object} planets - Planets object from chart calculation
 * @param {Object} displaySettings - User's display preferences
 * @returns {Object} Filtered planets object
 */
export function filterDisplayedBodies(planets, displaySettings = DEFAULT_DISPLAY) {
  const filtered = {};
  for (const [key, data] of Object.entries(planets)) {
    const bodyName = data.name;
    if (shouldDisplayBody(bodyName, displaySettings)) {
      filtered[key] = data;
    }
  }
  return filtered;
}

/**
 * Get all bodies in a specific category
 * @param {string} category - Category key (e.g., 'asteroids')
 * @returns {Array<string>} Array of body names in that category
 */
export function getBodiesInCategory(category) {
  return BODY_CATEGORIES[category] || [];
}

/**
 * Get glyph for a body name
 * @param {string} bodyName - Name of the celestial body
 * @param {string} fallback - Fallback text if glyph not found
 * @returns {string} Unicode glyph or fallback
 */
export function getGlyph(bodyName, fallback = '?') {
  return PLANET_GLYPHS[bodyName] || fallback;
}

/**
 * Get list of all available body names
 * @returns {Array<string>} All body names
 */
export function getAllBodyNames() {
  return Object.keys(PLANET_GLYPHS);
}

/**
 * Create default display settings object (for initializing user preferences)
 * @returns {Object} Copy of DEFAULT_DISPLAY
 */
export function createDefaultDisplaySettings() {
  return { ...DEFAULT_DISPLAY };
}
