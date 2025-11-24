// Essential Dignities Calculator
// Calculates planetary dignities based on traditional astrology

// Domicile rulers (traditional + modern)
const DOMICILE_RULERS = {
  'Aries': 'Mars',
  'Taurus': 'Venus',
  'Gemini': 'Mercury',
  'Cancer': 'Moon',
  'Leo': 'Sun',
  'Virgo': 'Mercury',
  'Libra': 'Venus',
  'Scorpio': 'Mars', // Traditional; modern also uses Pluto
  'Sagittarius': 'Jupiter',
  'Capricorn': 'Saturn',
  'Aquarius': 'Saturn', // Traditional; modern also uses Uranus
  'Pisces': 'Jupiter' // Traditional; modern also uses Neptune
};

// Exaltations
const EXALTATIONS = {
  'Sun': 'Aries',
  'Moon': 'Taurus',
  'Mercury': 'Virgo',
  'Venus': 'Pisces',
  'Mars': 'Capricorn',
  'Jupiter': 'Cancer',
  'Saturn': 'Libra',
  'Uranus': 'Scorpio', // Modern
  'Neptune': 'Leo', // Modern (disputed)
  'Pluto': 'Aries' // Modern (disputed)
};

// Triplicity rulers (element rulers)
const TRIPLICITY_RULERS = {
  'Fire': { // Aries, Leo, Sagittarius
    day: 'Sun',
    night: 'Jupiter',
    participating: 'Saturn'
  },
  'Earth': { // Taurus, Virgo, Capricorn
    day: 'Venus',
    night: 'Moon',
    participating: 'Mars'
  },
  'Air': { // Gemini, Libra, Aquarius
    day: 'Saturn',
    night: 'Mercury',
    participating: 'Jupiter'
  },
  'Water': { // Cancer, Scorpio, Pisces
    day: 'Venus',
    night: 'Mars',
    participating: 'Moon'
  }
};

// Sign to element mapping
const SIGN_ELEMENTS = {
  'Aries': 'Fire', 'Leo': 'Fire', 'Sagittarius': 'Fire',
  'Taurus': 'Earth', 'Virgo': 'Earth', 'Capricorn': 'Earth',
  'Gemini': 'Air', 'Libra': 'Air', 'Aquarius': 'Air',
  'Cancer': 'Water', 'Scorpio': 'Water', 'Pisces': 'Water'
};

// Egyptian Terms (Bounds)
const EGYPTIAN_TERMS = {
  'Aries': [
    { start: 0, end: 6, ruler: 'Jupiter' },
    { start: 6, end: 14, ruler: 'Venus' },
    { start: 14, end: 21, ruler: 'Mercury' },
    { start: 21, end: 26, ruler: 'Mars' },
    { start: 26, end: 30, ruler: 'Saturn' }
  ],
  'Taurus': [
    { start: 0, end: 8, ruler: 'Venus' },
    { start: 8, end: 15, ruler: 'Mercury' },
    { start: 15, end: 22, ruler: 'Jupiter' },
    { start: 22, end: 26, ruler: 'Saturn' },
    { start: 26, end: 30, ruler: 'Mars' }
  ],
  'Gemini': [
    { start: 0, end: 7, ruler: 'Mercury' },
    { start: 7, end: 14, ruler: 'Jupiter' },
    { start: 14, end: 21, ruler: 'Venus' },
    { start: 21, end: 26, ruler: 'Mars' },
    { start: 26, end: 30, ruler: 'Saturn' }
  ],
  'Cancer': [
    { start: 0, end: 7, ruler: 'Mars' },
    { start: 7, end: 13, ruler: 'Venus' },
    { start: 13, end: 19, ruler: 'Mercury' },
    { start: 19, end: 26, ruler: 'Jupiter' },
    { start: 26, end: 30, ruler: 'Saturn' }
  ],
  'Leo': [
    { start: 0, end: 6, ruler: 'Jupiter' },
    { start: 6, end: 13, ruler: 'Venus' },
    { start: 13, end: 19, ruler: 'Saturn' },
    { start: 19, end: 25, ruler: 'Mercury' },
    { start: 25, end: 30, ruler: 'Mars' }
  ],
  'Virgo': [
    { start: 0, end: 7, ruler: 'Mercury' },
    { start: 7, end: 13, ruler: 'Venus' },
    { start: 13, end: 18, ruler: 'Jupiter' },
    { start: 18, end: 24, ruler: 'Mars' },
    { start: 24, end: 30, ruler: 'Saturn' }
  ],
  'Libra': [
    { start: 0, end: 6, ruler: 'Saturn' },
    { start: 6, end: 11, ruler: 'Venus' },
    { start: 11, end: 19, ruler: 'Jupiter' },
    { start: 19, end: 24, ruler: 'Mercury' },
    { start: 24, end: 30, ruler: 'Mars' }
  ],
  'Scorpio': [
    { start: 0, end: 6, ruler: 'Mars' },
    { start: 6, end: 14, ruler: 'Venus' },
    { start: 14, end: 21, ruler: 'Mercury' },
    { start: 21, end: 27, ruler: 'Jupiter' },
    { start: 27, end: 30, ruler: 'Saturn' }
  ],
  'Sagittarius': [
    { start: 0, end: 8, ruler: 'Jupiter' },
    { start: 8, end: 14, ruler: 'Venus' },
    { start: 14, end: 19, ruler: 'Mercury' },
    { start: 19, end: 25, ruler: 'Saturn' },
    { start: 25, end: 30, ruler: 'Mars' }
  ],
  'Capricorn': [
    { start: 0, end: 6, ruler: 'Venus' },
    { start: 6, end: 12, ruler: 'Mercury' },
    { start: 12, end: 19, ruler: 'Jupiter' },
    { start: 19, end: 25, ruler: 'Mars' },
    { start: 25, end: 30, ruler: 'Saturn' }
  ],
  'Aquarius': [
    { start: 0, end: 6, ruler: 'Saturn' },
    { start: 6, end: 12, ruler: 'Mercury' },
    { start: 12, end: 20, ruler: 'Venus' },
    { start: 20, end: 25, ruler: 'Jupiter' },
    { start: 25, end: 30, ruler: 'Mars' }
  ],
  'Pisces': [
    { start: 0, end: 8, ruler: 'Venus' },
    { start: 8, end: 14, ruler: 'Jupiter' },
    { start: 14, end: 20, ruler: 'Mercury' },
    { start: 20, end: 26, ruler: 'Mars' },
    { start: 26, end: 30, ruler: 'Saturn' }
  ]
};

// Faces/Decans (Chaldean order)
const DECAN_RULERS = {
  'Aries': ['Mars', 'Sun', 'Venus'],
  'Taurus': ['Mercury', 'Moon', 'Saturn'],
  'Gemini': ['Jupiter', 'Mars', 'Sun'],
  'Cancer': ['Venus', 'Mercury', 'Moon'],
  'Leo': ['Saturn', 'Jupiter', 'Mars'],
  'Virgo': ['Sun', 'Venus', 'Mercury'],
  'Libra': ['Moon', 'Saturn', 'Jupiter'],
  'Scorpio': ['Mars', 'Sun', 'Venus'],
  'Sagittarius': ['Mercury', 'Moon', 'Saturn'],
  'Capricorn': ['Jupiter', 'Mars', 'Sun'],
  'Aquarius': ['Venus', 'Mercury', 'Moon'],
  'Pisces': ['Saturn', 'Jupiter', 'Mars']
};

/**
 * Get opposite sign (for detriment/fall calculation)
 */
function getOppositeSign(sign) {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const index = signs.indexOf(sign);
  return signs[(index + 6) % 12];
}

/**
 * Check if planet is in domicile (rulership)
 */
function checkDomicile(planet, sign) {
  // Check modern rulerships for outer planets
  if (planet === 'Uranus' && sign === 'Aquarius') return true;
  if (planet === 'Neptune' && sign === 'Pisces') return true;
  if (planet === 'Pluto' && sign === 'Scorpio') return true;

  return DOMICILE_RULERS[sign] === planet;
}

/**
 * Check if planet is in exaltation
 */
function checkExaltation(planet, sign) {
  return EXALTATIONS[planet] === sign;
}

/**
 * Check if planet is in detriment (opposite of domicile)
 */
function checkDetriment(planet, sign) {
  // Check which sign(s) this planet rules
  const ruledSigns = [];

  // Traditional rulerships
  Object.entries(DOMICILE_RULERS).forEach(([s, p]) => {
    if (p === planet) ruledSigns.push(s);
  });

  // Modern rulerships
  if (planet === 'Uranus') ruledSigns.push('Aquarius');
  if (planet === 'Neptune') ruledSigns.push('Pisces');
  if (planet === 'Pluto') ruledSigns.push('Scorpio');

  // Check if current sign is opposite to any ruled sign
  const oppositeSign = getOppositeSign(sign);
  return ruledSigns.includes(oppositeSign);
}

/**
 * Check if planet is in fall (opposite of exaltation)
 */
function checkFall(planet, sign) {
  const exaltSign = EXALTATIONS[planet];
  if (!exaltSign) return false;

  const oppositeSign = getOppositeSign(sign);
  return exaltSign === oppositeSign;
}

/**
 * Check if planet rules the triplicity
 */
function checkTriplicity(planet, sign, isDayChart) {
  const element = SIGN_ELEMENTS[sign];
  const rulers = TRIPLICITY_RULERS[element];

  if (!rulers) return false;

  if (isDayChart) {
    return planet === rulers.day;
  } else {
    return planet === rulers.night;
  }
}

/**
 * Check if planet rules the term (Egyptian bounds)
 */
function checkTerm(planet, sign, degree) {
  const terms = EGYPTIAN_TERMS[sign];
  if (!terms) return false;

  const term = terms.find(t => degree >= t.start && degree < t.end);
  return term?.ruler === planet;
}

/**
 * Check if planet rules the face/decan
 */
function checkFace(planet, sign, degree) {
  const rulers = DECAN_RULERS[sign];
  if (!rulers) return false;

  const decanIndex = Math.floor(degree / 10); // 0-9°=0, 10-19°=1, 20-29°=2
  return rulers[decanIndex] === planet;
}

/**
 * Determine if chart is a day or night chart
 * Day chart: Sun above horizon (houses 7-12)
 */
function isDayChart(sunPosition, houses) {
  if (!sunPosition || !houses || houses.length === 0) {
    // Default to day if we can't determine
    return true;
  }

  // Check if Sun is above the horizon (between Ascendant and Descendant)
  // Sun above horizon = between houses 7-12 (or below the ASC-DESC axis in degrees)
  const ascendant = houses[0]; // House 1 cusp = Ascendant
  const descendant = (ascendant + 180) % 360; // Opposite point

  const sunLon = sunPosition.longitude;

  // Normalize to 0-360
  const normSun = ((sunLon % 360) + 360) % 360;
  const normAsc = ((ascendant % 360) + 360) % 360;
  const normDesc = ((descendant % 360) + 360) % 360;

  // Check if Sun is in the upper hemisphere (day)
  // This is between Descendant (house 7) and Ascendant (house 1), going counterclockwise
  if (normDesc < normAsc) {
    // Normal case: DESC at e.g. 90°, ASC at e.g. 270°
    return normSun >= normDesc && normSun < normAsc;
  } else {
    // Wrapped case: DESC at e.g. 270°, ASC at e.g. 90°
    return normSun >= normDesc || normSun < normAsc;
  }
}

/**
 * Get zodiac sign from longitude
 */
function getSignFromLongitude(longitude) {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer',
    'Leo', 'Virgo', 'Libra', 'Scorpio',
    'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const signIndex = Math.floor(longitude / 30) % 12;
  return signs[signIndex];
}

/**
 * Calculate all dignities for a single planet
 */
function calculatePlanetDignities(planet, isDayChartValue) {
  if (!planet || typeof planet.longitude !== 'number') return null;

  // Get sign from longitude if not already present
  const sign = planet.sign || getSignFromLongitude(planet.longitude);
  const degree = planet.longitude % 30;
  const planetName = planet.name;

  const domicile = checkDomicile(planetName, sign);
  const exaltation = checkExaltation(planetName, sign);
  const detriment = checkDetriment(planetName, sign);
  const fall = checkFall(planetName, sign);
  const triplicity = checkTriplicity(planetName, sign, isDayChartValue);
  const term = checkTerm(planetName, sign, degree);
  const face = checkFace(planetName, sign, degree);

  // Calculate total score
  const total =
    (domicile ? 5 : 0) +
    (exaltation ? 4 : 0) +
    (detriment ? -5 : 0) +
    (fall ? -4 : 0) +
    (triplicity ? 3 : 0) +
    (term ? 2 : 0) +
    (face ? 1 : 0);

  return {
    planet: planetName,
    sign: sign,
    degree: degree.toFixed(2),
    domicile,
    exaltation,
    detriment,
    fall,
    triplicity,
    term,
    face,
    total
  };
}

/**
 * Calculate dignities for all planets in a chart
 * @param {Object} chartData - Chart data with planets array and houses
 * @returns {Array} Array of dignity objects
 */
export function calculateAllDignities(chartData) {
  if (!chartData || !chartData.planets) {
    return [];
  }

  // Convert planets object to array if needed
  const planetsData = chartData.planets;
  const planetsArray = Array.isArray(planetsData)
    ? planetsData
    : Object.values(planetsData);

  // Filter to only traditional planets (Sun through Pluto)
  const traditionalPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
                              'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const filteredPlanets = planetsArray.filter(p => traditionalPlanets.includes(p.name));

  const houses = chartData.houses;

  // Find Sun to determine day/night chart
  const sun = filteredPlanets.find(p => p.name === 'Sun');
  const isDayChartValue = sun && houses ? isDayChart(sun, houses) : true;

  // Calculate dignities for traditional planets only
  const dignities = filteredPlanets
    .map(planet => calculatePlanetDignities(planet, isDayChartValue))
    .filter(d => d !== null);

  return dignities;
}

/**
 * Get score classification for styling
 */
export function getScoreClass(score) {
  if (score >= 5) return 'strong';
  if (score > 0) return 'moderate';
  if (score === 0) return 'neutral';
  if (score > -5) return 'weak';
  return 'very-weak';
}

/**
 * Get planet symbol/glyph
 */
export function getPlanetGlyph(planetName) {
  const glyphs = {
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
    'Chiron': '⚷',
    'Pholus': '⯛',
    'Ceres': '⚳',
    'Pallas': '⚴',
    'Juno': '⚵',
    'Vesta': '⚶',
    'Lilith (Mean)': '⚸',
    'Lilith (True)': '⚸'
  };

  return glyphs[planetName] || '';
}
