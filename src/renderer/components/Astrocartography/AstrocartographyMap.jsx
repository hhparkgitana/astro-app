import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { geoPath, geoEquirectangular } from 'd3-geo';
import { feature } from 'topojson-client';
import { calculateAstrocartographyLines, getLineInterpretation } from './astrocartographyCalculator';

const AstrocartographyMap = ({ chartData, planetConfig, lineTypeConfig }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 1400, height: 700 });
  const [planetLines, setPlanetLines] = useState({});
  const [worldMapData, setWorldMapData] = useState(null);

  // Load world map data on mount
  useEffect(() => {
    fetch('/world-map.json')
      .then(response => response.json())
      .then(data => {
        console.log('World map data loaded successfully');
        setWorldMapData(data);
      })
      .catch(error => {
        console.error('Error loading world map data:', error);
      });
  }, []);

  // Calculate planetary lines when chart data changes
  useEffect(() => {
    if (!chartData) return;

    console.log('Calculating astrocartography lines for chart:', chartData);
    const lines = calculateAstrocartographyLines(chartData);
    console.log('Calculated planetary lines:', lines);
    setPlanetLines(lines);
  }, [chartData]);

  // Render map when lines or config changes
  useEffect(() => {
    if (!worldMapData) {
      console.log('World map data not loaded yet');
      return;
    }
    if (!planetLines || Object.keys(planetLines).length === 0) {
      console.log('No planetary lines to render yet');
      return;
    }
    if (!svgRef.current) return;

    console.log('Rendering astrocartography map with', Object.keys(planetLines).length, 'planets');

    // Clear existing content
    d3.select(svgRef.current).selectAll('*').remove();

    // Setup SVG
    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);

    // Add background first (directly to svg, not affected by zoom)
    svg.append('rect')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('fill', '#e8f4f8');

    // Create a group for all map content (this will be transformed by zoom)
    const g = svg.append('g')
      .attr('class', 'map-content');

    // Setup projection
    const projection = geoEquirectangular()
      .scale(dimensions.width / (2 * Math.PI))
      .translate([dimensions.width / 2, dimensions.height / 2])
      .precision(0.1);

    const path = geoPath().projection(projection);

    // Draw world map (append to g group for zoom)
    try {
      const world = feature(worldMapData, worldMapData.objects.countries);

      g.append('g')
        .attr('class', 'countries')
        .selectAll('path')
        .data(world.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', '#d4e5e5')
        .attr('stroke', '#8b9999')
        .attr('stroke-width', 0.5);
    } catch (error) {
      console.error('Error rendering world map:', error);
    }

    // Line generator for planetary lines
    const lineGenerator = d3.line()
      .x(d => {
        const coords = projection([d.lon, d.lat]);
        return coords ? coords[0] : null;
      })
      .y(d => {
        const coords = projection([d.lon, d.lat]);
        return coords ? coords[1] : null;
      })
      .defined(d => {
        const coords = projection([d.lon, d.lat]);
        return coords !== null && !isNaN(coords[0]) && !isNaN(coords[1]);
      })
      .curve(d3.curveLinear);

    // Draw planetary lines (append to g group for zoom)
    Object.entries(planetLines).forEach(([planetName, lines]) => {
      // Check if planet is enabled
      if (!planetConfig[planetName]?.enabled) {
        return;
      }

      const color = planetConfig[planetName]?.color || '#000000';
      const lineGroup = g.append('g')
        .attr('class', `planet-lines planet-lines-${planetName.toLowerCase().replace(' ', '-')}`);

      // Draw each line type (ascendant, descendant, mc, ic)
      ['ascendant', 'descendant', 'mc', 'ic'].forEach(lineType => {
        // Check if line type is enabled
        if (lineTypeConfig && !lineTypeConfig[lineType]) {
          return;
        }

        const lineData = lines[lineType];
        if (!lineData || lineData.length === 0) {
          return;
        }

        // For MC and IC lines (which are vertical), we can draw as single paths
        // For ASC and DSC lines (which curve), we need to handle wraparound
        if (lineType === 'mc' || lineType === 'ic') {
          // Vertical lines - simple case
          lineGroup.append('path')
            .datum(lineData)
            .attr('d', lineGenerator)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.7)
            .attr('class', `line-${lineType}`)
            .style('pointer-events', 'stroke')
            .style('cursor', 'pointer')
            .on('mouseover', function(event) {
              d3.select(this)
                .attr('stroke-width', 3)
                .attr('stroke-opacity', 1);

              showTooltip(event, planetName, lineType);
            })
            .on('mouseout', function() {
              d3.select(this)
                .attr('stroke-width', 2)
                .attr('stroke-opacity', 0.7);

              hideTooltip();
            });
        } else {
          // Curved lines (ASC/DSC) - need to split at map edges
          const segments = splitLineAtMapEdges(lineData);

          segments.forEach((segment, idx) => {
            lineGroup.append('path')
              .datum(segment)
              .attr('d', lineGenerator)
              .attr('fill', 'none')
              .attr('stroke', color)
              .attr('stroke-width', 2)
              .attr('stroke-opacity', 0.7)
              .attr('class', `line-${lineType} line-${lineType}-segment-${idx}`)
              .style('pointer-events', 'stroke')
              .style('cursor', 'pointer')
              .on('mouseover', function(event) {
                // Highlight all segments of this line
                d3.selectAll(`.line-${lineType}`)
                  .attr('stroke-width', 3)
                  .attr('stroke-opacity', 1);

                showTooltip(event, planetName, lineType);
              })
              .on('mouseout', function() {
                // Reset all segments
                d3.selectAll(`.line-${lineType}`)
                  .attr('stroke-width', 2)
                  .attr('stroke-opacity', 0.7);

                hideTooltip();
              });
          });
        }
      });
    });

    // Add graticule (lat/lon grid lines) - append to g group for zoom
    const graticule = d3.geoGraticule();
    g.append('path')
      .datum(graticule)
      .attr('class', 'graticule')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.5);

    // Setup zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([1, 8]) // Min zoom 1x, max zoom 8x
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    // Apply zoom to SVG
    svg.call(zoom);

  }, [worldMapData, planetLines, planetConfig, lineTypeConfig, dimensions]);

  // Helper function to split lines at map edges (for wraparound)
  const splitLineAtMapEdges = (lineData) => {
    const segments = [];
    let currentSegment = [];

    for (let i = 0; i < lineData.length; i++) {
      const point = lineData[i];

      if (i > 0) {
        const prevPoint = lineData[i - 1];
        // Check for longitude wraparound (crossing date line)
        const lonDiff = Math.abs(point.lon - prevPoint.lon);

        if (lonDiff > 180) {
          // Wraparound detected - start new segment
          if (currentSegment.length > 0) {
            segments.push(currentSegment);
          }
          currentSegment = [point];
          continue;
        }
      }

      currentSegment.push(point);
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments.length > 0 ? segments : [lineData];
  };

  // Show tooltip
  const showTooltip = (event, planetName, lineType) => {
    if (!tooltipRef.current) return;

    const lineLabels = {
      ascendant: 'Rising (ASC)',
      descendant: 'Setting (DSC)',
      mc: 'Midheaven (MC)',
      ic: 'IC (Nadir)'
    };

    const interpretation = getLineInterpretation(planetName, lineType);

    d3.select(tooltipRef.current)
      .style('display', 'block')
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 10}px`)
      .html(`
        <div style="font-weight: bold; margin-bottom: 5px;">
          ${planetConfig[planetName]?.label || ''} ${planetName} ${lineLabels[lineType]}
        </div>
        <div style="font-size: 0.9em; font-style: italic;">
          ${interpretation}
        </div>
      `);
  };

  // Hide tooltip
  const hideTooltip = () => {
    if (!tooltipRef.current) return;
    d3.select(tooltipRef.current).style('display', 'none');
  };

  // Handle window resize - use fixed large dimensions
  useEffect(() => {
    const handleResize = () => {
      // Use large fixed dimensions that will scale down via CSS if needed
      const width = 1400;
      const height = 700;
      setDimensions({ width, height });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="astrocartography-map-container">
      <svg ref={svgRef} className="astrocartography-map" />
      <div ref={tooltipRef} className="astrocartography-tooltip" />
    </div>
  );
};

export default AstrocartographyMap;
