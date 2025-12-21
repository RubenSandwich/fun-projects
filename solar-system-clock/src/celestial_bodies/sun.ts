import P5 from "p5";
import CONSTANTS from "../constants";
import { generateUUID, getRandomInt } from "../utlilites";

enum SunStage {
	BIG_BANG = "big bang",
	NEBULA = "nebula",
	SUN = "sun",
	BLACK_HOLE = "black hole",
}

class Sun {
	p5: P5;
	id: string;
	mass: number;
	pos: P5.Vector;
	vel: P5.Vector;
	growing: boolean;
	lastGrowthTime: number;
	growthInterval: number;
	growthAmount: number;
	d: number;
	colorsByMass: { [key: number]: P5.Color };
	massIntervals: number[];
	lowestMass: number;
	highestMass: number;
	currentColor: P5.Color;
	stage: SunStage;
	particles: {
		pos: P5.Vector;
		vel: P5.Vector;
		size: number;
		color: P5.Color;
	}[];
	numParticles: number;
	bigBangCallback: (() => void) | null;

	constructor(p5: P5, options = { simple: false }) {
		this.p5 = p5;
		this.id = generateUUID();
		this.mass = getRandomInt(20, 35);
		this.pos = this.p5.createVector(0, 0);
		this.vel = this.p5.createVector(0, 0);
		this.growing = !options.simple;
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

		this.stage = SunStage.SUN;
		this.particles = [];
		this.numParticles = 400;

		this.bigBangCallback = null;

		if (!options.simple) {
			this.stage = SunStage.BIG_BANG;

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
		}
	}

	draw(): void {
		if (this.stage === SunStage.BIG_BANG) {
			this.drawBigBang();
			return;
		} else if (this.stage === SunStage.BLACK_HOLE) {
			this.drawBlackHole();
			return;
		}

		// Check if it's time to increase the sun's mass
		if (
			this.growing &&
			this.p5.millis() - this.lastGrowthTime > this.growthInterval
		) {
			this.mass += this.growthAmount;
			this.d = this.mass * 2;
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
		this.stage = SunStage.SUN;
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
		this.stage = SunStage.BIG_BANG;

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
		this.growthAmount = getRandomInt(1, 5);
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

		// this.drawSun();

		if (this.particles.length === 0) {
			if (this.bigBangCallback) {
				this.bigBangCallback();
			}

			this.stage = SunStage.NEBULA;
		}
	}

	beginBlackHole(): void {
		this.stage = SunStage.BLACK_HOLE;
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
			for (let i = 0; i < getRandomInt(1, 5); i++) {
				this.particles.push({
					pos: this.p5.createVector(
						getRandomInt(-this.p5.width / 2, this.p5.width / 2),
						getRandomInt(-this.p5.height / 2, this.p5.height / 2)
					),
					vel: this.p5.createVector(0, 0),
					size: getRandomInt(1, 3),
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
				.mult(force * 0.1);
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

	toJSON() {
		return {
			id: this.id,
			mass: this.mass,
			pos: { x: this.pos.x, y: this.pos.y },
			vel: { x: this.vel.x, y: this.vel.y },
			growing: this.growing,
			lastGrowthTime: this.lastGrowthTime,
			growthInterval: this.growthInterval,
			growthAmount: this.growthAmount,
			d: this.d,
			colorsByMass: Object.fromEntries(
				Object.entries(this.colorsByMass).map(([mass, color]) => [
					mass,
					{
						h: this.p5.hue(color),
						s: this.p5.saturation(color),
						b: this.p5.brightness(color),
					},
				])
			),
			massIntervals: this.massIntervals,
			lowestMass: this.lowestMass,
			highestMass: this.highestMass,
			stage: this.stage,
			particles: this.particles.map((p) => ({
				pos: { x: p.pos.x, y: p.pos.y },
				vel: { x: p.vel.x, y: p.vel.y },
				size: p.size,
				color: {
					h: this.p5.hue(p.color),
					s: this.p5.saturation(p.color),
					b: this.p5.brightness(p.color),
				},
			})),
			currentColor: {
				h: this.p5.hue(this.currentColor),
				s: this.p5.saturation(this.currentColor),
				b: this.p5.brightness(this.currentColor),
			},
		};
	}

	static fromJSON(p5: P5, data: ReturnType<Sun["toJSON"]>): Sun {
		const sun = Object.create(Sun.prototype);
		sun.p5 = p5;
		sun.id = data.id;
		sun.mass = data.mass;
		sun.pos = p5.createVector(data.pos.x, data.pos.y);
		sun.vel = p5.createVector(data.vel.x, data.vel.y);
		sun.growing = data.growing;
		sun.lastGrowthTime = data.lastGrowthTime;
		sun.growthInterval = data.growthInterval;
		sun.growthAmount = data.growthAmount;
		sun.d = data.d;
		sun.stage = data.stage;
		sun.numParticles = 400;

    // instead of callbacks we should be using events
		sun.bigBangCallback = null;

		sun.particles = data.particles.map((p) => ({
			pos: p5.createVector(p.pos.x, p.pos.y),
			vel: p5.createVector(p.vel.x, p.vel.y),
			size: p.size,
			color: p5.color(p.color.h, p.color.s, p.color.b),
		}));

		sun.currentColor = p5.color(
			data.currentColor.h,
			data.currentColor.s,
			data.currentColor.b
		);

		sun.colorsByMass = Object.fromEntries(
			Object.entries(data.colorsByMass).map(([mass, color]) => [
				mass,
				p5.color(color.h, color.s, color.b),
			])
		);
		sun.massIntervals = data.massIntervals;
		sun.lowestMass = data.lowestMass;
		sun.highestMass = data.highestMass;

		return sun;
	}
}

export { Sun, SunStage };
