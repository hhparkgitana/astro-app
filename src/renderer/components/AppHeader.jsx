import React from 'react';
import './AppHeader.css';
import astridLogo from '../assets/images/astrid-logo.png';

/**
 * ASTRID Application Header
 * Displays the branded logo, application title, and navigation
 */
function AppHeader({ children }) {
  return (
    <header className="app-header">
      <div className="header-content">
        <img
          src={astridLogo}
          alt="ASTRID"
          className="app-logo"
        />
      </div>
      {children && (
        <div className="header-navigation">
          {children}
        </div>
      )}
    </header>
  );
}

export default AppHeader;
