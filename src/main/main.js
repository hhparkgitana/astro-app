const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// Store will be initialized asynchronously
let store = null;

// Initialize electron-store asynchronously (ES module)
async function initializeStore() {
  if (!store) {
    const { default: Store } = await import('electron-store');
    store = new Store({
      encryptionKey: 'astrid-secure-storage-key-v1'
    });
  }
  return store;
}

// Load environment variables
require('dotenv').config();

// Load chart search utility
const { searchCharts, formatSearchResults } = require(path.join(__dirname, '..', 'shared', 'utils', 'chartSearch.js'));

// Load transit calculator
const { findTransitExactitude, findDatabaseImpact, formatDate, getZodiacSign } = require(path.join(__dirname, '..', 'shared', 'calculations', 'transitCalculator.js'));

// Load progressions calculator
const { calculateSecondaryProgressions, formatProgressionInfo } = require(path.join(__dirname, '..', 'shared', 'calculations', 'progressionsCalculator.js'));

// Load returns calculator
const { calculateSolarReturn, calculateLunarReturn } = require(path.join(__dirname, '..', 'shared', 'calculations', 'returnsCalculator.js'));

// Load aspect pattern detection
const { detectAspectPatterns } = require(path.join(__dirname, '..', 'shared', 'calculations', 'aspectsCalculator.node.js'));

// Load eclipse calculator
const { findEclipses, findEclipsesAffectingChart, findEclipsesDatabaseImpact, formatEclipseInfo } = require(path.join(__dirname, '..', 'shared', 'calculations', 'eclipseCalculator.js'));

// Load configuration search calculator
const { searchPlanetaryConfigurations, searchEclipses, getDatabaseMetadata } = require(path.join(__dirname, '..', 'shared', 'calculations', 'configurationSearchCalculator.js'));

// Load ingress calculator
const { generateIngressChart } = require(path.join(__dirname, '..', 'shared', 'calculations', 'ingressCalculator.js'));

// Lazy-load RAG system for astrological texts (only when needed to avoid Electron compatibility issues)
let rag = null;
function getRag() {
  if (!rag) {
    rag = require(path.join(__dirname, 'rag', 'index.js'));
  }
  return rag;
}

// Load Sabian symbols utility
const { getSabianSymbol } = require(path.join(__dirname, '..', 'shared', 'utils', 'sabianSymbols.js'));

let mainWindow;

// =============================================================================
// AUTO-UPDATER CONFIGURATION
// =============================================================================

// Configure auto-updater
function setupAutoUpdater() {
  // Only check for updates in production
  if (!app.isPackaged) {
    console.log('Development mode - skipping update checks');
    return;
  }

  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Log update events
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available. Current version:', info.version);
  });

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
    console.log(logMessage);
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);

    // Notify user that update is ready
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'A new version has been downloaded',
        detail: `Version ${info.version} is ready to install. The app will restart to apply the update when you quit.`,
        buttons: ['Restart Now', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          // Restart now
          autoUpdater.quitAndInstall(false, true);
        }
      });
    }
  });

  // Check for updates on app start (after a short delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 3000);

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 4 * 60 * 60 * 1000);
}

// =============================================================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Astrid',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // In development, load from Vite dev server
  // In production, load from built files
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'build', 'renderer', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:3456');
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle chart calculation requests
ipcMain.handle('calculate-chart', async (event, params) => {
  try {
    const { calculateChart } = require(path.join(__dirname, '..', 'shared', 'calculations', 'swissEphemerisCalculator.js'));
    const result = calculateChart(params);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// Handle API key get requests
ipcMain.handle('get-api-key', async () => {
  try {
    const storeInstance = await initializeStore();
    const apiKey = storeInstance.get('anthropicApiKey', '');
    return apiKey;
  } catch (error) {
    console.error('Error getting API key:', error);
    return '';
  }
});

// Handle API key set requests
ipcMain.handle('set-api-key', async (event, apiKey) => {
  try {
    const storeInstance = await initializeStore();
    if (apiKey && apiKey.trim() !== '') {
      storeInstance.set('anthropicApiKey', apiKey.trim());
    } else {
      storeInstance.delete('anthropicApiKey');
    }
    return { success: true };
  } catch (error) {
    console.error('Error setting API key:', error);
    return { success: false, error: error.message };
  }
});

// Handle debug log writing
ipcMain.handle('write-debug-log', async (event, params) => {
  try {
    // Write to project directory instead
    const logPath = path.join(__dirname, '..', '..', 'aspect-debug.log');
    const timestamp = new Date().toISOString();
    const logContent = `\n\n=== DEBUG LOG ${timestamp} ===\n${JSON.stringify(params, null, 2)}\n`;

    fs.appendFileSync(logPath, logContent);
    console.log('Debug log written to:', logPath);

    return { success: true, path: logPath };
  } catch (error) {
    console.error('Error writing debug log:', error);
    return { success: false, error: error.message };
  }
});

// Handle secondary progressions calculation requests
ipcMain.handle('calculate-progressions', async (event, params) => {
  try {
    console.log('IPC calculate-progressions - Received params:', params);
    const { natalData, target } = params;
    console.log('IPC calculate-progressions - natalData:', natalData);
    console.log('IPC calculate-progressions - target:', target);

    if (!natalData || !target) {
      throw new Error('Natal data and target (date or age) are required');
    }

    const result = calculateSecondaryProgressions(natalData, target);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error calculating progressions:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Handle Solar Return calculation requests
ipcMain.handle('calculate-solar-return', async (event, params) => {
  try {
    console.log('IPC calculate-solar-return - Received params:', params);
    const { natalData, returnYear, returnLocation } = params;

    if (!natalData || !returnYear || !returnLocation) {
      throw new Error('Natal data, return year, and return location are required');
    }

    // Import chart calculator
    const { calculateChart } = require(path.join(__dirname, '..', 'shared', 'calculations', 'swissEphemerisCalculator.js'));

    const result = await calculateSolarReturn(
      natalData,
      returnYear,
      returnLocation,
      calculateChart
    );

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error calculating Solar Return:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Handle Lunar Return calculation requests
ipcMain.handle('calculate-lunar-return', async (event, params) => {
  try {
    console.log('IPC calculate-lunar-return - Received params:', params);
    const { natalData, returnYear, returnMonth, returnLocation } = params;

    if (!natalData || !returnYear || !returnMonth || !returnLocation) {
      throw new Error('Natal data, return year, return month, and return location are required');
    }

    // Import chart calculator
    const { calculateChart } = require(path.join(__dirname, '..', 'shared', 'calculations', 'swissEphemerisCalculator.js'));

    const result = await calculateLunarReturn(
      natalData,
      returnYear,
      returnMonth,
      returnLocation,
      calculateChart
    );

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error calculating Lunar Return:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Handle eclipse calculation requests
ipcMain.handle('find-eclipses', async (event, params) => {
  try {
    const { queryType, startDate, endDate, natalChart, orb = 3 } = params;

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + (2 * 365.25 * 24 * 60 * 60 * 1000)); // Default: 2 years

    let result;

    if (queryType === 'upcoming' || queryType === 'list') {
      // Just find eclipses in date range
      result = findEclipses(start, end);
    } else if (queryType === 'affecting_chart' && natalChart) {
      // Find eclipses affecting specific chart
      result = findEclipsesAffectingChart(natalChart, start, end, orb);
    } else if (queryType === 'database_impact') {
      // Find eclipses affecting famous charts database
      const calculatedChartsPath = path.join(__dirname, '..', 'shared', 'data', 'famousChartsCalculated.json');
      const data = fs.readFileSync(calculatedChartsPath, 'utf8');
      const chartsDatabase = JSON.parse(data);
      result = findEclipsesDatabaseImpact(chartsDatabase, start, end, orb);
    } else {
      throw new Error('Invalid query type or missing required parameters');
    }

    return {
      success: true,
      data: result,
      queryType: queryType
    };
  } catch (error) {
    console.error('Error finding eclipses:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// Handle eclipse activations requests (using eclipse service)
ipcMain.handle('find-eclipse-activations', async (event, params) => {
  try {
    const { natalChart, startDate, endDate, orb = 3 } = params;

    if (!natalChart) {
      throw new Error('Natal chart is required');
    }

    const eclipseService = require(path.join(__dirname, '..', 'shared', 'services', 'eclipseService.js'));

    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear() - 10, 0, 1);
    const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear() + 10, 11, 31);

    const activations = eclipseService.findActivations(natalChart, {
      startDate: start,
      endDate: end,
      orb: orb
    });

    const stats = eclipseService.getActivationStats(activations);

    return {
      activations: activations,
      stats: stats
    };
  } catch (error) {
    console.error('Error finding eclipse activations:', error);
    throw error;
  }
});

// Handle planetary configuration search
ipcMain.handle('search-planetary-configurations', async (event, params) => {
  try {
    const { criteria, startDate, endDate } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    // Get database path
    const dbPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'shared', 'data', 'ephemeris.db')
      : path.join(__dirname, '..', 'shared', 'data', 'ephemeris.db');

    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      throw new Error('Ephemeris database not found. Please generate it first using: npm run generate-ephemeris');
    }

    // Convert ISO date strings to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Execute search
    const results = searchPlanetaryConfigurations(criteria, start, end, dbPath);

    return results;
  } catch (error) {
    console.error('Error searching planetary configurations:', error);
    throw error;
  }
});

// Handle eclipse search
ipcMain.handle('search-eclipses', async (event, params) => {
  try {
    const { criteria, startDate, endDate } = params;

    if (!startDate || !endDate) {
      throw new Error('Start date and end date are required');
    }

    // Get database path
    const dbPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'shared', 'data', 'ephemeris.db')
      : path.join(__dirname, '..', 'shared', 'data', 'ephemeris.db');

    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      throw new Error('Ephemeris database not found. Please generate it first using: npm run generate-ephemeris');
    }

    // Convert ISO date strings to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Execute search
    const results = searchEclipses(criteria, start, end, dbPath);

    return results;
  } catch (error) {
    console.error('Error searching eclipses:', error);
    throw error;
  }
});

// Get ephemeris database metadata
ipcMain.handle('get-ephemeris-metadata', async () => {
  try {
    const dbPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'shared', 'data', 'ephemeris.db')
      : path.join(__dirname, '..', 'shared', 'data', 'ephemeris.db');

    if (!fs.existsSync(dbPath)) {
      return null;
    }

    const metadata = getDatabaseMetadata(dbPath);
    return metadata;
  } catch (error) {
    console.error('Error getting ephemeris metadata:', error);
    return null;
  }
});

// Handle ingress chart generation
ipcMain.handle('generate-ingress-chart', async (event, params) => {
  try {
    const { year, ingressType, location, orb = 8 } = params;

    if (!year || !ingressType || !location) {
      throw new Error('Year, ingress type, and location are required');
    }

    // Generate ingress chart using the ingress calculator
    const ingressChart = await generateIngressChart(year, ingressType, location, orb);

    console.log(`Generated ${ingressType} ${year} ingress for ${location.name} with orb ${orb}°`);
    return ingressChart;
  } catch (error) {
    console.error('Error generating ingress chart:', error);
    throw error;
  }
});

// Handle transit timeline calculation for aspect markers
ipcMain.handle('calculate-transit-timeline', async (event, params) => {
  try {
    const swissCalc = require(path.join(__dirname, '..', 'shared', 'calculations', 'swissEphemerisCalculator.js'));
    const { natalChart, startDate, endDate, interval = 'day' } = params;

    if (!natalChart || !startDate || !endDate) {
      throw new Error('Natal chart, start date, and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const samples = [];

    // Calculate interval in milliseconds
    const intervalMs = {
      'hour': 60 * 60 * 1000,
      'day': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000
    }[interval] || 24 * 60 * 60 * 1000;

    // Sample transit positions at intervals
    for (let time = start.getTime(); time <= end.getTime(); time += intervalMs) {
      const sampleDate = new Date(time);

      try {
        const positions = {};

        // Convert date to Julian Day for Swiss Ephemeris
        const year = sampleDate.getUTCFullYear();
        const month = sampleDate.getUTCMonth() + 1;
        const day = sampleDate.getUTCDate();
        const hour = sampleDate.getUTCHours();
        const minute = sampleDate.getUTCMinutes();
        const jd = swissCalc.dateToJulianDay(year, month, day, hour, minute);

        // Calculate planetary positions using Swiss Ephemeris
        const planetList = [
          { key: 'Sun', id: swissCalc.PLANET_IDS.SUN },
          { key: 'Moon', id: swissCalc.PLANET_IDS.MOON },
          { key: 'Mercury', id: swissCalc.PLANET_IDS.MERCURY },
          { key: 'Venus', id: swissCalc.PLANET_IDS.VENUS },
          { key: 'Mars', id: swissCalc.PLANET_IDS.MARS },
          { key: 'Jupiter', id: swissCalc.PLANET_IDS.JUPITER },
          { key: 'Saturn', id: swissCalc.PLANET_IDS.SATURN },
          { key: 'Uranus', id: swissCalc.PLANET_IDS.URANUS },
          { key: 'Neptune', id: swissCalc.PLANET_IDS.NEPTUNE },
          { key: 'Pluto', id: swissCalc.PLANET_IDS.PLUTO }
        ];

        planetList.forEach(planet => {
          const pos = swissCalc.calculateBody(jd, planet.id);
          positions[planet.key] = pos.longitude;
        });

        // Calculate North Node
        const nodePos = swissCalc.calculateBody(jd, swissCalc.PLANET_IDS.TRUE_NODE);
        positions['North Node'] = nodePos.longitude;

        // Calculate South Node
        positions['South Node'] = (nodePos.longitude + 180) % 360;

        samples.push({
          date: sampleDate.toISOString(),
          timestamp: time,
          positions: positions
        });
      } catch (error) {
        console.error(`Error calculating positions for ${sampleDate}:`, error.message);
        // Continue with next sample
      }
    }

    return {
      success: true,
      samples: samples,
      sampleCount: samples.length
    };
  } catch (error) {
    console.error('Error calculating transit timeline:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Helper function to convert longitude to zodiac sign format
function longitudeToZodiac(longitude) {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const signIndex = Math.floor(longitude / 30);
  const degreesInSign = longitude % 30;
  return `${signs[signIndex]} ${degreesInSign.toFixed(2)}°`;
}

// Helper function to determine which house a planet is in
function getPlanetHouse(planetLongitude, houseCusps) {
  // House cusps are in order: houses[0] = 1st house cusp (Ascendant), houses[1] = 2nd house cusp, etc.
  for (let i = 0; i < 12; i++) {
    const currentCusp = houseCusps[i];
    const nextCusp = houseCusps[(i + 1) % 12]; // Wrap around to house 1

    // Check if planet is between current cusp and next cusp
    // Need to handle wraparound at 360°/0°
    if (nextCusp > currentCusp) {
      // Normal case: no wraparound
      if (planetLongitude >= currentCusp && planetLongitude < nextCusp) {
        return i + 1; // House numbers are 1-12
      }
    } else {
      // Wraparound case: current cusp is near 360°, next cusp is near 0°
      if (planetLongitude >= currentCusp || planetLongitude < nextCusp) {
        return i + 1;
      }
    }
  }

  // Fallback: should never reach here, but return 1 if we do
  return 1;
}

// Handle Claude AI chat requests
ipcMain.handle('chat-with-claude', async (event, params) => {
  try {
    // Use dynamic import for ES6 module
    const { default: Anthropic } = await import('@anthropic-ai/sdk');

    // Check stored API key first, then fall back to environment variable
    const storeInstance = await initializeStore();
    let apiKey = storeInstance.get('anthropicApiKey', '');
    if (!apiKey || apiKey.trim() === '') {
      apiKey = process.env.ANTHROPIC_API_KEY;
    }

    if (!apiKey) {
      return {
        success: false,
        error: 'Anthropic API key not configured. Please add your API key in Settings (gear icon in the top-right corner) or add ANTHROPIC_API_KEY to your .env file.'
      };
    }

    const anthropic = new Anthropic({ apiKey });
    const { message, chartContext } = params;

    // Build context from chart data
    console.log('=== BUILDING CHAT CONTEXT ===');
    console.log('chartContext:', JSON.stringify(chartContext, null, 2));

    let contextMessage = `CHART DATA:\n\n`;
    if (chartContext && chartContext.charts) {
      chartContext.charts.forEach(chart => {
        contextMessage += `${chart.label}: ${chart.name}\n`;
        contextMessage += `Birth: ${chart.birthDate} at ${chart.birthTime}\n`;
        contextMessage += `Location: ${chart.location}\n`;
        if (chart.timezone) contextMessage += `Timezone: ${chart.timezone}\n`;
        contextMessage += `\n`;

        // Natal Planets
        contextMessage += `NATAL PLANETS:\n`;
        if (chart.planets && chart.houses) {
          Object.values(chart.planets).forEach(planet => {
            const sabian = getSabianSymbol(planet.longitude);
            const house = getPlanetHouse(planet.longitude, chart.houses);
            contextMessage += `${planet.name}: ${longitudeToZodiac(planet.longitude)} in House ${house}\n`;
            contextMessage += `  Sabian Symbol: ${sabian.sign} ${sabian.degree}° - "${sabian.symbol}"\n`;
            contextMessage += `  Keynote: ${sabian.keynote}\n`;
          });
        }

        // Natal Houses
        if (chart.ascendant) {
          contextMessage += `\nNATAL ANGLES:\n`;
          const ascSabian = getSabianSymbol(chart.ascendant);
          const mcSabian = getSabianSymbol(chart.midheaven);
          contextMessage += `Ascendant: ${longitudeToZodiac(chart.ascendant)}\n`;
          contextMessage += `  Sabian Symbol: ${ascSabian.sign} ${ascSabian.degree}° - "${ascSabian.symbol}"\n`;
          contextMessage += `Midheaven: ${longitudeToZodiac(chart.midheaven)}\n`;
          contextMessage += `  Sabian Symbol: ${mcSabian.sign} ${mcSabian.degree}° - "${mcSabian.symbol}"\n`;
        }

        // Natal Aspects
        if (chart.aspects && chart.aspects.length > 0) {
          contextMessage += `\nNATAL ASPECTS:\n`;
          chart.aspects.forEach(aspect => {
            contextMessage += `${aspect.planet1} ${aspect.symbol} ${aspect.planet2} (orb: ${aspect.orb.toFixed(1)}°)`;
            if (aspect.applying !== null) {
              contextMessage += ` [${aspect.applying ? 'applying' : 'separating'}]`;
            }
            contextMessage += `\n`;
          });

          // Detect and add aspect patterns for natal chart
          if (chart.planets) {
            // Transform planets object to use planet names as keys (for pattern detection)
            const planetsForPatternDetection = {};
            Object.entries(chart.planets).forEach(([key, planet]) => {
              planetsForPatternDetection[planet.name] = planet;
            });

            const patterns = detectAspectPatterns(chart.aspects, planetsForPatternDetection);

            // Add detected patterns
            if (patterns.yods.length > 0 || patterns.tSquares.length > 0 ||
                patterns.grandTrines.length > 0 || patterns.grandCrosses.length > 0 ||
                patterns.kites.length > 0) {
              contextMessage += `\nNATAL ASPECT PATTERNS:\n`;

              if (patterns.yods.length > 0) {
                contextMessage += `\nYODS (Finger of God):\n`;
                patterns.yods.forEach((yod, idx) => {
                  contextMessage += `YOD ${idx + 1}: ${yod.base1} and ${yod.base2} in sextile, both quincunx ${yod.apex}\n`;
                  contextMessage += `  - ${yod.base1} ${yod.sextile.symbol} ${yod.base2} (orb: ${yod.sextile.orb.toFixed(1)}°)\n`;
                  contextMessage += `  - ${yod.quincunx1.planet1} ${yod.quincunx1.symbol} ${yod.quincunx1.planet2} (orb: ${yod.quincunx1.orb.toFixed(1)}°)\n`;
                  contextMessage += `  - ${yod.quincunx2.planet1} ${yod.quincunx2.symbol} ${yod.quincunx2.planet2} (orb: ${yod.quincunx2.orb.toFixed(1)}°)\n`;
                });
              }

              if (patterns.tSquares.length > 0) {
                contextMessage += `\nT-SQUARES:\n`;
                patterns.tSquares.forEach((tsq, idx) => {
                  contextMessage += `T-SQUARE ${idx + 1}: ${tsq.opposition1} opposite ${tsq.opposition2}, both square ${tsq.apex}\n`;
                });
              }

              if (patterns.grandTrines.length > 0) {
                contextMessage += `\nGRAND TRINES:\n`;
                patterns.grandTrines.forEach((gt, idx) => {
                  contextMessage += `GRAND TRINE ${idx + 1}: ${gt.planet1}, ${gt.planet2}, and ${gt.planet3}\n`;
                });
              }

              if (patterns.grandCrosses.length > 0) {
                contextMessage += `\nGRAND CROSSES:\n`;
                patterns.grandCrosses.forEach((gc, idx) => {
                  contextMessage += `GRAND CROSS ${idx + 1}: ${gc.planet1}, ${gc.planet2}, ${gc.planet3}, and ${gc.planet4}\n`;
                });
              }

              if (patterns.kites.length > 0) {
                contextMessage += `\nKITES:\n`;
                patterns.kites.forEach((kite, idx) => {
                  contextMessage += `KITE ${idx + 1}: Grand Trine (${kite.grandTrine.planet1}, ${kite.grandTrine.planet2}, ${kite.grandTrine.planet3}) with ${kite.apex} as apex\n`;
                });
              }
            }
          }
        }

        // HOUSE RULERSHIPS if available
        if (chart.houseRulerships && chart.houseRulerships.length === 12) {
          contextMessage += `\nHOUSE RULERSHIPS:\n`;
          chart.houseRulerships.forEach(rulership => {
            contextMessage += `House ${rulership.house}: ${rulership.signOnCusp} on cusp - `;
            contextMessage += `Ruled by ${rulership.traditionalRuler}`;
            if (rulership.modernRuler !== rulership.traditionalRuler) {
              contextMessage += ` (traditional) / ${rulership.modernRuler} (modern)`;
            }
            contextMessage += `\n`;
          });
        }

        // PROGRESSIONS if available
        if (chart.progressions) {
          contextMessage += `\n🌙 ${chart.progressions.type.toUpperCase()} (${chart.progressions.date}):\n`;
          if (chart.progressions.planets && chart.houses) {
            console.log('🔍 DEBUG: chart.progressions.planets keys:', Object.keys(chart.progressions.planets));
            console.log('🔍 DEBUG: chart.progressions.planets values:', Object.values(chart.progressions.planets).map(p => p.name));
            Object.values(chart.progressions.planets).forEach(planet => {
              const sabian = getSabianSymbol(planet.longitude);
              const house = getPlanetHouse(planet.longitude, chart.houses);
              contextMessage += `Progressed ${planet.name}: ${longitudeToZodiac(planet.longitude)} in House ${house}\n`;
              contextMessage += `  Sabian Symbol: ${sabian.sign} ${sabian.degree}° - "${sabian.symbol}"\n`;
            });
          }

          // Progression-to-Natal Aspects
          if (chart.progressions.progressionNatalAspects && chart.progressions.progressionNatalAspects.length > 0) {
            contextMessage += `\nPROGRESSED-TO-NATAL ASPECTS:\n`;
            chart.progressions.progressionNatalAspects.forEach(aspect => {
              contextMessage += `Progressed ${aspect.planet1} ${aspect.symbol} Natal ${aspect.planet2} (orb: ${aspect.orb.toFixed(1)}°)`;
              if (aspect.applying !== null) {
                contextMessage += ` [${aspect.applying ? 'applying' : 'separating'}]`;
              }
              contextMessage += `\n`;
            });
          }

          // Internal Progression Aspects
          if (chart.progressions.progressionInternalAspects && chart.progressions.progressionInternalAspects.length > 0) {
            contextMessage += `\nINTERNAL PROGRESSED ASPECTS:\n`;
            chart.progressions.progressionInternalAspects.forEach(aspect => {
              contextMessage += `Progressed ${aspect.planet1} ${aspect.symbol} Progressed ${aspect.planet2} (orb: ${aspect.orb.toFixed(1)}°)\n`;
            });
          }
        }

        // TRANSITS if available
        if (chart.hasTransits && chart.transits) {
          contextMessage += `\n⭐ CURRENT TRANSITS (${chart.transits.date} at ${chart.transits.time}):\n`;
          if (chart.transits.planets && chart.houses) {
            Object.values(chart.transits.planets).forEach(planet => {
              const sabian = getSabianSymbol(planet.longitude);
              const house = getPlanetHouse(planet.longitude, chart.houses);
              contextMessage += `Transit ${planet.name}: ${longitudeToZodiac(planet.longitude)} in House ${house}\n`;
              contextMessage += `  Sabian Symbol: ${sabian.sign} ${sabian.degree}° - "${sabian.symbol}"\n`;
            });
          }

          // Transit-to-Natal Aspects
          if (chart.transits.transitAspects && chart.transits.transitAspects.length > 0) {
            contextMessage += `\nTRANSIT-TO-NATAL ASPECTS:\n`;
            chart.transits.transitAspects.forEach(aspect => {
              contextMessage += `Transit ${aspect.planet1} ${aspect.symbol} Natal ${aspect.planet2} (orb: ${aspect.orb.toFixed(1)}°)`;
              if (aspect.applying !== null) {
                contextMessage += ` [${aspect.applying ? 'applying' : 'separating'}]`;
              }
              contextMessage += `\n`;
            });
          }

          // TRI-WHEEL MODE: Transit-to-Progression Aspects (if both transits and progressions are loaded)
          if (chart.isTriWheel && chart.progressions && chart.progressions.transitProgressionAspects && chart.progressions.transitProgressionAspects.length > 0) {
            contextMessage += `\n🔮 TRI-WHEEL: TRANSIT-TO-PROGRESSED ASPECTS:\n`;
            chart.progressions.transitProgressionAspects.forEach(aspect => {
              contextMessage += `Transit ${aspect.planet1} ${aspect.symbol} Progressed ${aspect.planet2} (orb: ${aspect.orb.toFixed(1)}°)`;
              if (aspect.applying !== null) {
                contextMessage += ` [${aspect.applying ? 'applying' : 'separating'}]`;
              }
              contextMessage += `\n`;
            });
          }
        }

        contextMessage += `\n---\n\n`;
      });
    }

    // Add synastry aspects if available (relationship charts)
    if (chartContext.synastryAspects && chartContext.synastryAspects.length > 0) {
      contextMessage += `💞 SYNASTRY ASPECTS (Chart A ↔ Chart B):\n`;
      contextMessage += `This is a relationship chart showing aspects between the two people's natal planets.\n\n`;
      chartContext.synastryAspects.forEach(aspect => {
        contextMessage += `${aspect.planet1} (Chart A) ${aspect.symbol} ${aspect.planet2} (Chart B) (orb: ${aspect.orb.toFixed(1)}°)\n`;
      });
      contextMessage += `\n---\n\n`;
    }

    // Add composite chart if available
    if (chartContext.compositeChart) {
      const composite = chartContext.compositeChart;
      contextMessage += `🔮 COMPOSITE CHART (Relationship Midpoints):\n`;
      contextMessage += `This is a composite chart calculated from the midpoints of Chart A and Chart B's planets.\n`;
      contextMessage += `It represents the relationship itself as a separate entity.\n\n`;

      // Add composite planets
      contextMessage += `COMPOSITE PLANETS:\n`;
      Object.entries(composite.planets).forEach(([key, planet]) => {
        const position = longitudeToZodiac(planet.longitude);
        const house = planet.house || 'N/A';
        const sabianSymbol = planet.sabianSymbol ? `${planet.sabianSymbol.symbol} (${planet.sabianSymbol.keynote})` : 'N/A';
        contextMessage += `${planet.name}: ${position} (House ${house}) - Sabian: ${sabianSymbol}\n`;
      });
      contextMessage += `\n`;

      // Add composite angles
      if (composite.ascendant !== undefined) {
        const ascPosition = longitudeToZodiac(composite.ascendant);
        contextMessage += `COMPOSITE ASCENDANT: ${ascPosition}\n`;
      }
      if (composite.midheaven !== undefined) {
        const mcPosition = longitudeToZodiac(composite.midheaven);
        contextMessage += `COMPOSITE MIDHEAVEN: ${mcPosition}\n`;
      }
      contextMessage += `\n`;

      // Add composite aspects
      if (composite.aspects && composite.aspects.length > 0) {
        contextMessage += `COMPOSITE ASPECTS:\n`;
        composite.aspects.forEach(aspect => {
          contextMessage += `${aspect.planet1} ${aspect.symbol} ${aspect.planet2} (orb: ${aspect.orb.toFixed(1)}°)\n`;
        });

        // Detect and add aspect patterns
        // Transform planets object to use planet names as keys (for pattern detection)
        const planetsForPatternDetection = {};
        Object.entries(composite.planets).forEach(([key, planet]) => {
          planetsForPatternDetection[planet.name] = planet;
        });

        const patterns = detectAspectPatterns(composite.aspects, planetsForPatternDetection);

        // Add detected patterns
        if (patterns.yods.length > 0 || patterns.tSquares.length > 0 ||
            patterns.grandTrines.length > 0 || patterns.grandCrosses.length > 0 ||
            patterns.kites.length > 0) {
          contextMessage += `\nCOMPOSITE ASPECT PATTERNS:\n`;

          patterns.yods.forEach((yod, idx) => {
            contextMessage += `YOD ${idx + 1}: ${yod.description}\n`;
            contextMessage += `  Base: ${yod.base1} ⚹ ${yod.base2} (sextile, orb: ${yod.sextile.orb.toFixed(1)}°)\n`;
            contextMessage += `  Apex: ${yod.apex} (quincunx to both base planets)\n`;
            contextMessage += `  ${yod.base1} ⚻ ${yod.apex} (orb: ${yod.quincunx1.orb.toFixed(1)}°)\n`;
            contextMessage += `  ${yod.base2} ⚻ ${yod.apex} (orb: ${yod.quincunx2.orb.toFixed(1)}°)\n`;
          });

          patterns.tSquares.forEach((tsq, idx) => {
            contextMessage += `T-SQUARE ${idx + 1}: ${tsq.description}\n`;
            contextMessage += `  Opposition: ${tsq.opposition1} ☍ ${tsq.opposition2} (orb: ${tsq.oppositionAspect.orb.toFixed(1)}°)\n`;
            contextMessage += `  Apex: ${tsq.apex} (squares both)\n`;
          });

          patterns.grandTrines.forEach((gt, idx) => {
            contextMessage += `GRAND TRINE ${idx + 1}: ${gt.description}\n`;
            contextMessage += `  ${gt.planet1} △ ${gt.planet2} △ ${gt.planet3}\n`;
          });

          patterns.grandCrosses.forEach((gc, idx) => {
            contextMessage += `GRAND CROSS ${idx + 1}: ${gc.description}\n`;
            contextMessage += `  ${gc.planet1} ☍ ${gc.planet3}, ${gc.planet2} ☍ ${gc.planet4}\n`;
            contextMessage += `  All planets square each other\n`;
          });

          patterns.kites.forEach((kite, idx) => {
            contextMessage += `KITE ${idx + 1}: ${kite.description}\n`;
            contextMessage += `  Grand Trine: ${kite.grandTrine.planet1}, ${kite.grandTrine.planet2}, ${kite.grandTrine.planet3}\n`;
            contextMessage += `  Apex: ${kite.apex} (opposes one trine planet, sextiles the others)\n`;
          });
        }
      }
      contextMessage += `\n---\n\n`;
    }

    // Query RAG system for relevant classical texts
    try {
      const ragSystem = getRag();
      if (await ragSystem.isReady()) {
        const ragPassages = await ragSystem.queryTexts(message, { nResults: 3, minSimilarity: 0.5 });

        if (ragPassages && ragPassages.length > 0) {
          contextMessage += `\nASTROLOGICAL REFERENCE TEXTS:\n`;
          contextMessage += `The following passages from classical astrology texts may be relevant to this question:\n\n`;

          ragPassages.forEach((passage, index) => {
            contextMessage += `[${index + 1}] From "${passage.title}" by ${passage.author} (${passage.year}):\n`;
            contextMessage += `${passage.text}\n\n`;
          });

          contextMessage += `---\n\n`;
        }
      }
    } catch (error) {
      console.error('RAG query error:', error.message);
      // Continue without RAG if it fails
    }

    contextMessage += `USER QUESTION: ${message}`;

    console.log('=== CONTEXT MESSAGE BEING SENT TO CLAUDE ===');
    console.log(contextMessage);
    console.log('=== END CONTEXT ===');

    // Try multiple models in order of preference
    const models = [
      'claude-sonnet-4-20250514',
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620',
      'claude-3-haiku-20240307'
    ];

    let response;
    let lastError;

    for (const model of models) {
      try {
        response = await anthropic.messages.create({
          model: model,
          max_tokens: 4096,
          system: `You are an expert professional astrologer.

You must analyze astrological charts using ONLY the data provided. Never invent or assume aspects.

⚠️ MOST CRITICAL RULE - READ THIS FIRST ⚠️
When analyzing a COMPOSITE CHART:
- ONLY look at aspects under the heading "COMPOSITE ASPECTS:"
- These aspects do NOT contain "(Chart A)" or "(Chart B)" in their text
- If an aspect says "(Chart A)" or "(Chart B)", it is SYNASTRY, not composite
- Composite aspects look like: "Sun ⚻ Saturn (orb: 1.1°)" - NO mention of Chart A or Chart B
- Synastry aspects look like: "Sun (Chart A) △ Saturn (Chart B) (orb: 4.2°)" - WITH Chart A and Chart B

ASPECT SYMBOLS AND MEANINGS (CRITICAL):
The chart data uses these EXACT Unicode symbols for aspects:
- ☌ = Conjunction (0°)
- ⚺ = Semi-Sextile (30°)
- ⚹ = Sextile (60°)
- □ = Square (90°)
- △ = Trine (120°)
- ⚻ = Quincunx (150°) - IMPORTANT: This is NOT a trine!
- ☍ = Opposition (180°)

ALWAYS refer to the symbol in the aspect data to determine the aspect type. For example, if you see "Sun ⚻ Saturn", that is a QUINCUNX (150°), not any other aspect.

ASPECT CALCULATION:
When identifying aspects between planets, transits, or eclipses, you MUST calculate zodiacal distances correctly:
- Conjunction (0°): Same sign and degree area
- Semi-Sextile (30°): One sign apart
- Sextile (60°): Two signs apart (e.g., Pisces to Taurus, Capricorn to Pisces)
- Square (90°): Three signs apart (e.g., Pisces to Sagittarius, Pisces to Gemini)
- Trine (120°): Four signs apart (e.g., Pisces to Cancer, Pisces to Scorpio)
- Quincunx (150°): Five signs apart (e.g., Pisces to Libra, Aries to Virgo)
- Opposition (180°): Six signs apart, opposite signs (e.g., Pisces to Virgo, Aries to Libra)

Zodiac sign order: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces

NEVER claim an aspect exists unless you have verified the correct zodiacal distance. For example:
- Pisces to Sagittarius = 3 signs back = 90° = SQUARE (not opposition)
- Pisces to Virgo = 6 signs = 180° = OPPOSITION

USER CHART DATABASE:
The user has a personal chart library where they save charts. You have access to search these charts and analyze them. When the user asks about "my charts", "saved charts", "my library", or similar, use the search_user_charts tool. For transit or eclipse impacts on saved charts, use user_database_impact query type.

HOUSE PLACEMENTS:
Each planet position includes its house placement (1-12). Houses represent different life areas and contexts for planetary expression. Always consider both sign and house when interpreting planetary placements.

SECONDARY PROGRESSIONS:
This application supports secondary progressions using the day-for-a-year method. When Chart B shows progressed planets, interpret them as symbolic timing showing inner development and maturation. Progressed Sun moves ~1° per year, progressed Moon ~13° per year. Outer planets barely move in progressions.

COMPOSITE CHARTS:
This application supports composite charts calculated using the midpoint method. A composite chart represents the relationship itself as a separate entity. Each planet in the composite chart is positioned at the midpoint between the two individuals' natal planets. For example, if Person A's Sun is at 10° Aries and Person B's Sun is at 20° Aries, the composite Sun would be at 15° Aries. When planets are more than 180° apart, the midpoint is calculated "the short way around" the zodiac. The composite chart has its own houses, angles, and aspects, and should be interpreted as describing the nature and purpose of the relationship itself, not the individuals within it.

CRITICAL - DISTINGUISHING CHART TYPES:
When analyzing aspects, you MUST distinguish between three different types of aspect data:

1. NATAL ASPECTS: Aspects within a single person's birth chart
   - Format: "Sun ☌ Moon (orb: 3.5°)"
   - Found under each person's chart section (e.g., "📊 DONALD TRUMP (NATAL CHART)")
   - These are aspects between planets in ONE person's chart

2. SYNASTRY ASPECTS: Aspects between two different people's charts
   - Format: "Sun (Chart A) ☌ Moon (Chart B) (orb: 3.5°)"
   - Found under section labeled "💞 SYNASTRY ASPECTS (Chart A ↔ Chart B)"
   - These show how one person's planets aspect another person's planets
   - ALWAYS includes "(Chart A)" and "(Chart B)" in the aspect description

3. COMPOSITE ASPECTS: Aspects within the composite (midpoint) chart
   - Format: "Sun ☌ Moon (orb: 3.5°)"
   - Found under section labeled "🔮 COMPOSITE CHART (Relationship Midpoints)" in the "COMPOSITE ASPECTS:" subsection
   - These are aspects between COMPOSITE PLANETS (the midpoints), NOT between two people
   - Does NOT include "(Chart A)" or "(Chart B)" in the aspect description
   - The composite chart is treated as a single entity representing the relationship

CRITICAL RULE: When the user asks about "the composite chart", "this composite", or refers to composite aspects/patterns:
- You MUST ONLY read aspects from the "COMPOSITE ASPECTS:" section
- You MUST COMPLETELY IGNORE the "SYNASTRY ASPECTS" section
- You MUST COMPLETELY IGNORE the individual natal chart sections
- If you reference an aspect that includes "(Chart A)" or "(Chart B)", YOU ARE WRONG - that is synastry, not composite

Similarly, when asked about synastry, look ONLY at the "SYNASTRY ASPECTS" section (which will have "(Chart A)" and "(Chart B)" labels).

SABIAN SYMBOLS:
Each planet, angle (Ascendant, Midheaven), and transit position includes its Sabian Symbol - a symbolic image and keynote for that specific degree. The Sabian Symbols, channeled by Elsie Wheeler and interpreted by Marc Edmund Jones and Dane Rudhyar, provide rich symbolic meaning for the exact degree of each placement. When interpreting charts, you can reference these symbols to add depth and symbolic resonance to your analysis. The symbols are provided in the chart data for each planetary position and angle. When discussing Sabian symbols, ALWAYS include BOTH the full symbol description AND the keynote to provide complete symbolic meaning.

ASPECT PATTERNS:
When analyzing charts, look for these major aspect patterns:

YOD (Finger of God/Finger of Fate):
- Two planets in SEXTILE (60°) to each other
- Both form QUINCUNX aspects (150°) to a third planet (the apex)
- The apex planet is the focal point requiring constant adjustment
- Creates a narrow isosceles triangle shape
- Associated with destiny, spiritual mission, or karmic purpose

T-SQUARE:
- Two planets in OPPOSITION (180°) to each other
- A third planet forms SQUARES (90°) to both planets in opposition
- Creates tension and dynamic energy requiring action
- The squared planet is the focal point for resolving the opposition

GRAND TRINE:
- Three planets each TRINE (120°) to the other two
- Forms an equilateral triangle
- All three planets are in the same element (Fire, Earth, Air, or Water)
- Creates ease and flow but may lack motivation

GRAND CROSS:
- Four planets forming two oppositions (180°) that cross each other
- Each planet squares (90°) the two planets on either side
- Creates maximum tension and requires integration of all four energies

IMPORTANT: When identifying patterns, verify the EXACT aspects present. Do NOT assume a T-square when you see quincunxes and sextiles (that's a yod). Do NOT confuse aspect types - they have specific degree measurements.

IMPORTANT - HANDLING COMPLEX QUERIES:
If the user asks about future transits to a specific eclipse or degree point, you CANNOT manually calculate these. Instead:
1. Explain that to see specific transit aspects to that degree, they need to load transits for specific dates in the chart calculator
2. Provide general guidance about which signs/planets will aspect that degree based on zodiacal geometry
3. NEVER get stuck trying to manually calculate longitude values or convert degrees to different coordinate systems
4. Keep your response concise and practical - guide them to use the chart tools rather than trying to do impossible calculations`,
          messages: [{ role: 'user', content: contextMessage }],
          tools: [
            {
              name: "present_astrological_analysis",
              description: "Present astrological analysis based strictly on the provided chart data. You must ONLY reference aspects that appear in the TRANSIT-TO-NATAL ASPECTS or NATAL ASPECTS sections. Use this tool when the user asks for interpretation or analysis of the currently displayed chart.",
              input_schema: {
                type: "object",
                properties: {
                  relevant_transits: {
                    type: "array",
                    description: "List of relevant transit aspects. Each aspect MUST be copied exactly from the TRANSIT-TO-NATAL ASPECTS section - do not invent new aspects.",
                    items: {
                      type: "object",
                      properties: {
                        aspect_description: {
                          type: "string",
                          description: "Exact description as shown in the data (e.g., 'Transit Saturn ☌ Natal Jupiter (orb: 1.0°) [separating]')"
                        },
                        interpretation: {
                          type: "string",
                          description: "Astrological interpretation of this specific aspect"
                        },
                        significance: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                          description: "How significant this transit is based on orb tightness and planet importance"
                        }
                      },
                      required: ["aspect_description", "interpretation", "significance"]
                    }
                  },
                  overall_summary: {
                    type: "string",
                    description: "Brief overall summary of the most important themes from the analyzed aspects"
                  }
                },
                required: ["relevant_transits", "overall_summary"]
              }
            },
            {
              name: "search_famous_charts",
              description: "Search through the famous charts database for charts matching astrological criteria. Use this tool when the user asks to find, show, or search for charts based on planetary positions, signs, houses, aspects, or categories (like 'musicians', 'presidents', etc.). Supports both AND logic (all criteria must match) and threshold logic (at least N out of M criteria must match).",
              input_schema: {
                type: "object",
                properties: {
                  planetInSign: {
                    type: "array",
                    description: "Find charts with specific planets in specific signs",
                    items: {
                      type: "object",
                      properties: {
                        planet: {
                          type: "string",
                          enum: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "north_node", "south_node"],
                          description: "The planet to search for"
                        },
                        sign: {
                          type: "string",
                          enum: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
                          description: "The zodiac sign"
                        }
                      },
                      required: ["planet", "sign"]
                    }
                  },
                  planetInHouse: {
                    type: "array",
                    description: "Find charts with specific planets in specific houses",
                    items: {
                      type: "object",
                      properties: {
                        planet: {
                          type: "string",
                          enum: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
                          description: "The planet to search for"
                        },
                        house: {
                          type: "integer",
                          minimum: 1,
                          maximum: 12,
                          description: "The house number (1-12)"
                        }
                      },
                      required: ["planet", "house"]
                    }
                  },
                  ascendantSign: {
                    type: "string",
                    enum: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
                    description: "Find charts with a specific ascendant (rising) sign"
                  },
                  aspects: {
                    type: "array",
                    description: "Find charts with specific aspects between planets",
                    items: {
                      type: "object",
                      properties: {
                        planet1: {
                          type: "string",
                          enum: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
                          description: "First planet in the aspect"
                        },
                        planet2: {
                          type: "string",
                          enum: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
                          description: "Second planet in the aspect"
                        },
                        aspect: {
                          type: "string",
                          enum: ["conjunction", "opposition", "square", "trine", "sextile"],
                          description: "Type of aspect (optional - if omitted, finds any aspect between the planets)"
                        },
                        maxOrb: {
                          type: "number",
                          description: "Maximum orb in degrees (optional - filters to tighter orbs)"
                        }
                      },
                      required: ["planet1", "planet2"]
                    }
                  },
                  category: {
                    type: "string",
                    description: "Filter by category or tag (e.g., 'musicians', 'presidents', 'scientists', 'politicians')"
                  },
                  matchMode: {
                    type: "string",
                    enum: ["all", "threshold"],
                    description: "How to match criteria: 'all' (default) requires all specified criteria to match (AND logic), 'threshold' requires at least minMatches criteria to match (OR logic with minimum threshold). Use 'threshold' when the user asks for 'at least N of' or '2 out of 3' type queries."
                  },
                  minMatches: {
                    type: "integer",
                    minimum: 1,
                    description: "When matchMode is 'threshold', the minimum number of criteria that must match. For example, if user asks for '2 out of 3 placements', set minMatches to 2. Only used when matchMode is 'threshold'."
                  }
                },
                additionalProperties: false
              }
            },
            {
              name: "search_user_charts",
              description: "Search through the user's saved charts database for charts matching astrological criteria. Use this tool when the user asks to find, show, or search for charts in their library/saved charts based on planetary positions, signs, houses, aspects, or other criteria. Supports both AND logic (all criteria must match) and threshold logic (at least N out of M criteria must match).",
              input_schema: {
                type: "object",
                properties: {
                  planetInSign: {
                    type: "array",
                    description: "Find charts with specific planets in specific signs",
                    items: {
                      type: "object",
                      properties: {
                        planet: {
                          type: "string",
                          enum: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "north_node", "south_node"],
                          description: "The planet to search for"
                        },
                        sign: {
                          type: "string",
                          enum: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
                          description: "The zodiac sign"
                        }
                      },
                      required: ["planet", "sign"]
                    }
                  },
                  planetInHouse: {
                    type: "array",
                    description: "Find charts with specific planets in specific houses",
                    items: {
                      type: "object",
                      properties: {
                        planet: {
                          type: "string",
                          enum: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
                          description: "The planet to search for"
                        },
                        house: {
                          type: "integer",
                          minimum: 1,
                          maximum: 12,
                          description: "The house number (1-12)"
                        }
                      },
                      required: ["planet", "house"]
                    }
                  },
                  ascendantSign: {
                    type: "string",
                    enum: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
                    description: "Find charts with a specific ascendant (rising) sign"
                  },
                  aspects: {
                    type: "array",
                    description: "Find charts with specific aspects between planets",
                    items: {
                      type: "object",
                      properties: {
                        planet1: {
                          type: "string",
                          enum: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
                          description: "First planet in the aspect"
                        },
                        planet2: {
                          type: "string",
                          enum: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
                          description: "Second planet in the aspect"
                        },
                        aspect: {
                          type: "string",
                          enum: ["conjunction", "opposition", "square", "trine", "sextile"],
                          description: "Type of aspect (optional - if omitted, finds any aspect between the planets)"
                        },
                        maxOrb: {
                          type: "number",
                          description: "Maximum orb in degrees (optional - filters to tighter orbs)"
                        }
                      },
                      required: ["planet1", "planet2"]
                    }
                  },
                  nameContains: {
                    type: "string",
                    description: "Filter by charts whose name contains this text (case-insensitive)"
                  },
                  chartType: {
                    type: "string",
                    enum: ["natal", "composite", "relationship", "solar-return", "lunar-return"],
                    description: "Filter by chart type"
                  },
                  matchMode: {
                    type: "string",
                    enum: ["all", "threshold"],
                    description: "How to match criteria: 'all' (default) requires all specified criteria to match (AND logic), 'threshold' requires at least minMatches criteria to match (OR logic with minimum threshold). Use 'threshold' when the user asks for 'at least N of' or '2 out of 3' type queries."
                  },
                  minMatches: {
                    type: "integer",
                    minimum: 1,
                    description: "When matchMode is 'threshold', the minimum number of criteria that must match. For example, if user asks for '2 out of 3 placements', set minMatches to 2. Only used when matchMode is 'threshold'."
                  }
                },
                additionalProperties: false
              }
            },
            {
              name: "calculate_transits",
              description: "Calculate when transiting planets form exact aspects to natal positions, or find which charts in the database are affected by transits. Use for queries like 'When will Saturn conjunct my Venus?', 'When did Pluto square my Sun?', or 'Which charts will be affected by transiting Neptune?'",
              input_schema: {
                type: "object",
                properties: {
                  queryType: {
                    type: "string",
                    enum: ["future_timing", "historical_timing", "database_impact", "user_database_impact"],
                    description: "Type of transit query: 'future_timing' for when a transit will happen in the future, 'historical_timing' for when it happened in the past, 'database_impact' for which famous charts are affected by a transit, 'user_database_impact' for which of the user's saved charts are affected"
                  },
                  transitPlanet: {
                    type: "string",
                    enum: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
                    description: "The transiting planet"
                  },
                  aspect: {
                    type: "string",
                    enum: ["conjunction", "opposition", "square", "trine", "sextile"],
                    description: "The aspect type"
                  },
                  natalPlanet: {
                    type: "string",
                    enum: ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "ascendant", "midheaven", "any"],
                    description: "The natal planet or point. Use 'any' for database impact searches to check all natal planets"
                  },
                  natalLongitude: {
                    type: "number",
                    description: "For personal transit timing queries: the exact longitude of the natal planet in degrees (0-360). Required for future_timing and historical_timing queries when chart context is available"
                  },
                  startDate: {
                    type: "string",
                    description: "Start date for search period in YYYY-MM-DD format. Defaults to today for future queries, or 10 years ago for historical queries"
                  },
                  endDate: {
                    type: "string",
                    description: "End date for search period in YYYY-MM-DD format. Defaults to 3 years from now for future queries, or today for historical queries"
                  },
                  orb: {
                    type: "number",
                    description: "Maximum orb in degrees (default 1.0 for database searches, 2.0 for personal timing)"
                  },
                  transitDate: {
                    type: "string",
                    description: "Specific date for database impact analysis in YYYY-MM-DD format. Required for database_impact queries"
                  }
                },
                required: ["queryType", "transitPlanet", "aspect"],
                additionalProperties: false
              }
            },
            {
              name: "find_eclipses",
              description: "Find solar and lunar eclipses and analyze their impact on natal charts or the famous charts database. Use for queries like 'When's the next eclipse?', 'Show me all eclipses in 2025', 'Which eclipses will hit my Venus?', or 'Find charts affected by the March 2025 eclipse'.",
              input_schema: {
                type: "object",
                properties: {
                  queryType: {
                    type: "string",
                    enum: ["upcoming", "list", "affecting_chart", "database_impact", "user_database_impact"],
                    description: "'upcoming' or 'list' - find all eclipses in a date range, 'affecting_chart' - find eclipses affecting the current chart, 'database_impact' - find which famous charts are affected by eclipses, 'user_database_impact' - find which of the user's saved charts are affected"
                  },
                  startDate: {
                    type: "string",
                    description: "Start date in YYYY-MM-DD format. Defaults to today"
                  },
                  endDate: {
                    type: "string",
                    description: "End date in YYYY-MM-DD format. Defaults to 2 years from start date"
                  },
                  orb: {
                    type: "number",
                    description: "Maximum orb in degrees for eclipse activation (default 3°)"
                  }
                },
                required: ["queryType"],
                additionalProperties: false
              }
            }
          ]
        });
        console.log(`Successfully used model: ${model}`);
        break;
      } catch (err) {
        console.log(`Model ${model} failed:`, err.message);
        lastError = err;
        continue;
      }
    }

    if (!response) {
      throw new Error(`All models failed. Last error: ${lastError.message}`);
    }

    // Parse structured tool response
    const toolUse = response.content.find(block => block.type === 'tool_use');

    // Handle search_famous_charts tool
    if (toolUse && toolUse.name === 'search_famous_charts') {
      console.log('Claude used search_famous_charts tool with criteria:', JSON.stringify(toolUse.input, null, 2));

      // Load the calculated charts database
      const calculatedChartsPath = path.join(__dirname, '..', 'shared', 'data', 'famousChartsCalculated.json');
      let chartsDatabase;
      try {
        const data = fs.readFileSync(calculatedChartsPath, 'utf8');
        chartsDatabase = JSON.parse(data);
      } catch (error) {
        console.error('Failed to load charts database:', error);
        return {
          success: false,
          error: 'Failed to load charts database: ' + error.message
        };
      }

      // Execute the search with options
      const searchOptions = {};
      if (toolUse.input.matchMode) {
        searchOptions.matchMode = toolUse.input.matchMode;
      }
      if (toolUse.input.minMatches) {
        searchOptions.minMatches = toolUse.input.minMatches;
      }

      const searchResults = searchCharts(chartsDatabase, toolUse.input, searchOptions);
      const formattedResults = formatSearchResults(searchResults, toolUse.input);

      console.log(`Search found ${formattedResults.count} results`);

      // Continue conversation with search results
      const searchResultsMessage = `SEARCH RESULTS:\n\nFound ${formattedResults.count} charts matching the criteria.\n\n` +
        formattedResults.results.map((chart, idx) => {
          return `${idx + 1}. ${chart.name} (${chart.category})\n` +
                 `   ID: ${chart.id}\n` +
                 `   Birth: ${chart.date}${chart.time ? ' at ' + chart.time : ''}\n` +
                 `   Location: ${chart.location}\n` +
                 `   Matched: ${chart.matchedCriteria.join(', ')}\n` +
                 (chart.notes ? `   Notes: ${chart.notes.substring(0, 100)}${chart.notes.length > 100 ? '...' : ''}\n` : '');
        }).join('\n');

      // Make a second API call with the search results for Claude to format
      let finalResponse;
      for (const model of models) {
        try {
          finalResponse = await anthropic.messages.create({
            model: model,
            max_tokens: 4096,
            system: `You are an expert professional astrologer.`,
            messages: [
              { role: 'user', content: contextMessage },
              { role: 'assistant', content: response.content },
              {
                role: 'user',
                content: [{
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: searchResultsMessage
                }]
              }
            ]
          });
          break;
        } catch (err) {
          console.log(`Model ${model} failed on follow-up:`, err.message);
          continue;
        }
      }

      if (!finalResponse) {
        // Fallback: just return the results directly
        return {
          success: true,
          message: searchResultsMessage,
          searchResults: formattedResults
        };
      }

      const finalText = finalResponse.content.find(block => block.type === 'text');
      return {
        success: true,
        message: finalText ? finalText.text : searchResultsMessage,
        searchResults: formattedResults
      };
    }

    // Handle search_user_charts tool
    if (toolUse && toolUse.name === 'search_user_charts') {
      console.log('Claude used search_user_charts tool with criteria:', JSON.stringify(toolUse.input, null, 2));

      // Get user charts from the chartContext (passed from renderer)
      const userChartsRaw = (chartContext && chartContext.userCharts) || [];

      if (userChartsRaw.length === 0) {
        const noChartsMessage = `USER CHARTS DATABASE:\n\nNo saved charts found in user's library. The user needs to save some charts first before they can be searched.`;

        // Return message to Claude
        let finalResponse;
        for (const model of models) {
          try {
            finalResponse = await anthropic.messages.create({
              model: model,
              max_tokens: 4096,
              system: `You are an expert professional astrologer.`,
              messages: [
                { role: 'user', content: contextMessage },
                { role: 'assistant', content: response.content },
                {
                  role: 'user',
                  content: [{
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: noChartsMessage
                  }]
                }
              ]
            });
            break;
          } catch (err) {
            console.log(`Model ${model} failed on follow-up:`, err.message);
            continue;
          }
        }

        const finalText = finalResponse?.content.find(block => block.type === 'text');
        return {
          success: true,
          message: finalText ? finalText.text : noChartsMessage
        };
      }

      // Helper function to convert longitude to zodiac sign
      const getZodiacSign = (longitude) => {
        if (longitude === null || longitude === undefined) return null;
        const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                       'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
        const signIndex = Math.floor(longitude / 30);
        return signs[signIndex % 12];
      };

      // Transform user charts to match the format expected by searchCharts
      // User charts have chartData with planets, houses, aspects
      const userCharts = userChartsRaw.map(chart => {
        const chartData = chart.chartData || {};

        // Transform planets to include sign property
        const transformedPlanets = {};
        if (chartData.planets) {
          Object.keys(chartData.planets).forEach(planetKey => {
            const planet = chartData.planets[planetKey];
            transformedPlanets[planetKey] = {
              ...planet,
              sign: planet.sign || getZodiacSign(planet.longitude),
              house: planet.house
            };
          });
        }

        return {
          id: chart.id?.toString() || 'unknown',
          name: chart.name || 'Unnamed',
          category: chart.chartType || 'natal',
          date: chart.formData?.month && chart.formData?.day && chart.formData?.year
            ? `${chart.formData.month}/${chart.formData.day}/${chart.formData.year}`
            : 'Unknown',
          time: chart.formData?.hour && chart.formData?.minute
            ? `${chart.formData.hour}:${chart.formData.minute}`
            : undefined,
          location: chart.formData?.location || 'Unknown',
          notes: chart.notes || '',
          calculated: {
            planets: transformedPlanets,
            houses: chartData.houses || [],
            major_aspects: chartData.aspects || [],
            angles: {
              ascendant: {
                longitude: chartData.ascendant,
                sign: getZodiacSign(chartData.ascendant)
              },
              midheaven: {
                longitude: chartData.midheaven,
                sign: getZodiacSign(chartData.midheaven)
              }
            }
          }
        };
      });

      // Execute the search with options
      const searchOptions = {};
      if (toolUse.input.matchMode) {
        searchOptions.matchMode = toolUse.input.matchMode;
      }
      if (toolUse.input.minMatches) {
        searchOptions.minMatches = toolUse.input.minMatches;
      }

      const searchResults = searchCharts(userCharts, toolUse.input, searchOptions);
      const formattedResults = formatSearchResults(searchResults, toolUse.input);

      console.log(`User charts search found ${formattedResults.count} results out of ${userCharts.length} total charts`);

      // Continue conversation with search results
      const searchResultsMessage = `USER CHARTS SEARCH RESULTS:\n\nSearched ${userCharts.length} saved charts.\nFound ${formattedResults.count} charts matching the criteria.\n\n` +
        formattedResults.results.map((chart, idx) => {
          return `${idx + 1}. ${chart.name}\n` +
                 `   ID: ${chart.id}\n` +
                 `   Birth: ${chart.date}${chart.time ? ' at ' + chart.time : ''}\n` +
                 `   Location: ${chart.location}\n` +
                 `   Type: ${chart.category}\n` +
                 `   Matched: ${chart.matchedCriteria.join(', ')}\n` +
                 (chart.notes ? `   Notes: ${chart.notes.substring(0, 100)}${chart.notes.length > 100 ? '...' : ''}\n` : '');
        }).join('\n');

      // Make a second API call with the search results for Claude to format
      let finalResponse;
      for (const model of models) {
        try {
          finalResponse = await anthropic.messages.create({
            model: model,
            max_tokens: 4096,
            system: `You are an expert professional astrologer.`,
            messages: [
              { role: 'user', content: contextMessage },
              { role: 'assistant', content: response.content },
              {
                role: 'user',
                content: [{
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: searchResultsMessage
                }]
              }
            ]
          });
          break;
        } catch (err) {
          console.log(`Model ${model} failed on follow-up:`, err.message);
          continue;
        }
      }

      if (!finalResponse) {
        // Fallback: just return the results directly
        return {
          success: true,
          message: searchResultsMessage,
          searchResults: formattedResults
        };
      }

      const finalText = finalResponse.content.find(block => block.type === 'text');
      return {
        success: true,
        message: finalText ? finalText.text : searchResultsMessage,
        searchResults: formattedResults
      };
    }

    // Handle calculate_transits tool
    if (toolUse && toolUse.name === 'calculate_transits') {
      console.log('Claude used calculate_transits tool with input:', JSON.stringify(toolUse.input, null, 2));

      try {
        const { queryType, transitPlanet, aspect, natalPlanet, natalLongitude, startDate, endDate, orb, transitDate } = toolUse.input;

        let transitResults;

        if (queryType === 'database_impact' || queryType === 'user_database_impact') {
          // Database impact analysis
          if (!transitDate) {
            return {
              success: false,
              error: 'transitDate is required for database_impact queries'
            };
          }

          let chartsDatabase;

          if (queryType === 'user_database_impact') {
            // Use user's saved charts
            const userChartsRaw = (chartContext && chartContext.userCharts) || [];

            if (userChartsRaw.length === 0) {
              return {
                success: false,
                error: 'No saved charts found in user library. Save some charts first to analyze transit impacts.'
              };
            }

            // Helper function to convert longitude to zodiac sign
            const getZodiacSign = (longitude) => {
              if (longitude === null || longitude === undefined) return null;
              const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                             'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
              const signIndex = Math.floor(longitude / 30);
              return signs[signIndex % 12];
            };

            // Transform user charts to match expected format
            chartsDatabase = userChartsRaw.map(chart => {
              const chartData = chart.chartData || {};

              // Transform planets to include sign property
              const transformedPlanets = {};
              if (chartData.planets) {
                Object.keys(chartData.planets).forEach(planetKey => {
                  const planet = chartData.planets[planetKey];
                  transformedPlanets[planetKey] = {
                    ...planet,
                    sign: planet.sign || getZodiacSign(planet.longitude),
                    house: planet.house
                  };
                });
              }

              return {
                id: chart.id?.toString() || 'unknown',
                name: chart.name || 'Unnamed',
                category: chart.chartType || 'natal',
                date: chart.formData?.month && chart.formData?.day && chart.formData?.year
                  ? `${chart.formData.month}/${chart.formData.day}/${chart.formData.year}`
                  : 'Unknown',
                time: chart.formData?.hour && chart.formData?.minute
                  ? `${chart.formData.hour}:${chart.formData.minute}`
                  : undefined,
                location: chart.formData?.location || 'Unknown',
                notes: chart.notes || '',
                calculated: {
                  planets: transformedPlanets,
                  houses: chartData.houses || [],
                  major_aspects: chartData.aspects || [],
                  angles: {
                    ascendant: {
                      longitude: chartData.ascendant,
                      sign: getZodiacSign(chartData.ascendant)
                    },
                    midheaven: {
                      longitude: chartData.midheaven,
                      sign: getZodiacSign(chartData.midheaven)
                    }
                  }
                }
              };
            });
          } else {
            // Load the famous charts database
            const calculatedChartsPath = path.join(__dirname, '..', 'shared', 'data', 'famousChartsCalculated.json');
            try {
              const data = fs.readFileSync(calculatedChartsPath, 'utf8');
              chartsDatabase = JSON.parse(data);
            } catch (error) {
              console.error('Failed to load charts database:', error);
              return {
                success: false,
                error: 'Failed to load charts database: ' + error.message
              };
            }
          }

          const date = new Date(transitDate + 'T12:00:00Z');
          const searchOrb = orb || 1.0;
          const targetPlanet = natalPlanet || 'any';

          transitResults = findDatabaseImpact(transitPlanet, date, targetPlanet, aspect, searchOrb, chartsDatabase);

          // Format results message
          const resultsMessage = `TRANSIT DATABASE IMPACT:\\n\\n` +
            `Today's date: ${formatDate(new Date())}\\n` +
            `Transit: ${transitPlanet.toUpperCase()} ${aspect} on ${transitDate}\\n` +
            `Searching for natal ${targetPlanet === 'any' ? 'all planets' : targetPlanet.toUpperCase()} within ${searchOrb}° orb\\n\\n` +
            `Found ${transitResults.length} charts affected:\\n\\n` +
            transitResults.map((result, idx) => {
              return `${idx + 1}. ${result.chart.name} (${result.chart.category})\\n` +
                     `   Matches: ${result.matches.map(m => `${m.natalPlanet.toUpperCase()} at ${m.natalSign} (${m.orb.toFixed(2)}° orb)`).join(', ')}\\n`;
            }).join('\\n');

          // Continue conversation with transit results
          let finalResponse;
          for (const model of models) {
            try {
              finalResponse = await anthropic.messages.create({
                model: model,
                max_tokens: 4096,
                system: `You are an expert professional astrologer.`,
                messages: [
                  { role: 'user', content: contextMessage },
                  { role: 'assistant', content: response.content },
                  {
                    role: 'user',
                    content: [{
                      type: 'tool_result',
                      tool_use_id: toolUse.id,
                      content: resultsMessage
                    }]
                  }
                ]
              });
              break;
            } catch (err) {
              console.log(`Model ${model} failed on follow-up:`, err.message);
              continue;
            }
          }

          if (!finalResponse) {
            return {
              success: true,
              message: resultsMessage,
              transitResults: transitResults
            };
          }

          const finalText = finalResponse.content.find(block => block.type === 'text');
          return {
            success: true,
            message: finalText ? finalText.text : resultsMessage,
            transitResults: transitResults
          };

        } else {
          // Future or historical timing
          if (!natalLongitude) {
            return {
              success: false,
              error: 'natalLongitude is required for timing queries'
            };
          }

          // Set default date ranges
          const now = new Date();
          let start, end;

          if (queryType === 'future_timing') {
            start = startDate ? new Date(startDate + 'T00:00:00Z') : now;
            end = endDate ? new Date(endDate + 'T00:00:00Z') : new Date(now.getTime() + 3 * 365 * 24 * 60 * 60 * 1000); // 3 years
          } else {
            start = startDate ? new Date(startDate + 'T00:00:00Z') : new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000); // 10 years ago
            end = endDate ? new Date(endDate + 'T00:00:00Z') : now;
          }

          const searchOrb = orb || 2.0;

          console.log(`Starting transit calculation: ${transitPlanet} ${aspect} ${natalLongitude}° from ${start.toISOString()} to ${end.toISOString()}`);
          transitResults = findTransitExactitude(transitPlanet, aspect, natalLongitude, start, end, searchOrb);
          console.log(`Transit calculation complete. Found ${transitResults.length} results.`);

          // Format results message
          const resultsMessage = `TRANSIT TIMING RESULTS:\\n\\n` +
            `Today's date: ${formatDate(now)}\\n` +
            `Looking for transiting ${transitPlanet.toUpperCase()} ${aspect} natal ${(natalPlanet || 'planet').toUpperCase()} at ${getZodiacSign(natalLongitude)}\\n` +
            `Period: ${formatDate(start)} to ${formatDate(end)}\\n\\n` +
            `Found ${transitResults.length} exact hit${transitResults.length !== 1 ? 's' : ''}:\\n\\n` +
            transitResults.map((hit, idx) => {
              return `${idx + 1}. ${formatDate(hit.date)}\\n` +
                     `   Transit ${transitPlanet} at ${getZodiacSign(hit.transitLongitude)}\\n` +
                     `   Orb: ${hit.orb.toFixed(3)}°\\n` +
                     `   ${hit.isRetrograde ? 'Retrograde' : 'Direct'}\\n`;
            }).join('\\n');

          // Continue conversation with transit results
          console.log('Making follow-up API call to Claude with transit timing results...');
          let finalResponse;
          for (const model of models) {
            try {
              console.log(`Trying model: ${model}`);
              finalResponse = await anthropic.messages.create({
                model: model,
                max_tokens: 4096,
                system: `You are an expert professional astrologer.`,
                messages: [
                  { role: 'user', content: contextMessage },
                  { role: 'assistant', content: response.content },
                  {
                    role: 'user',
                    content: [{
                      type: 'tool_result',
                      tool_use_id: toolUse.id,
                      content: resultsMessage
                    }]
                  }
                ]
              });
              console.log(`Model ${model} succeeded on follow-up`);
              break;
            } catch (err) {
              console.log(`Model ${model} failed on follow-up:`, err.message);
              continue;
            }
          }
          console.log('Follow-up API call complete');

          if (!finalResponse) {
            return {
              success: true,
              message: resultsMessage,
              transitResults: transitResults
            };
          }

          const finalText = finalResponse.content.find(block => block.type === 'text');
          return {
            success: true,
            message: finalText ? finalText.text : resultsMessage,
            transitResults: transitResults
          };
        }

      } catch (error) {
        console.error('Transit calculation error:', error);
        return {
          success: false,
          error: 'Transit calculation failed: ' + error.message
        };
      }
    }

    // Handle find_eclipses tool
    if (toolUse && toolUse.name === 'find_eclipses') {
      console.log('Claude used find_eclipses tool with input:', JSON.stringify(toolUse.input, null, 2));

      try {
        const { queryType, startDate, endDate, orb } = toolUse.input;

        // Parse dates
        const start = startDate ? new Date(startDate + 'T00:00:00Z') : new Date();
        const end = endDate ? new Date(endDate + 'T00:00:00Z') : new Date(start.getTime() + (2 * 365.25 * 24 * 60 * 60 * 1000)); // Default: 2 years

        const searchOrb = orb || 3;
        let eclipses = [];

        if (queryType === 'affecting_chart' && chartContext && chartContext.charts && chartContext.charts.length > 0) {
          // Use the first chart's data for eclipse impacts
          const chart = chartContext.charts[0];
          eclipses = findEclipsesAffectingChart(chart, start, end, searchOrb);
        } else if (queryType === 'database_impact' || queryType === 'user_database_impact') {
          let chartsDatabase;

          if (queryType === 'user_database_impact') {
            // Use user's saved charts
            const userChartsRaw = (chartContext && chartContext.userCharts) || [];

            if (userChartsRaw.length === 0) {
              return {
                success: false,
                error: 'No saved charts found in user library. Save some charts first to analyze eclipse impacts.'
              };
            }

            // Helper function to convert longitude to zodiac sign
            const getZodiacSign = (longitude) => {
              if (longitude === null || longitude === undefined) return null;
              const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                             'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
              const signIndex = Math.floor(longitude / 30);
              return signs[signIndex % 12];
            };

            // Transform user charts to match expected format
            chartsDatabase = userChartsRaw.map(chart => {
              const chartData = chart.chartData || {};

              // Transform planets to include sign property
              const transformedPlanets = {};
              if (chartData.planets) {
                Object.keys(chartData.planets).forEach(planetKey => {
                  const planet = chartData.planets[planetKey];
                  transformedPlanets[planetKey] = {
                    ...planet,
                    sign: planet.sign || getZodiacSign(planet.longitude),
                    house: planet.house
                  };
                });
              }

              return {
                id: chart.id?.toString() || 'unknown',
                name: chart.name || 'Unnamed',
                category: chart.chartType || 'natal',
                date: chart.formData?.month && chart.formData?.day && chart.formData?.year
                  ? `${chart.formData.month}/${chart.formData.day}/${chart.formData.year}`
                  : 'Unknown',
                time: chart.formData?.hour && chart.formData?.minute
                  ? `${chart.formData.hour}:${chart.formData.minute}`
                  : undefined,
                location: chart.formData?.location || 'Unknown',
                notes: chart.notes || '',
                calculated: {
                  planets: transformedPlanets,
                  houses: chartData.houses || [],
                  major_aspects: chartData.aspects || [],
                  angles: {
                    ascendant: {
                      longitude: chartData.ascendant,
                      sign: getZodiacSign(chartData.ascendant)
                    },
                    midheaven: {
                      longitude: chartData.midheaven,
                      sign: getZodiacSign(chartData.midheaven)
                    }
                  }
                }
              };
            });
          } else {
            // Load famous charts database
            const calculatedChartsPath = path.join(__dirname, '..', 'shared', 'data', 'famousChartsCalculated.json');
            const data = fs.readFileSync(calculatedChartsPath, 'utf8');
            chartsDatabase = JSON.parse(data);
          }

          eclipses = findEclipsesDatabaseImpact(chartsDatabase, start, end, searchOrb);
        } else {
          // Just find eclipses in date range
          eclipses = findEclipses(start, end);
        }

        // Format results message
        const now = new Date();
        let resultsMessage = `ECLIPSE RESULTS:\n\nToday's date: ${formatDate(now)}\n`;
        resultsMessage += `Period: ${formatDate(start)} to ${formatDate(end)}\n\n`;
        resultsMessage += `Found ${eclipses.length} eclipse${eclipses.length !== 1 ? 's' : ''}:\n\n`;

        eclipses.forEach((eclipse, idx) => {
          const typeLabel = eclipse.type === 'solar' ? '☉ Solar' : '☽ Lunar';
          const kindLabel = eclipse.kind.charAt(0).toUpperCase() + eclipse.kind.slice(1);
          resultsMessage += `${idx + 1}. ${kindLabel} ${typeLabel} Eclipse\n`;
          resultsMessage += `   Date: ${formatDate(eclipse.date)}\n`;
          resultsMessage += `   Position: ${eclipse.sign}\n`;

          // Add Sabian Symbol for eclipse position
          if (eclipse.longitude !== undefined) {
            const sabianSymbol = getSabianSymbol(eclipse.longitude);
            resultsMessage += `   Sabian Symbol: ${sabianSymbol.sign} ${sabianSymbol.degree}° - "${sabianSymbol.symbol}"\n`;
            resultsMessage += `   Keynote: ${sabianSymbol.keynote}\n`;
          }

          if (eclipse.house) {
            resultsMessage += `   House: ${eclipse.house}\n`;
          }

          if (eclipse.affectedPlanets && eclipse.affectedPlanets.length > 0) {
            resultsMessage += `   Activates: `;
            resultsMessage += eclipse.affectedPlanets.map(p =>
              `${p.planet} (orb: ${p.orb.toFixed(2)}°)`
            ).join(', ');
            resultsMessage += `\n`;
          }

          if (eclipse.affectedCharts && eclipse.affectedCharts.length > 0) {
            resultsMessage += `   Affects ${eclipse.affectedCharts.length} chart(s) in database\n`;
          }

          resultsMessage += `\n`;
        });

        // Make follow-up API call with results
        let finalResponse;
        for (const model of models) {
          try {
            finalResponse = await anthropic.messages.create({
              model: model,
              max_tokens: 4096,
              system: `You are an expert professional astrologer. Eclipses are major timing indicators that activate specific degrees in the zodiac. Solar eclipses (New Moons on steroids) are about new beginnings and external events. Lunar eclipses (Full Moons on steroids) are about endings, revelations, and emotional releases. Eclipse effects can last for months.

ASPECT CALCULATION (CRITICAL):
When identifying aspects between eclipse positions and natal planets, you MUST calculate zodiacal distances correctly:
- Conjunction (0°): Same sign and degree area (e.g., 16° Pisces to 17° Pisces)
- Sextile (60°): Two signs apart (e.g., Pisces to Taurus, Capricorn to Pisces)
- Square (90°): Three signs apart (e.g., Pisces to Sagittarius, Pisces to Gemini)
- Trine (120°): Four signs apart (e.g., Pisces to Cancer, Pisces to Scorpio)
- Opposition (180°): Six signs apart, opposite signs (e.g., Pisces to Virgo, Aries to Libra)

Zodiac sign order: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces

NEVER claim an aspect exists unless you have verified the correct zodiacal distance. For example:
- Pisces to Sagittarius = 3 signs back = 90° = SQUARE (not opposition)
- Pisces to Virgo = 6 signs = 180° = OPPOSITION

SABIAN SYMBOLS:
Each eclipse includes its Sabian Symbol with both the symbolic image and keynote. When discussing Sabian symbols, ALWAYS include BOTH the full symbol description AND the keynote to provide complete symbolic meaning. Example: 'The Sabian Symbol is "A woman just risen from the sea. A seal is embracing her" with the keynote: Emergence of new forms and the fruitful interaction of the conscious and the unconscious.' Never provide only the keynote without the symbol.`,
              messages: [
                { role: 'user', content: contextMessage },
                { role: 'assistant', content: response.content },
                {
                  role: 'user',
                  content: [{
                    type: 'tool_result',
                    tool_use_id: toolUse.id,
                    content: resultsMessage
                  }]
                }
              ]
            });
            break;
          } catch (err) {
            console.log(`Model ${model} failed on follow-up:`, err.message);
            continue;
          }
        }

        if (!finalResponse) {
          return {
            success: true,
            message: resultsMessage,
            eclipses: eclipses
          };
        }

        const finalText = finalResponse.content.find(block => block.type === 'text');
        return {
          success: true,
          message: finalText ? finalText.text : resultsMessage,
          eclipses: eclipses
        };

      } catch (error) {
        console.error('Eclipse calculation error:', error);
        return {
          success: false,
          error: 'Eclipse calculation failed: ' + error.message
        };
      }
    }

    // Handle present_astrological_analysis tool
    if (toolUse && toolUse.name === 'present_astrological_analysis') {
      const analysis = toolUse.input;

      // Format the structured response into readable text
      let formattedMessage = '';

      if (analysis.relevant_transits && analysis.relevant_transits.length > 0) {
        formattedMessage += '## Relevant Aspects\n\n';

        // Group by significance
        const high = analysis.relevant_transits.filter(t => t.significance === 'high');
        const medium = analysis.relevant_transits.filter(t => t.significance === 'medium');
        const low = analysis.relevant_transits.filter(t => t.significance === 'low');

        if (high.length > 0) {
          formattedMessage += '### High Significance\n\n';
          high.forEach(transit => {
            formattedMessage += `**${transit.aspect_description}**\n\n`;
            formattedMessage += `${transit.interpretation}\n\n`;
          });
        }

        if (medium.length > 0) {
          formattedMessage += '### Medium Significance\n\n';
          medium.forEach(transit => {
            formattedMessage += `**${transit.aspect_description}**\n\n`;
            formattedMessage += `${transit.interpretation}\n\n`;
          });
        }

        if (low.length > 0) {
          formattedMessage += '### Lower Significance\n\n';
          low.forEach(transit => {
            formattedMessage += `**${transit.aspect_description}**\n\n`;
            formattedMessage += `${transit.interpretation}\n\n`;
          });
        }
      }

      if (analysis.overall_summary) {
        formattedMessage += '## Overall Summary\n\n';
        formattedMessage += analysis.overall_summary;
      }

      return {
        success: true,
        message: formattedMessage || 'No analysis available.'
      };
    }

    // Fallback to regular text response if tool wasn't used
    const textContent = response.content.find(block => block.type === 'text');
    return {
      success: true,
      message: textContent ? textContent.text : 'No response generated.'
    };
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to communicate with Claude API'
    };
  }
});

// Handle chart image export
ipcMain.handle('export-chart-image', async (event, params) => {
  try {
    const { imageBuffer, filename, format } = params;

    // Convert array back to Buffer
    const buffer = Buffer.from(imageBuffer);

    // Show save dialog
    const extension = format === 'png' ? 'png' : 'jpg';
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: `Export Chart as ${format.toUpperCase()}`,
      defaultPath: filename || `chart.${extension}`,
      filters: [
        { name: `${format.toUpperCase()} Images`, extensions: [extension] }
      ]
    });

    if (filePath) {
      fs.writeFileSync(filePath, buffer);
      return { success: true, path: filePath };
    }

    return { success: false, error: 'Export cancelled' };
  } catch (error) {
    console.error('Image export error:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
