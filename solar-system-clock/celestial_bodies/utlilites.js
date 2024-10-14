function parsePrettyNum(num) {
  return parseFloat(num.replace(/,|_/g, ""));
}

function prettyNumString(num) {
  var len = Math.ceil(Math.log10(num + 1));

  var divideNum = parsePrettyNum("1_000_000");
  var unit = "M";
  if (len > 9) {
    divideNum = parsePrettyNum("1_000_000_000");
    unit = "B";
  }

  return (num / divideNum).toFixed(2) + unit + " years old";
}

// Because of our old version of p5, we don't have the normal describe
function a11yDescribe(p5Canvas, description) {
  var canvasElement = p5Canvas.canvas;
  canvasElement.innerHTML = description;
}

function generateUUID() {
  // Public Domain/MIT
  var d = new Date().getTime();
  var d2 =
    (typeof performance !== "undefined" &&
      performance.now &&
      performance.now() * 1000) ||
    0; //Time in microseconds since page-load or 0 if unsupported
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = Math.random() * 16; //random number between 0 and 16
    if (d > 0) {
      //Use timestamp until depleted
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      //Use microseconds since page-load if supported
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// function logTimes(logUuid) {
//   var apiUrl = "";

//   apiUrl = apiUrl + logUuid + ".json";

//   var jsonData = {
//     hostname: document.location.hostname,
//   };

//   httpDo(apiUrl, "PUT", "json", jsonData);
// }
