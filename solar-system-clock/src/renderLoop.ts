import P5 from "p5";

import { bigBounceUniverse } from "./bigBounceUniverse";
import { simpleUniverseCreator } from "./simpleUniverse";

import CONSTANTS from "./constants";
import { parseErrorMessage } from "./utlilites";

type SavedStateLoader = {
	name: string;
	load: () => Promise<any>;
};

type UniverseInstance = P5 & {
	loadUniverseState: (state: unknown) => Promise<void> | void;
	getUniverseState: () => unknown;
};

const savedStateLoaders: SavedStateLoader[] = [
	{
		name: "Fully Formed",
		load: () => import("./save_states/fully-formed.json"),
	},
	{
		name: "Almost Black Hole",
		load: () => import("./save_states/almost-black-hole.json"),
	},
	{
		name: "Mid Black Hole",
		load: () => import("./save_states/mid-black-hole.json"),
	},
	{
		name: "Late Black Hole",
		load: () => import("./save_states/late-black-hole.json"),
	},
	{
		name: "Second Big Bang",
		load: () => import("./save_states/second-big-bang.json"),
	},
];

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
//    10. once the universe is empty the black hole should collapse and explode into a big bang
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

let universe: UniverseInstance | null = null;

function getCurrentStateTextarea(): HTMLTextAreaElement {
	return document.getElementById("currentState") as HTMLTextAreaElement;
}

function closeStatePopover(): void {
	const modal = document.getElementById("statePopover") as HTMLDialogElement;
	modal.close();
}

async function loadUniverseState(state: unknown): Promise<void> {
	if (!universe) {
		return;
	}

	await universe.loadUniverseState(state);
	getCurrentStateTextarea().value = JSON.stringify(state, null, 2);
	console.log("Loaded universe state:", state);
	closeStatePopover();
}

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
		"startButton",
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

// Handle save state button
document.addEventListener("DOMContentLoaded", function () {
	const popover = document.getElementById("statePopover") as HTMLDialogElement;
	const closePopoverBtn = document.getElementById(
		"closePopoverBtn",
	) as HTMLButtonElement;
	const savedStatesList = document.getElementById(
		"saved-states",
	) as HTMLUListElement;
	const loadStateBtn = document.getElementById(
		"loadStateBtn",
	) as HTMLButtonElement;
	const saveStateBtn = document.getElementById(
		"saveStateBtn",
	) as HTMLButtonElement;

	savedStatesList.innerHTML = "";
	savedStateLoaders.forEach((savedState) => {
		const listItem = document.createElement("li");
		listItem.className = "load-saved-state";
		listItem.setAttribute("data-slot-name", savedState.name);
		listItem.tabIndex = 0;
		listItem.textContent = savedState.name;
		savedStatesList.appendChild(listItem);
	});

	popover.addEventListener("toggle", (event) => {
		if (!universe) {
			return;
		}

		if (event.newState === "open") {
			if (universe.isLooping()) {
				universe.noLoop();
			}
		} else if (event.newState === "closed") {
			if (!universe.isLooping()) {
				universe.loop();
			}
		}
	});

	savedStatesList.addEventListener("click", async (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		const listItem = target.closest(".load-saved-state") as HTMLElement | null;
		const slotName = listItem?.getAttribute("data-slot-name");

		if (!slotName) {
			return;
		}

		const loader = savedStateLoaders.find(
			(savedState) => savedState.name === slotName,
		);
		if (!loader) {
			console.error(`Invalid slot name: ${slotName}`);
			return;
		}

		try {
			const stateModule = await loader.load();
			const newUniverseState = stateModule.default ?? stateModule;
			await loadUniverseState(newUniverseState);
		} catch (error) {
			console.error("Failed to load saved state:", error);
			alert("Failed to load saved state");
		}
	});

	savedStatesList.addEventListener("keydown", async (event: KeyboardEvent) => {
		if (event.key !== "Enter" && event.key !== " ") {
			return;
		}

		const target = event.target as HTMLElement;
		if (!target.classList.contains("load-saved-state")) {
			return;
		}

		event.preventDefault();
		target.click();
	});

	// Show and hide the modal on spacebar press
	document.addEventListener("keydown", (event: KeyboardEvent) => {
		if (event.code === "Space" || event.key === " ") {
			event.preventDefault();

			if (universe && CONSTANTS.debug) {
				const modal = document.getElementById(
					"statePopover",
				) as HTMLDialogElement;

				if (!modal.open) {
					modal.showModal();

					const currentStateTextarea = document.getElementById(
						"currentState",
					) as HTMLTextAreaElement;

					const universeState = universe.getUniverseState();

					currentStateTextarea.value = JSON.stringify(universeState, null, 2);
				} else {
					modal.close();
				}
			}
		}
	});

	closePopoverBtn.addEventListener("click", () => {
		popover.close();
	});

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
						await loadUniverseState(newUniverseState);
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
});

try {
	startBigBounceUniverse = () => {
		const startScreen = document.getElementById("startScreen");
		if (!startScreen) {
			throw new Error("startScreen element is undefined.");
		}

		startScreen.style.display = "none"; // Hide the start screen
		universe = new P5(bigBounceUniverse) as UniverseInstance;
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
				startBigBounceUniverse,
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
	const error = e as { filename?: string; lineno?: number; message?: string };
	displayError(errorDiv, parseErrorMessage(error));
}
