import React, { useState } from 'react';
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
  'SEXTILE': { symbol: '⚹', color: '#4169E1', name: 'Sextile' },
  'SQUARE': { symbol: '□', color: '#DC143C', name: 'Square' },
  'TRINE': { symbol: '△', color: '#0000FF', name: 'Trine' },
  'OPPOSITION': { symbol: '☍', color: '#FF4500', name: 'Opposition' }
};

function AspectMatrix({ chartData, activeAspects, onAspectToggle }) {
  // Define planet order (Sun → Pluto → Nodes)
  const planetOrder = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    'North Node', 'South Node'
  ];

  // Build a lookup map for aspects by planet pair
  const aspectMap = {};
  if (chartData && chartData.aspects) {
    console.log('Building aspect map from:', chartData.aspects);
    chartData.aspects.forEach(aspect => {
      const key1 = `${aspect.planet1}-${aspect.planet2}`;
      const key2 = `${aspect.planet2}-${aspect.planet1}`;
      aspectMap[key1] = aspect;
      aspectMap[key2] = aspect;
      console.log('Added aspect keys:', key1, key2);
    });
    console.log('Final aspect map:', aspectMap);
  }

  // Get aspect between two planets
  const getAspect = (planet1, planet2) => {
    if (planet1 === planet2) return null;
    return aspectMap[`${planet1}-${planet2}`];
  };

  // Check if aspect is active
  const isAspectActive = (aspect) => {
    if (!aspect) return false;
    const key = `${aspect.planet1}-${aspect.planet2}`;
    return activeAspects.has(key);
  };

  // Handle cell click
  const handleCellClick = (aspect) => {
    if (!aspect) return;
    onAspectToggle(aspect);
  };

  // Get cell size based on orb (tighter orb = larger symbol)
  const getSymbolSize = (orb) => {
    if (orb < 2) return '1.4em';
    if (orb < 4) return '1.2em';
    if (orb < 6) return '1.0em';
    return '0.9em';
  };

  // Format orb for display
  const formatOrb = (orb) => {
    return orb.toFixed(1);
  };

  return (
    <div className="aspect-matrix-container">
      <h4>🔗 Aspect Matrix</h4>
      <div className="aspect-matrix">
        {/* Top header row */}
        <div className="matrix-row header-row">
          <div className="matrix-cell corner-cell"></div>
          {planetOrder.map(planet => (
            <div key={planet} className="matrix-cell header-cell">
              <span className="planet-glyph">{PLANET_GLYPHS[planet]}</span>
            </div>
          ))}
        </div>

        {/* Data rows (upper triangular) */}
        {planetOrder.map((rowPlanet, rowIndex) => (
          <div key={rowPlanet} className="matrix-row">
            {/* Left header cell */}
            <div className="matrix-cell header-cell">
              <span className="planet-glyph">{PLANET_GLYPHS[rowPlanet]}</span>
            </div>

            {/* Data cells */}
            {planetOrder.map((colPlanet, colIndex) => {
              // Only show upper triangular part
              if (colIndex <= rowIndex) {
                return <div key={colPlanet} className="matrix-cell empty-cell"></div>;
              }

              const aspect = getAspect(rowPlanet, colPlanet);
              const isActive = isAspectActive(aspect);

              if (!aspect) {
                return <div key={colPlanet} className="matrix-cell empty-cell"></div>;
              }

              const config = ASPECT_CONFIG[aspect.type];
              const symbolSize = getSymbolSize(aspect.orb);

              return (
                <div
                  key={colPlanet}
                  className={`matrix-cell aspect-cell ${isActive ? 'active' : 'inactive'}`}
                  onClick={() => handleCellClick(aspect)}
                  title={`${aspect.planet1} ${config.symbol} ${aspect.planet2} • ${formatOrb(aspect.orb)}° • ${aspect.applying !== null ? (aspect.applying ? 'Applying' : 'Separating') : 'N/A'}`}
                >
                  <span
                    className="aspect-symbol"
                    style={{
                      color: isActive ? config.color : '#999',
                      fontSize: symbolSize
                    }}
                  >
                    {config.symbol}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="aspect-legend">
        <div className="legend-title">Aspects:</div>
        {Object.entries(ASPECT_CONFIG).map(([type, config]) => (
          <div key={type} className="legend-item">
            <span className="legend-symbol" style={{ color: config.color }}>
              {config.symbol}
            </span>
            <span className="legend-name">{config.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AspectMatrix;
