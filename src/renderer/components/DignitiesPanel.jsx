import React, { useState, useMemo, useEffect } from 'react';
import { calculateAllDignities, getScoreClass, getPlanetGlyph } from '../../shared/calculations/dignitiesCalculator';
import './DignitiesPanel.css';

/**
 * Dignities Explanation Component
 */
const DignitiesExplanation = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="dignities-explanation">
      <p>
        Essential dignities measure planetary strength based on zodiac position.
        Higher scores indicate stronger, more effective planetary expression.
      </p>

      <button
        className="expand-button"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Show Less ▲' : 'Learn More ▼'}
      </button>

      {expanded && (
        <div className="explanation-details">
          <h4>Dignity System:</h4>
          <ul>
            <li><strong>Domicile (+5):</strong> Planet in its own sign</li>
            <li><strong>Exaltation (+4):</strong> Planet in exalted sign</li>
            <li><strong>Detriment (-5):</strong> Planet opposite its domicile</li>
            <li><strong>Fall (-4):</strong> Planet opposite its exaltation</li>
            <li><strong>Triplicity (+3):</strong> Element ruler (day/night)</li>
            <li><strong>Term (+2):</strong> Degree range ruler (Egyptian system)</li>
            <li><strong>Face (+1):</strong> Decan ruler (Chaldean order)</li>
          </ul>

          <h4>Score Interpretation:</h4>
          <ul>
            <li><strong>+5 or higher:</strong> Strong/dignified</li>
            <li><strong>0 to +4:</strong> Mixed strength</li>
            <li><strong>Negative:</strong> Weak/debilitated</li>
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Dignities Table Component
 */
const DignitiesTable = ({ dignities }) => {
  if (!dignities || dignities.length === 0) {
    return (
      <div className="no-dignities">
        <p>No chart data available to calculate dignities.</p>
      </div>
    );
  }

  return (
    <div className="dignities-table-wrapper">
      <table className="dignities-table">
        <thead>
          <tr>
            <th className="planet-col">Planet</th>
            <th className="sign-col">Sign</th>
            <th className="dom-col" title="Domicile: Planet in its own sign (+5)">Dom</th>
            <th className="exalt-col" title="Exaltation: Planet in exalted sign (+4)">Exalt</th>
            <th className="detr-col" title="Detriment: Planet opposite its domicile (-5)">Detr</th>
            <th className="fall-col" title="Fall: Planet opposite its exaltation (-4)">Fall</th>
            <th className="trip-col" title="Triplicity: Element ruler (+3)">Trip</th>
            <th className="term-col" title="Term: Degree range ruler (+2)">Term</th>
            <th className="face-col" title="Face: Decan ruler (+1)">Face</th>
            <th className="total-col">Total</th>
          </tr>
        </thead>
        <tbody>
          {dignities.map(d => (
            <tr key={d.planet}>
              <td className="planet-cell">
                <span className="planet-glyph">{getPlanetGlyph(d.planet)}</span>
                <span className="planet-name">{d.planet}</span>
              </td>
              <td className="sign-cell">
                {d.sign}
                <span className="degree-text">{d.degree}°</span>
              </td>
              <td className={`dignity-cell ${d.domicile ? 'dignity-active' : ''}`}>
                {d.domicile ? '+5' : '—'}
              </td>
              <td className={`dignity-cell ${d.exaltation ? 'dignity-active' : ''}`}>
                {d.exaltation ? '+4' : '—'}
              </td>
              <td className={`dignity-cell ${d.detriment ? 'debility-active' : ''}`}>
                {d.detriment ? '-5' : '—'}
              </td>
              <td className={`dignity-cell ${d.fall ? 'debility-active' : ''}`}>
                {d.fall ? '-4' : '—'}
              </td>
              <td className={`dignity-cell ${d.triplicity ? 'dignity-minor' : ''}`}>
                {d.triplicity ? '+3' : '—'}
              </td>
              <td className={`dignity-cell ${d.term ? 'dignity-minor' : ''}`}>
                {d.term ? '+2' : '—'}
              </td>
              <td className={`dignity-cell ${d.face ? 'dignity-minor' : ''}`}>
                {d.face ? '+1' : '—'}
              </td>
              <td className={`total-cell ${getScoreClass(d.total)}`}>
                {d.total > 0 ? '+' : ''}{d.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Main Dignities Panel Component
 */
const DignitiesPanel = ({ chartData, chartDataB, compositeChartData, viewMode, isOpen, onClose }) => {
  // State for which planet set to display
  const [selectedSource, setSelectedSource] = useState('natal');

  // Determine available options based on what data exists
  const availableOptions = useMemo(() => {
    const options = [];

    if (viewMode === 'relationship' && chartDataB) {
      // Synastry mode: Person A vs Person B
      options.push({ value: 'personA', label: 'Person A (Natal)' });
      options.push({ value: 'personB', label: 'Person B (Natal)' });
      if (chartData?.progressions?.planets) {
        options.push({ value: 'personA-progressed', label: 'Person A (Progressed)' });
      }
      if (chartDataB?.progressions?.planets) {
        options.push({ value: 'personB-progressed', label: 'Person B (Progressed)' });
      }
      if (compositeChartData) {
        options.push({ value: 'composite', label: 'Composite Chart' });
      }
    } else {
      // Single chart mode: Natal vs Progressed
      if (chartData) {
        options.push({ value: 'natal', label: 'Natal' });
      }
      if (chartData?.progressions?.planets) {
        options.push({ value: 'progressed', label: 'Progressed' });
      }
    }

    return options;
  }, [chartData, chartDataB, compositeChartData, viewMode]);

  // Get the current chart data based on selected source
  const currentChartData = useMemo(() => {
    switch (selectedSource) {
      case 'natal':
        return chartData;
      case 'progressed':
        return chartData?.progressions ? { ...chartData, planets: chartData.progressions.planets, houses: chartData.houses } : chartData;
      case 'personA':
        return chartData;
      case 'personB':
        return chartDataB;
      case 'personA-progressed':
        return chartData?.progressions ? { ...chartData, planets: chartData.progressions.planets, houses: chartData.houses } : chartData;
      case 'personB-progressed':
        return chartDataB?.progressions ? { ...chartDataB, planets: chartDataB.progressions.planets, houses: chartDataB.houses } : chartDataB;
      case 'composite':
        return compositeChartData;
      default:
        return chartData;
    }
  }, [selectedSource, chartData, chartDataB, compositeChartData]);

  // Calculate dignities for the selected source
  const dignities = useMemo(() => {
    if (!currentChartData) return [];
    return calculateAllDignities(currentChartData);
  }, [currentChartData]);

  // Reset to first available option when options change
  useEffect(() => {
    if (availableOptions.length > 0 && !availableOptions.find(opt => opt.value === selectedSource)) {
      setSelectedSource(availableOptions[0].value);
    }
  }, [availableOptions, selectedSource]);

  // Handle escape key to close
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="dignities-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className={`dignities-panel ${isOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <div className="header-content">
            <h2>Essential Dignities</h2>
            {availableOptions.length > 1 && (
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="source-selector"
                title="Select which planets to display dignities for"
              >
                {availableOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close dignities panel"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        <div className="panel-content">
          <DignitiesExplanation />
          <DignitiesTable dignities={dignities} />
        </div>
      </div>
    </>
  );
};

export default DignitiesPanel;
