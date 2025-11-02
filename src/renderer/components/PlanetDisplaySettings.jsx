import React from 'react';
import { CHART_CONFIG } from '../utils/chartMath';

/**
 * Planet Display Settings Component
 *
 * Allows users to toggle visibility of optional celestial bodies:
 * - Centaurs (Chiron, Pholus)
 * - Asteroids (Ceres, Pallas, Juno, Vesta)
 * - Calculated Points (Lilith Mean/True)
 *
 * Traditional planets (Sun-Pluto + Nodes) are always visible.
 */
function PlanetDisplaySettings({ displaySettings, setDisplaySettings }) {
  const handleToggle = (category) => {
    setDisplaySettings(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const categoryLabels = {
    centaurs: {
      label: 'Centaurs',
      description: 'Chiron (⚷), Pholus (⯛)'
    },
    asteroids: {
      label: 'Asteroids',
      description: 'Ceres (⚳), Pallas (⚴), Juno (⚵), Vesta (⚶)'
    },
    calculatedPoints: {
      label: 'Calculated Points',
      description: 'Black Moon Lilith (⚸ Mean & True)'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Additional Bodies</span>
        <span style={styles.subtitle}>Toggle optional celestial bodies</span>
      </div>

      <div style={styles.settingsGrid}>
        {Object.entries(categoryLabels).map(([category, { label, description }]) => (
          <label key={category} style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={displaySettings[category]}
              onChange={() => handleToggle(category)}
              style={styles.checkbox}
            />
            <div style={styles.labelContent}>
              <span style={styles.categoryLabel}>{label}</span>
              <span style={styles.categoryDescription}>{description}</span>
            </div>
          </label>
        ))}
      </div>

      <div style={styles.note}>
        Note: Traditional planets (Sun-Pluto + Nodes) are always visible
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid #444',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #444',
  },
  title: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '4px',
  },
  subtitle: {
    color: '#999',
    fontSize: '12px',
  },
  settingsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#333',
    },
  },
  checkbox: {
    marginTop: '2px',
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    flexShrink: 0,
  },
  labelContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  categoryLabel: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: '500',
  },
  categoryDescription: {
    color: '#999',
    fontSize: '11px',
    lineHeight: '1.4',
  },
  note: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #444',
    color: '#777',
    fontSize: '11px',
    fontStyle: 'italic',
  },
};

export default PlanetDisplaySettings;
