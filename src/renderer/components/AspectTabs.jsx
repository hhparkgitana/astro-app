import React, { useState } from 'react';
import AspectMatrix from './AspectMatrix';
import TransitAspectMatrix from './TransitAspectMatrix';
import TransitTransitAspectMatrix from './TransitTransitAspectMatrix';
import TransitProgressionAspectMatrix from './TransitProgressionAspectMatrix';
import ProgressionNatalAspectMatrix from './ProgressionNatalAspectMatrix';
import SynastryAspectMatrix from './SynastryAspectMatrix';
import './AspectTabs.css';

function AspectTabs({
  viewMode,
  isComposite = false,
  chartData,
  chartDataB,
  activeAspects,
  onAspectToggle,
  activeAspectsB,
  onAspectToggleB,
  activeTransitAspects,
  onTransitAspectToggle,
  activeProgressionNatalAspects,
  onProgressionNatalAspectToggle,
  activeTransitProgressionAspects,
  onTransitProgressionAspectToggle,
  activeSynastryAspects,
  onSynastryAspectToggle,
  showNatalAspects, // from chart wheel visibility
  showProgressions = false,
  directionType = 'progressions',
  formData,
  formDataB,
  displaySettings // Planet display settings
}) {
  const [activeTab, setActiveTab] = useState('natal');

  const hasTransits = chartData && chartData.transits && chartData.transitAspects;
  const hasProgressionNatalAspects = chartData && chartData.progressionNatalAspects;
  const hasProgressionInternalAspects = chartData && chartData.progressionInternalAspects;
  const hasTransitTransitAspects = chartData && chartData.transitTransitAspects;
  const hasTransitProgressionAspects = chartData && chartData.transitProgressionAspects;
  const hasSynastryAspects = chartData && chartData.synastryAspects;

  const isRelationshipMode = viewMode === 'relationship';
  const personAName = formData?.name || 'Person A';
  const personBName = formDataB?.name || 'Person B';

  return (
    <div className="aspect-tabs-container">
      <div className="aspect-tabs-header">
        <button
          className={`aspect-tab ${activeTab === 'natal' ? 'active' : ''}`}
          onClick={() => setActiveTab('natal')}
        >
          {isComposite ? 'Composite Aspects' : (isRelationshipMode ? `${personAName} Natal Aspects` : 'Natal-Natal Aspects')}
        </button>

        {isRelationshipMode && chartDataB && (
          <button
            className={`aspect-tab ${activeTab === 'natal-b' ? 'active' : ''}`}
            onClick={() => setActiveTab('natal-b')}
          >
            {personBName} Natal Aspects
          </button>
        )}

        {hasTransits && (
          <button
            className={`aspect-tab ${activeTab === 'transit-natal' ? 'active' : ''}`}
            onClick={() => setActiveTab('transit-natal')}
          >
            {isComposite
              ? `${chartData.transits ? 'Transit' : 'Progressed'}-Composite Aspects`
              : `${chartData.transits ? 'Transit' : 'Progressed'}-Natal Aspects`}
          </button>
        )}

        {hasProgressionNatalAspects && (
          <button
            className={`aspect-tab ${activeTab === 'progression-natal' ? 'active' : ''}`}
            onClick={() => setActiveTab('progression-natal')}
            title={`View ${directionType === 'solarArcs' ? 'solar arc-natal' : 'progression-natal'} aspects on tri-wheel`}
          >
            {directionType === 'solarArcs' ? 'Solar Arc-Natal Aspects' : 'Progression-Natal Aspects'}
          </button>
        )}

        {hasProgressionInternalAspects && (
          <button
            className={`aspect-tab ${activeTab === 'progression-internal' ? 'active' : ''}`}
            onClick={() => setActiveTab('progression-internal')}
            title={`View ${directionType === 'solarArcs' ? 'solar arc-solar arc' : 'progression-progression'} internal aspects`}
          >
            {directionType === 'solarArcs' ? 'Solar Arc-Solar Arc Aspects' : 'Progression-Progression Aspects'}
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
            title={`View transit-${directionType === 'solarArcs' ? 'solar arc' : 'progression'} aspects on tri-wheel`}
          >
            Transit-{directionType === 'solarArcs' ? 'Solar Arc' : 'Progression'} Aspects (Tri-Wheel)
          </button>
        )}

        {hasSynastryAspects && (
          <button
            className={`aspect-tab ${activeTab === 'synastry' ? 'active' : ''}`}
            onClick={() => setActiveTab('synastry')}
            title="View synastry aspects between Chart A and Chart B"
          >
            Synastry Aspects
          </button>
        )}
      </div>

      <div className="aspect-tabs-content">
        {activeTab === 'natal' && (
          <AspectMatrix
            chartData={chartData}
            activeAspects={activeAspects}
            onAspectToggle={onAspectToggle}
            displaySettings={displaySettings}
          />
        )}

        {activeTab === 'natal-b' && chartDataB && (
          <AspectMatrix
            chartData={chartDataB}
            activeAspects={activeAspectsB}
            onAspectToggle={onAspectToggleB}
          />
        )}

        {activeTab === 'transit-natal' && hasTransits && (
          <TransitAspectMatrix
            chartData={chartData}
            activeTransitAspects={activeTransitAspects}
            onTransitAspectToggle={onTransitAspectToggle}
            displaySettings={displaySettings}
          />
        )}

        {activeTab === 'progression-natal' && hasProgressionNatalAspects && (
          <ProgressionNatalAspectMatrix
            chartData={chartData}
            activeProgressionNatalAspects={activeProgressionNatalAspects}
            onProgressionNatalAspectToggle={onProgressionNatalAspectToggle}
            displaySettings={displaySettings}
          />
        )}

        {activeTab === 'progression-internal' && hasProgressionInternalAspects && (
          <div>
            <h4 style={{ marginTop: 0 }}>
              {directionType === 'solarArcs' ? '🟠 Solar Arc-Solar Arc Aspects' : '🟣 Progression-Progression Aspects'}
            </h4>
            <AspectMatrix
              chartData={{ ...chartData.progressions, aspects: chartData.progressionInternalAspects }}
              activeAspects={new Set(chartData.progressionInternalAspects.map(a => `${a.planet1}-${a.planet2}`))}
              onAspectToggle={() => {}}
            />
          </div>
        )}

        {activeTab === 'transit-transit' && hasTransitTransitAspects && (
          <TransitTransitAspectMatrix
            chartData={chartData}
            displaySettings={displaySettings}
          />
        )}

        {activeTab === 'transit-progression' && hasTransitProgressionAspects && (
          <TransitProgressionAspectMatrix
            chartData={chartData}
            activeTransitProgressionAspects={activeTransitProgressionAspects}
            onTransitProgressionAspectToggle={onTransitProgressionAspectToggle}
            displaySettings={displaySettings}
          />
        )}

        {activeTab === 'synastry' && hasSynastryAspects && (
          <SynastryAspectMatrix
            chartData={chartData}
            activeSynastryAspects={activeSynastryAspects}
            onSynastryAspectToggle={onSynastryAspectToggle}
            displaySettings={displaySettings}
          />
        )}
      </div>
    </div>
  );
}

export default AspectTabs;
