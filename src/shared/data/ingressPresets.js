/**
 * Ingress Chart Preset Locations
 *
 * Pre-configured locations for quick ingress generation:
 * - Major nation capitals (for national mundane astrology)
 * - Financial centers (for market forecasting)
 * - Historical and spiritual centers
 */

/**
 * Major Nation Capitals
 * Use capital cities as the seat of government and national power
 */
export const NATION_CAPITALS = [
  {
    id: 'usa',
    name: 'United States',
    city: 'Washington DC',
    latitude: 38.9072,
    longitude: -77.0369,
    timezone: 'America/New_York',
    flag: '🇺🇸',
    category: 'nation'
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    city: 'London',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    flag: '🇬🇧',
    category: 'nation'
  },
  {
    id: 'china',
    name: 'China',
    city: 'Beijing',
    latitude: 39.9042,
    longitude: 116.4074,
    timezone: 'Asia/Shanghai',
    flag: '🇨🇳',
    category: 'nation'
  },
  {
    id: 'japan',
    name: 'Japan',
    city: 'Tokyo',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
    flag: '🇯🇵',
    category: 'nation'
  },
  {
    id: 'germany',
    name: 'Germany',
    city: 'Berlin',
    latitude: 52.5200,
    longitude: 13.4050,
    timezone: 'Europe/Berlin',
    flag: '🇩🇪',
    category: 'nation'
  },
  {
    id: 'france',
    name: 'France',
    city: 'Paris',
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: 'Europe/Paris',
    flag: '🇫🇷',
    category: 'nation'
  },
  {
    id: 'india',
    name: 'India',
    city: 'New Delhi',
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: 'Asia/Kolkata',
    flag: '🇮🇳',
    category: 'nation'
  },
  {
    id: 'brazil',
    name: 'Brazil',
    city: 'Brasília',
    latitude: -15.8267,
    longitude: -47.9218,
    timezone: 'America/Sao_Paulo',
    flag: '🇧🇷',
    category: 'nation'
  },
  {
    id: 'russia',
    name: 'Russia',
    city: 'Moscow',
    latitude: 55.7558,
    longitude: 37.6173,
    timezone: 'Europe/Moscow',
    flag: '🇷🇺',
    category: 'nation'
  },
  {
    id: 'canada',
    name: 'Canada',
    city: 'Ottawa',
    latitude: 45.4215,
    longitude: -75.6972,
    timezone: 'America/Toronto',
    flag: '🇨🇦',
    category: 'nation'
  },
  {
    id: 'australia',
    name: 'Australia',
    city: 'Canberra',
    latitude: -35.2809,
    longitude: 149.1300,
    timezone: 'Australia/Sydney',
    flag: '🇦🇺',
    category: 'nation'
  },
  {
    id: 'mexico',
    name: 'Mexico',
    city: 'Mexico City',
    latitude: 19.4326,
    longitude: -99.1332,
    timezone: 'America/Mexico_City',
    flag: '🇲🇽',
    category: 'nation'
  },
  {
    id: 'italy',
    name: 'Italy',
    city: 'Rome',
    latitude: 41.9028,
    longitude: 12.4964,
    timezone: 'Europe/Rome',
    flag: '🇮🇹',
    category: 'nation'
  },
  {
    id: 'spain',
    name: 'Spain',
    city: 'Madrid',
    latitude: 40.4168,
    longitude: -3.7038,
    timezone: 'Europe/Madrid',
    flag: '🇪🇸',
    category: 'nation'
  },
  {
    id: 'south_korea',
    name: 'South Korea',
    city: 'Seoul',
    latitude: 37.5665,
    longitude: 126.9780,
    timezone: 'Asia/Seoul',
    flag: '🇰🇷',
    category: 'nation'
  }
];

/**
 * Major Financial Centers
 * Stock exchanges and financial hubs for market forecasting
 */
export const FINANCIAL_CENTERS = [
  {
    id: 'nyse',
    name: 'New York Stock Exchange',
    city: 'New York',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
    icon: '📈',
    category: 'financial',
    description: 'NYSE - World\'s largest stock exchange'
  },
  {
    id: 'lse',
    name: 'London Stock Exchange',
    city: 'London',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    icon: '💷',
    category: 'financial',
    description: 'LSE - Major European financial hub'
  },
  {
    id: 'tsx',
    name: 'Tokyo Stock Exchange',
    city: 'Tokyo',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
    icon: '🏯',
    category: 'financial',
    description: 'TSE - Asia\'s largest stock exchange'
  },
  {
    id: 'hkex',
    name: 'Hong Kong Stock Exchange',
    city: 'Hong Kong',
    latitude: 22.3193,
    longitude: 114.1694,
    timezone: 'Asia/Hong_Kong',
    icon: '🏙️',
    category: 'financial',
    description: 'HKEX - Gateway to Chinese markets'
  },
  {
    id: 'sse',
    name: 'Shanghai Stock Exchange',
    city: 'Shanghai',
    latitude: 31.2304,
    longitude: 121.4737,
    timezone: 'Asia/Shanghai',
    icon: '🐉',
    category: 'financial',
    description: 'SSE - China\'s premier exchange'
  },
  {
    id: 'nasdaq',
    name: 'NASDAQ (Tech Hub)',
    city: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
    icon: '💻',
    category: 'financial',
    description: 'Tech and innovation center'
  },
  {
    id: 'euronext',
    name: 'Euronext',
    city: 'Paris',
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: 'Europe/Paris',
    icon: '🇪🇺',
    category: 'financial',
    description: 'Pan-European stock exchange'
  },
  {
    id: 'frankfurt',
    name: 'Frankfurt Stock Exchange',
    city: 'Frankfurt',
    latitude: 50.1109,
    longitude: 8.6821,
    timezone: 'Europe/Berlin',
    icon: '🏦',
    category: 'financial',
    description: 'Major European financial center'
  }
];

/**
 * Historical and Spiritual Centers
 * Important for cultural and spiritual mundane astrology
 */
export const SPIRITUAL_CENTERS = [
  {
    id: 'vatican',
    name: 'Vatican City',
    city: 'Vatican',
    latitude: 41.9029,
    longitude: 12.4534,
    timezone: 'Europe/Rome',
    icon: '⛪',
    category: 'spiritual',
    description: 'Catholic spiritual center'
  },
  {
    id: 'mecca',
    name: 'Mecca',
    city: 'Mecca',
    latitude: 21.4225,
    longitude: 39.8262,
    timezone: 'Asia/Riyadh',
    icon: '🕋',
    category: 'spiritual',
    description: 'Islamic holy city'
  },
  {
    id: 'jerusalem',
    name: 'Jerusalem',
    city: 'Jerusalem',
    latitude: 31.7683,
    longitude: 35.2137,
    timezone: 'Asia/Jerusalem',
    icon: '✡️',
    category: 'spiritual',
    description: 'Sacred to multiple faiths'
  },
  {
    id: 'varanasi',
    name: 'Varanasi',
    city: 'Varanasi',
    latitude: 25.3176,
    longitude: 82.9739,
    timezone: 'Asia/Kolkata',
    icon: '🕉️',
    category: 'spiritual',
    description: 'Hindu spiritual center'
  },
  {
    id: 'lhasa',
    name: 'Lhasa',
    city: 'Lhasa',
    latitude: 29.6500,
    longitude: 91.1000,
    timezone: 'Asia/Shanghai',
    icon: '☸️',
    category: 'spiritual',
    description: 'Tibetan Buddhist center'
  }
];

/**
 * US State Capitals (for state-level mundane astrology)
 */
export const US_STATE_CAPITALS = [
  {
    id: 'california',
    name: 'California',
    city: 'Sacramento',
    latitude: 38.5816,
    longitude: -121.4944,
    timezone: 'America/Los_Angeles',
    category: 'us_state'
  },
  {
    id: 'texas',
    name: 'Texas',
    city: 'Austin',
    latitude: 30.2672,
    longitude: -97.7431,
    timezone: 'America/Chicago',
    category: 'us_state'
  },
  {
    id: 'florida',
    name: 'Florida',
    city: 'Tallahassee',
    latitude: 30.4383,
    longitude: -84.2807,
    timezone: 'America/New_York',
    category: 'us_state'
  },
  {
    id: 'new_york',
    name: 'New York',
    city: 'Albany',
    latitude: 42.6526,
    longitude: -73.7562,
    timezone: 'America/New_York',
    category: 'us_state'
  },
  {
    id: 'illinois',
    name: 'Illinois',
    city: 'Springfield',
    latitude: 39.7817,
    longitude: -89.6501,
    timezone: 'America/Chicago',
    category: 'us_state'
  }
];

/**
 * Get all presets organized by category
 */
export function getAllPresets() {
  return {
    nations: NATION_CAPITALS,
    financial: FINANCIAL_CENTERS,
    spiritual: SPIRITUAL_CENTERS,
    usStates: US_STATE_CAPITALS
  };
}

/**
 * Get preset location by ID
 */
export function getPresetById(id) {
  const allPresets = [
    ...NATION_CAPITALS,
    ...FINANCIAL_CENTERS,
    ...SPIRITUAL_CENTERS,
    ...US_STATE_CAPITALS
  ];

  return allPresets.find(preset => preset.id === id);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category) {
  const categorized = getAllPresets();
  return categorized[category] || [];
}

/**
 * Search presets by name
 */
export function searchPresets(query) {
  const allPresets = [
    ...NATION_CAPITALS,
    ...FINANCIAL_CENTERS,
    ...SPIRITUAL_CENTERS,
    ...US_STATE_CAPITALS
  ];

  const lowerQuery = query.toLowerCase();

  return allPresets.filter(preset =>
    preset.name.toLowerCase().includes(lowerQuery) ||
    preset.city.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get most commonly used presets (for quick access)
 */
export function getCommonPresets() {
  return [
    getPresetById('usa'),
    getPresetById('uk'),
    getPresetById('china'),
    getPresetById('japan'),
    getPresetById('nyse'),
    getPresetById('lse')
  ];
}

export default {
  NATION_CAPITALS,
  FINANCIAL_CENTERS,
  SPIRITUAL_CENTERS,
  US_STATE_CAPITALS,
  getAllPresets,
  getPresetById,
  getPresetsByCategory,
  searchPresets,
  getCommonPresets
};
