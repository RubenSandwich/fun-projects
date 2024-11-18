import { generateUUID, getRandomInt, minsToMs } from "./utlilites";

const CONSTANTS = {
  debug: (process.env.NODE_ENV ?? "") === "development",
  backgroundColor: "#1a1a1a",
  gravity: 100, // Gravitational constant
  destabilise: 0.15,
  logUuid: generateUUID(),

  tickIntervalMs: 150_000, // every 5 mins, which is 288 updates a day ((60 * 24) / 5)
  tickPeriod: 24_305_555.555,
  endOfTheUniverseYear: 98_000_000_000, // 2,016 ticks, or 7 days

  getPlanetAddInterval: (): number => {
    return !CONSTANTS.debug
      ? getRandomInt(minsToMs(0.01), minsToMs(0.1))
      : getRandomInt(minsToMs(0.01), minsToMs(0.1));
  },

  getStarAddInterval: (): number => {
    return !CONSTANTS.debug
      ? getRandomInt(minsToMs(20), minsToMs(25))
      : getRandomInt(minsToMs(20), minsToMs(25));
  },

  getNebulaAddInterval: (): number => {
    return !CONSTANTS.debug
      ? getRandomInt(minsToMs(20), minsToMs(25))
      : getRandomInt(minsToMs(20), minsToMs(25));
  },

  getStarFadeInterval: (): number => {
    return !CONSTANTS.debug ? minsToMs(0.7) : minsToMs(0.7);
  },

  universePhasesByTick: {
    0: "big bang",
    20: "nebulas form",
    50: "stars form",
    1000: "planets form",
    2000: "supernova",
    3333: "black hole",
  } as { [key: number]: string },
};

export default CONSTANTS;
