import React, { useState } from 'react';
import AspectMatrix from './AspectMatrix';
import TransitAspectMatrix from './TransitAspectMatrix';
import TransitTransitAspectMatrix from './TransitTransitAspectMatrix';
import './AspectTabs.css';

function AspectTabs({
  chartData,
  activeAspects,
  onAspectToggle,
  activeTransitAspects,
  onTransitAspectToggle,
  showNatalAspects, // from chart wheel visibility
  showProgressions = false
}) {
  const [activeTab, setActiveTab] = useState('natal');

  const hasTransits = chartData && chartData.transits && chartData.transitAspects;
  const hasTransitTransitAspects = chartData && chartData.transitTransitAspects;

  return (
    <div className="aspect-tabs-container">
      <div className="aspect-tabs-header">
        <button
          className={`aspect-tab ${activeTab === 'natal' ? 'active' : ''}`}
          onClick={() => setActiveTab('natal')}
        >
          Natal-Natal Aspects
        </button>

        {hasTransits && (
          <button
            className={`aspect-tab ${activeTab === 'transit-natal' ? 'active' : ''}`}
            onClick={() => setActiveTab('transit-natal')}
          >
            {showProgressions ? 'Progressed' : 'Transit'}-Natal Aspects
          </button>
        )}

        {hasTransitTransitAspects && (
          <button
            className={`aspect-tab ${activeTab === 'transit-transit' ? 'active' : ''}`}
            onClick={() => setActiveTab('transit-transit')}
            title={`View ${showProgressions ? 'progressed-progressed' : 'transit-transit'} aspects on tri-wheel`}
          >
            {showProgressions ? 'Progressed' : 'Transit'}-{showProgressions ? 'Progressed' : 'Transit'} Aspects (Tri-Wheel)
          </button>
        )}
      </div>

      <div className="aspect-tabs-content">
        {activeTab === 'natal' && (
          <AspectMatrix
            chartData={chartData}
            activeAspects={activeAspects}
            onAspectToggle={onAspectToggle}
          />
        )}

        {activeTab === 'transit-natal' && hasTransits && (
          <TransitAspectMatrix
            chartData={chartData}
            activeTransitAspects={activeTransitAspects}
            onTransitAspectToggle={onTransitAspectToggle}
          />
        )}

        {activeTab === 'transit-transit' && hasTransitTransitAspects && (
          <TransitTransitAspectMatrix chartData={chartData} />
        )}
      </div>
    </div>
  );
}

export default AspectTabs;
