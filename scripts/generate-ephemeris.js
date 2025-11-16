#!/usr/bin/env node

/**
 * Ephemeris Database Generator
 *
 * Generates a searchable database of planetary positions over time.
 * This enables fast queries for electional astrology and research.
 *
 * Usage:
 *   node scripts/generate-ephemeris.js [options]
 *
 * Options:
 *   --years <n>      Number of years to generate (default: 1)
 *   --start <date>   Start date YYYY-MM-DD (default: 2024-01-01)
 *   --interval <n>   Minutes between samples (default: 60)
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const sweph = require('sweph');
const Astronomy = require('astronomy-engine');

// Load Swiss Ephemeris constants
const constants = require(path.join(require.resolve('sweph').replace('index.js', ''), 'constants.js'));

// Set ephemeris data path (for development script execution)
const ephePath = path.join(__dirname, '../src/shared/ephe');
sweph.set_ephe_path(ephePath);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  years: 1,
  startDate: '2024-01-01',
  interval: 60, // minutes
};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  if (key === 'years') options.years = parseInt(value);
  if (key === 'start') options.startDate = value;
  if (key === 'interval') options.interval = parseInt(value);
}

// Database path
const DB_PATH = path.join(__dirname, '../src/shared/data/ephemeris.db');

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
console.log('Creating ephemeris database...');
const db = new Database(DB_PATH);

// Create schema
db.exec(`
  DROP TABLE IF EXISTS ephemeris;

  CREATE TABLE ephemeris (
    datetime INTEGER PRIMARY KEY,  -- Unix timestamp in milliseconds

    -- Sun
    sun_lon REAL NOT NULL,
    sun_lat REAL,
    sun_speed REAL,

    -- Moon
    moon_lon REAL NOT NULL,
    moon_lat REAL,
    moon_speed REAL,

    -- Mercury
    mercury_lon REAL NOT NULL,
    mercury_lat REAL,
    mercury_speed REAL,

    -- Venus
    venus_lon REAL NOT NULL,
    venus_lat REAL,
    venus_speed REAL,

    -- Mars
    mars_lon REAL NOT NULL,
    mars_lat REAL,
    mars_speed REAL,

    -- Jupiter
    jupiter_lon REAL NOT NULL,
    jupiter_lat REAL,
    jupiter_speed REAL,

    -- Saturn
    saturn_lon REAL NOT NULL,
    saturn_lat REAL,
    saturn_speed REAL,

    -- Uranus
    uranus_lon REAL NOT NULL,
    uranus_lat REAL,
    uranus_speed REAL,

    -- Neptune
    neptune_lon REAL NOT NULL,
    neptune_lat REAL,
    neptune_speed REAL,

    -- Pluto
    pluto_lon REAL NOT NULL,
    pluto_lat REAL,
    pluto_speed REAL,

    -- North Node
    north_node_lon REAL NOT NULL,
    north_node_speed REAL
  );

  -- Create indices for fast querying
  CREATE INDEX idx_sun_lon ON ephemeris(sun_lon);
  CREATE INDEX idx_moon_lon ON ephemeris(moon_lon);
  CREATE INDEX idx_mercury_lon ON ephemeris(mercury_lon);
  CREATE INDEX idx_venus_lon ON ephemeris(venus_lon);
  CREATE INDEX idx_mars_lon ON ephemeris(mars_lon);
  CREATE INDEX idx_jupiter_lon ON ephemeris(jupiter_lon);
  CREATE INDEX idx_saturn_lon ON ephemeris(saturn_lon);
  CREATE INDEX idx_datetime ON ephemeris(datetime);

  -- Metadata table
  CREATE TABLE metadata (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Eclipses table
  CREATE TABLE eclipses (
    datetime INTEGER PRIMARY KEY,  -- Unix timestamp in milliseconds
    type TEXT NOT NULL,  -- 'solar' or 'lunar'
    kind TEXT NOT NULL,  -- 'partial', 'total', 'annular', 'penumbral', 'hybrid'
    longitude REAL NOT NULL,  -- Ecliptic longitude
    sign_index INTEGER NOT NULL,  -- 0-11 for Aries-Pisces
    degree_in_sign REAL NOT NULL  -- 0-29.99
  );

  -- Create index for fast eclipse queries
  CREATE INDEX idx_eclipse_type ON eclipses(type);
  CREATE INDEX idx_eclipse_sign ON eclipses(sign_index);
  CREATE INDEX idx_eclipse_datetime ON eclipses(datetime);
`);

console.log('Schema created successfully');

/**
 * Convert date/time to Julian Day
 */
function dateToJulianDay(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const hourDecimal = hour + minute / 60.0;
  return sweph.julday(year, month, day, hourDecimal, 1); // 1 = Gregorian calendar
}

/**
 * Calculate position of a celestial body using Swiss Ephemeris
 * Falls back to Moshier ephemeris if Swiss Ephemeris files not found
 */
function calculateBody(jd, bodyId) {
  const flags = constants.SEFLG_SPEED | constants.SEFLG_SWIEPH;
  const result = sweph.calc_ut(jd, bodyId, flags);

  // Swiss Ephemeris warnings about missing files are OK - it falls back to Moshier
  // Only throw if there's an actual calculation error (not just a file warning)
  if (result.error && !result.error.includes('using Moshier eph')) {
    throw new Error(`Swiss Ephemeris error for body ${bodyId}: ${result.error}`);
  }

  return {
    longitude: result.data[0],      // Ecliptic longitude (degrees)
    latitude: result.data[1],       // Ecliptic latitude (degrees)
    speed: result.data[3]           // Speed in longitude (degrees/day)
  };
}

// Calculate planetary positions for a given date
function calculatePositions(date) {
  const jd = dateToJulianDay(date);

  const positions = {
    datetime: date.getTime(),
  };

  // Sun
  const sun = calculateBody(jd, constants.SE_SUN);
  positions.sun_lon = sun.longitude;
  positions.sun_lat = sun.latitude;
  positions.sun_speed = sun.speed;

  // Moon
  const moon = calculateBody(jd, constants.SE_MOON);
  positions.moon_lon = moon.longitude;
  positions.moon_lat = moon.latitude;
  positions.moon_speed = moon.speed;

  // Planets
  const bodies = [
    { name: 'mercury', id: constants.SE_MERCURY },
    { name: 'venus', id: constants.SE_VENUS },
    { name: 'mars', id: constants.SE_MARS },
    { name: 'jupiter', id: constants.SE_JUPITER },
    { name: 'saturn', id: constants.SE_SATURN },
    { name: 'uranus', id: constants.SE_URANUS },
    { name: 'neptune', id: constants.SE_NEPTUNE },
    { name: 'pluto', id: constants.SE_PLUTO }
  ];

  bodies.forEach(body => {
    const result = calculateBody(jd, body.id);
    positions[`${body.name}_lon`] = result.longitude;
    positions[`${body.name}_lat`] = result.latitude;
    positions[`${body.name}_speed`] = result.speed;
  });

  // North Node (True Node)
  const northNode = calculateBody(jd, constants.SE_TRUE_NODE);
  positions.north_node_lon = northNode.longitude;
  positions.north_node_speed = northNode.speed;

  return positions;
}

// Prepare insert statement
const insertStmt = db.prepare(`
  INSERT INTO ephemeris (
    datetime,
    sun_lon, sun_lat, sun_speed,
    moon_lon, moon_lat, moon_speed,
    mercury_lon, mercury_lat, mercury_speed,
    venus_lon, venus_lat, venus_speed,
    mars_lon, mars_lat, mars_speed,
    jupiter_lon, jupiter_lat, jupiter_speed,
    saturn_lon, saturn_lat, saturn_speed,
    uranus_lon, uranus_lat, uranus_speed,
    neptune_lon, neptune_lat, neptune_speed,
    pluto_lon, pluto_lat, pluto_speed,
    north_node_lon, north_node_speed
  ) VALUES (
    @datetime,
    @sun_lon, @sun_lat, @sun_speed,
    @moon_lon, @moon_lat, @moon_speed,
    @mercury_lon, @mercury_lat, @mercury_speed,
    @venus_lon, @venus_lat, @venus_speed,
    @mars_lon, @mars_lat, @mars_speed,
    @jupiter_lon, @jupiter_lat, @jupiter_speed,
    @saturn_lon, @saturn_lat, @saturn_speed,
    @uranus_lon, @uranus_lat, @uranus_speed,
    @neptune_lon, @neptune_lat, @neptune_speed,
    @pluto_lon, @pluto_lat, @pluto_speed,
    @north_node_lon, @north_node_speed
  )
`);

// Generate ephemeris data
console.log(`Generating ephemeris data:`);
console.log(`  Start date: ${options.startDate}`);
console.log(`  Duration: ${options.years} year(s)`);
console.log(`  Interval: ${options.interval} minutes`);

const startDate = new Date(options.startDate + 'T00:00:00Z');
const endDate = new Date(startDate);
endDate.setFullYear(endDate.getFullYear() + options.years);

const totalMinutes = (endDate - startDate) / (1000 * 60);
const totalPoints = Math.floor(totalMinutes / options.interval);

console.log(`  Total data points: ${totalPoints.toLocaleString()}`);
console.log('\nGenerating data...');

let currentDate = new Date(startDate);
let count = 0;
const batchSize = 1000;
let batch = [];

const startTime = Date.now();

// Use transaction for better performance
const insertMany = db.transaction((positions) => {
  for (const pos of positions) {
    insertStmt.run(pos);
  }
});

while (currentDate < endDate) {
  const positions = calculatePositions(currentDate);
  batch.push(positions);

  if (batch.length >= batchSize) {
    insertMany(batch);
    count += batch.length;
    batch = [];

    const progress = ((count / totalPoints) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rate = (count / elapsed).toFixed(0);
    const remaining = ((totalPoints - count) / rate).toFixed(0);

    process.stdout.write(`\r  Progress: ${progress}% (${count.toLocaleString()}/${totalPoints.toLocaleString()}) - ${rate} pts/sec - ETA: ${remaining}s  `);
  }

  currentDate = new Date(currentDate.getTime() + options.interval * 60 * 1000);
}

// Insert remaining batch
if (batch.length > 0) {
  insertMany(batch);
  count += batch.length;
}

console.log('\n');

// Generate eclipse data
console.log('Generating eclipse data...');

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle) {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

/**
 * Calculate ecliptic position at a specific time
 */
function calculateEclipticPosition(body, date) {
  let ecliptic;
  if (body === 'Sun') {
    ecliptic = Astronomy.Ecliptic(Astronomy.GeoVector('Sun', date, true));
  } else if (body === 'Moon') {
    ecliptic = Astronomy.Ecliptic(Astronomy.GeoMoon(date));
  }
  const longitude = normalizeAngle(ecliptic.elon);
  const signIndex = Math.floor(longitude / 30);
  const degreeInSign = longitude % 30;
  return { longitude, signIndex, degreeInSign };
}

const eclipses = [];

// Find solar eclipses
let solarSearch = Astronomy.SearchGlobalSolarEclipse(startDate);
while (solarSearch && solarSearch.peak && solarSearch.peak.date < endDate) {
  const position = calculateEclipticPosition('Sun', solarSearch.peak.date);
  eclipses.push({
    datetime: solarSearch.peak.date.getTime(),
    type: 'solar',
    kind: solarSearch.kind,
    longitude: position.longitude,
    sign_index: position.signIndex,
    degree_in_sign: position.degreeInSign
  });
  solarSearch = Astronomy.NextGlobalSolarEclipse(solarSearch.peak.date);
}

// Find lunar eclipses
let lunarSearch = Astronomy.SearchLunarEclipse(startDate);
while (lunarSearch && lunarSearch.peak && lunarSearch.peak.date < endDate) {
  const position = calculateEclipticPosition('Moon', lunarSearch.peak.date);
  eclipses.push({
    datetime: lunarSearch.peak.date.getTime(),
    type: 'lunar',
    kind: lunarSearch.kind,
    longitude: position.longitude,
    sign_index: position.signIndex,
    degree_in_sign: position.degreeInSign
  });
  lunarSearch = Astronomy.NextLunarEclipse(lunarSearch.peak.date);
}

// Insert eclipses
const eclipseStmt = db.prepare(`
  INSERT INTO eclipses (datetime, type, kind, longitude, sign_index, degree_in_sign)
  VALUES (@datetime, @type, @kind, @longitude, @sign_index, @degree_in_sign)
`);

eclipses.forEach(eclipse => {
  eclipseStmt.run(eclipse);
});

console.log(`  Total eclipses: ${eclipses.length}`);

// Store metadata
const metadataStmt = db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
metadataStmt.run('start_date', options.startDate);
metadataStmt.run('end_date', endDate.toISOString().split('T')[0]);
metadataStmt.run('interval_minutes', options.interval.toString());
metadataStmt.run('total_points', count.toString());
metadataStmt.run('total_eclipses', eclipses.length.toString());
metadataStmt.run('generated_at', new Date().toISOString());

const endTime = Date.now();
const duration = ((endTime - startTime) / 1000).toFixed(1);

console.log('Generation complete!');
console.log(`  Time elapsed: ${duration}s`);
console.log(`  Records created: ${count.toLocaleString()}`);
console.log(`  Database size: ${(fs.statSync(DB_PATH).size / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Location: ${DB_PATH}`);

db.close();
