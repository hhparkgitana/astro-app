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
      // Create chart at 650x650 (keeps outer circle at 2 inches)
      const chart = new Chart('chart-paper', 650, 650);
      chart.radix(data);
      chartRef.current = chart;

      // Manually add transit planets if available
      if (chartData.transits && chartData.transits.success) {
        console.log('Adding transit planets to outer ring');

        // Get the SVG element
        const container = document.getElementById('chart-paper');
        const svg = container.querySelector('svg');

        if (svg) {
          // Create group for transit wheel
          const transitGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          transitGroup.setAttribute('id', 'transit-wheel');

          const centerX = 325;
          const centerY = 325;
          const innerRingRadius = 200; // Inner boundary of white transit ring (outside natal planets at 1.5")
          const outerRingRadius = 245; // Outer boundary of white transit ring (inside zodiac at 1.9")
          const transitPlanetRadius = 208; // Where transit planets sit (1.6" = 208px)

          // Draw transit ring boundaries
          const innerRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          innerRing.setAttribute('cx', centerX);
          innerRing.setAttribute('cy', centerY);
          innerRing.setAttribute('r', innerRingRadius);
          innerRing.setAttribute('fill', 'none');
          innerRing.setAttribute('stroke', '#999');
          innerRing.setAttribute('stroke-width', '1');
          transitGroup.appendChild(innerRing);

          const outerRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          outerRing.setAttribute('cx', centerX);
          outerRing.setAttribute('cy', centerY);
          outerRing.setAttribute('r', outerRingRadius);
          outerRing.setAttribute('fill', 'none');
          outerRing.setAttribute('stroke', '#999');
          outerRing.setAttribute('stroke-width', '1');
          transitGroup.appendChild(outerRing);

          // Draw transit planets
          Object.entries(chartData.transits.planets).forEach(([key, planet]) => {
            // Calculate position on outer ring
            const ascendant = chartData.ascendant;
            let degreesFromAsc = planet.longitude - ascendant;
            if (degreesFromAsc < 0) degreesFromAsc += 360;
            const canvasAngle = (180 + degreesFromAsc) * (Math.PI / 180);

            const x = centerX + transitPlanetRadius * Math.cos(canvasAngle);
            const y = centerY - transitPlanetRadius * Math.sin(canvasAngle);

            // Create text element for planet glyph
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', '#0D47A1'); // Dark blue color for transits
            text.setAttribute('font-size', '20');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('class', 'transit-planet');

            // Get planet symbol (using Unicode glyphs)
            const glyphs = {
              'Sun': '☉', 'Moon': '☽', 'Mercury': '☿', 'Venus': '♀', 'Mars': '♂',
              'Jupiter': '♃', 'Saturn': '♄', 'Uranus': '♅', 'Neptune': '♆', 'Pluto': '♇',
              'North Node': '☊', 'South Node': '☋'
            };

            text.textContent = glyphs[planet.name] || planet.name.substring(0, 2);
            transitGroup.appendChild(text);
          });

          svg.appendChild(transitGroup);
          console.log('Transit planets added to outer ring');
        }
      }

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

            // Calculate line styling based on orb tightness
            const getLineStyle = (orb) => {
              if (orb < 1) return { width: 3.5, opacity: 1.0 };      // 0-1°: Very thick, fully opaque
              if (orb < 3) return { width: 3.0, opacity: 0.85 };     // 1-3°: Thick, mostly opaque
              if (orb < 5) return { width: 2.5, opacity: 0.7 };      // 3-5°: Medium, medium opacity
              if (orb < 7) return { width: 2.0, opacity: 0.5 };      // 5-7°: Thin, more transparent
              return { width: 1.5, opacity: 0.35 };                  // 7-8°: Very thin, quite transparent
            };

            const lineStyle = getLineStyle(aspect.orb);

            // Create line element
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', pos1.x);
            line.setAttribute('y1', pos1.y);
            line.setAttribute('x2', pos2.x);
            line.setAttribute('y2', pos2.y);
            line.setAttribute('stroke', ASPECT_COLORS[aspect.type] || '#999');
            line.setAttribute('stroke-width', lineStyle.width.toString());
            line.setAttribute('stroke-opacity', lineStyle.opacity.toString());
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
