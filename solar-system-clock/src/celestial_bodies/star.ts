import P5 from "p5";

import { getRandomInt, getRandomFloat } from "../utlilites";

class Star {
  p5: P5;
  pos: P5.Vector;
  size: number;
  offset: number;
  twinkleSpeed: number;
  removeCallback: (() => void) | null;
  particles: {
    pos: P5.Vector;
    vel: P5.Vector;
    size: number;
    color: P5.Color;
  }[];
  numParticles: number;
  stage: "twinkle" | "exploading";

  constructor(p5: P5) {
    this.p5 = p5;
    this.pos = this.p5.createVector(
      getRandomInt(-this.p5.width / 2, this.p5.width / 2),
      getRandomInt(-this.p5.height / 2, this.p5.height / 2)
    );
    this.size = getRandomInt(1, 3);
    this.offset = getRandomFloat(Math.PI * 2);
    this.twinkleSpeed = getRandomFloat(0.005, 0.015);
    this.removeCallback = null;

    this.particles = [];
    this.numParticles = 5;
    this.stage = "twinkle"; // "twinkle" or "exploading"
  }

  draw(): void {
    if (this.stage === "twinkle") {
      this.p5.noStroke();

      const brightness = this.p5.map(
        Math.sin(this.p5.frameCount * this.twinkleSpeed + this.offset),
        -1,
        1,
        100,
        255
      );
      this.p5.fill(brightness);
      this.p5.ellipse(this.pos.x, this.pos.y, this.size);
    } else if (this.stage === "exploading") {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const particle = this.particles[i];

        particle.pos.add(
          P5.Vector.mult(particle.vel, 0.5) as unknown as P5.Vector
        );

        particle.size *= 0.9; // Slowly shrink particles

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

      if (this.particles.length === 0 && this.removeCallback) {
        this.removeCallback();
      }
    }
  }

  beginExploading(removeCallback: () => void): void {
    this.stage = "exploading";
    this.removeCallback = removeCallback;

    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push({
        pos: this.pos.copy(),
        vel: P5.Vector.random2D(),
        size: this.size, // Smaller particle size
        color: this.p5.color(
          getRandomInt(360),
          getRandomInt(80, 100),
          getRandomInt(80, 100)
        ),
      });
    }
  }
}

export { Star };
