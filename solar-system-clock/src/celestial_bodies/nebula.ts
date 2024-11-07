class Nebula {
  pos: p5.Vector;
  initialPos: p5.Vector;
  size: number;
  noiseOffset: number;
  renderedImage: p5.Graphics;
  frameOffset: number;
  alreadyTransparent: boolean;

  constructor(
    _pos: p5.Vector,
    _size: number,
    _noiseOffset: number,
    _renderedImage: p5.Graphics
  ) {
    this.pos = _pos;
    this.initialPos = this.pos.copy();
    this.size = _size;
    this.noiseOffset = _noiseOffset;
    this.renderedImage = _renderedImage;
    this.frameOffset = random(0, 100);
    this.alreadyTransparent = false;
  }

  draw(): void {
    if (frameCount > 200 && !this.alreadyTransparent) {
      this.alreadyTransparent = true;
      const ctx = this.renderedImage.drawingContext;
      const ctxImage = ctx.getImageData(
        0,
        0,
        this.renderedImage.width,
        this.renderedImage.height
      );
      const imageData = ctxImage.data;
      for (let i = 3; i < imageData.length; i += 4) {
        imageData[i] = 0;
      }
      ctxImage.data = imageData;
      ctx.putImageData(ctxImage, 0, 0);
    }
    image(
      this.renderedImage,
      this.pos.x - this.size / 2,
      this.pos.y - this.size / 2
    );
  }

  static Create(): Nebula {
    const nebulaPos = createVector(
      random(-width / 2, width / 2),
      random(-height / 2, height / 2)
    );
    const size = random(100, 250);
    const noiseOffset = random(1000);
    const nebulaRender = createGraphics(size, size);
    nebulaRender.noStroke();

    const points: p5.Vector[] = [];
    const numPoints = 15;
    for (let j = 0; j < numPoints; j++) {
      const angle = map(j, 0, numPoints, 0, TWO_PI);
      const noiseValue = noise(
        cos(angle) + noiseOffset,
        sin(angle) + noiseOffset
      );
      const radius = map(noiseValue, 0, 1, size / 8, size / 2);
      const x = radius * cos(angle);
      const y = radius * sin(angle);
      points.push(createVector(x, y));
    }

    for (let j = 0; j < 5; j++) {
      nebulaRender.beginShape();
      for (const p of points) {
        nebulaRender.curveVertex(p.x + size / 2, p.y + size / 2);
      }
      nebulaRender.curveVertex(points[0].x + size / 2, points[0].y + size / 2);
      nebulaRender.curveVertex(points[1].x + size / 2, points[1].y + size / 2);
      nebulaRender.endShape(CLOSE);
    }

    return new Nebula(nebulaPos, size, noiseOffset, nebulaRender);
  }
}
