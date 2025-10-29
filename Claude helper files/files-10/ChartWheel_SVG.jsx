import React, { useState } from 'react';
import { 
  pointOnCircle, 
  createArcPath, 
  longitudeToSVGAngle,
  getZodiacSign,
  CHART_CONFIG 
} from './chartMath';

/**
 * Custom SVG-based Chart Wheel Component
 * Renders astrological charts with full control over styling and layout
 */
function ChartWheel({ chartData, transitData = null }) {
  const [visibleAspects, setVisibleAspects] = useState(new Set());
  
  const { size, center, radii, colors, glyphs } = CHART_CONFIG;
  
  // Initialize all aspects as visible
  React.useEffect(() => {
    if (chartData?.aspects) {
      const allAspects = new Set(
        chartData.aspects.map((_, index) => index)
      );
      setVisibleAspects(allAspects);
    }
  }, [chartData]);
  
  if (!chartData || !chartData.success) {
    return <div>No chart data available</div>;
  }

  /**
   * Render the zodiac ring (12 colored sections)
   */
  const renderZodiacRing = () => {
    const signs = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 
      'Leo', 'Virgo', 'Libra', 'Scorpio',
      'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];
    
    return signs.map((sign, index) => {
      const startLongitude = index * 30;
      const endLongitude = (index + 1) * 30;
      const path = createArcPath(
        center, 
        center, 
        radii.zodiacInner, 
        radii.zodiac, 
        startLongitude, 
        endLongitude
      );
      
      // Calculate position for sign glyph (middle of section)
      const midLongitude = startLongitude + 15;
      const glyphRadius = (radii.zodiac + radii.zodiacInner) / 2;
      const glyphPos = pointOnCircle(center, center, glyphRadius, midLongitude);
      
      return (
        <g key={sign}>
          {/* Colored section */}
          <path 
            d={path} 
            fill={colors.signs[sign]}
            stroke="#333"
            strokeWidth="1"
          />
          {/* Sign glyph */}
          <text
            x={glyphPos.x}
            y={glyphPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="24"
            fill="#fff"
            fontWeight="bold"
          >
            {glyphs.signs[sign]}
          </text>
        </g>
      );
    });
  };

  /**
   * Render house cusps (radial lines) and numbers
   */
  const renderHouses = () => {
    if (!chartData.houses) return null;
    
    return chartData.houses.map((houseCusp, index) => {
      // Line from inner to outer
      const innerPoint = pointOnCircle(center, center, radii.housesInner, houseCusp);
      const outerPoint = pointOnCircle(center, center, radii.houses, houseCusp);
      
      // House number position (between cusps)
      const nextCusp = chartData.houses[(index + 1) % 12];
      let midLongitude = (houseCusp + nextCusp) / 2;
      
      // Handle wrapping around 360°
      if (nextCusp < houseCusp) {
        midLongitude = ((houseCusp + nextCusp + 360) / 2) % 360;
      }
      
      const numberPos = pointOnCircle(center, center, radii.housesInner + 30, midLongitude);
      
      return (
        <g key={index}>
          {/* House cusp line */}
          <line
            x1={innerPoint.x}
            y1={innerPoint.y}
            x2={outerPoint.x}
            y2={outerPoint.y}
            stroke="#999"
            strokeWidth="1"
          />
          {/* House number */}
          <text
            x={numberPos.x}
            y={numberPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="16"
            fill="#333"
            fontWeight="bold"
          >
            {index + 1}
          </text>
        </g>
      );
    });
  };

  /**
   * Render planets at a specific radius
   * @param {Object} planets - Planet data
   * @param {number} radius - Radius to place planets
   * @param {string} color - Color for planet glyphs
   */
  const renderPlanets = (planets, radius, color = '#000') => {
    return Object.entries(planets).map(([key, planet]) => {
      const pos = pointOnCircle(center, center, radius, planet.longitude);
      const glyph = glyphs.planets[planet.name];
      
      return (
        <text
          key={key}
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="20"
          fill={color}
          fontWeight="bold"
        >
          {glyph}
        </text>
      );
    });
  };

  /**
   * Render aspect lines between planets
   */
  const renderAspects = () => {
    if (!chartData.aspects) return null;
    
    return chartData.aspects.map((aspect, index) => {
      // Check if this aspect is visible
      if (!visibleAspects.has(index)) return null;
      
      // Get planet positions
      const planet1 = chartData.planets[aspect.planet1Key];
      const planet2 = chartData.planets[aspect.planet2Key];
      
      if (!planet1 || !planet2) return null;
      
      const pos1 = pointOnCircle(center, center, radii.aspectOuter, planet1.longitude);
      const pos2 = pointOnCircle(center, center, radii.aspectOuter, planet2.longitude);
      
      // Calculate line style based on orb
      const opacity = 1 - (aspect.orb / 8); // Tighter orb = more opaque
      const strokeWidth = 3 - (aspect.orb / 4); // Tighter orb = thicker
      
      return (
        <line
          key={index}
          x1={pos1.x}
          y1={pos1.y}
          x2={pos2.x}
          y2={pos2.y}
          stroke={colors.aspects[aspect.type]}
          strokeWidth={Math.max(0.5, strokeWidth)}
          opacity={Math.max(0.2, opacity)}
          style={{ cursor: 'pointer' }}
          onClick={() => toggleAspect(index)}
        />
      );
    });
  };

  /**
   * Toggle aspect visibility
   */
  const toggleAspect = (index) => {
    setVisibleAspects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  /**
   * Render angle labels (As, Ds, Mc, Ic)
   */
  const renderAngleLabels = () => {
    const labels = [
      { text: 'As', longitude: chartData.ascendant, radius: radii.zodiacInner - 20 },
      { text: 'Ds', longitude: chartData.descendant, radius: radii.zodiacInner - 20 },
      { text: 'Mc', longitude: chartData.midheaven, radius: radii.zodiacInner - 20 },
      { text: 'Ic', longitude: chartData.ic, radius: radii.zodiacInner - 20 }
    ];
    
    return labels.map(({ text, longitude, radius }) => {
      const pos = pointOnCircle(center, center, radius, longitude);
      
      return (
        <text
          key={text}
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="14"
          fill="#333"
          fontWeight="bold"
        >
          {text}
        </text>
      );
    });
  };

  return (
    <div className="chart-wheel-container">
      <h4>🎯 Birth Chart Wheel</h4>
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${size} ${size}`}
        style={{ maxWidth: '800px', margin: '0 auto', display: 'block' }}
      >
        {/* Background */}
        <rect width={size} height={size} fill="#f5f5f5" />
        
        {/* Render layers from back to front */}
        <g id="aspect-lines">{renderAspects()}</g>
        <g id="houses">{renderHouses()}</g>
        <g id="zodiac-ring">{renderZodiacRing()}</g>
        <g id="natal-planets">{renderPlanets(chartData.planets, radii.natal, '#000')}</g>
        {transitData && (
          <g id="transit-planets">{renderPlanets(transitData.planets, radii.transit, '#3498db')}</g>
        )}
        <g id="angle-labels">{renderAngleLabels()}</g>
      </svg>
    </div>
  );
}

export default ChartWheel;
