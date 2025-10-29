import React, { useState } from 'react';
import './App.css';
import ChartWheel from './components/ChartWheel';
import AspectTabs from './components/AspectTabs';
import FamousChartsBrowser from './components/FamousChartsBrowser';
import ChatPanel from './components/ChatPanel';
import { DateTime } from 'luxon';
import { findAspect, getAngularDistance, calculateAspects } from '../shared/calculations/aspectsCalculator';

function App() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationResults, setLocationResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [activeAspects, setActiveAspects] = useState(new Set());
  const [activeTransitAspects, setActiveTransitAspects] = useState(new Set());
  const [showNatalAspects, setShowNatalAspects] = useState(true);

  // Orb settings for each aspect type
  const [natalOrb, setNatalOrb] = useState(8);
  const [transitOrb, setTransitOrb] = useState(8);
  const [transitTransitOrb, setTransitTransitOrb] = useState(8);

  // Famous charts browser
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [activeChart, setActiveChart] = useState('A'); // Which chart the browser is loading into

  // View mode: 'single' or 'dual'
  const [viewMode, setViewMode] = useState('single');

  // Chat panel state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Chart B states (for dual view)
  const [chartDataB, setChartDataB] = useState(null);
  const [loadingB, setLoadingB] = useState(false);
  const [activeAspectsB, setActiveAspectsB] = useState(new Set());
  const [activeTransitAspectsB, setActiveTransitAspectsB] = useState(new Set());
  const [showNatalAspectsB, setShowNatalAspectsB] = useState(true);

  // Debug: Log state on each render
  console.log('=== APP RENDER ===');
  console.log('activeTransitAspects size:', activeTransitAspects.size);
  console.log('activeTransitAspects first 5:', Array.from(activeTransitAspects).slice(0, 5));
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
    transitYear: new Date().getFullYear().toString(),
    transitMonth: (new Date().getMonth() + 1).toString(),
    transitDay: new Date().getDate().toString(),
    transitHour: new Date().getHours().toString(),
    transitMinute: new Date().getMinutes().toString(),
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
    transitYear: new Date().getFullYear().toString(),
    transitMonth: (new Date().getMonth() + 1).toString(),
    transitDay: new Date().getDate().toString(),
    transitHour: new Date().getHours().toString(),
    transitMinute: new Date().getMinutes().toString(),
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

  // Note: getAngularDistance and findAspect are now imported from aspectsCalculator

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

    // Calculate aspects between each natal planet and each transit planet
    for (const natalPlanet of natalArray) {
      for (const transitPlanet of transitArray) {
        const distance = getAngularDistance(natalPlanet.longitude, transitPlanet.longitude);

        const aspect = findAspect(
          distance,
          orb,
          natalPlanet.velocity,
          transitPlanet.velocity,
          natalPlanet.longitude,
          transitPlanet.longitude
        );

        if (aspect) {
          aspects.push({
            planet1: natalPlanet.name,
            planet1Key: natalPlanet.key,
            planet2: transitPlanet.name,
            planet2Key: transitPlanet.key,
            ...aspect
          });
        }
      }
    }

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

  const handleTransitTransitOrbChange = (newOrb) => {
    setTransitTransitOrb(newOrb);
    if (chartData && chartData.transits && chartData.transits.planets) {
      const newTransitTransitAspects = calculateTransitToTransitAspects(chartData.transits.planets, newOrb);
      setChartData({ ...chartData, transitTransitAspects: newTransitTransitAspects });
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

  const calculateChart = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Convert local time to UTC using timezone
      const localTime = DateTime.fromObject({
        year: parseInt(formData.year),
        month: parseInt(formData.month),
        day: parseInt(formData.day),
        hour: parseInt(formData.hour),
        minute: parseInt(formData.minute),
      }, { zone: formData.timezone });

      const utcTime = localTime.toUTC();

      console.log('Local time:', localTime.toString());
      console.log('UTC time:', utcTime.toString());
      console.log('Timezone:', formData.timezone);
      console.log('DST offset:', localTime.offset / 60, 'hours');

      const result = await window.astro.calculateChart({
        // Send LOCAL time for house calculations
        year: parseInt(formData.year),
        month: parseInt(formData.month),
        day: parseInt(formData.day),
        hour: parseInt(formData.hour),
        minute: parseInt(formData.minute),
        // Also send UTC time for planetary calculations
        utcYear: utcTime.year,
        utcMonth: utcTime.month,
        utcDay: utcTime.day,
        utcHour: utcTime.hour,
        utcMinute: utcTime.minute,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        houseSystem: formData.houseSystem,
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

      // Calculate transit positions if enabled
      let transitData = null;
      if (formData.showTransits && result.success) {
        const transitLocalTime = DateTime.fromObject({
          year: parseInt(formData.transitYear),
          month: parseInt(formData.transitMonth),
          day: parseInt(formData.transitDay),
          hour: parseInt(formData.transitHour),
          minute: parseInt(formData.transitMinute),
        }, { zone: formData.timezone });

        const transitUtcTime = transitLocalTime.toUTC();

        console.log('Transit local time:', transitLocalTime.toString());
        console.log('Transit UTC time:', transitUtcTime.toString());

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

      setChartData({ ...result, transits: transitData });
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
        transitYear: formData.transitYear,
        transitMonth: formData.transitMonth,
        transitDay: formData.transitDay,
        transitHour: formData.transitHour,
        transitMinute: formData.transitMinute,
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
        transitYear: formDataB.transitYear,
        transitMonth: formDataB.transitMonth,
        transitDay: formDataB.transitDay,
        transitHour: formDataB.transitHour,
        transitMinute: formDataB.transitMinute,
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

      // Calculate transit positions if enabled
      let transitData = null;
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

      setChartData({ ...result, transits: transitData });
      console.log('Chart A calculated:', result);
    } catch (error) {
      console.error('Error calculating Chart A:', error);
      setChartData({ success: false, error: error.message });
    }
    setLoading(false);
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

      // Calculate transit positions if enabled
      let transitData = null;
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

      setChartDataB({ ...result, transits: transitData });
      console.log('Chart B calculated:', result);
    } catch (error) {
      console.error('Error calculating Chart B:', error);
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌟 AstroApp</h1>
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
            className={`mode-btn ${isChatOpen ? 'active' : ''}`}
            onClick={() => setIsChatOpen(!isChatOpen)}
            title="AI Assistant"
          >
            🤖 AI Chat
          </button>
        </div>
      </header>
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
                min="1900"
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

          <div className="form-group" style={{marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px'}}>
            <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
              <input
                type="checkbox"
                name="showTransits"
                checked={formData.showTransits}
                onChange={handleInputChange}
                style={{marginRight: '8px', width: '18px', height: '18px'}}
              />
              <span style={{fontWeight: 'bold'}}>Show Transits (Bi-Wheel)</span>
            </label>
          </div>

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
                    min="1900"
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

          <button type="submit" disabled={loading} className="calculate-btn">
            {loading ? 'Calculating...' : 'Calculate Chart'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
          <button
            type="button"
            onClick={() => setIsBrowserOpen(true)}
            className="famous-charts-btn"
          >
            📚 Browse Famous Charts Database
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
              activeAspects={activeAspects}
              onAspectToggle={handleAspectToggle}
              activeTransitAspects={activeTransitAspects}
              onTransitAspectToggle={handleTransitAspectToggle}
              showNatalAspects={showNatalAspects}
              setShowNatalAspects={setShowNatalAspects}
              natalOrb={natalOrb}
              onNatalOrbChange={handleNatalOrbChange}
              transitOrb={transitOrb}
              onTransitOrbChange={handleTransitOrbChange}
              transitTransitOrb={transitTransitOrb}
              onTransitTransitOrbChange={handleTransitTransitOrbChange}
            />

            <AspectTabs
              chartData={chartData}
              activeAspects={activeAspects}
              onAspectToggle={handleAspectToggle}
              activeTransitAspects={activeTransitAspects}
              onTransitAspectToggle={handleTransitAspectToggle}
              showNatalAspects={showNatalAspects}
            />

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
        ) : (
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
                  📚 Load Chart A from Database
                </button>
                {formData.name && (
                  <>
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
                    </div>
                    <button
                      className="load-chart-btn"
                      onClick={calculateChartA}
                      disabled={loading}
                      style={{ marginTop: '1rem' }}
                    >
                      {loading ? '⏳ Calculating...' : '🔮 Calculate Chart A'}
                    </button>
                  </>
                )}
              </div>
              {chartData && chartData.success && (
                <div className="chart-results">
                  <div className="chart-display">
                    <ChartWheel
                      chartData={chartData}
                      transitData={chartData.transits}
                      activeAspects={activeAspects}
                      activeTransitAspects={activeTransitAspects}
                      onAspectToggle={handleAspectToggle}
                      onTransitAspectToggle={handleTransitAspectToggle}
                      showNatalAspects={showNatalAspects}
                      setShowNatalAspects={setShowNatalAspects}
                      natalOrb={natalOrb}
                      onNatalOrbChange={handleNatalOrbChange}
                      transitOrb={transitOrb}
                      onTransitOrbChange={handleTransitOrbChange}
                      transitTransitOrb={transitTransitOrb}
                      onTransitTransitOrbChange={handleTransitTransitOrbChange}
                    />
                  </div>

                  <AspectTabs
                    chartData={chartData}
                    activeAspects={activeAspects}
                    onAspectToggle={handleAspectToggle}
                    activeTransitAspects={activeTransitAspects}
                    onTransitAspectToggle={handleTransitAspectToggle}
                    showNatalAspects={showNatalAspects}
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
                  📚 Load Chart B from Database
                </button>
                {formDataB.name && (
                  <>
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
                    </div>
                    <button
                      className="load-chart-btn"
                      onClick={calculateChartB}
                      disabled={loadingB}
                      style={{ marginTop: '1rem' }}
                    >
                      {loadingB ? '⏳ Calculating...' : '🔮 Calculate Chart B'}
                    </button>
                  </>
                )}
              </div>
              {chartDataB && chartDataB.success && (
                <div className="chart-results">
                  <div className="chart-display">
                    <ChartWheel
                      chartData={chartDataB}
                      transitData={chartDataB.transits}
                      activeAspects={activeAspectsB}
                      activeTransitAspects={activeTransitAspectsB}
                      onAspectToggle={handleAspectToggleB}
                      onTransitAspectToggle={handleTransitAspectToggleB}
                      showNatalAspects={showNatalAspectsB}
                      setShowNatalAspects={setShowNatalAspectsB}
                      natalOrb={natalOrb}
                      onNatalOrbChange={handleNatalOrbChangeB}
                      transitOrb={transitOrb}
                      onTransitOrbChange={handleTransitOrbChangeB}
                      transitTransitOrb={transitTransitOrb}
                      onTransitTransitOrbChange={handleTransitTransitOrbChangeB}
                    />
                  </div>

                  <AspectTabs
                    chartData={chartDataB}
                    activeAspects={activeAspectsB}
                    onAspectToggle={handleAspectToggleB}
                    activeTransitAspects={activeTransitAspectsB}
                    onTransitAspectToggle={handleTransitAspectToggleB}
                    showNatalAspects={showNatalAspectsB}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <FamousChartsBrowser
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onSelectChart={handleFamousChartSelect}
      />

      <ChatPanel
        chartData={chartData}
        chartDataB={chartDataB}
        viewMode={viewMode}
        formData={formData}
        formDataB={formDataB}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />
    </div>
  );
}

export default App;
