import P5 from "p5";

import { Sun, SunStage } from "./celestial_bodies/sun";
import { Planet } from "./celestial_bodies/planet";
import { Moon } from "./celestial_bodies/moon";
import { Nebula } from "./celestial_bodies/nebula";
import { PlanetTrail } from "./celestial_bodies/planetTrail";
import { Star, StarStage } from "./celestial_bodies/star";

import { simpleUniverseCreator } from "./simpleUniverse";

import CONSTANTS from "./constants";
import {
  generateUUID,
  parseErrorMessage,
  prettyNumString,
  getRandomInt,
  getRandomFloat,
  logTimes,
} from "./utlilites";

// @ts-ignore: ts(2307) - This is the requested lay to load asset URLs in parcel
import end_times from "../assets/End_Times.mp3";

// TODO:
//    1. start at the big bang
//    2. the sun should only grow when it "eats" a planet
//    3. create a comet class that randomly flys by
//        a. If it hits the sun and make it grow
//    4. have nebulas fade in and out as the universe age
//        a. should they have stars in them?
//    5. have plants and moons fly in as comets
//    6. after a big bang it should create nebulas with a special nebula in
//          the center that turns into the sun
//    7. have stars fade in and out as the universe age
//    8. The "black hole" stage should also supernova
//        a. which means that a small dense core will be left behind that turns into the black hole
//    9. the black hole should slowly grow
//    10. once the universe is empty the black hole should collapse and expload into a big bang
//        a. this isn't really what happens as black holes slowly evaporate
//
//    Questions:
//        1. should I add more songs?
//            a. "Main Title" when all the planets are in place?
//            b. "Travelers" or  "14.3 Billion Years" when the universe is empty before "bouncing"?
//            c. "End Times" when the sun supernovas, at 1:25 begin the black hole
//
//    Every few days:
//        1. test on the ipad mini, lots missing on Safari in iOS 9.3.5

let errorDiv: HTMLElement | null = null;
let universeState: UniverseState; // Replace 'any' with the actual type if known
let startBigBounceUniverse: () => void;

let simpleUniverse = {
  beginFade: () => {},
  fading: false,
};

function displayError(div: HTMLElement | null, message: string): void {
  if (!div) {
    setTimeout(function () {
      displayError(div, message);
    }, 500);
  } else {
    div.style.display = "block";
    div.innerText = message;
  }
}

// Uncomment if device orientation handling is needed
// function deviceOrientation() {
//   const body = document.body;
//   body.classList = "";
//   switch (window.orientation) {
//     case 0:
//       body.classList.add("rotation90");
//       break;
//     case 180:
//       body.classList.add("rotation-90");
//       break;
//     default:
//       body.classList.add("landscape");
//       break;
//   }
// }
// window.addEventListener("orientationchange", deviceOrientation);

document.addEventListener("DOMContentLoaded", function () {
  errorDiv = document.getElementById("errors") as HTMLElement;

  const startButtonEle = document.getElementById(
    "startButton"
  )! as HTMLButtonElement;

  startButtonEle.addEventListener("click", () => {
    if (!simpleUniverse.fading) {
      simpleUniverse.beginFade();
      startButtonEle.disabled = true;
    }
  });
});

// This catches script loading errors, such as Reference Errors
window.addEventListener("error", function (e: ErrorEvent) {
  console.log(e);
  displayError(errorDiv, parseErrorMessage(e));
});

// Prevent mobile touch scrolling
document.ontouchmove = function (event: TouchEvent) {
  event.preventDefault();
};

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
  starAddInterval: number;
  lastStarAddTime: number;

  nebulas: Nebula[];
  numNebulas: number;
  nebulasToAdd: Nebula[];
  nebulaAddInterval: number;
  lastNebulaAddTime: number;

  endSound: HTMLAudioElement | null;
};

try {
  const BigBounceUniverse = (p5: P5) => {
    p5.preload = () => {
      universeState = {
        p5Renderer: null!,
        sun: null!,

        uuid: generateUUID(),
        logged: false,

        tickNum: 0,
        tickIntervalRef: null,

        planets: [],
        numPlanets: 3, //getRandomInt(4, 7),
        planetTrails: [],
        planetAddInterval: CONSTANTS.getPlanetAddInterval(),
        lastPlanetAddTime: 0,
        celestialBodiesToAdd: [],
        orbitalRadii: [], // Array to store orbital ring radii

        stars: [],
        numStars: 100, //getRandomInt(150, 220),
        starsToAdd: [],
        starAddInterval: CONSTANTS.getStarAddInterval(),
        lastStarAddTime: 0,

        nebulas: [],
        numNebulas: getRandomInt(4, 7),
        nebulasToAdd: [],
        nebulaAddInterval: CONSTANTS.getNebulaAddInterval(),
        lastNebulaAddTime: 0,

        endSound: null,
      };

      universeState.endSound = new Audio(end_times);
      universeState.endSound.preload = "auto";
    };

    p5.setup = () => {
      universeState.p5Renderer = p5.createCanvas(
        p5.windowWidth,
        p5.windowHeight
      );
      // p5.frameRate(20); // maybe set to 10 when prod?
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
            m.orbitingBody
              ? celestialBodiesToAdd.includes(m.orbitingBody)
              : false
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
        universeState.stars.push(star);
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
      if (p5.frameCount > 300 && !universeState.logged) {
        universeState.logged = true;
        // logTimes(universeState);

        // universeState.endSound.play();

        // universeState.endSound.addEventListener("canplaythrough", () => {
        //   universeState.endSound.play();
        // });

        // if (universeState.endSound?.paused) {
        //   universeState.endSound.play();
        // }
      }

      const year = universeState.tickNum * CONSTANTS.tickPeriod;

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

      if (
        p5.millis() - universeState.lastPlanetAddTime >
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

      for (let i = 0; i < universeState.planetTrails.length; i++) {
        const shouldContinueDrawing = universeState.planetTrails[i].draw();
        if (!shouldContinueDrawing) {
          universeState.planetTrails.splice(i, 1);
        }
      }

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

      // If all planets are sucked in begin the black hole
      if (
        universeState.celestialBodiesToAdd.length === 0 &&
        universeState.planets.length === 0 &&
        universeState.sun.stage === SunStage.SUN
      ) {
        universeState.sun.beginBlackHole();

        // if (!universeState.endSound.isPlaying()) {
        //   universeState.endSound.play();
        // }
      }

      // if (universeState.sun.stage === SunStage.BLACK_HOLE) {
      if (p5.frameCount % 100 === 0) {
        for (let i = 0; i < universeState.nebulas.length; i++) {
          // 30% chance for each nebula to change
          if (getRandomFloat(1) < 0.3) {
            const newAlpha =
              universeState.nebulas[i].currentAlpha - getRandomInt(10, 15);

            universeState.nebulas[i].changeAlpha(newAlpha);
          }
        }
      }
      // }

      if (p5.frameCount % 1000 === 0) {
        if (universeState.stars.length > 0) {
          const randomIndex = Math.floor(
            getRandomInt(universeState.stars.length)
          );

          const star = universeState.stars[randomIndex];

          if (star && star.stage !== StarStage.Exploding) {
            universeState.stars[randomIndex].beginExploading(function () {
              universeState.stars.splice(randomIndex, 1);
            });
          }
        }
      }

      if (
        universeState.stars.length === 0 &&
        universeState.sun.stage === SunStage.BLACK_HOLE
      ) {
        universeState.sun.beginBigBang(function () {
          for (let i = 0; i < universeState.nebulas.length; i++) {
            universeState.nebulas[i].destroy();
          }

          // restart
          p5.setup();
        });
      }

      const universeAge = prettyNumString(year);
      const universeAgeWidth = p5.textWidth(universeAge);
      const frameRate = p5.frameRate();

      p5.textSize(20);
      p5.fill(255);
      p5.text(
        !CONSTANTS.debug
          ? `${universeAge}`
          : `${frameRate ? frameRate.toFixed(2) : 0} FPS\n${universeAge}`,
        p5.width / 2 - universeAgeWidth - 20,
        p5.height / 2 - 40
      );

      p5.describe("test");
    };
  };

  startBigBounceUniverse = () => {
    const startScreen = document.getElementById("startScreen");
    if (!startScreen) {
      throw new Error("startScreen element is undefined.");
    }

    startScreen.style.display = "none"; // Hide the start screen
    new P5(BigBounceUniverse);
  };

  if (window.location.href.includes("?mode=webapp") || CONSTANTS.debug) {
    startBigBounceUniverse();
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      const startCanvasElement = document.getElementById("startCanvas");
      if (!startCanvasElement) {
        throw new Error("startCanvasElement element is undefined.");
      }

      const { beginFade, fading, SimpleUniverse } = simpleUniverseCreator(
        startBigBounceUniverse
      );

      simpleUniverse = {
        beginFade,
        fading,
      };

      new P5(SimpleUniverse, startCanvasElement);
    });
  }
} catch (e) {
  console.log(e);
  displayError(errorDiv, parseErrorMessage(e));
}
