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

function TransitTransitAspectMatrix({ chartData }) {
  // Define planet order (Sun → Pluto → Nodes)
  const planetOrder = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    'North Node', 'South Node'
  ];

  // Build a lookup map for aspects by planet pair (both directions)
  const aspectMap = {};
  if (chartData && chartData.transitTransitAspects) {
    chartData.transitTransitAspects.forEach(aspect => {
      const key1 = `${aspect.planet1}-${aspect.planet2}`;
      const key2 = `${aspect.planet2}-${aspect.planet1}`;
      aspectMap[key1] = aspect;
      aspectMap[key2] = aspect; // Store both directions for easy lookup
    });
  }

  // Get aspect between two transit planets
  const getAspect = (planet1, planet2) => {
    return aspectMap[`${planet1}-${planet2}`];
  };

  // Get cell size based on orb (tighter orb = larger symbol)
  const getSymbolSize = (orb) => {
    if (orb < 0.5) return '1.8em';
    if (orb < 1) return '1.6em';
    if (orb < 2) return '1.4em';
    if (orb < 4) return '1.2em';
    return '1em';
  };

  // Render aspect cell
  const renderCell = (planet1, planet2, rowIndex, colIndex) => {
    // Empty cell for diagonal and upper triangle
    if (rowIndex >= colIndex) {
      return <td key={`${planet1}-${planet2}`} className="aspect-cell empty"></td>;
    }

    const aspect = getAspect(planet1, planet2);

    if (!aspect) {
      return <td key={`${planet1}-${planet2}`} className="aspect-cell empty"></td>;
    }

    const config = ASPECT_CONFIG[aspect.type];
    if (!config) return <td key={`${planet1}-${planet2}`} className="aspect-cell empty"></td>;

    const applying = aspect.applying === true ? ' applying' : aspect.applying === false ? ' separating' : '';

    return (
      <td
        key={`${planet1}-${planet2}`}
        className={`aspect-cell`}
        title={`${aspect.planet1} ${config.name} ${aspect.planet2}\nOrb: ${aspect.orb.toFixed(2)}°${applying ? ` (${applying.trim()})` : ''}`}
      >
        <span
          style={{
            color: config.color,
            fontSize: getSymbolSize(aspect.orb)
          }}
        >
          {config.symbol}
        </span>
      </td>
    );
  };

  return (
    <div className="aspect-matrix-container">
      <h4>🔄 Transit-Transit Aspects</h4>
      <p style={{ color: '#666', fontSize: '0.9em', marginBottom: '1rem' }}>
        Aspects between transiting planets (read-only display)
      </p>

      <div className="aspect-matrix-scroll">
        <table className="aspect-matrix">
          <thead>
            <tr>
              <th className="planet-header corner"></th>
              {planetOrder.map(planet => (
                <th key={planet} className="planet-header">
                  <div className="planet-glyph" title={planet}>
                    {PLANET_GLYPHS[planet]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planetOrder.map((rowPlanet, rowIndex) => (
              <tr key={rowPlanet}>
                <th className="planet-header">
                  <div className="planet-glyph" title={rowPlanet}>
                    {PLANET_GLYPHS[rowPlanet]}
                  </div>
                </th>
                {planetOrder.map((colPlanet, colIndex) =>
                  renderCell(rowPlanet, colPlanet, rowIndex, colIndex)
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="aspect-legend">
        <div className="legend-item">
          <span style={{ color: ASPECT_CONFIG.CONJUNCTION.color }}>
            {ASPECT_CONFIG.CONJUNCTION.symbol}
          </span> Conjunction
        </div>
        <div className="legend-item">
          <span style={{ color: ASPECT_CONFIG.SEXTILE.color }}>
            {ASPECT_CONFIG.SEXTILE.symbol}
          </span> Sextile
        </div>
        <div className="legend-item">
          <span style={{ color: ASPECT_CONFIG.SQUARE.color }}>
            {ASPECT_CONFIG.SQUARE.symbol}
          </span> Square
        </div>
        <div className="legend-item">
          <span style={{ color: ASPECT_CONFIG.TRINE.color }}>
            {ASPECT_CONFIG.TRINE.symbol}
          </span> Trine
        </div>
        <div className="legend-item">
          <span style={{ color: ASPECT_CONFIG.OPPOSITION.color }}>
            {ASPECT_CONFIG.OPPOSITION.symbol}
          </span> Opposition
        </div>
      </div>
    </div>
  );
}

export default TransitTransitAspectMatrix;
