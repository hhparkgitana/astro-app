const Astronomy = require('astronomy-engine');

/**
 * Calculate the obliquity of the ecliptic for a given date
 * Uses the formula from the Astronomical Almanac
 */
function calculateObliquity(date) {
  // Convert to Julian Day
  const jd = dateToJulianDay(date);
  
  // Time in Julian centuries from J2000.0
  const T = (jd - 2451545.0) / 36525.0;
  
  // Mean obliquity (in degrees)
  const epsilon = 23.439291 - 0.0130042 * T - 0.00000016 * T * T + 0.000000504 * T * T * T;
  
  return epsilon;
}

/**
 * Convert a JavaScript Date to Julian Day Number
 */
function dateToJulianDay(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();
  
  // Convert time to decimal day
  const decimalDay = day + (hour + minute / 60.0 + second / 3600.0) / 24.0;
  
  // Adjust for January/February
  let y = year;
  let m = month;
  if (month <= 2) {
    y -= 1;
    m += 12;
  }
  
  // Calculate Julian Day
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  
  const JD = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + decimalDay + B - 1524.5;
  
  return JD;
}

/**
 * Calculate Placidus houses
 */
function calculatePlacidusHouses(date, latitude, longitude) {
  // Calculate obliquity for the specific date
  const obliquity = calculateObliquity(date);
  
  const gast = Astronomy.SiderealTime(date);
  const lst = gast + (longitude / 15);
  const lstDegrees = (lst * 15) % 360;
  
  const ramc = lstDegrees;
  
  const mc = calculateMC(ramc, obliquity);
  const ascendant = calculateAscendant(lstDegrees, latitude, obliquity);
  const descendant = (ascendant + 180) % 360;
  const ic = (mc + 180) % 360;
  
  const houses = calculatePlacidusIntermediateCusps(
    ramc, 
    ascendant, 
    mc, 
    latitude, 
    obliquity
  );
  
  return {
    ascendant,
    mc,
    descendant,
    ic,
    houses,
  };
}

function calculateMC(ramc, obliquity) {
  const ramcRad = ramc * Math.PI / 180;
  const oblRad = obliquity * Math.PI / 180;
  
  const tanMC = Math.tan(ramcRad) / Math.cos(oblRad);
  let mc = Math.atan(tanMC) * 180 / Math.PI;
  
  // Adjust quadrant based on RAMC
  if (ramc >= 90 && ramc < 270) {
    mc += 180;
  }
  
  if (mc < 0) mc += 360;
  
  return mc % 360;
}

function calculateAscendant(lst, latitude, obliquity) {
  // Convert to radians
  const lstRad = lst * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;
  const oblRad = obliquity * Math.PI / 180;
  
  // Calculate Ascendant using the formula:
  // Asc = arctan(cos(LST) / -(sin(LST) * cos(epsilon) + tan(lat) * sin(epsilon)))
  const numerator = Math.cos(lstRad);
  const denominator = -(Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad));
  
  // Use atan2 for proper quadrant handling
  let ascendant = Math.atan2(numerator, denominator) * 180 / Math.PI;
  
  // Normalize to 0-360
  if (ascendant < 0) {
    ascendant += 360;
  }
  
  return ascendant;
}

function calculatePlacidusIntermediateCusps(ramc, ascendant, mc, latitude, obliquity) {
  const houses = new Array(12);
  
  // Fixed cusps (angles)
  houses[0] = ascendant;  // House 1 (Ascendant)
  houses[3] = (mc + 180) % 360;  // House 4 (IC)
  houses[6] = (ascendant + 180) % 360;  // House 7 (Descendant)
  houses[9] = mc;  // House 10 (MC)
  
  // Calculate intermediate cusps using iterative method
  // This is the Munkasey/Vijayaraghavulu algorithm
  
  // House 11: 1/3 of the way from ASC to MC
  houses[10] = calculatePlacidusHouseIterative(ramc, latitude, obliquity, 30, 1/3);
  // House 12: 2/3 of the way from ASC to MC
  houses[11] = calculatePlacidusHouseIterative(ramc, latitude, obliquity, 60, 2/3);
  // House 2: 2/3 of the way from MC to DESC
  houses[1] = calculatePlacidusHouseIterative(ramc, latitude, obliquity, 120, 2/3);
  // House 3: 1/3 of the way from MC to DESC
  houses[2] = calculatePlacidusHouseIterative(ramc, latitude, obliquity, 150, 1/3);
  
  // Houses 5, 6, 8, 9 are opposite their counterparts
  houses[4] = (houses[10] + 180) % 360;  // House 5 opposite House 11
  houses[5] = (houses[11] + 180) % 360;  // House 6 opposite House 12
  houses[7] = (houses[1] + 180) % 360;  // House 8 opposite House 2
  houses[8] = (houses[2] + 180) % 360;  // House 9 opposite House 3
  
  return houses;
}

function calculatePlacidusHouseIterative(ramc, latitude, obliquity, offset, semiarc_ratio) {
  const latRad = latitude * Math.PI / 180;
  const oblRad = obliquity * Math.PI / 180;
  
  // Initial RA - start with a fraction of the equator's semi-arc (90°)
  // For house 12: offset=60, ratio=2/3, so we want RAMC + (90° * 2/3) = RAMC + 60
  // For house 11: offset=30, ratio=1/3, so we want RAMC + (90° * 1/3) = RAMC + 30
  // etc.
  let RA = (ramc + offset) % 360;
  
  // Iterate until convergence (usually 3-5 iterations is enough)
  for (let iteration = 0; iteration < 10; iteration++) {
    const RA_old = RA;
    
    // Step 1: Convert RA to declination using ecliptic equation
    // tan(D) = sin(RA) * tan(obliquity)
    const RARad = RA * Math.PI / 180;
    const tanD = Math.sin(RARad) * Math.tan(oblRad);
    const D = Math.atan(tanD);
    
    // Step 2: Calculate diurnal semi-arc for this declination
    // DSA = arccos(-tan(latitude) * tan(declination))
    const dsa_arg = -Math.tan(latRad) * Math.tan(D);
    
    // Check for polar regions where the formula breaks down
    if (Math.abs(dsa_arg) > 1) {
      // Fallback to simple method
      return convertRAToEcliptic(ramc + offset, obliquity);
    }
    
    const DSA = Math.acos(dsa_arg) * 180 / Math.PI;
    
    // Step 3: Calculate new RA
    // For house 12: RA = RAMC + DSA * (2/3)
    // For house 11: RA = RAMC + DSA * (1/3)
    // For house 2: RA = RAMC + 180 - DSA * (2/3)
    // For house 3: RA = RAMC + 180 - DSA * (1/3)
    
    // Determine if we're in the upper hemisphere (houses 11, 12) or lower (houses 2, 3)
    if (offset < 90) {
      // Upper hemisphere: houses 11, 12
      RA = ramc + DSA * semiarc_ratio;
    } else {
      // Lower hemisphere: houses 2, 3
      RA = ramc + 180 - DSA * semiarc_ratio;
    }
    
    RA = RA % 360;
    if (RA < 0) RA += 360;
    
    // Check for convergence
    const delta = Math.abs(RA - RA_old);
    if (delta < 0.0001) {
      break;
    }
  }
  
  // Convert final RA to ecliptic longitude
  return convertRAToEcliptic(RA, obliquity);
}

// Helper function to convert RA to ecliptic longitude
function convertRAToEcliptic(ra, obliquity) {
  const raRad = ra * Math.PI / 180;
  const oblRad = obliquity * Math.PI / 180;
  
  // Formula: tan(longitude) = cos(obliquity) * tan(RA)
  const tanLon = Math.cos(oblRad) * Math.tan(raRad);
  let lon = Math.atan(tanLon) * 180 / Math.PI;
  
  // Adjust quadrant based on RA
  // RA in quadrant 1 (0-90) -> longitude in quadrant 1 (0-90)
  // RA in quadrant 2 (90-180) -> longitude in quadrant 2 (90-180)
  // RA in quadrant 3 (180-270) -> longitude in quadrant 3 (180-270)
  // RA in quadrant 4 (270-360) -> longitude in quadrant 4 (270-360)
  
  if (ra >= 0 && ra < 90) {
    // Quadrant 1 - lon should be 0-90
    if (lon < 0) lon += 180;
  } else if (ra >= 90 && ra < 180) {
    // Quadrant 2 - lon should be 90-180
    if (lon < 0) lon += 180;
  } else if (ra >= 180 && ra < 270) {
    // Quadrant 3 - lon should be 180-270
    if (lon < 0) lon += 180;
    else if (lon < 90) lon += 180;
  } else {
    // Quadrant 4 - lon should be 270-360
    if (lon < 0) lon += 360;
    else if (lon < 180) lon += 180;
  }
  
  return lon % 360;
}

module.exports = { calculatePlacidusHouses };
