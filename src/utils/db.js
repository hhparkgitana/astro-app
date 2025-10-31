/**
 * IndexedDB utility for persistent chart storage
 *
 * Database Schema:
 * - charts: Stores all user chart data
 *   - id: auto-incrementing primary key
 *   - name: chart name (required)
 *   - chartType: 'natal', 'composite', 'relationship', etc.
 *   - formData: complete form data for Chart A
 *   - formDataB: form data for Chart B (synastry/composite)
 *   - chartData: calculated chart data
 *   - chartDataB: calculated chart data for B
 *   - notes: user notes (optional)
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 *   - category: future use (e.g., 'family', 'clients', 'research')
 *   - tags: future use (array of strings)
 *   - isFavorite: boolean for favorites
 */

const DB_NAME = 'AstroAppDB';
const DB_VERSION = 1;
const CHARTS_STORE = 'charts';

/**
 * Open or create the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create charts object store if it doesn't exist
      if (!db.objectStoreNames.contains(CHARTS_STORE)) {
        const chartsStore = db.createObjectStore(CHARTS_STORE, {
          keyPath: 'id',
          autoIncrement: true
        });

        // Create indexes for efficient querying
        chartsStore.createIndex('name', 'name', { unique: false });
        chartsStore.createIndex('chartType', 'chartType', { unique: false });
        chartsStore.createIndex('createdAt', 'createdAt', { unique: false });
        chartsStore.createIndex('category', 'category', { unique: false });
        chartsStore.createIndex('isFavorite', 'isFavorite', { unique: false });

        console.log('IndexedDB: Charts store created');
      }
    };
  });
}

/**
 * Save a chart to the database
 * @param {object} chartRecord - Chart data to save
 * @param {string} chartRecord.name - Chart name (required)
 * @param {string} chartRecord.chartType - Type of chart
 * @param {object} chartRecord.formData - Form data for Chart A
 * @param {object} chartRecord.formDataB - Form data for Chart B (optional)
 * @param {object} chartRecord.chartData - Calculated chart data
 * @param {object} chartRecord.chartDataB - Calculated chart data B (optional)
 * @param {string} chartRecord.notes - User notes (optional)
 * @returns {Promise<number>} - ID of saved chart
 */
export async function saveChart(chartRecord) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHARTS_STORE], 'readwrite');
    const store = transaction.objectStore(CHARTS_STORE);

    const timestamp = new Date().toISOString();

    const record = {
      ...chartRecord,
      createdAt: chartRecord.createdAt || timestamp,
      updatedAt: timestamp,
      category: chartRecord.category || null,
      tags: chartRecord.tags || [],
      isFavorite: chartRecord.isFavorite || false
    };

    const request = chartRecord.id ? store.put(record) : store.add(record);

    request.onsuccess = () => {
      resolve(request.result);
      console.log('Chart saved with ID:', request.result);
    };

    request.onerror = () => {
      reject(new Error('Failed to save chart'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get a chart by ID
 * @param {number} id - Chart ID
 * @returns {Promise<object|null>}
 */
export async function getChartById(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHARTS_STORE], 'readonly');
    const store = transaction.objectStore(CHARTS_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error('Failed to get chart'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get all charts from the database
 * @param {object} options - Query options
 * @param {string} options.sortBy - Field to sort by ('createdAt', 'name', etc.)
 * @param {string} options.sortOrder - 'asc' or 'desc'
 * @returns {Promise<Array>}
 */
export async function getAllCharts(options = {}) {
  const db = await openDB();
  const { sortBy = 'createdAt', sortOrder = 'desc' } = options;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHARTS_STORE], 'readonly');
    const store = transaction.objectStore(CHARTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      let charts = request.result || [];

      // Sort results
      charts.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      resolve(charts);
    };

    request.onerror = () => {
      reject(new Error('Failed to get all charts'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Delete a chart by ID
 * @param {number} id - Chart ID to delete
 * @returns {Promise<void>}
 */
export async function deleteChart(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHARTS_STORE], 'readwrite');
    const store = transaction.objectStore(CHARTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
      console.log('Chart deleted:', id);
    };

    request.onerror = () => {
      reject(new Error('Failed to delete chart'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Update a chart
 * @param {number} id - Chart ID
 * @param {object} updates - Fields to update
 * @returns {Promise<number>} - Updated chart ID
 */
export async function updateChart(id, updates) {
  const chart = await getChartById(id);

  if (!chart) {
    throw new Error('Chart not found');
  }

  const updatedChart = {
    ...chart,
    ...updates,
    id: chart.id, // Preserve original ID
    createdAt: chart.createdAt, // Preserve creation date
    updatedAt: new Date().toISOString()
  };

  return saveChart(updatedChart);
}

/**
 * Search charts by name
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>}
 */
export async function searchChartsByName(searchTerm) {
  const allCharts = await getAllCharts();
  const term = searchTerm.toLowerCase();

  return allCharts.filter(chart =>
    chart.name.toLowerCase().includes(term) ||
    (chart.notes && chart.notes.toLowerCase().includes(term))
  );
}

/**
 * Export all charts as JSON
 * @returns {Promise<string>} - JSON string of all charts
 */
export async function exportAllCharts() {
  const charts = await getAllCharts();
  return JSON.stringify(charts, null, 2);
}

/**
 * Import charts from JSON
 * @param {string} jsonString - JSON string containing chart data
 * @returns {Promise<number>} - Number of charts imported
 */
export async function importCharts(jsonString) {
  let charts;

  try {
    charts = JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }

  if (!Array.isArray(charts)) {
    throw new Error('Import data must be an array of charts');
  }

  let importCount = 0;

  for (const chart of charts) {
    try {
      // Remove ID to allow auto-increment to assign new IDs
      const { id, ...chartWithoutId } = chart;
      await saveChart(chartWithoutId);
      importCount++;
    } catch (error) {
      console.error('Failed to import chart:', chart, error);
    }
  }

  return importCount;
}

/**
 * Get database statistics
 * @returns {Promise<object>}
 */
export async function getStats() {
  const charts = await getAllCharts();

  const stats = {
    totalCharts: charts.length,
    byType: {},
    favorites: 0
  };

  charts.forEach(chart => {
    // Count by type
    const type = chart.chartType || 'unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // Count favorites
    if (chart.isFavorite) {
      stats.favorites++;
    }
  });

  return stats;
}

/**
 * Clear all charts (use with caution!)
 * @returns {Promise<void>}
 */
export async function clearAllCharts() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHARTS_STORE], 'readwrite');
    const store = transaction.objectStore(CHARTS_STORE);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
      console.log('All charts cleared');
    };

    request.onerror = () => {
      reject(new Error('Failed to clear charts'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}
