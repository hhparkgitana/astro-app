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

function TransitAspectMatrix({ chartData, activeTransitAspects, onTransitAspectToggle }) {
  // Define planet order (Sun → Pluto → Nodes)
  const planetOrder = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    'North Node', 'South Node'
  ];

  // Build a lookup map for aspects by planet pair
  const aspectMap = {};
  if (chartData && chartData.transitAspects) {
    console.log('TransitAspectMatrix - Total transit aspects:', chartData.transitAspects.length);
    console.log('TransitAspectMatrix - activeTransitAspects:', activeTransitAspects);
    console.log('TransitAspectMatrix - activeTransitAspects size:', activeTransitAspects.size);
    console.log('TransitAspectMatrix - activeTransitAspects contents:', Array.from(activeTransitAspects));

    chartData.transitAspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      aspectMap[key] = aspect;
    });
  }

  // Get aspect between natal planet and transit planet
  const getAspect = (natalPlanet, transitPlanet) => {
    return aspectMap[`${natalPlanet}-${transitPlanet}`];
  };

  // Check if aspect is active
  const isAspectActive = (aspect) => {
    if (!aspect) return false;
    const key = `${aspect.planet1}-${aspect.planet2}`;

    // If activeTransitAspects is empty, default to showing all aspects
    if (activeTransitAspects.size === 0) {
      console.log('activeTransitAspects is empty, defaulting aspect to active:', key);
      return true;
    }

    const isActive = activeTransitAspects.has(key);
    return isActive;
  };

  // Handle cell click
  const handleCellClick = (aspect) => {
    if (!aspect) return;
    console.log('Transit aspect cell clicked:', aspect);
    console.log('Calling onTransitAspectToggle with:', aspect);
    onTransitAspectToggle(aspect);
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

  if (!chartData || !chartData.transitAspects) {
    return null;
  }

  return (
    <div className="aspect-matrix-container">
      <h4>⚡ Transit-Natal Aspect Matrix</h4>
      <p style={{ fontSize: '0.9em', marginBottom: '10px', color: '#666' }}>
        <strong>Rows:</strong> Natal planets • <strong>Columns:</strong> Transit planets
      </p>
      <div className="aspect-matrix-wrapper">
        <table className="aspect-matrix">
          <thead>
            <tr>
              <th className="planet-label corner-cell">N↓ T→</th>
              {planetOrder.map(planet => (
                <th key={planet} className="planet-label transit-label" title={planet}>
                  {PLANET_GLYPHS[planet]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planetOrder.map(natalPlanet => (
              <tr key={natalPlanet}>
                <th className="planet-label natal-label" title={natalPlanet}>
                  {PLANET_GLYPHS[natalPlanet]}
                </th>
                {planetOrder.map(transitPlanet => {
                  const aspect = getAspect(natalPlanet, transitPlanet);
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

export default TransitAspectMatrix;
