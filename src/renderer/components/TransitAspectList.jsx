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
  'SEXTILE': { symbol: '⚹', color: '#4169E1', name: 'Sextile' },
  'SQUARE': { symbol: '□', color: '#DC143C', name: 'Square' },
  'TRINE': { symbol: '△', color: '#0000FF', name: 'Trine' },
  'OPPOSITION': { symbol: '☍', color: '#FF4500', name: 'Opposition' }
};

function TransitAspectList({ chartData, activeTransitAspects, onTransitAspectToggle }) {
  if (!chartData || !chartData.transitAspects || chartData.transitAspects.length === 0) {
    return null;
  }

  // Sort aspects by orb (tightest first)
  const sortedAspects = [...chartData.transitAspects].sort((a, b) => a.orb - b.orb);

  // Check if aspect is active
  const isAspectActive = (aspect) => {
    const key = `${aspect.planet1}-${aspect.planet2}`;
    return activeTransitAspects.has(key);
  };

  // Handle click
  const handleClick = (aspect) => {
    onTransitAspectToggle(aspect);
  };

  // Get symbol size based on orb
  const getSymbolSize = (orb) => {
    if (orb < 0.5) return '1.8em';
    if (orb < 1) return '1.6em';
    if (orb < 2) return '1.4em';
    if (orb < 4) return '1.2em';
    if (orb < 6) return '1.0em';
    return '0.9em';
  };

  return (
    <div className="aspect-matrix-container">
      <h4>⚡ Transit-Natal Aspects</h4>
      <div style={{
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: '5px',
        padding: '10px'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Natal</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Aspect</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Transit</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Orb</th>
            </tr>
          </thead>
          <tbody>
            {sortedAspects.map((aspect, index) => {
              const active = isAspectActive(aspect);
              const aspectInfo = ASPECT_CONFIG[aspect.type];
              const symbolSize = getSymbolSize(aspect.orb);

              return (
                <tr
                  key={index}
                  onClick={() => handleClick(aspect)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: active ? 'rgba(200, 230, 255, 0.3)' : 'transparent',
                    opacity: active ? 1 : 0.4,
                    borderBottom: '1px solid #eee',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (active) e.currentTarget.style.backgroundColor = 'rgba(200, 230, 255, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    if (active) e.currentTarget.style.backgroundColor = 'rgba(200, 230, 255, 0.3)';
                  }}
                >
                  <td style={{ padding: '8px' }}>
                    <span title={aspect.planet1}>
                      {PLANET_GLYPHS[aspect.planet1]} {aspect.planet1}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span
                      style={{
                        color: aspectInfo.color,
                        fontSize: symbolSize,
                        fontWeight: 'bold'
                      }}
                      title={aspectInfo.name}
                    >
                      {aspectInfo.symbol}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <span title={aspect.planet2}>
                      {PLANET_GLYPHS[aspect.planet2]} {aspect.planet2}
                    </span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', fontSize: '0.9em', color: '#666' }}>
                    {aspect.orb.toFixed(2)}°
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.85em', color: '#666', marginTop: '10px' }}>
        Click on a row to toggle the aspect on/off in the chart
      </p>
    </div>
  );
}

export default TransitAspectList;
