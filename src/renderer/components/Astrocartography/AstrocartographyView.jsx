import React, { useState } from 'react';
import AstrocartographyMap from './AstrocartographyMap';
import AstrocartographyControls from './AstrocartographyControls';
import './Astrocartography.css';

const AstrocartographyView = ({ chartData }) => {
  // Planet configuration with colors and enabled state
  const [planetConfig, setPlanetConfig] = useState({
    'Sun': { color: '#FFD700', label: '☉', enabled: true },
    'Moon': { color: '#C0C0C0', label: '☽', enabled: true },
    'Mercury': { color: '#A8A8A8', label: '☿', enabled: false },
    'Venus': { color: '#00FF7F', label: '♀', enabled: true },
    'Mars': { color: '#FF4500', label: '♂', enabled: true },
    'Jupiter': { color: '#4169E1', label: '♃', enabled: true },
    'Saturn': { color: '#8B4513', label: '♄', enabled: false },
    'Uranus': { color: '#00CED1', label: '♅', enabled: false },
    'Neptune': { color: '#9370DB', label: '♆', enabled: false },
    'Pluto': { color: '#8B0000', label: '♇', enabled: false },
    'North Node': { color: '#00FF00', label: '☊', enabled: false },
    'South Node': { color: '#FF00FF', label: '☋', enabled: false },
    'Chiron': { color: '#FFA500', label: '⚷', enabled: false }
  });

  // Line type configuration
  const [lineTypeConfig, setLineTypeConfig] = useState({
    ascendant: true,
    descendant: true,
    mc: true,
    ic: true
  });

  // Toggle planet visibility
  const handleTogglePlanet = (planet) => {
    setPlanetConfig(prev => ({
      ...prev,
      [planet]: {
        ...prev[planet],
        enabled: !prev[planet].enabled
      }
    }));
  };

  // Toggle line type visibility
  const handleToggleLineType = (lineType) => {
    setLineTypeConfig(prev => ({
      ...prev,
      [lineType]: !prev[lineType]
    }));
  };

  // Check if chart data is available
  if (!chartData || !chartData.planets) {
    return (
      <div className="astrocartography-view">
        <h1>Astrocartography</h1>
        <div className="astrocartography-empty-state">
          <h2>No Chart Data Available</h2>
          <p>Please select a natal chart to view astrocartography lines.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="astrocartography-view">
      <h1>Astrocartography</h1>
      <p>
        Explore where planetary energies are most powerful on Earth for{' '}
        {chartData.name || 'this chart'}
      </p>

      <div className="astrocartography-main">
        <AstrocartographyMap
          chartData={chartData}
          planetConfig={planetConfig}
          lineTypeConfig={lineTypeConfig}
        />
        <AstrocartographyControls
          planetConfig={planetConfig}
          onTogglePlanet={handleTogglePlanet}
          lineTypeConfig={lineTypeConfig}
          onToggleLineType={handleToggleLineType}
        />
      </div>
    </div>
  );
};

export default AstrocartographyView;
