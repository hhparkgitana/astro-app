const Astronomy = require('astronomy-engine');
const { Origin, Horoscope } = require('circular-natal-horoscope-js');

function calculateChart(params) {
  const { year, month, day, hour = 12, minute = 0, latitude = 0, longitude = 0, houseSystem = 'placidus' } = params;

  try {
    const date = new Date(year, month - 1, day, hour, minute);
    const planets = {};

    // Calculate Sun
    const sun = Astronomy.Ecliptic(Astronomy.GeoVector('Sun', date, true));
    planets.SUN = {
      name: 'Sun',
      longitude: sun.elon,
    };

    // Calculate Moon
    const moonVector = Astronomy.GeoMoon(date);
    const moonEcliptic = Astronomy.Ecliptic(moonVector);
    planets.MOON = {
      name: 'Moon',
      longitude: moonEcliptic.elon,
    };

    // Calculate other planets
    const bodies = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
    
    bodies.forEach(body => {
      const ecliptic = Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true));
      planets[body.toUpperCase()] = {
        name: body,
        longitude: ecliptic.elon,
      };
    });

    // Calculate North Node
    const j2000 = new Date('2000-01-01T12:00:00Z');
    const yearsSince2000 = (date - j2000) / (365.25 * 24 * 60 * 60 * 1000);
    const northNodeLon = (125.04 - 19.3413 * yearsSince2000) % 360;
    const adjustedNorthNode = northNodeLon < 0 ? northNodeLon + 360 : northNodeLon;
    
    planets.NORTH_NODE = {
      name: 'North Node',
      longitude: adjustedNorthNode,
    };

    const southNodeLon = (adjustedNorthNode + 180) % 360;
    planets.SOUTH_NODE = {
      name: 'South Node',
      longitude: southNodeLon,
    };

    // Calculate Placidus houses using circular-natal-horoscope-js
    // Create origin (note: month is 0-indexed in the library)
    const origin = new Origin({
      year: year,
      month: month - 1, // Convert from 1-indexed to 0-indexed
      date: day,
      hour: hour,
      minute: minute,
      latitude: latitude,
      longitude: longitude
    });

    // Create horoscope with selected house system
    const horoscope = new Horoscope({
      origin: origin,
      houseSystem: houseSystem,
      zodiac: 'tropical',
      aspectPoints: [],
      aspectWithPoints: [],
      aspectTypes: []
    });

    // Extract house cusps and angles
    const ascendant = horoscope.Ascendant.ChartPosition.Ecliptic.DecimalDegrees;
    const midheaven = horoscope.Midheaven.ChartPosition.Ecliptic.DecimalDegrees;
    const descendant = (ascendant + 180) % 360;
    const ic = (midheaven + 180) % 360;

    // Extract all 12 house cusps
    const houses = horoscope.Houses.map(house => 
      house.ChartPosition.StartPosition.Ecliptic.DecimalDegrees
    );

    return {
      success: true,
      planets,
      ascendant,
      midheaven,
      descendant,
      ic,
      houses,
      date: date.toISOString(),
    };
  } catch (error) {
    console.error('Calculation error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = { calculateChart };
