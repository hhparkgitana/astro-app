import React from 'react';
import './AspectMatrix.css';

// Planet glyphs in Unicode
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
  'South Node': '☋'
};

// Aspect colors and symbols
const ASPECT_CONFIG = {
  'CONJUNCTION': { symbol: '☌', color: '#8B00FF', name: 'Conjunction' },
  'SEMISEXTILE': { symbol: '⚺', color: '#9370DB', name: 'Semi-Sextile' },
  'SEXTILE': { symbol: '⚹', color: '#4169E1', name: 'Sextile' },
  'SQUARE': { symbol: '□', color: '#DC143C', name: 'Square' },
  'TRINE': { symbol: '△', color: '#0000FF', name: 'Trine' },
  'QUINCUNX': { symbol: '⚻', color: '#FF8C00', name: 'Quincunx' },
  'OPPOSITION': { symbol: '☍', color: '#FF4500', name: 'Opposition' }
};

function ReturnAspectMatrix({ chartData, activeReturnAspects, onReturnAspectToggle, returnType = 'solar' }) {
  // Define planet order (Sun → Pluto → Nodes)
  const planetOrder = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    'North Node', 'South Node'
  ];

  // Build a lookup map for aspects by planet pair
  const aspectMap = {};
  if (chartData && chartData.returnToNatalAspects) {
    chartData.returnToNatalAspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      aspectMap[key] = aspect;
    });
  }

  // Get aspect between natal planet and return planet
  const getAspect = (natalPlanet, returnPlanet) => {
    // In returnsCalculator.js, aspects are stored as planet1=return, planet2=natal
    // So the key is ${returnPlanet}-${natalPlanet}
    return aspectMap[`${returnPlanet}-${natalPlanet}`];
  };

  // Check if aspect is active
  const isAspectActive = (aspect) => {
    if (!aspect) return false;
    if (!activeReturnAspects) return true; // Default to showing all if undefined

    const key = `${aspect.planet1}-${aspect.planet2}`;

    // If activeReturnAspects is empty, default to showing all aspects
    if (activeReturnAspects.size === 0) {
      return true;
    }

    const isActive = activeReturnAspects.has(key);
    return isActive;
  };

  // Handle cell click
  const handleCellClick = (aspect) => {
    if (!aspect) return;
    onReturnAspectToggle(aspect);
  };

  // Handle planet header click - toggle all aspects for that planet
  const handlePlanetClick = (planet, isReturn) => {
    if (!chartData || !chartData.returnToNatalAspects) return;

    // Find all aspects involving this planet
    const planetAspects = chartData.returnToNatalAspects.filter(aspect => {
      if (isReturn) {
        // Return planet (columns) - match planet1
        return aspect.planet1 === planet;
      } else {
        // Natal planet (rows) - match planet2
        return aspect.planet2 === planet;
      }
    });

    if (planetAspects.length === 0) return;

    // Check if ANY aspects for this planet are currently active
    const anyActive = planetAspects.some(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      return activeReturnAspects && activeReturnAspects.has(key);
    });

    // Determine which aspects to toggle
    const aspectsToToggle = planetAspects.filter(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      const isCurrentlyActive = activeReturnAspects && activeReturnAspects.has(key);

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
      onReturnAspectToggle(aspectsToToggle);
    }
  };

  // Check if all aspects for a planet are inactive
  const isPlanetInactive = (planet, isReturn) => {
    if (!chartData || !chartData.returnToNatalAspects) return false;

    const planetAspects = chartData.returnToNatalAspects.filter(aspect => {
      if (isReturn) {
        // Return planet (columns) - match planet1
        return aspect.planet1 === planet;
      } else {
        // Natal planet (rows) - match planet2
        return aspect.planet2 === planet;
      }
    });

    if (planetAspects.length === 0) return false;

    // Return true if ALL aspects are inactive
    return planetAspects.every(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      return !activeReturnAspects || !activeReturnAspects.has(key);
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

  if (!chartData || !chartData.returnToNatalAspects) {
    return null;
  }

  const returnEmoji = returnType === 'solar' ? '🌞' : '🌙';
  const returnLabel = returnType === 'solar' ? 'Solar' : 'Lunar';

  return (
    <div className="aspect-matrix-container">
      <h4>{returnEmoji} {returnLabel} Return-to-Natal Aspect Matrix</h4>
      <p style={{ fontSize: '0.9em', marginBottom: '10px', color: '#666' }}>
        <strong>Rows:</strong> Natal planets • <strong>Columns:</strong> Return planets
      </p>
      <div className="aspect-matrix-wrapper">
        <table className="aspect-matrix">
          <thead>
            <tr>
              <th className="planet-label corner-cell">N↓ R→</th>
              {planetOrder.map(planet => (
                <th
                  key={planet}
                  className={`planet-label transit-label clickable-header ${isPlanetInactive(planet, true) ? 'planet-inactive' : ''}`}
                  title={`${planet} (Return) - Click to toggle all aspects`}
                  onClick={() => handlePlanetClick(planet, true)}
                >
                  {PLANET_GLYPHS[planet]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planetOrder.map(natalPlanet => (
              <tr key={natalPlanet}>
                <th
                  className={`planet-label natal-label clickable-header ${isPlanetInactive(natalPlanet, false) ? 'planet-inactive' : ''}`}
                  title={`${natalPlanet} (Natal) - Click to toggle all aspects`}
                  onClick={() => handlePlanetClick(natalPlanet, false)}
                >
                  {PLANET_GLYPHS[natalPlanet]}
                </th>
                {planetOrder.map(returnPlanet => {
                  const aspect = getAspect(natalPlanet, returnPlanet);
                  const isActive = isAspectActive(aspect);

                  if (!aspect) {
                    return <td key={returnPlanet} className="aspect-cell empty-cell"></td>;
                  }

                  const aspectInfo = ASPECT_CONFIG[aspect.type];

                  // Safety check: if aspect type is not recognized, skip it
                  if (!aspectInfo) {
                    console.warn(`Unknown aspect type: ${aspect.type}`);
                    return <td key={returnPlanet} className="aspect-cell empty-cell"></td>;
                  }

                  const symbolSize = getSymbolSize(aspect.orb);

                  return (
                    <td
                      key={returnPlanet}
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
        <div><span style={{ color: ASPECT_CONFIG.SEMISEXTILE.color }}>⚺</span> Semi-Sextile</div>
        <div><span style={{ color: ASPECT_CONFIG.SEXTILE.color }}>⚹</span> Sextile</div>
        <div><span style={{ color: ASPECT_CONFIG.SQUARE.color }}>□</span> Square</div>
        <div><span style={{ color: ASPECT_CONFIG.TRINE.color }}>△</span> Trine</div>
        <div><span style={{ color: ASPECT_CONFIG.QUINCUNX.color }}>⚻</span> Quincunx</div>
        <div><span style={{ color: ASPECT_CONFIG.OPPOSITION.color }}>☍</span> Opposition</div>
      </div>
    </div>
  );
}

export default ReturnAspectMatrix;
