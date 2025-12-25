import P5 from "p5";

import { bigBounceUniverse } from "./bigBounceUniverse";
import { simpleUniverseCreator } from "./simpleUniverse";

import CONSTANTS from "./constants";
import { parseErrorMessage } from "./utlilites";
import { universeTestingStates } from "./universeTestingStates";

// TODO:
//    1. start at the big bang
//    2. the sun should only grow when it "eats" a planet
//    3. create a comet class that randomly flys by
//        a. If it hits the sun and make it grow
//    4. have nebulas fade in and out as the universe age
//        a. should they have stars in them?
//    5. have plants and moons fly in as comets
//    6. after a big bang it should create nebulas with a special nebula in
//          the center that turns into the sun
//    7. have stars fade in and out as the universe age
//    8. The "black hole" stage should also supernova
//        a. which means that a small dense core will be left behind that turns into the black hole
//    9. the black hole should slowly grow
//    10. once the universe is empty the black hole should collapse and expload into a big bang
//        a. this isn't really what happens as black holes slowly evaporate
//
//    Questions:
//        1. should I add more songs?
//            a. "Main Title" when all the planets are in place?
//            b. "Travelers" or  "14.3 Billion Years" when the universe is empty before "bouncing"?
//            c. "End Times" when the sun supernovas, at 1:25 begin the black hole
//
//    Every few days:
//        1. test on the ipad mini, lots missing on Safari in iOS 9.3.5

let errorDiv: HTMLElement | null = null;
let startBigBounceUniverse: () => void;

let simpleUniverse = {
	beginFade: () => {},
	fading: false,
};

let universe;

function displayError(div: HTMLElement | null, message: string): void {
	if (!div) {
		setTimeout(function () {
			displayError(div, message);
		}, 500);
	} else {
		div.style.display = "block";
		div.innerText = message;
	}
}

// Uncomment if device orientation handling is needed
// function deviceOrientation() {
//   const body = document.body;
//   body.classList = "";
//   switch (window.orientation) {
//     case 0:
//       body.classList.add("rotation90");
//       break;
//     case 180:
//       body.classList.add("rotation-90");
//       break;
//     default:
//       body.classList.add("landscape");
//       break;
//   }
// }
// window.addEventListener("orientationchange", deviceOrientation);

document.addEventListener("DOMContentLoaded", function () {
	errorDiv = document.getElementById("errors") as HTMLElement;

	const startButtonEle = document.getElementById(
		"startButton"
	)! as HTMLButtonElement;

	startButtonEle.addEventListener("click", () => {
		if (!simpleUniverse.fading) {
			simpleUniverse.beginFade();
			startButtonEle.disabled = true;
		}
	});
});

// This catches script loading errors, such as Reference Errors,
// because debugging Safari on iOS 9.3.5 doesn't work anymore due
// apple limitations
window.addEventListener("error", function (e: ErrorEvent) {
	console.log(e);
	displayError(errorDiv, parseErrorMessage(e));
});

// Prevent mobile touch scrolling
document.ontouchmove = function (event: TouchEvent) {
	event.preventDefault();
};

// Listen for spacebar key press
document.addEventListener("keydown", (event: KeyboardEvent) => {
	if (event.code === "Space" || event.key === " ") {
		event.preventDefault();

		if (universe && CONSTANTS.debug) {
			const modal = document.getElementById(
				"statePopover"
			) as HTMLDialogElement;

			const p5 = universe as P5;
			if (p5.isLooping()) {
				p5.noLoop();
				modal.showModal();

				const currentStateTextarea = document.getElementById(
					"currentState"
				) as HTMLTextAreaElement;

        const universeState = universe.getUniverseState();

        currentStateTextarea.value = JSON.stringify(universeState, null, 2);
        console.log("Universe state:", universeState);
			} else {
				modal.close();
				p5.loop();
			}
		}
	}
});

// Handle save state button
document.addEventListener("DOMContentLoaded", function () {
	const saveStateBtn = document.getElementById("saveStateBtn");
	if (saveStateBtn) {
		saveStateBtn.addEventListener("click", () => {
			if (universe) {
        const stateJSON = JSON.stringify(universe.getUniverseState(), null, 2);

				// Create a blob from the JSON string
				const blob = new Blob([stateJSON], { type: "application/json" });
				const url = URL.createObjectURL(blob);

				// Create a temporary download link
				const a = document.createElement("a");
				a.href = url;
				a.download = `universe-state-${Date.now()}.json`;
				document.body.appendChild(a);
				a.click();

				// Clean up
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}
		});
	}

	const loadStateBtn = document.getElementById("loadStateBtn");
	if (loadStateBtn) {
		loadStateBtn.addEventListener("click", () => {
			// Create a hidden file input element
			const fileInput = document.createElement("input");
			fileInput.type = "file";
			fileInput.accept = ".json";
			fileInput.style.display = "none";

			fileInput.addEventListener("change", (event) => {
				const target = event.target as HTMLInputElement;
				const file = target.files?.[0];

				if (file) {
					const reader = new FileReader();
					reader.onload = async (e) => {
						const fileContent = e.target?.result as string;
						try {
							const newUniverseState = JSON.parse(fileContent);

							if (universe) {
								await universe.loadUniverseState(newUniverseState);
							}

							console.log("Loaded universe state:", newUniverseState);
						} catch (error) {
							console.error("Failed to parse JSON:", error);
							alert("Invalid JSON file");
						}
					};
					reader.readAsText(file);
				}

				// Clean up
				document.body.removeChild(fileInput);
			});

			document.body.appendChild(fileInput);
			fileInput.click();
		});
	}

	// Handle saved state buttons
	const savedStateButtons = document.querySelectorAll(".load-saved-state");
	savedStateButtons.forEach((button) => {
		button.addEventListener("click", (event) => {
			const target = event.target as HTMLButtonElement;
			const slotName = target.getAttribute("data-slot-name");

			if (slotName && slotName in universeTestingStates) {
				const stateData = universeTestingStates[slotName as keyof typeof universeTestingStates];
				console.log(`Loading state from slot: ${slotName}`, stateData);

				// Update the textarea with the loaded state
				const currentStateTextarea = document.getElementById(
					"currentState"
				) as HTMLTextAreaElement;
				currentStateTextarea.value = JSON.stringify(stateData, null, 2);
			} else {
				console.error(`Invalid slot name: ${slotName}`);
			}
		});
	});



});

try {
	startBigBounceUniverse = () => {
		const startScreen = document.getElementById("startScreen");
		if (!startScreen) {
			throw new Error("startScreen element is undefined.");
		}

		startScreen.style.display = "none"; // Hide the start screen
		universe = new P5(bigBounceUniverse);
	};

	if (window.location.href.includes("?mode=webapp") || CONSTANTS.debug) {
		startBigBounceUniverse();
	} else {
		document.addEventListener("DOMContentLoaded", function () {
			const startCanvasElement = document.getElementById("startCanvas");
			if (!startCanvasElement) {
				throw new Error("startCanvasElement element is undefined.");
			}

			const { beginFade, fading, SimpleUniverse } = simpleUniverseCreator(
				startBigBounceUniverse
			);

			simpleUniverse = {
				beginFade,
				fading,
			};

			new P5(SimpleUniverse, startCanvasElement);
		});
	}
} catch (e) {
	console.log(e);
	displayError(errorDiv, parseErrorMessage(e));
}
