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

// Helper function to convert longitude to zodiac sign format
function longitudeToZodiac(longitude) {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const signIndex = Math.floor(longitude / 30);
  const degreesInSign = longitude % 30;
  return `${signs[signIndex]} ${degreesInSign.toFixed(2)}°`;
}

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
        if (chart.planets) {
          Object.values(chart.planets).forEach(planet => {
            contextMessage += `${planet.name}: ${longitudeToZodiac(planet.longitude)}\n`;
          });
        }

        // Natal Houses
        if (chart.ascendant) {
          contextMessage += `\nNATAL ANGLES:\n`;
          contextMessage += `Ascendant: ${longitudeToZodiac(chart.ascendant)}\n`;
          contextMessage += `Midheaven: ${longitudeToZodiac(chart.midheaven)}\n`;
        }

        // Natal Aspects
        if (chart.aspects && chart.aspects.length > 0) {
          contextMessage += `\nNATAL ASPECTS:\n`;
          chart.aspects.slice(0, 10).forEach(aspect => {
            contextMessage += `${aspect.planet1} ${aspect.symbol} ${aspect.planet2} (orb: ${aspect.orb.toFixed(1)}°)`;
            if (aspect.applying !== null) {
              contextMessage += ` [${aspect.applying ? 'applying' : 'separating'}]`;
            }
            contextMessage += `\n`;
          });
          if (chart.aspects.length > 10) {
            contextMessage += `... and ${chart.aspects.length - 10} more aspects\n`;
          }
        }

        // TRANSITS if available
        if (chart.hasTransits && chart.transits) {
          contextMessage += `\n⭐ CURRENT TRANSITS (${chart.transits.date} at ${chart.transits.time}):\n`;
          if (chart.transits.planets) {
            Object.values(chart.transits.planets).forEach(planet => {
              contextMessage += `Transit ${planet.name}: ${longitudeToZodiac(planet.longitude)}\n`;
            });
          }

          // Transit-to-Natal Aspects
          if (chart.transits.transitAspects && chart.transits.transitAspects.length > 0) {
            contextMessage += `\nTRANSIT-TO-NATAL ASPECTS:\n`;
            chart.transits.transitAspects.slice(0, 15).forEach(aspect => {
              contextMessage += `Transit ${aspect.planet1} ${aspect.symbol} Natal ${aspect.planet2} (orb: ${aspect.orb.toFixed(1)}°)`;
              if (aspect.applying !== null) {
                contextMessage += ` [${aspect.applying ? 'applying' : 'separating'}]`;
              }
              contextMessage += `\n`;
            });
            if (chart.transits.transitAspects.length > 15) {
              contextMessage += `... and ${chart.transits.transitAspects.length - 15} more transit aspects\n`;
            }
          }
        }

        contextMessage += `\n---\n\n`;
      });
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

You must analyze astrological charts using ONLY the data provided. Never invent or assume aspects.`,
          messages: [{ role: 'user', content: contextMessage }],
          tools: [{
            name: "present_astrological_analysis",
            description: "Present astrological analysis based strictly on the provided chart data. You must ONLY reference aspects that appear in the TRANSIT-TO-NATAL ASPECTS or NATAL ASPECTS sections.",
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
          }],
          tool_choice: { type: "tool", name: "present_astrological_analysis" }
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
