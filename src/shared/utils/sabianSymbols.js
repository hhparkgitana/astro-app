const fs = require('fs');
const path = require('path');

// Load Sabian symbols data
let sabianData = null;

function loadSabianSymbols() {
  if (!sabianData) {
    const dataPath = path.join(__dirname, '..', 'data', 'sabianSymbols.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    sabianData = JSON.parse(rawData);
  }
  return sabianData;
}

/**
 * Get the Sabian symbol for a given longitude
 * @param {number} longitude - The ecliptic longitude in degrees (0-360)
 * @returns {object} The Sabian symbol object with degree, symbol, keynote, phase, and theme
 */
function getSabianSymbol(longitude) {
  const data = loadSabianSymbols();

  // Normalize longitude to 0-360 range
  let normalizedLong = longitude % 360;
  if (normalizedLong < 0) normalizedLong += 360;

  // Determine the sign (0-11 for Aries-Pisces)
  const signIndex = Math.floor(normalizedLong / 30);

  // Get degree within sign (0-30)
  const degreeInSign = normalizedLong % 30;

  // Round UP to get the Sabian degree (1-30)
  // Important: The rule is to always go to the next integer
  // 0.0-1.0 → 1, 1.01-2.0 → 2, etc.
  const sabianDegree = Math.ceil(degreeInSign) || 1; // Handle 0.0 case

  // Map sign index to sign name
  const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
                 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  const signName = signs[signIndex];

  // Lookup the symbol
  const signData = data[signName];
  if (!signData) {
    throw new Error(`Sign data not found for ${signName}`);
  }

  // Find the degree (array is 0-indexed, so degree 1 is at index 0)
  const symbolData = signData.find(entry => entry.degree === sabianDegree);

  if (!symbolData) {
    throw new Error(`Symbol not found for ${signName} degree ${sabianDegree}`);
  }

  return {
    sign: signName.charAt(0).toUpperCase() + signName.slice(1), // Capitalize
    degree: sabianDegree,
    exactDegree: degreeInSign.toFixed(2),
    ...symbolData
  };
}

/**
 * Get Sabian symbol formatted as a string
 * @param {number} longitude - The ecliptic longitude in degrees (0-360)
 * @returns {string} Formatted Sabian symbol description
 */
function formatSabianSymbol(longitude) {
  const sabian = getSabianSymbol(longitude);
  return `${sabian.sign} ${sabian.degree}° (${sabian.exactDegree}°): "${sabian.symbol}" - ${sabian.keynote}`;
}

module.exports = {
  getSabianSymbol,
  formatSabianSymbol
};
