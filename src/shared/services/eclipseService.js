/**
 * Eclipse Service
 *
 * Higher-level service for eclipse tracking and activation detection.
 * Wraps the low-level eclipseCalculator with caching and status tracking.
 */

const {
  findEclipses,
  findEclipsesAffectingChart
} = require('../calculations/eclipseCalculator');

/**
 * Determine activation status based on eclipse timing and orb
 *
 * @param {Object} eclipse - Eclipse with date and affected planets
 * @param {Date} currentDate - Current date
 * @param {number} orb - Orb in degrees
 * @returns {string} Status: 'approaching', 'active', 'integrating', 'complete'
 */
function determineActivationStatus(eclipse, currentDate = new Date(), orb = 3) {
  const eclipseDate = eclipse.date;
  const monthsBeforeEclipse = (eclipseDate - currentDate) / (1000 * 60 * 60 * 24 * 30);
  const monthsAfterEclipse = (currentDate - eclipseDate) / (1000 * 60 * 60 * 24 * 30);

  // Approaching: 3 months before to eclipse date
  if (monthsBeforeEclipse > 0 && monthsBeforeEclipse <= 3) {
    return 'approaching';
  }

  // Active: Eclipse date to 1 month after
  if (monthsAfterEclipse >= 0 && monthsAfterEclipse <= 1) {
    return 'active';
  }

  // Integrating: 1-6 months after
  if (monthsAfterEclipse > 1 && monthsAfterEclipse <= 6) {
    return 'integrating';
  }

  // Complete: More than 6 months after
  if (monthsAfterEclipse > 6) {
    return 'complete';
  }

  // Future: More than 3 months away
  return 'future';
}

/**
 * Find eclipse activations for a natal chart
 *
 * @param {Object} natalChart - Chart data with planets and houses
 * @param {Object} options - Configuration options
 * @param {Date} options.startDate - Start of search period
 * @param {Date} options.endDate - End of search period
 * @param {number} options.orb - Maximum orb to consider (default 3°)
 * @param {Date} options.currentDate - Reference date for status (default: now)
 * @param {string} options.filter - Filter by status (optional)
 * @returns {Array} Array of eclipse activations with enhanced metadata
 */
function findActivations(natalChart, options = {}) {
  const {
    startDate = new Date(new Date().getFullYear() - 10, 0, 1), // 10 years ago
    endDate = new Date(new Date().getFullYear() + 10, 11, 31), // 10 years ahead
    orb = 3,
    currentDate = new Date(),
    filter = null // 'approaching', 'active', 'integrating', 'complete', 'future'
  } = options;

  if (!natalChart || !natalChart.planets) {
    throw new Error('Valid natal chart with planets is required');
  }

  // Get eclipses affecting this chart
  const eclipses = findEclipsesAffectingChart(natalChart, startDate, endDate, orb);

  // Enhance with activation status
  const activations = eclipses
    .filter(eclipse => eclipse.hasImpact) // Only eclipses with impact
    .map(eclipse => ({
      ...eclipse,
      status: determineActivationStatus(eclipse, currentDate, orb),
      // Add formatted date string
      dateString: eclipse.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      // Add time string
      timeString: eclipse.date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      // Readable type
      typeLabel: eclipse.type === 'solar' ? 'Solar Eclipse' : 'Lunar Eclipse',
      kindLabel: eclipse.kind.charAt(0).toUpperCase() + eclipse.kind.slice(1)
    }));

  // Apply filter if specified
  if (filter) {
    return activations.filter(a => a.status === filter);
  }

  return activations;
}

/**
 * Get statistics about eclipse activations
 *
 * @param {Array} activations - Array of activation objects from findActivations()
 * @returns {Object} Statistics about the activations
 */
function getActivationStats(activations) {
  const stats = {
    total: activations.length,
    byStatus: {
      future: 0,
      approaching: 0,
      active: 0,
      integrating: 0,
      complete: 0
    },
    byType: {
      solar: 0,
      lunar: 0
    },
    byHouse: {}
  };

  activations.forEach(activation => {
    // Count by status
    if (activation.status) {
      stats.byStatus[activation.status] = (stats.byStatus[activation.status] || 0) + 1;
    }

    // Count by type
    if (activation.type) {
      stats.byType[activation.type] = (stats.byType[activation.type] || 0) + 1;
    }

    // Count by house
    if (activation.house) {
      stats.byHouse[activation.house] = (stats.byHouse[activation.house] || 0) + 1;
    }
  });

  return stats;
}

/**
 * Group eclipses by Saros cycle
 *
 * Saros cycle: ~18 years, 11 days, 8 hours (approximately 6585.32 days)
 * Eclipses separated by this period are part of the same Saros series
 *
 * @param {Array} activations - Array of activation objects
 * @returns {Array} Groups of related eclipses
 */
function groupBySarosCycle(activations) {
  const SAROS_PERIOD_DAYS = 6585.32;
  const TOLERANCE_DAYS = 5; // Allow slight variation

  const groups = [];

  activations.forEach(activation => {
    let foundGroup = false;

    // Check if this eclipse belongs to an existing group
    for (let group of groups) {
      const representative = group[0]; // Compare to first eclipse in group
      const daysDifference = Math.abs(
        (activation.date - representative.date) / (1000 * 60 * 60 * 24)
      );

      // Check if difference is a multiple of Saros period
      const cycles = Math.round(daysDifference / SAROS_PERIOD_DAYS);
      const expectedDays = cycles * SAROS_PERIOD_DAYS;
      const deviation = Math.abs(daysDifference - expectedDays);

      if (cycles > 0 && deviation < TOLERANCE_DAYS) {
        group.push(activation);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      groups.push([activation]);
    }
  });

  // Sort groups by earliest eclipse date
  groups.sort((a, b) => a[0].date - b[0].date);

  // Sort eclipses within each group by date
  groups.forEach(group => group.sort((a, b) => a.date - b.date));

  return groups;
}

module.exports = {
  findActivations,
  getActivationStats,
  groupBySarosCycle,
  determineActivationStatus
};
