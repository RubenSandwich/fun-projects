import P5 from "p5";
import { generateUUID } from "../utlilites";

class PlanetTrail {
	p5: P5;
	id: string;
	color: P5.Color;
	path: P5.Vector[];
	pathLengthMax: number;
	windDown: boolean;
	trailAlphas: number[];

	constructor(p5: P5, planetTrailColor: P5.Color, pathLengthMax: number) {
		this.p5 = p5;
		this.id = generateUUID();
		this.path = [];
		this.pathLengthMax = pathLengthMax;
		this.windDown = false;
		this.trailAlphas = [];

		this.color = this.p5.color(
			this.p5.hue(planetTrailColor),
			this.p5.saturation(planetTrailColor),
			this.p5.brightness(planetTrailColor),
			this.p5.alpha(planetTrailColor)
		);

		// Create an array of colors with gradually increasing alpha
		for (let i = 0; i < pathLengthMax; i++) {
			const trailAlpha = this.p5.map(i, 0, pathLengthMax - 1, 0.1, 1);
			this.trailAlphas.push(trailAlpha);
		}
	}

	draw(): boolean {
		if (this.windDown) {
			this.path.splice(0, 1);
			if (this.path.length <= 0) {
				return false; // Stop drawing this trail, and remove it
			}
		}

		this.p5.strokeWeight(1);

		for (let i = 0; i < this.path.length - 1; i++) {
			this.color.setAlpha(this.trailAlphas[i]);
			this.p5.stroke(this.color);

			this.p5.line(
				this.path[i].x,
				this.path[i].y,
				this.path[i + 1].x,
				this.path[i + 1].y
			);
		}

		return true; // Continue drawing this trail
	}

	addPoint(point: P5.Vector): void {
		this.path.push(point);
		if (this.path.length > this.pathLengthMax) {
			this.path.shift(); // Remove the oldest point if we exceed the max length
		}
	}

	beginWindDown(): void {
		this.windDown = true;
	}

	toJSON() {
		return {
			id: this.id,
			path: this.path.map((point) => ({ x: point.x, y: point.y })),
			pathLengthMax: this.pathLengthMax,
			windDown: this.windDown,
			color: {
				hue: this.p5.hue(this.color),
				saturation: this.p5.saturation(this.color),
				brightness: this.p5.brightness(this.color),
				alpha: this.p5.alpha(this.color),
			},
			trailAlphas: this.trailAlphas,
		};
	}
}

export { PlanetTrail };
