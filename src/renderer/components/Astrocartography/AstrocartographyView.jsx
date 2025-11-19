import React, { useState, useEffect } from 'react';
import AstrocartographyMap from './AstrocartographyMap';
import AstrocartographyControls from './AstrocartographyControls';
import './Astrocartography.css';

const AstrocartographyView = ({ chartData }) => {
  // Chart type selection
  const [chartType, setChartType] = useState('natal');
  const [solarReturnYear, setSolarReturnYear] = useState(new Date().getFullYear());
  const [progressedDate, setProgressedDate] = useState(new Date());
  const [displayChartData, setDisplayChartData] = useState(chartData);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

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

  // Load appropriate chart data based on chart type
  useEffect(() => {
    const loadChartData = async () => {
      if (chartType === 'natal') {
        setDisplayChartData(chartData);
        return;
      }

      setIsLoadingChart(true);
      try {
        if (chartType === 'solar_return') {
          const srResult = await window.astro.calculateProgressions({
            chartData,
            progressionType: 'solar_return',
            targetYear: solarReturnYear
          });
          setDisplayChartData(srResult);
        } else if (chartType === 'progressed') {
          const progResult = await window.astro.calculateProgressions({
            chartData,
            progressionType: 'secondary',
            targetDate: progressedDate.toISOString()
          });
          setDisplayChartData(progResult);
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
        setDisplayChartData(chartData); // Fall back to natal
      } finally {
        setIsLoadingChart(false);
      }
    };

    loadChartData();
  }, [chartType, solarReturnYear, progressedDate, chartData]);

  // Helper function to get year range for SR picker
  const getYearRange = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear - 2; y <= currentYear + 5; y++) {
      years.push(y);
    }
    return years;
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

      {/* Chart Type Selector */}
      <div className="chart-type-selector" style={{
        marginBottom: '20px',
        padding: '15px',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ marginRight: '15px' }}>
            <input
              type="radio"
              value="natal"
              checked={chartType === 'natal'}
              onChange={(e) => setChartType(e.target.value)}
              style={{ marginRight: '5px' }}
            />
            Natal
          </label>
          <label style={{ marginRight: '15px' }}>
            <input
              type="radio"
              value="solar_return"
              checked={chartType === 'solar_return'}
              onChange={(e) => setChartType(e.target.value)}
              style={{ marginRight: '5px' }}
            />
            Solar Return
          </label>
          <label>
            <input
              type="radio"
              value="progressed"
              checked={chartType === 'progressed'}
              onChange={(e) => setChartType(e.target.value)}
              style={{ marginRight: '5px' }}
            />
            Progressed
          </label>
        </div>

        {chartType === 'solar_return' && (
          <div style={{ marginTop: '10px' }}>
            <label style={{ marginRight: '10px' }}>Year:</label>
            <select
              value={solarReturnYear}
              onChange={(e) => setSolarReturnYear(parseInt(e.target.value))}
              style={{
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            >
              {getYearRange().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <span style={{ marginLeft: '10px', fontSize: '0.9em', color: '#666' }}>
              {isLoadingChart ? 'Loading...' : 'Solar Return chart for selected year'}
            </span>
          </div>
        )}

        {chartType === 'progressed' && (
          <div style={{ marginTop: '10px' }}>
            <label style={{ marginRight: '10px' }}>Progressed to:</label>
            <input
              type="date"
              value={progressedDate.toISOString().split('T')[0]}
              onChange={(e) => setProgressedDate(new Date(e.target.value))}
              style={{
                padding: '5px 10px',
                borderRadius: '4px',
                border: '1px solid #ccc'
              }}
            />
            <span style={{ marginLeft: '10px', fontSize: '0.9em', color: '#666' }}>
              {isLoadingChart ? 'Loading...' : 'Secondary progressed chart'}
            </span>
          </div>
        )}
      </div>

      <div className="astrocartography-main">
        <AstrocartographyMap
          chartData={displayChartData}
          planetConfig={planetConfig}
          lineTypeConfig={lineTypeConfig}
          chartType={chartType}
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
