import React, { useState } from 'react';
import AspectMatrix from './AspectMatrix';
import TransitAspectMatrix from './TransitAspectMatrix';
import TransitTransitAspectMatrix from './TransitTransitAspectMatrix';
import TransitProgressionAspectMatrix from './TransitProgressionAspectMatrix';
import ProgressionNatalAspectMatrix from './ProgressionNatalAspectMatrix';
import './AspectTabs.css';

function AspectTabs({
  chartData,
  activeAspects,
  onAspectToggle,
  activeTransitAspects,
  onTransitAspectToggle,
  activeProgressionNatalAspects,
  onProgressionNatalAspectToggle,
  activeTransitProgressionAspects,
  onTransitProgressionAspectToggle,
  showNatalAspects, // from chart wheel visibility
  showProgressions = false
}) {
  const [activeTab, setActiveTab] = useState('natal');

  const hasTransits = chartData && chartData.transits && chartData.transitAspects;
  const hasProgressionNatalAspects = chartData && chartData.progressionNatalAspects;
  const hasTransitTransitAspects = chartData && chartData.transitTransitAspects;
  const hasTransitProgressionAspects = chartData && chartData.transitProgressionAspects;

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
            {chartData.transits ? 'Transit' : 'Progressed'}-Natal Aspects
          </button>
        )}

        {hasProgressionNatalAspects && (
          <button
            className={`aspect-tab ${activeTab === 'progression-natal' ? 'active' : ''}`}
            onClick={() => setActiveTab('progression-natal')}
            title="View progression-natal aspects on tri-wheel"
          >
            Progression-Natal Aspects
          </button>
        )}

        {hasTransitTransitAspects && (
          <button
            className={`aspect-tab ${activeTab === 'transit-transit' ? 'active' : ''}`}
            onClick={() => setActiveTab('transit-transit')}
            title={`View ${chartData.transits ? 'transit-transit' : 'progressed-progressed'} aspects`}
          >
            {chartData.transits ? 'Transit' : 'Progressed'}-{chartData.transits ? 'Transit' : 'Progressed'} Aspects
          </button>
        )}

        {hasTransitProgressionAspects && (
          <button
            className={`aspect-tab ${activeTab === 'transit-progression' ? 'active' : ''}`}
            onClick={() => setActiveTab('transit-progression')}
            title="View transit-progression aspects on tri-wheel"
          >
            Transit-Progression Aspects (Tri-Wheel)
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

        {activeTab === 'progression-natal' && hasProgressionNatalAspects && (
          <ProgressionNatalAspectMatrix
            chartData={chartData}
            activeProgressionNatalAspects={activeProgressionNatalAspects}
            onProgressionNatalAspectToggle={onProgressionNatalAspectToggle}
          />
        )}

        {activeTab === 'transit-transit' && hasTransitTransitAspects && (
          <TransitTransitAspectMatrix chartData={chartData} />
        )}

        {activeTab === 'transit-progression' && hasTransitProgressionAspects && (
          <TransitProgressionAspectMatrix
            chartData={chartData}
            activeTransitProgressionAspects={activeTransitProgressionAspects}
            onTransitProgressionAspectToggle={onTransitProgressionAspectToggle}
          />
        )}
      </div>
    </div>
  );
}

export default AspectTabs;
