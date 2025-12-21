import P5 from "p5"; // Adjust the import based on your p5 setup
import CONSTANTS from "../constants"; // Adjust the import path as necessary
import { getRandomFloat, generateUUID } from "../utlilites";
import { PlanetTrail } from "./planetTrail";
import { Sun } from "./sun";

class Planet {
	p5: P5;
	id: string;
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
		this.id = generateUUID();
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

	toJSON() {
		return {
			id: this.id,
			mass: this.mass,
			pos: { x: this.pos.x, y: this.pos.y },
			vel: { x: this.vel.x, y: this.vel.y },
			d: this.d,
			color: {
				h: this.p5.hue(this.color),
				s: this.p5.saturation(this.color),
				b: this.p5.brightness(this.color),
			},
			orbitingBodyId: this.orbitingBody ? this.orbitingBody.id : null,
			planetTrailId: this.planetTrail ? this.planetTrail.id : null,
		};
	}

	static fromJSON(
		p5: P5,
		data: ReturnType<Planet["toJSON"]>,
		sun: Sun,
		planetTrails: PlanetTrail[]
	): Planet {
		const planet = Object.create(Planet.prototype);
		planet.p5 = p5;
		planet.id = data.id;
		planet.mass = data.mass;
		planet.pos = p5.createVector(data.pos.x, data.pos.y);
		planet.vel = p5.createVector(data.vel.x, data.vel.y);
		planet.d = data.d;
		planet.color = p5.color(data.color.h, data.color.s, data.color.b);

		// A planet's orbitingBody is always the sun
		planet.orbitingBody = sun;
		planet.planetTrail =
			planetTrails.find((pt) => {
        return pt.id === data.planetTrailId;
      }) || null;

		return planet;
	}
}

export { Planet };
