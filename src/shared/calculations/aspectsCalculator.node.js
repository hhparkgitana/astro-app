// Pure CommonJS version for Node.js/main process
// This exports the same functions without ES6 syntax

/**
 * Calculate aspects between two sets of planets
 */
function calculateAspects(natalPlanets, transitPlanets, options = {}) {
  const aspects = [];
  const orbMultiplier = options.orbMultiplier || 1.0;

  const ASPECT_TYPES = [
    { name: 'CONJUNCTION', symbol: '☌', angle: 0, orb: 8 * orbMultiplier },
    { name: 'OPPOSITION', symbol: '☍', angle: 180, orb: 8 * orbMultiplier },
    { name: 'TRINE', symbol: '△', angle: 120, orb: 8 * orbMultiplier },
    { name: 'SQUARE', symbol: '□', angle: 90, orb: 8 * orbMultiplier },
    { name: 'SEXTILE', symbol: '⚹', angle: 60, orb: 6 * orbMultiplier },
    { name: 'QUINCUNX', symbol: '⚻', angle: 150, orb: 3 * orbMultiplier },
    { name: 'SEMISEXTILE', symbol: '⚺', angle: 30, orb: 3 * orbMultiplier }
  ];

  function normalizeAngle(angle) {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  function getAngularDistance(lon1, lon2) {
    const diff = normalizeAngle(lon1 - lon2);
    return Math.min(diff, 360 - diff);
  }

  function findAspect(angularDistance) {
    for (const aspectType of ASPECT_TYPES) {
      const difference = Math.abs(angularDistance - aspectType.angle);
      if (difference <= aspectType.orb) {
        return {
          type: aspectType.name,
          symbol: aspectType.symbol,
          orb: difference,
          angle: aspectType.angle
        };
      }
    }
    return null;
  }

  Object.values(transitPlanets).forEach(transitPlanet => {
    Object.values(natalPlanets).forEach(natalPlanet => {
      const angularDistance = getAngularDistance(transitPlanet.longitude, natalPlanet.longitude);
      const aspect = findAspect(angularDistance);

      if (aspect) {
        aspects.push({
          planet1: transitPlanet.name,
          planet2: natalPlanet.name,
          ...aspect
        });
      }
    });
  });

  return aspects;
}

/**
 * Detect aspect patterns (yods, T-squares, grand trines, grand crosses, kites)
 */
function detectAspectPatterns(aspects, planets) {
  const patterns = {
    yods: [],
    tSquares: [],
    grandTrines: [],
    grandCrosses: [],
    kites: []
  };

  const findAspectBetween = (p1, p2, aspectType) => {
    return aspects.find(a =>
      (a.planet1 === p1 && a.planet2 === p2 && a.type === aspectType) ||
      (a.planet1 === p2 && a.planet2 === p1 && a.type === aspectType)
    );
  };

  // Detect YODS
  aspects.forEach(sextile => {
    if (sextile.type === 'SEXTILE') {
      const p1 = sextile.planet1;
      const p2 = sextile.planet2;

      Object.keys(planets).forEach(apexName => {
        if (apexName === p1 || apexName === p2) return;

        const q1 = findAspectBetween(p1, apexName, 'QUINCUNX');
        const q2 = findAspectBetween(p2, apexName, 'QUINCUNX');

        if (q1 && q2) {
          patterns.yods.push({
            type: 'YOD',
            base1: p1,
            base2: p2,
            apex: apexName,
            sextile: sextile,
            quincunx1: q1,
            quincunx2: q2,
            description: `${p1} and ${p2} in sextile, both quincunx ${apexName}`
          });
        }
      });
    }
  });

  // Detect T-SQUARES
  aspects.forEach(opposition => {
    if (opposition.type === 'OPPOSITION') {
      const p1 = opposition.planet1;
      const p2 = opposition.planet2;

      Object.keys(planets).forEach(apexName => {
        if (apexName === p1 || apexName === p2) return;

        const sq1 = findAspectBetween(p1, apexName, 'SQUARE');
        const sq2 = findAspectBetween(p2, apexName, 'SQUARE');

        if (sq1 && sq2) {
          patterns.tSquares.push({
            type: 'T-SQUARE',
            opposition1: p1,
            opposition2: p2,
            apex: apexName,
            oppositionAspect: opposition,
            square1: sq1,
            square2: sq2,
            description: `${p1} opposite ${p2}, both square ${apexName}`
          });
        }
      });
    }
  });

  // Detect GRAND TRINES
  const planetNames = Object.keys(planets);
  for (let i = 0; i < planetNames.length; i++) {
    for (let j = i + 1; j < planetNames.length; j++) {
      for (let k = j + 1; k < planetNames.length; k++) {
        const p1 = planetNames[i];
        const p2 = planetNames[j];
        const p3 = planetNames[k];

        const t1 = findAspectBetween(p1, p2, 'TRINE');
        const t2 = findAspectBetween(p2, p3, 'TRINE');
        const t3 = findAspectBetween(p3, p1, 'TRINE');

        if (t1 && t2 && t3) {
          patterns.grandTrines.push({
            type: 'GRAND_TRINE',
            planet1: p1,
            planet2: p2,
            planet3: p3,
            trine1: t1,
            trine2: t2,
            trine3: t3,
            description: `${p1}, ${p2}, and ${p3} form a Grand Trine`
          });
        }
      }
    }
  }

  // Detect GRAND CROSSES
  for (let i = 0; i < planetNames.length; i++) {
    for (let j = i + 1; j < planetNames.length; j++) {
      for (let k = j + 1; k < planetNames.length; k++) {
        for (let l = k + 1; l < planetNames.length; l++) {
          const p1 = planetNames[i];
          const p2 = planetNames[j];
          const p3 = planetNames[k];
          const p4 = planetNames[l];

          const opp1 = findAspectBetween(p1, p3, 'OPPOSITION');
          const opp2 = findAspectBetween(p2, p4, 'OPPOSITION');

          if (opp1 && opp2) {
            const sq1 = findAspectBetween(p1, p2, 'SQUARE');
            const sq2 = findAspectBetween(p2, p3, 'SQUARE');
            const sq3 = findAspectBetween(p3, p4, 'SQUARE');
            const sq4 = findAspectBetween(p4, p1, 'SQUARE');

            if (sq1 && sq2 && sq3 && sq4) {
              patterns.grandCrosses.push({
                type: 'GRAND_CROSS',
                planet1: p1,
                planet2: p2,
                planet3: p3,
                planet4: p4,
                opposition1: opp1,
                opposition2: opp2,
                squares: [sq1, sq2, sq3, sq4],
                description: `${p1}, ${p2}, ${p3}, and ${p4} form a Grand Cross`
              });
            }
          }
        }
      }
    }
  }

  // Detect KITES
  patterns.grandTrines.forEach(gt => {
    const { planet1, planet2, planet3 } = gt;

    Object.keys(planets).forEach(apexName => {
      if (apexName === planet1 || apexName === planet2 || apexName === planet3) return;

      const opp1 = findAspectBetween(apexName, planet1, 'OPPOSITION');
      const sex2 = findAspectBetween(apexName, planet2, 'SEXTILE');
      const sex3 = findAspectBetween(apexName, planet3, 'SEXTILE');

      if (opp1 && sex2 && sex3) {
        patterns.kites.push({
          type: 'KITE',
          grandTrine: gt,
          apex: apexName,
          opposition: opp1,
          sextiles: [sex2, sex3],
          description: `Kite: ${planet1}, ${planet2}, ${planet3} grand trine with ${apexName} as apex`
        });
        return;
      }

      const opp2 = findAspectBetween(apexName, planet2, 'OPPOSITION');
      const sex1 = findAspectBetween(apexName, planet1, 'SEXTILE');
      const sex3b = findAspectBetween(apexName, planet3, 'SEXTILE');

      if (opp2 && sex1 && sex3b) {
        patterns.kites.push({
          type: 'KITE',
          grandTrine: gt,
          apex: apexName,
          opposition: opp2,
          sextiles: [sex1, sex3b],
          description: `Kite: ${planet1}, ${planet2}, ${planet3} grand trine with ${apexName} as apex`
        });
        return;
      }

      const opp3 = findAspectBetween(apexName, planet3, 'OPPOSITION');
      const sex1b = findAspectBetween(apexName, planet1, 'SEXTILE');
      const sex2b = findAspectBetween(apexName, planet2, 'SEXTILE');

      if (opp3 && sex1b && sex2b) {
        patterns.kites.push({
          type: 'KITE',
          grandTrine: gt,
          apex: apexName,
          opposition: opp3,
          sextiles: [sex1b, sex2b],
          description: `Kite: ${planet1}, ${planet2}, ${planet3} grand trine with ${apexName} as apex`
        });
      }
    });
  });

  return patterns;
}

module.exports = {
  calculateAspects,
  detectAspectPatterns
};
