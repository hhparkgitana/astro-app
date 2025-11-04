import React, { useState, useRef } from 'react';
import {
  pointOnCircle,
  createArcPath,
  longitudeToSVGAngle,
  getZodiacSign,
  calculateCirclePointsAlongLine,
  getCircleRadiusForOrb,
  filterDisplayedPlanets,
  shouldDisplayPlanet,
  CHART_CONFIG
} from '../utils/chartMath';
import ExportMenu from './ExportMenu';

/**
 * Custom SVG-based Chart Wheel Component
 * Renders astrological charts with full control over styling and layout
 */
function ChartWheel({
  isSynastry = false,
  isComposite = false,
  isReturnChart = false,
  returnType = 'solar',
  chartData,
  chartDataB = null,
  transitData = null,
  progressionsData = null,
  activeAspects = new Set(),
  onAspectToggle,
  activeAspectsB = new Set(),
  onAspectToggleB,
  activeTransitAspects = new Set(),
  onTransitAspectToggle,
  activeProgressionNatalAspects = new Set(),
  onProgressionNatalAspectToggle,
  activeTransitProgressionAspects = new Set(),
  onTransitProgressionAspectToggle,
  showNatalAspects = true,
  setShowNatalAspects,
  showNatalAspectsB = true,
  setShowNatalAspectsB,
  natalOrb = 8,
  onNatalOrbChange,
  transitOrb = 8,
  onTransitOrbChange,
  progressionNatalOrb = 8,
  onProgressionNatalOrbChange,
  transitTransitOrb = 8,
  onTransitTransitOrbChange,
  transitProgressionOrb = 8,
  onTransitProgressionOrbChange,
  solarArcNatalOrb = 1.5,
  onSolarArcNatalOrbChange,
  solarArcInternalOrb = 8,
  onSolarArcInternalOrbChange,
  directionType = 'progressions',
  returnInternalOrb = 8,
  onReturnInternalOrbChange,
  showProgressions = false,
  personAName = 'Person A',
  personBName = 'Person B',
  formData = null,
  displaySettings = CHART_CONFIG.defaultDisplay
}) {
  const { size, center, radii, colors, glyphs } = CHART_CONFIG;

  // Ref for the SVG element (for exporting)
  const svgRef = useRef(null);

  // Debug logging for Solar Arc sliders
  console.log('ChartWheel render - transitData:', !!transitData, 'progressionsData:', !!progressionsData, 'directionType:', directionType);

  // Aspect visibility toggles (only transit-specific ones stay local)
  const [showTransitNatalAspects, setShowTransitNatalAspects] = useState(true);
  const [showProgressionNatalAspects, setShowProgressionNatalAspects] = useState(true);
  const [showTransitAspects, setShowTransitAspects] = useState(false);
  const [showTransitProgressionAspects, setShowTransitProgressionAspects] = useState(false);

  // Custom tooltip state
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });

  // Tooltip handlers
  const showTooltip = (event, content) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      content
    });
  };

  const hideTooltip = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: '' });
  };

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
   * Format longitude as degrees and minutes within sign
   * @param {number} longitude - Longitude in degrees (0-360)
   * @returns {string} Formatted string like "15°32'"
   */
  const formatDegreeMinute = (longitude) => {
    const degreesInSign = longitude % 30;
    const degrees = Math.floor(degreesInSign);
    const minutes = Math.round((degreesInSign - degrees) * 60);
    return `${degrees}°${minutes.toString().padStart(2, '0')}'`;
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

      // Format tooltip: "Planet Name: 15°32' Sign"
      const degreeStr = formatDegreeMinute(planet.longitude);
      const sign = getZodiacSign(planet.longitude);
      const tooltipText = `${planet.name}: ${degreeStr} ${sign}`;

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
          style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => showTooltip(e, tooltipText)}
          onMouseLeave={hideTooltip}
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

      // Filter based on display settings - hide aspect if either planet is hidden
      if (!shouldDisplayPlanet(aspect.planet1, displaySettings) ||
          !shouldDisplayPlanet(aspect.planet2, displaySettings)) {
        return null;
      }

      // Keep aspect lines inside the innermost circle (don't overlap house numbers)
      const pos1 = pointOnCircle(center, center, radii.housesInner - 10, planet1.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, radii.housesInner - 10, planet2.longitude, ascendant);

      // Calculate line style based on orb
      const opacity = 1 - (aspect.orb / 8); // Tighter orb = more opaque
      const strokeWidth = 3 - (aspect.orb / 4); // Tighter orb = thicker

      // Format tooltip
      const applyingSeparating = aspect.applying !== null
        ? (aspect.applying ? 'Applying' : 'Separating')
        : 'N/A';
      const tooltipText = `${aspect.planet1} ${aspect.symbol} ${aspect.planet2} • Orb: ${aspect.orb.toFixed(2)}° • ${applyingSeparating}`;

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
          onMouseEnter={(e) => showTooltip(e, tooltipText)}
          onMouseLeave={hideTooltip}
        />
      );
    });
  };

  /**
   * Render Person B's natal-to-natal aspect lines (for synastry mode)
   */
  const renderAspectsB = () => {
    if (!isSynastry || !chartDataB || !chartDataB.aspects || !showNatalAspectsB) return null;

    const ascendant = chartData.ascendant; // Use Person A's ascendant for orientation

    return chartDataB.aspects.map((aspect, index) => {
      // Check if this aspect is active/visible
      const aspectKey = `${aspect.planet1}-${aspect.planet2}`;
      if (!activeAspectsB.has(aspectKey)) return null;

      // Get planet positions from Person B's chart (outer ring)
      const planet1 = chartDataB.planets[aspect.planet1Key];
      const planet2 = chartDataB.planets[aspect.planet2Key];

      if (!planet1 || !planet2) return null;

      // Filter based on display settings - hide aspect if either planet is hidden
      if (!shouldDisplayPlanet(aspect.planet1, displaySettings) ||
          !shouldDisplayPlanet(aspect.planet2, displaySettings)) {
        return null;
      }

      // Person B's planets are on the outer ring (transit radius in bi-wheel), so use that for aspect lines
      const pos1 = pointOnCircle(center, center, radii.transit - 15, planet1.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, radii.transit - 15, planet2.longitude, ascendant);

      // Calculate line style based on orb
      const opacity = 1 - (aspect.orb / 8); // Tighter orb = more opaque
      const strokeWidth = 3 - (aspect.orb / 4); // Tighter orb = thicker

      // Format tooltip
      const applyingSeparating = aspect.applying !== null
        ? (aspect.applying ? 'Applying' : 'Separating')
        : 'N/A';
      const tooltipText = `${personBName}: ${aspect.planet1} ${aspect.symbol} ${aspect.planet2} • Orb: ${aspect.orb.toFixed(2)}° • ${applyingSeparating}`;

      return (
        <line
          key={`b-${index}`}
          x1={pos1.x}
          y1={pos1.y}
          x2={pos2.x}
          y2={pos2.y}
          stroke={colors.aspects[aspect.type]}
          strokeWidth={Math.max(0.5, strokeWidth)}
          opacity={Math.max(0.2, opacity)}
          strokeDasharray="4,4" // Dashed line to differentiate from Person A's aspects
          style={{ cursor: 'pointer' }}
          onClick={() => onAspectToggleB && onAspectToggleB(aspect)}
          onMouseEnter={(e) => showTooltip(e, tooltipText)}
          onMouseLeave={hideTooltip}
        />
      );
    });
  };

  /**
   * Render natal-to-transit aspect lines (dotted circles)
   * In synastry mode, this renders synastry aspects between Person A and Person B
   */
  const renderTransitNatalAspects = () => {
    // In synastry mode, use synastryAspects; otherwise use transitAspects
    const aspects = isSynastry ? chartData.synastryAspects : chartData.transitAspects;

    if (!aspects || !transitData || !showTransitNatalAspects) {
      return null;
    }

    const ascendant = chartData.ascendant;

    return aspects.map((aspect, index) => {
      // Check if this aspect is active/visible
      const aspectKey = `${aspect.planet1}-${aspect.planet2}`;
      if (!activeTransitAspects.has(aspectKey)) return null;

      // Get planet positions (planet1 = transit, planet2 = natal)
      const transitPlanet = transitData.planets[aspect.planet1Key];
      const natalPlanet = chartData.planets[aspect.planet2Key];

      if (!natalPlanet || !transitPlanet) return null;

      // Filter based on display settings - hide aspect if either planet is hidden
      if (!shouldDisplayPlanet(aspect.planet1, displaySettings) ||
          !shouldDisplayPlanet(aspect.planet2, displaySettings)) {
        return null;
      }

      // Get positions at their respective radii
      const pos1 = pointOnCircle(center, center, radii.housesInner - 10, transitPlanet.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, radii.housesInner - 10, natalPlanet.longitude, ascendant);

      // Get circle size based on orb
      const circleRadius = getCircleRadiusForOrb(aspect.orb);

      // Calculate circle positions along the line
      const points = calculateCirclePointsAlongLine(pos1.x, pos1.y, pos2.x, pos2.y, circleRadius);

      // Color and opacity
      const color = colors.aspects[aspect.type];
      const opacity = Math.max(0.3, 1 - (aspect.orb / 8));

      // Format tooltip
      const applyingSeparating = aspect.applying !== null
        ? (aspect.applying ? 'Applying' : 'Separating')
        : 'N/A';
      const label1 = isSynastry ? personAName : 'Transit';
      const label2 = isSynastry ? personBName : 'Natal';
      const tooltipText = `${aspect.planet1} (${label1}) ${aspect.symbol} ${aspect.planet2} (${label2}) • Orb: ${aspect.orb.toFixed(2)}° • ${applyingSeparating}`;

      return (
        <g
          key={`transit-natal-${index}`}
          onClick={() => onTransitAspectToggle && onTransitAspectToggle(aspect)}
          onMouseEnter={(e) => showTooltip(e, tooltipText)}
          onMouseLeave={hideTooltip}
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
   * Render progression-to-natal aspect lines (dotted circles) - only in tri-wheel mode
   */
  const renderProgressionNatalAspects = () => {
    if (!chartData.progressionNatalAspects || !progressionsData || !showProgressionNatalAspects) {
      return null;
    }

    const ascendant = chartData.ascendant;

    return chartData.progressionNatalAspects.map((aspect, index) => {
      // Check if this aspect is active/visible
      const aspectKey = `${aspect.planet1}-${aspect.planet2}`;
      if (!activeProgressionNatalAspects.has(aspectKey)) return null;

      // Get planet positions (planet1 = progression, planet2 = natal)
      const progressedPlanet = progressionsData.planets[aspect.planet1Key];
      const natalPlanet = chartData.planets[aspect.planet2Key];

      if (!progressedPlanet || !natalPlanet) return null;

      // Filter based on display settings - hide aspect if either planet is hidden
      if (!shouldDisplayPlanet(aspect.planet1, displaySettings) ||
          !shouldDisplayPlanet(aspect.planet2, displaySettings)) {
        return null;
      }

      // Get positions at their respective radii
      const pos1 = pointOnCircle(center, center, radii.housesInner - 10, progressedPlanet.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, radii.housesInner - 10, natalPlanet.longitude, ascendant);

      // Get circle size based on orb
      const circleRadius = getCircleRadiusForOrb(aspect.orb);

      // Calculate circle positions along the line
      const points = calculateCirclePointsAlongLine(pos1.x, pos1.y, pos2.x, pos2.y, circleRadius);

      // Color and opacity
      const color = colors.aspects[aspect.type];
      const opacity = Math.max(0.3, 1 - (aspect.orb / 8));

      // Format tooltip
      const applyingSeparating = aspect.applying !== null
        ? (aspect.applying ? 'Applying' : 'Separating')
        : 'N/A';
      const tooltipText = `${aspect.planet1} (Progression) ${aspect.symbol} ${aspect.planet2} (Natal) • Orb: ${aspect.orb.toFixed(2)}° • ${applyingSeparating}`;

      return (
        <g
          key={`progression-natal-${index}`}
          onClick={() => onProgressionNatalAspectToggle && onProgressionNatalAspectToggle(aspect)}
          onMouseEnter={(e) => showTooltip(e, tooltipText)}
          onMouseLeave={hideTooltip}
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
   * Render transit-to-transit aspect lines (solid lines on outer ring for tri-wheel)
   */
  const renderTransitTransitAspects = () => {
    if (!chartData.transitTransitAspects || !transitData || !showTransitAspects) return null;

    const ascendant = chartData.ascendant;

    return chartData.transitTransitAspects.map((aspect, index) => {
      // Get both transit planet positions
      const planet1 = transitData.planets[aspect.planet1Key];
      const planet2 = transitData.planets[aspect.planet2Key];

      if (!planet1 || !planet2) return null;

      // Filter based on display settings - hide aspect if either planet is hidden
      if (!shouldDisplayPlanet(aspect.planet1, displaySettings) ||
          !shouldDisplayPlanet(aspect.planet2, displaySettings)) {
        return null;
      }

      // Draw aspect lines at the outer transit radius (for tri-wheel visualization)
      const aspectRadius = radii.transit + 20; // Place between transit and transitOuter
      const pos1 = pointOnCircle(center, center, aspectRadius, planet1.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, aspectRadius, planet2.longitude, ascendant);

      // Calculate line style based on orb
      const opacity = 1 - (aspect.orb / 8);
      const strokeWidth = 3 - (aspect.orb / 4);

      // Format tooltip
      const applyingSeparating = aspect.applying !== null
        ? (aspect.applying ? 'Applying' : 'Separating')
        : 'N/A';
      const tooltipText = `${aspect.planet1} (Transit) ${aspect.symbol} ${aspect.planet2} (Transit) • Orb: ${aspect.orb.toFixed(2)}° • ${applyingSeparating}`;

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
          onMouseEnter={(e) => showTooltip(e, tooltipText)}
          onMouseLeave={hideTooltip}
        />
      );
    });
  };

  /**
   * Render transit-to-progression aspect lines (for tri-wheel)
   */
  const renderTransitProgressionAspects = () => {
    if (!chartData.transitProgressionAspects || !transitData || !progressionsData || !showTransitProgressionAspects) {
      return null;
    }

    const ascendant = chartData.ascendant;

    return chartData.transitProgressionAspects.map((aspect, index) => {
      // Check if this aspect is active/visible
      const aspectKey = `${aspect.planet1}-${aspect.planet2}`;
      if (!activeTransitProgressionAspects.has(aspectKey)) return null;

      // Get transit and progression planet positions
      const transitPlanet = transitData.planets[aspect.planet1Key];
      const progressionPlanet = progressionsData.planets[aspect.planet2Key];

      if (!transitPlanet || !progressionPlanet) return null;

      // Filter based on display settings - hide aspect if either planet is hidden
      if (!shouldDisplayPlanet(aspect.planet1, displaySettings) ||
          !shouldDisplayPlanet(aspect.planet2, displaySettings)) {
        return null;
      }

      // Get positions at their respective radii
      const pos1 = pointOnCircle(center, center, radii.housesInner - 10, transitPlanet.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, radii.housesInner - 10, progressionPlanet.longitude, ascendant);

      // Get circle size based on orb
      const circleRadius = getCircleRadiusForOrb(aspect.orb);

      // Calculate circle positions along the line
      const points = calculateCirclePointsAlongLine(pos1.x, pos1.y, pos2.x, pos2.y, circleRadius);

      // Color and opacity
      const color = colors.aspects[aspect.type];
      const opacity = Math.max(0.3, 1 - (aspect.orb / 8));

      // Format tooltip
      const applyingSeparating = aspect.applying !== null
        ? (aspect.applying ? 'Applying' : 'Separating')
        : 'N/A';
      const tooltipText = `${aspect.planet1} (Transit) ${aspect.symbol} ${aspect.planet2} (Progression) • Orb: ${aspect.orb.toFixed(2)}° • ${applyingSeparating}`;

      return (
        <g
          key={`transit-progression-${index}`}
          onClick={() => onTransitProgressionAspectToggle && onTransitProgressionAspectToggle(aspect)}
          onMouseEnter={(e) => showTooltip(e, tooltipText)}
          onMouseLeave={hideTooltip}
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
        {/* Circle separating progressions from transits */}
        {progressionsData && transitData && (
          <circle
            cx={center}
            cy={center}
            r={(radii.transit + radii.transitOuter) / 2}
            fill="none"
            stroke="#999"
            strokeWidth="1.5"
            strokeDasharray="5,5"
          />
        )}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', gap: '20px' }}>
        <h4 style={{ margin: 0 }}>🎯 Birth Chart Wheel</h4>
        <ExportMenu svgRef={svgRef} formData={formData} />
      </div>

      {/* Aspect Toggle Controls */}
      {isReturnChart ? (
        /* Returns mode controls */
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showNatalAspects}
                onChange={(e) => setShowNatalAspects && setShowNatalAspects(e.target.checked)}
              />
              <span>Show Natal Aspects</span>
            </label>
            <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', minWidth: '80px' }}>Orb: {natalOrb}°</label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={natalOrb}
                onChange={(e) => onNatalOrbChange && onNatalOrbChange(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showTransitNatalAspects}
                onChange={(e) => setShowTransitNatalAspects(e.target.checked)}
              />
              <span>Show Return-to-Natal Aspects</span>
            </label>
            <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', minWidth: '80px' }}>Orb: {transitOrb}°</label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={transitOrb}
                onChange={(e) => onTransitOrbChange && onTransitOrbChange(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showNatalAspectsB}
                onChange={(e) => setShowNatalAspectsB && setShowNatalAspectsB(e.target.checked)}
              />
              <span>Show Return Internal Aspects</span>
            </label>
            <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', minWidth: '80px' }}>Orb: {returnInternalOrb}°</label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={returnInternalOrb}
                onChange={(e) => onReturnInternalOrbChange && onReturnInternalOrbChange(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>
      ) : isSynastry ? (
        /* Synastry mode controls */
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showNatalAspects}
                onChange={(e) => setShowNatalAspects && setShowNatalAspects(e.target.checked)}
              />
              <span>Show {personAName} Natal Aspects</span>
            </label>
            <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', minWidth: '80px' }}>Orb: {natalOrb}°</label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={natalOrb}
                onChange={(e) => onNatalOrbChange && onNatalOrbChange(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showNatalAspectsB}
                onChange={(e) => setShowNatalAspectsB && setShowNatalAspectsB(e.target.checked)}
              />
              <span>Show {personBName} Natal Aspects</span>
            </label>
            <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', minWidth: '80px' }}>Orb: {natalOrb}°</label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={natalOrb}
                onChange={(e) => onNatalOrbChange && onNatalOrbChange(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showTransitNatalAspects}
                onChange={(e) => setShowTransitNatalAspects(e.target.checked)}
              />
              <span>Show Synastry Aspects</span>
            </label>
            <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', minWidth: '80px' }}>Orb: {transitOrb}°</label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={transitOrb}
                onChange={(e) => onTransitOrbChange && onTransitOrbChange(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        </div>
      ) : transitData ? (
        /* Regular transit/progression mode controls */
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showNatalAspects}
                onChange={(e) => setShowNatalAspects && setShowNatalAspects(e.target.checked)}
              />
              <span>Show {isComposite ? 'Composite' : 'Natal'} Aspects</span>
            </label>
            <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', minWidth: '80px' }}>Orb: {natalOrb}°</label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={natalOrb}
                onChange={(e) => onNatalOrbChange && onNatalOrbChange(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Transit-Natal Aspects (only show when transits exist) */}
          {transitData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showTransitNatalAspects}
                  onChange={(e) => setShowTransitNatalAspects(e.target.checked)}
                />
                <span>Show Transit-{isComposite ? 'Composite' : 'Natal'} Aspects</span>
              </label>
              <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '13px', minWidth: '80px' }}>Orb: {transitOrb}°</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={transitOrb}
                  onChange={(e) => onTransitOrbChange && onTransitOrbChange(parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          )}

          {/* Progression-Natal or Solar Arc-Natal Aspects (bi-wheel: progressions only, no transits) */}
          {!transitData && progressionsData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showProgressionNatalAspects}
                  onChange={(e) => setShowProgressionNatalAspects(e.target.checked)}
                />
                <span>Show {directionType === 'solarArcs' ? 'Solar Arc-Natal' : 'Progression-Natal'} Aspects</span>
              </label>
              <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '13px', minWidth: '80px' }}>
                  Orb: {directionType === 'solarArcs' ? solarArcNatalOrb : progressionNatalOrb}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={directionType === 'solarArcs' ? solarArcNatalOrb : progressionNatalOrb}
                  onChange={(e) => {
                    const handler = directionType === 'solarArcs' ? onSolarArcNatalOrbChange : onProgressionNatalOrbChange;
                    handler && handler(parseFloat(e.target.value));
                  }}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          )}

          {/* Progression-Natal or Solar Arc-Natal Aspects (tri-wheel mode: transits + progressions) */}
          {transitData && progressionsData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showProgressionNatalAspects}
                  onChange={(e) => setShowProgressionNatalAspects(e.target.checked)}
                />
                <span>Show {directionType === 'solarArcs' ? 'Solar Arc-Natal' : 'Progression-Natal'} Aspects</span>
              </label>
              <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '13px', minWidth: '80px' }}>
                  Orb: {directionType === 'solarArcs' ? solarArcNatalOrb : progressionNatalOrb}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={directionType === 'solarArcs' ? solarArcNatalOrb : progressionNatalOrb}
                  onChange={(e) => {
                    const handler = directionType === 'solarArcs' ? onSolarArcNatalOrbChange : onProgressionNatalOrbChange;
                    handler && handler(parseFloat(e.target.value));
                  }}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          )}

          {/* Transit-Transit / Progressed-Progressed / Solar Arc-Solar Arc Aspects (hide in tri-wheel mode - user said too busy) */}
          {!(transitData && progressionsData) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={showTransitAspects}
                  onChange={(e) => setShowTransitAspects(e.target.checked)}
                />
                <span>
                  Show {transitData ? 'Transit-Transit' : (directionType === 'solarArcs' ? 'Solar Arc-Solar Arc' : 'Progressed-Progressed')} Aspects
                </span>
              </label>
              <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '13px', minWidth: '80px' }}>
                  Orb: {directionType === 'solarArcs' && progressionsData ? solarArcInternalOrb : transitTransitOrb}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={directionType === 'solarArcs' && progressionsData ? solarArcInternalOrb : transitTransitOrb}
                  onChange={(e) => {
                    const handler = (directionType === 'solarArcs' && progressionsData) ? onSolarArcInternalOrbChange : onTransitTransitOrbChange;
                    handler && handler(parseFloat(e.target.value));
                  }}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          )}

          {progressionsData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={showTransitProgressionAspects}
                  onChange={(e) => setShowTransitProgressionAspects(e.target.checked)}
                />
                <span>Show Transit-{directionType === 'solarArcs' ? 'Solar Arc' : 'Progression'} Aspects (Tri-Wheel)</span>
              </label>
              <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '13px', minWidth: '80px' }}>Orb: {transitProgressionOrb}°</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={transitProgressionOrb}
                  onChange={(e) => onTransitProgressionOrbChange && onTransitProgressionOrbChange(parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Simple natal/composite chart controls - just natal aspects */
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showNatalAspects}
                onChange={(e) => setShowNatalAspects && setShowNatalAspects(e.target.checked)}
              />
              <span>Show {isComposite ? 'Composite' : 'Natal'} Aspects</span>
            </label>
            <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', minWidth: '80px' }}>Orb: {natalOrb}°</label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={natalOrb}
                onChange={(e) => onNatalOrbChange && onNatalOrbChange(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* Solar Arc sliders when progressions/solar arcs exist */}
          {progressionsData && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showProgressionNatalAspects}
                    onChange={(e) => setShowProgressionNatalAspects(e.target.checked)}
                  />
                  <span>Show {directionType === 'solarArcs' ? 'Solar Arc-Natal' : 'Progression-Natal'} Aspects</span>
                </label>
                <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '13px', minWidth: '80px' }}>
                    Orb: {directionType === 'solarArcs' ? solarArcNatalOrb : progressionNatalOrb}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={directionType === 'solarArcs' ? solarArcNatalOrb : progressionNatalOrb}
                    onChange={(e) => {
                      const handler = directionType === 'solarArcs' ? onSolarArcNatalOrbChange : onProgressionNatalOrbChange;
                      handler && handler(parseFloat(e.target.value));
                    }}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showTransitAspects}
                    onChange={(e) => setShowTransitAspects(e.target.checked)}
                  />
                  <span>Show {directionType === 'solarArcs' ? 'Solar Arc-Solar Arc' : 'Progression-Progression'} Aspects</span>
                </label>
                <div style={{ paddingLeft: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '13px', minWidth: '80px' }}>
                    Orb: {directionType === 'solarArcs' ? solarArcInternalOrb : transitTransitOrb}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={directionType === 'solarArcs' ? solarArcInternalOrb : transitTransitOrb}
                    onChange={(e) => {
                      const handler = directionType === 'solarArcs' ? onSolarArcInternalOrbChange : onTransitTransitOrbChange;
                      handler && handler(parseFloat(e.target.value));
                    }}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: '100%', height: 'auto', maxWidth: '800px', margin: '0 auto', display: 'block' }}
      >
        {/* Background */}
        <rect width={size} height={size} fill="#f5f5f5" />

        {/* Guide circles */}
        <g id="guide-circles">{renderGuideCircles()}</g>

        {/* Render layers from back to front */}
        <g id="natal-aspect-lines">{renderAspects()}</g>
        <g id="natal-b-aspect-lines">{renderAspectsB()}</g>
        <g id="transit-natal-aspect-lines">{renderTransitNatalAspects()}</g>
        <g id="progression-natal-aspect-lines">{renderProgressionNatalAspects()}</g>
        <g id="transit-progression-aspect-lines">{renderTransitProgressionAspects()}</g>
        <g id="transit-transit-aspect-lines">{renderTransitTransitAspects()}</g>
        <g id="houses">{renderHouses()}</g>
        <g id="zodiac-ring">{renderZodiacRing()}</g>
        <g id="natal-planets">{renderPlanets(filterDisplayedPlanets(chartData.planets, displaySettings), radii.natal, '#000')}</g>
        {progressionsData && (
          <g id="progression-planets">
            {renderPlanets(
              filterDisplayedPlanets(progressionsData.planets, displaySettings),
              radii.transit,
              directionType === 'solarArcs' ? '#FF8C00' : '#9C27B0'  // Orange for Solar Arcs, Purple for Progressions
            )}
          </g>
        )}
        {transitData && (
          <g id="transit-planets">
            {renderPlanets(
              filterDisplayedPlanets(transitData.planets, displaySettings),
              radii.transitOuter,
              isReturnChart
                ? (returnType === 'solar' ? '#FFB347' : '#C0C0C0') // Solar: gold/amber, Lunar: silver
                : '#3498db' // Default: blue for regular transits
            )}
          </g>
        )}
        <g id="angle-labels">{renderAngleLabels()}</g>
      </svg>

      {/* Custom tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            pointerEvents: 'none',
            zIndex: 10000,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

export default ChartWheel;
