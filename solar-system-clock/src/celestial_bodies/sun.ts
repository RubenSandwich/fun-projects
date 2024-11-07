class Sun {
  mass: number;
  pos: p5.Vector;
  vel: p5.Vector;
  lastGrowthTime: number;
  growthInterval: number;
  growthAmount: number;
  d: number;
  colorsByMass: { [key: number]: p5.Color };
  massIntervals: string[];
  lowestMass: number;
  highestMass: number;
  currentColor: p5.Color;
  stage: string;
  particles: any[]; // Replace 'any' with the actual type if known
  numParticles: number;

  constructor() {
    this.mass = random(20, 40);
    this.pos = createVector(0, 0);
    this.vel = createVector(0, 0);
    this.lastGrowthTime = 0;
    this.growthInterval = random(20000, 50000);
    this.growthAmount = random(1, 5);
    this.d = this.mass * 2;
    this.colorsByMass = {
      30: color(0, random(80, 100), random(30, 65)),
      40: color(random(20, 40), random(80, 100), random(80, 100)),
      50: color(60, random(80, 100), random(80, 100)),
      60: color(60, random(20, 40), random(90, 100)),
      70: color(random(180, 220), random(20, 40), random(80, 100)),
      80: color(0, 0, random(90, 100)),
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
    this.stage = "sun";
    this.particles = [];
    this.numParticles = 400;
  }

  draw(): void {
    if (this.stage === "big bang") {
      this.drawBigBang();
      return;
    } else if (this.stage === "black hole") {
      this.drawBlackHole();
      return;
    }

    if (millis() - this.lastGrowthTime > this.growthInterval) {
      this.mass += this.growthAmount;
      this.d = this.mass * 2;
      this.lastGrowthTime = millis();
      const massIndex = Math.min(
        Math.max(Math.floor(this.mass / 10) * 10, this.lowestMass),
        80
      );
      this.currentColor = this.colorsByMass[massIndex];
    }

    this.drawSun();
  }

  applyForce(f: p5.Vector): void {
    this.vel.add(p5.Vector.div(f, this.mass));
  }

  attractForce(child: any): p5.Vector {
    // Replace 'any' with the actual type if known
    const r = p5.Vector.dist(this.pos, child.pos);
    const f = p5.Vector.sub(this.pos, child.pos);
    f.setMag((CONSTANTS.gravity * this.mass * child.mass) / (r * r));
    return f;
  }

  beginSun(): void {
    this.stage = "sun";
    this.particles = [];
  }

  drawSun(): void {
    const sunColor = color(
      hue(this.currentColor) + sin(frameCount * 0.01) * 20,
      saturation(this.currentColor),
      brightness(this.currentColor) + sin(frameCount * 0.05) * 5
    );
    fill(sunColor);
    const diameter = this.d + sin(frameCount * 0.01) * 5;
    noStroke();
    ellipse(this.pos.x, this.pos.y, diameter, diameter);
  }
}
