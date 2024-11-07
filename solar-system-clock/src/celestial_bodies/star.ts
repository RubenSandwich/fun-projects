class Star {
  pos: p5.Vector;
  size: number;
  offset: number;
  twinkleSpeed: number;
  removeFunction: (() => void) | null;
  particles: any[]; // Replace 'any' with the actual type if known
  numParticles: number;
  stage: string;

  constructor() {
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
    this.stage = "twinkle"; // "twinkle" or "exploding"
  }

  draw(): void {
    if (this.stage === "twinkle") {
      noStroke();
      const brightness = map(
        sin(frameCount * this.twinkleSpeed + this.offset),
        -1,
        1,
        100,
        255
      );
      fill(brightness);
      ellipse(this.pos.x, this.pos.y, this.size);
    } else if (this.stage === "exploding") {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const particle = this.particles[i];
        particle.pos.add(p5.Vector.mult(particle.vel, 0.5));
        particle.size *= 0.9;
        fill(particle.color);
        noStroke();
        ellipse(particle.pos.x, particle.pos.y, particle.size);
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
        this.removeFunction?.();
      }
    }
  }

  beginExploding(removeFunction: () => void): void {
    this.stage = "exploding";
    this.removeFunction = removeFunction;
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push({
        pos: this.pos.copy(),
        vel: p5.Vector.random2D(),
        size: this.size,
        color: color(random(360), random(80, 100), random(80, 100)),
      });
    }
  }

  static Create(): Star {
    return new Star();
  }
}
