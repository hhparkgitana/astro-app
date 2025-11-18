import React, { useState } from 'react';
import './ConfigurationSearch.css';
import { searchFamousCharts } from '../utils/famousChartsSearchCalculator';

const ConfigurationSearch = () => {
  // Search mode state
  const [searchMode, setSearchMode] = useState('timePeriods'); // 'timePeriods' or 'famousCharts'

  // Search criteria state
  const [dateRange, setDateRange] = useState({
    startYear: '2024',
    startMonth: '1',
    startDay: '1',
    endYear: '2025',
    endMonth: '12',
    endDay: '31'
  });

  // Aspect criteria
  const [aspectCriteria, setAspectCriteria] = useState([]);

  // Placement criteria (sign or degree range)
  const [placementCriteria, setPlacementCriteria] = useState([]);

  // Retrograde criteria
  const [retrogradeCriteria, setRetrogradeCriteria] = useState([]);

  // Eclipse criteria
  const [eclipseCriteria, setEclipseCriteria] = useState([]);

  // Search results
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [resultCount, setResultCount] = useState(0);

  const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const aspects = ['Conjunction', 'Opposition', 'Square', 'Trine', 'Sextile', 'Semisextile', 'Quincunx'];
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  // Add aspect criterion
  const addAspectCriterion = () => {
    setAspectCriteria([...aspectCriteria, {
      id: Date.now(),
      planet1: 'Saturn',
      planet1Type: 'planet', // 'planet' or 'fixed'
      planet1Degree: '',
      planet1Sign: 'Aries',
      planet1DegreeInSign: '',
      planet2: 'Pluto',
      planet2Type: 'planet',
      planet2Degree: '',
      planet2Sign: 'Aries',
      planet2DegreeInSign: '',
      aspect: 'Square',
      orb: 2
    }]);
  };

  // Remove aspect criterion
  const removeAspectCriterion = (id) => {
    setAspectCriteria(aspectCriteria.filter(c => c.id !== id));
  };

  // Update aspect criterion
  const updateAspectCriterion = (id, field, value) => {
    setAspectCriteria(aspectCriteria.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  // Add placement criterion
  const addPlacementCriterion = () => {
    setPlacementCriteria([...placementCriteria, {
      id: Date.now(),
      planet: 'Uranus',
      type: 'sign',
      sign: 'Gemini',
      minDegree: 0,
      maxDegree: 30,
      signMinDegree: '',
      signMaxDegree: ''
    }]);
  };

  // Remove placement criterion
  const removePlacementCriterion = (id) => {
    setPlacementCriteria(placementCriteria.filter(c => c.id !== id));
  };

  // Update placement criterion
  const updatePlacementCriterion = (id, field, value) => {
    setPlacementCriteria(placementCriteria.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  // Add retrograde criterion
  const addRetrogradeCriterion = () => {
    setRetrogradeCriteria([...retrogradeCriteria, {
      id: Date.now(),
      planet: 'Mercury',
      isRetrograde: true
    }]);
  };

  // Remove retrograde criterion
  const removeRetrogradeCriterion = (id) => {
    setRetrogradeCriteria(retrogradeCriteria.filter(c => c.id !== id));
  };

  // Update retrograde criterion
  const updateRetrogradeCriterion = (id, field, value) => {
    setRetrogradeCriteria(retrogradeCriteria.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  // Add eclipse criterion
  const addEclipseCriterion = () => {
    setEclipseCriteria([...eclipseCriteria, {
      id: Date.now(),
      type: 'any', // 'any', 'solar', 'lunar'
      sign: '',
      minDegree: '',
      maxDegree: ''
    }]);
  };

  // Remove eclipse criterion
  const removeEclipseCriterion = (id) => {
    setEclipseCriteria(eclipseCriteria.filter(c => c.id !== id));
  };

  // Update eclipse criterion
  const updateEclipseCriterion = (id, field, value) => {
    setEclipseCriteria(eclipseCriteria.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  // Execute search
  const executeSearch = async () => {
    setSearching(true);
    setSearchResults([]);

    try {
      // Handle famous charts search mode
      if (searchMode === 'famousCharts') {
        // Build criteria object for famous charts search
        const criteria = {};

        // Add aspects
        if (aspectCriteria.length > 0) {
          criteria.aspects = aspectCriteria.map(c => {
            const aspectDef = {
              aspect: c.aspect.toLowerCase(),
              orb: parseFloat(c.orb)
            };

            // Handle planet1
            if (c.planet1Type === 'fixed' && c.planet1DegreeInSign !== '' && c.planet1DegreeInSign !== undefined) {
              const signIndex = signs.indexOf(c.planet1Sign);
              const absoluteDegree = signIndex * 30 + parseFloat(c.planet1DegreeInSign);
              aspectDef.planet1FixedDegree = absoluteDegree;
            } else {
              aspectDef.planet1 = c.planet1.toLowerCase();
            }

            // Handle planet2
            if (c.planet2Type === 'fixed' && c.planet2DegreeInSign !== '' && c.planet2DegreeInSign !== undefined) {
              const signIndex = signs.indexOf(c.planet2Sign);
              const absoluteDegree = signIndex * 30 + parseFloat(c.planet2DegreeInSign);
              aspectDef.planet2FixedDegree = absoluteDegree;
            } else {
              aspectDef.planet2 = c.planet2.toLowerCase();
            }

            return aspectDef;
          });
        }

        // Add placements
        if (placementCriteria.length > 0) {
          criteria.placements = placementCriteria.map(c => {
            if (c.type === 'sign') {
              const placement = {
                planet: c.planet.toLowerCase(),
                sign: c.sign.toLowerCase()
              };

              if (c.signMinDegree !== '' || c.signMaxDegree !== '') {
                placement.signMinDegree = c.signMinDegree !== '' ? parseFloat(c.signMinDegree) : 0;
                placement.signMaxDegree = c.signMaxDegree !== '' ? parseFloat(c.signMaxDegree) : 30;
              }

              return placement;
            } else {
              return {
                planet: c.planet.toLowerCase(),
                minDegree: parseFloat(c.minDegree),
                maxDegree: parseFloat(c.maxDegree)
              };
            }
          });
        }

        // Add retrograde
        if (retrogradeCriteria.length > 0) {
          criteria.retrograde = retrogradeCriteria.map(c => ({
            planet: c.planet.toLowerCase(),
            isRetrograde: c.isRetrograde
          }));
        }

        // Execute famous charts search
        const matches = searchFamousCharts(criteria);
        setSearchResults(matches);
        setResultCount(matches.length);
        setSearching(false);
        return;
      }

      // Build criteria object for time periods search
      const criteria = {};

      // Add aspects
      if (aspectCriteria.length > 0) {
        criteria.aspects = aspectCriteria.map(c => {
          const aspectDef = {
            aspect: c.aspect.toLowerCase(),
            orb: parseFloat(c.orb)
          };

          // Handle planet1 (either planet or fixed degree)
          // Only use fixed degree if type is 'fixed' AND degree is actually provided
          if (c.planet1Type === 'fixed' && c.planet1DegreeInSign !== '' && c.planet1DegreeInSign !== undefined) {
            // Convert sign + degree to absolute ecliptic degree
            const signIndex = signs.indexOf(c.planet1Sign);
            const absoluteDegree = signIndex * 30 + parseFloat(c.planet1DegreeInSign);
            aspectDef.planet1FixedDegree = absoluteDegree;
          } else {
            // Fallback to planet name (always use planet if fixed degree not properly specified)
            aspectDef.planet1 = c.planet1.toLowerCase();
          }

          // Handle planet2 (either planet or fixed degree)
          // Only use fixed degree if type is 'fixed' AND degree is actually provided
          if (c.planet2Type === 'fixed' && c.planet2DegreeInSign !== '' && c.planet2DegreeInSign !== undefined) {
            // Convert sign + degree to absolute ecliptic degree
            const signIndex = signs.indexOf(c.planet2Sign);
            const absoluteDegree = signIndex * 30 + parseFloat(c.planet2DegreeInSign);
            aspectDef.planet2FixedDegree = absoluteDegree;
          } else {
            // Fallback to planet name (always use planet if fixed degree not properly specified)
            aspectDef.planet2 = c.planet2.toLowerCase();
          }

          return aspectDef;
        });
      }

      // Add placements
      if (placementCriteria.length > 0) {
        criteria.placements = placementCriteria.map(c => {
          if (c.type === 'sign') {
            const placement = {
              planet: c.planet.toLowerCase(),
              sign: c.sign.toLowerCase()
            };

            // Add optional degree range within the sign
            if (c.signMinDegree !== '' || c.signMaxDegree !== '') {
              placement.signMinDegree = c.signMinDegree !== '' ? parseFloat(c.signMinDegree) : 0;
              placement.signMaxDegree = c.signMaxDegree !== '' ? parseFloat(c.signMaxDegree) : 30;
            }

            return placement;
          } else {
            return {
              planet: c.planet.toLowerCase(),
              minDegree: parseFloat(c.minDegree),
              maxDegree: parseFloat(c.maxDegree)
            };
          }
        });
      }

      // Add retrograde
      if (retrogradeCriteria.length > 0) {
        criteria.retrograde = retrogradeCriteria.map(c => ({
          planet: c.planet.toLowerCase(),
          isRetrograde: c.isRetrograde
        }));
      }

      // Build date range
      const startDate = new Date(
        parseInt(dateRange.startYear),
        parseInt(dateRange.startMonth) - 1,
        parseInt(dateRange.startDay)
      );

      const endDate = new Date(
        parseInt(dateRange.endYear),
        parseInt(dateRange.endMonth) - 1,
        parseInt(dateRange.endDay)
      );

      // Handle eclipse-only search separately
      if (eclipseCriteria.length > 0 &&
          aspectCriteria.length === 0 &&
          placementCriteria.length === 0 &&
          retrogradeCriteria.length === 0) {

        // Eclipse-only search (can only search for one eclipse criterion at a time for now)
        const eclipseCriterion = eclipseCriteria[0];
        const eclipseSearchCriteria = {
          type: eclipseCriterion.type === 'any' ? undefined : eclipseCriterion.type
        };

        if (eclipseCriterion.sign) {
          eclipseSearchCriteria.sign = eclipseCriterion.sign;

          if (eclipseCriterion.minDegree !== '' || eclipseCriterion.maxDegree !== '') {
            eclipseSearchCriteria.minDegree = eclipseCriterion.minDegree !== '' ? parseFloat(eclipseCriterion.minDegree) : 0;
            eclipseSearchCriteria.maxDegree = eclipseCriterion.maxDegree !== '' ? parseFloat(eclipseCriterion.maxDegree) : 29;
          }
        }

        const response = await window.astro.searchEclipses(
          eclipseSearchCriteria,
          startDate.toISOString(),
          endDate.toISOString()
        );

        setSearchResults(response.ranges || []);
        setResultCount(response.rangeCount || 0);
      } else {
        // Regular planetary configuration search
        const response = await window.astro.searchPlanetaryConfigurations(
          criteria,
          startDate.toISOString(),
          endDate.toISOString()
        );

        setSearchResults(response.ranges || []);
        setResultCount(response.rangeCount || 0);
      }

    } catch (error) {
      console.error('Search error:', error);
      alert('Error executing search: ' + error.message);
    } finally {
      setSearching(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="configuration-search">
      <div className="search-header">
        <h2>Planetary Configuration Search</h2>
        <p>Search for dates when specific planetary configurations occur</p>
      </div>

      {/* Search Mode Toggle */}
      <div className="search-mode-toggle">
        <label className={searchMode === 'timePeriods' ? 'active' : ''}>
          <input
            type="radio"
            name="searchMode"
            value="timePeriods"
            checked={searchMode === 'timePeriods'}
            onChange={(e) => setSearchMode(e.target.value)}
          />
          <span>Search Time Periods</span>
        </label>
        <label className={searchMode === 'famousCharts' ? 'active' : ''}>
          <input
            type="radio"
            name="searchMode"
            value="famousCharts"
            checked={searchMode === 'famousCharts'}
            onChange={(e) => setSearchMode(e.target.value)}
          />
          <span>Search Famous Charts</span>
        </label>
      </div>

      <div className="search-builder">
        {/* Date Range - only show for time periods mode */}
        {searchMode === 'timePeriods' && (
        <div className="criteria-section">
          <h3>Date Range</h3>
          <div className="date-range-inputs">
            <div className="date-input-group">
              <label>Start Date:</label>
              <input type="number" placeholder="Year" value={dateRange.startYear}
                onChange={(e) => setDateRange({...dateRange, startYear: e.target.value})} />
              <input type="number" placeholder="Month" value={dateRange.startMonth} min="1" max="12"
                onChange={(e) => setDateRange({...dateRange, startMonth: e.target.value})} />
              <input type="number" placeholder="Day" value={dateRange.startDay} min="1" max="31"
                onChange={(e) => setDateRange({...dateRange, startDay: e.target.value})} />
            </div>
            <div className="date-input-group">
              <label>End Date:</label>
              <input type="number" placeholder="Year" value={dateRange.endYear}
                onChange={(e) => setDateRange({...dateRange, endYear: e.target.value})} />
              <input type="number" placeholder="Month" value={dateRange.endMonth} min="1" max="12"
                onChange={(e) => setDateRange({...dateRange, endMonth: e.target.value})} />
              <input type="number" placeholder="Day" value={dateRange.endDay} min="1" max="31"
                onChange={(e) => setDateRange({...dateRange, endDay: e.target.value})} />
            </div>
          </div>
        </div>
        )}

        {/* Aspect Criteria */}
        <div className="criteria-section">
          <h3>Aspects</h3>
          {aspectCriteria.map((criterion) => (
            <div key={criterion.id} className="criterion-row" style={{flexWrap: 'wrap'}}>
              {/* Planet 1 or Fixed Position */}
              <select value={criterion.planet1Type}
                onChange={(e) => updateAspectCriterion(criterion.id, 'planet1Type', e.target.value)}
                style={{width: '90px'}}>
                <option value="planet">Planet</option>
                <option value="fixed">Fixed °</option>
              </select>
              {criterion.planet1Type === 'planet' ? (
                <select value={criterion.planet1}
                  onChange={(e) => updateAspectCriterion(criterion.id, 'planet1', e.target.value)}>
                  {planets.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : (
                <>
                  <input
                    type="number"
                    value={criterion.planet1DegreeInSign}
                    min="0"
                    max="29"
                    placeholder="0-29"
                    style={{width: '60px'}}
                    onChange={(e) => updateAspectCriterion(criterion.id, 'planet1DegreeInSign', e.target.value)}
                  />
                  <span>°</span>
                  <select value={criterion.planet1Sign}
                    onChange={(e) => updateAspectCriterion(criterion.id, 'planet1Sign', e.target.value)}
                    style={{width: '100px'}}>
                    {signs.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </>
              )}

              {/* Aspect */}
              <select value={criterion.aspect}
                onChange={(e) => updateAspectCriterion(criterion.id, 'aspect', e.target.value)}>
                {aspects.map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              {/* Planet 2 or Fixed Position */}
              <select value={criterion.planet2Type}
                onChange={(e) => updateAspectCriterion(criterion.id, 'planet2Type', e.target.value)}
                style={{width: '90px'}}>
                <option value="planet">Planet</option>
                <option value="fixed">Fixed °</option>
              </select>
              {criterion.planet2Type === 'planet' ? (
                <select value={criterion.planet2}
                  onChange={(e) => updateAspectCriterion(criterion.id, 'planet2', e.target.value)}>
                  {planets.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : (
                <>
                  <input
                    type="number"
                    value={criterion.planet2DegreeInSign}
                    min="0"
                    max="29"
                    placeholder="0-29"
                    style={{width: '60px'}}
                    onChange={(e) => updateAspectCriterion(criterion.id, 'planet2DegreeInSign', e.target.value)}
                  />
                  <span>°</span>
                  <select value={criterion.planet2Sign}
                    onChange={(e) => updateAspectCriterion(criterion.id, 'planet2Sign', e.target.value)}
                    style={{width: '100px'}}>
                    {signs.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </>
              )}

              {/* Orb */}
              <label>Orb:</label>
              <input type="number" value={criterion.orb} min="0" max="10" step="0.5"
                style={{width: '60px'}}
                onChange={(e) => updateAspectCriterion(criterion.id, 'orb', e.target.value)} />
              <button onClick={() => removeAspectCriterion(criterion.id)} className="remove-btn">✕</button>
            </div>
          ))}
          <button onClick={addAspectCriterion} className="add-btn">+ Add Aspect</button>
        </div>

        {/* Placement Criteria */}
        <div className="criteria-section">
          <h3>Planet Placements</h3>
          {placementCriteria.map((criterion) => (
            <div key={criterion.id} className="criterion-row">
              <select value={criterion.planet}
                onChange={(e) => updatePlacementCriterion(criterion.id, 'planet', e.target.value)}>
                {planets.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <span>in</span>
              <select value={criterion.type}
                onChange={(e) => updatePlacementCriterion(criterion.id, 'type', e.target.value)}>
                <option value="sign">Sign</option>
                <option value="degree">Degree Range</option>
              </select>
              {criterion.type === 'sign' ? (
                <>
                  <select value={criterion.sign}
                    onChange={(e) => updatePlacementCriterion(criterion.id, 'sign', e.target.value)}>
                    {signs.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span style={{marginLeft: '10px', color: '#6c757d'}}>at</span>
                  <input
                    type="number"
                    value={criterion.signMinDegree}
                    min="0"
                    max="30"
                    placeholder="0"
                    style={{width: '60px'}}
                    onChange={(e) => updatePlacementCriterion(criterion.id, 'signMinDegree', e.target.value)}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    value={criterion.signMaxDegree}
                    min="0"
                    max="30"
                    placeholder="30"
                    style={{width: '60px'}}
                    onChange={(e) => updatePlacementCriterion(criterion.id, 'signMaxDegree', e.target.value)}
                  />
                  <span>° (optional)</span>
                </>
              ) : (
                <>
                  <input type="number" value={criterion.minDegree} min="0" max="360" placeholder="Min"
                    onChange={(e) => updatePlacementCriterion(criterion.id, 'minDegree', e.target.value)} />
                  <span>to</span>
                  <input type="number" value={criterion.maxDegree} min="0" max="360" placeholder="Max"
                    onChange={(e) => updatePlacementCriterion(criterion.id, 'maxDegree', e.target.value)} />
                  <span>degrees</span>
                </>
              )}
              <button onClick={() => removePlacementCriterion(criterion.id)} className="remove-btn">✕</button>
            </div>
          ))}
          <button onClick={addPlacementCriterion} className="add-btn">+ Add Placement</button>
        </div>

        {/* Retrograde Criteria */}
        <div className="criteria-section">
          <h3>Retrograde Status</h3>
          {retrogradeCriteria.map((criterion) => (
            <div key={criterion.id} className="criterion-row">
              <select value={criterion.planet}
                onChange={(e) => updateRetrogradeCriterion(criterion.id, 'planet', e.target.value)}>
                {planets.filter(p => p !== 'Sun' && p !== 'Moon').map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={criterion.isRetrograde.toString()}
                onChange={(e) => updateRetrogradeCriterion(criterion.id, 'isRetrograde', e.target.value === 'true')}>
                <option value="true">Retrograde</option>
                <option value="false">Direct</option>
              </select>
              <button onClick={() => removeRetrogradeCriterion(criterion.id)} className="remove-btn">✕</button>
            </div>
          ))}
          <button onClick={addRetrogradeCriterion} className="add-btn">+ Add Retrograde Criterion</button>
        </div>

        {/* Eclipse Criteria */}
        <div className="criteria-section">
          <h3>Eclipses</h3>
          {eclipseCriteria.map((criterion) => (
            <div key={criterion.id} className="criterion-row">
              <select value={criterion.type}
                onChange={(e) => updateEclipseCriterion(criterion.id, 'type', e.target.value)}>
                <option value="any">Any Eclipse</option>
                <option value="solar">Solar Eclipse</option>
                <option value="lunar">Lunar Eclipse</option>
              </select>

              {/* Optional sign filter */}
              <span>in</span>
              <select value={criterion.sign}
                onChange={(e) => updateEclipseCriterion(criterion.id, 'sign', e.target.value)}>
                <option value="">Any Sign</option>
                {signs.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
              </select>

              {/* Optional degree range within sign */}
              {criterion.sign && (
                <>
                  <span>between</span>
                  <input
                    type="number"
                    value={criterion.minDegree}
                    min="0"
                    max="29"
                    placeholder="0"
                    style={{width: '60px'}}
                    onChange={(e) => updateEclipseCriterion(criterion.id, 'minDegree', e.target.value)}
                  />
                  <span>° and</span>
                  <input
                    type="number"
                    value={criterion.maxDegree}
                    min="0"
                    max="29"
                    placeholder="29"
                    style={{width: '60px'}}
                    onChange={(e) => updateEclipseCriterion(criterion.id, 'maxDegree', e.target.value)}
                  />
                  <span>°</span>
                </>
              )}

              <button onClick={() => removeEclipseCriterion(criterion.id)} className="remove-btn">✕</button>
            </div>
          ))}
          <button onClick={addEclipseCriterion} className="add-btn">+ Add Eclipse Criterion</button>
        </div>

        {/* Search Button */}
        <div className="search-actions">
          <button onClick={executeSearch} disabled={searching} className="search-btn">
            {searching ? 'Searching...' : 'Search'}
          </button>
          {resultCount > 0 && <span className="result-count">{resultCount} results found</span>}
        </div>
      </div>

      {/* Results */}
      {searchResults.length > 0 && (
        <div className="search-results">
          {searchMode === 'famousCharts' ? (
            <>
              <h3>Results ({resultCount} charts found)</h3>
              <div className="results-list">
                {searchResults.slice(0, 100).map((match, index) => (
                  <div key={index} className="result-item famous-chart-result">
                    <div className="chart-info">
                      <h4>{match.chart.name}</h4>
                      <div className="chart-details">
                        <span className="chart-category">{match.chart.category}</span>
                        <span className="chart-date">{match.chart.date} at {match.chart.time}</span>
                        <span className="chart-location">{match.chart.location}</span>
                        {match.chart.roddenRating && (
                          <span className="rodden-rating">Rodden Rating: {match.chart.roddenRating}</span>
                        )}
                      </div>
                      {match.chart.notes && (
                        <p className="chart-notes">{match.chart.notes}</p>
                      )}
                    </div>
                    <div className="match-details">
                      <strong>Matching Criteria:</strong>
                      {match.matchDetails.aspects.length > 0 && (
                        <div className="match-section">
                          <em>Aspects:</em>
                          {match.matchDetails.aspects.map((aspect, i) => (
                            <span key={i} className="match-item">
                              {aspect.planet1} {aspect.aspect} {aspect.planet2} (orb: {aspect.orb}°)
                            </span>
                          ))}
                        </div>
                      )}
                      {match.matchDetails.placements.length > 0 && (
                        <div className="match-section">
                          <em>Placements:</em>
                          {match.matchDetails.placements.map((placement, i) => (
                            <span key={i} className="match-item">
                              {placement.planet} in {placement.sign}
                            </span>
                          ))}
                        </div>
                      )}
                      {match.matchDetails.retrogrades.length > 0 && (
                        <div className="match-section">
                          <em>Retrograde:</em>
                          {match.matchDetails.retrogrades.map((retro, i) => (
                            <span key={i} className="match-item">
                              {retro.planet} {retro.status}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {resultCount > 100 && (
                  <div className="results-notice">
                    Showing first 100 charts. Refine your search for more specific results.
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <h3>Results ({resultCount} date ranges found)</h3>
              <div className="results-list">
            {searchResults.slice(0, 100).map((range, index) => (
              <div key={index} className="result-item">
                <div className="result-date">
                  <strong>From:</strong> {formatDate(range.startDate)}
                  <br />
                  <strong>To:</strong> {formatDate(range.endDate)}
                </div>

                {/* Check if this is an eclipse result */}
                {range.startData && (range.startData.type || range.startData.kind) ? (
                  <div className="result-positions">
                    <div style={{marginBottom: '5px'}}>
                      <span className="planet-position">
                        <strong>{range.startData.type === 'solar' ? 'Solar' : 'Lunar'} Eclipse</strong>
                        {' '}({range.startData.kind})
                        {' at '}
                        {range.startData.degreeInSign}° {range.startData.sign}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="result-positions">
                    <div style={{marginBottom: '5px'}}>
                      <em>Start positions:</em>
                      {Object.entries(range.startPositions).map(([planet, data]) => (
                        <span key={planet} className="planet-position">
                          {planet.charAt(0).toUpperCase() + planet.slice(1)}: {data.degreeInSign}° {data.sign}
                          {data.isRetrograde && ' ℞'}
                        </span>
                      ))}
                    </div>
                    <div>
                      <em>End positions:</em>
                      {Object.entries(range.endPositions).map(([planet, data]) => (
                        <span key={planet} className="planet-position">
                          {planet.charAt(0).toUpperCase() + planet.slice(1)}: {data.degreeInSign}° {data.sign}
                          {data.isRetrograde && ' ℞'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {resultCount > 100 && (
              <div className="results-notice">
                Showing first 100 date ranges. Refine your search for more specific results.
              </div>
            )}
              </div>
            </>
          )}
        </div>
      )}

      {searchResults.length === 0 && !searching && (
        <div className="no-results">
          {searchMode === 'famousCharts' ? (
            <p>No famous charts found matching your criteria. Try adjusting your search parameters or increasing the orb values.</p>
          ) : (
            <p>Add search criteria and click Search to find matching planetary configurations.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ConfigurationSearch;
