const Astronomy = require('astronomy-engine');
const { Origin, Horoscope } = require('circular-natal-horoscope-js');
const { calculateAspects } = require('./aspectsCalculator');

// Helper function to calculate velocity (degrees per day)
function calculateVelocity(body, date, isNode = false) {
  if (isNode) {
    // Nodes move retrograde at roughly 19.34° per year = ~0.053° per day
    return -0.053;
  }

  const hoursAhead = 24; // Calculate position 24 hours later
  const futureDate = new Date(date.getTime() + hoursAhead * 60 * 60 * 1000);

  let currentLon, futureLon;

  if (body === 'Moon') {
    const currentEcliptic = Astronomy.Ecliptic(Astronomy.GeoMoon(date));
    const futureEcliptic = Astronomy.Ecliptic(Astronomy.GeoMoon(futureDate));
    currentLon = currentEcliptic.elon;
    futureLon = futureEcliptic.elon;
  } else {
    const currentEcliptic = Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true));
    const futureEcliptic = Astronomy.Ecliptic(Astronomy.GeoVector(body, futureDate, true));
    currentLon = currentEcliptic.elon;
    futureLon = futureEcliptic.elon;
  }

  // Handle zodiac wraparound (e.g., 359° to 1°)
  let diff = futureLon - currentLon;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return diff; // degrees per day
}

function calculateChart(params) {
  const {
    year, month, day, hour = 12, minute = 0,
    utcYear, utcMonth, utcDay, utcHour, utcMinute,
    latitude = 0, longitude = 0, houseSystem = 'placidus'
  } = params;

  try {
    // Use UTC time for planetary calculations (astronomy-engine expects UTC)
    const date = utcYear
      ? new Date(Date.UTC(utcYear, utcMonth - 1, utcDay, utcHour, utcMinute))
      : new Date(Date.UTC(year, month - 1, day, hour, minute));

    const planets = {};

    // Calculate Sun
    const sun = Astronomy.Ecliptic(Astronomy.GeoVector('Sun', date, true));
    planets.SUN = {
      name: 'Sun',
      longitude: sun.elon,
      velocity: calculateVelocity('Sun', date),
    };

    // Calculate Moon
    const moonVector = Astronomy.GeoMoon(date);
    const moonEcliptic = Astronomy.Ecliptic(moonVector);
    planets.MOON = {
      name: 'Moon',
      longitude: moonEcliptic.elon,
      velocity: calculateVelocity('Moon', date),
    };

    // Calculate other planets
    const bodies = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

    bodies.forEach(body => {
      const ecliptic = Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true));
      planets[body.toUpperCase()] = {
        name: body,
        longitude: ecliptic.elon,
        velocity: calculateVelocity(body, date),
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
      velocity: calculateVelocity(null, date, true),
    };

    const southNodeLon = (adjustedNorthNode + 180) % 360;
    planets.SOUTH_NODE = {
      name: 'South Node',
      longitude: southNodeLon,
      velocity: calculateVelocity(null, date, true),
    };

    // Calculate Placidus houses using circular-natal-horoscope-js
    // Note: This library expects LOCAL time, not UTC
    // We need to convert back from UTC to local time based on the actual offset at birth location
    // For now, the astronomy calculations use UTC (from Date.UTC),
    // but houses need to be calculated with the original local time components

    console.log('chartCalculator - Received params:', { year, month, day, hour, minute, latitude, longitude });
    console.log('chartCalculator - UTC Date object:', date.toISOString());

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

    // Calculate aspects between planets
    const aspects = calculateAspects(planets);

    return {
      success: true,
      planets,
      aspects,
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