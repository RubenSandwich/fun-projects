let errorDiv: HTMLElement;
let universeState: any; // Replace 'any' with the actual type if known

function displayError(div: HTMLElement | null, message: string): void {
  if (!div) {
    setTimeout(function () {
      displayError(div, message);
    }, 1000);
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
});

window.addEventListener("error", function (e: ErrorEvent) {
  console.log(e);
  displayError(errorDiv, parseErrorMessage(e));
});

// Prevent mobile touch scrolling
document.ontouchmove = function (event: TouchEvent) {
  event.preventDefault();
};

try {
  function preload(): void {
    universeState = {
      p5Canvas: null,
      logUuid: generateUUID(),

      tickNum: 0,
      tickIntervalRef: null,

      sun: null,

      planets: [],
      numPlanets: random(4, 7),
      planetTrails: [],
      planetAddInterval: CONSTANTS.getPlanetAddInterval(),
      lastPlanetAddTime: 0,
      celestialBodiesToAdd: [],
      orbitalRadii: [], // Array to store orbital ring radii

      stars: [],
      numStars: random(150, 220),
      starsToAdd: [],
      starAddInterval: CONSTANTS.getStarAddInterval(),
      lastStarAddTime: 0,

      nebulas: [],
      numNebulas: random(4, 7),
      nebulasToAdd: [],
      nebulaAddInterval: CONSTANTS.getNebulaAddInterval(),
      lastNebulaAddTime: 0,

      endSound: null,
    };

    universeState.endSound = loadSound("End_Times.mp3");
  }

  function setup(): void {
    universeState.p5Canvas = createCanvas(windowWidth, windowHeight);
    frameRate(20); // maybe set to 10 when prod?
    colorMode(HSB, 360, 100, 100, 1);

    universeState.sun = Sun.Create();

    let previousRadius = universeState.sun.d * 1.5;
    for (let i = 0; i < universeState.numPlanets; i++) {
      universeState.orbitalRadii.push(
        random(previousRadius, previousRadius + 40)
      );

      previousRadius = universeState.orbitalRadii[i] + 60;
    }

    const planetsMade: Planet[] = [];
    const moonsMade: Moon[] = [];
    for (let i = 0; i < universeState.numPlanets; i++) {
      const planetMass = random(10, 30);
      const planetColor = color(random(360), random(80, 100), random(80, 100));
      const planetTrailLength = planetMass * random(0, 7);

      const planetTrail = PlanetTrail.Create(planetColor, planetTrailLength);
      const planet = Planet.Create(
        planetMass,
        universeState.orbitalRadii[i],
        planetColor,
        universeState.sun,
        planetTrail
      );
      planetsMade.push(planet);

      // Randomly add a moon to some planets
      if (random(1) < 0.5) {
        const moonMass = random(3, 6);
        const moonColor = color(random(360), random(80, 100), random(80, 100));
        const moonTrailLength = moonMass * 3;

        const moonTrail = PlanetTrail.Create(moonColor, moonTrailLength);
        const moon = Moon.Create(moonMass, moonColor, planet, moonTrail);
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

      if (random(1) < 0.5 && moonsMade.length > 0) {
        // find the first moon where its orbitingBody is already in line
        const moon = moonsMade.find((m) =>
          celestialBodiesToAdd.includes(m.orbitingBody)
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
      const star = Star.Create();
      universeState.stars.push(star);
    }

    // Create nebulas
    for (let i = 0; i < universeState.numNebulas; i++) {
      const nebula = Nebula.Create();
      universeState.nebulas.push(nebula);
    }

    universeState.tickIntervalRef = setInterval(function () {
      universeState.tickNum++;
    }, CONSTANTS.tickIntervalMs);
  }

  function draw(): void {
    const year = universeState.tickNum * CONSTANTS.tickPeriod;

    background(10); // #0A0A0A

    translate(width / 2, height / 2);

    blendMode(ADD);
    for (let i = 0; i < universeState.nebulas.length; i++) {
      universeState.nebulas[i].draw();
    }
    blendMode(BLEND);

    // Draw the stars
    for (let i = 0; i < universeState.stars.length; i++) {
      universeState.stars[i].draw();
    }

    universeState.sun.draw();

    if (
      millis() - universeState.lastPlanetAddTime >
        universeState.planetAddInterval &&
      universeState.celestialBodiesToAdd.length > 0
    ) {
      const newBody = universeState.celestialBodiesToAdd.shift();
      universeState.planets.push(newBody);
      universeState.planetTrails.push(newBody.planetTrail);
      universeState.lastPlanetAddTime = millis();
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
        universeState.planets[i] !== universeState.sun &&
        p5.Vector.dist(universeState.planets[i].pos, universeState.sun.pos) +
          universeState.planets[i].d / 2 <=
          universeState.sun.d / 2
      ) {
        universeState.planets[i].planetTrail.beginWindDown(); // wind down the trail
        universeState.planets[i].destroy();
        universeState.planets.splice(i, 1); // Remove the planet

        continue; // Skip to the next iteration
      }
    }

    // If all planets are sucked in begin the black hole
    if (
      universeState.celestialBodiesToAdd.length === 0 &&
      universeState.planets.length === 0 &&
      universeState.sun.stage === "sun"
    ) {
      universeState.sun.beginBlackHole();

      if (!universeState.endSound.isPlaying()) {
        universeState.endSound.play();
      }
    }

    if (universeState.sun.stage === "black hole") {
      if (frameCount % 200 === 0) {
        for (let i = 0; i < universeState.nebulas.length; i++) {
          // 30% chance for each nebula to change
          if (random(1) < 0.3) {
            const newAlpha = universeState.nebulas[i].currentAlpha - random(0, 5);
            universeState.nebulas[i].changeAlpha(newAlpha);
          }
        }
      }
    }

    // 0.7 min
    if (frameCount % CONSTANTS.starFadeInterval === 0) {
      if (universeState.stars.length > 0) {
        const randomIndex = floor(random(universeState.stars.length));

        universeState.stars[randomIndex].beginExploading(function () {
          universeState.stars.splice(randomIndex, 1);
        });
      }
    }

    if (
      universeState.stars.length === 0 &&
      universeState.sun.stage === "black hole"
    ) {
      universeState.sun.beginBigBang(function () {
        for (let i = 0; i < universeState.nebulas.length; i++) {
          universeState.nebulas[i].destroy();
        }

        // restart
        setup();
      });
    }

    const universeAge = prettyNumString(year);
    const universeAgeWidth = textWidth(universeAge);

    textSize(20);
    fill(255);
    text(universeAge, width / 2 - universeAgeWidth - 20, height / 2 - 20);

    a11yDescribe(universeState.p5Canvas, "test");
  }
} catch (e) {
  console.log(e);
  displayError(errorDiv, parseErrorMessage(e));
}
