import React, { useEffect, useRef, useState } from 'react';
import { Chart } from '@astrodraw/astrochart';

// Aspect colors
const ASPECT_COLORS = {
  'CONJUNCTION': '#8B00FF',
  'SEXTILE': '#4169E1',
  'SQUARE': '#DC143C',
  'TRINE': '#0000FF',
  'OPPOSITION': '#FF4500'
};

function ChartWheel({ chartData, activeAspects }) {
  const chartRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
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
      chartRef.current = chart;
      console.log('Chart created successfully!'); // Debug
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  }, [chartData]);

  // Draw aspect lines when activeAspects changes
  useEffect(() => {
    if (!chartData || !chartData.success || !chartRef.current) {
      return;
    }

    // Remove any existing aspect lines
    const container = document.getElementById('chart-paper');
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    // Remove old aspect group if it exists
    const oldGroup = svg.querySelector('#aspect-lines');
    if (oldGroup) {
      oldGroup.remove();
    }

    // Create new group for aspect lines
    const aspectGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    aspectGroup.setAttribute('id', 'aspect-lines');

    // Get the center of the chart (assuming 650x650 with center at 325,325)
    const centerX = 325;
    const centerY = 325;
    const innerRadius = 130; // Radius where planets are positioned

    // Helper function to get position on circle
    const getPlanetPosition = (longitude) => {
      // The AstroChart library rotates so Ascendant is at 9 o'clock (west/left)
      // Standard math: 0° = east (right), 90° = north (top), 180° = west (left), 270° = south (bottom)
      // Ascendant at 9 o'clock = 180° in standard math coordinates
      const ascendant = chartData.ascendant;

      // How many degrees is this planet past the Ascendant (counter-clockwise in zodiac)
      let degreesFromAsc = longitude - ascendant;
      if (degreesFromAsc < 0) degreesFromAsc += 360;

      // Convert to math angle (counter-clockwise from east/right)
      // Ascendant is at 180° (west), so planet is at (180 - degreesFromAsc)
      // But we need to account for the fact that zodiac goes counter-clockwise
      // while standard canvas coordinates go clockwise from east
      const mathAngle = (180 + degreesFromAsc) * (Math.PI / 180);

      return {
        x: centerX + innerRadius * Math.cos(mathAngle),
        y: centerY - innerRadius * Math.sin(mathAngle)
      };
    };

    // Draw lines for active aspects
    if (chartData.aspects && activeAspects.size > 0) {
      chartData.aspects.forEach(aspect => {
        const key = `${aspect.planet1}-${aspect.planet2}`;
        if (activeAspects.has(key)) {
          const planet1 = chartData.planets[aspect.planet1Key];
          const planet2 = chartData.planets[aspect.planet2Key];

          if (planet1 && planet2) {
            const pos1 = getPlanetPosition(planet1.longitude);
            const pos2 = getPlanetPosition(planet2.longitude);

            // Create tooltip text
            const aspectSymbol = aspect.symbol || '';
            const orbText = aspect.orb.toFixed(1);
            const applyingText = aspect.applying !== null
              ? (aspect.applying ? 'Applying' : 'Separating')
              : 'N/A';
            const tooltipText = `${aspect.planet1} ${aspectSymbol} ${aspect.planet2} • ${orbText}° • ${applyingText}`;

            // Create line element
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', pos1.x);
            line.setAttribute('y1', pos1.y);
            line.setAttribute('x2', pos2.x);
            line.setAttribute('y2', pos2.y);
            line.setAttribute('stroke', ASPECT_COLORS[aspect.type] || '#999');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-opacity', '0.6');
            line.setAttribute('class', 'aspect-line');
            line.style.cursor = 'pointer';

            // Create invisible wider line for easier hovering
            const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hitbox.setAttribute('x1', pos1.x);
            hitbox.setAttribute('y1', pos1.y);
            hitbox.setAttribute('x2', pos2.x);
            hitbox.setAttribute('y2', pos2.y);
            hitbox.setAttribute('stroke', 'transparent');
            hitbox.setAttribute('stroke-width', '10');
            hitbox.style.cursor = 'pointer';

            // Add mouse event handlers for tooltip
            const showTooltip = (e) => {
              const container = document.getElementById('chart-paper');
              const rect = container.getBoundingClientRect();
              setTooltip({
                visible: true,
                text: tooltipText,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top - 10
              });
            };

            const hideTooltip = () => {
              setTooltip({ visible: false, text: '', x: 0, y: 0 });
            };

            hitbox.addEventListener('mouseenter', showTooltip);
            hitbox.addEventListener('mousemove', showTooltip);
            hitbox.addEventListener('mouseleave', hideTooltip);

            aspectGroup.appendChild(line);
            aspectGroup.appendChild(hitbox);
          }
        }
      });
    }

    // Insert the aspect group as the first child (so it's behind planets)
    svg.insertBefore(aspectGroup, svg.firstChild);

  }, [chartData, activeAspects]);

  return (
    <div className="chart-wheel-container">
      <h4>🎯 Birth Chart Wheel</h4>
      <div
        id="chart-paper"
        className="chart-wheel"
        style={{
          width: '650px',
          height: '650px',
          margin: '0 auto',
          position: 'relative'
        }}
      >
        {tooltip.visible && (
          <div
            style={{
              position: 'absolute',
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '4px',
              fontSize: '13px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              transform: 'translate(-50%, -100%)'
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChartWheel;
