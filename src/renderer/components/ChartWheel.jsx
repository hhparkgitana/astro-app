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
  detectPlanetCollisions,
  calculateChartZones,
  CHART_CONFIG
} from '../utils/chartMath';
import { calculateAllFixedStarPositions } from '../../shared/calculations/fixedStarCalculator';
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
  displaySettings = CHART_CONFIG.defaultDisplay,
  fixedStarSettings = { enabled: false, tier: 'tier1', useDefaultOrb: true, maxOrb: null }
}) {
  const { size, center, radii, colors, glyphs } = CHART_CONFIG;

  // Determine wheel type and calculate zones
  const wheelType = (transitData && progressionsData) ? 'tri' :
                     (transitData || progressionsData) ? 'bi' :
                     'single';
  const zones = calculateChartZones(400, wheelType); // 400 = radius for 800px chart

  // Ref for the SVG element (for exporting)
  const svgRef = useRef(null);

  // Debug logging for Solar Arc sliders
  console.log('ChartWheel render - transitData:', !!transitData, 'progressionsData:', !!progressionsData, 'directionType:', directionType);
  console.log('Wheel type:', wheelType, 'Zones:', zones);

  // Aspect visibility toggles (only transit-specific ones stay local)
  const [showTransitNatalAspects, setShowTransitNatalAspects] = useState(true);
  const [showProgressionNatalAspects, setShowProgressionNatalAspects] = useState(true);
  const [showTransitAspects, setShowTransitAspects] = useState(false);
  const [showTransitProgressionAspects, setShowTransitProgressionAspects] = useState(false);

  // Outer planet transit filter (default: true for cleaner default appearance)
  const [showOnlyOuterPlanetTransits, setShowOnlyOuterPlanetTransits] = useState(true);

  // Define outer planets (for filtering transit aspect lines)
  const OUTER_PLANETS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Chiron'];

  // Helper function to check if a planet is an outer planet
  const isOuterPlanet = (planetName) => {
    return OUTER_PLANETS.includes(planetName);
  };

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
        zones.zodiacWheel.innerRadius,
        zones.zodiacWheel.outerRadius,
        startLongitude,
        endLongitude,
        ascendant
      );

      // Calculate position for sign glyph (middle of section)
      const midLongitude = startLongitude + 15;
      const glyphRadius = (zones.zodiacWheel.innerRadius + zones.zodiacWheel.outerRadius) / 2;
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
      // House cusp lines extend from center to inner edge of zodiac wheel
      const innerPoint = pointOnCircle(center, center, 0, houseCusp, ascendant);
      const outerPoint = pointOnCircle(center, center, zones.zodiacWheel.innerRadius, houseCusp, ascendant);

      // House number position (between cusps, in center area)
      const nextCusp = chartData.houses[(index + 1) % 12];
      let midLongitude = (houseCusp + nextCusp) / 2;

      // Handle wrapping around 360°
      if (nextCusp < houseCusp) {
        midLongitude = ((houseCusp + nextCusp + 360) / 2) % 360;
      }

      const numberPos = pointOnCircle(center, center, zones.houseNumbers.center, midLongitude, ascendant);

      // Format tooltip: "House 1: 15°32' Aries"
      const { formatted: degreeStr, sign } = formatDegreeMinute(houseCusp);
      const tooltipText = `House ${index + 1}: ${degreeStr} ${sign}`;

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
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => showTooltip(e, tooltipText)}
            onMouseLeave={hideTooltip}
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
   * Handles edge cases where rounding causes 60 minutes (normalizes to next degree/sign)
   * @param {number} longitude - Longitude in degrees (0-360)
   * @returns {object} { formatted: "15°32'", sign: "Aries" }
   */
  const formatDegreeMinute = (longitude) => {
    let degreesInSign = longitude % 30;
    let degrees = Math.floor(degreesInSign);
    let minutes = Math.round((degreesInSign - degrees) * 60);

    // Handle case where minutes round to 60
    if (minutes >= 60) {
      degrees += 1;
      minutes = 0;
    }

    // Handle case where degrees reach 30 (move to next sign)
    let normalizedLongitude = longitude;
    if (degrees >= 30) {
      normalizedLongitude = Math.floor(longitude / 30) * 30 + 30; // Move to start of next sign
      degrees = 0;
      minutes = 0;
    }

    const sign = getZodiacSign(normalizedLongitude);
    const formatted = `${degrees}°${minutes.toString().padStart(2, '0')}'`;

    return { formatted, sign };
  };

  /**
   * Render planets at a specific radius with collision detection
   * @param {Object} planets - Planet data
   * @param {number} radius - Radius to place planets
   * @param {string} color - Color for planet glyphs
   */
  const renderPlanets = (planets, radius, color = '#000') => {
    const ascendant = chartData.ascendant;
    const collisionGroups = detectPlanetCollisions(planets);
    const elements = [];

    collisionGroups.forEach((group, groupIndex) => {
      if (!group.hasCollision) {
        // No collision - render normally
        group.planets.forEach(planet => {
          const fullPlanet = planets[planet.key];
          const pos = pointOnCircle(center, center, radius, fullPlanet.longitude, ascendant);
          const glyph = glyphs.planets[fullPlanet.name];

          // Format tooltip: "Planet Name: 15°32' Sign"
          const { formatted: degreeStr, sign } = formatDegreeMinute(fullPlanet.longitude);
          const tooltipText = `${fullPlanet.name}: ${degreeStr} ${sign}`;

          // Render planet glyph
          elements.push(
            <text
              key={planet.key}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="36"
              fill={color}
              fontWeight="400"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => showTooltip(e, tooltipText)}
              onMouseLeave={hideTooltip}
            >
              {glyph}
            </text>
          );

          // Render retrograde indicator if planet is retrograde
          if (fullPlanet.velocity < 0) {
            const rxOffset = 18; // Distance from planet glyph
            const rxPos = pointOnCircle(center, center, radius - rxOffset, fullPlanet.longitude, ascendant);

            elements.push(
              <text
                key={`rx-${planet.key}`}
                x={rxPos.x}
                y={rxPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill={color}
                fontWeight="600"
                opacity="0.8"
              >
                Rx
              </text>
            );
          }

          // Render degree/minute label if enabled
          if (displaySettings.showDegreeLabels) {
            const labelOffset = 25; // Distance from planet glyph
            const labelPos = pointOnCircle(center, center, radius + labelOffset, fullPlanet.longitude, ascendant);

            elements.push(
              <text
                key={`label-${planet.key}`}
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill={color}
                fontWeight="400"
                opacity="0.8"
              >
                {degreeStr}
              </text>
            );
          }
        });
      } else {
        // Collision detected - stack perpendicular to radius
        // Calculate average angle for the group
        const avgAngle = group.centerLongitude;

        // Get base position at average angle
        const centerPos = pointOnCircle(center, center, radius, avgAngle, ascendant);

        // Calculate perpendicular direction to the radius at this angle
        // Convert to visual angle (accounting for ascendant rotation)
        const visualAngle = (avgAngle - ascendant + 360) % 360;
        const angleRad = (visualAngle * Math.PI) / 180;

        // Perpendicular to radius direction in counterclockwise direction
        // For radius (cos θ, sin θ), perpendicular is (-sin θ, cos θ)
        // But we need to reverse it so positive offset = counterclockwise (increasing degree)
        // SVG Y-axis is inverted (positive is down)
        const perpX = Math.sin(angleRad);
        const perpY = Math.cos(angleRad);

        // Spacing between stacked planets
        const spacing = 28;
        const totalStackSize = (group.planets.length - 1) * spacing;
        const startOffset = -totalStackSize / 2;

        group.planets.forEach((planet, index) => {
          const fullPlanet = planets[planet.key];
          const actualPos = pointOnCircle(center, center, radius, fullPlanet.longitude, ascendant);

          // Offset along perpendicular direction
          // Planets are sorted by longitude ascending, so index 0 = lowest degree
          const offset = startOffset + (index * spacing);
          const stackedX = centerPos.x + (perpX * offset);
          const stackedY = centerPos.y + (perpY * offset);
          const glyph = glyphs.planets[fullPlanet.name];

          // Format tooltip: "Planet Name: 15°32' Sign"
          const { formatted: degreeStr, sign } = formatDegreeMinute(fullPlanet.longitude);
          const tooltipText = `${fullPlanet.name}: ${degreeStr} ${sign}`;

          // Render connector line from stacked position to actual position
          elements.push(
            <line
              key={`connector-${planet.key}`}
              x1={stackedX}
              y1={stackedY}
              x2={actualPos.x}
              y2={actualPos.y}
              stroke={color}
              strokeWidth="0.5"
              opacity="0.3"
              strokeDasharray="2,2"
            />
          );

          // Render planet at stacked position
          elements.push(
            <text
              key={planet.key}
              x={stackedX}
              y={stackedY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="36"
              fill={color}
              fontWeight="400"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => showTooltip(e, tooltipText)}
              onMouseLeave={hideTooltip}
            >
              {glyph}
            </text>
          );

          // Render degree/minute label if enabled (for stacked planets)
          // Position label radially outward from center (not along perpendicular)
          if (displaySettings.showDegreeLabels) {
            // Calculate radial direction from center to stacked planet position
            const dx = stackedX - center;
            const dy = stackedY - center;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Normalize and extend outward
            const labelDistance = 25; // Additional distance from planet glyph
            const labelX = center + (dx / distance) * (distance + labelDistance);
            const labelY = center + (dy / distance) * (distance + labelDistance);

            // Include Rx in label text if planet is retrograde
            const labelText = fullPlanet.velocity < 0 ? `Rx ${degreeStr}` : degreeStr;

            elements.push(
              <text
                key={`label-${planet.key}`}
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill={color}
                fontWeight="400"
                opacity="0.8"
              >
                {labelText}
              </text>
            );
          }
        });
      }
    });

    return elements;
  };

  /**
   * Render fixed stars as small gold stars on the zodiac ring
   */
  const renderFixedStars = () => {
    if (!fixedStarSettings.enabled || !chartData || !chartData.date) return null;

    try {
      const ascendant = chartData.ascendant;
      const starPositions = calculateAllFixedStarPositions(
        chartData.date,
        fixedStarSettings.tier
      );

      if (!starPositions || starPositions.length === 0) return null;

      // Position stars slightly inside the zodiac ring
      const starRadius = zones.zodiacWheel.innerRadius + 8;

      return starPositions.map((star) => {
        const pos = pointOnCircle(center, center, starRadius, star.longitude, ascendant);
        const tooltipText = `${star.starName}: ${star.displayPosition}`;

        return (
          <g key={`fixed-star-${star.starId}`}>
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="16"
              fill="#FFD700"
              fontWeight="bold"
              style={{
                cursor: 'pointer',
                filter: 'drop-shadow(0 0 2px rgba(255, 215, 0, 0.5))'
              }}
              onMouseEnter={(e) => showTooltip(e, tooltipText)}
              onMouseLeave={hideTooltip}
            >
              ⭐
            </text>
          </g>
        );
      });
    } catch (error) {
      console.error('Error rendering fixed stars:', error);
      return null;
    }
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

      // Keep aspect lines inside house numbers
      const pos1 = pointOnCircle(center, center, zones.aspectLines.outerRadius, planet1.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, zones.aspectLines.outerRadius, planet2.longitude, ascendant);

      // Calculate line style based on whether aspect is in orb
      let stroke, opacity, strokeWidth;

      if (aspect.inOrb === false) {
        // Out of orb: render in very faint grey
        stroke = '#999999';
        opacity = 0.12;
        strokeWidth = 0.5;
      } else {
        // In orb: use normal colorful rendering with opacity based on orb
        stroke = colors.aspects[aspect.type];
        // DEBUG: Log if color is undefined for minor aspects
        if (!stroke && (aspect.type === 'SEMISEXTILE' || aspect.type === 'QUINCUNX')) {
          console.log(`WARNING: No color defined for aspect type: ${aspect.type}`);
          console.log('Available colors:', Object.keys(colors.aspects));
          stroke = '#999999'; // Fallback color
        }
        // Quincunx: max 60% opacity; semi-sextile: max 50%; other aspects: max 75%
        const maxOpacity = aspect.type === 'SEMISEXTILE' ? 0.50 : aspect.type === 'QUINCUNX' ? 0.60 : 0.75;
        opacity = maxOpacity * (1 - (aspect.orb / 8)); // Tighter orb = more opaque
        strokeWidth = 3 - (aspect.orb / 4); // Tighter orb = thicker
        opacity = Math.max(0.10, opacity);
        strokeWidth = Math.max(0.5, strokeWidth);
      }

      // Format tooltip
      const applyingSeparating = aspect.applying !== null
        ? (aspect.applying ? 'Applying' : 'Separating')
        : 'N/A';
      const orbStatus = aspect.inOrb === false ? ' (Out of orb)' : '';
      const tooltipText = `${aspect.planet1} ${aspect.symbol} ${aspect.planet2} • Orb: ${aspect.orb.toFixed(2)}°${orbStatus} • ${applyingSeparating}`;

      return (
        <line
          key={index}
          x1={pos1.x}
          y1={pos1.y}
          x2={pos2.x}
          y2={pos2.y}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={opacity}
          strokeDasharray={undefined}
          style={{ cursor: 'pointer' }}
          onClick={() => onAspectToggle && onAspectToggle(aspect)}
          onMouseEnter={(e) => aspect.inOrb !== false ? showTooltip(e, tooltipText) : null}
          onMouseLeave={hideTooltip}
        />
      );
    });
  };

  /**
   * Render Person B's natal-to-natal aspect lines (for synastry mode)
   */
  const renderAspectsB = () => {
    // Render Person B's natal aspects (synastry) OR return chart's internal aspects
    if ((!isSynastry && !isReturnChart) || !chartDataB || !chartDataB.aspects || !showNatalAspectsB) return null;

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

      // Person B's aspect lines also stay within aspect boundary
      const pos1 = pointOnCircle(center, center, zones.aspectLines.outerRadius, planet1.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, zones.aspectLines.outerRadius, planet2.longitude, ascendant);

      // Calculate line style based on whether aspect is in orb
      let stroke, opacity, strokeWidth;

      if (aspect.inOrb === false) {
        // Out of orb: render in very faint grey
        stroke = '#999999';
        opacity = 0.12;
        strokeWidth = 0.5;
      } else {
        // In orb: use normal colorful rendering with opacity based on orb
        stroke = colors.aspects[aspect.type];
        // DEBUG: Log if color is undefined for minor aspects
        if (!stroke && (aspect.type === 'SEMISEXTILE' || aspect.type === 'QUINCUNX')) {
          console.log(`WARNING: No color defined for aspect type: ${aspect.type}`);
          console.log('Available colors:', Object.keys(colors.aspects));
          stroke = '#999999'; // Fallback color
        }
        // Quincunx: max 60% opacity; semi-sextile: max 50%; other aspects: max 75%
        const maxOpacity = aspect.type === 'SEMISEXTILE' ? 0.50 : aspect.type === 'QUINCUNX' ? 0.60 : 0.75;
        opacity = maxOpacity * (1 - (aspect.orb / 8)); // Tighter orb = more opaque
        strokeWidth = 3 - (aspect.orb / 4); // Tighter orb = thicker
        opacity = Math.max(0.10, opacity);
        strokeWidth = Math.max(0.5, strokeWidth);
      }

      // Format tooltip
      const applyingSeparating = aspect.applying !== null
        ? (aspect.applying ? 'Applying' : 'Separating')
        : 'N/A';
      const orbStatus = aspect.inOrb === false ? ' (Out of orb)' : '';

      // Use appropriate label based on chart type
      const chartLabel = isReturnChart
        ? (returnType === 'solar' ? 'Solar Return' : 'Lunar Return')
        : personBName;

      const tooltipText = `${chartLabel} Internal: ${aspect.planet1} ${aspect.symbol} ${aspect.planet2} • Orb: ${aspect.orb.toFixed(2)}°${orbStatus} • ${applyingSeparating}`;

      return (
        <line
          key={`b-${index}`}
          x1={pos1.x}
          y1={pos1.y}
          x2={pos2.x}
          y2={pos2.y}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={opacity}
          strokeDasharray={(aspect.type === 'SEMISEXTILE' || aspect.type === 'QUINCUNX') ? '2,4' : '4,4'}  // Dotted for minor aspects, dashed for others
          style={{ cursor: 'pointer' }}
          onClick={() => onAspectToggleB && onAspectToggleB(aspect)}
          onMouseEnter={(e) => aspect.inOrb !== false ? showTooltip(e, tooltipText) : null}
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
    // In return chart mode, use returnToNatalAspects from chartDataB
    // In synastry mode, use synastryAspects; otherwise use transitAspects
    const aspects = isReturnChart
      ? (chartDataB?.returnToNatalAspects || [])
      : (isSynastry ? chartData.synastryAspects : chartData.transitAspects);

    console.log('🔍 renderTransitNatalAspects:', {
      isReturnChart,
      isSynastry,
      hasAspects: !!aspects,
      aspectsLength: aspects?.length,
      firstAspect: aspects?.[0],
      showTransitNatalAspects,
      activeTransitAspectsSize: activeTransitAspects.size
    });

    if (!aspects || !transitData || !showTransitNatalAspects) {
      return null;
    }

    const ascendant = chartData.ascendant;

    return aspects.map((aspect, index) => {
      // Check if this aspect is active/visible
      const aspectKey = `${aspect.planet1}-${aspect.planet2}`;
      if (!activeTransitAspects.has(aspectKey)) {
        return null;
      }

      // Apply outer planet filter (only show aspects where transit planet is an outer planet)
      // Don't apply this filter in synastry mode
      if (!isSynastry && showOnlyOuterPlanetTransits && !isOuterPlanet(aspect.planet1)) {
        return null;
      }

      // Get planet positions
      // In return chart mode: planet1 = return planet, planet2 = natal planet
      // In synastry mode: planet1 = Chart B (outer), planet2 = Chart A (inner)
      // In transit mode: planet1 = transit, planet2 = natal
      const transitPlanet = isReturnChart
        ? transitData.planets[aspect.planet1Key]  // Return planet
        : (isSynastry
          ? transitData.planets[aspect.planet1Key]  // Chart B planet (outer)
          : transitData.planets[aspect.planet1Key]);
      const natalPlanet = isReturnChart
        ? chartData.planets[aspect.planet2Key]    // Natal planet
        : (isSynastry
          ? chartData.planets[aspect.planet2Key]    // Chart A planet (inner)
          : chartData.planets[aspect.planet2Key]);

      if (!natalPlanet || !transitPlanet) {
        return null;
      }

      // Filter based on display settings - hide aspect if either planet is hidden
      if (!shouldDisplayPlanet(aspect.planet1, displaySettings) ||
          !shouldDisplayPlanet(aspect.planet2, displaySettings)) {
        return null;
      }

      // Get positions at aspect boundary
      const pos1 = pointOnCircle(center, center, zones.aspectLines.outerRadius, transitPlanet.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, zones.aspectLines.outerRadius, natalPlanet.longitude, ascendant);

      // Get circle size based on orb
      const circleRadius = getCircleRadiusForOrb(aspect.orb);

      // Calculate circle positions along the line
      const points = calculateCirclePointsAlongLine(pos1.x, pos1.y, pos2.x, pos2.y, circleRadius);

      // Color and opacity based on whether aspect is in orb
      let color, opacity;

      if (aspect.inOrb === false) {
        // Out of orb: render in very faint grey
        color = '#999999';
        opacity = 0.12;
      } else {
        // In orb: use normal colorful rendering
        color = colors.aspects[aspect.type];
        // Quincunx: max 60% opacity; semi-sextile: max 50%; other aspects: max 75%
        const maxOpacity = aspect.type === 'SEMISEXTILE' ? 0.50 : aspect.type === 'QUINCUNX' ? 0.60 : 0.75;
        opacity = Math.max(0.10, maxOpacity * (1 - (aspect.orb / 8)));
      }

      // Format tooltip
      const applyingSeparating = aspect.applying !== null
        ? (aspect.applying ? 'Applying' : 'Separating')
        : 'N/A';

      // Determine labels and planet order based on chart type
      let planet1Name, planet1Label, planet2Name, planet2Label;

      if (isReturnChart) {
        // Return charts: planet1 = return planet, planet2 = natal planet
        const returnLabel = returnType === 'solar' ? 'Solar Return' : 'Lunar Return';
        planet1Name = aspect.planet1;
        planet1Label = returnLabel;
        planet2Name = aspect.planet2;
        planet2Label = 'Natal';
      } else if (isSynastry) {
        // aspect.planet1 = Chart B, aspect.planet2 = Chart A
        planet1Name = aspect.planet1;
        planet1Label = personBName;
        planet2Name = aspect.planet2;
        planet2Label = personAName;
      } else {
        planet1Name = aspect.planet1;
        planet1Label = 'Transit';
        planet2Name = aspect.planet2;
        planet2Label = 'Natal';
      }

      const orbStatus = aspect.inOrb === false ? ' (Out of orb)' : '';
      const tooltipText = `${planet1Name} (${planet1Label}) ${aspect.symbol} ${planet2Name} (${planet2Label}) • Orb: ${aspect.orb.toFixed(2)}°${orbStatus} • ${applyingSeparating}`;

      return (
        <g
          key={`transit-natal-${index}`}
          onClick={() => onTransitAspectToggle && onTransitAspectToggle(aspect)}
          onMouseEnter={(e) => aspect.inOrb !== false ? showTooltip(e, tooltipText) : null}
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
      // If activeProgressionNatalAspects is empty, default to showing all aspects
      if (activeProgressionNatalAspects.size > 0 && !activeProgressionNatalAspects.has(aspectKey)) return null;

      // Get planet positions (planet1 = progression, planet2 = natal)
      const progressedPlanet = progressionsData.planets[aspect.planet1Key];
      const natalPlanet = chartData.planets[aspect.planet2Key];

      if (!progressedPlanet || !natalPlanet) return null;

      // Filter based on display settings - hide aspect if either planet is hidden
      if (!shouldDisplayPlanet(aspect.planet1, displaySettings) ||
          !shouldDisplayPlanet(aspect.planet2, displaySettings)) {
        return null;
      }

      // Get positions at aspect boundary
      const pos1 = pointOnCircle(center, center, zones.aspectLines.outerRadius, progressedPlanet.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, zones.aspectLines.outerRadius, natalPlanet.longitude, ascendant);

      // Get circle size based on orb
      const circleRadius = getCircleRadiusForOrb(aspect.orb);

      // Calculate circle positions along the line
      const points = calculateCirclePointsAlongLine(pos1.x, pos1.y, pos2.x, pos2.y, circleRadius);

      // Color and opacity based on whether aspect is in orb
      let color, opacity;

      if (aspect.inOrb === false) {
        // Out of orb: render in very faint grey
        color = '#999999';
        opacity = 0.12;
      } else {
        // In orb: use normal colorful rendering
        color = colors.aspects[aspect.type];
        // Quincunx: max 60% opacity; semi-sextile: max 50%; other aspects: max 75%
        const maxOpacity = aspect.type === 'SEMISEXTILE' ? 0.50 : aspect.type === 'QUINCUNX' ? 0.60 : 0.75;
        opacity = Math.max(0.10, maxOpacity * (1 - (aspect.orb / 8)));
      }

      // Format tooltip
      const applyingSeparating = aspect.applying !== null
        ? (aspect.applying ? 'Applying' : 'Separating')
        : 'N/A';
      const orbStatus = aspect.inOrb === false ? ' (Out of orb)' : '';
      const tooltipText = `${aspect.planet1} (Progression) ${aspect.symbol} ${aspect.planet2} (Natal) • Orb: ${aspect.orb.toFixed(2)}°${orbStatus} • ${applyingSeparating}`;

      return (
        <g
          key={`progression-natal-${index}`}
          onClick={() => onProgressionNatalAspectToggle && onProgressionNatalAspectToggle(aspect)}
          onMouseEnter={(e) => aspect.inOrb !== false ? showTooltip(e, tooltipText) : null}
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

      // Calculate line style based on whether aspect is in orb
      let stroke, opacity, strokeWidth;

      if (aspect.inOrb === false) {
        // Out of orb: render in very faint grey
        stroke = '#999999';
        opacity = 0.12;
        strokeWidth = 0.5;
      } else {
        // In orb: use normal colorful rendering with opacity based on orb
        stroke = colors.aspects[aspect.type];
        // Quincunx: max 60% opacity; semi-sextile: max 50%; other aspects: max 75%
        const maxOpacity = aspect.type === 'SEMISEXTILE' ? 0.50 : aspect.type === 'QUINCUNX' ? 0.60 : 0.75;
        opacity = maxOpacity * (1 - (aspect.orb / 8));
        strokeWidth = 3 - (aspect.orb / 4);
        opacity = Math.max(0.10, opacity);
        strokeWidth = Math.max(0.5, strokeWidth);
      }

      // Format tooltip
      const applyingSeparating = aspect.applying !== null
        ? (aspect.applying ? 'Applying' : 'Separating')
        : 'N/A';
      const orbStatus = aspect.inOrb === false ? ' (Out of orb)' : '';
      const tooltipText = `${aspect.planet1} (Transit) ${aspect.symbol} ${aspect.planet2} (Transit) • Orb: ${aspect.orb.toFixed(2)}°${orbStatus} • ${applyingSeparating}`;

      return (
        <line
          key={`transit-transit-${index}`}
          x1={pos1.x}
          y1={pos1.y}
          x2={pos2.x}
          y2={pos2.y}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={opacity}
          strokeDasharray={undefined}
          style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => aspect.inOrb !== false ? showTooltip(e, tooltipText) : null}
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

      // Apply outer planet filter (only show aspects where transit planet is an outer planet)
      if (showOnlyOuterPlanetTransits && !isOuterPlanet(aspect.planet1)) {
        return null;
      }

      // Get transit and progression planet positions
      const transitPlanet = transitData.planets[aspect.planet1Key];
      const progressionPlanet = progressionsData.planets[aspect.planet2Key];

      if (!transitPlanet || !progressionPlanet) return null;

      // Filter based on display settings - hide aspect if either planet is hidden
      if (!shouldDisplayPlanet(aspect.planet1, displaySettings) ||
          !shouldDisplayPlanet(aspect.planet2, displaySettings)) {
        return null;
      }

      // Get positions at aspect boundary
      const pos1 = pointOnCircle(center, center, zones.aspectLines.outerRadius, transitPlanet.longitude, ascendant);
      const pos2 = pointOnCircle(center, center, zones.aspectLines.outerRadius, progressionPlanet.longitude, ascendant);

      // Get circle size based on orb
      const circleRadius = getCircleRadiusForOrb(aspect.orb);

      // Calculate circle positions along the line
      const points = calculateCirclePointsAlongLine(pos1.x, pos1.y, pos2.x, pos2.y, circleRadius);

      // Color and opacity based on whether aspect is in orb
      let color, opacity;

      if (aspect.inOrb === false) {
        // Out of orb: render in very faint grey
        color = '#999999';
        opacity = 0.12;
      } else {
        // In orb: use normal colorful rendering
        color = colors.aspects[aspect.type];
        // Quincunx: max 60% opacity; semi-sextile: max 50%; other aspects: max 75%
        const maxOpacity = aspect.type === 'SEMISEXTILE' ? 0.50 : aspect.type === 'QUINCUNX' ? 0.60 : 0.75;
        opacity = Math.max(0.10, maxOpacity * (1 - (aspect.orb / 8)));
      }

      // Format tooltip
      const applyingSeparating = aspect.applying !== null
        ? (aspect.applying ? 'Applying' : 'Separating')
        : 'N/A';
      const orbStatus = aspect.inOrb === false ? ' (Out of orb)' : '';
      const tooltipText = `${aspect.planet1} (Transit) ${aspect.symbol} ${aspect.planet2} (Progression) • Orb: ${aspect.orb.toFixed(2)}°${orbStatus} • ${applyingSeparating}`;

      return (
        <g
          key={`transit-progression-${index}`}
          onClick={() => onTransitProgressionAspectToggle && onTransitProgressionAspectToggle(aspect)}
          onMouseEnter={(e) => aspect.inOrb !== false ? showTooltip(e, tooltipText) : null}
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
   * Render circumscribed boundary circles for visual organization
   */
  const renderBoundaryCircles = () => {
    if (!zones.boundaryCircles) return null;

    return zones.boundaryCircles.map((radius, index) => (
      <circle
        key={`boundary-${index}`}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#D3D3D3"
        strokeWidth="1"
      />
    ));
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
      { text: 'As', longitude: chartData.ascendant, radius: zones.zodiacWheel.outerRadius + 12 },
      { text: 'Ds', longitude: chartData.descendant, radius: zones.zodiacWheel.outerRadius + 12 },
      { text: 'Mc', longitude: chartData.midheaven, radius: zones.zodiacWheel.outerRadius + 12 },
      { text: 'Ic', longitude: chartData.ic, radius: zones.zodiacWheel.outerRadius + 12 }
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

  /**
   * Render Ascendant markers for outer chart rings
   * (for transits, returns, progressions, synastry outer chart)
   */
  const renderOuterAscendantMarkers = () => {
    const innerAscendant = chartData.ascendant; // For rotation reference
    const markers = [];

    // Determine which chart data to use for the outer ring
    // For return charts and synastry, use chartDataB
    // For transits, use transitData
    const outerChartData = (isReturnChart || isSynastry) ? chartDataB : transitData;

    // Bi-wheel or Tri-wheel: show transit/return/synastry outer chart ASC
    if (outerChartData && outerChartData.ascendant) {
      const outerRadius = zones.transitPlanets.outerRadius + 5;
      const innerRadius = zones.transitPlanets.outerRadius - 15;

      // Calculate positions
      const outerPoint = pointOnCircle(center, center, outerRadius, outerChartData.ascendant, innerAscendant);
      const innerPoint = pointOnCircle(center, center, innerRadius, outerChartData.ascendant, innerAscendant);

      // Label position (further out to avoid colored sign area)
      const labelRadius = outerRadius + 25;
      const labelPoint = pointOnCircle(center, center, labelRadius, outerChartData.ascendant, innerAscendant);

      // Tooltip
      const { formatted: degreeStr, sign } = formatDegreeMinute(outerChartData.ascendant);
      const chartLabel = isReturnChart
        ? (returnType === 'solar' ? 'Solar Return' : 'Lunar Return')
        : (isSynastry ? personBName : 'Transit');
      const tooltipText = `${chartLabel} Ascendant: ${degreeStr} ${sign}`;

      markers.push(
        <g key="transit-asc-marker">
          {/* Radial line */}
          <line
            x1={outerPoint.x}
            y1={outerPoint.y}
            x2={innerPoint.x}
            y2={innerPoint.y}
            stroke="#4A6B8A"
            strokeWidth="3"
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => showTooltip(e, tooltipText)}
            onMouseLeave={hideTooltip}
          />
          {/* ASC label with stroke for readability */}
          <text
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="13"
            fill="#4A6B8A"
            fontWeight="bold"
            stroke="white"
            strokeWidth="0.5"
            paintOrder="stroke"
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => showTooltip(e, tooltipText)}
            onMouseLeave={hideTooltip}
          >
            ASC
          </text>
        </g>
      );

      // Add DES (Descendant = ASC + 180°)
      const descendant = (outerChartData.ascendant + 180) % 360;
      const desOuterPoint = pointOnCircle(center, center, outerRadius, descendant, innerAscendant);
      const desInnerPoint = pointOnCircle(center, center, innerRadius, descendant, innerAscendant);
      const desLabelPoint = pointOnCircle(center, center, labelRadius, descendant, innerAscendant);
      const { formatted: desDegreeStr, sign: desSign } = formatDegreeMinute(descendant);
      const desTooltip = `${chartLabel} Descendant: ${desDegreeStr} ${desSign}`;

      markers.push(
        <g key="transit-des-marker">
          <line
            x1={desOuterPoint.x}
            y1={desOuterPoint.y}
            x2={desInnerPoint.x}
            y2={desInnerPoint.y}
            stroke="#4A6B8A"
            strokeWidth="3"
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => showTooltip(e, desTooltip)}
            onMouseLeave={hideTooltip}
          />
          <text
            x={desLabelPoint.x}
            y={desLabelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="13"
            fill="#4A6B8A"
            fontWeight="bold"
            stroke="white"
            strokeWidth="0.5"
            paintOrder="stroke"
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => showTooltip(e, desTooltip)}
            onMouseLeave={hideTooltip}
          >
            DES
          </text>
        </g>
      );

      // Add MC (Midheaven) and IC if available
      if (outerChartData.midheaven) {
        const mcOuterPoint = pointOnCircle(center, center, outerRadius, outerChartData.midheaven, innerAscendant);
        const mcInnerPoint = pointOnCircle(center, center, innerRadius, outerChartData.midheaven, innerAscendant);
        const mcLabelPoint = pointOnCircle(center, center, labelRadius, outerChartData.midheaven, innerAscendant);
        const { formatted: mcDegreeStr, sign: mcSign } = formatDegreeMinute(outerChartData.midheaven);
        const mcTooltip = `${chartLabel} Midheaven: ${mcDegreeStr} ${mcSign}`;

        markers.push(
          <g key="transit-mc-marker">
            <line
              x1={mcOuterPoint.x}
              y1={mcOuterPoint.y}
              x2={mcInnerPoint.x}
              y2={mcInnerPoint.y}
              stroke="#4A6B8A"
              strokeWidth="3"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => showTooltip(e, mcTooltip)}
              onMouseLeave={hideTooltip}
            />
            <text
              x={mcLabelPoint.x}
              y={mcLabelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="13"
              fill="#4A6B8A"
              fontWeight="bold"
              stroke="white"
              strokeWidth="0.5"
              paintOrder="stroke"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => showTooltip(e, mcTooltip)}
              onMouseLeave={hideTooltip}
            >
              MC
            </text>
          </g>
        );

        // Add IC (Imum Coeli = MC + 180°)
        const ic = (outerChartData.midheaven + 180) % 360;
        const icOuterPoint = pointOnCircle(center, center, outerRadius, ic, innerAscendant);
        const icInnerPoint = pointOnCircle(center, center, innerRadius, ic, innerAscendant);
        const icLabelPoint = pointOnCircle(center, center, labelRadius, ic, innerAscendant);
        const { formatted: icDegreeStr, sign: icSign } = formatDegreeMinute(ic);
        const icTooltip = `${chartLabel} Imum Coeli: ${icDegreeStr} ${icSign}`;

        markers.push(
          <g key="transit-ic-marker">
            <line
              x1={icOuterPoint.x}
              y1={icOuterPoint.y}
              x2={icInnerPoint.x}
              y2={icInnerPoint.y}
              stroke="#4A6B8A"
              strokeWidth="3"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => showTooltip(e, icTooltip)}
              onMouseLeave={hideTooltip}
            />
            <text
              x={icLabelPoint.x}
              y={icLabelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="13"
              fill="#4A6B8A"
              fontWeight="bold"
              stroke="white"
              strokeWidth="0.5"
              paintOrder="stroke"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => showTooltip(e, icTooltip)}
              onMouseLeave={hideTooltip}
            >
              IC
            </text>
          </g>
        );
      }
    }

    // Tri-wheel only: show progression/solar arc ASC marker
    if (progressionsData && progressionsData.ascendant && wheelType === 'tri') {
      const outerRadius = zones.progressionPlanets.outerRadius + 5;
      const innerRadius = zones.progressionPlanets.outerRadius - 15;

      // Calculate positions
      const outerPoint = pointOnCircle(center, center, outerRadius, progressionsData.ascendant, innerAscendant);
      const innerPoint = pointOnCircle(center, center, innerRadius, progressionsData.ascendant, innerAscendant);

      // Label position (further out to avoid colored sign area)
      const labelRadius = outerRadius + 25;
      const labelPoint = pointOnCircle(center, center, labelRadius, progressionsData.ascendant, innerAscendant);

      // Tooltip
      const { formatted: degreeStr, sign } = formatDegreeMinute(progressionsData.ascendant);
      const progressionLabel = directionType === 'solarArcs' ? 'Solar Arc' : 'Progressed';
      const tooltipText = `${progressionLabel} Ascendant: ${degreeStr} ${sign}`;

      markers.push(
        <g key="progression-asc-marker">
          {/* Radial line */}
          <line
            x1={outerPoint.x}
            y1={outerPoint.y}
            x2={innerPoint.x}
            y2={innerPoint.y}
            stroke="#9C27B0"
            strokeWidth="3"
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => showTooltip(e, tooltipText)}
            onMouseLeave={hideTooltip}
          />
          {/* ASC label with stroke for readability */}
          <text
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="13"
            fill="#9C27B0"
            fontWeight="bold"
            stroke="white"
            strokeWidth="0.5"
            paintOrder="stroke"
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => showTooltip(e, tooltipText)}
            onMouseLeave={hideTooltip}
          >
            ASC
          </text>
        </g>
      );

      // Add DES, MC, IC for progression tri-wheel
      const progressionColor = "#9C27B0";

      // DES (Descendant)
      const progDescendant = (progressionsData.ascendant + 180) % 360;
      const progDesOuter = pointOnCircle(center, center, outerRadius, progDescendant, innerAscendant);
      const progDesInner = pointOnCircle(center, center, innerRadius, progDescendant, innerAscendant);
      const progDesLabel = pointOnCircle(center, center, labelRadius, progDescendant, innerAscendant);
      const { formatted: progDesDeg, sign: progDesSign } = formatDegreeMinute(progDescendant);

      markers.push(
        <g key="progression-des-marker">
          <line x1={progDesOuter.x} y1={progDesOuter.y} x2={progDesInner.x} y2={progDesInner.y}
                stroke={progressionColor} strokeWidth="3" style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => showTooltip(e, `${progressionLabel} Descendant: ${progDesDeg} ${progDesSign}`)}
                onMouseLeave={hideTooltip} />
          <text x={progDesLabel.x} y={progDesLabel.y} textAnchor="middle" dominantBaseline="middle"
                fontSize="13" fill={progressionColor} fontWeight="bold" stroke="white" strokeWidth="0.5" paintOrder="stroke"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => showTooltip(e, `${progressionLabel} Descendant: ${progDesDeg} ${progDesSign}`)}
                onMouseLeave={hideTooltip}>DES</text>
        </g>
      );

      // MC and IC
      if (progressionsData.midheaven) {
        const progMcOuter = pointOnCircle(center, center, outerRadius, progressionsData.midheaven, innerAscendant);
        const progMcInner = pointOnCircle(center, center, innerRadius, progressionsData.midheaven, innerAscendant);
        const progMcLabel = pointOnCircle(center, center, labelRadius, progressionsData.midheaven, innerAscendant);
        const { formatted: progMcDeg, sign: progMcSign } = formatDegreeMinute(progressionsData.midheaven);

        markers.push(
          <g key="progression-mc-marker">
            <line x1={progMcOuter.x} y1={progMcOuter.y} x2={progMcInner.x} y2={progMcInner.y}
                  stroke={progressionColor} strokeWidth="3" style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => showTooltip(e, `${progressionLabel} Midheaven: ${progMcDeg} ${progMcSign}`)}
                  onMouseLeave={hideTooltip} />
            <text x={progMcLabel.x} y={progMcLabel.y} textAnchor="middle" dominantBaseline="middle"
                  fontSize="13" fill={progressionColor} fontWeight="bold" stroke="white" strokeWidth="0.5" paintOrder="stroke"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => showTooltip(e, `${progressionLabel} Midheaven: ${progMcDeg} ${progMcSign}`)}
                  onMouseLeave={hideTooltip}>MC</text>
          </g>
        );

        // IC
        const progIc = (progressionsData.midheaven + 180) % 360;
        const progIcOuter = pointOnCircle(center, center, outerRadius, progIc, innerAscendant);
        const progIcInner = pointOnCircle(center, center, innerRadius, progIc, innerAscendant);
        const progIcLabel = pointOnCircle(center, center, labelRadius, progIc, innerAscendant);
        const { formatted: progIcDeg, sign: progIcSign } = formatDegreeMinute(progIc);

        markers.push(
          <g key="progression-ic-marker">
            <line x1={progIcOuter.x} y1={progIcOuter.y} x2={progIcInner.x} y2={progIcInner.y}
                  stroke={progressionColor} strokeWidth="3" style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => showTooltip(e, `${progressionLabel} Imum Coeli: ${progIcDeg} ${progIcSign}`)}
                  onMouseLeave={hideTooltip} />
            <text x={progIcLabel.x} y={progIcLabel.y} textAnchor="middle" dominantBaseline="middle"
                  fontSize="13" fill={progressionColor} fontWeight="bold" stroke="white" strokeWidth="0.5" paintOrder="stroke"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => showTooltip(e, `${progressionLabel} Imum Coeli: ${progIcDeg} ${progIcSign}`)}
                  onMouseLeave={hideTooltip}>IC</text>
          </g>
        );
      }
    }

    // Bi-wheel with progressions (no transits): show progression ASC marker
    if (progressionsData && progressionsData.ascendant && wheelType === 'bi' && !transitData) {
      const outerRadius = zones.transitPlanets.outerRadius + 5; // Use transit zone in bi-wheel mode
      const innerRadius = zones.transitPlanets.outerRadius - 15;

      // Calculate positions
      const outerPoint = pointOnCircle(center, center, outerRadius, progressionsData.ascendant, innerAscendant);
      const innerPoint = pointOnCircle(center, center, innerRadius, progressionsData.ascendant, innerAscendant);

      // Label position (further out to avoid colored sign area)
      const labelRadius = outerRadius + 25;
      const labelPoint = pointOnCircle(center, center, labelRadius, progressionsData.ascendant, innerAscendant);

      // Tooltip
      const { formatted: degreeStr, sign } = formatDegreeMinute(progressionsData.ascendant);
      const progressionLabel = directionType === 'solarArcs' ? 'Solar Arc' : 'Progressed';
      const tooltipText = `${progressionLabel} Ascendant: ${degreeStr} ${sign}`;

      markers.push(
        <g key="progression-asc-marker-bi">
          {/* Radial line */}
          <line
            x1={outerPoint.x}
            y1={outerPoint.y}
            x2={innerPoint.x}
            y2={innerPoint.y}
            stroke={directionType === 'solarArcs' ? '#FF8C00' : '#9C27B0'}
            strokeWidth="3"
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => showTooltip(e, tooltipText)}
            onMouseLeave={hideTooltip}
          />
          {/* ASC label with stroke for readability */}
          <text
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="13"
            fill={directionType === 'solarArcs' ? '#FF8C00' : '#9C27B0'}
            fontWeight="bold"
            stroke="white"
            strokeWidth="0.5"
            paintOrder="stroke"
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => showTooltip(e, tooltipText)}
            onMouseLeave={hideTooltip}
          >
            ASC
          </text>
        </g>
      );

      // Add DES, MC, IC for bi-wheel progression
      const biColor = directionType === 'solarArcs' ? '#FF8C00' : '#9C27B0';

      // DES
      const biDescendant = (progressionsData.ascendant + 180) % 360;
      const biDesOuter = pointOnCircle(center, center, outerRadius, biDescendant, innerAscendant);
      const biDesInner = pointOnCircle(center, center, innerRadius, biDescendant, innerAscendant);
      const biDesLabel = pointOnCircle(center, center, labelRadius, biDescendant, innerAscendant);
      const { formatted: biDesDeg, sign: biDesSign } = formatDegreeMinute(biDescendant);

      markers.push(
        <g key="progression-des-marker-bi">
          <line x1={biDesOuter.x} y1={biDesOuter.y} x2={biDesInner.x} y2={biDesInner.y}
                stroke={biColor} strokeWidth="3" style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => showTooltip(e, `${progressionLabel} Descendant: ${biDesDeg} ${biDesSign}`)}
                onMouseLeave={hideTooltip} />
          <text x={biDesLabel.x} y={biDesLabel.y} textAnchor="middle" dominantBaseline="middle"
                fontSize="13" fill={biColor} fontWeight="bold" stroke="white" strokeWidth="0.5" paintOrder="stroke"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => showTooltip(e, `${progressionLabel} Descendant: ${biDesDeg} ${biDesSign}`)}
                onMouseLeave={hideTooltip}>DES</text>
        </g>
      );

      // MC and IC
      if (progressionsData.midheaven) {
        const biMcOuter = pointOnCircle(center, center, outerRadius, progressionsData.midheaven, innerAscendant);
        const biMcInner = pointOnCircle(center, center, innerRadius, progressionsData.midheaven, innerAscendant);
        const biMcLabel = pointOnCircle(center, center, labelRadius, progressionsData.midheaven, innerAscendant);
        const { formatted: biMcDeg, sign: biMcSign } = formatDegreeMinute(progressionsData.midheaven);

        markers.push(
          <g key="progression-mc-marker-bi">
            <line x1={biMcOuter.x} y1={biMcOuter.y} x2={biMcInner.x} y2={biMcInner.y}
                  stroke={biColor} strokeWidth="3" style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => showTooltip(e, `${progressionLabel} Midheaven: ${biMcDeg} ${biMcSign}`)}
                  onMouseLeave={hideTooltip} />
            <text x={biMcLabel.x} y={biMcLabel.y} textAnchor="middle" dominantBaseline="middle"
                  fontSize="13" fill={biColor} fontWeight="bold" stroke="white" strokeWidth="0.5" paintOrder="stroke"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => showTooltip(e, `${progressionLabel} Midheaven: ${biMcDeg} ${biMcSign}`)}
                  onMouseLeave={hideTooltip}>MC</text>
          </g>
        );

        // IC
        const biIc = (progressionsData.midheaven + 180) % 360;
        const biIcOuter = pointOnCircle(center, center, outerRadius, biIc, innerAscendant);
        const biIcInner = pointOnCircle(center, center, innerRadius, biIc, innerAscendant);
        const biIcLabel = pointOnCircle(center, center, labelRadius, biIc, innerAscendant);
        const { formatted: biIcDeg, sign: biIcSign } = formatDegreeMinute(biIc);

        markers.push(
          <g key="progression-ic-marker-bi">
            <line x1={biIcOuter.x} y1={biIcOuter.y} x2={biIcInner.x} y2={biIcInner.y}
                  stroke={biColor} strokeWidth="3" style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => showTooltip(e, `${progressionLabel} Imum Coeli: ${biIcDeg} ${biIcSign}`)}
                  onMouseLeave={hideTooltip} />
            <text x={biIcLabel.x} y={biIcLabel.y} textAnchor="middle" dominantBaseline="middle"
                  fontSize="13" fill={biColor} fontWeight="bold" stroke="white" strokeWidth="0.5" paintOrder="stroke"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => showTooltip(e, `${progressionLabel} Imum Coeli: ${biIcDeg} ${biIcSign}`)}
                  onMouseLeave={hideTooltip}>IC</text>
          </g>
        );
      }
    }

    return markers;
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', paddingLeft: '25px' }}>
                <input
                  type="checkbox"
                  checked={showOnlyOuterPlanetTransits}
                  onChange={(e) => setShowOnlyOuterPlanetTransits(e.target.checked)}
                />
                <span style={{ fontSize: '13px' }}>Show Only Outer Planet Transit Lines</span>
              </label>
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

        {/* Render layers from back to front */}
        <g id="natal-aspect-lines">{renderAspects()}</g>
        <g id="natal-b-aspect-lines">{renderAspectsB()}</g>
        <g id="transit-natal-aspect-lines">{renderTransitNatalAspects()}</g>
        <g id="progression-natal-aspect-lines">{renderProgressionNatalAspects()}</g>
        <g id="transit-progression-aspect-lines">{renderTransitProgressionAspects()}</g>
        <g id="transit-transit-aspect-lines">{renderTransitTransitAspects()}</g>
        <g id="houses">{renderHouses()}</g>
        <g id="boundary-circles">{renderBoundaryCircles()}</g>
        <g id="zodiac-ring">{renderZodiacRing()}</g>
        <g id="fixed-stars">{renderFixedStars()}</g>
        <g id="natal-planets">{renderPlanets(filterDisplayedPlanets(chartData.planets, displaySettings), zones.natalPlanets.center, '#000')}</g>
        {progressionsData && (
          <g id="progression-planets">
            {renderPlanets(
              filterDisplayedPlanets(progressionsData.planets, displaySettings),
              zones.progressionPlanets ? zones.progressionPlanets.center : zones.transitPlanets.center,  // Tri-wheel: progression zone, Bi-wheel: transit zone
              directionType === 'solarArcs' ? '#FF8C00' : '#9C27B0'  // Orange for Solar Arcs, Purple for Progressions
            )}
          </g>
        )}
        {transitData && (
          <g id="transit-planets">
            {renderPlanets(
              filterDisplayedPlanets(transitData.planets, displaySettings),
              zones.transitPlanets.center,
              isReturnChart
                ? (returnType === 'solar' ? '#FFB347' : '#C0C0C0') // Solar: gold/amber, Lunar: silver
                : '#4169E1' // Default: Royal Blue for regular transits (darker, more readable)
            )}
          </g>
        )}
        <g id="angle-labels">{renderAngleLabels()}</g>
        <g id="outer-ascendant-markers">{renderOuterAscendantMarkers()}</g>
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
