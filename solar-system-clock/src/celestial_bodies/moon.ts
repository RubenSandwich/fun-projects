class Moon {
  mass: number;
  d: number;
  pos: p5.Vector;
  color: string;
  orbitingBody: any; // Replace 'any' with the actual type if known
  orbitRadius: number;
  orbitAngle: number;
  planetTrail: any; // Replace 'any' with the actual type if known

  constructor(
    _mass: number,
    _pos: p5.Vector,
    _color: string,
    _orbitRadius: number,
    _orbitAngle: number,
    _orbitingBody: any, // Replace 'any' with the actual type if known
    _planetTrail: any // Replace 'any' with the actual type if known
  ) {
    this.mass = _mass;
    this.d = this.mass * 2;
    this.pos = _pos;
    this.color = _color;
    this.orbitingBody = _orbitingBody;
    this.orbitRadius = _orbitRadius;
    this.orbitAngle = _orbitAngle;
    this.planetTrail = _planetTrail;
  }

  draw(): void {
    fill(this.color);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.d, this.d);
  }

  move(): void {
    this.orbitAngle += 0.07;
    const relativePos = createVector(
      this.orbitRadius * cos(this.orbitAngle),
      this.orbitRadius * sin(this.orbitAngle)
    );
    this.pos = p5.Vector.add(this.orbitingBody.pos, relativePos);
    this.planetTrail.addPoint(this.pos.copy());
  }

  static Create(
    mass: number,
    color: string,
    orbitingBody: any, // Replace 'any' with the actual type if known
    planetTrail: any // Replace 'any' with the actual type if known
  ): Moon {
    const orbitRadius = random(orbitingBody.d * 1.2, orbitingBody.d * 2);
    const orbitAngle = random(0.05, 0.12);
    const pos = p5.Vector.add(
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
  }
}
