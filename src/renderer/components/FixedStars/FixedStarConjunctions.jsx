import React, { useState, useEffect } from 'react';
import { findFixedStarConjunctions, getFixedStarConjunctionInterpretation } from '../../../shared/calculations/fixedStarCalculator.js';
import './FixedStarConjunctions.css';

/**
 * FixedStarConjunctions Component
 *
 * Displays fixed star conjunctions for a natal chart
 * Shows planets and angles conjunct fixed stars with interpretations
 */
const FixedStarConjunctions = ({ chartData, tier = 'tier1', maxOrb = null, onStarClick }) => {
  const [conjunctions, setConjunctions] = useState([]);
  const [selectedConjunction, setSelectedConjunction] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!chartData) {
      setConjunctions([]);
      return;
    }

    try {
      const results = findFixedStarConjunctions(chartData, tier, maxOrb);
      console.log('Fixed star conjunctions found:', results);
      setConjunctions(results);
    } catch (error) {
      console.error('Error finding fixed star conjunctions:', error);
      setConjunctions([]);
    }
  }, [chartData, tier, maxOrb]);

  const handleConjunctionClick = (conjunction) => {
    setSelectedConjunction(selectedConjunction?.star === conjunction.star ? null : conjunction);
    if (onStarClick) {
      onStarClick(conjunction);
    }
  };

  const getOrbClassName = (orb) => {
    if (orb < 1) return 'orb-tight';
    if (orb < 1.5) return 'orb-moderate';
    return 'orb-wide';
  };

  const getPlanetGlyph = (planetKey) => {
    const glyphs = {
      sun: '☉',
      moon: '☽',
      mercury: '☿',
      venus: '♀',
      mars: '♂',
      jupiter: '♃',
      saturn: '♄',
      uranus: '♅',
      neptune: '♆',
      pluto: '♇',
      north_node: '☊',
      south_node: '☋',
      chiron: '⚷'
    };
    return glyphs[planetKey] || planetKey;
  };

  const getAngleGlyph = (angleKey) => {
    const glyphs = {
      ASC: 'ASC',
      DSC: 'DSC',
      MC: 'MC',
      IC: 'IC'
    };
    return glyphs[angleKey] || angleKey;
  };

  if (conjunctions.length === 0) {
    return (
      <div className="fixed-star-conjunctions empty">
        <h3>Fixed Star Conjunctions</h3>
        <p className="no-conjunctions">
          No fixed star conjunctions found within the specified orb.
        </p>
      </div>
    );
  }

  const displayedConjunctions = showAll ? conjunctions : conjunctions.slice(0, 5);
  const hasMore = conjunctions.length > 5;

  return (
    <div className="fixed-star-conjunctions">
      <div className="conjunctions-header">
        <h3>Fixed Star Conjunctions</h3>
        <span className="conjunction-count">{conjunctions.length} found</span>
      </div>

      <div className="conjunctions-list">
        {displayedConjunctions.map((conjunction, index) => {
          const interpretation = getFixedStarConjunctionInterpretation(conjunction);
          const isSelected = selectedConjunction?.star === conjunction.star;

          return (
            <div
              key={index}
              className={`star-conjunction-item ${isSelected ? 'selected' : ''}`}
              onClick={() => handleConjunctionClick(conjunction)}
            >
              <div className="conjunction-summary">
                <div className="star-name">
                  <span className="star-icon">⭐</span>
                  {conjunction.star}
                </div>
                <div className="star-position">
                  {conjunction.starDisplayPosition}
                </div>
              </div>

              <div className="conjunction-details">
                <div className="planet-conjunction">
                  {conjunction.type === 'planet' ? (
                    <>
                      <span className="planet-glyph">
                        {getPlanetGlyph(conjunction.planet)}
                      </span>
                      <span className="planet-name">{conjunction.planetName}</span>
                    </>
                  ) : (
                    <>
                      <span className="angle-glyph">
                        {getAngleGlyph(conjunction.angleKey)}
                      </span>
                      <span className="angle-name">{conjunction.angle}</span>
                    </>
                  )}
                  <span className="conjunction-sign"> at {conjunction.type === 'planet' ? conjunction.planetSign : conjunction.angleSign}</span>
                </div>

                <div className={`orb-info ${getOrbClassName(conjunction.orb)}`}>
                  <span className="orb-value">{conjunction.orb.toFixed(2)}°</span>
                  <span className="orb-label"> orb</span>
                  {conjunction.isApplying !== null && (
                    <span className="applying-indicator">
                      {conjunction.isApplying ? ' ⟳ applying' : ' ⟲ separating'}
                    </span>
                  )}
                </div>
              </div>

              {isSelected && (
                <div className="interpretation-preview">
                  <div className="interpretation-section">
                    <strong>General:</strong>
                    <p>{interpretation.general}</p>
                  </div>

                  <div className="interpretation-section positive">
                    <strong>Positive Manifestation:</strong>
                    <p>{interpretation.positive}</p>
                  </div>

                  <div className="interpretation-section negative">
                    <strong>Challenging Manifestation:</strong>
                    <p>{interpretation.negative}</p>
                  </div>

                  <div className="star-metadata">
                    <div className="metadata-item">
                      <span className="metadata-label">Nature:</span>
                      <span className="metadata-value">{conjunction.nature.join(' + ')}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">Constellation:</span>
                      <span className="metadata-value">{conjunction.constellation}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">Magnitude:</span>
                      <span className="metadata-value">{conjunction.magnitude}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          className="show-all-btn"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show Less' : `Show All (${conjunctions.length} total)`}
        </button>
      )}
    </div>
  );
};

export default FixedStarConjunctions;
