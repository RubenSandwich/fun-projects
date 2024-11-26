import P5 from "p5";

import { Sun, SunStage } from "./celestial_bodies/sun";
import { Planet } from "./celestial_bodies/planet";
import { Moon } from "./celestial_bodies/moon";
import { Nebula } from "./celestial_bodies/nebula";
import { PlanetTrail } from "./celestial_bodies/planetTrail";
import { Star, StarStage } from "./celestial_bodies/star";

import CONSTANTS from "./constants";
import {
  generateUUID,
  prettyNumString,
  getRandomInt,
  getRandomFloat,
  logTimes,
  describeUniverse,
} from "./utlilites";

// @ts-ignore: ts(2307) - This is the requested lay to load asset URLs in parcel
import end_times from "../assets/End_Times.mp3";

type UniverseState = {
  p5Renderer: P5.Renderer;
  uuid: string;
  logged: boolean;

  tickNum: number;
  tickIntervalRef: NodeJS.Timeout | null;

  sun: Sun;

  planets: (Planet | Moon)[];
  numPlanets: number;
  planetTrails: PlanetTrail[];
  planetAddInterval: number;
  lastPlanetAddTime: number;
  celestialBodiesToAdd: (Planet | Moon)[];
  orbitalRadii: number[];

  stars: Star[];
  numStars: number;
  starsToAdd: Star[];
  starChangeInterval: number;
  lastStarChangeTime: number;

  nebulas: Nebula[];
  numNebulas: number;
  nebulasFullyChanged: number;
  nebulaChangeInterval: number;
  lastNebulaChangeTime: number;

  prevDescription: string;

  endSound: HTMLAudioElement | null;
};

export const bigBounceUniverse = (p5: P5) => {
  const universeState: UniverseState = {
    p5Renderer: null!,
    sun: null!,

    uuid: generateUUID(),
    logged: false,

    tickNum: 0,
    tickIntervalRef: null,

    planets: [],
    numPlanets: !CONSTANTS.debug ? getRandomInt(4, 7) : 3,
    planetTrails: [],
    planetAddInterval: CONSTANTS.getPlanetAddInterval(),
    lastPlanetAddTime: 0,
    celestialBodiesToAdd: [],
    orbitalRadii: [], // Array to store orbital ring radii

    stars: [],
    numStars: !CONSTANTS.debug ? getRandomInt(150, 220) : 100,
    starsToAdd: [],
    starChangeInterval: CONSTANTS.getStarChangeInterval(),
    lastStarChangeTime: 0,

    nebulas: [],
    numNebulas: !CONSTANTS.debug ? getRandomInt(4, 7) : 3,
    nebulasFullyChanged: 0,
    nebulaChangeInterval: CONSTANTS.getNebulaChangeInterval(),
    lastNebulaChangeTime: 0,

    prevDescription: "",
    endSound: null,
  };

  p5.preload = () => {
    universeState.endSound = new Audio(end_times);
    universeState.endSound.preload = "auto";
  };

  p5.setup = () => {
    universeState.p5Renderer = p5.createCanvas(p5.windowWidth, p5.windowHeight);
    p5.frameRate(!CONSTANTS.debug ? 20 : 60);
    p5.colorMode(p5.HSB, 360, 100, 100, 1);

    universeState.sun = new Sun(p5);

    let previousRadius = universeState.sun.d * 1.5;
    for (let i = 0; i < universeState.numPlanets; i++) {
      universeState.orbitalRadii.push(
        getRandomInt(previousRadius, previousRadius + 40)
      );

      previousRadius = universeState.orbitalRadii[i] + 60;
    }

    const planetsMade: Planet[] = [];
    const moonsMade: Moon[] = [];
    for (let i = 0; i < universeState.numPlanets; i++) {
      const planetMass = getRandomInt(10, 30);
      const planetColor = p5.color(
        getRandomInt(360),
        getRandomInt(80, 100),
        getRandomInt(80, 100)
      );
      const planetTrailLength = planetMass * getRandomInt(0, 7);

      const planetTrail = new PlanetTrail(p5, planetColor, planetTrailLength);
      const planet = new Planet(
        p5,
        planetMass,
        universeState.orbitalRadii[i],
        planetColor,
        universeState.sun,
        planetTrail
      );
      planetsMade.push(planet);

      // Randomly add a moon to some planets
      if (getRandomFloat(1) < 0.5) {
        const moonMass = getRandomInt(3, 6);
        const moonColor = p5.color(
          getRandomInt(360),
          getRandomInt(80, 100),
          getRandomInt(80, 100)
        );
        const moonTrailLength = moonMass * 3;

        const moonTrail = new PlanetTrail(p5, moonColor, moonTrailLength);
        const moon = new Moon(p5, moonMass, moonColor, planet, moonTrail);
        moonsMade.push(moon);
      }
    }

    // Sort the planets by mass
    planetsMade.sort((a, b) => a.mass - b.mass);

    // Add the planets in with the moons, but never add a moon before its planet is added
    const celestialBodiesToAdd: (Planet | Moon)[] = [];
    for (let i = 0; moonsMade.length > 0 || planetsMade.length > 0; i++) {
      // always start with a planet
      if (i === 0) {
        celestialBodiesToAdd.push(planetsMade.shift()!);
        continue;
      }

      if (getRandomFloat(1) < 0.5 && moonsMade.length > 0) {
        // find the first moon where its orbitingBody is already in line
        const moon = moonsMade.find((m) =>
          m.orbitingBody ? celestialBodiesToAdd.includes(m.orbitingBody) : false
        );

        if (moon) {
          celestialBodiesToAdd.push(
            moonsMade.splice(moonsMade.indexOf(moon), 1)[0]
          );
        }

        continue;
      }

      if (planetsMade.length > 0) {
        celestialBodiesToAdd.push(planetsMade.shift()!);
        continue;
      }
    }
    universeState.celestialBodiesToAdd = celestialBodiesToAdd;

    // Create stars
    for (let i = 0; i < universeState.numStars; i++) {
      const star = new Star(p5);
      universeState.starsToAdd.push(star);
    }

    // Create nebulas
    for (let i = 0; i < universeState.numNebulas; i++) {
      const nebula = new Nebula(p5);
      universeState.nebulas.push(nebula);
    }

    universeState.tickIntervalRef = setInterval(function () {
      universeState.tickNum++;
    }, CONSTANTS.tickIntervalMs);
  };

  p5.draw = () => {
    // universeState.endSound.addEventListener("canplaythrough", () => {
    //   universeState.endSound.play();
    // });

    const year = universeState.tickNum * CONSTANTS.tickPeriod;

    // !! General Drawing !!
    p5.background(CONSTANTS.backgroundColor);

    p5.translate(p5.width / 2, p5.height / 2);

    p5.blendMode(p5.ADD);
    for (let i = 0; i < universeState.nebulas.length; i++) {
      universeState.nebulas[i].draw();
    }
    p5.blendMode(p5.BLEND);

    // Draw the stars
    for (let i = 0; i < universeState.stars.length; i++) {
      universeState.stars[i].draw();
    }

    universeState.sun.draw();

    for (let i = 0; i < universeState.planets.length; i++) {
      universeState.planets[i].move();
      universeState.planets[i].draw();

      // Check if the planet is completely covered by the sun
      if (
        universeState.planets[i].pos.dist(universeState.sun.pos) +
          universeState.planets[i].d / 2 <=
        universeState.sun.d / 2
      ) {
        universeState.planets[i].planetTrail?.beginWindDown(); // wind down the trail
        universeState.planets[i].destroy();
        universeState.planets.splice(i, 1); // Remove the planet

        continue; // Skip to the next iteration
      }
    }

    for (let i = 0; i < universeState.planetTrails.length; i++) {
      const shouldContinueDrawing = universeState.planetTrails[i].draw();
      if (!shouldContinueDrawing) {
        universeState.planetTrails.splice(i, 1);
      }
    }

    // !! Special stage drawings !!
    const sketchEpoch = p5.millis();
    switch (universeState.sun.stage) {
      // begin fading in nebulas and stars
      case SunStage.NEBULA:
        if (
          sketchEpoch - universeState.lastStarChangeTime >
            universeState.starChangeInterval &&
          universeState.starsToAdd.length > 0
        ) {
          const newStar = universeState.starsToAdd.shift();

          if (newStar) {
            universeState.stars.push(newStar);
          }

          universeState.lastStarChangeTime = p5.millis();
        }

        if (
          sketchEpoch - universeState.lastNebulaChangeTime >
            universeState.nebulaChangeInterval &&
          universeState.nebulasFullyChanged !== universeState.numNebulas
        ) {
          const getRandomNebula = () => {
            const randomIndex = Math.floor(
              getRandomInt(universeState.nebulas.length - 1)
            );

            return universeState.nebulas[randomIndex];
          };

          // get a random nebula that isn't at full alpha
          let nebula;
          while (true) {
            nebula = getRandomNebula();

            if (!nebula.atFullAlpha()) {
              break;
            }
          }

          const setAlpha = nebula.currentAlpha + getRandomInt(3, 5);
          nebula.changeAlpha(setAlpha);

          if (nebula.atFullAlpha()) {
            universeState.nebulasFullyChanged = +1;
          }

          universeState.lastNebulaChangeTime = p5.millis();
        }

        // actually wait till all nebulas have reached full brightness
        if (universeState.nebulasFullyChanged === universeState.numNebulas) {
          universeState.sun.stage = SunStage.SUN;
        }
        break;

      case SunStage.SUN:
        if (
          sketchEpoch - universeState.lastPlanetAddTime >
            universeState.planetAddInterval &&
          universeState.celestialBodiesToAdd.length > 0
        ) {
          const newBody = universeState.celestialBodiesToAdd.shift();

          if (newBody) {
            universeState.planets.push(newBody);

            if (newBody.planetTrail) {
              universeState.planetTrails.push(newBody.planetTrail);
            }

            universeState.lastPlanetAddTime = p5.millis();
          }
        }

        if (
          sketchEpoch - universeState.lastStarChangeTime >
            universeState.starChangeInterval &&
          universeState.starsToAdd.length > 0
        ) {
          const newStar = universeState.starsToAdd.shift();

          if (newStar) {
            universeState.stars.push(newStar);
          }

          universeState.lastStarChangeTime = p5.millis();
        }

        // If all planets are sucked in begin the black hole
        if (
          universeState.celestialBodiesToAdd.length === 0 &&
          universeState.planets.length === 0
        ) {
          universeState.sun.beginBlackHole();

          // if (!universeState.endSound.isPlaying()) {
          //   universeState.endSound.play();
          // }
        }
        break;

      // During the black hold stage begin fading out
      case SunStage.BLACK_HOLE:
        if (
          universeState.nebulas.length > 0 &&
          sketchEpoch - universeState.lastNebulaChangeTime >
            universeState.nebulaChangeInterval
        ) {
          const randomIndex = Math.floor(
            getRandomInt(universeState.nebulas.length - 1)
          );

          const nebula = universeState.nebulas[randomIndex];

          if (nebula.currentAlpha === 0) {
            universeState.nebulas.splice(randomIndex, 1);
          } else {
            const setAlpha = nebula.currentAlpha - getRandomInt(3, 5);
            nebula.changeAlpha(setAlpha);
          }

          universeState.lastNebulaChangeTime = p5.millis();
        }

        if (
          universeState.stars.length > 0 &&
          sketchEpoch - universeState.lastStarChangeTime >
            universeState.starChangeInterval
        ) {
          const randomIndex = Math.floor(
            getRandomInt(universeState.stars.length)
          );

          const star = universeState.stars[randomIndex];

          if (star && star.stage !== StarStage.Exploding) {
            universeState.stars[randomIndex].beginExploading(function () {
              universeState.stars.splice(randomIndex, 1);
            });
          }

          universeState.lastStarChangeTime = p5.millis();
        }

        if (
          universeState.stars.length === 0 &&
          universeState.nebulas.length === 0
        ) {
          universeState.sun.beginBigBang(function () {
            for (let i = 0; i < universeState.nebulas.length; i++) {
              universeState.nebulas[i].destroy();
            }

            // restart
            // TODO: refactor out a better setup function
            p5.setup();
          });
        }

        break;
    }

    const universeAge = prettyNumString(year);
    const universeAgeWidth = p5.textWidth(universeAge);
    const frameRate = p5.frameRate();
    const textSize = 15;

    p5.textSize(textSize);
    p5.noStroke();
    p5.fill(255);
    p5.text(
      !CONSTANTS.debug
        ? `${universeAge}`
        : `${frameRate ? frameRate.toFixed(2) : 0} FPS\n${universeAge}`,
      p5.width / 2 - universeAgeWidth - 10,
      p5.height / 2 - (!CONSTANTS.debug ? 10 : 20)
    );

    const description = describeUniverse({
      sun: universeState.sun,
      numPlanets: universeState.numPlanets,
      numStars: universeState.numStars,
      numNebulas: universeState.numNebulas,
      universeAge,
    });

    if (description !== universeState.prevDescription) {
      p5.describe(description);
      universeState.prevDescription = description;
    }
  };
};
