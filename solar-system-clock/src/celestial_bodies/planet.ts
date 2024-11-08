import P5 from "p5"; // Adjust the import based on your p5 setup
import CONSTANTS from "../constants"; // Adjust the import path as necessary
import { getRandomFloat } from "../utlilites";
import { PlanetTrail } from "./planetTrail";
import { Sun } from "./sun";

class Planet {
  p5: P5;
  mass: number;
  pos: P5.Vector;
  vel: P5.Vector;
  d: number;
  color: P5.Color;
  orbitingBody: Sun | null;
  planetTrail: PlanetTrail | null;

  constructor(
    p5: P5,
    mass: number,
    radius: number,
    color: P5.Color,
    orbitingBody: Sun,
    planetTrail: PlanetTrail
  ) {
    this.p5 = p5;
    this.mass = mass;
    this.d = this.mass * 2;
    this.color = color;
    this.orbitingBody = orbitingBody;
    this.planetTrail = planetTrail;

    const angle = getRandomFloat(0, Math.PI * 2);
    this.pos = this.p5.createVector(
      radius * Math.cos(angle),
      radius * Math.sin(angle)
    );

    // Find direction of orbit and set velocity
    const halfPi = Math.PI / 2;
    this.vel = this.pos.copy();
    this.vel.rotate(getRandomFloat(1) < 0.1 ? -halfPi : halfPi); // Direction of orbit
    this.vel.normalize();
    this.vel.mult(Math.sqrt((CONSTANTS.gravity * orbitingBody.mass) / radius));
    this.vel.mult(
      getRandomFloat(1 - CONSTANTS.destabilise, 1 + CONSTANTS.destabilise)
    ); // create elliptical orbit
  }

  draw(): void {
    this.p5.fill(this.color);
    this.p5.noStroke();
    this.p5.ellipse(this.pos.x, this.pos.y, this.d, this.d);
  }

  move(): void {
    if (!this.orbitingBody) {
      return;
    }

    const force = this.orbitingBody.attractForce(this);
    this.applyForce(force);
    this.pos.add(this.vel);

    P5.Vector.mult(P5.Vector.random2D(), 0.5);

    // Update planet trail
    if (this.planetTrail) {
      this.planetTrail.addPoint(this.pos.copy());
    }
  }

  applyForce(force: P5.Vector): void {
    this.vel.add(force.div(this.mass));
  }

  attractForce(child: Planet): P5.Vector {
    const r = P5.Vector.dist(this.pos, child.pos);
    const f = P5.Vector.sub(this.pos, child.pos);
    f.setMag((CONSTANTS.gravity * this.mass * child.mass) / (r * r));
    return f;
  }

  destroy(): void {
    this.planetTrail = null;
    this.orbitingBody = null;
  }
}

export { Planet };
