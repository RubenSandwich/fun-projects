# AGENTS.md

Guidance for AI coding agents working in **Accordion Hero** — a Guitar-Hero-style
rhythm game for toy accordions, built with React + Vite in a Paper Mario /
paper-mache visual style.

## Commands

```bash
npm install        # install dependencies
npm run dev        # start the Vite dev server (http://localhost:5173/)
npm run build      # production build (use this to verify changes compile)
npm run preview    # preview the production build
npm test           # run the pitch-detection unit tests (Node's built-in runner)
```

There is a small unit-test suite for the mic pitch detector
(`src/audio/pitch.test.js`); no linter is configured. **Verify changes with
`npm run build` (must pass with no errors) and, for audio/detection work,
`npm test`.** Note: source files in the pitch/sound/constants dependency graph
use explicit `.js` import extensions so Node's native ESM test runner can
resolve them.

## Tech stack

- React 19 + Vite 8 (plain JavaScript, `.jsx`, no TypeScript).
- No CSS framework — hand-written CSS in `src/index.css` (global/screens) and
  `src/game.css` (gameplay). Web Audio API for sound. No other runtime deps.

## Architecture

```
src/
  main.jsx                entry (createRoot + StrictMode)
  App.jsx                 screen router: start -> game -> results; owns song/speed state
  index.css               global theme, start & results screens, shared CSS vars
  game.css                playfield, lanes, notes, ribbon, pause overlay
  data/constants.js       lanes, KEY_CODES, LANE_NOTES (button->note map), timing, noteX()
  data/songs.js           chart parser + the songs
  audio/sound.js          Web Audio "toy accordion" synth (reads LANE_NOTES)
  audio/pitch.js          mic pitch detection (autocorrelation) -> button note
  hooks/useGameEngine.js  the game loop: rAF, keyboard + mic input, scoring, pause, phases
  components/
    StartScreen.jsx       song list, practice-speed picker, how-to + button/note map
    Game.jsx              HUD, section ribbon, lanes, notes, countdown, pause overlay
    ResultsScreen.jsx     rank + stats
```

## Core domain concepts

- **7 buttons / lanes**, played with the number keys **1–7** (`KEY_CODES` maps
  `Digit1..7` and `Numpad1..7` to lane indices 0–6).
- **Push vs Pull** = bellows direction. **Push = tap the key**, **Pull = hold
  Shift + the key**. Each button is *bisonoric*: it plays a different note on
  push vs pull. The full map lives in `LANE_NOTES` in `data/constants.js`
  (e.g. button 1 = C push / D pull).
- **Chart format** (`data/songs.js`): a `chart` string of tokens like `+3`
  (push button 3) or `-4` (pull button 4); a bare number defaults to push. One
  token per beat; a line break adds a one-beat breath. Consecutive
  same-direction notes are grouped into "sections" for the look-ahead ribbon.
- **Timing / motion**: `noteX(deltaMs)` maps a note's time-until-hit to an
  x-position percent. `LEAD_TIME` is travel time; `LEAD_IN` delays the first
  note until after the 3-2-1 countdown. Practice **speed** scales the game clock
  in `useGameEngine` (lower = slower motion and spacing). **Space** pauses.
- **Microphone mode** (`audio/pitch.js`): an optional input where the mic
  listens, autocorrelation estimates the pitch, and it's matched to the closest
  `LANE_NOTES` frequency (within ~60 cents) to fire a button press. The played
  note inherently encodes push vs pull, since each button sounds a different
  note per direction. The engine polls `detectNote()` each frame and debounces
  note onsets; it never plays the synth for mic hits (the real instrument does).
  While mic mode is on the engine `console.log`s a throttled `[mic]` readout
  (frequency, matched note, cents) to help calibrate a real instrument.

## Conventions & gotchas

- Push/pull colors are unified via the `--push-fill` (solid light orange) and
  `--pull-fill` (blue diagonal stripes) CSS variables in `index.css`. Reuse
  these anywhere push/pull is shown so all indicators stay consistent.
- `NOTE_WIDTH_PX` in `Game.jsx` must stay in sync with `.note { width }` in
  `game.css` — it is used to align the ribbon bands to the note-card edges.
- The game loop keeps mutable state in refs and re-renders once per animation
  frame via `setElapsed`; scoring/combo/feedback live in refs. Don't convert
  these to React state in the hot loop.
- The clock auto-pauses when the tab is hidden (and on manual Space pause) so a
  backgrounded tab doesn't dump a wall of misses.
- Keep edits minimal and in the existing style; don't add dependencies,
  TypeScript, or a CSS framework without being asked.

## Adding a song

Copy an existing `buildSong({ ... })` block in `data/songs.js`, set a `bpm` and
a `chart` string in the `+N` / `-N` notation, and it appears on the menu
automatically.
