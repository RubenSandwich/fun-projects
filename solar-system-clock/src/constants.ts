import { generateUUID, getRandomInt, minsToMs } from "./utlilites";

const CONSTANTS = {
  gravity: 100, // Gravitational constant
  destabilise: 0.15,
  logUuid: generateUUID(),

  tickIntervalMs: 300_000, // every 5 mins, which is 288 updates a day ((60 * 24) / 5)
  tickPeriod: 48_611_111.111,
  endOfTheUniverseYear: 98_000_000_000, // 2,016 ticks, or 7 days

  getPlanetAddInterval: (): number => {
    return getRandomInt(minsToMs(0.01), minsToMs(0.1));
  },

  getStarAddInterval: (): number => {
    return getRandomInt(minsToMs(20), minsToMs(25));
  },

  getNebulaAddInterval: (): number => {
    return getRandomInt(minsToMs(20), minsToMs(25));
  },

  starFadeInterval: minsToMs(0.7),

  universePhasesByTick: {
    0: "big bang",
    20: "nebulas form",
    50: "stars form",
    1000: "planets form",
    2222: "supernova",
    3333: "black hole",
  } as { [key: number]: string }, // Type for universePhasesByTick
};

export default CONSTANTS;
