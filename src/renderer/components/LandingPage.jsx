import React from 'react';
import './LandingPage.css';
import astridLogo from '../assets/images/astrid-logo.png';

/**
 * ASTRID Landing Page
 * Welcome screen displayed on app startup
 */
function LandingPage({ onEnter }) {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <img
          src={astridLogo}
          alt="ASTRID"
          className="landing-logo"
        />
        <h1 className="landing-title">ASTRID</h1>
        <p className="landing-subtitle">Professional Astrology Tools</p>
        <p className="landing-description">
          Calculate natal charts, explore transits, analyze relationships,
          and unlock the wisdom of the stars
        </p>
        <button
          className="landing-button"
          onClick={onEnter}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

export default LandingPage;
