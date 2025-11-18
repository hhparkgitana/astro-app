import React, { useState, useEffect } from 'react';
import { getCommonPresets, getAllPresets } from '../../../shared/data/ingressPresets';
import ChartWheel from '../ChartWheel';
import AspectTabs from '../AspectTabs';

/**
 * Ingress Generator Component
 *
 * UI for generating mundane astrology ingress charts
 * - Select ingress type (Aries, Cancer, Libra, Capricorn)
 * - Select year
 * - Select location (preset or custom)
 * - Generate chart and display calculation results
 */
function IngressGenerator({ onIngressGenerated }) {
  const currentYear = new Date().getFullYear();

  // Form state
  const [ingressType, setIngressType] = useState('aries');
  const [year, setYear] = useState(currentYear);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customLocation, setCustomLocation] = useState({
    name: '',
    latitude: '',
    longitude: '',
    timezone: 'UTC'
  });
  const [useCustomLocation, setUseCustomLocation] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [calculatedTime, setCalculatedTime] = useState(null);
  const [validityPeriod, setValidityPeriod] = useState(null);
  const [ingressChart, setIngressChart] = useState(null);
  const [activeAspects, setActiveAspects] = useState(new Set());
  const [natalOrb, setNatalOrb] = useState(8);
  const [showNatalAspects, setShowNatalAspects] = useState(true);

  // Presets
  const [presets, setPresets] = useState({ nations: [], financial: [], spiritual: [] });
  const [activeTab, setActiveTab] = useState('common'); // common, nations, financial, spiritual, custom

  // Load presets on mount
  useEffect(() => {
    const allPresets = getAllPresets();
    setPresets(allPresets);

    // Set default preset (USA)
    const defaultPreset = allPresets.nations.find(p => p.id === 'usa');
    setSelectedPreset(defaultPreset);
  }, []);

  // Helper functions for zodiac sign formatting
  const getZodiacSign = (longitude) => {
    if (longitude === undefined || isNaN(longitude)) return 'N/A';

    // Normalize longitude to handle edge cases where rounding causes degree to reach 30°
    let normalizedLongitude = longitude;
    let degreeInSign = longitude % 30;
    const roundedDegree = parseFloat(degreeInSign.toFixed(2));

    // If rounding causes degree to reach 30°, normalize to next sign
    if (roundedDegree >= 30) {
      normalizedLongitude = Math.floor(longitude / 30) * 30 + 30;
      degreeInSign = 0;
    } else {
      degreeInSign = roundedDegree;
    }

    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signIndex = Math.floor(normalizedLongitude / 30) % 12;
    return `${degreeInSign.toFixed(2)}° ${signs[signIndex]}`;
  };

  const getSignName = (longitude) => {
    if (longitude === undefined || isNaN(longitude)) return 'Unknown';
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signIndex = Math.floor(longitude / 30);
    return signs[signIndex];
  };

  // Handle aspect toggle for interactive aspect matrix
  const handleAspectToggle = (aspect) => {
    const aspectsToToggle = Array.isArray(aspect) ? aspect : [aspect];

    setActiveAspects(prev => {
      const newSet = new Set(prev);
      aspectsToToggle.forEach(asp => {
        const key = `${asp.planet1}-${asp.planet2}`;
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
      });
      return newSet;
    });
  };

  // Handle ingress generation
  const handleGenerate = async () => {
    setError('');
    setIsGenerating(true);
    setCalculatedTime(null);
    setValidityPeriod(null);

    try {
      // Determine location
      let location;
      if (useCustomLocation) {
        // Validate custom location
        if (!customLocation.name.trim()) {
          throw new Error('Location name is required');
        }
        const lat = parseFloat(customLocation.latitude);
        const lon = parseFloat(customLocation.longitude);

        if (isNaN(lat) || lat < -90 || lat > 90) {
          throw new Error('Latitude must be between -90 and 90');
        }
        if (isNaN(lon) || lon < -180 || lon > 180) {
          throw new Error('Longitude must be between -180 and 180');
        }

        location = {
          name: customLocation.name.trim(),
          latitude: lat,
          longitude: lon,
          timezone: customLocation.timezone || 'UTC'
        };
      } else {
        if (!selectedPreset) {
          throw new Error('Please select a location');
        }
        location = selectedPreset;
      }

      // Call backend to generate ingress chart
      const ingressChart = await window.astro.generateIngressChart({
        year: parseInt(year),
        ingressType: ingressType,
        location: location
      });

      // Set calculation results for display
      setCalculatedTime(new Date(ingressChart.ingressTimeUTC));
      setValidityPeriod({
        from: new Date(ingressChart.validFrom),
        until: new Date(ingressChart.validUntil),
        days: ingressChart.validityDays
      });

      // Process aspects to ensure they're arrays (IPC serialization fix)
      const processedChart = {
        ...ingressChart,
        aspects: Array.isArray(ingressChart.aspects)
          ? ingressChart.aspects
          : Object.values(ingressChart.aspects || {})
      };

      console.log('Ingress chart aspects processing:', {
        rawAspects: ingressChart.aspects,
        isArray: Array.isArray(ingressChart.aspects),
        processedAspects: processedChart.aspects,
        processedIsArray: Array.isArray(processedChart.aspects),
        processedLength: processedChart.aspects?.length
      });

      // Create activeAspects Set with all aspects enabled
      const aspectsSet = new Set();
      if (processedChart.aspects && Array.isArray(processedChart.aspects)) {
        processedChart.aspects.forEach(aspect => {
          const aspectKey = `${aspect.planet1}-${aspect.planet2}`;
          aspectsSet.add(aspectKey);
        });
      }
      console.log('Created activeAspects Set with', aspectsSet.size, 'aspects');

      // Store the chart and active aspects for display
      setIngressChart(processedChart);
      setActiveAspects(aspectsSet);

      // Pass chart to parent for display
      if (onIngressGenerated) {
        onIngressGenerated(ingressChart);
      }
    } catch (err) {
      console.error('Ingress generation error:', err);
      setError(err.message || 'Failed to generate ingress chart');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle orb change - regenerate chart with new orb
  const handleOrbChange = async (newOrb) => {
    if (!ingressChart) return;

    try {
      // Regenerate chart with new orb
      const regeneratedChart = await window.astro.generateIngressChart({
        year: ingressChart.ingressYear,
        ingressType: ingressChart.ingressType,
        location: ingressChart.location,
        orb: newOrb
      });

      // Process aspects
      const processedChart = {
        ...regeneratedChart,
        aspects: Array.isArray(regeneratedChart.aspects)
          ? regeneratedChart.aspects
          : Object.values(regeneratedChart.aspects || {})
      };

      // Update active aspects set
      const aspectsSet = new Set();
      if (processedChart.aspects && Array.isArray(processedChart.aspects)) {
        processedChart.aspects.forEach(aspect => {
          const aspectKey = `${aspect.planet1}-${aspect.planet2}`;
          aspectsSet.add(aspectKey);
        });
      }

      setIngressChart(processedChart);
      setActiveAspects(aspectsSet);
    } catch (err) {
      console.error('Error regenerating chart with new orb:', err);
    }
  };

  // Render preset grid
  const renderPresetGrid = (presetList) => {
    return (
      <div style={styles.presetGrid}>
        {presetList.map(preset => (
          <button
            key={preset.id}
            style={{
              ...styles.presetCard,
              ...(selectedPreset?.id === preset.id && !useCustomLocation
                ? styles.presetCardSelected
                : {})
            }}
            onClick={() => {
              setSelectedPreset(preset);
              setUseCustomLocation(false);
            }}
          >
            <span style={styles.presetIcon}>
              {preset.flag || preset.icon || '📍'}
            </span>
            <span style={styles.presetName}>{preset.name}</span>
            <span style={styles.presetCity}>{preset.city}</span>
          </button>
        ))}
      </div>
    );
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Generate Ingress Chart</h2>
        <p style={styles.subtitle}>
          Mundane astrology charts for the moment the Sun enters cardinal signs
        </p>
      </div>

      {/* Ingress Type Selection */}
      <div style={styles.section}>
        <label style={styles.label}>Ingress Type</label>
        <div style={styles.ingressTypeGrid}>
          {[
            { id: 'aries', name: 'Aries', symbol: '♈', season: 'Spring Equinox', color: '#e74c3c' },
            { id: 'cancer', name: 'Cancer', symbol: '♋', season: 'Summer Solstice', color: '#3498db' },
            { id: 'libra', name: 'Libra', symbol: '♎', season: 'Fall Equinox', color: '#f39c12' },
            { id: 'capricorn', name: 'Capricorn', symbol: '♑', season: 'Winter Solstice', color: '#27ae60' }
          ].map(type => (
            <button
              key={type.id}
              style={{
                ...styles.ingressTypeCard,
                ...(ingressType === type.id
                  ? { ...styles.ingressTypeCardSelected, borderColor: type.color }
                  : {})
              }}
              onClick={() => setIngressType(type.id)}
            >
              <span style={{ ...styles.ingressSymbol, color: type.color }}>
                {type.symbol}
              </span>
              <span style={styles.ingressName}>{type.name}</span>
              <span style={styles.ingressSeason}>{type.season}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Year Selection */}
      <div style={styles.section}>
        <label style={styles.label} htmlFor="year-input">Year</label>
        <input
          id="year-input"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          min="1900"
          max="2100"
          style={styles.input}
        />
      </div>

      {/* Location Selection */}
      <div style={styles.section}>
        <label style={styles.label}>Location</label>

        {/* Location Tabs */}
        <div style={styles.tabContainer}>
          {[
            { id: 'common', name: 'Quick Access' },
            { id: 'nations', name: 'Nations' },
            { id: 'financial', name: 'Financial' },
            { id: 'spiritual', name: 'Spiritual' },
            { id: 'custom', name: 'Custom' }
          ].map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {})
              }}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'custom') {
                  setUseCustomLocation(true);
                }
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Preset Grids */}
        {activeTab === 'common' && renderPresetGrid(getCommonPresets())}
        {activeTab === 'nations' && renderPresetGrid(presets.nations)}
        {activeTab === 'financial' && renderPresetGrid(presets.financial)}
        {activeTab === 'spiritual' && renderPresetGrid(presets.spiritual)}

        {/* Custom Location Form */}
        {activeTab === 'custom' && (
          <div style={styles.customLocationForm}>
            <div style={styles.formRow}>
              <input
                type="text"
                placeholder="Location name"
                value={customLocation.name}
                onChange={(e) =>
                  setCustomLocation({ ...customLocation, name: e.target.value })
                }
                style={styles.input}
              />
            </div>
            <div style={styles.formRow}>
              <input
                type="number"
                placeholder="Latitude"
                value={customLocation.latitude}
                onChange={(e) =>
                  setCustomLocation({ ...customLocation, latitude: e.target.value })
                }
                step="0.0001"
                style={styles.inputHalf}
              />
              <input
                type="number"
                placeholder="Longitude"
                value={customLocation.longitude}
                onChange={(e) =>
                  setCustomLocation({ ...customLocation, longitude: e.target.value })
                }
                step="0.0001"
                style={styles.inputHalf}
              />
            </div>
            <div style={styles.formRow}>
              <input
                type="text"
                placeholder="Timezone (e.g., America/New_York)"
                value={customLocation.timezone}
                onChange={(e) =>
                  setCustomLocation({ ...customLocation, timezone: e.target.value })
                }
                style={styles.input}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {/* Calculation Results */}
      {calculatedTime && (
        <div style={styles.results}>
          <h4 style={styles.resultsTitle}>Calculated Ingress Time</h4>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Exact Time:</span>
            <span style={styles.resultValue}>{formatDate(calculatedTime)}</span>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Valid Period:</span>
            <span style={styles.resultValue}>
              {validityPeriod?.days} days (until next ingress)
            </span>
          </div>
          <div style={styles.resultRow}>
            <span style={styles.resultLabel}>Valid Until:</span>
            <span style={styles.resultValue}>
              {formatDate(validityPeriod?.until)}
            </span>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        style={{
          ...styles.generateButton,
          ...(isGenerating ? styles.generateButtonDisabled : {})
        }}
      >
        {isGenerating ? 'Generating...' : 'Generate Ingress Chart'}
      </button>

      {/* Chart Display */}
      {ingressChart && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ ...styles.title, fontSize: '22px', marginBottom: '16px' }}>
            {ingressChart.ingressType.charAt(0).toUpperCase() + ingressChart.ingressType.slice(1)} Ingress {ingressChart.ingressYear}
          </h3>
          <p style={{ ...styles.subtitle, marginBottom: '24px' }}>
            {ingressChart.location.name} • {formatDate(calculatedTime)}
          </p>
          <ChartWheel
            chartData={ingressChart}
            activeAspects={activeAspects}
            onAspectToggle={handleAspectToggle}
            natalOrb={natalOrb}
            onNatalOrbChange={(newOrb) => {
              setNatalOrb(newOrb);
              handleOrbChange(newOrb);
            }}
            showNatalAspects={showNatalAspects}
            setShowNatalAspects={setShowNatalAspects}
          />

          {/* Aspect Matrix */}
          <AspectTabs
            chartData={ingressChart}
            activeAspects={activeAspects}
            onAspectToggle={handleAspectToggle}
          />

          {/* Rising Sign */}
          <div className="rising-sign">
            <h4>🌅 Rising Sign: {getSignName(ingressChart.ascendant)}</h4>
            <p><strong>Ascendant:</strong> {getZodiacSign(ingressChart.ascendant)}</p>
            <p><strong>Midheaven (MC):</strong> {getZodiacSign(ingressChart.midheaven)}</p>
          </div>

          {/* Houses */}
          <div className="houses-section">
            <h4>🏠 Houses (Placidus)</h4>
            <table>
              <thead>
                <tr>
                  <th>House</th>
                  <th>Cusp</th>
                </tr>
              </thead>
              <tbody>
                {ingressChart.houses && ingressChart.houses.map((houseCusp, index) => (
                  <tr key={index}>
                    <td>House {index + 1}</td>
                    <td>{getZodiacSign(houseCusp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Planets */}
          <h4>🌟 Planets</h4>
          <table>
            <thead>
              <tr>
                <th>Planet</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ingressChart.planets).map(([key, planet]) => (
                <tr key={key}>
                  <td>{planet.name}</td>
                  <td>{getZodiacSign(planet.longitude)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    borderRadius: '8px',
    maxWidth: '900px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '32px',
    textAlign: 'center'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '28px',
    fontWeight: '600',
    color: '#daa520',
    letterSpacing: '1px'
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  section: {
    marginBottom: '32px'
  },
  label: {
    display: 'block',
    marginBottom: '12px',
    fontSize: '16px',
    fontWeight: '500',
    color: '#daa520'
  },
  ingressTypeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },
  ingressTypeCard: {
    padding: '20px',
    backgroundColor: '#16213e',
    border: '2px solid rgba(218, 165, 32, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  ingressTypeCardSelected: {
    backgroundColor: '#0f3460',
    borderColor: 'rgba(218, 165, 32, 0.8)',
    boxShadow: '0 0 20px rgba(218, 165, 32, 0.3)'
  },
  ingressSymbol: {
    fontSize: '36px',
    fontWeight: 'bold'
  },
  ingressName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#e0e0e0'
  },
  ingressSeason: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  input: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#16213e',
    border: '2px solid rgba(218, 165, 32, 0.2)',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  inputHalf: {
    width: 'calc(50% - 6px)',
    padding: '12px',
    backgroundColor: '#16213e',
    border: '2px solid rgba(218, 165, 32, 0.2)',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    borderBottom: '2px solid rgba(218, 165, 32, 0.2)'
  },
  tab: {
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  tabActive: {
    color: '#daa520',
    borderBottomColor: '#daa520'
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '12px'
  },
  presetCard: {
    padding: '16px',
    backgroundColor: '#16213e',
    border: '2px solid rgba(218, 165, 32, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    textAlign: 'center'
  },
  presetCardSelected: {
    backgroundColor: '#0f3460',
    borderColor: 'rgba(218, 165, 32, 0.8)',
    boxShadow: '0 0 15px rgba(218, 165, 32, 0.3)'
  },
  presetIcon: {
    fontSize: '32px'
  },
  presetName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e0e0e0'
  },
  presetCity: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  customLocationForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  formRow: {
    display: 'flex',
    gap: '12px'
  },
  results: {
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: '#0f3460',
    border: '2px solid rgba(218, 165, 32, 0.3)',
    borderRadius: '8px'
  },
  resultsTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#daa520'
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(218, 165, 32, 0.1)'
  },
  resultLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#9ca3af'
  },
  resultValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e0e0e0'
  },
  error: {
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    border: '2px solid rgba(231, 76, 60, 0.3)',
    borderRadius: '6px',
    color: '#e74c3c',
    fontSize: '14px'
  },
  generateButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#daa520',
    border: 'none',
    borderRadius: '8px',
    color: '#1a1a2e',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  generateButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
};

export default IngressGenerator;
