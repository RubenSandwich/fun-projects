import P5 from "p5";
import {
	getRandomFloat,
	generateUUID,
	getRandomInt,
	radialGradient,
} from "../utlilites"; // Adjust the import path as necessary

class Nebula {
	p5: P5;
	id: string;
	pos: P5.Vector;
	initialPos: P5.Vector;
	size: number;
	noiseOffset: number;
	nebulaRender: P5.Graphics | null;
	frameOffset: number;
	currentAlpha: number;
	maxAlpha: number;

	constructor(p5: P5) {
		this.p5 = p5;
		this.id = generateUUID();
		this.frameOffset = getRandomInt(100);
		this.currentAlpha = 0;
		this.maxAlpha = getRandomInt(50, 85);

		// prevent nebulas from spawning at [-100, 100] in both x and y,
		// because we don't want anything close to the sun
		this.pos = this.p5.createVector(
			getRandomFloat(1) < 0.5
				? getRandomInt(-this.p5.width / 2, -40)
				: getRandomInt(40, this.p5.width / 2),
			getRandomFloat(1) < 0.5
				? getRandomInt(-this.p5.height / 2, -40)
				: getRandomInt(40, this.p5.height / 2)
		);

		this.initialPos = this.pos.copy();
		this.size = getRandomInt(100, 250);
		this.noiseOffset = getRandomInt(1000);

		this.nebulaRender = this.p5.createGraphics(this.size, this.size);
		this.nebulaRender.noStroke();

		// Generate blob shape
		const points: P5.Vector[] = [];
		const numPoints = 15; // Fewer points for more polygon-like shape
		for (let j = 0; j < numPoints; j++) {
			const angle = this.p5.map(j, 0, numPoints, 0, Math.PI * 2);
			const noiseValue = this.p5.noise(
				Math.cos(angle) + this.noiseOffset,
				Math.sin(angle) + this.noiseOffset
			);
			const radius = this.p5.map(
				noiseValue,
				0,
				1,
				this.size / 8,
				this.size / 2
			);
			const x = radius * Math.cos(angle);
			const y = radius * Math.sin(angle);
			points.push(this.p5.createVector(x, y));
		}

		radialGradient(
			this.nebulaRender.drawingContext,
			this.nebulaRender.width / 2,
			this.nebulaRender.height / 2,
			this.nebulaRender.width / 2,
			[
				{
					offset: 0,
					color: `hsla(${getRandomInt(360)}, 80%, 50%, 0.05)`,
				},
				{
					offset: 1,
					color: `hsla(${getRandomInt(360)}, 80%, 50%, 0.05)`,
				},
			]
		);

		for (let j = 0; j < 5; j++) {
			// Draw multiple layers for a glowing effect
			this.nebulaRender.beginShape();
			for (let k = 0; k < points.length; k++) {
				const p = points[k];
				this.nebulaRender.curveVertex(p.x + this.size / 2, p.y + this.size / 2);
			}
			// Add the first two points again to close the shape smoothly
			this.nebulaRender.curveVertex(
				points[0].x + this.size / 2,
				points[0].y + this.size / 2
			);
			this.nebulaRender.curveVertex(
				points[1].x + this.size / 2,
				points[1].y + this.size / 2
			);
			this.nebulaRender.endShape(this.p5.CLOSE);
		}

		// It's a long story, but between our blending and radial gradiant
		// this is the best way to be confident on our pixel's alpha value
		// to avoid a harsh transition on our inital alpha change
		// this.changeAlpha(this.currentAlpha);
	}

	draw(): void {
		if (this.currentAlpha === 0 || !this.nebulaRender) {
			return;
		}

		this.p5.image(
			this.nebulaRender,
			this.pos.x - this.size / 2,
			this.pos.y - this.size / 2
		);
	}

	atFullAlpha(): boolean {
		return this.currentAlpha === this.maxAlpha;
	}

	changeAlpha(alpha: number) {
		if (!this.nebulaRender) {
			return;
		}

		const ctx = this.nebulaRender.drawingContext;
		const ctxImage = ctx.getImageData(
			0,
			0,
			ctx.canvas.width,
			ctx.canvas.height
		);

		const imageData = ctxImage.data;
		const newAlpha = Math.min(this.maxAlpha, Math.max(alpha, 0));

		// set every fourth alpha value
		for (let i = 3; i < imageData.length; i += 4) {
			imageData[i] = newAlpha;
		}

		ctx.putImageData(ctxImage, 0, 0);
		this.currentAlpha = newAlpha;
	}

	destroy(): void {
		this.nebulaRender?.remove();
		this.nebulaRender = null;
	}

	toJSON() {
		let nebulaRenderBase64 = null;
		if (this.nebulaRender) {
			// const ctx = this.nebulaRender.drawingContext;
			// Get the canvas as a data URL and extract the base64 part
			const dataURL = this.nebulaRender.elt.toDataURL();
			nebulaRenderBase64 = dataURL;
		}

		return {
			id: this.id,
			pos: { x: this.pos.x, y: this.pos.y },
			initialPos: { x: this.initialPos.x, y: this.initialPos.y },
			size: this.size,
			noiseOffset: this.noiseOffset,
			nebulaRender: nebulaRenderBase64,
			frameOffset: this.frameOffset,
			currentAlpha: this.currentAlpha,
			maxAlpha: this.maxAlpha,
		};
	}

	static fromJSON(p5: P5, data: ReturnType<Nebula["toJSON"]>): Promise<Nebula> {
		return new Promise((resolve, reject) => {
			const nebula = Object.create(Nebula.prototype);
			nebula.p5 = p5;
			nebula.id = data.id;
			nebula.pos = p5.createVector(data.pos.x, data.pos.y);
			nebula.initialPos = p5.createVector(data.initialPos.x, data.initialPos.y);
			nebula.size = data.size;
			nebula.noiseOffset = data.noiseOffset;
			nebula.frameOffset = data.frameOffset;
			nebula.currentAlpha = data.currentAlpha;
			nebula.maxAlpha = data.maxAlpha;

			// Recreate nebulaRender from base64
			if (data.nebulaRender) {
				nebula.nebulaRender = p5.createGraphics(data.size, data.size);

				// Load the image from the data URL
				p5.loadImage(data.nebulaRender, (img) => {
					nebula.nebulaRender.image(img, 0, 0);
					resolve(nebula);
				}, (err) => {
					reject(err);
				});
			} else {
				nebula.nebulaRender = null;
				resolve(nebula);
			}
		});
	}
}

export { Nebula };
