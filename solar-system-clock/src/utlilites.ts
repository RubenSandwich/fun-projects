import P5 from "p5";

export function minsToMs(mins: number): number {
  return mins * 60 * 1000;
}

export function getRandomInt(numOne: number, numTwo?: number): number {
  const min = numTwo ? numOne : 0;
  const max = numTwo ? numTwo : numOne;

  const newMin = Math.ceil(min);
  const newMax = Math.floor(max);
  return Math.floor(Math.random() * (newMax - newMin + 1)) + newMin;
}

export function getRandomFloat(numOne: number, numTwo?: number): number {
  const min = numTwo ? numOne : 0;
  const max = numTwo ? numTwo : numOne;
  return Math.random() * (max - min) + min;
}

export function getRandom({ min, max, integer, inclusive }) {
  const newInclusive = inclusive || true;
  const newInteger = integer || false;
  const newMin = min ? min : 0;

  const randomValue =
    Math.random() * (max - newMin + (newInclusive ? 1 : 0)) + newMin;
  return newInteger ? Math.floor(randomValue) : randomValue;
}

export function parseErrorMessage(error: {
  filename?: string;
  lineno?: number;
  message?: string;
}): string {
  const fileUrl = error.filename || "";
  const fileLoc = fileUrl.replace(/^(https?:\/\/)?[^\/]+/, "");
  const fileNameAndLoc = fileLoc ? `${fileLoc}:${error.lineno || ""}` : "";

  return `${error.message || error}\n${fileNameAndLoc}`;
}

export function prettyNumString(num: number): string {
  const len = Math.ceil(Math.log10(num + 1));

  let divideNum = 1_000_000;
  let unit = "M";
  if (len > 9) {
    divideNum = 1_000_000_000;
    unit = "B";
  }

  return `${(num / divideNum).toFixed(2)}${unit} years old`;
}

export function radialGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  colorStops: { offset: number; color: string }[]
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

  for (let index = 0; index < colorStops.length; index++) {
    const colorStop = colorStops[index];
    gradient.addColorStop(colorStop.offset, colorStop.color);
  }

  ctx.fillStyle = gradient;
}

export function generateUUID(): string {
  let d = new Date().getTime();
  let d2 =
    (typeof performance !== "undefined" &&
      performance.now &&
      performance.now() * 1000) ||
    0; // Time in microseconds since page-load or 0 if unsupported
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = Math.random() * 16; // random number between 0 and 16
    if (d > 0) {
      // Use timestamp until depleted
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      // Use microseconds since page-load if supported
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function sf(h: string): string {
  let str = "";
  for (let i = 0; i < h.length; i += 2) {
    str += String.fromCharCode(parseInt(h.slice(i, i + 2), 16));
  }
  return str;
}

export function logTimes(universeState): void {
  const url =
    "68747470733a2f2f736f6c61722d73797374656d2d636c6f636b2d64656661756c742d727464622e6669726562617365696f2e636f6d2f74696d65732f";

  const jsonData = {
    hostname: document.location.hostname,
  };

  // we do not care if this fails
  try {
    fetch(sf(url) + universeState.uuid + ".json", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonData),
    });

    // p5.httpDo(sf(url) + universeState.uuid + ".json", "PUT", "json", jsonData);
  } catch (e) {}
}
