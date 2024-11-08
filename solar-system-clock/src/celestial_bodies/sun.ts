import P5 from "p5";
import CONSTANTS from "../constants";
import { getRandomInt } from "../utlilites";

class Sun {
  p5: P5;
  mass: number;
  pos: P5.Vector;
  vel: P5.Vector;
  lastGrowthTime: number;
  growthInterval: number;
  growthAmount: number;
  d: number;
  colorsByMass: { [key: number]: P5.Color };
  massIntervals: number[];
  lowestMass: number;
  highestMass: number;
  currentColor: P5.Color;
  stage: string; // "sun", "big bang", or "black hole"
  particles: {
    pos: P5.Vector;
    vel: P5.Vector;
    size: number;
    color: P5.Color;
  }[];
  numParticles: number;
  bigBangCallback: (() => void) | null;

  constructor(p5: P5) {
    this.p5 = p5;
    this.mass = getRandomInt(20, 35);
    this.pos = this.p5.createVector(0, 0);
    this.vel = this.p5.createVector(0, 0);
    this.lastGrowthTime = 0;
    this.growthInterval = CONSTANTS.getPlanetAddInterval();
    this.growthAmount = getRandomInt(1, 5); // Amount to increase the sun's mass by
    this.d = this.mass * 2;
    this.colorsByMass = {
      30: this.p5.color(0, getRandomInt(80, 100), getRandomInt(30, 65)), // Red
      40: this.p5.color(
        getRandomInt(20, 40),
        getRandomInt(80, 100),
        getRandomInt(80, 100)
      ), // Orange
      50: this.p5.color(60, getRandomInt(80, 100), getRandomInt(80, 100)), // Yellow
      60: this.p5.color(60, getRandomInt(20, 40), getRandomInt(90, 100)), // Light Yellow
      70: this.p5.color(
        getRandomInt(180, 220),
        getRandomInt(20, 40),
        getRandomInt(80, 100)
      ), // Light Blue
      80: this.p5.color(0, 0, getRandomInt(90, 100)), // White
    };
    this.massIntervals = Object.keys(this.colorsByMass).map(Number);
    this.lowestMass = this.massIntervals[0];
    this.highestMass = this.massIntervals[this.massIntervals.length - 1];

    this.currentColor =
      this.colorsByMass[
        Math.min(Math.max(Math.floor(this.mass / 10) * 10, this.lowestMass), 80)
      ];

    this.stage = "sun"; // "sun", "big bang", or "black hole"
    this.particles = [];
    this.numParticles = 400;

    this.bigBangCallback = null;
  }

  draw(): void {
    if (this.stage === "big bang") {
      this.drawBigBang();
      return;
    } else if (this.stage === "black hole") {
      this.drawBlackHole();
      return;
    }

    // Check if it's time to increase the sun's mass
    if (this.p5.millis() - this.lastGrowthTime > this.growthInterval) {
      this.mass += this.growthAmount;
      this.d = this.mass * 2; // Update sun's diameter
      this.lastGrowthTime = this.p5.millis();

      const massIndex = Math.min(
        Math.max(Math.floor(this.mass / 10) * 10, this.lowestMass),
        80
      );

      this.currentColor = this.colorsByMass[massIndex];
    }

    this.drawSun();
  }

  applyForce(force: P5.Vector): void {
    this.vel.add(force.div(this.mass));
  }

  attractForce(child: { pos: P5.Vector; mass: number }): P5.Vector {
    const r = P5.Vector.dist(this.pos, child.pos);
    const f = P5.Vector.sub(this.pos, child.pos);
    f.setMag((CONSTANTS.gravity * this.mass * child.mass) / (r * r));
    return f;
  }

  beginSun(): void {
    this.stage = "sun";
    this.particles = [];
  }

  drawSun(): void {
    // vary the color so the sun "breathes"
    const sunColor = this.p5.color(
      this.p5.hue(this.currentColor) + Math.sin(this.p5.frameCount * 0.01) * 20,
      this.p5.saturation(this.currentColor),
      this.p5.brightness(this.currentColor) +
        Math.sin(this.p5.frameCount * 0.05) * 5
    );
    this.p5.fill(sunColor);

    const diameter = this.d + Math.sin(this.p5.frameCount * 0.01) * 5;

    this.p5.noStroke();
    this.p5.ellipse(this.pos.x, this.pos.y, diameter, diameter);
  }

  beginBigBang(bigBangCallback: () => void): void {
    this.bigBangCallback = bigBangCallback;
    this.stage = "big bang";

    // update any existing particles so that they are never static
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      particle.vel = P5.Vector.random2D().mult(getRandomInt(1, 5));
    }

    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push({
        pos: this.p5.createVector(
          this.p5.random(-this.d / 2, this.d / 2),
          this.p5.random(-this.d / 2, this.d / 2)
        ),
        vel: P5.Vector.random2D().mult(getRandomInt(1, 5)),
        size: getRandomInt(1, 3),
        color: this.p5.color(
          getRandomInt(360),
          getRandomInt(80, 100),
          getRandomInt(80, 100)
        ),
      });
    }

    this.mass = getRandomInt(5, 10);
    this.pos = this.p5.createVector(0, 0);
    this.vel = this.p5.createVector(0, 0);
    this.lastGrowthTime = 0;
    this.growthInterval = CONSTANTS.getPlanetAddInterval();
    this.growthAmount = getRandomInt(1, 5); // Amount to increase the sun's mass by
    this.d = this.mass * 2;
  }

  drawBigBang(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.pos.add(particle.vel);
      particle.size *= 0.9999999999; // Slowly shrink particles

      this.p5.fill(particle.color);
      this.p5.noStroke();
      this.p5.ellipse(particle.pos.x, particle.pos.y, particle.size);

      // Remove particles that are too small or off-screen
      if (
        particle.size < 0.4 ||
        particle.pos.x < -this.p5.width / 2 ||
        particle.pos.x > this.p5.width / 2 ||
        particle.pos.y < -this.p5.height / 2 ||
        particle.pos.y > this.p5.height / 2
      ) {
        this.particles.splice(i, 1);
      }
    }

    this.drawSun();

    if (this.particles.length === 0 && this.bigBangCallback) {
      this.bigBangCallback();
    }
  }

  beginBlackHole(): void {
    this.stage = "black hole";
  }

  drawBlackHole(): void {
    this.p5.push();
    this.p5.translate(this.pos.x, this.pos.y);

    // Draw the black center (event horizon)
    this.p5.fill(0);
    this.p5.noStroke();
    this.p5.ellipse(0, 0, this.d, this.d);

    // Draw the pulsing white ring
    const pulseSpeed = 0.025;
    const pulseAmplitude = 5;
    const ringThickness =
      Math.abs(Math.sin(this.p5.frameCount * pulseSpeed)) * pulseAmplitude;

    this.p5.noFill();
    this.p5.stroke(255);
    this.p5.strokeWeight(ringThickness);
    this.p5.ellipse(0, 0, this.d + ringThickness, this.d + ringThickness);

    // Draw the pulsing disk across the middle
    const diskPulseAmplitude = 1.5;
    const diskWidth = this.d * 2.25;
    const diskThickness =
      Math.abs(Math.sin(this.p5.frameCount * pulseSpeed)) * diskPulseAmplitude;

    this.p5.noStroke();
    this.p5.fill(255);
    this.p5.rectMode(this.p5.CENTER);
    this.p5.ellipse(0, 0, diskWidth, diskThickness);

    // Introduce new particles over time
    if (this.p5.frameCount % 50 === 0) {
      // Adjust the modulus value to control the rate of particle introduction
      for (let i = 0; i < getRandomInt(1, 5); i++) {
        // Adjust the number of particles introduced each time
        this.particles.push({
          pos: this.p5.createVector(
            getRandomInt(-this.p5.width / 2, this.p5.width / 2),
            getRandomInt(-this.p5.height / 2, this.p5.height / 2)
          ),
          vel: this.p5.createVector(0, 0),
          size: getRandomInt(1, 3), // Smaller particle size
          color: this.p5.color(
            getRandomInt(360),
            getRandomInt(80, 100),
            getRandomInt(80, 100)
          ),
        });
      }
    }

    // Draw particles being sucked into the black hole in a spiral pattern
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      const dx = this.pos.x - particle.pos.x;
      const dy = this.pos.y - particle.pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const force = this.d / 8 / distance;
      const spiralForce = this.p5
        .createVector(Math.cos(angle + force), Math.sin(angle + force))
        .mult(force * 0.1); // Move slowly
      particle.vel.add(spiralForce);
      particle.pos.add(particle.vel);

      // Remove particle if it hits the center of the black hole
      if (distance < this.d / 2) {
        this.particles.splice(i, 1);
        continue;
      }

      this.p5.fill(particle.color);
      this.p5.noStroke();
      this.p5.ellipse(particle.pos.x, particle.pos.y, particle.size);
    }

    this.p5.pop();
  }
}

export { Sun };
