const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Load environment variables
require('dotenv').config();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.loadURL('http://localhost:3456');  // Changed from 3000!
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle chart calculation requests
ipcMain.handle('calculate-chart', async (event, params) => {
  try {
    const { calculateChart } = require(path.join(__dirname, '..', 'shared', 'calculations', 'chartCalculator.js'));
    const result = calculateChart(params);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// Handle Claude AI chat requests
ipcMain.handle('chat-with-claude', async (event, params) => {
  try {
    // Use dynamic import for ES6 module
    const { default: Anthropic } = await import('@anthropic-ai/sdk');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'ANTHROPIC_API_KEY not found. Please add it to your .env file.'
      };
    }

    const anthropic = new Anthropic({ apiKey });
    const { message, chartContext } = params;

    // Build context from chart data
    let contextMessage = `CHART DATA:\n\n`;
    if (chartContext && chartContext.charts) {
      chartContext.charts.forEach(chart => {
        contextMessage += `${chart.label}: ${chart.name}\n`;
        contextMessage += `Birth: ${chart.birthDate} at ${chart.birthTime}\n`;
        contextMessage += `Location: ${chart.location}\n\n`;

        contextMessage += `PLANETS:\n`;
        if (chart.planets) {
          Object.values(chart.planets).forEach(planet => {
            contextMessage += `${planet.name}: ${planet.longitude?.toFixed(2)}°\n`;
          });
        }
        contextMessage += `\n---\n\n`;
      });
    }
    contextMessage += `USER QUESTION: ${message}`;

    // Try multiple models in order of preference
    const models = [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];

    let response;
    let lastError;

    for (const model of models) {
      try {
        response = await anthropic.messages.create({
          model: model,
          max_tokens: 2048,
          system: 'You are an expert professional astrologer. Provide insightful interpretations based on the chart data provided.',
          messages: [{ role: 'user', content: contextMessage }]
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

    return {
      success: true,
      message: response.content[0].text
    };
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to communicate with Claude API'
    };
  }
});

app.whenReady().then(createWindow);

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
