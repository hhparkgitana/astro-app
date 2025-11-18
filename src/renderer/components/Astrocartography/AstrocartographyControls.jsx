import React from 'react';

const AstrocartographyControls = ({
  planetConfig,
  onTogglePlanet,
  lineTypeConfig,
  onToggleLineType
}) => {
  return (
    <div className="astrocartography-controls">
      <div className="controls-section">
        <h3>Planets</h3>
        <div className="planet-toggles">
          {Object.entries(planetConfig).map(([planet, config]) => (
            <label key={planet} className="planet-toggle">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={() => onTogglePlanet(planet)}
              />
              <span
                className="planet-label"
                style={{ color: config.color }}
              >
                <span className="planet-glyph">{config.label}</span>
                <span className="planet-name">{planet}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="controls-section">
        <h3>Line Types</h3>
        <div className="line-type-toggles">
          <label className="line-type-toggle">
            <input
              type="checkbox"
              checked={lineTypeConfig.ascendant}
              onChange={() => onToggleLineType('ascendant')}
            />
            <span>Ascendant (Rising)</span>
          </label>
          <label className="line-type-toggle">
            <input
              type="checkbox"
              checked={lineTypeConfig.descendant}
              onChange={() => onToggleLineType('descendant')}
            />
            <span>Descendant (Setting)</span>
          </label>
          <label className="line-type-toggle">
            <input
              type="checkbox"
              checked={lineTypeConfig.mc}
              onChange={() => onToggleLineType('mc')}
            />
            <span>MC (Midheaven)</span>
          </label>
          <label className="line-type-toggle">
            <input
              type="checkbox"
              checked={lineTypeConfig.ic}
              onChange={() => onToggleLineType('ic')}
            />
            <span>IC (Nadir)</span>
          </label>
        </div>
      </div>

      <div className="controls-section">
        <h3>About Astrocartography</h3>
        <p className="info-text">
          Astrocartography maps show where planetary energies are most powerful on Earth for your natal chart.
        </p>
        <ul className="info-list">
          <li><strong>ASC lines:</strong> Planet rising - personal identity emphasized</li>
          <li><strong>DSC lines:</strong> Planet setting - relationships highlighted</li>
          <li><strong>MC lines:</strong> Planet culminating - career and public life</li>
          <li><strong>IC lines:</strong> Planet at nadir - home and private life</li>
        </ul>
      </div>
    </div>
  );
};

export default AstrocartographyControls;
