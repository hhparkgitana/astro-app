const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Load chart search utility
const { searchCharts, formatSearchResults } = require(path.join(__dirname, '..', 'shared', 'utils', 'chartSearch.js'));

// Load transit calculator
const { findTransitExactitude, findDatabaseImpact, formatDate, getZodiacSign } = require(path.join(__dirname, '..', 'shared', 'calculations', 'transitCalculator.js'));

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
              name: "calculate_transits",
              description: "Calculate when transiting planets form exact aspects to natal positions, or find which charts in the database are affected by transits. Use for queries like 'When will Saturn conjunct my Venus?', 'When did Pluto square my Sun?', or 'Which charts will be affected by transiting Neptune?'",
              input_schema: {
                type: "object",
                properties: {
                  queryType: {
                    type: "string",
                    enum: ["future_timing", "historical_timing", "database_impact"],
                    description: "Type of transit query: 'future_timing' for when a transit will happen in the future, 'historical_timing' for when it happened in the past, 'database_impact' for which charts are affected by a transit"
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

    // Handle calculate_transits tool
    if (toolUse && toolUse.name === 'calculate_transits') {
      console.log('Claude used calculate_transits tool with input:', JSON.stringify(toolUse.input, null, 2));

      try {
        const { queryType, transitPlanet, aspect, natalPlanet, natalLongitude, startDate, endDate, orb, transitDate } = toolUse.input;

        let transitResults;

        if (queryType === 'database_impact') {
          // Database impact analysis
          if (!transitDate) {
            return {
              success: false,
              error: 'transitDate is required for database_impact queries'
            };
          }

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

          const date = new Date(transitDate + 'T12:00:00Z');
          const searchOrb = orb || 1.0;
          const targetPlanet = natalPlanet || 'any';

          transitResults = findDatabaseImpact(transitPlanet, date, targetPlanet, aspect, searchOrb, chartsDatabase);

          // Format results message
          const resultsMessage = `TRANSIT DATABASE IMPACT:\\n\\n` +
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

          transitResults = findTransitExactitude(transitPlanet, aspect, natalLongitude, start, end, searchOrb);

          // Format results message
          const resultsMessage = `TRANSIT TIMING RESULTS:\\n\\n` +
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
        }

      } catch (error) {
        console.error('Transit calculation error:', error);
        return {
          success: false,
          error: 'Transit calculation failed: ' + error.message
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
