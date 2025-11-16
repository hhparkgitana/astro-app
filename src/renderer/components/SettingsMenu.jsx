import React, { useState, useRef, useEffect } from 'react';
import PlanetDisplaySettings from './PlanetDisplaySettings';
import ApiKeySettings from './ApiKeySettings';

/**
 * Settings Menu Component
 *
 * Dropdown menu accessed via gear icon in header
 * Contains user preferences and display settings
 */
function SettingsMenu({ displaySettings, setDisplaySettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div style={styles.container} ref={menuRef}>
      {/* Gear Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.gearButton}
        title="Settings"
      >
        <span style={styles.gearIcon}>⚙</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <h3 style={styles.dropdownTitle}>Settings</h3>
            <button
              onClick={() => setIsOpen(false)}
              style={styles.closeButton}
              title="Close"
            >
              ×
            </button>
          </div>

          <div style={styles.dropdownContent}>
            {/* API Key Settings Section */}
            <ApiKeySettings />

            {/* Planet Display Settings Section */}
            <PlanetDisplaySettings
              displaySettings={displaySettings}
              setDisplaySettings={setDisplaySettings}
            />

            {/* Future sections can be added here */}
            {/* e.g., Orb Settings, Theme Settings, etc. */}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    display: 'inline-block',
  },
  gearButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'all 0.3s ease',
    ':hover': {
      background: 'rgba(218, 165, 32, 0.1)',
    },
  },
  gearIcon: {
    fontSize: '28px',
    color: '#daa520',
    display: 'inline-block',
    transition: 'transform 0.3s ease',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    minWidth: '320px',
    maxWidth: '400px',
    backgroundColor: '#1a1a2e',
    border: '2px solid rgba(218, 165, 32, 0.3)',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
    overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid rgba(218, 165, 32, 0.2)',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  },
  dropdownTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#daa520',
    letterSpacing: '1px',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#daa520',
    fontSize: '32px',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    lineHeight: '1',
    ':hover': {
      background: 'rgba(218, 165, 32, 0.1)',
    },
  },
  dropdownContent: {
    padding: '16px',
    maxHeight: '70vh',
    overflowY: 'auto',
  },
};

export default SettingsMenu;
