class PlanetTrail {
  color: p5.Color;
  path: p5.Vector[];
  pathLengthMax: number;
  windDown: boolean;
  trailAlphas: number[];

  constructor(_color: p5.Color, _pathLengthMax: number, _trailAlphas: number[]) {
    this.color = _color;
    this.path = [];
    this.pathLengthMax = _pathLengthMax;
    this.windDown = false;
    this.trailAlphas = _trailAlphas;
  }

  draw(): boolean {
    if (this.windDown) {
      this.path.splice(0, 1);
      if (this.path.length <= 0) {
        return false; // Stop drawing this trail, and remove it
      }
    }

    strokeWeight(1);

    for (let i = 0; i < this.path.length - 1; i++) {
      this.color.setAlpha(this.trailAlphas[i]);
      stroke(this.color);

      line(
        this.path[i].x,
        this.path[i].y,
        this.path[i + 1].x,
        this.path[i + 1].y
      );
    }

    return true; // Continue drawing this trail
  }

  addPoint(point: p5.Vector): void {
    this.path.push(point);
    if (this.path.length > this.pathLengthMax) {
      this.path.shift(); // Remove the oldest point if we exceed the max length
    }
  }

  beginWindDown(): void {
    this.windDown = true;
  }

  static Create(planetTrailColor: p5.Color, pathLengthMax: number): PlanetTrail {
    const planetTrailColorCopy = color(
      hue(planetTrailColor),
      saturation(planetTrailColor),
      brightness(planetTrailColor),
      alpha(planetTrailColor)
    );

    const trailAlphas: number[] = [];
    // Create an array of colors with gradually increasing alpha
    for (let i = 0; i < pathLengthMax; i++) {
      const trailAlpha = map(i, 0, pathLengthMax - 1, 0.1, 1);
      trailAlphas.push(trailAlpha);
    }

    return new PlanetTrail(planetTrailColorCopy, pathLengthMax, trailAlphas);
  }
}
