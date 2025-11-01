import React, { useState, useEffect } from 'react';
import './EclipseDashboard.css';

/**
 * Eclipse Dashboard Component
 *
 * Displays eclipse tracking and activation timeline for the loaded natal chart.
 * Shows eclipses spanning 19+ years for Saros cycle correlation.
 */
function EclipseDashboard({ chartData }) {
  const [activations, setActivations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'approaching', 'active', 'integrating'
  const [orb, setOrb] = useState(3);
  const [stats, setStats] = useState(null);
  const timelineRef = React.useRef(null);
  const currentEclipseRef = React.useRef(null);

  // Load eclipses when chart data changes
  useEffect(() => {
    if (!chartData) {
      setActivations([]);
      setStats(null);
      return;
    }

    loadEclipses();
  }, [chartData, orb]);

  const loadEclipses = async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate date range (19 years for Saros cycle + current year)
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear - 10, 0, 1); // 10 years ago
      const endDate = new Date(currentYear + 10, 11, 31); // 10 years ahead

      // Call eclipse service via IPC
      const result = await window.astro.findEclipseActivations({
        natalChart: chartData,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        orb: orb
      });

      setActivations(result.activations);
      setStats(result.stats);
    } catch (err) {
      console.error('Error loading eclipses:', err);
      setError(err.message || 'Failed to load eclipses');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredActivations = () => {
    let filtered = filter === 'all'
      ? activations
      : activations.filter(a => a.status === filter);

    // Sort chronologically: past (oldest first) -> present -> future (soonest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.dateString);
      const dateB = new Date(b.dateString);
      return dateA - dateB; // Simple chronological order
    });
  };

  // Auto-scroll to current/active eclipse on load
  useEffect(() => {
    if (!loading && activations.length > 0 && currentEclipseRef.current) {
      // Scroll the current eclipse into view
      currentEclipseRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [loading, activations]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'status-badge active';
      case 'approaching':
        return 'status-badge approaching';
      case 'integrating':
        return 'status-badge integrating';
      case 'complete':
        return 'status-badge complete';
      default:
        return 'status-badge future';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Active Now';
      case 'approaching':
        return 'Approaching';
      case 'integrating':
        return 'Integrating';
      case 'complete':
        return 'Complete';
      default:
        return 'Future';
    }
  };

  if (!chartData) {
    return (
      <div className="eclipse-dashboard">
        <div className="eclipse-empty-state">
          <h2>Eclipse Tracking</h2>
          <p>Calculate a natal chart to see eclipse activations</p>
          <p className="eclipse-hint">
            Eclipses are tracked across 20 years to identify Saros cycle patterns
            (approximately 19-year repeating cycles)
          </p>
        </div>
      </div>
    );
  }

  const filteredActivations = getFilteredActivations();

  return (
    <div className="eclipse-dashboard">
      <header className="eclipse-header">
        <div className="eclipse-title">
          <h2>Eclipse Activations</h2>
          <p className="eclipse-chart-name">
            {chartData.name || 'Natal Chart'}
          </p>
        </div>

        <div className="eclipse-controls">
          <div className="orb-control">
            <label htmlFor="eclipse-orb">Orb: </label>
            <input
              id="eclipse-orb"
              type="number"
              min="1"
              max="5"
              step="0.5"
              value={orb}
              onChange={(e) => setOrb(parseFloat(e.target.value))}
            />
            <span>°</span>
          </div>

          <div className="filter-controls">
            <button
              className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter('all')}
            >
              All ({activations.length})
            </button>
            <button
              className={filter === 'approaching' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter('approaching')}
            >
              Approaching ({stats?.byStatus?.approaching || 0})
            </button>
            <button
              className={filter === 'active' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter('active')}
            >
              Active ({stats?.byStatus?.active || 0})
            </button>
            <button
              className={filter === 'integrating' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter('integrating')}
            >
              Integrating ({stats?.byStatus?.integrating || 0})
            </button>
          </div>
        </div>
      </header>

      {loading && (
        <div className="eclipse-loading">
          <p>Calculating eclipse activations...</p>
        </div>
      )}

      {error && (
        <div className="eclipse-error">
          <p>Error: {error}</p>
        </div>
      )}

      {!loading && !error && stats && (
        <div className="eclipse-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Activations</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.byType.solar}</div>
            <div className="stat-label">Solar Eclipses</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.byType.lunar}</div>
            <div className="stat-label">Lunar Eclipses</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {stats.byStatus.approaching + stats.byStatus.active}
            </div>
            <div className="stat-label">Current/Upcoming</div>
          </div>
        </div>
      )}

      {!loading && !error && filteredActivations.length > 0 && (
        <div className="eclipse-timeline" ref={timelineRef}>
          {filteredActivations.map((activation, index) => {
            // Attach ref to first active or approaching eclipse for auto-scroll
            const isCurrentEclipse = (activation.status === 'active' || activation.status === 'approaching') &&
              !filteredActivations.slice(0, index).some(e => e.status === 'active' || e.status === 'approaching');

            return (
            <div
              key={index}
              className="eclipse-card"
              ref={isCurrentEclipse ? currentEclipseRef : null}
            >
              <div className="eclipse-card-header">
                <div className="eclipse-type">
                  <span className={`eclipse-icon ${activation.type}`}>
                    {activation.type === 'solar' ? '☀️' : '🌙'}
                  </span>
                  <span className="eclipse-type-label">
                    {activation.kindLabel} {activation.typeLabel}
                  </span>
                </div>
                <span className={getStatusBadgeClass(activation.status)}>
                  {getStatusLabel(activation.status)}
                </span>
              </div>

              <div className="eclipse-card-body">
                <div className="eclipse-datetime">
                  <strong>{activation.dateString}</strong>
                  <span className="eclipse-time">{activation.timeString}</span>
                </div>

                <div className="eclipse-position">
                  <strong>Eclipse at:</strong> {activation.sign}
                  {activation.house && <span> in House {activation.house}</span>}
                </div>

                {activation.affectedPlanets && activation.affectedPlanets.length > 0 && (
                  <div className="affected-planets">
                    <strong>Activating:</strong>
                    <ul className="planet-list">
                      {activation.affectedPlanets.map((planet, idx) => (
                        <li key={idx} className="planet-item">
                          <span className="planet-name">{planet.planet}</span>
                          <span className="planet-sign">{planet.natalSign}</span>
                          <span className="planet-orb">
                            (orb: {planet.orb.toFixed(2)}°)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {!loading && !error && filteredActivations.length === 0 && activations.length > 0 && (
        <div className="eclipse-empty-filter">
          <p>No eclipses match the current filter.</p>
          <button onClick={() => setFilter('all')}>Show All Eclipses</button>
        </div>
      )}

      {!loading && !error && activations.length === 0 && (
        <div className="eclipse-empty">
          <p>No eclipse activations found within {orb}° orb.</p>
          <p className="eclipse-hint">
            Try increasing the orb to find more activations.
          </p>
        </div>
      )}
    </div>
  );
}

export default EclipseDashboard;
