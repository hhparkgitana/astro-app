import React, { useState } from 'react';
import {
  pointOnCircle,
  createArcPath,
  longitudeToSVGAngle,
  getZodiacSign,
  calculateCirclePointsAlongLine,
  getCircleRadiusForOrb,
  CHART_CONFIG
} from '../utils/chartMath';

/**
 * Custom SVG-based Chart Wheel Component
 * Renders astrological charts with full control over styling and layout
 */
function ChartWheel({
  chartData,
  transitData = null,
  activeAspects = new Set(),
  onAspectToggle,
  activeTransitAspects = new Set(),
  onTransitAspectToggle,
  showNatalAspects = true,
  setShowNatalAspects
}) {
  const { size, center, radii, colors, glyphs } = CHART_CONFIG;

  // Aspect visibility toggles (only transit-specific ones stay local)
  const [showTransitNatalAspects, setShowTransitNatalAspects] = useState(true);
  const [showTransitAspects, setShowTransitAspects] = useState(false);

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

    const ascendant = chartData.ascendant;

    return signs.map((sign, index) => {
      const startLongitude = index * 30;
      const endLongitude = (index + 1) * 30;
      const path = createArcPath(
        center,
        center,
        radii.zodiacInner,
        radii.zodiac,
        startLongitude,
        endLongitude,
        ascendant
      );

      // Calculate position for sign glyph (middle of section)
      const midLongitude = startLongitude + 15;
      const glyphRadius = (radii.zodiac + radii.zodiacInner) / 2;
      const glyphPos = pointOnCircle(center, center, glyphRadius, midLongitude, ascendant);

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

    const ascendant = chartData.ascendant;

    return chartData.houses.map((houseCusp, index) => {
      // Line from inner to outer zodiac circle (so transits are clearly in houses)
      const innerPoint = pointOnCircle(center, center, radii.housesInner, houseCusp, ascendant);
      const outerPoint = pointOnCircle(center, center, radii.zodiacInner, houseCusp, ascendant);

      // House number position (between cusps)
      const nextCusp = chartData.houses[(index + 1) % 12];
      let midLongitude = (houseCusp + nextCusp) / 2;

      // Handle wrapping around 360°
      if (nextCusp < houseCusp) {
        midLongitude = ((houseCusp + nextCusp + 360) / 2) % 360;
      }

      const numberPos = pointOnCircle(center, center, radii.housesInner + 30, midLongitude, ascendant);

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
    const ascendant = chartData.ascendant;
    return Object.entries(planets).map(([key, planet]) => {
      const pos = pointOnCircle(center, center, radius, planet.longitude, ascendant);
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
   * Render natal-to-natal aspect lines (solid lines)
   */
  const renderAspects = () => {
    if (!chartData.aspects || !showNatalAspects) return null;

    const ascendant = chartData.ascendant;

    return chartData.aspects.map((aspect, index) => {
      // Check if this aspect is active/visible
      const aspectKey = `${aspect.planet1}-${aspect.planet2}`;
      if (!activeAspects.has(aspectKey)) return null;

      // Get planet positions
      const planet1 = chartData.planets[aspect.planet1Key];
      const planet2 = chartData.planets[aspect.planet2Key];

      if (!planet1 || !planet2) return null;

      // Keep aspect lines inside the innermost circle (don't overlap house numbers)
      const pos1 = pointOnCircle(center, center, radii.housesInner - 10, planet1.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, radii.housesInner - 10, planet2.longitude, ascendant);

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
          onClick={() => onAspectToggle && onAspectToggle(aspect)}
        />
      );
    });
  };

  /**
   * Render natal-to-transit aspect lines (dotted circles)
   */
  const renderTransitNatalAspects = () => {
    if (!chartData.transitAspects || !transitData || !showTransitNatalAspects) {
      return null;
    }

    const ascendant = chartData.ascendant;

    return chartData.transitAspects.map((aspect, index) => {
      // Check if this aspect is active/visible
      const aspectKey = `${aspect.planet1}-${aspect.planet2}`;
      if (!activeTransitAspects.has(aspectKey)) return null;

      // Get planet positions (one natal, one transit)
      const natalPlanet = chartData.planets[aspect.planet1Key];
      const transitPlanet = transitData.planets[aspect.planet2Key];

      if (!natalPlanet || !transitPlanet) return null;

      // Get positions at their respective radii
      const pos1 = pointOnCircle(center, center, radii.housesInner - 10, natalPlanet.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, radii.housesInner - 10, transitPlanet.longitude, ascendant);

      // Get circle size based on orb
      const circleRadius = getCircleRadiusForOrb(aspect.orb);

      // Calculate circle positions along the line
      const points = calculateCirclePointsAlongLine(pos1.x, pos1.y, pos2.x, pos2.y, circleRadius);

      // Color and opacity
      const color = colors.aspects[aspect.type];
      const opacity = Math.max(0.3, 1 - (aspect.orb / 8));

      return (
        <g
          key={`transit-natal-${index}`}
          onClick={() => onTransitAspectToggle && onTransitAspectToggle(aspect)}
          style={{ cursor: 'pointer' }}
        >
          {points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={circleRadius}
              fill={color}
              opacity={opacity}
            />
          ))}
        </g>
      );
    });
  };

  /**
   * Render transit-to-transit aspect lines (solid lines, only when natal hidden)
   */
  const renderTransitTransitAspects = () => {
    if (!chartData.transitTransitAspects || !transitData || !showTransitAspects || showNatalAspects) return null;

    const ascendant = chartData.ascendant;

    return chartData.transitTransitAspects.map((aspect, index) => {
      // Get both transit planet positions
      const planet1 = transitData.planets[aspect.planet1Key];
      const planet2 = transitData.planets[aspect.planet2Key];

      if (!planet1 || !planet2) return null;

      // Keep aspect lines inside the innermost circle
      const pos1 = pointOnCircle(center, center, radii.housesInner - 10, planet1.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, radii.housesInner - 10, planet2.longitude, ascendant);

      // Calculate line style based on orb
      const opacity = 1 - (aspect.orb / 8);
      const strokeWidth = 3 - (aspect.orb / 4);

      return (
        <line
          key={`transit-transit-${index}`}
          x1={pos1.x}
          y1={pos1.y}
          x2={pos2.x}
          y2={pos2.y}
          stroke={colors.aspects[aspect.type]}
          strokeWidth={Math.max(0.5, strokeWidth)}
          opacity={Math.max(0.2, opacity)}
          style={{ cursor: 'pointer' }}
        />
      );
    });
  };

  /**
   * Render guide circles to visually separate layers
   */
  const renderGuideCircles = () => {
    return (
      <>
        {/* Circle around aspect lines */}
        <circle
          cx={center}
          cy={center}
          r={radii.housesInner - 10}
          fill="none"
          stroke="#ccc"
          strokeWidth="1"
        />
        {/* Circle just outside house numbers */}
        <circle
          cx={center}
          cy={center}
          r={radii.houses}
          fill="none"
          stroke="#ccc"
          strokeWidth="1"
        />
        {/* Circle outside natal glyphs */}
        <circle
          cx={center}
          cy={center}
          r={280}
          fill="none"
          stroke="#ccc"
          strokeWidth="1"
        />
      </>
    );
  };

  /**
   * Render angle labels (As, Ds, Mc, Ic)
   */
  const renderAngleLabels = () => {
    const ascendant = chartData.ascendant;
    const labels = [
      { text: 'As', longitude: chartData.ascendant, radius: radii.zodiac + 12 },
      { text: 'Ds', longitude: chartData.descendant, radius: radii.zodiac + 12 },
      { text: 'Mc', longitude: chartData.midheaven, radius: radii.zodiac + 12 },
      { text: 'Ic', longitude: chartData.ic, radius: radii.zodiac + 12 }
    ];

    return labels.map(({ text, longitude, radius }) => {
      const pos = pointOnCircle(center, center, radius, longitude, ascendant);

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
    <div className="chart-wheel-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <h4>🎯 Birth Chart Wheel</h4>

      {/* Aspect Toggle Controls */}
      {transitData && (
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showNatalAspects}
              onChange={(e) => setShowNatalAspects && setShowNatalAspects(e.target.checked)}
            />
            <span>Show Natal Aspects</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showTransitNatalAspects}
              onChange={(e) => setShowTransitNatalAspects(e.target.checked)}
            />
            <span>Show Transit-Natal Aspects</span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: showNatalAspects ? 'not-allowed' : 'pointer',
            opacity: showNatalAspects ? 0.5 : 1
          }}>
            <input
              type="checkbox"
              checked={showTransitAspects}
              onChange={(e) => setShowTransitAspects(e.target.checked)}
              disabled={showNatalAspects}
            />
            <span>Show Transit-Transit Aspects</span>
          </label>
        </div>
      )}

      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: '100%', height: 'auto', maxWidth: '800px', margin: '0 auto', display: 'block' }}
      >
        {/* Background */}
        <rect width={size} height={size} fill="#f5f5f5" />

        {/* Guide circles */}
        <g id="guide-circles">{renderGuideCircles()}</g>

        {/* Render layers from back to front */}
        <g id="natal-aspect-lines">{renderAspects()}</g>
        <g id="transit-natal-aspect-lines">{renderTransitNatalAspects()}</g>
        <g id="transit-transit-aspect-lines">{renderTransitTransitAspects()}</g>
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
