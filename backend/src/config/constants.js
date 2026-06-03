// Ball field geometry (Unreal units)
export const BALL_FIELD_Y = [-5120, 5120];
export const BALL_MIDFIELD_BAND_Y = 1024;
export const BALL_DEF_THIRD = BALL_FIELD_Y[0] + (BALL_FIELD_Y[1] - BALL_FIELD_Y[0]) / 3;
export const BALL_ATT_THIRD = BALL_FIELD_Y[1] - (BALL_FIELD_Y[1] - BALL_FIELD_Y[0]) / 3;
export const BALL_GROUND_Z = 100;
export const BALL_HIGH_AERIAL_Z = 600;
export const BALL_MEDIUM_SPEED = 1000;
export const BALL_FAST_SPEED = 2000;
export const BALL_SUPERSONIC_SPEED = 3000;
export const BALL_PRESSURE_BUCKET_SECONDS = 10;

// Boost pad values (Unreal boost units)
export const BOOST_PAD_VALUES = { big: 100, small: 12 };

// Max 2D distance to snap an observed pad to the canonical layout
export const CANONICAL_BOOST_PAD_SNAP_DISTANCE = 550;

// RLBot-documented standard Soccar boost pad layout in Unreal units.
export const STANDARD_SOCCAR_BOOST_PADS = [
  [0, -4240, 70, "small"],
  [-1792, -4184, 70, "small"],
  [1792, -4184, 70, "small"],
  [-3072, -4096, 73, "big"],
  [3072, -4096, 73, "big"],
  [-940, -3308, 70, "small"],
  [940, -3308, 70, "small"],
  [0, -2816, 70, "small"],
  [-3584, -2484, 70, "small"],
  [3584, -2484, 70, "small"],
  [-1788, -2302, 70, "small"],
  [1788, -2302, 70, "small"],
  [-2048, -1036, 70, "small"],
  [0, -1024, 70, "small"],
  [2048, -1036, 70, "small"],
  [-3584, 0, 73, "big"],
  [-1024, 0, 70, "small"],
  [1024, 0, 70, "small"],
  [3584, 0, 73, "big"],
  [-2048, 1036, 70, "small"],
  [0, 1024, 70, "small"],
  [2048, 1036, 70, "small"],
  [-1788, 2302, 70, "small"],
  [1788, 2302, 70, "small"],
  [-3584, 2484, 70, "small"],
  [3584, 2484, 70, "small"],
  [0, 2816, 70, "small"],
  [-940, 3308, 70, "small"],
  [940, 3308, 70, "small"],
  [-3072, 4096, 73, "big"],
  [3072, 4096, 73, "big"],
  [-1792, 4184, 70, "small"],
  [1792, 4184, 70, "small"],
  [0, 4240, 70, "small"],
].map(([x, y, z, padType], index) => ({ id: `standard-soccar-${index}`, index, x, y, z, padType }));

export const KNOWN_STANDARD_SOCCAR_MAPS = new Set([
  "arc_standard_p",
  "beach_p",
  "beach_night_p",
  "chn_stadium_p",
  "cs_day_p",
  "cs_hw_p",
  "cs_p",
  "eurostadium_p",
  "eurostadium_rainy_p",
  "farm_p",
  "farm_night_p",
  "forbidden_temple_p",
  "neotokyo_standard_p",
  "park_p",
  "park_night_p",
  "park_rainy_p",
  "stadium_p",
  "trainstation_p",
  "trainstation_dawn_p",
  "utopiastadium_p",
  "wasteland_s_p",
  "wasteland_night_s_p",
]);

export const KNOWN_NON_STANDARD_MAP_MARKERS = [
  "cosmic",
  "doublegoal",
  "dropshot",
  "galleon",
  "hoops",
  "labs",
  "octagon",
  "pillar",
  "shatter",
  "throwback",
  "underpass",
];

// Body IDs sourced from RLBotGUI items.csv (BakkesMod dumpitems) + community DB.
export const CAR_NAMES = {
  21: "Backfire", 22: "Breakout", 23: "Octane", 24: "Paladin",
  25: "Road Hog", 26: "Gizmo", 27: "Sweet Tooth", 28: "X-Devil",
  29: "Hotshot", 30: "Merc", 31: "Venom",
  402: "Takumi", 403: "Dominus", 404: "Scarab", 523: "Zippy",
  597: "DeLorean Time Machine", 600: "Ripper", 607: "Grog",
  625: "Armadillo", 803: "Batmobile (2016)",
  1018: "Dominus GT", 1159: "X-Devil Mk2", 1171: "Masamune",
  1172: "Marauder", 1286: "Aftershock", 1295: "Takumi RX-T",
  1300: "Road Hog XL", 1317: "Esper", 1416: "Breakout Type-S",
  1475: "Proteus", 1478: "Triton", 1533: "Vulcan", 1568: "Octane ZSR",
  1603: "Twin Mill III", 1623: "Bone Shaker", 1624: "Endo",
  1675: "Ice Charger", 1689: "Nemesis", 1691: "Mantis",
  1856: "Jäger 619", 1883: "Imperator DT5", 1894: "Samurai",
  1919: "Centio", 1932: "Animus GP", 2070: "Werewolf",
  3451: "Nimbus", 4284: "Fennec", 4906: "Harbinger", 5361: "Dingo",
  6243: "Nexus",
};

// Maps stdout step names from analyzeReplay.js to human-readable labels
export const STEP_LABEL_MAP = {
  buildPlayerMapping: "Building player mapping",
  extractPlayerPositions: "Extracting player positions",
  generateHeatmaps: "Generating heatmaps",
  extractBoostStatsV2: "Extracting boost stats",
  extractBoostPickupStats: "Extracting boost pickups",
  refineBoostPickupStatsV2: "Refining boost pickups",
  extractGameTimeline: "Extracting game timeline",
  extractBallStats: "Extracting ball stats",
  extractAdvancedPlayerStats: "Extracting advanced player stats",
  extractMatchMeta: "Extracting match meta",
  combinePlayerStats: "Combining player stats",
  renderDiscordCards: "Rendering Discord cards",
};
