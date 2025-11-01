import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TimeSlider.css';

/**
 * TimeSlider Component
 *
 * Controls transits, progressions, and solar arcs simultaneously via a timeline slider.
 * Features:
 * - Real-time chart updates as slider moves
 * - Visual aspect markers showing when exact aspects form
 * - Play/pause animation
 * - Configurable date range and increments
 */
function TimeSlider({
  chartData,
  formData,
  setFormData,
  onDateChange,
  onRecalculate
}) {
  // Slider state
  const [sliderPosition, setSliderPosition] = useState(50); // 0-100, represents position in date range
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // 1x, 2x, 5x, 10x

  // Date range state
  const [rangeYears, setRangeYears] = useState(2); // ±2 years by default
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Increment state
  const [increment, setIncrement] = useState('day'); // 'day', 'week', 'month', 'year'

  // Settings state
  const [showTransits, setShowTransits] = useState(true);
  const [showProgressions, setShowProgressions] = useState(false);
  const [showSolarArcs, setShowSolarArcs] = useState(false);
  const [showAspectMarkers, setShowAspectMarkers] = useState(true);
  const [aspectFilter, setAspectFilter] = useState('major'); // 'major' or 'all'

  // Aspect markers state (will be populated with pre-calculated aspects)
  const [aspectMarkers, setAspectMarkers] = useState([]);
  const [isCalculatingMarkers, setIsCalculatingMarkers] = useState(false);

  // Refs for animation
  const animationRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  const initializedRef = useRef(false);
  const markerCalculationRef = useRef(null); // Cancel token for marker calculation

  // Initialize date range based on current date
  useEffect(() => {
    if (!chartData) return;

    const now = new Date();
    const start = new Date(now);
    start.setFullYear(now.getFullYear() - rangeYears);
    const end = new Date(now);
    end.setFullYear(now.getFullYear() + rangeYears);

    setStartDate(start);
    setEndDate(end);

    // Only initialize current date and slider position once
    if (!initializedRef.current) {
      setCurrentDate(now);
      setSliderPosition(50);
      initializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, rangeYears]);

  // Convert slider position (0-100) to actual date
  const positionToDate = useCallback((position) => {
    if (!startDate || !endDate) return new Date();

    const totalMs = endDate.getTime() - startDate.getTime();
    const offsetMs = (position / 100) * totalMs;
    return new Date(startDate.getTime() + offsetMs);
  }, [startDate, endDate]);

  // Convert date to slider position (0-100)
  const dateToPosition = useCallback((date) => {
    if (!startDate || !endDate) return 50;

    const totalMs = endDate.getTime() - startDate.getTime();
    const offsetMs = date.getTime() - startDate.getTime();
    return Math.max(0, Math.min(100, (offsetMs / totalMs) * 100));
  }, [startDate, endDate]);

  // Update formData when date changes and return the updates for immediate use
  const updateFormData = useCallback((date) => {
    if (!setFormData) return null;

    const updates = {
      transitYear: date.getFullYear().toString(),
      transitMonth: (date.getMonth() + 1).toString(),
      transitDay: date.getDate().toString(),
      transitHour: date.getHours().toString(),
      transitMinute: date.getMinutes().toString(),
      progressionYear: date.getFullYear().toString(),
      progressionMonth: (date.getMonth() + 1).toString(),
      progressionDay: date.getDate().toString(),
    };

    // Enable transit and/or progression based on component state
    if (showTransits) {
      updates.showTransits = true;
    }
    if (showProgressions) {
      updates.showProgressions = true;
    }
    if (showSolarArcs) {
      updates.showProgressions = true;
      updates.directionType = 'solarArcs';
    }

    // Use the setter callback to get the latest state and return it
    let overrideData = null;
    setFormData(prev => {
      overrideData = { ...prev, ...updates };
      return overrideData;
    });

    // Debug logging
    console.log('TimeSlider - Date:', date.toLocaleString());
    console.log('TimeSlider - Override data:', {
      transitYear: overrideData.transitYear,
      transitMonth: overrideData.transitMonth,
      transitDay: overrideData.transitDay,
      transitHour: overrideData.transitHour,
      transitMinute: overrideData.transitMinute,
    });

    return overrideData;
  }, [setFormData, showTransits, showProgressions, showSolarArcs]);

  // Throttle timer ref
  const throttleTimerRef = useRef(null);

  // Handle slider change with throttling
  const handleSliderChange = useCallback((e) => {
    const position = parseFloat(e.target.value);
    setSliderPosition(position);

    const newDate = positionToDate(position);
    setCurrentDate(newDate);

    // Clear any pending throttle
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
    }

    // Throttle chart recalculation to avoid overwhelming the system
    throttleTimerRef.current = setTimeout(() => {
      const overrideData = updateFormData(newDate);

      // Trigger chart recalculation with the override data
      if (onRecalculate && overrideData) {
        onRecalculate(null, overrideData);
      }

      // Optional date change callback
      if (onDateChange) {
        onDateChange(newDate);
      }
    }, 150); // 150ms throttle - smooth but not overwhelming
  }, [positionToDate, onDateChange, onRecalculate, updateFormData]);

  // Handle increment buttons
  const incrementDate = useCallback((direction) => {
    const date = new Date(currentDate);

    switch (increment) {
      case 'day':
        date.setDate(date.getDate() + direction);
        break;
      case 'week':
        date.setDate(date.getDate() + (direction * 7));
        break;
      case 'month':
        date.setMonth(date.getMonth() + direction);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() + direction);
        break;
    }

    // Clamp to range
    if (date < startDate) date.setTime(startDate.getTime());
    if (date > endDate) date.setTime(endDate.getTime());

    setCurrentDate(date);
    setSliderPosition(dateToPosition(date));
    const overrideData = updateFormData(date);

    // Trigger chart recalculation immediately with the override data
    if (onRecalculate && overrideData) {
      onRecalculate(null, overrideData);
    }

    // Optional date change callback
    if (onDateChange) {
      onDateChange(date);
    }
  }, [currentDate, increment, startDate, endDate, dateToPosition, onDateChange, onRecalculate, updateFormData]);

  // Handle play/pause
  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = () => {
      const now = Date.now();
      const delta = now - lastUpdateRef.current;

      // Update every 100ms * speed
      if (delta >= (100 / playSpeed)) {
        incrementDate(1);
        lastUpdateRef.current = now;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playSpeed, incrementDate]);

  // Cleanup throttle timer on unmount
  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, []);

  // Reset to now
  const resetToNow = useCallback(() => {
    const now = new Date();
    setCurrentDate(now);
    setSliderPosition(dateToPosition(now));
    setIsPlaying(false);
    const overrideData = updateFormData(now);

    // Trigger chart recalculation immediately with the override data
    if (onRecalculate && overrideData) {
      onRecalculate(null, overrideData);
    }

    // Optional date change callback
    if (onDateChange) {
      onDateChange(now);
    }
  }, [dateToPosition, onDateChange, onRecalculate, updateFormData]);

  // Calculate aspect markers throughout the date range
  const calculateAspectMarkers = useCallback(async () => {
    if (!chartData || !startDate || !endDate || !showTransits) {
      setAspectMarkers([]);
      return;
    }

    // Cancel any ongoing calculation
    if (markerCalculationRef.current) {
      markerCalculationRef.current.cancelled = true;
    }

    const cancellationToken = { cancelled: false };
    markerCalculationRef.current = cancellationToken;

    setIsCalculatingMarkers(true);

    try {
      const markers = [];
      const totalMs = endDate.getTime() - startDate.getTime();
      const dayMs = 24 * 60 * 60 * 1000;

      // Sample every day (adjust interval based on range size)
      const sampleInterval = Math.max(dayMs, totalMs / 2000); // Max 2000 samples

      // Major aspects to track
      const majorAspects = {
        '0': { name: 'conjunction', symbol: '☌', orb: 8 },
        '60': { name: 'sextile', symbol: '⚹', orb: 6 },
        '90': { name: 'square', symbol: '□', orb: 8 },
        '120': { name: 'trine', symbol: '△', orb: 8 },
        '180': { name: 'opposition', symbol: '☍', orb: 8 }
      };

      // Track aspect formations (to find when they're exact)
      const aspectTracking = new Map();

      for (let time = startDate.getTime(); time <= endDate.getTime(); time += sampleInterval) {
        // Check if calculation was cancelled
        if (cancellationToken.cancelled) {
          console.log('Aspect marker calculation cancelled');
          return;
        }

        const date = new Date(time);

        // Calculate transit positions for this date
        // This is a simplified calculation - in production you'd call the actual ephemeris
        // For now, we'll mark this as a placeholder that needs backend support

        // Note: We need to add a lightweight API call to calculate just planet positions
        // without full chart calculation. For now, skip this feature.

        // TODO: Implement backend API for quick planet position calculation
        // const transitPositions = await window.astro.calculatePlanetPositions(date);

        // For now, we'll just create a placeholder
        // This feature requires backend support to be efficient
      }

      // For now, return empty array
      // Once backend support is added, this will populate with actual aspect markers
      setAspectMarkers(markers);

    } catch (error) {
      console.error('Error calculating aspect markers:', error);
      setAspectMarkers([]);
    } finally {
      if (!cancellationToken.cancelled) {
        setIsCalculatingMarkers(false);
      }
    }
  }, [chartData, startDate, endDate, showTransits, aspectFilter]);

  // Calculate aspect markers when date range or chart changes
  useEffect(() => {
    calculateAspectMarkers();

    // Cleanup on unmount
    return () => {
      if (markerCalculationRef.current) {
        markerCalculationRef.current.cancelled = true;
      }
    };
  }, [calculateAspectMarkers]);

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!chartData) {
    return (
      <div className="time-slider-disabled">
        <p>Calculate a natal chart to use the time slider</p>
      </div>
    );
  }

  return (
    <div className="time-slider">
      {/* Header with current date display */}
      <div className="time-slider-header">
        <div className="current-date-display">
          <div className="current-date-main">{formatDate(currentDate)}</div>
          <div className="current-date-time">{formatTime(currentDate)}</div>
        </div>
      </div>

      {/* Main slider control */}
      <div className="slider-control-section">
        <div className="slider-wrapper">
          {/* Aspect markers layer */}
          {showAspectMarkers && aspectMarkers.length > 0 && (
            <div className="aspect-markers-layer">
              {aspectMarkers.map((marker, index) => (
                <div
                  key={index}
                  className={`aspect-marker aspect-${marker.aspectType}`}
                  style={{ left: `${marker.position}%` }}
                  title={`${marker.planet} ${marker.aspectSymbol} ${marker.natalPlanet} - ${formatDate(marker.date)}`}
                />
              ))}
            </div>
          )}

          {/* Main slider input */}
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={sliderPosition}
            onChange={handleSliderChange}
            className="time-slider-input"
          />

          {/* Range labels */}
          <div className="slider-range-labels">
            <span className="range-label-start">{startDate && formatDate(startDate)}</span>
            <span className="range-label-end">{endDate && formatDate(endDate)}</span>
          </div>
        </div>
      </div>

      {/* Controls section */}
      <div className="slider-controls">
        {/* Increment selector */}
        <div className="increment-selector">
          <label>Step:</label>
          <select value={increment} onChange={(e) => setIncrement(e.target.value)}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>

        {/* Step buttons */}
        <div className="step-buttons">
          <button
            className="step-btn"
            onClick={() => incrementDate(-1)}
            title={`Previous ${increment}`}
          >
            ◀
          </button>
          <button
            className="step-btn"
            onClick={() => incrementDate(1)}
            title={`Next ${increment}`}
          >
            ▶
          </button>
        </div>

        {/* Play/pause button */}
        <button
          className={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Speed control */}
        <div className="speed-control">
          <label>Speed:</label>
          <select value={playSpeed} onChange={(e) => setPlaySpeed(parseFloat(e.target.value))}>
            <option value="1">1x</option>
            <option value="2">2x</option>
            <option value="5">5x</option>
            <option value="10">10x</option>
          </select>
        </div>

        {/* Reset to now */}
        <button className="reset-btn" onClick={resetToNow}>
          Reset to Now
        </button>

        {/* Date range configurator */}
        <div className="range-configurator">
          <label>Range:</label>
          <select value={rangeYears} onChange={(e) => setRangeYears(parseInt(e.target.value))}>
            <option value="1">±1 year</option>
            <option value="2">±2 years</option>
            <option value="5">±5 years</option>
            <option value="10">±10 years</option>
          </select>
        </div>
      </div>

      {/* Technique toggles */}
      <div className="technique-toggles">
        <label>
          <input
            type="checkbox"
            checked={showTransits}
            onChange={(e) => setShowTransits(e.target.checked)}
          />
          Transits
        </label>
        <label>
          <input
            type="checkbox"
            checked={showProgressions}
            onChange={(e) => setShowProgressions(e.target.checked)}
          />
          Progressions
        </label>
        <label>
          <input
            type="checkbox"
            checked={showSolarArcs}
            onChange={(e) => setShowSolarArcs(e.target.checked)}
          />
          Solar Arcs
        </label>
        <label>
          <input
            type="checkbox"
            checked={showAspectMarkers}
            onChange={(e) => setShowAspectMarkers(e.target.checked)}
          />
          Aspect Markers
        </label>
      </div>
    </div>
  );
}

export default TimeSlider;
