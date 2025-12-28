import P5 from "p5"; // Adjust the import based on your p5 setup
import { generateUUID, getRandomFloat } from "../utlilites";
import { PlanetTrail } from "./planetTrail";
import { Planet } from "./planet";

class Moon {
	p5: P5;
	id: string;
	mass: number;
	d: number;
	pos: P5.Vector;
	color: P5.Color;
	orbitingBody: Planet | null;
	orbitRadius: number;
	orbitAngle: number;
	planetTrail: PlanetTrail | null;

	constructor(
		p5: P5,
		mass: number,
		color: P5.Color,
		orbitingBody: Planet,
		planetTrail: PlanetTrail
	) {
		this.p5 = p5;
		this.id = generateUUID();
		this.mass = mass;
		this.d = this.mass * 2;
		this.color = color;
		this.planetTrail = planetTrail;
		this.orbitingBody = orbitingBody;

		this.orbitRadius = getRandomFloat(
			this.orbitingBody.d * 1.2,
			this.orbitingBody.d * 2
		);
		this.orbitAngle = getRandomFloat(0.05, 0.12);

		this.pos = P5.Vector.add(
			this.orbitingBody.pos,
			this.p5.createVector(
				this.orbitRadius * Math.cos(this.orbitAngle),
				this.orbitRadius * Math.sin(this.orbitAngle)
			)
		);
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

		// Update the moon's orbit angle
		this.orbitAngle += 0.07;

		// Calculate new position relative to the planet
		const relativePos = this.p5.createVector(
			this.orbitRadius * Math.cos(this.orbitAngle),
			this.orbitRadius * Math.sin(this.orbitAngle)
		);

		// Update moon's position relative to the planet
		this.pos = P5.Vector.add(this.orbitingBody.pos, relativePos);

		// Update planet trail
		if (this.planetTrail) {
			this.planetTrail.addPoint(this.pos.copy());
		}
	}

	destroy(): void {
		this.orbitingBody = null;
		this.planetTrail = null;
	}

	toJSON() {
		return {
			// added properties
			className: this.constructor.name.toLowerCase(),
			// normal properties
			id: this.id,
			mass: this.mass,
			d: this.d,
			pos: { x: this.pos.x, y: this.pos.y },
			color: {
				h: this.p5.hue(this.color),
				s: this.p5.saturation(this.color),
				b: this.p5.brightness(this.color),
			},
			orbitingBodyId: this.orbitingBody?.id ?? null,
			orbitRadius: this.orbitRadius,
			orbitAngle: this.orbitAngle,
			planetTrailId: this.planetTrail?.id ?? null,
		};
	}

	static fromJSON(
		p5: P5,
		data: ReturnType<Moon["toJSON"]>,
		orbitingBodies: Planet[],
		planetTrails: PlanetTrail[]
	): Moon {
		const moon = Object.create(Moon.prototype);
		moon.p5 = p5;
		moon.id = data.id;
		moon.className = data.className;
		moon.mass = data.mass;
		moon.d = data.d;
		moon.pos = p5.createVector(data.pos.x, data.pos.y);
		moon.color = p5.color(data.color.h, data.color.s, data.color.b);
		moon.orbitingBody =
			orbitingBodies.find((ob) => {
				return ob.id === data.orbitingBodyId;
			}) || null;
		moon.orbitRadius = data.orbitRadius;
		moon.orbitAngle = data.orbitAngle;
		moon.planetTrail =
			planetTrails.find((pt) => {
        return pt.id === data.planetTrailId;
      }) || null;

		return moon;
	}
}

export { Moon };
