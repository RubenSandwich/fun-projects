var G = 100; // Gravitational constant
var Destabilise = 0.15;

var planetAddInterval = 1000; // Add a new planet every second
var lastPlanetAddTime = 0;
var planetsToAdd = []; // planets left to add
var orbitalRadii = []; // Array to store orbital ring radii

var sun;

var planets = [];
var numPlanets = 2;
var planetTrails = [];
var stars = []; // Array to store star objs
var numStars = 200; // Number of stars to draw

var nebulas = []; // Array to store nebulas objs
var numNebulas = 3; // Number of nebulas to draw

// Prevent mobile touch scrolling
document.ontouchmove = function (event) {
  event.preventDefault();
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(20);
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
}

function draw() {
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

  // if (sunExploded) {
  //   updateAndDrawSunParticles();
  // } else {
  sun.draw();
  // }

  // noLoop();

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

      // If all planets are destroyed, explode the sun
      if (planets.length === 0) {
        sun.explodeSun();
        break;
      }

      continue; // Skip to the next iteration
    }
  }
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

  this.stage = "blackhole"; // "sun", "supernova", or "blackhole"
  this.explosionParticles = [];
  this.numExplosionParticles = 200;

  this.draw = function () {
    if (this.stage === "supernova") {
      this.updateAndDrawSunParticles();
      return;
    } else if (this.stage === "blackhole") {
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

    fill(this.currentColor);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.d, this.d);
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

  this.explodeSun = function () {
    this.stage = "supernova";
    for (var i = 0; i < this.numExplosionParticles; i++) {
      this.explosionParticles.push({
        pos: createVector(0, 0),
        vel: p5.Vector.random2D().mult(random(1, 5)),
        size: random(2, 6),
      });
    }
  };

  this.drawBlackHole = function () {
    push();
    translate(this.pos.x, this.pos.y);

    // Draw the black center (event horizon)
    fill(0);
    noStroke();
    ellipse(0, 0, this.d, this.d);

    // Draw the pulsing white ring
    var pulseSpeed = 0.05;
    var pulseAmplitude = 5; // Reduced amplitude to prevent overlap with the black circle
    var ringThickness = Math.abs(
      3 + sin(frameCount * pulseSpeed) * pulseAmplitude
    );

    // https://old.reddit.com/r/generative/comments/192yvdo/anomaly_black_hole_p5_js/

    // console.log(ringThickness);

    noFill();
    stroke(255);
    strokeWeight(ringThickness);
    ellipse(0, 0, this.d + ringThickness, this.d + ringThickness); // Draw the ring right up against the black circle

    pop();
  };

  this.updateAndDrawSunParticles = function () {
    for (var i = this.explosionParticles.length - 1; i >= 0; i--) {
      var particle = this.explosionParticles[i];
      particle.pos.add(particle.vel);
      particle.size *= 0.99; // Slowly shrink particles

      fill(this.currentColor);
      noStroke();
      ellipse(particle.pos.x, particle.pos.y, particle.size);

      // Remove particles that are too small or off-screen
      if (
        particle.size < 0.5 ||
        particle.pos.x < -width / 2 ||
        particle.pos.x > width / 2 ||
        particle.pos.y < -height / 2 ||
        particle.pos.y > height / 2
      ) {
        this.explosionParticles.splice(i, 1);
      }
    }

    if (this.explosionParticles.length === 0) {
      this.stage = "blackhole";
    }
  };
}
Sun.Create = function Create() {
  return new Sun();
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

  this.draw = function () {
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
    var noiseValue = noise(cos(angle) + noiseOffset, sin(angle) + noiseOffset);
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
