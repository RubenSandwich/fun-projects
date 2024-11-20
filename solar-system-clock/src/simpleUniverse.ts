import P5 from "p5";

import { Sun } from "./celestial_bodies/sun";
import { Planet } from "./celestial_bodies/planet";
import { Moon } from "./celestial_bodies/moon";
import { PlanetTrail } from "./celestial_bodies/planetTrail";
import { Star } from "./celestial_bodies/star";

import { getRandomInt, getRandomFloat } from "./utlilites";
import CONSTANTS from "./constants";

type SimpleUniverseState = {
  p5Renderer: P5.Renderer;
  sun: Sun;

  fading: boolean;
  startedFadeTimeout: boolean;

  planets: (Planet | Moon)[];
  numPlanets: number;
  planetTrails: PlanetTrail[];
  orbitalRadii: number[];

  stars: Star[];
  numStars: number;
};

const simpleUniverseCreator = (finishedFading: () => void) => {
  let simpleUniverseState: SimpleUniverseState = {
    // this is fine, as I just want to get a basic
    // scaffold of simpleUniverseState here, and these get
    // build during setup so will never actually be null
    p5Renderer: null!,
    sun: null!,

    fading: false,
    startedFadeTimeout: false,

    planets: [],
    numPlanets: getRandomInt(1, 3),
    planetTrails: [],
    orbitalRadii: [],

    stars: [],
    numStars: getRandomInt(75, 100),
  };

  const beginFade = () => {
    simpleUniverseState.fading = true;
  };

  const SimpleUniverse = (p5: P5) => {
    p5.setup = () => {
      simpleUniverseState.p5Renderer = p5.createCanvas(
        p5.windowWidth,
        p5.windowHeight,
        document.getElementById("startCanvas")!
      );
      p5.frameRate(20);
      p5.colorMode(p5.HSB, 360, 100, 100, 1);

      simpleUniverseState.sun = new Sun(p5, { simple: true });

      let previousRadius = simpleUniverseState.sun.d * 1.5;
      for (let i = 0; i < simpleUniverseState.numPlanets; i++) {
        simpleUniverseState.orbitalRadii.push(
          getRandomInt(previousRadius, previousRadius + 40)
        );

        previousRadius = simpleUniverseState.orbitalRadii[i] + 60;
      }

      const planetsMade: Planet[] = [];
      const moonsMade: Moon[] = [];
      for (let i = 0; i < simpleUniverseState.numPlanets; i++) {
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
          simpleUniverseState.orbitalRadii[i],
          planetColor,
          simpleUniverseState.sun,
          planetTrail
        );
        planetsMade.push(planet);
        simpleUniverseState.planetTrails.push(planetTrail);

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
          simpleUniverseState.planetTrails.push(moonTrail);
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
      simpleUniverseState.planets = celestialBodiesToAdd;

      // Create stars
      for (let i = 0; i < simpleUniverseState.numStars; i++) {
        const star = new Star(p5);
        simpleUniverseState.stars.push(star);
      }
    };

    p5.draw = () => {
      // Yeah this is gross, but p5.noLoop() needs to be run inside of p5.draw()
      if (
        simpleUniverseState.fading &&
        !simpleUniverseState.startedFadeTimeout
      ) {
        simpleUniverseState.startedFadeTimeout = true;

        const canvas = simpleUniverseState.p5Renderer.elt;

        canvas.style.opacity = "0";
        document.getElementById("startButtonContainer")!.style.opacity = "0";

        setTimeout(() => {
          p5.noLoop();
          p5.remove();
          finishedFading();
        }, 1000);
      }

      p5.frameRate(20);
      p5.background(CONSTANTS.backgroundColor);
      p5.translate(p5.width / 2, p5.height / 2);

      // Draw the stars
      for (let i = 0; i < simpleUniverseState.stars.length; i++) {
        simpleUniverseState.stars[i].draw();
      }

      simpleUniverseState.sun.draw();

      for (let i = 0; i < simpleUniverseState.planets.length; i++) {
        simpleUniverseState.planets[i].move();
        simpleUniverseState.planets[i].draw();
      }

      for (let i = 0; i < simpleUniverseState.planetTrails.length; i++) {
        simpleUniverseState.planetTrails[i].draw();
      }

      const versionString = `v${CONSTANTS.version}`;
      const versionStringWidth = p5.textWidth(versionString);

      p5.textSize(15);
      p5.noStroke();
      p5.fill(255);
      p5.text(
        versionString,
        p5.width / 2 - versionStringWidth - 10,
        p5.height / 2 - 10
      );

      p5.describe("test");
    };
  };

  return { beginFade, fading: simpleUniverseState.fading, SimpleUniverse };
};

export { simpleUniverseCreator };
