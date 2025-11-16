/**
 * Chart Calculator Module
 *
 * NOW USING SWISS EPHEMERIS - Professional-grade astrological calculations
 *
 * This module wraps swissEphemerisCalculator.js to maintain compatibility
 * with existing code while providing Swiss Ephemeris accuracy.
 */

const swissCalc = require('./swissEphemerisCalculator');

// Re-export the Swiss Ephemeris calculateChart function
// This maintains API compatibility with the old astronomy-engine version
module.exports = {
  calculateChart: swissCalc.calculateChart
};
