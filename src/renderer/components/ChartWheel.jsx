import React, { useEffect } from 'react';
import { Chart } from '@astrodraw/astrochart';

function ChartWheel({ chartData }) {
  useEffect(() => {
    if (!chartData || !chartData.success) {
      return;
    }

    // Clear any existing chart
    const container = document.getElementById('chart-paper');
    if (container) {
      container.innerHTML = '';
    }

    // Transform our data format to AstroChart format
    const planets = {};
    
    // Map planet names to what the library expects
    const nameMap = {
      'North Node': 'NNode',
      'South Node': 'SNode',
      'Mean Node': 'NNode',  // Just in case
      'True Node': 'NNode'   // Just in case
    };
    
    // Add all planets
    Object.entries(chartData.planets).forEach(([key, planet]) => {
      // Map the name if it needs mapping, otherwise use as-is
      const planetName = nameMap[planet.name] || planet.name;
      planets[planetName] = [planet.longitude];
    });

    // Cusps are already in the right format (array of 12 longitudes)
    const cusps = chartData.houses;

    const data = {
      planets: planets,
      cusps: cusps
    };

    console.log('Chart data for AstroChart:', data); // Debug

    try {
      // Create chart at 650x650
      const chart = new Chart('chart-paper', 650, 650);
      chart.radix(data);
      console.log('Chart created successfully!'); // Debug
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  }, [chartData]);

  return (
    <div className="chart-wheel-container">
      <h4>🎯 Birth Chart Wheel</h4>
      <div 
        id="chart-paper"
        className="chart-wheel"
        style={{
          width: '650px',
          height: '650px',
          margin: '0 auto'
        }}
      />
    </div>
  );
}

export default ChartWheel;
