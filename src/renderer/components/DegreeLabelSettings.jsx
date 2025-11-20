import React from 'react';

/**
 * Degree Label Settings Component
 *
 * Toggle to show/hide degree/minute labels next to planet glyphs
 */
function DegreeLabelSettings({ displaySettings, setDisplaySettings }) {
  const handleToggle = () => {
    setDisplaySettings(prev => ({
      ...prev,
      showDegreeLabels: !prev.showDegreeLabels
    }));
  };

  return (
    <div style={styles.container}>
      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={displaySettings.showDegreeLabels}
          onChange={handleToggle}
          style={styles.checkbox}
        />
        <div style={styles.labelContent}>
          <span style={styles.categoryLabel}>Show Degree Labels</span>
          <span style={styles.categoryDescription}>
            Display degree/minute position next to planet glyphs (e.g., "15°32'")
          </span>
        </div>
      </label>
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
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    cursor: 'pointer',
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
};

export default DegreeLabelSettings;
