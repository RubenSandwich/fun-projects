var errorDiv;
function displayError(div, message) {
  if (!errorDiv) {
    setTimeout(function () {
      div.style.display = "block";
      div.innerText = message;
    }, 1000);
  } else {
    div.style.display = "block";
    div.innerText = message;
  }
}

// Unsure... Maybe I should rotate p5?
// function deviceOrientation() {
//   var body = document.body;
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

// TODO:
// 3. figure out how to interpolate growing of the sun's mass
// 4. how do I prevent planets from collading into the sun till much much latter?
//    a. recalculate their mass and velocity when the sun grows?
// 5. log the time (maybe firebase?) that is takes to hit certain ticks?
// 6. Maybe plus or minus 15% to the end of the universe?
// 7. Play universe ending sound when we are approaching the end
//    a. "the end" should be a black hole with nothing left to suck in
// 9. have plants and moons fly in as comets
// 11. have nebulas fade in and out
// 12. figure out a better "universe reset"
// 13. make the sun "pulse"
// 14. test on the ipad mini, lots of changes have happened inbetween the last test

document.addEventListener("DOMContentLoaded", function () {
  errorDiv = document.getElementById("errors");
  // deviceOrientation();
});
// This catches script loading errors, such as Reference Errors
window.addEventListener("error", function (event) {
  console.log(event);
  displayError(errorDiv, event.message);
});

// Prevent mobile touch scrolling
document.ontouchmove = function (event) {
  event.preventDefault();
};

try {
  var p5Canvas;
  var logUuid = generateUUID();

  var tickNum = 0;
  var tickIntervalRef;
  // 5 mins, which is 288 updates a day ((60 * 24) / 5)
  // 288 * 7 = 2016
  var tickIntervalMs = parsePrettyNum("300_000");
  var yearInterval = parsePrettyNum("48_611_111.111");
  var endOfTheUniverseYear = parsePrettyNum("98_000_000_000"); // 2016 ticks

  var G = 100; // Gravitational constant
  var Destabilise = 0.15;

  var planetAddInterval = 10000; // Add a new planet every second
  var lastPlanetAddTime = 0;
  var planetsToAdd = []; // planets left to add
  var orbitalRadii = []; // Array to store orbital ring radii

  var sun;

  var planets = [];
  var numPlanets = 5;
  var planetTrails = [];

  var stars = []; // Array to store star objs
  var numStars = 20; // Number of stars to draw

  var nebulas = []; // Array to store nebulas objs
  var numNebulas = 5; // Number of nebulas to draw

  var endSound;

  function preload() {
    endSound = loadSound("Outer_Wilds_Original_Soundtrack_10_End_Times.mp3");
  }

  function setup() {
    endSound.onended(function () {
      setup();
    });

    // logTimes(logUuid);

    p5Canvas = createCanvas(windowWidth, windowHeight);
    frameRate(20); // maybe set to 10 when prod?
    colorMode(HSB, 360, 100, 100, 1);

    sun = Sun.Create();

    var previousRadius = sun.d * 1.5;
    for (var i = 0; i < numPlanets; i++) {
      orbitalRadii.push(random(previousRadius, previousRadius + 40));

      previousRadius = orbitalRadii[i] + 60;
    }

    // Initialize the planets
    for (var i = 0; i < numPlanets; i++) {
      var planetMass = random(10, 30);
      var planetColor = color(random(360), random(80, 100), random(80, 100));
      var planetTrailLength = planetMass * random(0, 7);

      var planetTrail = PlanetTrail.Create(planetColor, planetTrailLength);
      var planet = Planet.Create(
        planetMass,
        orbitalRadii[i],
        planetColor,
        sun,
        planetTrail
      );
      planetsToAdd.push(planet);

      // Randomly add a moon to some planets
      if (random(1) < 0.5) {
        var moonMass = random(3, 6);
        var moonColor = color(random(360), random(80, 100), random(80, 100));
        var moonTrailLength = moonMass * 3;

        var moonTrail = PlanetTrail.Create(moonColor, moonTrailLength);
        var moon = Moon.Create(moonMass, moonColor, planet, moonTrail);
        planetsToAdd.push(moon);
      }
    }

    // Create stars
    for (var i = 0; i < numStars; i++) {
      var star = Star.Create();
      stars.push(star);
    }

    // Create nebulas
    for (var i = 0; i < numNebulas; i++) {
      var nebula = Nebula.Create();
      nebulas.push(nebula);
    }

    tickIntervalRef = setInterval(function () {
      tickNum++;
    }, tickIntervalMs);
  }

  function draw() {
    if (frameCount > 5 && !endSound.isPlaying()) {
      endSound.play();
    }

    var year = tickNum * yearInterval;

    background(10); // Very dark background

    translate(width / 2, height / 2);

    // Use additive blending for a glowing effect
    blendMode(ADD);
    for (var i = 0; i < nebulas.length; i++) {
      nebulas[i].draw();
    }
    blendMode(BLEND);

    // Draw the stars
    for (var i = 0; i < stars.length; i++) {
      stars[i].draw();
    }

    sun.draw();

    if (
      millis() - lastPlanetAddTime > planetAddInterval &&
      planetsToAdd.length > 0
    ) {
      var newBody = planetsToAdd.shift();
      planets.push(newBody);
      planetTrails.push(newBody.planetTrail);
      lastPlanetAddTime = millis();
    }

    for (var i = planetTrails.length - 1; i >= 0; i--) {
      var shouldContinueDrawing = planetTrails[i].draw();
      if (!shouldContinueDrawing) {
        planetTrails.splice(i, 1);
      }
    }

    for (var i = planets.length - 1; i >= 0; i--) {
      planets[i].move();
      planets[i].draw();

      // Check if the planet is completely covered by the sun
      if (
        planets[i] !== sun &&
        p5.Vector.dist(planets[i].pos, sun.pos) + planets[i].d / 2 <= sun.d / 2
      ) {
        planets[i].planetTrail.deactivate(); // Deactivate the trail
        planets.splice(i, 1); // Remove the planet

        continue; // Skip to the next iteration
      }
    }

    // If all planets are sucked in begin the black hole
    if (
      planetsToAdd.length === 0 &&
      planets.length === 0 &&
      sun.stage === "sun"
    ) {
      sun.beginBlackHole();
    }

    if (frameCount % 100 === 0) {
      if (stars.length > 0) {
        var randomIndex = floor(random(stars.length));

        stars[randomIndex].beginExploading(function () {
          stars.splice(randomIndex, 1);
        });
      }
    }

    if (stars.length === 0 && sun.stage === "black hole") {
      sun.beginBigBang();
    }

    textSize(20);
    fill(255);

    var universeAge = prettyNumString(year);
    var universeAgeWidth = textWidth(universeAge);
    text(universeAge, width / 2 - universeAgeWidth - 20, height / 2 - 20);

    a11yDescribe(p5Canvas, "test");
  }
} catch (e) {
  console.log(e);
  displayError(errorDiv, e.message);
}
