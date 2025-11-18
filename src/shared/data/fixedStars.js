/**
 * Fixed Stars Database
 *
 * Contains data for fixed stars used in astrological calculations.
 * Positions are given at epoch J2000.0 (January 1, 2000, 12:00 TT)
 *
 * References:
 * - Vivian Robson, "The Fixed Stars and Constellations in Astrology" (1923)
 * - Brady's Book of Fixed Stars by Bernadette Brady (1998)
 * - Swiss Ephemeris fixed star catalog
 */

/**
 * Tier 1: Essential Stars (15 stars)
 * The most commonly referenced and historically significant fixed stars
 */
export const FIXED_STARS_TIER1 = [
  {
    id: "regulus",
    name: "Regulus",
    traditionalName: "Cor Leonis (Heart of the Lion)",
    constellation: "Leo",
    magnitude: 1.35,
    longitude2000: 149.88, // 29°52'48" Leo at J2000
    latitude: 0.46,
    properMotion: 0.0139, // degrees per year (precession ~50" per year)
    nature: ["Mars", "Jupiter"],
    orb: 2.3, // 2°30' for first magnitude stars
    interpretation: {
      positive: "Royal honors, success, victory, military prowess, executive ability, strength of character, noble spirit, high office, leadership qualities, magnanimity, generosity",
      negative: "Violence, destructiveness, military disasters, accidents, sudden downfall from high position, revenge, scandal involving high position, cruelty if rising with afflicted luminaries",
      general: "The royal star of leadership and nobility. Known as the 'Little King' or 'Heart of the Lion.' Grants success and power but with the ancient warning 'revenge is thine' - success must be used wisely and nobly or it will be taken away. One of the four Royal Stars of Persia, guardian of the North."
    },
    historicalNote: "One of the four Royal Stars of Persia (Guardians of Heaven), marking the summer solstice circa 3000 BC. In Babylonian astronomy known as 'The Star that Stands at the Lion's Breast.' Regulus has been used for celestial navigation and calendar systems for millennia. Notable: Abraham Lincoln had Ascendant conjunct Regulus.",
    keywords: ["kingship", "courage", "ambition", "nobility", "success", "leadership", "danger", "revenge"]
  },

  {
    id: "aldebaran",
    name: "Aldebaran",
    traditionalName: "The Bull's Eye / The Follower",
    constellation: "Taurus",
    magnitude: 0.85,
    longitude2000: 69.83, // 9°50' Gemini
    latitude: -5.47,
    properMotion: 0.0138,
    nature: ["Mars"],
    orb: 2.3,
    interpretation: {
      positive: "Honor, intelligence, eloquence, steadfastness, integrity, popularity, courage, ferocity, military preferment, favorable for business and material success",
      negative: "Rashness, stubbornness, violence if conjunct Mars or malefics, riches with a fall, disgrace, ruin, danger from quarrels and the law",
      general: "One of the four Royal Stars of Persia, guardian of the East. The 'Eye of the Bull' in Taurus. Brings military honor and wealth but warns against the misuse of power and violence. Success often followed by sudden reversals if integrity is lost."
    },
    historicalNote: "Royal Star marking the vernal equinox circa 3000 BC. Arabic name Al Dabaran means 'The Follower' (follows the Pleiades across the sky). In Persian astrology, one of the four Guardians of Heaven. Princess Diana had Mars conjunct Aldebaran.",
    keywords: ["honor", "integrity", "courage", "stubbornness", "materialism", "military"]
  },

  {
    id: "antares",
    name: "Antares",
    traditionalName: "Cor Scorpii (Heart of the Scorpion)",
    constellation: "Scorpius",
    magnitude: 1.09,
    longitude2000: 249.83, // 9°50' Sagittarius
    latitude: -4.57,
    properMotion: 0.0138,
    nature: ["Mars", "Jupiter"],
    orb: 2.3,
    interpretation: {
      positive: "Boldness, courage, success through adventures, strong intuition, psychic ability, interest in occult and mysteries, leadership in crises",
      negative: "Rashness, destructiveness, obstinacy, malevolence, violence, danger from wounds, accidents, legal troubles, sudden losses",
      general: "One of the four Royal Stars, guardian of the West. The rival of Mars (Greek: Anti-Ares). Associated with warfare, courage, and intensity. Grants success through daring and boldness but warns of rashness and destructive tendencies. Deep, penetrating insight."
    },
    historicalNote: "Royal Star marking the autumnal equinox circa 3000 BC. Called 'The Rival of Mars' due to its reddish color rivaling the planet Mars. In Chinese astronomy, it marks the heart of the Azure Dragon. One of the four Persian Royal Stars.",
    keywords: ["intensity", "courage", "warfare", "obsession", "danger", "boldness"]
  },

  {
    id: "fomalhaut",
    name: "Fomalhaut",
    traditionalName: "The Mouth of the Southern Fish",
    constellation: "Piscis Austrinus",
    magnitude: 1.16,
    longitude2000: 333.83, // 3°50' Pisces
    latitude: -21.02,
    properMotion: 0.0141,
    nature: ["Venus", "Mercury"],
    orb: 2.3,
    interpretation: {
      positive: "Idealism, inspiration, poetic and artistic ability, mysticism, psychic gifts, success in the arts, rise through merit and talent, spiritual insight",
      negative: "Dreaminess, idealism leading to disappointment, rise followed by fall if ethics compromised, danger through ungrounded idealism, loss through speculation",
      general: "One of the four Royal Stars, guardian of the South. The most ethereal and spiritual of the Royal Stars. Associated with immortality, idealism, and otherworldly matters. Brings success through poetry, art, and mysticism, but warns to maintain ethical standards or face downfall."
    },
    historicalNote: "Royal Star marking the winter solstice circa 3000 BC. Arabic name Fum al Hut means 'Mouth of the Fish.' Known as the 'Solitary One' or 'Lonely Star' because no other bright stars surround it. Associated with the archangel Gabriel in Persian astrology.",
    keywords: ["idealism", "artistry", "spirituality", "immortality", "mysticism", "ethics"]
  },

  {
    id: "algol",
    name: "Algol",
    traditionalName: "Caput Algol / The Demon's Head",
    constellation: "Perseus",
    magnitude: 2.12, // Variable: 2.1-3.4
    longitude2000: 56.17, // 26°10' Taurus
    latitude: 22.43,
    properMotion: 0.0138,
    nature: ["Saturn", "Mars"],
    orb: 1.5,
    interpretation: {
      positive: "Intensity, depth, transformation, ability to face darkness and emerge stronger, research ability, interest in taboo subjects, protective instincts, courage to confront evil, regenerative power",
      negative: "Violence, beheading, losing one's head (literally or figuratively), rage, brutality, vengeance, mob violence, misfortune, accidents to the head and neck, intoxication, mass casualties",
      general: "The most infamous fixed star in astrology. Represents the severed head of Medusa held by Perseus. Associated with extreme passion, violence, and transformation. Brings powerful survival instincts and the ability to face fear. Modern astrologers emphasize its transformative and protective qualities - the courage to face one's demons."
    },
    historicalNote: "Arabic Al Ra's al Ghul means 'The Demon's Head.' A variable star that 'winks' every 2.87 days (eclipsing binary). In medieval astrology, considered the most malefic star. Hebrew name was Rosh ha Sitan (Satan's Head). Despite its dark reputation, it's associated with the hero Perseus who protected innocents. Princess Diana had Moon conjunct Algol.",
    keywords: ["intensity", "passion", "danger", "transformation", "taboo", "violence", "courage", "protection"]
  },

  {
    id: "spica",
    name: "Spica",
    traditionalName: "Arista (The Wheat Sheaf / Ear of Grain)",
    constellation: "Virgo",
    magnitude: 0.98,
    longitude2000: 203.84, // 23°50' Libra
    latitude: -2.07,
    properMotion: 0.0139,
    nature: ["Venus", "Mercury"],
    orb: 2.0,
    interpretation: {
      positive: "Success, fame, wealth, artistic ability, scientific gifts, spiritual insight, protection, good fortune, refinement, grace, popularity, psychic ability, inventiveness",
      negative: "Unexpected loss, problems in love, disappointment through relationships, injustice, sudden reversal of fortune",
      general: "The great benefic star, associated with the Virgin's wheat sheaf. One of the most fortunate stars in the heavens. Brings success especially in art, science, writing, and navigation. Associated with gifts, protection, and lasting success. A star of harvested rewards for patient labor."
    },
    historicalNote: "Brightest star in Virgo, marking the wheat sheaf held by the Virgin. Used by Hipparchus to discover the precession of the equinoxes in 129 BC. Associated with Persephone and the harvest. One of the most benefic stars in classical astrology. The goddess of justice, Astraea, is depicted holding this 'ear of wheat.'",
    keywords: ["success", "fortune", "gifts", "protection", "artistic", "benefic", "harvest", "justice"]
  },

  {
    id: "sirius",
    name: "Sirius",
    traditionalName: "The Dog Star / Canicula",
    constellation: "Canis Major",
    magnitude: -1.46, // Brightest star in the night sky
    longitude2000: 104.00, // 14°00' Cancer
    latitude: -39.60,
    properMotion: 0.0139,
    nature: ["Jupiter", "Mars"],
    orb: 2.3,
    interpretation: {
      positive: "Honor, renown, wealth, ardor, faithfulness, devotion, passion, resentment of criticism, high ambition, good business ability, danger from fire offset by success",
      negative: "Excessive passion, dog-bites, fevers, fire, danger from great heat, damage by fire or plague, excessiveness, hasty temper",
      general: "The brightest star in the sky. The faithful Dog following Orion the Hunter. Associated with the 'dog days' of summer. Brings success, honor and wealth, but warns of excessive passion and the dangers of fire. Powerful for prominence and achievement."
    },
    historicalNote: "The brightest star in the night sky, visible in ancient Egypt where its heliacal rising marked the flooding of the Nile and the Egyptian New Year. Called Sopdet by Egyptians, associated with Isis. The Romans called it Canicula (little dog) and believed it caused the heat of summer - the 'dog days.'",
    keywords: ["brilliance", "fame", "passion", "honor", "heat", "excessiveness", "devotion"]
  },

  {
    id: "arcturus",
    name: "Arcturus",
    traditionalName: "The Bear Watcher / Guardian of the Bear",
    constellation: "Boötes",
    magnitude: -0.05, // 4th brightest star
    longitude2000: 204.00, // 24°00' Libra
    latitude: 30.75,
    properMotion: 0.0140,
    nature: ["Mars", "Jupiter"],
    orb: 2.0,
    interpretation: {
      positive: "Prosperity, riches, honor, high renown, self-determination, love of justice, navigation skills, voyaging, martial honor, leadership",
      negative: "Stubbornness, legal troubles if afflicted, sudden and unexpected events, quarrels, violence when aroused",
      general: "The Guardian of the Bear (follows Ursa Major across the sky). Associated with alternative approaches, new paths, and independent thinking. Brings prosperity and honor, especially through navigation, travel, and pioneering new directions. Strong sense of justice."
    },
    historicalNote: "One of the brightest stars, 4th in luminosity. Name from Greek Arktouros meaning 'Bear Guard.' Used for navigation for millennia. In Hawaiian navigation, called Hokule'a (Star of Gladness). Ancient Greeks saw it as the guardian of the heavenly bears (Ursa Major and Minor).",
    keywords: ["prosperity", "honor", "navigation", "justice", "independence", "travel"]
  },

  {
    id: "procyon",
    name: "Procyon",
    traditionalName: "Before the Dog / The Little Dog",
    constellation: "Canis Minor",
    magnitude: 0.38,
    longitude2000: 115.83, // 25°50' Cancer
    latitude: 16.06,
    properMotion: 0.0139,
    nature: ["Mercury", "Mars"],
    orb: 1.8,
    interpretation: {
      positive: "Activity, violence in defense of honor, sudden success, elevation, riches, craftiness, good mental abilities, swiftness",
      negative: "Danger from bites, violence, sudden violence or death, hasty judgment, impulsiveness, accidents involving dogs or sharp objects",
      general: "The Little Dog Star, rising before Sirius the Great Dog. Associated with swiftness, activity, and sudden rises in fortune. Brings quick success and mental agility, but warns of hasty judgment and impulsive actions. Often indicates rises that happen very suddenly."
    },
    historicalNote: "Name from Greek Pro Kyon meaning 'Before the Dog' (rises before Sirius). Forms the Winter Triangle with Sirius and Betelgeuse. In Greek myth, one of Orion's hunting dogs. Known for suddenness and swift action.",
    keywords: ["swiftness", "activity", "suddenness", "cleverness", "impulsiveness", "elevation"]
  },

  {
    id: "castor",
    name: "Castor",
    traditionalName: "The Mortal Twin / The Horseman",
    constellation: "Gemini",
    magnitude: 1.58,
    longitude2000: 110.00, // 20°00' Cancer
    latitude: 10.03,
    properMotion: 0.0138,
    nature: ["Mercury", "Mars"],
    orb: 1.5,
    interpretation: {
      positive: "Mental brilliance, distinction, refinement, keen perception, sudden fame, violence in defense of virtue, horsemanship, writing ability",
      negative: "Violence, sudden sickness, nervous disorders, disgrace, accidents, injuries to the face",
      general: "The mortal twin of Gemini (while Pollux is immortal). Associated with intellectual pursuits, writing, horsemanship, and sudden fame. Brings mental agility and distinction but warns of nervous disorders and accidents, particularly to the face or involving horses."
    },
    historicalNote: "In Greek myth, Castor was the mortal twin, son of Tyndareus, renowned for horsemanship and fighting. He and Pollux were inseparable. When Castor died, Pollux asked Zeus to let him share his immortality with his brother, so they alternate between Olympus and Hades.",
    keywords: ["intellect", "writing", "horsemanship", "duality", "refinement", "nervousness"]
  },

  {
    id: "pollux",
    name: "Pollux",
    traditionalName: "The Immortal Twin / The Boxer",
    constellation: "Gemini",
    magnitude: 1.14,
    longitude2000: 113.17, // 23°10' Cancer
    latitude: 6.69,
    properMotion: 0.0138,
    nature: ["Mars"],
    orb: 1.8,
    interpretation: {
      positive: "Subtle, crafty, spirited nature, keen intellect, love of boxing and athletics, bold, adventurous, crude manner that is somewhat unpleasant, audacity",
      negative: "Rashness, cruelty, violence, sickness, disgrace, tendency toward brutality, injuries to the face, sudden violence",
      general: "The immortal twin, associated with boxing and physical prowess. Brings boldness, courage, and athletic ability. More martial and physical than Castor. Associated with daring adventures but warns against brutality and rashness."
    },
    historicalNote: "In Greek myth, Pollux was the immortal twin, son of Zeus, renowned for boxing. Inseparable from his mortal brother Castor. Patron of sailors and boxing. The name Pollux means 'much wine' (associated with Dionysus).",
    keywords: ["boldness", "athletics", "adventure", "physicality", "courage", "rashness"]
  },

  {
    id: "betelgeuse",
    name: "Betelgeuse",
    traditionalName: "The Armpit / Shoulder of Orion",
    constellation: "Orion",
    magnitude: 0.50, // Variable: 0.0-1.3
    longitude2000: 88.67, // 28°40' Gemini
    latitude: -16.03,
    properMotion: 0.0139,
    nature: ["Mars", "Mercury"],
    orb: 1.8,
    interpretation: {
      positive: "Martial success, fortune through war, command, everlasting fame, fortune, preferment, high honor",
      negative: "Sudden reversals, accidents, violence, rashness, losses through speculation, danger of catastrophe",
      general: "The brilliant red supergiant marking Orion's shoulder. Associated with military success and great honors, but with warnings of sudden catastrophic reversal. Brings fortune and fame, particularly through martial or adventurous pursuits. Notable for both great rises and sudden falls."
    },
    historicalNote: "Red supergiant, one of the largest stars known. Arabic name Ya'd al Jawza means 'Hand of the Central One' (Orion). A dying star that will eventually explode as a supernova. Variable in brightness, symbolizing its unstable nature. May have already exploded and we're awaiting the light.",
    keywords: ["military", "fortune", "fame", "suddenness", "catastrophe", "honor", "instability"]
  },

  {
    id: "rigel",
    name: "Rigel",
    traditionalName: "The Foot of Orion / Rigel",
    constellation: "Orion",
    magnitude: 0.12, // 7th brightest star
    longitude2000: 76.83, // 16°50' Gemini
    latitude: -31.07,
    properMotion: 0.0138,
    nature: ["Jupiter", "Mars"],
    orb: 2.0,
    interpretation: {
      positive: "Great fortune, lasting happiness, inventiveness, mechanical ability, knowledge, education, honors through learning, wealth, ecclesiastical preferment",
      negative: "Injuries to the left leg or foot, accidents involving machinery, trouble through invention if afflicted by Saturn",
      general: "The brilliant blue-white foot of Orion the Hunter. A highly benefic star associated with knowledge, education, and lasting success. Brings great fortune especially through learning, invention, and mechanical pursuits. One of the more fortunate stars for lasting happiness and success."
    },
    historicalNote: "Arabic name Rijl Jauzah al Yusra means 'The Left Leg of the Central One' (Orion). The brightest star in Orion despite being designated Beta. A blue supergiant, very hot and luminous. Used extensively for celestial navigation.",
    keywords: ["knowledge", "education", "invention", "fortune", "mechanical", "happiness"]
  },

  {
    id: "vega",
    name: "Vega",
    traditionalName: "The Falling Vulture / The Harp Star",
    constellation: "Lyra",
    magnitude: 0.03, // 5th brightest star
    longitude2000: 285.00, // 15°00' Capricorn
    latitude: 61.75,
    properMotion: 0.0140,
    nature: ["Venus", "Mercury"],
    orb: 2.0,
    interpretation: {
      positive: "Beneficence, ideality, hopefulness, refinement, changeability, artistic abilities, musical talent, grave and studious nature, critical ability",
      negative: "Instability, unsteadiness, bad morals if afflicted, unfortunate in love if setting, changeable fortune",
      general: "The bright Harp Star, associated with Orpheus's lyre. One of the most benefic stars for artistic and musical ability. Brings refinement, idealism, and critical faculties. Associated with the arts, music, and all graceful pursuits. Can indicate changeability in fortune."
    },
    historicalNote: "Arabic name Al Nasr al Waki means 'The Swooping Eagle' or 'Falling Vulture.' The brightest star in Lyra, Orpheus's harp. Was the pole star around 12,000 BC and will be again around 13,727 AD. Used to calibrate photometric measurements. Part of the Summer Triangle.",
    keywords: ["artistry", "music", "refinement", "idealism", "changeability", "grace"]
  },

  {
    id: "altair",
    name: "Altair",
    traditionalName: "The Flying Eagle / The Bird",
    constellation: "Aquila",
    magnitude: 0.77,
    longitude2000: 301.67, // 1°40' Aquarius
    latitude: 29.30,
    properMotion: 0.0140,
    nature: ["Mars", "Jupiter"],
    orb: 1.8,
    interpretation: {
      positive: "Sudden and preferably brilliant success, boldness, ambition, courage, liberal and generosity, military honor, gain through inheritance, unyielding nature",
      negative: "Sudden and violent death if seriously afflicted, danger from reptiles, great courage often leading to foolhardiness, tendency to challenge authority",
      general: "The Flying Eagle, associated with the eagle of Zeus. Brings sudden success, boldness, and military honors. Strong association with courage and ambition. Warns of foolhardiness and danger from challenging those in power. Success often comes suddenly and dramatically."
    },
    historicalNote: "Arabic name Al Nasr al Ta'ir means 'The Flying Eagle.' The brightest star in Aquila, representing the eagle that carried Zeus's thunderbolts. Part of the Summer Triangle with Vega and Deneb. In Chinese astronomy, part of the Ox-Herd and Weaver Girl love story.",
    keywords: ["boldness", "courage", "ambition", "military", "suddenness", "inheritance"]
  }
];

/**
 * Tier 2: Additional Important Stars (15 more)
 * For Phase 2 implementation or advanced users
 */
export const FIXED_STARS_TIER2 = [
  {
    id: "deneb_algedi",
    name: "Deneb Algedi",
    traditionalName: "The Tail of the Goat",
    constellation: "Capricornus",
    magnitude: 2.87,
    longitude2000: 323.67, // 23°40' Aquarius
    latitude: -2.23,
    properMotion: 0.0138,
    nature: ["Saturn", "Jupiter"],
    orb: 1.0,
    interpretation: {
      positive: "Justice, beneficence, perseverance, many friends, sorrow and happiness changing, success in life",
      negative: "Disgrace, retribution, misfortune when trust is betrayed, legal troubles",
      general: "The tail of the Sea-Goat. Associated with transformation, sacrifice for greater good, and justice. Brings many friends and ultimate success, but through alternating periods of sorrow and joy."
    },
    historicalNote: "Arabic Dhanab al Jady means 'Tail of the Goat.' Marks the tail of Capricornus, the Sea-Goat. Associated with the transformative journey from sea to land, chaos to order.",
    keywords: ["justice", "transformation", "perseverance", "friendship", "sacrifice"]
  },

  {
    id: "achernar",
    name: "Achernar",
    traditionalName: "The End of the River",
    constellation: "Eridanus",
    magnitude: 0.46,
    longitude2000: 345.00, // 15°00' Pisces
    latitude: -58.97,
    properMotion: 0.0141,
    nature: ["Jupiter"],
    orb: 2.0,
    interpretation: {
      positive: "Success in public office, ecclesiastical preferment, philosophical mind, optimistic outlook, voyages and travel",
      negative: "Sudden positions and sudden loss of them, danger from water or drowning",
      general: "The end of the celestial river Eridanus. Associated with journeys, particularly spiritual or philosophical ones. Brings success in public affairs and ecclesiastical matters. Warns of sudden changes in position."
    },
    historicalNote: "Arabic name Akhir an-Nahr means 'The End of the River.' Marks the southern terminus of Eridanus, the celestial river. Only visible from latitudes south of 33°N. 9th brightest star in the night sky.",
    keywords: ["journeys", "philosophy", "endings", "public_office", "water", "spirituality"]
  },

  // More Tier 2 stars to be added in Phase 2
];

/**
 * All fixed stars combined
 */
export const FIXED_STARS_ALL = [
  ...FIXED_STARS_TIER1,
  ...FIXED_STARS_TIER2
];

/**
 * Create a lookup map for quick access by ID
 */
export const FIXED_STARS_MAP = FIXED_STARS_ALL.reduce((map, star) => {
  map[star.id] = star;
  return map;
}, {});

/**
 * Get stars by tier
 */
export function getFixedStarsByTier(tier = 'tier1') {
  switch (tier) {
    case 'tier1':
      return FIXED_STARS_TIER1;
    case 'tier2':
      return FIXED_STARS_TIER2;
    case 'all':
      return FIXED_STARS_ALL;
    default:
      return FIXED_STARS_TIER1;
  }
}

/**
 * Get a fixed star by ID
 */
export function getFixedStarById(id) {
  return FIXED_STARS_MAP[id];
}

export default {
  FIXED_STARS_TIER1,
  FIXED_STARS_TIER2,
  FIXED_STARS_ALL,
  FIXED_STARS_MAP,
  getFixedStarsByTier,
  getFixedStarById
};
