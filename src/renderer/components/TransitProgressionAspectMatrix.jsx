import React from 'react';
import './AspectMatrix.css';
import { CHART_CONFIG, filterPlanetOrder } from '../utils/chartMath';

// Planet glyphs in Unicode (including optional bodies)
const PLANET_GLYPHS = {
  'Sun': '☉',
  'Moon': '☽',
  'Mercury': '☿',
  'Venus': '♀',
  'Mars': '♂',
  'Jupiter': '♃',
  'Saturn': '♄',
  'Uranus': '♅',
  'Neptune': '♆',
  'Pluto': '♇',
  'North Node': '☊',
  'South Node': '☋',
  'Chiron': '⚷',
  'Pholus': '⯛',
  'Ceres': '⚳',
  'Pallas': '⚴',
  'Juno': '⚵',
  'Vesta': '⚶',
  'Lilith (Mean)': '⚸',
  'Lilith (True)': '⚸'
};

// Aspect colors and symbols
const ASPECT_CONFIG = {
  'CONJUNCTION': { symbol: '☌', color: '#8B00FF', name: 'Conjunction' },
  'SEMISEXTILE': { symbol: '⚺', color: '#32CD32', name: 'Semi-Sextile' },
  'SEXTILE': { symbol: '⚹', color: '#4169E1', name: 'Sextile' },
  'SQUARE': { symbol: '□', color: '#DC143C', name: 'Square' },
  'TRINE': { symbol: '△', color: '#0000FF', name: 'Trine' },
  'QUINCUNX': { symbol: '⚻', color: '#228B22', name: 'Quincunx' },
  'OPPOSITION': { symbol: '☍', color: '#FF4500', name: 'Opposition' }
};

function TransitProgressionAspectMatrix({ chartData, activeTransitProgressionAspects, onTransitProgressionAspectToggle, displaySettings = CHART_CONFIG.defaultDisplay }) {
  // Define full planet order (including optional bodies)
  const fullPlanetOrder = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    'North Node', 'South Node',
    'Chiron', 'Pholus',
    'Ceres', 'Pallas', 'Juno', 'Vesta',
    'Lilith (Mean)', 'Lilith (True)'
  ];

  // Filter planet order based on display settings
  const planetOrder = filterPlanetOrder(fullPlanetOrder, displaySettings);

  // Build a lookup map for aspects by planet pair
  const aspectMap = {};
  if (chartData && chartData.transitProgressionAspects) {
    chartData.transitProgressionAspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      aspectMap[key] = aspect;
    });
  }

  // Get aspect between progression planet and transit planet
  const getAspect = (progressionPlanet, transitPlanet) => {
    // In App.jsx, aspects are stored as planet1=transit, planet2=progression
    // So the key is ${transitPlanet}-${progressionPlanet}
    return aspectMap[`${transitPlanet}-${progressionPlanet}`];
  };

  // Check if aspect is active
  const isAspectActive = (aspect) => {
    if (!aspect) return false;
    const key = `${aspect.planet1}-${aspect.planet2}`;

    // If activeTransitProgressionAspects is empty, default to showing all aspects
    if (activeTransitProgressionAspects.size === 0) {
      return true;
    }

    const isActive = activeTransitProgressionAspects.has(key);
    return isActive;
  };

  // Handle cell click
  const handleCellClick = (aspect) => {
    if (!aspect) return;
    onTransitProgressionAspectToggle(aspect);
  };

  // Handle planet header click - toggle all aspects for that planet
  const handlePlanetClick = (planet, isTransit) => {
    if (!chartData || !chartData.transitProgressionAspects) return;

    // Find all aspects involving this planet
    const planetAspects = chartData.transitProgressionAspects.filter(aspect => {
      if (isTransit) {
        // Transit planet (columns) - match planet1
        return aspect.planet1 === planet;
      } else {
        // Progression planet (rows) - match planet2
        return aspect.planet2 === planet;
      }
    });

    if (planetAspects.length === 0) return;

    // Check if ANY aspects for this planet are currently active
    const anyActive = planetAspects.some(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      return activeTransitProgressionAspects.has(key);
    });

    // Determine which aspects to toggle
    const aspectsToToggle = planetAspects.filter(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      const isCurrentlyActive = activeTransitProgressionAspects.has(key);

      // Toggle: if anyActive, we're turning off; if !anyActive, we're turning on
      if (anyActive && isCurrentlyActive) {
        return true; // Turn off
      } else if (!anyActive && !isCurrentlyActive) {
        return true; // Turn on
      }
      return false;
    });

    // Toggle all aspects at once
    if (aspectsToToggle.length > 0) {
      onTransitProgressionAspectToggle(aspectsToToggle);
    }
  };

  // Check if all aspects for a planet are inactive
  const isPlanetInactive = (planet, isTransit) => {
    if (!chartData || !chartData.transitProgressionAspects) return false;

    const planetAspects = chartData.transitProgressionAspects.filter(aspect => {
      if (isTransit) {
        // Transit planet (columns) - match planet1
        return aspect.planet1 === planet;
      } else {
        // Progression planet (rows) - match planet2
        return aspect.planet2 === planet;
      }
    });

    if (planetAspects.length === 0) return false;

    // Return true if ALL aspects are inactive
    return planetAspects.every(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      return !activeTransitProgressionAspects.has(key);
    });
  };

  // Get cell size based on orb (tighter orb = larger symbol)
  const getSymbolSize = (orb) => {
    if (orb < 0.5) return '1.8em';
    if (orb < 1) return '1.6em';
    if (orb < 2) return '1.4em';
    if (orb < 4) return '1.2em';
    if (orb < 6) return '1.0em';
    return '0.9em';
  };

  // Format orb for display
  const formatOrb = (orb) => {
    return orb.toFixed(2) + '°';
  };

  if (!chartData || !chartData.transitProgressionAspects) {
    return null;
  }

  return (
    <div className="aspect-matrix-container">
      <h4>⚡ Transit-Progression Aspect Matrix</h4>
      <p style={{ fontSize: '0.9em', marginBottom: '10px', color: '#666' }}>
        <strong>Rows:</strong> Progression planets • <strong>Columns:</strong> Transit planets
      </p>
      <div className="aspect-matrix-wrapper">
        <table className="aspect-matrix">
          <thead>
            <tr>
              <th className="planet-label corner-cell">P↓ T→</th>
              {planetOrder.map(planet => (
                <th
                  key={planet}
                  className={`planet-label transit-label clickable-header ${isPlanetInactive(planet, true) ? 'planet-inactive' : ''}`}
                  title={`${planet} (Transit) - Click to toggle all aspects`}
                  onClick={() => handlePlanetClick(planet, true)}
                >
                  {PLANET_GLYPHS[planet]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planetOrder.map(progressionPlanet => (
              <tr key={progressionPlanet}>
                <th
                  className={`planet-label natal-label clickable-header ${isPlanetInactive(progressionPlanet, false) ? 'planet-inactive' : ''}`}
                  title={`${progressionPlanet} (Progression) - Click to toggle all aspects`}
                  onClick={() => handlePlanetClick(progressionPlanet, false)}
                >
                  {PLANET_GLYPHS[progressionPlanet]}
                </th>
                {planetOrder.map(transitPlanet => {
                  const aspect = getAspect(progressionPlanet, transitPlanet);
                  const isActive = isAspectActive(aspect);

                  if (!aspect) {
                    return <td key={transitPlanet} className="aspect-cell empty-cell"></td>;
                  }

                  const aspectInfo = ASPECT_CONFIG[aspect.type];
                  const symbolSize = getSymbolSize(aspect.orb);

                  return (
                    <td
                      key={transitPlanet}
                      className={`aspect-cell ${isActive ? 'active' : 'inactive'}`}
                      onClick={() => handleCellClick(aspect)}
                      title={`${aspect.planet1} ${aspectInfo.name} ${aspect.planet2}\nOrb: ${formatOrb(aspect.orb)}\nClick to toggle`}
                    >
                      <span
                        className="aspect-symbol"
                        style={{
                          color: aspectInfo.color,
                          fontSize: symbolSize
                        }}
                      >
                        {aspectInfo.symbol}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="aspect-legend">
        <div><span style={{ color: ASPECT_CONFIG.CONJUNCTION.color }}>☌</span> Conjunction</div>
        <div><span style={{ color: ASPECT_CONFIG.SEXTILE.color }}>⚹</span> Sextile</div>
        <div><span style={{ color: ASPECT_CONFIG.SQUARE.color }}>□</span> Square</div>
        <div><span style={{ color: ASPECT_CONFIG.TRINE.color }}>△</span> Trine</div>
        <div><span style={{ color: ASPECT_CONFIG.OPPOSITION.color }}>☍</span> Opposition</div>
      </div>
    </div>
  );
}

export default TransitProgressionAspectMatrix;
