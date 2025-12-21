import P5 from "p5";

import { getRandomInt, getRandomFloat, generateUUID } from "../utlilites";

enum StarStage {
	Twinkle = "twinkle",
	Exploding = "exploading",
}

class Star {
	p5: P5;
	id: string;
	pos: P5.Vector;
	size: number;
	offset: number;
	brightness: number;
	twinkleSpeed: number;
	particles: {
		pos: P5.Vector;
		vel: P5.Vector;
		size: number;
		color: P5.Color;
	}[];
	numParticles: number;
	stage: StarStage;

	constructor(p5: P5) {
		this.p5 = p5;
		this.id = generateUUID();
		this.pos = this.p5.createVector(
			getRandomInt(-this.p5.width / 2, this.p5.width / 2),
			getRandomInt(-this.p5.height / 2, this.p5.height / 2)
		);
		this.size = getRandomInt(1, 3);
		this.brightness = getRandomInt(100, 255);
		this.offset = getRandomFloat(Math.PI * 2);
		this.twinkleSpeed = getRandomFloat(0.005, 0.015);

		this.particles = [];
		this.numParticles = 5;
		this.stage = StarStage.Twinkle;
	}

	draw(): void {
		if (this.stage === StarStage.Twinkle) {
			this.p5.noStroke();

			const size = this.p5.map(
				Math.sin(this.p5.frameCount * this.twinkleSpeed + this.offset),
				-1,
				1,
				this.size,
				this.size + this.size / 2
			);
			this.p5.fill(this.brightness);
			this.p5.ellipse(this.pos.x, this.pos.y, size);

		} else if (this.stage === StarStage.Exploding) {
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

			if (this.particles.length === 0) {
				document.dispatchEvent(
					new CustomEvent("universe.starExplosionComplete", {
						detail: { starId: this.id },
					})
				);
			}
		}
	}

	beginExploading(): void {
		this.stage = StarStage.Exploding;

		for (let i = 0; i < this.numParticles; i++) {
			this.particles.push({
				pos: this.pos.copy(),
				vel: P5.Vector.random2D(),
				size: this.size,
				color: this.p5.color(
					getRandomInt(360),
					getRandomInt(80, 100),
					getRandomInt(80, 100)
				),
			});
		}
	}

	toJSON() {
		return {
			id: this.id,
			pos: { x: this.pos.x, y: this.pos.y },
			size: this.size,
			offset: this.offset,
			brightness: this.brightness,
			twinkleSpeed: this.twinkleSpeed,
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
			numParticles: this.numParticles,
			stage: this.stage,
		};
	}

	static fromJSON(p5: P5, data: ReturnType<Star["toJSON"]>): Star {
		const star = Object.create(Star.prototype);
		star.p5 = p5;
		star.id = data.id;
		star.pos = p5.createVector(data.pos.x, data.pos.y);
		star.size = data.size;
		star.offset = data.offset;
		star.brightness = data.brightness;
		star.twinkleSpeed = data.twinkleSpeed;
		star.numParticles = data.numParticles;
		star.stage = data.stage;

		// Recreate particles
		star.particles = data.particles.map((p) => ({
			pos: p5.createVector(p.pos.x, p.pos.y),
			vel: p5.createVector(p.vel.x, p.vel.y),
			size: p.size,
			color: p5.color(p.color.h, p.color.s, p.color.b),
		}));

		return star;
	}
}

export { Star, StarStage };
