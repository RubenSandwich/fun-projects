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
// 2. test on the ipad mini, lots of changes have happened inbetween the last test
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

function parsePrettyNum(num) {
  return parseFloat(num.replace(/,|_/g, ""));
}

try {
  var tickNum = 0;
  var tickIntervalRef;
  // 5 mins, which is 288 updates a day ((60 * 24) / 5)
  // 288 * 7 = 2016
  var tickIntervalMs = parsePrettyNum("300_000");
  var yearInterval = parsePrettyNum("48_611_111.111");
  var endOfTheUniverseYear = parsePrettyNum("98_000_000_000"); // 2016 ticks

  var G = 100; // Gravitational constant
  var Destabilise = 0.15;

  var planetAddInterval = 1000; // Add a new planet every second
  var lastPlanetAddTime = 0;
  var planetsToAdd = []; // planets left to add
  var orbitalRadii = []; // Array to store orbital ring radii

  var sun;

  var planets = [];
  var numPlanets = 1;
  var planetTrails = [];

  var stars = []; // Array to store star objs
  var numStars = 20; // Number of stars to draw

  var nebulas = []; // Array to store nebulas objs
  var numNebulas = 5; // Number of nebulas to draw

  function prettyNum(num) {
    var len = Math.ceil(Math.log10(num + 1));

    var divideNum = parsePrettyNum("1_000_000");
    var unit = "M";
    if (len > 9) {
      divideNum = parsePrettyNum("1_000_000_000");
      unit = "B";
    }

    return (num / divideNum).toFixed(2) + unit + " years old";
  }

  function setup() {
    createCanvas(windowWidth, windowHeight);
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

    var universeAge = prettyNum(year);
    var universeAgeWidth = textWidth(universeAge);

    text(universeAge, width / 2 - universeAgeWidth - 20, height / 2 - 20);
  }

  // class definitions

  function Sun() {
    this.mass = random(20, 40);
    this.pos = createVector(0, 0);
    this.vel = createVector(0, 0);
    this.lastGrowthTime = 0;
    this.growthInterval = random(2000, 5000); // 5 seconds in milliseconds
    this.growthAmount = random(1, 5); // Amount to increase the sun's mass by
    this.d = this.mass * 2;
    this.colorsByMass = {
      30: color(0, random(80, 100), random(30, 65)), // Red
      40: color(random(20, 40), random(80, 100), random(80, 100)), // Orange
      50: color(60, random(80, 100), random(80, 100)), // Yellow
      60: color(60, random(20, 40), random(90, 100)), // Light Yellow
      70: color(random(180, 220), random(20, 40), random(80, 100)), // Light Blue
      80: color(0, 0, random(90, 100)), // White
    };
    this.massIntervals = Object.keys(this.colorsByMass);
    this.lowestMass = parseInt(this.massIntervals[0], 10);
    this.highestMass = parseInt(
      this.massIntervals[this.massIntervals.length - 1],
      10
    );

    this.currentColor =
      this.colorsByMass[
        Math.min(Math.max(Math.floor(this.mass / 10) * 10, this.lowestMass), 80)
      ];

    this.stage = "sun"; // "sun", "big bang", or "black hole"
    this.particles = [];
    this.numParticles = 400;

    this.draw = function () {
      if (this.stage === "big bang") {
        this.drawBigBang();
        return;
      } else if (this.stage === "black hole") {
        this.drawBlackHole();
        return;
      }

      // Check if it's time to increase the sun's mass
      if (millis() - this.lastGrowthTime > this.growthInterval) {
        this.mass += this.growthAmount;
        this.d = sun.mass * 2; // Update sun's diameter
        this.lastGrowthTime = millis();

        var massIndex = Math.min(
          Math.max(Math.floor(this.mass / 10) * 10, this.lowestMass),
          80
        );

        this.currentColor = this.colorsByMass[massIndex];
      }

      this.drawSun();
    };

    this.applyForce = function (f) {
      this.vel.add(p5.Vector.div(f, this.mass));
    };

    this.attractForce = function (child) {
      var r = p5.Vector.dist(this.pos, child.pos);
      var f = p5.Vector.sub(this.pos, child.pos);
      f.setMag((G * this.mass * child.mass) / (r * r));
      return f;
    };

    this.beginSun = function () {
      this.stage = "sun";
      this.particles = [];
    };

    this.drawSun = function () {
      fill(this.currentColor);
      noStroke();
      ellipse(this.pos.x, this.pos.y, this.d, this.d);
    };

    this.beginBigBang = function () {
      this.stage = "big bang";

      // update any existing particles so that they are never static
      for (var i = 0; i < this.particles.length; i++) {
        var particle = this.particles[i];
        particle.vel = p5.Vector.random2D().mult(random(1, 5));
      }

      for (var i = 0; i < this.numParticles; i++) {
        this.particles.push({
          pos: createVector(0, 0),
          vel: p5.Vector.random2D().mult(random(1, 5)),
          size: random(2, 6),
          color: color(random(360), random(80, 100), random(80, 100)),
        });
      }

      this.mass = random(5, 10);
      this.pos = createVector(0, 0);
      this.vel = createVector(0, 0);
      this.lastGrowthTime = 0;
      this.growthInterval = random(2000, 5000); // 5 seconds in milliseconds
      this.growthAmount = random(1, 5); // Amount to increase the sun's mass by
      this.d = this.mass * 2;
    };

    this.drawBigBang = function () {
      for (var i = this.particles.length - 1; i >= 0; i--) {
        var particle = this.particles[i];
        particle.pos.add(particle.vel);
        particle.size *= 0.9999999999; // Slowly shrink particles

        fill(particle.color);
        noStroke();
        ellipse(particle.pos.x, particle.pos.y, particle.size);

        // Remove particles that are too small or off-screen
        if (
          particle.size < 0.4 ||
          particle.pos.x < -width / 2 ||
          particle.pos.x > width / 2 ||
          particle.pos.y < -height / 2 ||
          particle.pos.y > height / 2
        ) {
          this.particles.splice(i, 1);
        }
      }

      this.drawSun();

      if (this.particles.length === 0) {
        setup();
      }
    };

    this.beginBlackHole = function () {
      this.stage = "black hole";
    };

    this.drawBlackHole = function () {
      push();
      translate(this.pos.x, this.pos.y);

      // Draw the black center (event horizon)
      fill(0);
      noStroke();
      ellipse(0, 0, this.d, this.d);

      // Draw the pulsing white ring
      var pulseSpeed = 0.025;
      var pulseAmplitude = 5;
      var ringThickness =
        Math.abs(sin(frameCount * pulseSpeed)) * pulseAmplitude;

      noFill();
      stroke(255);
      strokeWeight(ringThickness);
      ellipse(0, 0, this.d + ringThickness, this.d + ringThickness);

      // Draw the pulsing disk across the middle
      var diskPulseAmplitude = 1.5;
      var diskWidth = this.d * 2.25;
      var diskThickness =
        Math.abs(sin(frameCount * pulseSpeed)) * diskPulseAmplitude;

      noStroke();
      fill(255);
      rectMode(CENTER);
      ellipse(0, 0, diskWidth, diskThickness);

      // Introduce new particles over time
      if (frameCount % 50 === 0) {
        // Adjust the modulus value to control the rate of particle introduction
        for (var i = 0; i < random(1, 5); i++) {
          // Adjust the number of particles introduced each time
          this.particles.push({
            pos: createVector(
              random(-width / 2, width / 2),
              random(-height / 2, height / 2)
            ),
            vel: createVector(0, 0),
            size: random(1, 3), // Smaller particle size
            color: color(random(360), random(80, 100), random(80, 100)),
          });
        }
      }

      // Draw particles being sucked into the black hole in a spiral pattern
      for (var i = this.particles.length - 1; i >= 0; i--) {
        var particle = this.particles[i];
        var dx = this.pos.x - particle.pos.x;
        var dy = this.pos.y - particle.pos.y;
        var distance = sqrt(dx * dx + dy * dy);
        var angle = atan2(dy, dx);
        var force = this.d / 8 / distance;
        var spiralForce = createVector(
          cos(angle + force),
          sin(angle + force)
        ).mult(force * 0.1); // Move slowly
        particle.vel.add(spiralForce);
        particle.pos.add(particle.vel);

        // Remove particle if it hits the center of the black hole
        if (distance < this.d / 2) {
          this.particles.splice(i, 1);
          continue;
        }

        fill(particle.color);
        noStroke();
        ellipse(particle.pos.x, particle.pos.y, particle.size);
      }

      pop();
    };
  }
  Sun.Create = function Create() {
    var sun = new Sun();
    // Initialize an empty array for particles
    sun.particles = [];
    return sun;
  };

  function Planet(_mass, _pos, _vel, _color, _orbitingBody, _planetTrail) {
    this.mass = _mass;
    this.pos = _pos;
    this.vel = _vel;
    this.d = this.mass * 2;
    this.color = _color;
    this.orbitingBody = _orbitingBody;
    this.planetTrail = _planetTrail;

    this.draw = function () {
      fill(this.color);
      noStroke();
      ellipse(this.pos.x, this.pos.y, this.d, this.d);
    };

    this.move = function () {
      var force = this.orbitingBody.attractForce(this);
      this.applyForce(force);
      this.pos.add(this.vel);

      // Update planet trail
      this.planetTrail.addPoint(this.pos.copy());
    };

    this.applyForce = function (f) {
      this.vel.add(p5.Vector.div(f, this.mass));
    };

    this.attractForce = function (child) {
      var r = p5.Vector.dist(this.pos, child.pos);
      var f = p5.Vector.sub(this.pos, child.pos);
      f.setMag((G * this.mass * child.mass) / (r * r));
      return f;
    };
  }
  Planet.Create = function Create(
    mass,
    radius,
    planetColor,
    orbitingBody,
    planetTrail
  ) {
    var angle = random(0, TWO_PI);
    var planetPos = createVector(radius * cos(angle), radius * sin(angle));

    // Find direction of orbit and set velocity
    var planetVel = planetPos.copy();
    planetVel.rotate(random(1) < 0.1 ? -HALF_PI : HALF_PI); // Direction of orbit
    planetVel.normalize();
    planetVel.mult(sqrt((G * orbitingBody.mass) / radius));
    planetVel.mult(random(1 - Destabilise, 1 + Destabilise)); // create elliptical orbit

    return new Planet(
      mass,
      planetPos,
      planetVel,
      planetColor,
      orbitingBody,
      planetTrail
    );
  };

  function Moon(
    _mass,
    _pos,
    _color,
    _orbitRadius,
    _orbitAngle,
    _orbitingBody,
    _planetTrail
  ) {
    this.mass = _mass;
    this.d = this.mass * 2;
    this.pos = _pos;
    this.color = _color;
    this.orbitingBody = _orbitingBody;
    this.orbitRadius = _orbitRadius;
    this.orbitAngle = _orbitAngle;

    this.planetTrail = _planetTrail;

    this.draw = function () {
      fill(this.color);
      noStroke();
      ellipse(this.pos.x, this.pos.y, this.d, this.d);
    };

    this.move = function () {
      // Update the moon's orbit angle
      // 0.02 - 0.09 are good values
      this.orbitAngle += 0.07;

      // Calculate new position relative to the planet
      var relativePos = createVector(
        this.orbitRadius * cos(this.orbitAngle),
        this.orbitRadius * sin(this.orbitAngle)
      );

      // Update moon's position relative to the planet
      this.pos = p5.Vector.add(this.orbitingBody.pos, relativePos);

      // Update planet trail
      this.planetTrail.addPoint(this.pos.copy());
    };
  }
  Moon.Create = function Create(mass, color, orbitingBody, planetTrail) {
    var orbitRadius = random(orbitingBody.d * 1.2, orbitingBody.d * 2);
    var orbitAngle = random(0.05, 0.12);

    var pos = p5.Vector.add(
      orbitingBody.pos,
      createVector(orbitRadius * cos(orbitAngle), orbitRadius * sin(orbitAngle))
    );

    return new Moon(
      mass,
      pos,
      color,
      orbitRadius,
      orbitAngle,
      orbitingBody,
      planetTrail
    );
  };

  function PlanetTrail(_color, _pathLengthMax, _trailAlphas) {
    this.color = _color;
    this.path = [];
    this.pathLengthMax = _pathLengthMax;
    this.isActive = true; // New property to track if the planet is still active
    this.trailAlphas = _trailAlphas;

    this.draw = function () {
      if (!this.isActive) {
        this.path.splice(0, 1);
        if (this.path.length <= 0) {
          return false; // Stop drawing this trail
        }
      }

      strokeWeight(1);

      for (var i = 0; i < this.path.length - 1; i++) {
        this.color.setAlpha(this.trailAlphas[i]);
        stroke(this.color);

        line(
          this.path[i].x,
          this.path[i].y,
          this.path[i + 1].x,
          this.path[i + 1].y
        );
      }

      return true; // Continue drawing this trail
    };

    this.addPoint = function (point) {
      this.path.push(point);
      if (this.path.length > this.pathLengthMax) {
        this.path.shift(); // Remove the oldest point if we exceed the max length
      }
    };

    this.deactivate = function () {
      this.isActive = false;
    };
  }
  PlanetTrail.Create = function Create(planetTrailColor, pathLengthMax) {
    var planetTrailColorCopy = color(
      hue(planetTrailColor),
      saturation(planetTrailColor),
      brightness(planetTrailColor),
      alpha(planetTrailColor)
    );

    var trailAlphas = [];
    // Create an array of colors with gradually increasing alpha
    for (var i = 0; i < pathLengthMax; i++) {
      var trailAlpha = map(i, 0, pathLengthMax - 1, 0.1, 1);
      trailAlphas.push(trailAlpha);
    }

    return new PlanetTrail(planetTrailColorCopy, pathLengthMax, trailAlphas);
  };

  function Star() {
    this.pos = createVector(
      random(-width / 2, width / 2),
      random(-height / 2, height / 2)
    );
    this.size = random(1, 3);
    this.offset = random(TWO_PI);
    this.twinkleSpeed = random(0.005, 0.015);
    this.removeFunction = null;

    this.particles = [];
    this.numParticles = 5;
    this.stage = "twinkle"; // "twinkle" or "exploading"

    this.draw = function () {
      if (this.stage === "twinkle") {
        noStroke();

        var brightness = map(
          sin(frameCount * this.twinkleSpeed + this.offset),
          -1,
          1,
          100,
          255
        );
        fill(brightness);
        ellipse(this.pos.x, this.pos.y, this.size);
      } else if (this.stage === "exploading") {
        for (var i = this.particles.length - 1; i >= 0; i--) {
          var particle = this.particles[i];
          particle.pos.add(p5.Vector.mult(particle.vel, 0.5));
          particle.size *= 0.9; // Slowly shrink particles

          fill(particle.color);
          noStroke();
          ellipse(particle.pos.x, particle.pos.y, particle.size);

          // Remove particles that are too small or off-screen
          if (
            particle.size < 0.4 ||
            particle.pos.x < -width / 2 ||
            particle.pos.x > width / 2 ||
            particle.pos.y < -height / 2 ||
            particle.pos.y > height / 2
          ) {
            this.particles.splice(i, 1);
          }
        }

        if (this.particles.length === 0) {
          this.removeFunction();
        }
      }
    };

    this.beginExploading = function (removeFunction) {
      this.stage = "exploading";
      this.removeFunction = removeFunction;

      for (var i = 0; i < this.numParticles; i++) {
        this.particles.push({
          pos: this.pos.copy(),
          vel: p5.Vector.random2D(),
          size: this.size, // Smaller particle size
          color: color(random(360), random(80, 100), random(80, 100)),
        });
      }
    };
  }
  Star.Create = function Create() {
    return new Star();
  };

  function Nebula(_pos, _size, _noiseOffset, _renderedImage) {
    this.pos = _pos;
    this.initialPos = this.pos.copy();
    this.size = _size;
    this.noiseOffset = _noiseOffset;
    this.renderedImage = _renderedImage;

    this.draw = function () {
      // var moveRadius = this.size / 4; // Adjust this value to change movement range
      // var moveSpeed = 0.0009;
      // var moveAngle = noise(frameCount * moveSpeed + this.noiseOffset) * TWO_PI;
      // this.pos.x = this.initialPos.x + cos(moveAngle) * moveRadius;
      // this.pos.y = this.initialPos.y + sin(moveAngle) * moveRadius;

      image(
        this.renderedImage,
        this.pos.x - this.size / 2,
        this.pos.y - this.size / 2
      );
    };
  }
  Nebula.Create = function Create() {
    var nebulaPos = createVector(
      random(-width / 2, width / 2),
      random(-height / 2, height / 2)
    );
    var size = random(100, 250);
    var hue = random(360);
    var noiseOffset = random(1000);

    var nebulaRender = createGraphics(size, size);
    nebulaRender.colorMode(HSB, 360, 100, 100, 1);
    nebulaRender.noStroke();

    // Generate blob shape
    var points = [];
    var numPoints = 15; // Fewer points for more polygon-like shape
    for (var j = 0; j < numPoints; j++) {
      var angle = map(j, 0, numPoints, 0, TWO_PI);
      var noiseValue = noise(
        cos(angle) + noiseOffset,
        sin(angle) + noiseOffset
      );
      var radius = map(noiseValue, 0, 1, size / 8, size / 2);
      var x = radius * cos(angle);
      var y = radius * sin(angle);
      points.push(createVector(x, y));
    }

    // Draw blob
    nebulaRender.fill(hue, 80, 100, 0.05);
    for (var j = 0; j < 5; j++) {
      // Draw multiple layers for a glowing effect
      nebulaRender.beginShape();
      for (var k = 0; k < points.length; k++) {
        var p = points[k];
        nebulaRender.curveVertex(p.x + size / 2, p.y + size / 2);
      }
      // Add the first two points again to close the shape smoothly
      nebulaRender.curveVertex(points[0].x + size / 2, points[0].y + size / 2);
      nebulaRender.curveVertex(points[1].x + size / 2, points[1].y + size / 2);
      nebulaRender.endShape(CLOSE);
    }

    return new Nebula(nebulaPos, size, noiseOffset, nebulaRender);
  };
} catch (e) {
  console.log(e);
  displayError(errorDiv, e.message);
}
