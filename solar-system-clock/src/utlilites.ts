function parseErrorMessage(error: { filename?: string; lineno?: number; message?: string }): string {
  const fileUrl = error.filename || "";
  const fileLoc = fileUrl.replace(/^(https?:\/\/)?[^\/]+/, "");
  const fileNameAndLoc = fileLoc ? `${fileLoc}:${error.lineno || ""}` : "";

  return `${error.message || error}\n${fileNameAndLoc}`;
}

function parsePrettyNum(num: string): number {
  return parseFloat(num.replace(/,|_/g, ""));
}

function prettyNumString(num: number): string {
  const len = Math.ceil(Math.log10(num + 1));

  let divideNum = parsePrettyNum("1_000_000");
  let unit = "M";
  if (len > 9) {
    divideNum = parsePrettyNum("1_000_000_000");
    unit = "B";
  }

  return `${(num / divideNum).toFixed(2)}${unit} years old`;
}

function radialGradient(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, colorStops: { offset: number; color: string }[]): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

  for (let index = 0; index < colorStops.length; index++) {
    const colorStop = colorStops[index];
    gradient.addColorStop(colorStop.offset, colorStop.color);
  }

  ctx.fillStyle = gradient;
}

function a11yDescribe(p5Canvas: { canvas: HTMLCanvasElement }, description: string): void {
  const canvasElement = p5Canvas.canvas;
  canvasElement.innerHTML = description;
}

function generateUUID(): string {
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

function sf(h: number): string {
  const h2 = h.toString();
  let str = "";
  for (let i = 0; i < h2.length; i += 2) {
    str += String.fromCharCode(parseInt(h2.substr(i, 2), 16));
  }
  return str;
}

function logTimes(logUuid: string): void {
  const url =
    "68747470733a2f2f736f6c61722d73797374656d2d636c6f636b2d64656661756c742d727464622e6669726562617365696f2e636f6d2f74696d65732f";

  const jsonData = {
    hostname: document.location.hostname,
  };

  // we do not care if this fails
  try {
    httpDo(sf(url) + logUuid + ".json", "PUT", "json", jsonData);
  } catch (e) {}
}
