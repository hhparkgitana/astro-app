import React, { useState } from 'react';
import './App.css';
import ChartWheel from './components/ChartWheel';
import AspectMatrix from './components/AspectMatrix';

function App() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationResults, setLocationResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [activeAspects, setActiveAspects] = useState(new Set());
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
    houseSystem: 'placidus',
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const calculateChart = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await window.astro.calculateChart({
        year: parseInt(formData.year),
        month: parseInt(formData.month),
        day: parseInt(formData.day),
        hour: parseInt(formData.hour),
        minute: parseInt(formData.minute),
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

      setChartData(result);
    } catch (error) {
      console.error('Error:', error);
      setChartData({ success: false, error: error.message });
    }
    setLoading(false);
  };

  const resetChart = () => {
    setChartData(null);
    setActiveAspects(new Set());
  };

  const startNewChart = () => {
    setChartData(null);
    setActiveAspects(new Set());
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
      houseSystem: 'placidus',
    });
  };

  const handleAspectToggle = (aspect) => {
    const key = `${aspect.planet1}-${aspect.planet2}`;
    const newActiveAspects = new Set(activeAspects);

    if (newActiveAspects.has(key)) {
      newActiveAspects.delete(key);
    } else {
      newActiveAspects.add(key);
    }

    setActiveAspects(newActiveAspects);
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
      </header>
      <main className="app-main">
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

          <button type="submit" disabled={loading} className="calculate-btn">
            {loading ? 'Calculating...' : 'Calculate Chart'}
          </button>
        </form>

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

            <ChartWheel chartData={chartData} activeAspects={activeAspects} />

            <AspectMatrix
              chartData={chartData}
              activeAspects={activeAspects}
              onAspectToggle={handleAspectToggle}
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
      </main>
    </div>
  );
}

export default App;
