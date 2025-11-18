import React from 'react';

/**
 * Fixed Star Settings Component
 *
 * Allows users to configure fixed star display options:
 * - Tier selection (Tier 1, Tier 2, or All stars)
 * - Custom orb settings
 * - Enable/disable fixed stars display
 */
function FixedStarSettings({ fixedStarSettings, setFixedStarSettings }) {
  const handleTierChange = (e) => {
    setFixedStarSettings({
      ...fixedStarSettings,
      tier: e.target.value
    });
  };

  const handleOrbChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0.5 && value <= 5) {
      setFixedStarSettings({
        ...fixedStarSettings,
        maxOrb: value
      });
    }
  };

  const handleEnabledChange = (e) => {
    setFixedStarSettings({
      ...fixedStarSettings,
      enabled: e.target.checked
    });
  };

  const handleUseDefaultOrbChange = (e) => {
    setFixedStarSettings({
      ...fixedStarSettings,
      useDefaultOrb: e.target.checked,
      maxOrb: e.target.checked ? null : 2.0
    });
  };

  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>Fixed Stars</h4>

      {/* Enable/Disable Toggle */}
      <div style={styles.settingRow}>
        <label style={styles.label}>
          <input
            type="checkbox"
            checked={fixedStarSettings.enabled}
            onChange={handleEnabledChange}
            style={styles.checkbox}
          />
          <span style={styles.labelText}>Show Fixed Star Conjunctions</span>
        </label>
      </div>

      {fixedStarSettings.enabled && (
        <>
          {/* Tier Selection */}
          <div style={styles.settingRow}>
            <label style={styles.label}>
              <span style={styles.labelText}>Star Tier:</span>
              <select
                value={fixedStarSettings.tier}
                onChange={handleTierChange}
                style={styles.select}
              >
                <option value="tier1">Tier 1 (15 essential stars)</option>
                <option value="tier2">Tier 2 (30 stars)</option>
                <option value="all">All Stars (30 stars)</option>
              </select>
            </label>
            <div style={styles.hint}>
              Tier 1: Four Royal Stars + major stars
            </div>
          </div>

          {/* Orb Settings */}
          <div style={styles.settingRow}>
            <label style={styles.label}>
              <input
                type="checkbox"
                checked={fixedStarSettings.useDefaultOrb}
                onChange={handleUseDefaultOrbChange}
                style={styles.checkbox}
              />
              <span style={styles.labelText}>Use Default Orbs</span>
            </label>
            <div style={styles.hint}>
              Default: 2.3° for bright stars, 1.5° for dimmer stars
            </div>
          </div>

          {!fixedStarSettings.useDefaultOrb && (
            <div style={styles.settingRow}>
              <label style={styles.label}>
                <span style={styles.labelText}>Custom Orb:</span>
                <input
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={fixedStarSettings.maxOrb || 2.0}
                  onChange={handleOrbChange}
                  style={styles.numberInput}
                />
                <span style={styles.unit}>degrees</span>
              </label>
              <div style={styles.hint}>
                Range: 0.5° to 5.0°
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  section: {
    borderBottom: '1px solid #e0e0e0',
    paddingBottom: '20px',
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  settingRow: {
    marginBottom: '15px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  labelText: {
    color: '#495057',
    fontWeight: '500',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#daa520',
  },
  select: {
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #ced4da',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
    minWidth: '200px',
  },
  numberInput: {
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #ced4da',
    fontSize: '14px',
    width: '80px',
  },
  unit: {
    fontSize: '13px',
    color: '#6c757d',
  },
  hint: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '4px',
    marginLeft: '28px',
    fontStyle: 'italic',
  },
};

export default FixedStarSettings;
