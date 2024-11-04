var CONSTANTS = {
  gravity: 100, // Gravitational constant
  destabilise: 0.15,
  logUuid: generateUUID(),

  tickIntervalMs: parsePrettyNum("300_000"), // every 5 mins, which is 288 updates a day ((60 * 24) / 5)
  tickPeriod: parsePrettyNum("48_611_111.111"),
  endOfTheUniverseYear: parsePrettyNum("98_000_000_000"), // 2,016 ticks, or 7 days

  getPlanetAddInterval: function () {
    return random(1200000, 1500000); // 20 - 25 mins
  },

  getStarAddInterval: function () {
    return random(1200000, 1500000);
  },

  getNebulaAddInterval: function () {
    return random(1200000, 1500000);
  },

  starFadeInterval: 42000, // 0.7 min

  universePhasesByTick: {
    0: "big bang",
    20: "nebulas form",
    50: "stars form",
    1000: "planets form",
    2222: "supernova",
    3333: "black hole",
  },
};
