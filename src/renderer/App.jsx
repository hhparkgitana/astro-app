import React, { useState, useEffect } from 'react';
import './App.css';
import './components/AspectTabs.css';
import LandingPage from './components/LandingPage';
import AppHeader from './components/AppHeader';
import SettingsMenu from './components/SettingsMenu';
import ChartWheel from './components/ChartWheel';
import AspectTabs from './components/AspectTabs';
import AspectMatrix from './components/AspectMatrix';
import ReturnAspectMatrix from './components/ReturnAspectMatrix';
import FamousChartsBrowser from './components/FamousChartsBrowser';
import ChatPanel from './components/ChatPanel';
import SaveChartModal from './components/SaveChartModal';
import ChartLibrary from './components/ChartLibrary';
import EclipseDashboard from './components/EclipseDashboard';
import ConfigurationSearch from './components/ConfigurationSearch';
import TimeSlider from './components/TimeSlider';
import HoraryAnalysis from './components/HoraryAnalysis';
import { DateTime } from 'luxon';
import { findAspect, getAngularDistance, calculateAspects } from '../shared/calculations/aspectsCalculator';
import { calculateCompositeChart, calculateGeographicMidpoint } from '../shared/calculations/compositeCalculator';
import { calculateSolarReturn, calculateLunarReturn } from '../shared/calculations/returnsCalculator';
import { calculateSolarArcs, getSolarArcDefaultOrb } from '../shared/calculations/solarArcsCalculator';
import { analyzeHoraryChart } from '../shared/calculations/horaryCalculator';
import { saveChart } from '../utils/db';

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationResults, setLocationResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [activeAspects, setActiveAspects] = useState(new Set());
  const [activeTransitAspects, setActiveTransitAspects] = useState(new Set());
  const [activeProgressionNatalAspects, setActiveProgressionNatalAspects] = useState(new Set());
  const [activeTransitProgressionAspects, setActiveTransitProgressionAspects] = useState(new Set());
  const [activeSynastryAspects, setActiveSynastryAspects] = useState(new Set());
  const [activeReturnAspects, setActiveReturnAspects] = useState(new Set());
  const [activeReturnInternalAspects, setActiveReturnInternalAspects] = useState(new Set());
  const [showNatalAspects, setShowNatalAspects] = useState(true);

  // Orb settings for each aspect type
  const [natalOrb, setNatalOrb] = useState(8);
  const [transitOrb, setTransitOrb] = useState(8);
  const [progressionNatalOrb, setProgressionNatalOrb] = useState(8);
  const [transitTransitOrb, setTransitTransitOrb] = useState(8);
  const [transitProgressionOrb, setTransitProgressionOrb] = useState(8);
  const [synastryOrb, setSynastryOrb] = useState(8);
  const [returnNatalOrb, setReturnNatalOrb] = useState(8);
  const [returnInternalOrb, setReturnInternalOrb] = useState(8);
  const [solarArcNatalOrb, setSolarArcNatalOrb] = useState(1.5); // Tighter orb for Solar Arcs
  const [solarArcInternalOrb, setSolarArcInternalOrb] = useState(8);

  // Famous charts browser
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [activeChart, setActiveChart] = useState('A'); // Which chart the browser is loading into

  // View mode: 'single', 'dual', 'relationship', or 'returns'
  const [viewMode, setViewMode] = useState('single');

  // Chat panel state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Chart library and save modal state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Planet display settings (which bodies to show)
  const [displaySettings, setDisplaySettings] = useState({
    traditional: true,    // Main planets + nodes always visible by default
    centaurs: false,      // Optional: Chiron, Pholus
    asteroids: false,     // Optional: Ceres, Pallas, Juno, Vesta
    calculatedPoints: false  // Optional: Lilith (Mean/True)
  });

  // Horary chart state
  const [horaryQuestion, setHoraryQuestion] = useState('');
  const [horaryAnalysis, setHoraryAnalysis] = useState(null);

  // Relationship chart state
  const [relationshipChartType, setRelationshipChartType] = useState('synastry'); // 'synastry' or 'composite'
  const [relationshipLocation, setRelationshipLocation] = useState('midpoint'); // 'midpoint' or 'personA'
  const [relationshipHouseMethod, setRelationshipHouseMethod] = useState('personA'); // 'personA' or 'midpoint'
  const [compositeChartData, setCompositeChartData] = useState(null);
  const [loadingComposite, setLoadingComposite] = useState(false);
  const [showCompositeTransits, setShowCompositeTransits] = useState(false);
  const [compositeTransitDate, setCompositeTransitDate] = useState({
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    day: new Date().getDate().toString(),
    hour: new Date().getHours().toString(),
    minute: new Date().getMinutes().toString()
  });

  // Returns mode state
  const [returnType, setReturnType] = useState('solar'); // 'solar' or 'lunar'
  const [returnChartData, setReturnChartData] = useState(null);
  const [loadingReturn, setLoadingReturn] = useState(false);
  const [returnsFormData, setReturnsFormData] = useState({
    name: '',
    year: '1990',
    month: '1',
    day: '1',
    hour: '12',
    minute: '0',
    latitude: '40.7128',
    longitude: '-74.0060',
    location: 'New York, NY',
    timezone: 'America/New_York',
    houseSystem: 'placidus',
    // Return calculation parameters
    returnYear: new Date().getFullYear().toString(), // For Solar Returns
    returnMonth: new Date().getMonth() + 1,          // For Lunar Returns
    returnDay: new Date().getDate(),                  // For Lunar Returns
    returnLatitude: '40.7128',                        // Return location
    returnLongitude: '-74.0060',
    returnLocation: 'New York, NY',
    returnTimezone: 'America/New_York',
  });
  const [returnsBirthLocationResults, setReturnsBirthLocationResults] = useState([]);
  const [returnsReturnLocationResults, setReturnsReturnLocationResults] = useState([]);
  const [searchingReturnsBirthLocation, setSearchingReturnsBirthLocation] = useState(false);
  const [searchingReturnsReturnLocation, setSearchingReturnsReturnLocation] = useState(false);
  const [activeReturnsAspectTab, setActiveReturnsAspectTab] = useState('natal');

  // Chart B states (for dual view)
  const [chartDataB, setChartDataB] = useState(null);
  const [loadingB, setLoadingB] = useState(false);
  const [activeAspectsB, setActiveAspectsB] = useState(new Set());
  const [activeTransitAspectsB, setActiveTransitAspectsB] = useState(new Set());
  const [activeProgressionNatalAspectsB, setActiveProgressionNatalAspectsB] = useState(new Set());
  const [activeTransitProgressionAspectsB, setActiveTransitProgressionAspectsB] = useState(new Set());
  const [showNatalAspectsB, setShowNatalAspectsB] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    year: '1990',
    month: '1',
    day: '1',
    hour: '12',
    minute: '0',
    latitude: '40.7128',
    longitude: '-74.0060',
    location: 'New York, NY',
    timezone: 'America/New_York',
    houseSystem: 'placidus',
    // Transit date/time (defaults to current date)
    showTransits: false,
    showProgressions: false,
    directionType: 'progressions', // 'progressions' or 'solarArcs'
    transitYear: new Date().getFullYear().toString(),
    transitMonth: (new Date().getMonth() + 1).toString(),
    transitDay: new Date().getDate().toString(),
    transitHour: new Date().getHours().toString(),
    transitMinute: new Date().getMinutes().toString(),
    // Progression date/time (defaults to current date)
    progressionYear: new Date().getFullYear().toString(),
    progressionMonth: (new Date().getMonth() + 1).toString(),
    progressionDay: new Date().getDate().toString(),
    progressionHour: new Date().getHours().toString(),
    progressionMinute: new Date().getMinutes().toString(),
  });

  const [formDataB, setFormDataB] = useState({
    name: '',
    year: '1990',
    month: '1',
    day: '1',
    hour: '12',
    minute: '0',
    latitude: '40.7128',
    longitude: '-74.0060',
    location: 'New York, NY',
    timezone: 'America/New_York',
    houseSystem: 'placidus',
    showTransits: false,
    showProgressions: false,
    directionType: 'progressions', // 'progressions' or 'solarArcs'
    transitYear: new Date().getFullYear().toString(),
    transitMonth: (new Date().getMonth() + 1).toString(),
    transitDay: new Date().getDate().toString(),
    transitHour: new Date().getHours().toString(),
    transitMinute: new Date().getMinutes().toString(),
    // Progression date/time (defaults to current date)
    progressionYear: new Date().getFullYear().toString(),
    progressionMonth: (new Date().getMonth() + 1).toString(),
    progressionDay: new Date().getDate().toString(),
    progressionHour: new Date().getHours().toString(),
    progressionMinute: new Date().getMinutes().toString(),
  });

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleInputChangeB = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

    setFormDataB({
      ...formDataB,
      [e.target.name]: value,
    });
  };

  const handleReturnsInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

    setReturnsFormData({
      ...returnsFormData,
      [e.target.name]: value,
    });
  };

  // Note: getAngularDistance and findAspect are now imported from aspectsCalculator

  // Helper function to calculate age in years from two dates
  const calculateAgeFromDates = (birthDate, targetDate) => {
    const birth = DateTime.fromObject(birthDate);
    const target = DateTime.fromObject(targetDate);
    const diffInDays = target.diff(birth, 'days').days;
    const ageInYears = diffInDays / 365.25; // Account for leap years
    return ageInYears;
  };

  // Calculate aspects between natal and transit planets
  const calculateTransitAspects = (natalPlanets, transitPlanets, orb = 8) => {
    const aspects = [];
    const natalArray = Object.entries(natalPlanets).map(([key, planet]) => ({
      key,
      name: planet.name,
      longitude: planet.longitude,
      velocity: 0  // Natal planets are fixed points
    }));
    const transitArray = Object.entries(transitPlanets).map(([key, planet]) => ({
      key,
      name: planet.name,
      longitude: planet.longitude,
      velocity: planet.velocity !== undefined ? planet.velocity : 0
    }));

    console.log('=== CALCULATING TRANSIT ASPECTS ===');
    console.log('Natal planets:', natalArray);
    console.log('Transit planets:', transitArray);

    // Write debug log to file
    window.astro.writeDebugLog({
      section: 'TRANSIT ASPECTS CALCULATION',
      natalPlanets: natalArray,
      transitPlanets: transitArray,
      orb: orb
    }).then(result => {
      if (result.success) {
        console.log('Debug log written to:', result.path);
      }
    }).catch(err => console.error('Failed to write debug log:', err));

    // Calculate aspects between each natal planet and each transit planet
    for (const natalPlanet of natalArray) {
      for (const transitPlanet of transitArray) {
        const distance = getAngularDistance(natalPlanet.longitude, transitPlanet.longitude);

        // Log calculation for Saturn-Uranus specifically
        if ((transitPlanet.name === 'Saturn' && natalPlanet.name === 'Uranus') ||
            (transitPlanet.name === 'Uranus' && natalPlanet.name === 'Saturn')) {
          console.log(`\n🔍 ${transitPlanet.name}-${natalPlanet.name}:`);
          console.log(`  Transit ${transitPlanet.name} longitude: ${transitPlanet.longitude}°`);
          console.log(`  Natal ${natalPlanet.name} longitude: ${natalPlanet.longitude}°`);
          console.log(`  Angular distance: ${distance}°`);
        }

        const aspect = findAspect(
          distance,
          orb,
          transitPlanet.velocity,  // velocity1 for transit planet
          natalPlanet.velocity,    // velocity2 for natal planet
          transitPlanet.longitude, // long1 for transit planet
          natalPlanet.longitude    // long2 for natal planet
        );

        if (aspect) {
          // Log found aspect for Saturn-Uranus
          if ((transitPlanet.name === 'Saturn' && natalPlanet.name === 'Uranus') ||
              (transitPlanet.name === 'Uranus' && natalPlanet.name === 'Saturn')) {
            console.log(`  ✅ Found aspect:`, aspect);
          }

          aspects.push({
            planet1: natalPlanet.name,    // Natal planet first (Chart A in synastry)
            planet1Key: natalPlanet.key,
            planet2: transitPlanet.name,  // Transit planet second (Chart B in synastry)
            planet2Key: transitPlanet.key,
            ...aspect
          });
        }
      }
    }

    console.log('=== TRANSIT ASPECTS CALCULATED ===');
    console.log(`Total aspects found: ${aspects.length}`);
    return aspects;
  };

  // Calculate aspects between transit planets
  const calculateTransitToTransitAspects = (transitPlanets, orb = 8) => {
    const aspects = [];
    const planetArray = Object.entries(transitPlanets).map(([key, planet]) => ({
      key,
      name: planet.name,
      longitude: planet.longitude,
      velocity: planet.velocity || 0
    }));

    // Calculate aspects for each pair (upper triangular matrix)
    for (let i = 0; i < planetArray.length; i++) {
      for (let j = i + 1; j < planetArray.length; j++) {
        const planet1 = planetArray[i];
        const planet2 = planetArray[j];

        // Skip North Node - South Node aspect
        if ((planet1.name === 'North Node' && planet2.name === 'South Node') ||
            (planet1.name === 'South Node' && planet2.name === 'North Node')) {
          continue;
        }

        const distance = getAngularDistance(planet1.longitude, planet2.longitude);
        const aspect = findAspect(
          distance,
          orb,
          planet1.velocity,
          planet2.velocity,
          planet1.longitude,
          planet2.longitude
        );

        if (aspect) {
          aspects.push({
            planet1: planet1.name,
            planet1Key: planet1.key,
            planet2: planet2.name,
            planet2Key: planet2.key,
            ...aspect
          });
        }
      }
    }

    return aspects;
  };

  // Calculate composite chart (midpoints between two charts)
  const calculateCompositePlanets = (planetsA, planetsB) => {
    const compositePlanets = {};

    // Helper function to calculate midpoint between two longitudes
    const calculateMidpoint = (long1, long2) => {
      // Normalize both longitudes to 0-360
      const normalize = (deg) => ((deg % 360) + 360) % 360;
      const l1 = normalize(long1);
      const l2 = normalize(long2);

      // Calculate both possible distances
      const directDistance = Math.abs(l2 - l1);
      const wrapDistance = 360 - directDistance;

      // Determine which path is shorter
      let midpoint;
      if (directDistance <= wrapDistance) {
        // Direct path is shorter
        midpoint = (l1 + l2) / 2;
      } else {
        // Wrap path is shorter
        if (l1 < l2) {
          midpoint = (l1 + 360 + l2) / 2;
        } else {
          midpoint = (l1 + l2 + 360) / 2;
        }
      }

      return normalize(midpoint);
    };

    // Calculate midpoint for each planet
    Object.keys(planetsA).forEach(key => {
      if (planetsB[key]) {
        const planetA = planetsA[key];
        const planetB = planetsB[key];

        compositePlanets[key] = {
          ...planetA,
          longitude: calculateMidpoint(planetA.longitude, planetB.longitude)
        };
      }
    });

    return compositePlanets;
  };

  // Calculate aspects between transit and progression planets
  const calculateTransitProgressionAspects = (transitPlanets, progressionPlanets, orb = 8) => {
    const aspects = [];
    const transitArray = Object.entries(transitPlanets).map(([key, planet]) => ({
      key,
      name: planet.name,
      longitude: planet.longitude,
      velocity: planet.velocity || 0
    }));
    const progressionArray = Object.entries(progressionPlanets).map(([key, planet]) => ({
      key,
      name: planet.name,
      longitude: planet.longitude,
      velocity: planet.velocity || 0
    }));

    // Calculate aspects between each transit planet and each progression planet
    for (const transitPlanet of transitArray) {
      for (const progressionPlanet of progressionArray) {
        // Skip North Node - South Node aspect
        if ((transitPlanet.name === 'North Node' && progressionPlanet.name === 'South Node') ||
            (transitPlanet.name === 'South Node' && progressionPlanet.name === 'North Node')) {
          continue;
        }

        const distance = getAngularDistance(transitPlanet.longitude, progressionPlanet.longitude);
        const aspect = findAspect(
          distance,
          orb,
          transitPlanet.velocity,
          progressionPlanet.velocity,
          transitPlanet.longitude,
          progressionPlanet.longitude
        );

        if (aspect) {
          aspects.push({
            planet1: transitPlanet.name,
            planet1Key: transitPlanet.key,
            planet2: progressionPlanet.name,
            planet2Key: progressionPlanet.key,
            ...aspect
          });
        }
      }
    }

    return aspects;
  };

  // Handle orb changes and recalculate aspects
  const handleNatalOrbChange = (newOrb) => {
    setNatalOrb(newOrb);
    if (chartData && chartData.planets) {
      const newAspects = calculateAspects(chartData.planets, { default: newOrb });
      setChartData({ ...chartData, aspects: newAspects });
      // Update active aspects to include all new aspects
      const allAspectKeys = new Set(
        newAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
      );
      setActiveAspects(allAspectKeys);
    }
  };

  const handleTransitOrbChange = (newOrb) => {
    setTransitOrb(newOrb);
    if (chartData && chartData.planets && chartData.transits && chartData.transits.planets) {
      const newTransitAspects = calculateTransitAspects(chartData.planets, chartData.transits.planets, newOrb);
      setChartData({ ...chartData, transitAspects: newTransitAspects });
      // Update active transit aspects
      const allTransitAspectKeys = new Set(
        newTransitAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
      );
      setActiveTransitAspects(allTransitAspectKeys);
    }
  };

  const handleProgressionNatalOrbChange = (newOrb) => {
    setProgressionNatalOrb(newOrb);
    if (chartData && chartData.planets && chartData.progressions && chartData.progressions.planets) {
      const newProgressionAspects = calculateTransitAspects(chartData.planets, chartData.progressions.planets, newOrb);
      setChartData({ ...chartData, progressionNatalAspects: newProgressionAspects });
      // Update active progression-natal aspects
      const allProgressionAspectKeys = new Set(
        newProgressionAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
      );
      setActiveProgressionNatalAspects(allProgressionAspectKeys);
    }
  };

  const handleTransitTransitOrbChange = (newOrb) => {
    setTransitTransitOrb(newOrb);
    if (chartData && chartData.transits && chartData.transits.planets) {
      const newTransitTransitAspects = calculateTransitToTransitAspects(chartData.transits.planets, newOrb);
      setChartData({ ...chartData, transitTransitAspects: newTransitTransitAspects });
    }
  };

  const handleTransitProgressionOrbChange = (newOrb) => {
    setTransitProgressionOrb(newOrb);
    if (chartData && chartData.transits && chartData.transits.planets && chartData.progressions && chartData.progressions.planets) {
      const newTransitProgressionAspects = calculateTransitProgressionAspects(
        chartData.transits.planets,
        chartData.progressions.planets,
        newOrb
      );
      setChartData({ ...chartData, transitProgressionAspects: newTransitProgressionAspects });
      // Update active transit-progression aspects
      const allTransitProgressionAspectKeys = new Set(
        newTransitProgressionAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
      );
      setActiveTransitProgressionAspects(allTransitProgressionAspectKeys);
    }
  };

  // Solar Arc orb change handlers
  const handleSolarArcNatalOrbChange = (newOrb) => {
    setSolarArcNatalOrb(newOrb);
    if (chartData && chartData.planets && chartData.progressions && chartData.progressions.planets) {
      const newSolarArcAspects = calculateTransitAspects(chartData.planets, chartData.progressions.planets, newOrb);
      setChartData({ ...chartData, progressionNatalAspects: newSolarArcAspects });
      // Update active progression-natal aspects (reused for solar arcs)
      const allSolarArcAspectKeys = new Set(
        newSolarArcAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
      );
      setActiveProgressionNatalAspects(allSolarArcAspectKeys);
    }
  };

  const handleSolarArcInternalOrbChange = (newOrb) => {
    setSolarArcInternalOrb(newOrb);
    if (chartData && chartData.progressions && chartData.progressions.planets) {
      const newSolarArcInternalAspects = calculateAspects(chartData.progressions.planets, { default: newOrb });
      // Store in a new field for Solar Arc internal aspects
      setChartData({ ...chartData, progressionInternalAspects: newSolarArcInternalAspects });
    }
  };

  // Chart B orb change handlers
  const handleNatalOrbChangeB = (newOrb) => {
    setNatalOrb(newOrb);
    if (chartDataB && chartDataB.planets) {
      const newAspects = calculateAspects(chartDataB.planets, { default: newOrb });
      setChartDataB({ ...chartDataB, aspects: newAspects });
      const allAspectKeys = new Set(
        newAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
      );
      setActiveAspectsB(allAspectKeys);
    }
  };

  const handleTransitOrbChangeB = (newOrb) => {
    setTransitOrb(newOrb);
    if (chartDataB && chartDataB.planets && chartDataB.transits && chartDataB.transits.planets) {
      const newTransitAspects = calculateTransitAspects(chartDataB.planets, chartDataB.transits.planets, newOrb);
      setChartDataB({ ...chartDataB, transitAspects: newTransitAspects });
      const allTransitAspectKeys = new Set(
        newTransitAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
      );
      setActiveTransitAspectsB(allTransitAspectKeys);
    }
  };

  const handleTransitTransitOrbChangeB = (newOrb) => {
    setTransitTransitOrb(newOrb);
    if (chartDataB && chartDataB.transits && chartDataB.transits.planets) {
      const newTransitTransitAspects = calculateTransitToTransitAspects(chartDataB.transits.planets, newOrb);
      setChartDataB({ ...chartDataB, transitTransitAspects: newTransitTransitAspects });
    }
  };

  const handleTransitProgressionOrbChangeB = (newOrb) => {
    setTransitProgressionOrb(newOrb);
    if (chartDataB && chartDataB.transits && chartDataB.transits.planets && chartDataB.progressions && chartDataB.progressions.planets) {
      const newTransitProgressionAspects = calculateTransitProgressionAspects(
        chartDataB.transits.planets,
        chartDataB.progressions.planets,
        newOrb
      );
      setChartDataB({ ...chartDataB, transitProgressionAspects: newTransitProgressionAspects });
      // Update active transit-progression aspects for Chart B
      const allTransitProgressionAspectKeys = new Set(
        newTransitProgressionAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
      );
      setActiveTransitProgressionAspectsB(allTransitProgressionAspectKeys);
    }
  };

  const handleProgressionNatalOrbChangeB = (newOrb) => {
    setProgressionNatalOrb(newOrb);
    if (chartDataB && chartDataB.planets && chartDataB.progressions && chartDataB.progressions.planets) {
      const newProgressionAspects = calculateTransitAspects(chartDataB.planets, chartDataB.progressions.planets, newOrb);
      setChartDataB({ ...chartDataB, progressionNatalAspects: newProgressionAspects });
      const allProgressionAspectKeys = new Set(
        newProgressionAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
      );
      setActiveProgressionNatalAspectsB(allProgressionAspectKeys);
    }
  };

  const handleSynastryOrbChange = (newOrb) => {
    setSynastryOrb(newOrb);
    // Recalculate synastry aspects if both charts exist
    if (chartData && chartData.planets && chartDataB && chartDataB.planets) {
      const newSynastryAspects = calculateTransitAspects(chartData.planets, chartDataB.planets, newOrb);
      setChartData({ ...chartData, synastryAspects: newSynastryAspects });
      const allSynastryAspectKeys = new Set(
        newSynastryAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
      );
      setActiveSynastryAspects(allSynastryAspectKeys);
    }
  };

  // Returns orb change handlers
  const handleReturnNatalOrbChange = (newOrb) => {
    setReturnNatalOrb(newOrb);
    // Recalculate return-to-natal aspects if return chart exists
    if (returnChartData && returnChartData.planets && returnChartData.natalChart && returnChartData.natalChart.planets) {
      const newReturnToNatalAspects = calculateTransitAspects(returnChartData.natalChart.planets, returnChartData.planets, newOrb);
      setReturnChartData({ ...returnChartData, returnToNatalAspects: newReturnToNatalAspects });
    }
  };

  const handleReturnInternalOrbChange = (newOrb) => {
    setReturnInternalOrb(newOrb);
    // Recalculate return chart internal aspects
    if (returnChartData && returnChartData.planets) {
      const newReturnAspects = calculateAspects(returnChartData.planets, { default: newOrb });
      setReturnChartData({ ...returnChartData, aspects: newReturnAspects });
    }
  };

  // Calculate composite chart when both charts exist and composite mode is selected
  useEffect(() => {
    const calculateComposite = async () => {
      if (!chartData || !chartData.success || !chartDataB || !chartDataB.success) {
        setCompositeChartData(null);
        return;
      }

      if (relationshipChartType !== 'composite') {
        return;
      }

      setLoadingComposite(true);
      try {
        // Calculate composite planet positions (midpoints)
        const compositeData = calculateCompositeChart(chartData, chartDataB);

        // Determine location for house calculation
        let compositeLocation;
        if (relationshipLocation === 'midpoint') {
          const midpoint = calculateGeographicMidpoint(
            parseFloat(formData.latitude),
            parseFloat(formData.longitude),
            parseFloat(formDataB.latitude),
            parseFloat(formDataB.longitude)
          );
          compositeLocation = {
            latitude: midpoint.latitude,
            longitude: midpoint.longitude
          };
        } else {
          // Use Person A's location
          compositeLocation = {
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude)
          };
        }

        // Calculate midpoint date/time (for the composite chart concept)
        const dateA = new Date(
          parseInt(formData.year),
          parseInt(formData.month) - 1,
          parseInt(formData.day),
          parseInt(formData.hour),
          parseInt(formData.minute)
        );
        const dateB = new Date(
          parseInt(formDataB.year),
          parseInt(formDataB.month) - 1,
          parseInt(formDataB.day),
          parseInt(formDataB.hour),
          parseInt(formDataB.minute)
        );

        // Call backend to calculate houses for the composite chart
        const result = await window.astro.calculateChart({
          year: dateA.getFullYear(), // Use date A for now (composite time is conceptual)
          month: dateA.getMonth() + 1,
          day: dateA.getDate(),
          hour: dateA.getHours(),
          minute: dateA.getMinutes(),
          latitude: compositeLocation.latitude,
          longitude: compositeLocation.longitude,
          houseSystem: formData.houseSystem,
        });

        if (result.success) {
          // Combine composite planets with calculated houses
          const fullCompositeChart = {
            ...compositeData,
            ...result,
            ascendant: result.ascendant,
            midheaven: result.midheaven,
            houses: result.houses,
            planets: compositeData.planets, // Use our calculated composite planets
          };

          // Calculate aspects for the composite chart
          const compositeAspects = calculateAspects(compositeData.planets, { default: natalOrb });
          fullCompositeChart.aspects = compositeAspects;

          // Set all composite aspects as active by default
          const allAspectKeys = new Set(
            compositeAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
          );
          setActiveAspects(allAspectKeys);

          // Calculate transits to composite if enabled
          if (showCompositeTransits) {
            const transitResult = await window.astro.calculateChart({
              year: parseInt(compositeTransitDate.year),
              month: parseInt(compositeTransitDate.month),
              day: parseInt(compositeTransitDate.day),
              hour: parseInt(compositeTransitDate.hour),
              minute: parseInt(compositeTransitDate.minute),
              latitude: compositeLocation.latitude,
              longitude: compositeLocation.longitude,
              houseSystem: formData.houseSystem,
            });

            if (transitResult.success) {
              fullCompositeChart.transits = transitResult;

              // Calculate transit-to-composite aspects
              const transitAspects = calculateTransitAspects(
                fullCompositeChart.planets,
                transitResult.planets,
                transitOrb
              );
              fullCompositeChart.transitAspects = transitAspects;

              // Set all transit aspects as active by default
              const allTransitAspectKeys = new Set(
                transitAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
              );
              setActiveTransitAspects(allTransitAspectKeys);

              // Calculate transit-to-transit aspects
              const transitTransitAspects = calculateTransitToTransitAspects(
                transitResult.planets,
                transitTransitOrb
              );
              fullCompositeChart.transitTransitAspects = transitTransitAspects;
            }
          }

          setCompositeChartData(fullCompositeChart);
        }
      } catch (error) {
        console.error('Error calculating composite chart:', error);
        setCompositeChartData({ success: false, error: error.message });
      } finally {
        setLoadingComposite(false);
      }
    };

    calculateComposite();
  }, [chartData, chartDataB, relationshipChartType, relationshipLocation, formData, formDataB, natalOrb, showCompositeTransits, compositeTransitDate, transitOrb, transitTransitOrb]);

  const calculateChart = async (e, overrideData = null) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setLoading(true);
    try {
      // Use override data if provided, otherwise use formData
      const data = overrideData || formData;

      // Convert local time to UTC using timezone
      const localTime = DateTime.fromObject({
        year: parseInt(data.year),
        month: parseInt(data.month),
        day: parseInt(data.day),
        hour: parseInt(data.hour),
        minute: parseInt(data.minute),
      }, { zone: data.timezone });

      const utcTime = localTime.toUTC();

      console.log('Local time:', localTime.toString());
      console.log('UTC time:', utcTime.toString());
      console.log('Timezone:', data.timezone);
      console.log('DST offset:', localTime.offset / 60, 'hours');

      const result = await window.astro.calculateChart({
        // Send LOCAL time for house calculations
        year: parseInt(data.year),
        month: parseInt(data.month),
        day: parseInt(data.day),
        hour: parseInt(data.hour),
        minute: parseInt(data.minute),
        // Also send UTC time for planetary calculations
        utcYear: utcTime.year,
        utcMonth: utcTime.month,
        utcDay: utcTime.day,
        utcHour: utcTime.hour,
        utcMinute: utcTime.minute,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        houseSystem: data.houseSystem,
      });
      
      console.log('Chart result:', result); // Debug
      console.log('Aspects found:', result.aspects); // Verify aspects

      // Set all aspects as active by default
      if (result.success && result.aspects) {
        const allAspectKeys = new Set(
          result.aspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
        );
        setActiveAspects(allAspectKeys);
      }

      // Calculate transit and progression positions if enabled
      let transitData = null;
      let progressionsData = null;
      if (data.showTransits && result.success) {
        const transitLocalTime = DateTime.fromObject({
          year: parseInt(data.transitYear),
          month: parseInt(data.transitMonth),
          day: parseInt(data.transitDay),
          hour: parseInt(data.transitHour),
          minute: parseInt(data.transitMinute),
        }, { zone: data.timezone });

        const transitUtcTime = transitLocalTime.toUTC();

        console.log('Transit local time:', transitLocalTime.toString());
        console.log('Transit UTC time:', transitUtcTime.toString());

        const transitResult = await window.astro.calculateChart({
          year: parseInt(data.transitYear),
          month: parseInt(data.transitMonth),
          day: parseInt(data.transitDay),
          hour: parseInt(data.transitHour),
          minute: parseInt(data.transitMinute),
          utcYear: transitUtcTime.year,
          utcMonth: transitUtcTime.month,
          utcDay: transitUtcTime.day,
          utcHour: transitUtcTime.hour,
          utcMinute: transitUtcTime.minute,
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          houseSystem: data.houseSystem,
        });

        if (transitResult.success) {
          transitData = transitResult;
          console.log('Transit chart calculated:', transitResult);

          // Calculate natal-to-transit aspects
          const transitAspects = calculateTransitAspects(result.planets, transitData.planets, transitOrb);
          console.log('Transit-to-natal aspects:', transitAspects);
          result.transitAspects = transitAspects;

          // Set all transit aspects as active by default
          const allTransitAspectKeys = new Set(
            transitAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
          );
          console.log('=== SETTING activeTransitAspects ===');
          console.log('Number of transit aspects:', allTransitAspectKeys.size);
          console.log('First 5 keys:', Array.from(allTransitAspectKeys).slice(0, 5));
          console.log('Set object:', allTransitAspectKeys);
          setActiveTransitAspects(allTransitAspectKeys);
          console.log('setActiveTransitAspects called');

          // Calculate transit-to-transit aspects
          const transitTransitAspects = calculateTransitToTransitAspects(transitData.planets, transitTransitOrb);
          console.log('Transit-to-transit aspects:', transitTransitAspects);
          result.transitTransitAspects = transitTransitAspects;
        }
      }

      // Calculate progressions or solar arcs if enabled
      if (data.showProgressions && result.success) {
        if (data.directionType === 'solarArcs') {
          // Calculate Solar Arc Directions
          const natalDate = new Date(
            parseInt(data.year),
            parseInt(data.month) - 1,
            parseInt(data.day),
            parseInt(data.hour),
            parseInt(data.minute)
          );
          const targetDate = new Date(
            parseInt(data.progressionYear),
            parseInt(data.progressionMonth) - 1,
            parseInt(data.progressionDay)
          );

          if (targetDate <= natalDate) {
            alert('Solar Arc date must be after natal date');
            setLoading(false);
            return;
          }

          const solarArcData = calculateSolarArcs(result, natalDate, targetDate, 'standard');
          console.log('Solar Arcs calculated:', solarArcData);

          // Calculate solar arc-to-natal aspects (using tighter orb for Solar Arcs)
          const solarArcAspects = calculateTransitAspects(result.planets, solarArcData.planets, solarArcNatalOrb);
          console.log('Solar arc-to-natal aspects:', solarArcAspects);

          // Calculate solar arc internal aspects (Solar Arc-to-Solar Arc)
          const solarArcInternalAspects = calculateAspects(solarArcData.planets, { default: solarArcInternalOrb });
          console.log('Solar arc internal aspects:', solarArcInternalAspects);

          // Always store solar arc-natal aspects separately
          result.progressionNatalAspects = solarArcAspects;

          // Store solar arc internal aspects
          result.progressionInternalAspects = solarArcInternalAspects;

          // Only set as transitAspects if transits are not also enabled
          if (!data.showTransits) {
            result.transitAspects = solarArcAspects;

            // Set all solar arc aspects as active by default
            const allSolarArcAspectKeys = new Set(
              solarArcAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
            );
            setActiveTransitAspects(allSolarArcAspectKeys);
          }

          // Store solar arc data separately (with internal aspects included)
          solarArcData.aspects = solarArcInternalAspects;
          progressionsData = solarArcData;
        } else {
          // Calculate Secondary Progressions
          // Calculate age from natal date to progression date
          const age = calculateAgeFromDates(
            {
              year: parseInt(data.year),
              month: parseInt(data.month),
              day: parseInt(data.day),
              hour: parseInt(data.hour),
              minute: parseInt(data.minute)
            },
            {
              year: parseInt(data.progressionYear),
              month: parseInt(data.progressionMonth),
              day: parseInt(data.progressionDay),
              hour: parseInt(data.progressionHour),
              minute: parseInt(data.progressionMinute)
            }
          );

          if (age <= 0) {
            alert('Progression date must be after natal date');
            setLoading(false);
            return;
          }

          const progressionsResult = await window.astro.calculateProgressions({
            natalData: {
              year: parseInt(data.year),
              month: parseInt(data.month),
              day: parseInt(data.day),
              hour: parseInt(data.hour),
              minute: parseInt(data.minute),
              latitude: parseFloat(data.latitude),
              longitude: parseFloat(data.longitude),
              houseSystem: data.houseSystem
            },
            target: {
              age: age
            }
          });

          if (progressionsResult.success && progressionsResult.data) {
            const progressedData = progressionsResult.data;
            console.log('Progressions calculated:', progressedData);

            // Calculate progressed-to-natal aspects
            const progressedAspects = calculateTransitAspects(result.planets, progressedData.planets, transitOrb);
            console.log('Progressed-to-natal aspects:', progressedAspects);

            // Always store progression-natal aspects separately
            result.progressionNatalAspects = progressedAspects;

            // Only set as transitAspects if transits are not also enabled (for backwards compatibility)
            if (!data.showTransits) {
              result.transitAspects = progressedAspects;

              // Set all progressed aspects as active by default
              const allProgressedAspectKeys = new Set(
                progressedAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
              );
              setActiveTransitAspects(allProgressedAspectKeys);
            }

            // Store progressed data separately
            progressionsData = progressedData;
          }
        }
      }

      // Calculate transit-to-progression aspects if both exist
      if (transitData && progressionsData) {
        const transitProgressionAspects = calculateTransitProgressionAspects(
          transitData.planets,
          progressionsData.planets,
          transitProgressionOrb
        );
        console.log('Transit-to-progression aspects:', transitProgressionAspects);
        result.transitProgressionAspects = transitProgressionAspects;
        // Set all transit-progression aspects as active by default
        const allTransitProgressionAspectKeys = new Set(
          transitProgressionAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
        );
        setActiveTransitProgressionAspects(allTransitProgressionAspectKeys);
      }

      setChartData({ ...result, transits: transitData, progressions: progressionsData });

      // Analyze horary chart if it's a horary question
      const chartFormData = overrideData || formData;
      if (chartFormData.name && chartFormData.name.startsWith('Horary:') && result.success) {
        try {
          const analysis = analyzeHoraryChart(result);
          console.log('Horary analysis:', analysis);
          setHoraryAnalysis(analysis);
        } catch (error) {
          console.error('Error analyzing horary chart:', error);
          setHoraryAnalysis(null);
        }
      } else {
        // Clear horary analysis if not a horary chart
        setHoraryAnalysis(null);
      }
    } catch (error) {
      console.error('Error:', error);
      setChartData({ success: false, error: error.message });
    }
    setLoading(false);
  };

  const resetChart = () => {
    setChartData(null);
    setActiveAspects(new Set());
    setActiveTransitAspects(new Set());
  };

  const startNewChart = () => {
    setChartData(null);
    setActiveAspects(new Set());
    setActiveTransitAspects(new Set());
    setFormData({
      name: '',
      year: new Date().getFullYear().toString(),
      month: (new Date().getMonth() + 1).toString(),
      day: new Date().getDate().toString(),
      hour: '12',
      minute: '0',
      latitude: '40.7128',
      longitude: '-74.0060',
      location: 'New York, NY',
      timezone: 'America/New_York',
      houseSystem: 'placidus',
      showTransits: false,
      showProgressions: false,
      // Transit date/time (defaults to current date)
      transitYear: new Date().getFullYear().toString(),
      transitMonth: (new Date().getMonth() + 1).toString(),
      transitDay: new Date().getDate().toString(),
      transitHour: new Date().getHours().toString(),
      transitMinute: new Date().getMinutes().toString(),
      // Progression date/time (defaults to current date)
      progressionYear: new Date().getFullYear().toString(),
      progressionMonth: (new Date().getMonth() + 1).toString(),
      progressionDay: new Date().getDate().toString(),
      progressionHour: new Date().getHours().toString(),
      progressionMinute: new Date().getMinutes().toString(),
    });
  };

  const handleFamousChartSelect = async (chart) => {
    // Parse date (YYYY-MM-DD format)
    const [year, month, day] = chart.date.split('-');

    // Parse time (HH:MM format)
    const [hour, minute] = chart.time.split(':');

    // Determine which chart to load into
    if (activeChart === 'A') {
      // Clear any existing chart data for A
      setChartData(null);
      setActiveAspects(new Set());
      setActiveTransitAspects(new Set());

      // Populate form with famous chart data
      setFormData({
        name: chart.name,
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        latitude: chart.latitude.toString(),
        longitude: chart.longitude.toString(),
        location: chart.location,
        timezone: chart.timezone,
        houseSystem: formData.houseSystem,
        showTransits: false,
        showProgressions: false,
        transitYear: formData.transitYear,
        transitMonth: formData.transitMonth,
        transitDay: formData.transitDay,
        transitHour: formData.transitHour,
        transitMinute: formData.transitMinute,
        progressionYear: formData.progressionYear,
        progressionMonth: formData.progressionMonth,
        progressionDay: formData.progressionDay,
        progressionHour: formData.progressionHour,
        progressionMinute: formData.progressionMinute,
      });

      console.log('Loaded famous chart A:', chart.name);
    } else {
      // Load into Chart B
      setChartDataB(null);
      setActiveAspectsB(new Set());
      setActiveTransitAspectsB(new Set());

      setFormDataB({
        name: chart.name,
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        latitude: chart.latitude.toString(),
        longitude: chart.longitude.toString(),
        location: chart.location,
        timezone: chart.timezone,
        houseSystem: formDataB.houseSystem,
        showTransits: false,
        showProgressions: false,
        transitYear: formDataB.transitYear,
        transitMonth: formDataB.transitMonth,
        transitDay: formDataB.transitDay,
        transitHour: formDataB.transitHour,
        transitMinute: formDataB.transitMinute,
        progressionYear: formDataB.progressionYear,
        progressionMonth: formDataB.progressionMonth,
        progressionDay: formDataB.progressionDay,
        progressionHour: formDataB.progressionHour,
        progressionMinute: formDataB.progressionMinute,
      });

      console.log('Loaded famous chart B:', chart.name);
    }
  };

  // Calculate Chart A (for dual view)
  const calculateChartA = async () => {
    setLoading(true);
    try {
      const localTime = DateTime.fromObject({
        year: parseInt(formData.year),
        month: parseInt(formData.month),
        day: parseInt(formData.day),
        hour: parseInt(formData.hour),
        minute: parseInt(formData.minute),
      }, { zone: formData.timezone });

      const utcTime = localTime.toUTC();

      const result = await window.astro.calculateChart({
        year: parseInt(formData.year),
        month: parseInt(formData.month),
        day: parseInt(formData.day),
        hour: parseInt(formData.hour),
        minute: parseInt(formData.minute),
        utcYear: utcTime.year,
        utcMonth: utcTime.month,
        utcDay: utcTime.day,
        utcHour: utcTime.hour,
        utcMinute: utcTime.minute,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        houseSystem: formData.houseSystem,
      });

      if (result.success && result.aspects) {
        const allAspectKeys = new Set(
          result.aspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
        );
        setActiveAspects(allAspectKeys);
      }

      // Calculate transit and progression positions if enabled
      let transitData = null;
      let progressionsData = null;
      if (formData.showTransits && result.success) {
        const transitLocalTime = DateTime.fromObject({
          year: parseInt(formData.transitYear),
          month: parseInt(formData.transitMonth),
          day: parseInt(formData.transitDay),
          hour: parseInt(formData.transitHour),
          minute: parseInt(formData.transitMinute),
        }, { zone: formData.timezone });

        const transitUtcTime = transitLocalTime.toUTC();

        const transitResult = await window.astro.calculateChart({
          year: parseInt(formData.transitYear),
          month: parseInt(formData.transitMonth),
          day: parseInt(formData.transitDay),
          hour: parseInt(formData.transitHour),
          minute: parseInt(formData.transitMinute),
          utcYear: transitUtcTime.year,
          utcMonth: transitUtcTime.month,
          utcDay: transitUtcTime.day,
          utcHour: transitUtcTime.hour,
          utcMinute: transitUtcTime.minute,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          houseSystem: formData.houseSystem,
        });

        if (transitResult.success) {
          transitData = transitResult;

          // Calculate natal-to-transit aspects
          const transitAspects = calculateTransitAspects(result.planets, transitData.planets, transitOrb);
          result.transitAspects = transitAspects;

          // Set all transit aspects as active by default
          const allTransitAspectKeys = new Set(
            transitAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
          );
          setActiveTransitAspects(allTransitAspectKeys);

          // Calculate transit-to-transit aspects
          const transitTransitAspects = calculateTransitToTransitAspects(transitData.planets, transitTransitOrb);
          result.transitTransitAspects = transitTransitAspects;
        }
      }

      // Calculate progressions if enabled
      if (formData.showProgressions && result.success) {
        // Calculate age from natal date to progression date
        const age = calculateAgeFromDates(
          {
            year: parseInt(formData.year),
            month: parseInt(formData.month),
            day: parseInt(formData.day),
            hour: parseInt(formData.hour),
            minute: parseInt(formData.minute)
          },
          {
            year: parseInt(formData.progressionYear),
            month: parseInt(formData.progressionMonth),
            day: parseInt(formData.progressionDay),
            hour: parseInt(formData.progressionHour),
            minute: parseInt(formData.progressionMinute)
          }
        );

        if (age <= 0) {
          alert('Progression date must be after natal date');
          setLoading(false);
          return;
        }

        const progressionsResult = await window.astro.calculateProgressions({
          natalData: {
            year: parseInt(formData.year),
            month: parseInt(formData.month),
            day: parseInt(formData.day),
            hour: parseInt(formData.hour),
            minute: parseInt(formData.minute),
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            houseSystem: formData.houseSystem
          },
          target: {
            age: age
          }
        });

        if (progressionsResult.success && progressionsResult.data) {
          const progressedData = progressionsResult.data;
          console.log('Progressions calculated for Chart A:', progressedData);

          // Calculate progressed-to-natal aspects
          const progressedAspects = calculateTransitAspects(result.planets, progressedData.planets, transitOrb);

          // Always store progression-natal aspects separately
          result.progressionNatalAspects = progressedAspects;

          // Only set as transitAspects if transits are not also enabled (for backwards compatibility)
          if (!formData.showTransits) {
            result.transitAspects = progressedAspects;

            // Set all progressed aspects as active by default
            const allProgressedAspectKeys = new Set(
              progressedAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
            );
            setActiveTransitAspects(allProgressedAspectKeys);
          }

          // Store progressed data separately
          progressionsData = progressedData;
        }
      }

      // Calculate transit-to-progression aspects if both exist
      if (transitData && progressionsData) {
        const transitProgressionAspects = calculateTransitProgressionAspects(
          transitData.planets,
          progressionsData.planets,
          transitProgressionOrb
        );
        result.transitProgressionAspects = transitProgressionAspects;
        // Set all transit-progression aspects as active by default
        const allTransitProgressionAspectKeys = new Set(
          transitProgressionAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
        );
        setActiveTransitProgressionAspects(allTransitProgressionAspectKeys);
      }

      // Calculate synastry aspects if Chart B exists
      if (chartDataB && chartDataB.planets && result.success && result.planets) {
        const synastryAspects = calculateTransitAspects(result.planets, chartDataB.planets, synastryOrb);
        result.synastryAspects = synastryAspects;
        // Set all synastry aspects as active by default
        const allSynastryAspectKeys = new Set(
          synastryAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
        );
        setActiveSynastryAspects(allSynastryAspectKeys);
      }

      setChartData({ ...result, transits: transitData, progressions: progressionsData });
      console.log('Chart A calculated:', result);
    } catch (error) {
      console.error('Error calculating Chart A:', error);
      setChartData({ success: false, error: error.message });
    }
    setLoading(false);
  };

  // Calculate Return Chart (Solar or Lunar)
  const calculateReturn = async (e) => {
    e.preventDefault();
    setLoadingReturn(true);

    try {
      const natalData = {
        year: parseInt(returnsFormData.year),
        month: parseInt(returnsFormData.month),
        day: parseInt(returnsFormData.day),
        hour: parseInt(returnsFormData.hour),
        minute: parseInt(returnsFormData.minute),
        latitude: parseFloat(returnsFormData.latitude),
        longitude: parseFloat(returnsFormData.longitude),
        timezone: returnsFormData.timezone,
        houseSystem: returnsFormData.houseSystem || 'placidus',
      };

      const returnLocation = {
        latitude: parseFloat(returnsFormData.returnLatitude),
        longitude: parseFloat(returnsFormData.returnLongitude),
        timezone: returnsFormData.returnTimezone,
        houseSystem: returnsFormData.houseSystem || 'placidus',
      };

      let returnResult;
      if (returnType === 'solar') {
        console.log('Calculating Solar Return...');
        returnResult = await calculateSolarReturn(
          natalData,
          parseInt(returnsFormData.returnYear),
          returnLocation,
          window.astro.calculateChart
        );
      } else {
        console.log('Calculating Lunar Return...');
        returnResult = await calculateLunarReturn(
          natalData,
          parseInt(returnsFormData.returnYear),
          parseInt(returnsFormData.returnMonth),
          returnLocation,
          window.astro.calculateChart
        );
      }

      console.log('Return chart calculated:', returnResult);

      // Calculate Return-to-Natal aspects
      if (returnResult.success && returnResult.natalChart) {
        const returnToNatalAspects = calculateTransitAspects(
          returnResult.natalChart.planets,
          returnResult.planets,
          transitOrb
        );
        returnResult.returnToNatalAspects = returnToNatalAspects;
        console.log('Return-to-natal aspects:', returnToNatalAspects);
      }

      setReturnChartData(returnResult);
    } catch (error) {
      console.error('Error calculating return chart:', error);
      setReturnChartData({ success: false, error: error.message });
      alert(`Error: ${error.message}`);
    }

    setLoadingReturn(false);
  };

  // Location search for Returns birth location
  const searchReturnsBirthLocation = async () => {
    if (!returnsFormData.location.trim()) {
      alert('Please enter a birth location to search');
      return;
    }

    setSearchingReturnsBirthLocation(true);
    setReturnsBirthLocationResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(returnsFormData.location)}` +
        `&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AstroApp/1.0'
          }
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        setReturnsBirthLocationResults(data);
      } else {
        alert('No locations found. Try a different search term.');
      }
    } catch (error) {
      console.error('Location search error:', error);
      alert('Error searching for location. Please try again.');
    }

    setSearchingReturnsBirthLocation(false);
  };

  const selectReturnsBirthLocation = (result) => {
    const displayName = result.display_name;

    setReturnsFormData({
      ...returnsFormData,
      location: displayName,
      latitude: String(result.lat),
      longitude: String(result.lon),
      timezone: result.address?.country_code === 'us' ? 'America/New_York' : 'UTC'
    });

    setReturnsBirthLocationResults([]);
  };

  // Location search for Returns return location
  const searchReturnsReturnLocation = async () => {
    if (!returnsFormData.returnLocation.trim()) {
      alert('Please enter a return location to search');
      return;
    }

    setSearchingReturnsReturnLocation(true);
    setReturnsReturnLocationResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(returnsFormData.returnLocation)}` +
        `&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AstroApp/1.0'
          }
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        setReturnsReturnLocationResults(data);
      } else {
        alert('No locations found. Try a different search term.');
      }
    } catch (error) {
      console.error('Location search error:', error);
      alert('Error searching for location. Please try again.');
    }

    setSearchingReturnsReturnLocation(false);
  };

  const selectReturnsReturnLocation = (result) => {
    const displayName = result.display_name;

    setReturnsFormData({
      ...returnsFormData,
      returnLocation: displayName,
      returnLatitude: String(result.lat),
      returnLongitude: String(result.lon),
      returnTimezone: result.address?.country_code === 'us' ? 'America/New_York' : 'UTC'
    });

    setReturnsReturnLocationResults([]);
  };

  // Calculate Chart B (for dual view)
  const calculateChartB = async () => {
    setLoadingB(true);
    try {
      const localTime = DateTime.fromObject({
        year: parseInt(formDataB.year),
        month: parseInt(formDataB.month),
        day: parseInt(formDataB.day),
        hour: parseInt(formDataB.hour),
        minute: parseInt(formDataB.minute),
      }, { zone: formDataB.timezone });

      const utcTime = localTime.toUTC();

      const result = await window.astro.calculateChart({
        year: parseInt(formDataB.year),
        month: parseInt(formDataB.month),
        day: parseInt(formDataB.day),
        hour: parseInt(formDataB.hour),
        minute: parseInt(formDataB.minute),
        utcYear: utcTime.year,
        utcMonth: utcTime.month,
        utcDay: utcTime.day,
        utcHour: utcTime.hour,
        utcMinute: utcTime.minute,
        latitude: parseFloat(formDataB.latitude),
        longitude: parseFloat(formDataB.longitude),
        houseSystem: formDataB.houseSystem,
      });

      if (result.success && result.aspects) {
        const allAspectKeys = new Set(
          result.aspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
        );
        setActiveAspectsB(allAspectKeys);
      }

      // Calculate transit and progression positions if enabled
      let transitData = null;
      let progressionsData = null;
      if (formDataB.showTransits && result.success) {
        const transitLocalTime = DateTime.fromObject({
          year: parseInt(formDataB.transitYear),
          month: parseInt(formDataB.transitMonth),
          day: parseInt(formDataB.transitDay),
          hour: parseInt(formDataB.transitHour),
          minute: parseInt(formDataB.transitMinute),
        }, { zone: formDataB.timezone });

        const transitUtcTime = transitLocalTime.toUTC();

        const transitResult = await window.astro.calculateChart({
          year: parseInt(formDataB.transitYear),
          month: parseInt(formDataB.transitMonth),
          day: parseInt(formDataB.transitDay),
          hour: parseInt(formDataB.transitHour),
          minute: parseInt(formDataB.transitMinute),
          utcYear: transitUtcTime.year,
          utcMonth: transitUtcTime.month,
          utcDay: transitUtcTime.day,
          utcHour: transitUtcTime.hour,
          utcMinute: transitUtcTime.minute,
          latitude: parseFloat(formDataB.latitude),
          longitude: parseFloat(formDataB.longitude),
          houseSystem: formDataB.houseSystem,
        });

        if (transitResult.success) {
          transitData = transitResult;

          // Calculate natal-to-transit aspects
          const transitAspects = calculateTransitAspects(result.planets, transitData.planets, transitOrb);
          result.transitAspects = transitAspects;

          // Set all transit aspects as active by default
          const allTransitAspectKeys = new Set(
            transitAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
          );
          setActiveTransitAspectsB(allTransitAspectKeys);

          // Calculate transit-to-transit aspects
          const transitTransitAspects = calculateTransitToTransitAspects(transitData.planets, transitTransitOrb);
          result.transitTransitAspects = transitTransitAspects;
        }
      }

      // Calculate progressions if enabled
      if (formDataB.showProgressions && result.success) {
        // Calculate age from natal date to progression date
        const age = calculateAgeFromDates(
          {
            year: parseInt(formDataB.year),
            month: parseInt(formDataB.month),
            day: parseInt(formDataB.day),
            hour: parseInt(formDataB.hour),
            minute: parseInt(formDataB.minute)
          },
          {
            year: parseInt(formDataB.progressionYear),
            month: parseInt(formDataB.progressionMonth),
            day: parseInt(formDataB.progressionDay),
            hour: parseInt(formDataB.progressionHour),
            minute: parseInt(formDataB.progressionMinute)
          }
        );

        if (age <= 0) {
          alert('Progression date must be after natal date');
          setLoadingB(false);
          return;
        }

        const progressionsResult = await window.astro.calculateProgressions({
          natalData: {
            year: parseInt(formDataB.year),
            month: parseInt(formDataB.month),
            day: parseInt(formDataB.day),
            hour: parseInt(formDataB.hour),
            minute: parseInt(formDataB.minute),
            latitude: parseFloat(formDataB.latitude),
            longitude: parseFloat(formDataB.longitude),
            houseSystem: formDataB.houseSystem
          },
          target: {
            age: age
          }
        });

        if (progressionsResult.success && progressionsResult.data) {
          const progressedData = progressionsResult.data;
          console.log('Progressions calculated for Chart B:', progressedData);

          // Calculate progressed-to-natal aspects
          const progressedAspects = calculateTransitAspects(result.planets, progressedData.planets, transitOrb);

          // Always store progression-natal aspects separately
          result.progressionNatalAspects = progressedAspects;

          // Only set as transitAspects if transits are not also enabled (for backwards compatibility)
          if (!formDataB.showTransits) {
            result.transitAspects = progressedAspects;

            // Set all progressed aspects as active by default
            const allProgressedAspectKeys = new Set(
              progressedAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
            );
            setActiveTransitAspectsB(allProgressedAspectKeys);
          }

          // Store progressed data separately
          progressionsData = progressedData;
        }
      }

      // Calculate transit-to-progression aspects if both exist
      if (transitData && progressionsData) {
        const transitProgressionAspects = calculateTransitProgressionAspects(
          transitData.planets,
          progressionsData.planets,
          transitProgressionOrb
        );
        result.transitProgressionAspects = transitProgressionAspects;
        // Set all transit-progression aspects as active by default
        const allTransitProgressionAspectKeys = new Set(
          transitProgressionAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
        );
        setActiveTransitProgressionAspectsB(allTransitProgressionAspectKeys);
      }

      // Calculate synastry aspects if Chart A exists
      if (chartData && chartData.planets && result.success && result.planets) {
        const synastryAspects = calculateTransitAspects(chartData.planets, result.planets, synastryOrb);
        // Store synastry aspects in Chart A (since we'll render them from Chart A's perspective)
        setChartData(prevChartData => ({ ...prevChartData, synastryAspects }));
        // Set all synastry aspects as active by default
        const allSynastryAspectKeys = new Set(
          synastryAspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
        );
        setActiveSynastryAspects(allSynastryAspectKeys);
      }

      setChartDataB({ ...result, transits: transitData, progressions: progressionsData });
      console.log('Chart B calculated:', result);
    } catch (error) {
      console.error('Error calculating Chart B:', error);
      setChartDataB({ success: false, error: error.message });
    }
    setLoadingB(false);
  };

  // Clear Chart A
  const clearChartA = () => {
    setFormData({
      name: '',
      year: '1990',
      month: '1',
      day: '1',
      hour: '12',
      minute: '0',
      latitude: '40.7128',
      longitude: '-74.0060',
      location: 'New York, NY',
      timezone: 'America/New_York',
      houseSystem: 'placidus',
      showTransits: false,
      showProgressions: false,
      transitYear: new Date().getFullYear().toString(),
      transitMonth: (new Date().getMonth() + 1).toString(),
      transitDay: new Date().getDate().toString(),
      transitHour: new Date().getHours().toString(),
      transitMinute: new Date().getMinutes().toString(),
      progressionYear: new Date().getFullYear().toString(),
      progressionMonth: (new Date().getMonth() + 1).toString(),
      progressionDay: new Date().getDate().toString(),
      progressionHour: new Date().getHours().toString(),
      progressionMinute: new Date().getMinutes().toString(),
    });
    setChartData(null);
    setActiveAspects(new Set());
    setActiveTransitAspects(new Set());
    setActiveProgressionNatalAspects(new Set());
    setActiveTransitProgressionAspects(new Set());
    setShowNatalAspects(true);
  };

  // Clear Chart B
  const clearChartB = () => {
    setFormDataB({
      name: '',
      year: '1990',
      month: '1',
      day: '1',
      hour: '12',
      minute: '0',
      latitude: '40.7128',
      longitude: '-74.0060',
      location: 'New York, NY',
      timezone: 'America/New_York',
      houseSystem: 'placidus',
      showTransits: false,
      showProgressions: false,
      transitYear: new Date().getFullYear().toString(),
      transitMonth: (new Date().getMonth() + 1).toString(),
      transitDay: new Date().getDate().toString(),
      transitHour: new Date().getHours().toString(),
      transitMinute: new Date().getMinutes().toString(),
      progressionYear: new Date().getFullYear().toString(),
      progressionMonth: (new Date().getMonth() + 1).toString(),
      progressionDay: new Date().getDate().toString(),
      progressionHour: new Date().getHours().toString(),
      progressionMinute: new Date().getMinutes().toString(),
    });
    setChartDataB(null);
    setActiveAspectsB(new Set());
    setActiveTransitAspectsB(new Set());
    setActiveProgressionNatalAspectsB(new Set());
    setActiveTransitProgressionAspectsB(new Set());
    setShowNatalAspectsB(true);
  };

  // Calculate Secondary Progressions
  const calculateProgressions = async () => {
    if (!chartData || !chartData.success) {
      alert('Please calculate Chart A first (natal chart required for progressions)');
      return;
    }

    // Calculate age from natal date to progression date
    const age = calculateAgeFromDates(
      {
        year: parseInt(formData.year),
        month: parseInt(formData.month),
        day: parseInt(formData.day),
        hour: parseInt(formData.hour),
        minute: parseInt(formData.minute)
      },
      {
        year: parseInt(formData.progressionYear),
        month: parseInt(formData.progressionMonth),
        day: parseInt(formData.progressionDay),
        hour: parseInt(formData.progressionHour),
        minute: parseInt(formData.progressionMinute)
      }
    );

    if (age <= 0) {
      alert('Progression date must be after natal date');
      return;
    }

    setLoadingB(true);
    try {
      const result = await window.astro.calculateProgressions({
        natalData: {
          year: parseInt(formData.year),
          month: parseInt(formData.month),
          day: parseInt(formData.day),
          hour: parseInt(formData.hour),
          minute: parseInt(formData.minute),
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          houseSystem: formData.houseSystem
        },
        target: {
          age: age
        }
      });

      if (result.success && result.data) {
        // Format as standard chart data
        const progressedChart = {
          ...result.data,
          success: true,
          metadata: result.data.metadata
        };

        // Set all progressed aspects as active by default
        if (progressedChart.aspects) {
          const allAspectKeys = new Set(
            progressedChart.aspects.map(aspect => `${aspect.planet1}-${aspect.planet2}`)
          );
          setActiveAspectsB(allAspectKeys);
        }

        // Update Chart B with progressed chart
        setChartDataB(progressedChart);

        // Update formDataB to show progression info
        setFormDataB({
          ...formDataB,
          name: `${formData.name || 'Chart'} - Progressed (${formData.progressionMonth}/${formData.progressionDay}/${formData.progressionYear})`
        });

        // Switch to dual view to show both charts
        setViewMode('dual');

        console.log('Progressions calculated:', progressedChart);
      } else {
        alert('Error calculating progressions: ' + (result.error || 'Unknown error'));
        setChartDataB({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error calculating progressions:', error);
      alert('Error calculating progressions: ' + error.message);
      setChartDataB({ success: false, error: error.message });
    }
    setLoadingB(false);
  };

  const handleAspectToggle = (aspectOrAspects) => {
    // Support both single aspect and array of aspects
    const aspects = Array.isArray(aspectOrAspects) ? aspectOrAspects : [aspectOrAspects];

    const newActiveAspects = new Set(activeAspects);

    aspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;

      if (newActiveAspects.has(key)) {
        newActiveAspects.delete(key);
      } else {
        newActiveAspects.add(key);
      }
    });

    setActiveAspects(newActiveAspects);
  };

  const handleTransitAspectToggle = (aspectOrAspects) => {
    // Support both single aspect and array of aspects
    const aspects = Array.isArray(aspectOrAspects) ? aspectOrAspects : [aspectOrAspects];

    const newActiveAspects = new Set(activeTransitAspects);

    aspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;

      if (newActiveAspects.has(key)) {
        newActiveAspects.delete(key);
      } else {
        newActiveAspects.add(key);
      }
    });

    setActiveTransitAspects(newActiveAspects);
  };

  const handleProgressionNatalAspectToggle = (aspectOrAspects) => {
    // Support both single aspect and array of aspects
    const aspects = Array.isArray(aspectOrAspects) ? aspectOrAspects : [aspectOrAspects];

    const newActiveAspects = new Set(activeProgressionNatalAspects);

    aspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;

      if (newActiveAspects.has(key)) {
        newActiveAspects.delete(key);
      } else {
        newActiveAspects.add(key);
      }
    });

    setActiveProgressionNatalAspects(newActiveAspects);
  };

  const handleTransitProgressionAspectToggle = (aspectOrAspects) => {
    // Support both single aspect and array of aspects
    const aspects = Array.isArray(aspectOrAspects) ? aspectOrAspects : [aspectOrAspects];

    const newActiveAspects = new Set(activeTransitProgressionAspects);

    aspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;

      if (newActiveAspects.has(key)) {
        newActiveAspects.delete(key);
      } else {
        newActiveAspects.add(key);
      }
    });

    setActiveTransitProgressionAspects(newActiveAspects);
  };

  // Chart B aspect toggle handlers
  const handleAspectToggleB = (aspectOrAspects) => {
    const aspects = Array.isArray(aspectOrAspects) ? aspectOrAspects : [aspectOrAspects];
    const newActiveAspects = new Set(activeAspectsB);

    aspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      if (newActiveAspects.has(key)) {
        newActiveAspects.delete(key);
      } else {
        newActiveAspects.add(key);
      }
    });

    setActiveAspectsB(newActiveAspects);
  };

  const handleTransitAspectToggleB = (aspectOrAspects) => {
    const aspects = Array.isArray(aspectOrAspects) ? aspectOrAspects : [aspectOrAspects];
    const newActiveAspects = new Set(activeTransitAspectsB);

    aspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      if (newActiveAspects.has(key)) {
        newActiveAspects.delete(key);
      } else {
        newActiveAspects.add(key);
      }
    });

    setActiveTransitAspectsB(newActiveAspects);
  };

  const handleTransitProgressionAspectToggleB = (aspectOrAspects) => {
    const aspects = Array.isArray(aspectOrAspects) ? aspectOrAspects : [aspectOrAspects];
    const newActiveAspects = new Set(activeTransitProgressionAspectsB);

    aspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      if (newActiveAspects.has(key)) {
        newActiveAspects.delete(key);
      } else {
        newActiveAspects.add(key);
      }
    });

    setActiveTransitProgressionAspectsB(newActiveAspects);
  };

  const handleSynastryAspectToggle = (aspectOrAspects) => {
    const aspects = Array.isArray(aspectOrAspects) ? aspectOrAspects : [aspectOrAspects];
    const newActiveAspects = new Set(activeSynastryAspects);

    aspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      if (newActiveAspects.has(key)) {
        newActiveAspects.delete(key);
      } else {
        newActiveAspects.add(key);
      }
    });

    setActiveSynastryAspects(newActiveAspects);
  };

  const handleReturnAspectToggle = (aspectOrAspects) => {
    const aspects = Array.isArray(aspectOrAspects) ? aspectOrAspects : [aspectOrAspects];
    const newActiveAspects = new Set(activeReturnAspects);

    aspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      if (newActiveAspects.has(key)) {
        newActiveAspects.delete(key);
      } else {
        newActiveAspects.add(key);
      }
    });

    setActiveReturnAspects(newActiveAspects);
  };

  const handleReturnInternalAspectToggle = (aspectOrAspects) => {
    const aspects = Array.isArray(aspectOrAspects) ? aspectOrAspects : [aspectOrAspects];
    const newActiveAspects = new Set(activeReturnInternalAspects);

    aspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      if (newActiveAspects.has(key)) {
        newActiveAspects.delete(key);
      } else {
        newActiveAspects.add(key);
      }
    });

    setActiveReturnInternalAspects(newActiveAspects);
  };

  const handleProgressionNatalAspectToggleB = (aspectOrAspects) => {
    const aspects = Array.isArray(aspectOrAspects) ? aspectOrAspects : [aspectOrAspects];
    const newActiveAspects = new Set(activeProgressionNatalAspectsB);

    aspects.forEach(aspect => {
      const key = `${aspect.planet1}-${aspect.planet2}`;
      if (newActiveAspects.has(key)) {
        newActiveAspects.delete(key);
      } else {
        newActiveAspects.add(key);
      }
    });

    setActiveProgressionNatalAspectsB(newActiveAspects);
  };

  // Chart library handlers
  const handleSaveChart = async ({ name, notes }) => {
    if (!chartData) {
      throw new Error('No chart data to save');
    }

    // Determine chart type based on current view mode
    let chartType = 'natal';
    if (viewMode === 'relationship') {
      chartType = relationshipChartType; // 'synastry' or 'composite'
    } else if (viewMode === 'returns') {
      chartType = returnType === 'solar' ? 'solar-return' : 'lunar-return';
    }

    const chartRecord = {
      name,
      notes,
      chartType,
      formData,
      formDataB: viewMode === 'relationship' ? formDataB : null,
      chartData,
      chartDataB: viewMode === 'relationship' ? chartDataB : null,
    };

    const chartId = await saveChart(chartRecord);
    console.log('Chart saved with ID:', chartId);
    return chartId;
  };

  const handleLoadChart = (chart) => {
    // Determine which chart slot to load into
    const targetChart = activeChart || 'A';

    if (targetChart === 'A') {
      // Load into Chart A
      if (chart.formData) {
        setFormData(chart.formData);
      }

      if (chart.chartData) {
        setChartData(chart.chartData);
      }

      // Set the view mode based on chart type (only when loading into Chart A)
      // BUT don't switch away from relationship/returns/dual views unless the chart explicitly requires it
      if (chart.chartType === 'synastry' || chart.chartType === 'composite') {
        setViewMode('relationship');
        setRelationshipChartType(chart.chartType);
        // Also load Chart B if it exists
        if (chart.formDataB) {
          setFormDataB(chart.formDataB);
        }
        if (chart.chartDataB) {
          setChartDataB(chart.chartDataB);
        }
      } else if (chart.chartType === 'solar-return' || chart.chartType === 'lunar-return') {
        setViewMode('returns');
        setReturnType(chart.chartType === 'solar-return' ? 'solar' : 'lunar');
      } else if (viewMode !== 'relationship' && viewMode !== 'returns' && viewMode !== 'dual') {
        // Only switch to single view if we're not already in a multi-chart mode
        setViewMode('single');
      }

      console.log('Loaded chart into Chart A:', chart.name);
    } else {
      // Load into Chart B
      if (chart.formData) {
        setFormDataB(chart.formData);
      }

      if (chart.chartData) {
        setChartDataB(chart.chartData);
      }

      console.log('Loaded chart into Chart B:', chart.name);
    }
  };

  const searchLocation = async () => {
    if (!formData.location.trim()) {
      alert('Please enter a location to search');
      return;
    }

    setSearchingLocation(true);
    setLocationResults([]);

    try {
      // Query OpenStreetMap Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(formData.location)}` +
        `&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AstroApp/1.0' // Nominatim requires a user agent
          }
        }
      );

      const data = await response.json();
      
      if (data && data.length > 0) {
        setLocationResults(data);
      } else {
        alert('No locations found. Try a different search term.');
      }
    } catch (error) {
      console.error('Location search error:', error);
      alert('Error searching for location. Please try again.');
    }

    setSearchingLocation(false);
  };

  const selectLocation = (result) => {
    alert('Location selected! Check if lat/long filled in.'); // Test alert
    
    // Format the display name nicely
    const displayName = result.display_name;
    
    console.log('Selected location:', result); // Debug
    console.log('Lat:', result.lat, 'Lon:', result.lon); // Debug
    
    setFormData({
      ...formData,
      location: displayName,
      latitude: String(result.lat),
      longitude: String(result.lon),
    });
    
    setLocationResults([]); // Clear results after selection
    
    console.log('Updated formData:', { // Debug
      ...formData,
      location: displayName,
      latitude: String(result.lat),
      longitude: String(result.lon),
    });
  };

  const searchLocationB = async () => {
    if (!formDataB.location.trim()) {
      alert('Please enter a location to search');
      return;
    }

    setSearchingLocation(true);
    setLocationResults([]);

    try {
      // Query OpenStreetMap Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(formDataB.location)}` +
        `&format=json&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AstroApp/1.0' // Nominatim requires a user agent
          }
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        setLocationResults(data);
      } else {
        alert('No locations found. Try a different search term.');
      }
    } catch (error) {
      console.error('Location search error:', error);
      alert('Error searching for location. Please try again.');
    } finally {
      setSearchingLocation(false);
    }
  };

  const selectLocationB = (result) => {
    // Format the display name nicely
    const displayName = result.display_name;

    setFormDataB({
      ...formDataB,
      location: displayName,
      latitude: String(result.lat),
      longitude: String(result.lon),
    });

    setLocationResults([]); // Clear results after selection
  };

  const getZodiacSign = (longitude) => {
    if (longitude === undefined || isNaN(longitude)) return 'N/A';
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signIndex = Math.floor(longitude / 30);
    const degree = (longitude % 30).toFixed(2);
    return `${degree}° ${signs[signIndex]}`;
  };

  const getSignName = (longitude) => {
    if (longitude === undefined || isNaN(longitude)) return 'Unknown';
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const signIndex = Math.floor(longitude / 30);
    return signs[signIndex];
  };

  // Show landing page on first load
  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  return (
    <div className="app">
      <AppHeader
        settingsMenu={
          <SettingsMenu
            displaySettings={displaySettings}
            setDisplaySettings={setDisplaySettings}
          />
        }
      >
        <div className="view-mode-toggle">
          <button
            className={`mode-btn ${viewMode === 'single' ? 'active' : ''}`}
            onClick={() => setViewMode('single')}
          >
            Single Chart
          </button>
          <button
            className={`mode-btn ${viewMode === 'dual' ? 'active' : ''}`}
            onClick={() => setViewMode('dual')}
          >
            Compare Charts
          </button>
          <button
            className={`mode-btn ${viewMode === 'relationship' ? 'active' : ''}`}
            onClick={() => setViewMode('relationship')}
            title="Synastry & Composite Charts"
          >
            Relationship Chart
          </button>
          <button
            className={`mode-btn ${viewMode === 'returns' ? 'active' : ''}`}
            onClick={() => setViewMode('returns')}
            title="Solar & Lunar Returns"
          >
            🔄 Returns
          </button>
          <button
            className={`mode-btn ${viewMode === 'horary' ? 'active' : ''}`}
            onClick={() => setViewMode('horary')}
            title="Cast Horary Chart for Current Moment"
          >
            🔮 Horary
          </button>
          <button
            className={`mode-btn ${viewMode === 'eclipses' ? 'active' : ''}`}
            onClick={() => setViewMode('eclipses')}
            title="Track Eclipse Activations"
          >
            🌑 Eclipses
          </button>
          <button
            className={`mode-btn ${viewMode === 'configSearch' ? 'active' : ''}`}
            onClick={() => setViewMode('configSearch')}
            title="Search for Planetary Configurations"
          >
            🔍 Configuration Search
          </button>
          <button
            className={`mode-btn ${isChatOpen ? 'active' : ''}`}
            onClick={() => setIsChatOpen(!isChatOpen)}
            title="AI Assistant"
          >
            🤖 AI Chat
          </button>
          <button
            className="mode-btn"
            onClick={() => setIsLibraryOpen(true)}
            title="View and load saved charts"
          >
            📚 Library
          </button>
          <button
            className="mode-btn"
            onClick={() => setIsSaveModalOpen(true)}
            disabled={!chartData}
            title={chartData ? "Save current chart" : "Calculate a chart first"}
          >
            💾 Save Chart
          </button>
        </div>
      </AppHeader>
      <main className={`app-main ${isChatOpen ? 'chat-open' : ''}`}>
        {viewMode === 'single' ? (
          <>
        <h2>Calculate Natal Chart</h2>

        <form onSubmit={calculateChart} className="chart-form">
          <div className="form-group">
            <label>Name (optional)</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter name"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Year *</label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                required
                min="500"
                max="2100"
              />
            </div>

            <div className="form-group">
              <label>Month *</label>
              <input
                type="number"
                name="month"
                value={formData.month}
                onChange={handleInputChange}
                required
                min="1"
                max="12"
              />
            </div>

            <div className="form-group">
              <label>Day *</label>
              <input
                type="number"
                name="day"
                value={formData.day}
                onChange={handleInputChange}
                required
                min="1"
                max="31"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Hour (0-23)</label>
              <input
                type="number"
                name="hour"
                value={formData.hour}
                onChange={handleInputChange}
                min="0"
                max="23"
              />
            </div>

            <div className="form-group">
              <label>Minute</label>
              <input
                type="number"
                name="minute"
                value={formData.minute}
                onChange={handleInputChange}
                min="0"
                max="59"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location</label>
            <div className="location-search-group">
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, State/Country"
              />
              <button 
                type="button" 
                onClick={searchLocation}
                disabled={searchingLocation}
                className="search-location-btn"
              >
                {searchingLocation ? '🔍 Searching...' : '🔍 Search'}
              </button>
            </div>
            
            {locationResults.length > 0 && (
              <div className="location-results">
                <div className="location-results-header">
                  Select a location:
                </div>
                {locationResults.map((result, index) => (
                  <div
                    key={index}
                    className="location-result-item"
                    onClick={() => selectLocation(result)}
                  >
                    <div className="location-name">{result.display_name}</div>
                    <div className="location-coords">
                      {parseFloat(result.lat).toFixed(4)}°, {parseFloat(result.lon).toFixed(4)}°
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Timezone *</label>
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
              required
            >
              <optgroup label="US Timezones">
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Phoenix">Arizona (no DST)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Anchorage">Alaska Time (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
              </optgroup>
              <optgroup label="Europe">
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Paris (CET/CEST)</option>
                <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                <option value="Europe/Rome">Rome (CET/CEST)</option>
                <option value="Europe/Athens">Athens (EET/EEST)</option>
                <option value="Europe/Moscow">Moscow (MSK)</option>
              </optgroup>
              <optgroup label="Asia">
                <option value="Asia/Dubai">Dubai (GST)</option>
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Bangkok">Bangkok (ICT)</option>
                <option value="Asia/Singapore">Singapore (SGT)</option>
                <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Asia/Seoul">Seoul (KST)</option>
              </optgroup>
              <optgroup label="Australia & Pacific">
                <option value="Australia/Perth">Perth (AWST)</option>
                <option value="Australia/Adelaide">Adelaide (ACST/ACDT)</option>
                <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                <option value="Pacific/Auckland">Auckland (NZST/NZDT)</option>
              </optgroup>
              <optgroup label="Americas">
                <option value="America/Toronto">Toronto (ET)</option>
                <option value="America/Vancouver">Vancouver (PT)</option>
                <option value="America/Mexico_City">Mexico City (CST)</option>
                <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                <option value="America/Buenos_Aires">Buenos Aires (ART)</option>
              </optgroup>
              <optgroup label="Africa & Middle East">
                <option value="Africa/Cairo">Cairo (EET)</option>
                <option value="Africa/Johannesburg">Johannesburg (SAST)</option>
                <option value="Asia/Jerusalem">Jerusalem (IST)</option>
              </optgroup>
            </select>
            <small style={{display: 'block', marginTop: '4px', color: '#666'}}>
              DST will be automatically applied for historical dates
            </small>
          </div>

          <div className="form-group">
            <label>House System</label>
            <select
              name="houseSystem"
              value={formData.houseSystem}
              onChange={handleInputChange}
              className="house-system-select"
            >
              <option value="placidus">Placidus</option>
              <option value="koch">Koch</option>
              <option value="whole-sign">Whole Sign</option>
              <option value="equal-house">Equal House</option>
              <option value="campanus">Campanus</option>
              <option value="regiomontanus">Regiomontanus</option>
              <option value="topocentric">Topocentric</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Latitude *</label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                required
                placeholder="40.7128"
              />
            </div>

            <div className="form-group">
              <label>Longitude *</label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                required
                placeholder="-74.0060"
              />
            </div>
          </div>

          {/* Hide transit/progression options for horary charts */}
          {!formData.name?.startsWith('Horary:') && (
            <div className="form-group" style={{marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px'}}>
              <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '10px'}}>
                <input
                  type="checkbox"
                  name="showTransits"
                  checked={formData.showTransits}
                  onChange={handleInputChange}
                  style={{marginRight: '8px', width: '18px', height: '18px'}}
                />
                <span style={{fontWeight: 'bold'}}>Show Transits (Bi-Wheel)</span>
              </label>
              <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                <input
                  type="checkbox"
                  name="showProgressions"
                  checked={formData.showProgressions}
                  onChange={handleInputChange}
                  style={{marginRight: '8px', width: '18px', height: '18px'}}
                />
                <span style={{fontWeight: 'bold'}}>Show Progressions/Directions (Bi-Wheel)</span>
              </label>
            </div>
          )}

          {formData.showProgressions && (
            <div style={{marginTop: '15px', padding: '15px', border: '2px solid #9C27B0', borderRadius: '4px', backgroundColor: '#f9f5ff'}}>
              <h4 style={{marginTop: 0, color: '#9C27B0'}}>Choose Direction Type</h4>
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                  <input
                    type="radio"
                    name="directionType"
                    value="progressions"
                    checked={formData.directionType === 'progressions'}
                    onChange={handleInputChange}
                    style={{marginRight: '8px', width: '18px', height: '18px'}}
                  />
                  <span>
                    <strong>Secondary Progressions</strong> (day-for-a-year)
                    <small style={{display: 'block', color: '#666', marginLeft: '26px'}}>
                      More psychological, inner development focus
                    </small>
                  </span>
                </label>
                <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                  <input
                    type="radio"
                    name="directionType"
                    value="solarArcs"
                    checked={formData.directionType === 'solarArcs'}
                    onChange={handleInputChange}
                    style={{marginRight: '8px', width: '18px', height: '18px'}}
                  />
                  <span>
                    <strong>Solar Arc Directions</strong> (~1° per year)
                    <small style={{display: 'block', color: '#666', marginLeft: '26px'}}>
                      More event-oriented, outer world manifestations
                    </small>
                  </span>
                </label>
              </div>
            </div>
          )}

          {formData.showTransits && (
            <div style={{marginTop: '15px', padding: '15px', border: '2px solid #4CAF50', borderRadius: '4px'}}>
              <h4 style={{marginTop: 0, color: '#4CAF50'}}>Transit Date & Time</h4>

              <div className="form-row">
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    name="transitYear"
                    value={formData.transitYear}
                    onChange={handleInputChange}
                    min="500"
                    max="2100"
                  />
                </div>

                <div className="form-group">
                  <label>Month</label>
                  <input
                    type="number"
                    name="transitMonth"
                    value={formData.transitMonth}
                    onChange={handleInputChange}
                    min="1"
                    max="12"
                  />
                </div>

                <div className="form-group">
                  <label>Day</label>
                  <input
                    type="number"
                    name="transitDay"
                    value={formData.transitDay}
                    onChange={handleInputChange}
                    min="1"
                    max="31"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Hour (0-23)</label>
                  <input
                    type="number"
                    name="transitHour"
                    value={formData.transitHour}
                    onChange={handleInputChange}
                    min="0"
                    max="23"
                  />
                </div>

                <div className="form-group">
                  <label>Minute</label>
                  <input
                    type="number"
                    name="transitMinute"
                    value={formData.transitMinute}
                    onChange={handleInputChange}
                    min="0"
                    max="59"
                  />
                </div>
              </div>

              <small style={{display: 'block', color: '#666'}}>
                Transit positions will be displayed on outer wheel
              </small>
            </div>
          )}

          {formData.showProgressions && (
            <div style={{marginTop: '15px', padding: '15px', border: '2px solid #9C27B0', borderRadius: '4px'}}>
              <h4 style={{marginTop: 0, color: '#9C27B0'}}>
                {formData.directionType === 'solarArcs' ? 'Solar Arc Date' : 'Progression Date & Time'}
              </h4>

              <div className="form-row">
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="number"
                    name="progressionYear"
                    value={formData.progressionYear}
                    onChange={handleInputChange}
                    min="500"
                    max="2100"
                  />
                </div>

                <div className="form-group">
                  <label>Month</label>
                  <input
                    type="number"
                    name="progressionMonth"
                    value={formData.progressionMonth}
                    onChange={handleInputChange}
                    min="1"
                    max="12"
                  />
                </div>

                <div className="form-group">
                  <label>Day</label>
                  <input
                    type="number"
                    name="progressionDay"
                    value={formData.progressionDay}
                    onChange={handleInputChange}
                    min="1"
                    max="31"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Hour (0-23)</label>
                  <input
                    type="number"
                    name="progressionHour"
                    value={formData.progressionHour}
                    onChange={handleInputChange}
                    min="0"
                    max="23"
                  />
                </div>

                <div className="form-group">
                  <label>Minute</label>
                  <input
                    type="number"
                    name="progressionMinute"
                    value={formData.progressionMinute}
                    onChange={handleInputChange}
                    min="0"
                    max="59"
                  />
                </div>
              </div>

              <small style={{display: 'block', color: '#666'}}>
                Progressed positions will be displayed on outer wheel (day-for-a-year method)
              </small>
            </div>
          )}

          <button type="submit" disabled={loading} className="calculate-btn">
            {loading ? 'Calculating...' : 'Calculate Chart'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { setActiveChart('A'); setIsBrowserOpen(true); }}
            className="famous-charts-btn"
          >
            📚 Browse Famous Charts Database
          </button>
          <button
            type="button"
            onClick={startNewChart}
            className="secondary-btn"
          >
            Clear Form
          </button>
        </div>

        {chartData && chartData.success && (
          <div className="chart-results">
            <div className="chart-header">
              <div className="chart-title-section">
                <h3>
                  {formData.name && `${formData.name} - `}
                  {formData.month}/{formData.day}/{formData.year} at {formData.hour}:{formData.minute.padStart(2, '0')}
                  {formData.location && ` - ${formData.location}`}
                </h3>
                <div className="chart-actions">
                  <button onClick={resetChart} className="secondary-btn">
                    Edit Chart
                  </button>
                  <button onClick={startNewChart} className="secondary-btn">
                    New Chart
                  </button>
                </div>
              </div>
            </div>

            <ChartWheel
              chartData={chartData}
              transitData={chartData.transits}
              progressionsData={chartData.progressions}
              activeAspects={activeAspects}
              onAspectToggle={handleAspectToggle}
              activeTransitAspects={activeTransitAspects}
              onTransitAspectToggle={handleTransitAspectToggle}
              activeProgressionNatalAspects={activeProgressionNatalAspects}
              onProgressionNatalAspectToggle={handleProgressionNatalAspectToggle}
              activeTransitProgressionAspects={activeTransitProgressionAspects}
              onTransitProgressionAspectToggle={handleTransitProgressionAspectToggle}
              showNatalAspects={showNatalAspects}
              setShowNatalAspects={setShowNatalAspects}
              natalOrb={natalOrb}
              onNatalOrbChange={handleNatalOrbChange}
              displaySettings={displaySettings}
              transitOrb={transitOrb}
              onTransitOrbChange={handleTransitOrbChange}
              progressionNatalOrb={progressionNatalOrb}
              onProgressionNatalOrbChange={handleProgressionNatalOrbChange}
              transitTransitOrb={transitTransitOrb}
              onTransitTransitOrbChange={handleTransitTransitOrbChange}
              transitProgressionOrb={transitProgressionOrb}
              onTransitProgressionOrbChange={handleTransitProgressionOrbChange}
              solarArcNatalOrb={solarArcNatalOrb}
              onSolarArcNatalOrbChange={handleSolarArcNatalOrbChange}
              solarArcInternalOrb={solarArcInternalOrb}
              onSolarArcInternalOrbChange={handleSolarArcInternalOrbChange}
              directionType={formData.directionType}
              showProgressions={formData.showProgressions}
              formData={formData}
            />

            {/* TimeSlider - only show when transits, progressions, or solar arcs are enabled */}
            {(formData.showTransits || formData.showProgressions) && (
              <TimeSlider
                chartData={chartData}
                formData={formData}
                setFormData={setFormData}
                onRecalculate={calculateChart}
              />
            )}

            <AspectTabs
              chartData={chartData}
              activeAspects={activeAspects}
              onAspectToggle={handleAspectToggle}
              activeTransitAspects={activeTransitAspects}
              onTransitAspectToggle={handleTransitAspectToggle}
              activeProgressionNatalAspects={activeProgressionNatalAspects}
              onProgressionNatalAspectToggle={handleProgressionNatalAspectToggle}
              activeTransitProgressionAspects={activeTransitProgressionAspects}
              onTransitProgressionAspectToggle={handleTransitProgressionAspectToggle}
              activeSynastryAspects={activeSynastryAspects}
              onSynastryAspectToggle={handleSynastryAspectToggle}
              showNatalAspects={showNatalAspects}
              showProgressions={formData.showProgressions}
              formData={formData}
              directionType={formData.directionType}
              displaySettings={displaySettings}
            />

            {/* Horary Analysis - only show for horary charts */}
            {horaryAnalysis && <HoraryAnalysis analysis={horaryAnalysis} />}

            <div className="rising-sign">
              <h4>🌅 Rising Sign: {getSignName(chartData.ascendant)}</h4>
              <p><strong>Ascendant:</strong> {getZodiacSign(chartData.ascendant)}</p>
              <p><strong>Midheaven (MC):</strong> {getZodiacSign(chartData.midheaven)}</p>
            </div>

            <div className="houses-section">
              <h4>🏠 Houses ({formData.houseSystem.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')})</h4>
              <table>
                <thead>
                  <tr>
                    <th>House</th>
                    <th>Cusp</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.houses && chartData.houses.map((houseCusp, index) => (
                    <tr key={index}>
                      <td>House {index + 1}</td>
                      <td>{getZodiacSign(houseCusp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4>🌟 Planets</h4>

            <table>
              <thead>
                <tr>
                  <th>Planet</th>
                  <th>Position</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(chartData.planets).map(([key, planet]) => (
                  <tr key={key}>
                    <td>{planet.name}</td>
                    <td>{getZodiacSign(planet.longitude)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {chartData && !chartData.success && (
          <div className="error">
            <p>Error: {chartData.error}</p>
          </div>
        )}
          </>
        ) : viewMode === 'dual' ? (
          <div className="dual-charts-container">
            <div className="chart-panel">
              <div className="chart-panel-header chart-a">
                Chart A: {formData.name || 'Unnamed Chart'}
              </div>
              <div className="load-chart-section">
                <button
                  className="load-chart-btn"
                  onClick={() => { setActiveChart('A'); setIsBrowserOpen(true); }}
                >
                  📚 Famous Charts
                </button>
                <button
                  className="load-chart-btn"
                  onClick={() => { setActiveChart('A'); setIsLibraryOpen(true); }}
                  style={{ marginLeft: '0.5rem' }}
                >
                  💾 My Library
                </button>

                {/* Chart A Input Form */}
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Name (optional)</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter name"
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Year *</label>
                      <input
                        type="number"
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        required
                        min="500"
                        max="2100"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Month *</label>
                      <input
                        type="number"
                        name="month"
                        value={formData.month}
                        onChange={handleInputChange}
                        required
                        min="1"
                        max="12"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Day *</label>
                      <input
                        type="number"
                        name="day"
                        value={formData.day}
                        onChange={handleInputChange}
                        required
                        min="1"
                        max="31"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Hour (0-23)</label>
                      <input
                        type="number"
                        name="hour"
                        value={formData.hour}
                        onChange={handleInputChange}
                        min="0"
                        max="23"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Minute</label>
                      <input
                        type="number"
                        name="minute"
                        value={formData.minute}
                        onChange={handleInputChange}
                        min="0"
                        max="59"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="City, State/Country"
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Latitude *</label>
                      <input
                        type="number"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        step="0.0001"
                        required
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Longitude *</label>
                      <input
                        type="number"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        step="0.0001"
                        required
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Timezone *</label>
                    <select
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    >
                      <optgroup label="US Timezones">
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Phoenix">Arizona (no DST)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Anchorage">Alaska Time (AKT)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                      </optgroup>
                      <optgroup label="Europe">
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Europe/Paris">Paris (CET/CEST)</option>
                        <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                        <option value="Europe/Rome">Rome (CET/CEST)</option>
                        <option value="Europe/Athens">Athens (EET/EEST)</option>
                        <option value="Europe/Moscow">Moscow (MSK)</option>
                      </optgroup>
                      <optgroup label="Asia">
                        <option value="Asia/Dubai">Dubai (GST)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                        <option value="Asia/Bangkok">Bangkok (ICT)</option>
                        <option value="Asia/Singapore">Singapore (SGT)</option>
                        <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Seoul">Seoul (KST)</option>
                      </optgroup>
                      <optgroup label="Australia & Pacific">
                        <option value="Australia/Perth">Perth (AWST)</option>
                        <option value="Australia/Adelaide">Adelaide (ACST/ACDT)</option>
                        <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                        <option value="Pacific/Auckland">Auckland (NZST/NZDT)</option>
                      </optgroup>
                      <optgroup label="Americas">
                        <option value="America/Toronto">Toronto (ET)</option>
                        <option value="America/Vancouver">Vancouver (PT)</option>
                        <option value="America/Mexico_City">Mexico City (CST)</option>
                        <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                        <option value="America/Buenos_Aires">Buenos Aires (ART)</option>
                      </optgroup>
                      <optgroup label="Africa & Middle East">
                        <option value="Africa/Cairo">Cairo (EET)</option>
                        <option value="Africa/Johannesburg">Johannesburg (SAST)</option>
                        <option value="Asia/Jerusalem">Jerusalem (IST)</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>House System</label>
                    <select
                      name="houseSystem"
                      value={formData.houseSystem}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    >
                      <option value="placidus">Placidus</option>
                      <option value="koch">Koch</option>
                      <option value="whole-sign">Whole Sign</option>
                      <option value="equal-house">Equal House</option>
                      <option value="campanus">Campanus</option>
                      <option value="regiomontanus">Regiomontanus</option>
                      <option value="topocentric">Topocentric</option>
                    </select>
                  </div>
                </div>

                {/* Hide transit/progression options for horary charts */}
                {!formData.name?.startsWith('Horary:') && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'left' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '0.5rem' }}>
                        <input
                          type="checkbox"
                          name="showTransits"
                          checked={formData.showTransits}
                          onChange={handleInputChange}
                          style={{ marginRight: '8px', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Show Transits (Bi-Wheel)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '0.5rem' }}>
                        <input
                          type="checkbox"
                          name="showProgressions"
                          checked={formData.showProgressions}
                          onChange={handleInputChange}
                          style={{ marginRight: '8px', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Show Progressions (Bi-Wheel)</span>
                      </label>
                  {formData.showTransits && (
                    <div style={{ marginTop: '0.5rem', paddingLeft: '26px' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input type="number" name="transitYear" value={formData.transitYear} onChange={handleInputChange} placeholder="Year" style={{ width: '70px', padding: '4px', fontSize: '0.85rem' }} />
                            <input type="number" name="transitMonth" value={formData.transitMonth} onChange={handleInputChange} placeholder="Mo" min="1" max="12" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                            <input type="number" name="transitDay" value={formData.transitDay} onChange={handleInputChange} placeholder="Day" min="1" max="31" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" name="transitHour" value={formData.transitHour} onChange={handleInputChange} placeholder="Hr" min="0" max="23" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                            <input type="number" name="transitMinute" value={formData.transitMinute} onChange={handleInputChange} placeholder="Min" min="0" max="59" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                          </div>
                        </div>
                      )}
                      {formData.showProgressions && (
                        <div style={{ marginTop: '0.5rem', paddingLeft: '26px' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input type="number" name="progressionYear" value={formData.progressionYear} onChange={handleInputChange} placeholder="Year" style={{ width: '70px', padding: '4px', fontSize: '0.85rem' }} />
                            <input type="number" name="progressionMonth" value={formData.progressionMonth} onChange={handleInputChange} placeholder="Mo" min="1" max="12" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                            <input type="number" name="progressionDay" value={formData.progressionDay} onChange={handleInputChange} placeholder="Day" min="1" max="31" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" name="progressionHour" value={formData.progressionHour} onChange={handleInputChange} placeholder="Hr" min="0" max="23" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                            <input type="number" name="progressionMinute" value={formData.progressionMinute} onChange={handleInputChange} placeholder="Min" min="0" max="59" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                          </div>
                          <small style={{ display: 'block', color: '#666', marginTop: '4px' }}>
                            Day-for-a-year method
                          </small>
                        </div>
                      )}
                    </div>
                )}
                <button
                  className="load-chart-btn"
                  onClick={calculateChartA}
                  disabled={loading}
                  style={{ marginTop: '1rem' }}
                >
                  {loading ? '⏳ Calculating...' : '🔮 Calculate Chart A'}
                </button>
                <button
                  className="load-chart-btn"
                  onClick={clearChartA}
                  style={{ marginTop: '0.5rem', backgroundColor: '#dc3545', borderColor: '#dc3545' }}
                >
                  🗑️ Clear Chart A
                </button>
              </div>
              {chartData && chartData.success && (
                <div className="chart-results">
                  <div className="chart-display">
                    <ChartWheel
                      chartData={chartData}
                      transitData={chartData.transits}
                      progressionsData={chartData.progressions}
                      activeAspects={activeAspects}
                      activeTransitAspects={activeTransitAspects}
                      activeProgressionNatalAspects={activeProgressionNatalAspects}
                      activeTransitProgressionAspects={activeTransitProgressionAspects}
                      onAspectToggle={handleAspectToggle}
                      onTransitAspectToggle={handleTransitAspectToggle}
                      onProgressionNatalAspectToggle={handleProgressionNatalAspectToggle}
                      onTransitProgressionAspectToggle={handleTransitProgressionAspectToggle}
                      showNatalAspects={showNatalAspects}
                      setShowNatalAspects={setShowNatalAspects}
                      natalOrb={natalOrb}
                      onNatalOrbChange={handleNatalOrbChange}
                      displaySettings={displaySettings}
                      transitOrb={transitOrb}
                      onTransitOrbChange={handleTransitOrbChange}
                      progressionNatalOrb={progressionNatalOrb}
                      onProgressionNatalOrbChange={handleProgressionNatalOrbChange}
                      transitTransitOrb={transitTransitOrb}
                      onTransitTransitOrbChange={handleTransitTransitOrbChange}
                      transitProgressionOrb={transitProgressionOrb}
                      onTransitProgressionOrbChange={handleTransitProgressionOrbChange}
                      solarArcNatalOrb={solarArcNatalOrb}
                      onSolarArcNatalOrbChange={handleSolarArcNatalOrbChange}
                      solarArcInternalOrb={solarArcInternalOrb}
                      onSolarArcInternalOrbChange={handleSolarArcInternalOrbChange}
                      directionType={formData.directionType}
                      showProgressions={formData.showProgressions}
              formData={formData}
                    />

                    {/* TimeSlider for Chart A - only show when transits, progressions, or solar arcs are enabled */}
                    {(formData.showTransits || formData.showProgressions) && (
                      <TimeSlider
                        chartData={chartData}
                        formData={formData}
                        setFormData={setFormData}
                        onRecalculate={calculateChart}
                      />
                    )}
                  </div>

                  <AspectTabs
                    chartData={chartData}
                    activeAspects={activeAspects}
                    onAspectToggle={handleAspectToggle}
                    activeTransitAspects={activeTransitAspects}
                    onTransitAspectToggle={handleTransitAspectToggle}
                    activeProgressionNatalAspects={activeProgressionNatalAspects}
                    onProgressionNatalAspectToggle={handleProgressionNatalAspectToggle}
                    activeTransitProgressionAspects={activeTransitProgressionAspects}
                    onTransitProgressionAspectToggle={handleTransitProgressionAspectToggle}
                    activeSynastryAspects={activeSynastryAspects}
                    onSynastryAspectToggle={handleSynastryAspectToggle}
                    showNatalAspects={showNatalAspects}
                    showProgressions={formData.showProgressions}
              formData={formData}
                    directionType={formData.directionType}
                    displaySettings={displaySettings}
                  />
                </div>
              )}
            </div>

            <div className="chart-panel">
              <div className="chart-panel-header chart-b">
                Chart B: {formDataB.name || 'Unnamed Chart'}
              </div>
              <div className="load-chart-section">
                <button
                  className="load-chart-btn"
                  onClick={() => { setActiveChart('B'); setIsBrowserOpen(true); }}
                >
                  📚 Famous Charts
                </button>
                <button
                  className="load-chart-btn"
                  onClick={() => { setActiveChart('B'); setIsLibraryOpen(true); }}
                  style={{ marginLeft: '0.5rem' }}
                >
                  💾 My Library
                </button>

                {/* Chart B Input Form */}
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Name (optional)</label>
                    <input
                      type="text"
                      name="name"
                      value={formDataB.name}
                      onChange={handleInputChangeB}
                      placeholder="Enter name"
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Year *</label>
                      <input
                        type="number"
                        name="year"
                        value={formDataB.year}
                        onChange={handleInputChangeB}
                        required
                        min="500"
                        max="2100"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Month *</label>
                      <input
                        type="number"
                        name="month"
                        value={formDataB.month}
                        onChange={handleInputChangeB}
                        required
                        min="1"
                        max="12"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Day *</label>
                      <input
                        type="number"
                        name="day"
                        value={formDataB.day}
                        onChange={handleInputChangeB}
                        required
                        min="1"
                        max="31"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Hour (0-23)</label>
                      <input
                        type="number"
                        name="hour"
                        value={formDataB.hour}
                        onChange={handleInputChangeB}
                        min="0"
                        max="23"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Minute</label>
                      <input
                        type="number"
                        name="minute"
                        value={formDataB.minute}
                        onChange={handleInputChangeB}
                        min="0"
                        max="59"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formDataB.location}
                      onChange={handleInputChangeB}
                      placeholder="City, State/Country"
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Latitude *</label>
                      <input
                        type="number"
                        name="latitude"
                        value={formDataB.latitude}
                        onChange={handleInputChangeB}
                        step="0.0001"
                        required
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Longitude *</label>
                      <input
                        type="number"
                        name="longitude"
                        value={formDataB.longitude}
                        onChange={handleInputChangeB}
                        step="0.0001"
                        required
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Timezone *</label>
                    <select
                      name="timezone"
                      value={formDataB.timezone}
                      onChange={handleInputChangeB}
                      required
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    >
                      <optgroup label="US Timezones">
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Phoenix">Arizona (no DST)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Anchorage">Alaska Time (AKT)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                      </optgroup>
                      <optgroup label="Europe">
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Europe/Paris">Paris (CET/CEST)</option>
                        <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                        <option value="Europe/Rome">Rome (CET/CEST)</option>
                        <option value="Europe/Athens">Athens (EET/EEST)</option>
                        <option value="Europe/Moscow">Moscow (MSK)</option>
                      </optgroup>
                      <optgroup label="Asia">
                        <option value="Asia/Dubai">Dubai (GST)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                        <option value="Asia/Bangkok">Bangkok (ICT)</option>
                        <option value="Asia/Singapore">Singapore (SGT)</option>
                        <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Seoul">Seoul (KST)</option>
                      </optgroup>
                      <optgroup label="Australia & Pacific">
                        <option value="Australia/Perth">Perth (AWST)</option>
                        <option value="Australia/Adelaide">Adelaide (ACST/ACDT)</option>
                        <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                        <option value="Pacific/Auckland">Auckland (NZST/NZDT)</option>
                      </optgroup>
                      <optgroup label="Americas">
                        <option value="America/Toronto">Toronto (ET)</option>
                        <option value="America/Vancouver">Vancouver (PT)</option>
                        <option value="America/Mexico_City">Mexico City (CST)</option>
                        <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                        <option value="America/Buenos_Aires">Buenos Aires (ART)</option>
                      </optgroup>
                      <optgroup label="Africa & Middle East">
                        <option value="Africa/Cairo">Cairo (EET)</option>
                        <option value="Africa/Johannesburg">Johannesburg (SAST)</option>
                        <option value="Asia/Jerusalem">Jerusalem (IST)</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>House System</label>
                    <select
                      name="houseSystem"
                      value={formDataB.houseSystem}
                      onChange={handleInputChangeB}
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    >
                      <option value="placidus">Placidus</option>
                      <option value="koch">Koch</option>
                      <option value="whole-sign">Whole Sign</option>
                      <option value="equal-house">Equal House</option>
                      <option value="campanus">Campanus</option>
                      <option value="regiomontanus">Regiomontanus</option>
                      <option value="topocentric">Topocentric</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'left' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '0.5rem' }}>
                        <input
                          type="checkbox"
                          name="showTransits"
                          checked={formDataB.showTransits}
                          onChange={handleInputChangeB}
                          style={{ marginRight: '8px', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Show Transits (Bi-Wheel)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '0.5rem' }}>
                        <input
                          type="checkbox"
                          name="showProgressions"
                          checked={formDataB.showProgressions}
                          onChange={handleInputChangeB}
                          style={{ marginRight: '8px', width: '18px', height: '18px' }}
                        />
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Show Progressions (Bi-Wheel)</span>
                      </label>
                      {formDataB.showTransits && (
                        <div style={{ marginTop: '0.5rem', paddingLeft: '26px' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input type="number" name="transitYear" value={formDataB.transitYear} onChange={handleInputChangeB} placeholder="Year" style={{ width: '70px', padding: '4px', fontSize: '0.85rem' }} />
                            <input type="number" name="transitMonth" value={formDataB.transitMonth} onChange={handleInputChangeB} placeholder="Mo" min="1" max="12" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                            <input type="number" name="transitDay" value={formDataB.transitDay} onChange={handleInputChangeB} placeholder="Day" min="1" max="31" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" name="transitHour" value={formDataB.transitHour} onChange={handleInputChangeB} placeholder="Hr" min="0" max="23" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                            <input type="number" name="transitMinute" value={formDataB.transitMinute} onChange={handleInputChangeB} placeholder="Min" min="0" max="59" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                          </div>
                        </div>
                      )}
                      {formDataB.showProgressions && (
                        <div style={{ marginTop: '0.5rem', paddingLeft: '26px' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <input type="number" name="progressionYear" value={formDataB.progressionYear} onChange={handleInputChangeB} placeholder="Year" style={{ width: '70px', padding: '4px', fontSize: '0.85rem' }} />
                            <input type="number" name="progressionMonth" value={formDataB.progressionMonth} onChange={handleInputChangeB} placeholder="Mo" min="1" max="12" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                            <input type="number" name="progressionDay" value={formDataB.progressionDay} onChange={handleInputChangeB} placeholder="Day" min="1" max="31" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" name="progressionHour" value={formDataB.progressionHour} onChange={handleInputChangeB} placeholder="Hr" min="0" max="23" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                            <input type="number" name="progressionMinute" value={formDataB.progressionMinute} onChange={handleInputChangeB} placeholder="Min" min="0" max="59" style={{ width: '50px', padding: '4px', fontSize: '0.85rem' }} />
                          </div>
                          <small style={{ display: 'block', color: '#666', marginTop: '4px' }}>
                            Day-for-a-year method
                          </small>
                        </div>
                      )}
                    </div>
                <button
                  className="load-chart-btn"
                  onClick={calculateChartB}
                  disabled={loadingB}
                  style={{ marginTop: '1rem' }}
                >
                  {loadingB ? '⏳ Calculating...' : '🔮 Calculate Chart B'}
                </button>
                <button
                  className="load-chart-btn"
                  onClick={clearChartB}
                  style={{ marginTop: '0.5rem', backgroundColor: '#dc3545', borderColor: '#dc3545' }}
                >
                  🗑️ Clear Chart B
                </button>
              </div>
              {chartDataB && chartDataB.success && (
                <div className="chart-results">
                  <div className="chart-display">
                    <ChartWheel
                      chartData={chartDataB}
                      transitData={chartDataB.transits}
                      progressionsData={chartDataB.progressions}
                      activeAspects={activeAspectsB}
                      activeTransitAspects={activeTransitAspectsB}
                      activeProgressionNatalAspects={activeProgressionNatalAspectsB}
                      activeTransitProgressionAspects={activeTransitProgressionAspectsB}
                      onAspectToggle={handleAspectToggleB}
                      onTransitAspectToggle={handleTransitAspectToggleB}
                      onProgressionNatalAspectToggle={handleProgressionNatalAspectToggleB}
                      onTransitProgressionAspectToggle={handleTransitProgressionAspectToggleB}
                      showNatalAspects={showNatalAspectsB}
                      setShowNatalAspects={setShowNatalAspectsB}
                      natalOrb={natalOrb}
                      onNatalOrbChange={handleNatalOrbChangeB}
                      displaySettings={displaySettings}
                      transitOrb={transitOrb}
                      onTransitOrbChange={handleTransitOrbChangeB}
                      progressionNatalOrb={progressionNatalOrb}
                      onProgressionNatalOrbChange={handleProgressionNatalOrbChangeB}
                      transitTransitOrb={transitTransitOrb}
                      onTransitTransitOrbChange={handleTransitTransitOrbChangeB}
                      transitProgressionOrb={transitProgressionOrb}
                      onTransitProgressionOrbChange={handleTransitProgressionOrbChangeB}
                      solarArcNatalOrb={solarArcNatalOrb}
                      onSolarArcNatalOrbChange={handleSolarArcNatalOrbChange}
                      solarArcInternalOrb={solarArcInternalOrb}
                      onSolarArcInternalOrbChange={handleSolarArcInternalOrbChange}
                      directionType={formDataB.directionType}
                      showProgressions={formDataB.showProgressions}
                    />

                    {/* TimeSlider for Chart B - only show when transits, progressions, or solar arcs are enabled */}
                    {(formDataB.showTransits || formDataB.showProgressions) && (
                      <TimeSlider
                        chartData={chartDataB}
                        formData={formDataB}
                        setFormData={setFormDataB}
                        onRecalculate={(e) => calculateChartB()}
                      />
                    )}
                  </div>

                  <AspectTabs
                    chartData={chartDataB}
                    activeAspects={activeAspectsB}
                    onAspectToggle={handleAspectToggleB}
                    activeTransitAspects={activeTransitAspectsB}
                    onTransitAspectToggle={handleTransitAspectToggleB}
                    activeProgressionNatalAspects={activeProgressionNatalAspectsB}
                    onProgressionNatalAspectToggle={handleProgressionNatalAspectToggleB}
                    activeTransitProgressionAspects={activeTransitProgressionAspectsB}
                    onTransitProgressionAspectToggle={handleTransitProgressionAspectToggleB}
                    activeSynastryAspects={activeSynastryAspects}
                    onSynastryAspectToggle={handleSynastryAspectToggle}
                    showNatalAspects={showNatalAspectsB}
                    showProgressions={formDataB.showProgressions}
                    directionType={formDataB.directionType}
                    displaySettings={displaySettings}
                  />
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'relationship' ? (
          <div className="relationship-container">
            <h2>Relationship Chart</h2>

            <div className="relationship-options">
              <div className="chart-type-selector">
                <label>
                  <input
                    type="radio"
                    name="relationshipChartType"
                    value="synastry"
                    checked={relationshipChartType === 'synastry'}
                    onChange={(e) => setRelationshipChartType(e.target.value)}
                  />
                  <span>Synastry (Bi-Wheel)</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="relationshipChartType"
                    value="composite"
                    checked={relationshipChartType === 'composite'}
                    onChange={(e) => setRelationshipChartType(e.target.value)}
                  />
                  <span>Composite (Midpoint Chart)</span>
                </label>
              </div>

              {relationshipChartType === 'composite' && (
                <div className="composite-options">
                  <div className="option-group">
                    <label>Location for Composite Chart:</label>
                    <select
                      value={relationshipLocation}
                      onChange={(e) => setRelationshipLocation(e.target.value)}
                    >
                      <option value="midpoint">Geographic Midpoint</option>
                      <option value="personA">Person A's Location</option>
                    </select>
                  </div>

                  <div className="option-group">
                    <label>House/Time Calculation:</label>
                    <select
                      value={relationshipHouseMethod}
                      onChange={(e) => setRelationshipHouseMethod(e.target.value)}
                    >
                      <option value="personA">Person A's Time</option>
                      <option value="midpoint">Midpoint Time</option>
                    </select>
                  </div>

                  <div className="option-group" style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={showCompositeTransits}
                        onChange={(e) => setShowCompositeTransits(e.target.checked)}
                      />
                      <span>Show Transits to Composite (Bi-Wheel)</span>
                    </label>
                  </div>

                  {showCompositeTransits && (
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Transit Date/Time</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.85rem' }}>Month</label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={compositeTransitDate.month}
                            onChange={(e) => setCompositeTransitDate({...compositeTransitDate, month: e.target.value})}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem' }}>Day</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={compositeTransitDate.day}
                            onChange={(e) => setCompositeTransitDate({...compositeTransitDate, day: e.target.value})}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem' }}>Year</label>
                          <input
                            type="number"
                            min="1900"
                            max="2100"
                            value={compositeTransitDate.year}
                            onChange={(e) => setCompositeTransitDate({...compositeTransitDate, year: e.target.value})}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <div>
                          <label style={{ fontSize: '0.85rem' }}>Hour (0-23)</label>
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={compositeTransitDate.hour}
                            onChange={(e) => setCompositeTransitDate({...compositeTransitDate, hour: e.target.value})}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.85rem' }}>Minute</label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={compositeTransitDate.minute}
                            onChange={(e) => setCompositeTransitDate({...compositeTransitDate, minute: e.target.value})}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="dual-charts-container">
              <div className="chart-panel">
                <div className="chart-panel-header chart-a">
                  Person A: {formData.name || 'Unnamed'}
                </div>
                <div className="load-chart-section">
                  <button
                    className="load-chart-btn"
                    onClick={() => { setActiveChart('A'); setIsBrowserOpen(true); }}
                  >
                    📚 Famous Charts
                  </button>
                  <button
                    className="load-chart-btn"
                    onClick={() => { setActiveChart('A'); setIsLibraryOpen(true); }}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    💾 My Library
                  </button>
                </div>

                <p style={{ fontSize: '0.9em', fontStyle: 'italic', color: '#666', marginBottom: '1rem' }}>
                  Enter birth data for Person A (inner ring in synastry)
                </p>

                <div style={{ padding: '1rem', border: '2px solid #e0e0e0', borderRadius: '8px' }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Person A"
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Year *</label>
                      <input
                        type="number"
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        required
                        min="500"
                        max="2100"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Month *</label>
                      <input
                        type="number"
                        name="month"
                        value={formData.month}
                        onChange={handleInputChange}
                        required
                        min="1"
                        max="12"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Day *</label>
                      <input
                        type="number"
                        name="day"
                        value={formData.day}
                        onChange={handleInputChange}
                        required
                        min="1"
                        max="31"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Hour (0-23)</label>
                      <input
                        type="number"
                        name="hour"
                        value={formData.hour}
                        onChange={handleInputChange}
                        min="0"
                        max="23"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Minute</label>
                      <input
                        type="number"
                        name="minute"
                        value={formData.minute}
                        onChange={handleInputChange}
                        min="0"
                        max="59"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="City, State/Country"
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    />
                    <button
                      type="button"
                      onClick={searchLocation}
                      disabled={searchingLocation}
                      style={{ marginTop: '0.5rem', padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      {searchingLocation ? '🔍 Searching...' : '🔍 Search'}
                    </button>

                    {locationResults.length > 0 && (
                      <div className="location-results" style={{ marginTop: '0.5rem' }}>
                        <div className="location-results-header">
                          Select a location:
                        </div>
                        {locationResults.map((result, index) => (
                          <div
                            key={index}
                            className="location-result-item"
                            onClick={() => selectLocation(result)}
                          >
                            <div className="location-name">{result.display_name}</div>
                            <div className="location-coords">
                              {parseFloat(result.lat).toFixed(4)}°, {parseFloat(result.lon).toFixed(4)}°
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Latitude *</label>
                      <input
                        type="number"
                        step="any"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        required
                        placeholder="40.7128"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Longitude *</label>
                      <input
                        type="number"
                        step="any"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        required
                        placeholder="-74.0060"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Timezone *</label>
                    <select
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleInputChange}
                      required
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    >
                      <optgroup label="US Timezones">
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Phoenix">Arizona (no DST)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Anchorage">Alaska Time (AKT)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                      </optgroup>
                      <optgroup label="Europe">
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Europe/Paris">Paris (CET/CEST)</option>
                        <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                        <option value="Europe/Rome">Rome (CET/CEST)</option>
                        <option value="Europe/Athens">Athens (EET/EEST)</option>
                        <option value="Europe/Moscow">Moscow (MSK)</option>
                      </optgroup>
                      <optgroup label="Asia">
                        <option value="Asia/Dubai">Dubai (GST)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                        <option value="Asia/Bangkok">Bangkok (ICT)</option>
                        <option value="Asia/Singapore">Singapore (SGT)</option>
                        <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Seoul">Seoul (KST)</option>
                      </optgroup>
                      <optgroup label="Australia & Pacific">
                        <option value="Australia/Perth">Perth (AWST)</option>
                        <option value="Australia/Adelaide">Adelaide (ACST/ACDT)</option>
                        <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                        <option value="Pacific/Auckland">Auckland (NZST/NZDT)</option>
                      </optgroup>
                      <optgroup label="Americas">
                        <option value="America/Toronto">Toronto (ET)</option>
                        <option value="America/Vancouver">Vancouver (PT)</option>
                        <option value="America/Mexico_City">Mexico City (CST)</option>
                        <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                        <option value="America/Buenos_Aires">Buenos Aires (ART)</option>
                      </optgroup>
                      <optgroup label="Africa & Middle East">
                        <option value="Africa/Cairo">Cairo (EET)</option>
                        <option value="Africa/Johannesburg">Johannesburg (SAST)</option>
                        <option value="Asia/Jerusalem">Jerusalem (IST)</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>House System</label>
                    <select
                      name="houseSystem"
                      value={formData.houseSystem}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    >
                      <option value="placidus">Placidus</option>
                      <option value="koch">Koch</option>
                      <option value="whole-sign">Whole Sign</option>
                      <option value="equal-house">Equal House</option>
                      <option value="campanus">Campanus</option>
                      <option value="regiomontanus">Regiomontanus</option>
                      <option value="topocentric">Topocentric</option>
                    </select>
                  </div>
                </div>

                <button
                  className="load-chart-btn"
                  onClick={calculateChartA}
                  disabled={loading}
                  style={{ marginTop: '1rem' }}
                >
                  {loading ? '⏳ Calculating...' : '🔮 Calculate Person A'}
                </button>
                <button
                  className="load-chart-btn"
                  onClick={clearChartA}
                  style={{ marginTop: '0.5rem', backgroundColor: '#dc3545', borderColor: '#dc3545' }}
                >
                  🗑️ Clear Person A
                </button>
              </div>

              <div className="chart-panel">
                <div className="chart-panel-header chart-b">
                  Person B: {formDataB.name || 'Unnamed'}
                </div>
                <div className="load-chart-section">
                  <button
                    className="load-chart-btn"
                    onClick={() => { setActiveChart('B'); setIsBrowserOpen(true); }}
                  >
                    📚 Famous Charts
                  </button>
                  <button
                    className="load-chart-btn"
                    onClick={() => { setActiveChart('B'); setIsLibraryOpen(true); }}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    💾 My Library
                  </button>
                </div>

                <p style={{ fontSize: '0.9em', fontStyle: 'italic', color: '#666', marginBottom: '1rem' }}>
                  Enter birth data for Person B (outer ring in synastry)
                </p>

                <div style={{ padding: '1rem', border: '2px solid #e0e0e0', borderRadius: '8px' }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formDataB.name}
                      onChange={handleInputChangeB}
                      placeholder="Person B"
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Year *</label>
                      <input
                        type="number"
                        name="year"
                        value={formDataB.year}
                        onChange={handleInputChangeB}
                        required
                        min="500"
                        max="2100"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Month *</label>
                      <input
                        type="number"
                        name="month"
                        value={formDataB.month}
                        onChange={handleInputChangeB}
                        required
                        min="1"
                        max="12"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Day *</label>
                      <input
                        type="number"
                        name="day"
                        value={formDataB.day}
                        onChange={handleInputChangeB}
                        required
                        min="1"
                        max="31"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Hour (0-23)</label>
                      <input
                        type="number"
                        name="hour"
                        value={formDataB.hour}
                        onChange={handleInputChangeB}
                        min="0"
                        max="23"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Minute</label>
                      <input
                        type="number"
                        name="minute"
                        value={formDataB.minute}
                        onChange={handleInputChangeB}
                        min="0"
                        max="59"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formDataB.location}
                      onChange={handleInputChangeB}
                      placeholder="City, State/Country"
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    />
                    <button
                      type="button"
                      onClick={searchLocationB}
                      disabled={searchingLocation}
                      style={{ marginTop: '0.5rem', padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      {searchingLocation ? '🔍 Searching...' : '🔍 Search'}
                    </button>

                    {locationResults.length > 0 && (
                      <div className="location-results" style={{ marginTop: '0.5rem' }}>
                        <div className="location-results-header">
                          Select a location:
                        </div>
                        {locationResults.map((result, index) => (
                          <div
                            key={index}
                            className="location-result-item"
                            onClick={() => selectLocationB(result)}
                          >
                            <div className="location-name">{result.display_name}</div>
                            <div className="location-coords">
                              {parseFloat(result.lat).toFixed(4)}°, {parseFloat(result.lon).toFixed(4)}°
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Latitude *</label>
                      <input
                        type="number"
                        step="any"
                        name="latitude"
                        value={formDataB.latitude}
                        onChange={handleInputChangeB}
                        required
                        placeholder="40.7128"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Longitude *</label>
                      <input
                        type="number"
                        step="any"
                        name="longitude"
                        value={formDataB.longitude}
                        onChange={handleInputChangeB}
                        required
                        placeholder="-74.0060"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Timezone *</label>
                    <select
                      name="timezone"
                      value={formDataB.timezone}
                      onChange={handleInputChangeB}
                      required
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    >
                      <optgroup label="US Timezones">
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Phoenix">Arizona (no DST)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Anchorage">Alaska Time (AKT)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                      </optgroup>
                      <optgroup label="Europe">
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Europe/Paris">Paris (CET/CEST)</option>
                        <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                        <option value="Europe/Rome">Rome (CET/CEST)</option>
                        <option value="Europe/Athens">Athens (EET/EEST)</option>
                        <option value="Europe/Moscow">Moscow (MSK)</option>
                      </optgroup>
                      <optgroup label="Asia">
                        <option value="Asia/Dubai">Dubai (GST)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                        <option value="Asia/Bangkok">Bangkok (ICT)</option>
                        <option value="Asia/Singapore">Singapore (SGT)</option>
                        <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Seoul">Seoul (KST)</option>
                      </optgroup>
                      <optgroup label="Australia & Pacific">
                        <option value="Australia/Perth">Perth (AWST)</option>
                        <option value="Australia/Adelaide">Adelaide (ACST/ACDT)</option>
                        <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                        <option value="Pacific/Auckland">Auckland (NZST/NZDT)</option>
                      </optgroup>
                      <optgroup label="Americas">
                        <option value="America/Toronto">Toronto (ET)</option>
                        <option value="America/Vancouver">Vancouver (PT)</option>
                        <option value="America/Mexico_City">Mexico City (CST)</option>
                        <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                        <option value="America/Buenos_Aires">Buenos Aires (ART)</option>
                      </optgroup>
                      <optgroup label="Africa & Middle East">
                        <option value="Africa/Cairo">Cairo (EET)</option>
                        <option value="Africa/Johannesburg">Johannesburg (SAST)</option>
                        <option value="Asia/Jerusalem">Jerusalem (IST)</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>House System</label>
                    <select
                      name="houseSystem"
                      value={formDataB.houseSystem}
                      onChange={handleInputChangeB}
                      style={{ width: '100%', padding: '6px', fontSize: '0.9rem' }}
                    >
                      <option value="placidus">Placidus</option>
                      <option value="koch">Koch</option>
                      <option value="whole-sign">Whole Sign</option>
                      <option value="equal-house">Equal House</option>
                      <option value="campanus">Campanus</option>
                      <option value="regiomontanus">Regiomontanus</option>
                      <option value="topocentric">Topocentric</option>
                    </select>
                  </div>
                </div>

                <button
                  className="load-chart-btn"
                  onClick={calculateChartB}
                  disabled={loadingB}
                  style={{ marginTop: '1rem' }}
                >
                  {loadingB ? '⏳ Calculating...' : '🔮 Calculate Person B'}
                </button>
                <button
                  className="load-chart-btn"
                  onClick={clearChartB}
                  style={{ marginTop: '0.5rem', backgroundColor: '#dc3545', borderColor: '#dc3545' }}
                >
                  🗑️ Clear Person B
                </button>
              </div>
            </div>

            {/* Display relationship chart and aspects when both charts are calculated */}
            {chartData && chartData.success && chartDataB && chartDataB.success && (
              <div className="relationship-results">
                <h3>{relationshipChartType === 'synastry' ? 'Synastry Chart' : 'Composite Chart'}</h3>
                <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '1rem' }}>
                  {relationshipChartType === 'synastry'
                    ? 'Bi-wheel showing Person A (inner) and Person B (outer) with synastry aspects'
                    : 'Composite chart calculated from midpoints of Person A and Person B'}
                </p>

                {relationshipChartType === 'synastry' ? (
                  <div className="chart-display">
                    <ChartWheel
                      isSynastry={true}
                      chartData={chartData}
                      chartDataB={chartDataB}
                      transitData={{ planets: chartDataB.planets }}
                      activeAspects={activeAspects}
                      onAspectToggle={handleAspectToggle}
                      activeAspectsB={activeAspectsB}
                      onAspectToggleB={handleAspectToggleB}
                      activeTransitAspects={activeSynastryAspects}
                      onTransitAspectToggle={handleSynastryAspectToggle}
                      activeProgressionNatalAspects={new Set()}
                      onProgressionNatalAspectToggle={() => {}}
                      activeTransitProgressionAspects={new Set()}
                      onTransitProgressionAspectToggle={() => {}}
                      showNatalAspects={showNatalAspects}
                      setShowNatalAspects={setShowNatalAspects}
                      showNatalAspectsB={showNatalAspectsB}
                      setShowNatalAspectsB={setShowNatalAspectsB}
                      natalOrb={natalOrb}
                      onNatalOrbChange={handleNatalOrbChange}
                      displaySettings={displaySettings}
                      transitOrb={synastryOrb}
                      onTransitOrbChange={handleSynastryOrbChange}
                      progressionNatalOrb={8}
                      onProgressionNatalOrbChange={() => {}}
                      transitTransitOrb={8}
                      onTransitTransitOrbChange={() => {}}
                      transitProgressionOrb={8}
                      onTransitProgressionOrbChange={() => {}}
                      solarArcNatalOrb={solarArcNatalOrb}
                      onSolarArcNatalOrbChange={handleSolarArcNatalOrbChange}
                      solarArcInternalOrb={solarArcInternalOrb}
                      onSolarArcInternalOrbChange={handleSolarArcInternalOrbChange}
                      directionType={formData.directionType}
                      showProgressions={false}
                      personAName={formData.name || 'Person A'}
                      personBName={formDataB.name || 'Person B'}
                    />
                  </div>
                ) : loadingComposite ? (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>⏳ Calculating composite chart...</p>
                  </div>
                ) : compositeChartData && compositeChartData.success ? (
                  <div className="chart-display">
                    <ChartWheel
                      isComposite={true}
                      chartData={compositeChartData}
                      transitData={showCompositeTransits && compositeChartData.transits ? compositeChartData.transits : null}
                      activeAspects={activeAspects}
                      onAspectToggle={handleAspectToggle}
                      activeTransitAspects={activeTransitAspects}
                      onTransitAspectToggle={handleTransitAspectToggle}
                      activeProgressionNatalAspects={new Set()}
                      onProgressionNatalAspectToggle={() => {}}
                      activeTransitProgressionAspects={new Set()}
                      onTransitProgressionAspectToggle={() => {}}
                      showNatalAspects={showNatalAspects}
                      setShowNatalAspects={setShowNatalAspects}
                      natalOrb={natalOrb}
                      onNatalOrbChange={handleNatalOrbChange}
                      displaySettings={displaySettings}
                      transitOrb={transitOrb}
                      onTransitOrbChange={handleTransitOrbChange}
                      progressionNatalOrb={8}
                      onProgressionNatalOrbChange={() => {}}
                      transitTransitOrb={transitTransitOrb}
                      onTransitTransitOrbChange={handleTransitTransitOrbChange}
                      transitProgressionOrb={8}
                      onTransitProgressionOrbChange={() => {}}
                      solarArcNatalOrb={solarArcNatalOrb}
                      onSolarArcNatalOrbChange={handleSolarArcNatalOrbChange}
                      solarArcInternalOrb={solarArcInternalOrb}
                      onSolarArcInternalOrbChange={handleSolarArcInternalOrbChange}
                      directionType={formData.directionType}
                      showProgressions={false}
                    />
                    <AspectTabs
                      isComposite={true}
                      chartData={compositeChartData}
                      activeAspects={activeAspects}
                      onAspectToggle={handleAspectToggle}
                      activeTransitAspects={activeTransitAspects}
                      onTransitAspectToggle={handleTransitAspectToggle}
                      activeProgressionNatalAspects={new Set()}
                      onProgressionNatalAspectToggle={() => {}}
                      activeTransitProgressionAspects={new Set()}
                      onTransitProgressionAspectToggle={() => {}}
                      activeSynastryAspects={new Set()}
                      onSynastryAspectToggle={() => {}}
                      showNatalAspects={showNatalAspects}
                      showProgressions={false}
                      directionType={formData.directionType}
                      displaySettings={displaySettings}
                    />
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    <p>Calculate both Person A and Person B charts to see the composite chart</p>
                  </div>
                )}

                {/* Aspect matrices */}
                {relationshipChartType === 'synastry' && (
                  <div className="synastry-aspect-matrices">
                    <h4>Aspect Matrices</h4>

                    <AspectTabs
                      viewMode={viewMode}
                      chartData={chartData}
                      chartDataB={chartDataB}
                      activeAspects={activeAspects}
                      onAspectToggle={handleAspectToggle}
                      activeAspectsB={activeAspectsB}
                      onAspectToggleB={handleAspectToggleB}
                      activeTransitAspects={activeTransitAspects}
                      onTransitAspectToggle={handleTransitAspectToggle}
                      activeProgressionNatalAspects={activeProgressionNatalAspects}
                      onProgressionNatalAspectToggle={handleProgressionNatalAspectToggle}
                      activeTransitProgressionAspects={activeTransitProgressionAspects}
                      onTransitProgressionAspectToggle={handleTransitProgressionAspectToggle}
                      activeSynastryAspects={activeSynastryAspects}
                      onSynastryAspectToggle={handleSynastryAspectToggle}
                      showNatalAspects={showNatalAspects}
                      showProgressions={false}
                      directionType={formData.directionType}
                      formData={formData}
                      formDataB={formDataB}
                      displaySettings={displaySettings}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : viewMode === 'returns' ? (
          <div className="returns-mode">
            <h2>🔄 Solar & Lunar Returns</h2>
            <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '1.5rem' }}>
              Calculate Solar Returns (annual forecast) or Lunar Returns (monthly forecast) to see timing for the upcoming period.
            </p>

            {/* Return Type Selector */}
            <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ marginTop: 0 }}>Return Type</h3>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="returnType"
                    value="solar"
                    checked={returnType === 'solar'}
                    onChange={(e) => setReturnType(e.target.value)}
                  />
                  <span>🌞 Solar Return (Annual)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="returnType"
                    value="lunar"
                    checked={returnType === 'lunar'}
                    onChange={(e) => setReturnType(e.target.value)}
                  />
                  <span>🌙 Lunar Return (Monthly)</span>
                </label>
              </div>
              <p style={{ fontSize: '0.85em', color: '#666', margin: '0.5rem 0 0 0' }}>
                {returnType === 'solar'
                  ? 'Solar Return: Cast for when Sun returns to its exact natal position (your birthday). Shows themes for the year ahead.'
                  : 'Lunar Return: Cast for when Moon returns to its exact natal position (monthly). Shows themes for the month ahead.'}
              </p>
            </div>

            <form onSubmit={calculateReturn} className="chart-form">
              {/* Natal Birth Data Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h3>Natal Birth Data</h3>

                <div className="form-group">
                  <label>Name (optional)</label>
                  <input
                    type="text"
                    name="name"
                    value={returnsFormData.name}
                    onChange={handleReturnsInputChange}
                    placeholder="Enter name"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Year *</label>
                    <input
                      type="number"
                      name="year"
                      value={returnsFormData.year}
                      onChange={handleReturnsInputChange}
                      required
                      min="500"
                      max="2100"
                    />
                  </div>
                  <div className="form-group">
                    <label>Month *</label>
                    <input
                      type="number"
                      name="month"
                      value={returnsFormData.month}
                      onChange={handleReturnsInputChange}
                      required
                      min="1"
                      max="12"
                    />
                  </div>
                  <div className="form-group">
                    <label>Day *</label>
                    <input
                      type="number"
                      name="day"
                      value={returnsFormData.day}
                      onChange={handleReturnsInputChange}
                      required
                      min="1"
                      max="31"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Hour (0-23) *</label>
                    <input
                      type="number"
                      name="hour"
                      value={returnsFormData.hour}
                      onChange={handleReturnsInputChange}
                      required
                      min="0"
                      max="23"
                    />
                  </div>
                  <div className="form-group">
                    <label>Minute *</label>
                    <input
                      type="number"
                      name="minute"
                      value={returnsFormData.minute}
                      onChange={handleReturnsInputChange}
                      required
                      min="0"
                      max="59"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Birth Location *</label>
                  <div className="location-search-group">
                    <input
                      type="text"
                      name="location"
                      value={returnsFormData.location}
                      onChange={handleReturnsInputChange}
                      placeholder="Enter birth location"
                      required
                    />
                    <button
                      type="button"
                      onClick={searchReturnsBirthLocation}
                      disabled={searchingReturnsBirthLocation}
                      className="search-btn"
                    >
                      {searchingReturnsBirthLocation ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {returnsBirthLocationResults.length > 0 && (
                    <div className="location-results">
                      {returnsBirthLocationResults.map((result, index) => (
                        <div
                          key={index}
                          className="location-result-item"
                          onClick={() => selectReturnsBirthLocation(result)}
                        >
                          <div className="location-name">{result.display_name}</div>
                          <div className="location-coords">
                            Lat: {parseFloat(result.lat).toFixed(4)}, Lon: {parseFloat(result.lon).toFixed(4)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {returnsFormData.latitude && returnsFormData.longitude && (
                    <div style={{ fontSize: '0.85em', color: '#28a745', marginTop: '0.5rem' }}>
                      ✓ Location set: {parseFloat(returnsFormData.latitude).toFixed(4)}°, {parseFloat(returnsFormData.longitude).toFixed(4)}°
                    </div>
                  )}
                </div>
              </div>

              {/* Return Parameters Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h3>{returnType === 'solar' ? 'Solar' : 'Lunar'} Return Parameters</h3>

                {returnType === 'solar' ? (
                  <div className="form-group">
                    <label>Return Year *</label>
                    <input
                      type="number"
                      name="returnYear"
                      value={returnsFormData.returnYear}
                      onChange={handleReturnsInputChange}
                      required
                      min="1900"
                      max="2100"
                      placeholder={`e.g., ${new Date().getFullYear()}`}
                    />
                    <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                      Year for which to calculate the Solar Return
                    </small>
                  </div>
                ) : (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Month *</label>
                      <input
                        type="number"
                        name="returnMonth"
                        value={returnsFormData.returnMonth}
                        onChange={handleReturnsInputChange}
                        required
                        min="1"
                        max="12"
                      />
                    </div>
                    <div className="form-group">
                      <label>Year *</label>
                      <input
                        type="number"
                        name="returnYear"
                        value={returnsFormData.returnYear}
                        onChange={handleReturnsInputChange}
                        required
                        min="1900"
                        max="2100"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Return Location Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h3>Return Location</h3>
                <div className="form-group">
                  <label>Location *</label>
                  <div className="location-search-group">
                    <input
                      type="text"
                      name="returnLocation"
                      value={returnsFormData.returnLocation}
                      onChange={handleReturnsInputChange}
                      placeholder="Where you'll be during the return"
                      required
                    />
                    <button
                      type="button"
                      onClick={searchReturnsReturnLocation}
                      disabled={searchingReturnsReturnLocation}
                      className="search-btn"
                    >
                      {searchingReturnsReturnLocation ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {returnsReturnLocationResults.length > 0 && (
                    <div className="location-results">
                      {returnsReturnLocationResults.map((result, index) => (
                        <div
                          key={index}
                          className="location-result-item"
                          onClick={() => selectReturnsReturnLocation(result)}
                        >
                          <div className="location-name">{result.display_name}</div>
                          <div className="location-coords">
                            Lat: {parseFloat(result.lat).toFixed(4)}, Lon: {parseFloat(result.lon).toFixed(4)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {returnsFormData.returnLatitude && returnsFormData.returnLongitude && (
                    <div style={{ fontSize: '0.85em', color: '#28a745', marginTop: '0.5rem' }}>
                      ✓ Location set: {parseFloat(returnsFormData.returnLatitude).toFixed(4)}°, {parseFloat(returnsFormData.returnLongitude).toFixed(4)}°
                    </div>
                  )}
                  <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                    Enter the location where you will be when the {returnType === 'solar' ? 'Sun' : 'Moon'} returns to its natal position
                  </small>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingReturn}
                style={{
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                  backgroundColor: loadingReturn ? '#ccc' : (returnType === 'solar' ? '#f39c12' : '#95a5a6'),
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loadingReturn ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {loadingReturn ? 'Calculating...' : `Calculate ${returnType === 'solar' ? 'Solar' : 'Lunar'} Return`}
              </button>
            </form>

            {/* Chart display area */}
            {returnChartData && returnChartData.success && (
              <div style={{ marginTop: '2rem' }}>
                <h3>
                  {returnType === 'solar' ? '🌞 Solar' : '🌙 Lunar'} Return Chart
                  {returnChartData.returnDatetime && (
                    <span style={{ fontSize: '0.85em', fontWeight: 'normal', color: '#666', marginLeft: '1rem' }}>
                      Exact return: {new Date(returnChartData.returnDatetime).toLocaleString()}
                    </span>
                  )}
                </h3>

                <div className="chart-display">
                  <ChartWheel
                    chartData={returnChartData.natalChart}
                    chartDataB={returnChartData}
                    transitData={{ planets: returnChartData.planets }}
                    isSynastry={true}
                    activeAspects={new Set()}
                    onAspectToggle={() => {}}
                    activeTransitAspects={new Set()}
                    onTransitAspectToggle={() => {}}
                    showNatalAspects={false}
                    setShowNatalAspects={setShowNatalAspects}
                    showNatalAspectsB={false}
                    setShowNatalAspectsB={setShowNatalAspectsB}
                    isReturnChart={true}
                    returnType={returnType}
                    natalOrb={natalOrb}
                    onNatalOrbChange={handleNatalOrbChange}
                    displaySettings={displaySettings}
                    transitOrb={returnNatalOrb}
                    onTransitOrbChange={handleReturnNatalOrbChange}
                    returnInternalOrb={returnInternalOrb}
                    onReturnInternalOrbChange={handleReturnInternalOrbChange}
                    solarArcNatalOrb={solarArcNatalOrb}
                    onSolarArcNatalOrbChange={handleSolarArcNatalOrbChange}
                    solarArcInternalOrb={solarArcInternalOrb}
                    onSolarArcInternalOrbChange={handleSolarArcInternalOrbChange}
                    directionType={formData.directionType}
                  />
                </div>

                {/* Aspect Matrices Section */}
                <div className="aspect-tabs-container" style={{ marginTop: '2rem' }}>
                  <div className="aspect-tabs-header">
                    <button
                      className={`aspect-tab ${activeReturnsAspectTab === 'natal' ? 'active' : ''}`}
                      onClick={() => setActiveReturnsAspectTab('natal')}
                    >
                      ⭐ Natal Aspects
                    </button>
                    <button
                      className={`aspect-tab ${activeReturnsAspectTab === 'return-natal' ? 'active' : ''}`}
                      onClick={() => setActiveReturnsAspectTab('return-natal')}
                    >
                      {returnType === 'solar' ? '🌞' : '🌙'} Return-to-Natal Aspects
                    </button>
                    <button
                      className={`aspect-tab ${activeReturnsAspectTab === 'return' ? 'active' : ''}`}
                      onClick={() => setActiveReturnsAspectTab('return')}
                    >
                      {returnType === 'solar' ? '🌞' : '🌙'} Return Aspects
                    </button>
                  </div>

                  <div className="aspect-tabs-content">
                    {activeReturnsAspectTab === 'natal' && returnChartData.natalChart && returnChartData.natalChart.aspects && returnChartData.natalChart.aspects.length > 0 && (
                      <AspectMatrix
                        chartData={returnChartData.natalChart}
                        activeAspects={activeAspects}
                        onAspectToggle={handleAspectToggle}
                      />
                    )}

                    {activeReturnsAspectTab === 'return-natal' && returnChartData.returnToNatalAspects && returnChartData.returnToNatalAspects.length > 0 && (
                      <ReturnAspectMatrix
                        chartData={returnChartData}
                        activeReturnAspects={activeReturnAspects}
                        onReturnAspectToggle={handleReturnAspectToggle}
                        returnType={returnType}
                      />
                    )}

                    {activeReturnsAspectTab === 'return' && returnChartData.aspects && returnChartData.aspects.length > 0 && (
                      <AspectMatrix
                        chartData={returnChartData}
                        activeAspects={activeReturnInternalAspects}
                        onAspectToggle={handleReturnInternalAspectToggle}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {returnChartData && !returnChartData.success && (
              <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8d7da', borderRadius: '8px', color: '#721c24' }}>
                <strong>Error:</strong> {returnChartData.error}
              </div>
            )}
          </div>
        ) : viewMode === 'horary' ? (
          <div className="horary-mode">
            <h2>🔮 Horary Astrology</h2>
            <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '1.5rem' }}>
              Cast a chart for the exact moment a question is asked. The chart represents the question and contains the answer.
              Based on the classical methods of William Lilly.
            </p>

            <form onSubmit={calculateChart} className="chart-form">
              <div className="form-group">
                <label>Your Question *</label>
                <textarea
                  value={horaryQuestion}
                  onChange={(e) => setHoraryQuestion(e.target.value)}
                  placeholder="Enter your horary question (be specific and sincere)"
                  required
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontFamily: 'inherit'
                  }}
                />
                <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
                  Ask a clear, specific question about a matter of genuine concern. Traditional horary works best with yes/no questions or "Will X happen?"
                </small>
              </div>

              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={searchLocation}
                  placeholder="Enter location where you are asking the question"
                  required
                />
                {searchingLocation && <small>Searching...</small>}
                {locationResults.length > 0 && (
                  <div className="location-results">
                    {locationResults.map((result, index) => (
                      <div
                        key={index}
                        className="location-result-item"
                        onClick={() => selectLocation(result)}
                      >
                        <div className="location-name">{result.display_name}</div>
                        <div className="location-coords">
                          Lat: {parseFloat(result.lat).toFixed(4)}, Lon: {parseFloat(result.lon).toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {formData.latitude && formData.longitude && (
                  <div style={{ fontSize: '0.85em', color: '#28a745', marginTop: '0.5rem' }}>
                    ✓ Location set: {parseFloat(formData.latitude).toFixed(4)}°, {parseFloat(formData.longitude).toFixed(4)}°
                  </div>
                )}
                <small style={{ display: 'block', marginTop: '0.25rem', color: '#666' }}>
                  Use your current location at the moment the question arose
                </small>
              </div>

              <div style={{
                padding: '1rem',
                backgroundColor: '#f0f8ff',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                border: '1px solid #9b59b6'
              }}>
                <p style={{ margin: 0, fontSize: '0.9em', color: '#333' }}>
                  The chart will be cast for the current moment when you click "Cast Horary Chart" below.
                  In classical horary, the moment of the question is the moment of the chart.
                </p>
              </div>

              <button
                type="button"
                disabled={loading || !horaryQuestion || !formData.latitude}
                className="calculate-btn"
                style={{ background: '#9b59b6' }}
                onClick={async (e) => {
                  e.preventDefault();
                  const now = DateTime.now().setZone(formData.timezone || 'America/New_York');

                  console.log('Casting horary chart for:', now.toString());

                  // Create horary data
                  const horaryFormData = {
                    name: `Horary: ${horaryQuestion}`,
                    year: now.year.toString(),
                    month: now.month.toString(),
                    day: now.day.toString(),
                    hour: now.hour.toString(),
                    minute: now.minute.toString(),
                    location: formData.location,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    timezone: formData.timezone || 'America/New_York',
                    houseSystem: formData.houseSystem || 'placidus'
                  };

                  // Update form data for display
                  setFormData(horaryFormData);

                  // Switch to single chart view to display the chart
                  setViewMode('single');

                  // Call calculateChart with override data
                  const fakeEvent = {
                    preventDefault: () => {}
                  };

                  await calculateChart(fakeEvent, horaryFormData);
                }}
              >
                {loading ? 'Casting Chart...' : '🔮 Cast Horary Chart'}
              </button>
            </form>
          </div>
        ) : viewMode === 'eclipses' ? (
          <EclipseDashboard chartData={chartData} />
        ) : viewMode === 'configSearch' ? (
          <ConfigurationSearch />
        ) : null}
      </main>

      <FamousChartsBrowser
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onSelectChart={handleFamousChartSelect}
      />

      <ChatPanel
        chartData={chartData}
        chartDataB={chartDataB}
        compositeChartData={compositeChartData}
        returnChartData={returnChartData}
        returnType={returnType}
        viewMode={viewMode}
        relationshipChartType={relationshipChartType}
        formData={formData}
        formDataB={formDataB}
        returnsFormData={returnsFormData}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      <SaveChartModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveChart}
        initialName={formData.name || ''}
      />

      <ChartLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onLoadChart={handleLoadChart}
      />
    </div>
  );
}

export default App;
