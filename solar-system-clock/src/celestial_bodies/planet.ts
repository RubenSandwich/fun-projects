class Planet {
  mass: number;
  pos: p5.Vector;
  vel: p5.Vector;
  d: number;
  color: string;
  orbitingBody: any; // Replace 'any' with the actual type if known
  planetTrail: any; // Replace 'any' with the actual type if known

  constructor(
    _mass: number,
    _pos: p5.Vector,
    _vel: p5.Vector,
    _color: string,
    _orbitingBody: any, // Replace 'any' with the actual type if known
    _planetTrail: any // Replace 'any' with the actual type if known
  ) {
    this.mass = _mass;
    this.pos = _pos;
    this.vel = _vel;
    this.d = this.mass * 2;
    this.color = _color;
    this.orbitingBody = _orbitingBody;
    this.planetTrail = _planetTrail;
  }

  draw(): void {
    fill(this.color);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.d, this.d);
  }

  move(): void {
    const force = this.orbitingBody.attractForce(this);
    this.applyForce(force);
    this.pos.add(this.vel);
    this.planetTrail.addPoint(this.pos.copy());
  }

  applyForce(f: p5.Vector): void {
    this.vel.add(p5.Vector.div(f, this.mass));
  }

  attractForce(child: Planet): p5.Vector {
    const r = p5.Vector.dist(this.pos, child.pos);
    const f = p5.Vector.sub(this.pos, child.pos);
    f.setMag((G * this.mass * child.mass) / (r * r));
    return f;
  }

  static Create(
    mass: number,
    radius: number,
    planetColor: string,
    orbitingBody: any, // Replace 'any' with the actual type if known
    planetTrail: any // Replace 'any' with the actual type if known
  ): Planet {
    const angle = random(0, TWO_PI);
    const planetPos = createVector(radius * cos(angle), radius * sin(angle));
    const planetVel = planetPos.copy();
    planetVel.rotate(random(1) < 0.1 ? -HALF_PI : HALF_PI);
    planetVel.normalize();
    planetVel.mult(sqrt((CONSTANTS.gravity * orbitingBody.mass) / radius));
    planetVel.mult(
      random(1 - CONSTANTS.destabilise, 1 + CONSTANTS.destabilise)
    );
    return new Planet(
      mass,
      planetPos,
      planetVel,
      planetColor,
      orbitingBody,
      planetTrail
    );
  }
}
