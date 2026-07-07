# AGENTS.md

Guidance for AI coding agents working in **Accordion Hero** — a Guitar-Hero-style
rhythm game for toy accordions, built with React + Vite in a Paper Mario /
paper-mache visual style.

## Commands

```bash
npm install        # install dependencies
npm run dev        # start the Vite dev server (http://localhost:5173/)
npm run build      # type-check (tsc) then production build — use this to verify changes
npm run typecheck  # type-check only (tsc --noEmit)
npm run preview    # preview the production build
npm test           # run the pitch-detection unit tests (Node's built-in runner)
npm run format     # format everything with Prettier
npm run format:check  # verify formatting (CI-style, no writes)
```

The codebase is **TypeScript** (strict; see `tsconfig.json`). Vite/esbuild
transpile and own the build, so `tsc` only type-checks (`--noEmit`). There is a
small unit-test suite for the mic pitch detector (`src/audio/pitch.test.ts`); no
linter is configured, but **Prettier** owns formatting (config in
`.prettierrc.json`: no semicolons, single quotes, width 100). **Verify changes
with `npm run build` (runs `tsc` then the Vite build — must pass with no errors),
run `npm run format` before finishing, and, for audio/detection work,
`npm test`.** Note: `npm test` uses Node's native test runner with type-stripping
(`node --experimental-strip-types --test`), and the pitch/sound/instrument
dependency graph uses explicit `.ts` import extensions so that runner can resolve
them — Node won't rewrite a `.js` specifier to a `.ts` file.

Imports use Node **subpath import aliases** (the `imports` map in `package.json`,
resolved by Vite) instead of deep `../../..` paths: `#components/*`, `#modals/*`,
`#screens/*`, `#hooks/*`, `#data/*`, `#audio/*` → the matching `src/` folders
(e.g. `import Modal from '#components/Modal/Modal'`). Prefer these aliases when
adding imports. Two exceptions stay relative: `../utils` (not aliased) and the
pitch/sound/instrument test-graph files (kept on relative `.ts` imports so the
Node test runner resolves them without the alias map).

## Tech stack

- React 19 + Vite 8 + **TypeScript** (strict, `.tsx`/`.ts`; type-check with
  `tsc --noEmit`, Vite/esbuild does the transpiling). Shared domain types live in
  their owning module (`Direction`/`LaneNote` in `data/instrument.ts`, `Preset`
  in `data/presets.ts`, `Song`/`Note`/`Difficulty` in `data/songs.ts`,
  `Detection` in `audio/pitch.ts`, `GameResult`/`GameNote` in
  `hooks/useGameEngine.ts`).
- No CSS framework — hand-written CSS. `src/index.css` holds only the global
  theme (CSS vars), base/app/view-transition styles, and a few shared primitives
  (`.paper`, `.btn`, `.title`, `.diff`, the preset list controls). Every screen
  and modal, like the reusable components in `src/ui/components/`, has a
  co-located `*.css` it imports (e.g. `Start.tsx` imports `Start.css`,
  `Modal.tsx` imports `Modal.css`). Web Audio API for sound. No other runtime
  deps.

## Architecture

```
src/
  main.tsx                entry (createRoot + StrictMode; applies saved tuning)
  App.tsx                 screen router (start -> game -> results) with directional
                          View Transitions; loads songs from the library
  index.css               global theme, CSS vars, base/app + view transitions,
                          and shared primitives (.paper/.btn/.title/.diff/...)
  data/instrument.ts      the 7 buttons: Direction/LaneNote types, LANE_LABELS,
                          LANE_COLORS, KEY_CODES, the live LANE_NOTES map
  data/presets.ts         note-frequency PRESET store (localStorage) + Preset type;
                          applyActivePreset() tunes LANE_NOTES at startup
  data/timing.ts          playfield clock/geometry: LEAD_TIME, windows, noteX()
  data/colors.ts          colour math (randomAccentColor + WCAG contrast)
  data/songs.ts           song model: Song/Note/Section types, chart parser,
                          buildSong, DIFFICULTIES/DIFF_CLASS, chartNoteCount, withLeadIn
  data/songLibrary.ts     SONG LIBRARY store (localStorage) + built-in song defs
  audio/sound.ts          Web Audio "toy accordion" synth (reads LANE_NOTES)
  audio/pitch.ts          mic pitch detection (autocorrelation) -> button note
  hooks/useGameEngine.ts  the game loop: rAF, keyboard + mic input, scoring, pause, phases
  utils.ts                shared helpers (jsonErrorText, slug, downloadJSON)
  ui/                     every component lives in its own folder with a
                          co-located *.css it imports (Modal/Modal.tsx +
                          Modal/Modal.css, Start/Start.tsx + Start/Start.css, ...)
    components/           reusable UI
      Modal/            shared <dialog>-based modal: focus trap, Escape, backdrop,
                        focuses its title on open (every screen/modal builds on it)
      Accordion/        collapsible "paper" card (disclosure); `inert` when collapsed
      SegmentedControl/ connected single-select buttons (radiogroup + arrow keys)
      Switch/           OFF/ON toggle (role="switch") styled like the segmented control
    screens/
      Start/            full-height scroller: how-to, song list + "Add / edit songs",
                        settings (speed, wait-for-note, mic, "Select preset")
      Game/             HUD, section ribbon, lanes, notes, countdown, pause overlay;
                        Game.css holds the playfield, lanes, notes, ribbon, HUD,
                        feedback, countdown and pause styles
      Results/          rank + stats
    modals/
      PresetPicker/     list note-frequency presets: select / edit / delete / new / upload
      NoteFreq/         create/edit a note-frequency preset (name + per-button Hz, mic tuning)
      SongLibrary/      list songs: edit / delete / new / upload (built-ins locked)
      SongEditor/       create/edit a song (name, colour, BPM, blurb, difficulty, chart)
```

## Core domain concepts

- **7 buttons / lanes**, played with the number keys **1–7** (`KEY_CODES` maps
  `Digit1..7` and `Numpad1..7` to lane indices 0–6).
- **Push vs Pull** = bellows direction. **Push = tap the key**, **Pull = hold
  Shift + the key**. Each button is _bisonoric_: it plays a different note on
  push vs pull. The full map lives in `LANE_NOTES` in `data/instrument.ts`
  (e.g. button 1 = C push / D pull).
- **Chart format** (`data/songs.ts`): a `chart` string of tokens like `+3`
  (push button 3) or `-4` (pull button 4); a bare number defaults to push. One
  token per beat; a line break adds a one-beat breath. Consecutive
  same-direction notes are grouped into "sections" for the look-ahead ribbon.
- **Timing / motion** (`data/timing.ts`): `noteX(deltaMs)` maps a note's time-until-hit to an
  x-position percent. `LEAD_TIME` is travel time; `LEAD_IN` delays the first
  note until after the 3-2-1 countdown. Practice **speed** scales the game clock
  in `useGameEngine` (lower = slower motion and spacing). **Space** pauses.
- **Microphone mode** (`audio/pitch.ts`): an optional input where the mic
  listens, autocorrelation estimates the pitch, and it's matched to the closest
  `LANE_NOTES` frequency (within ~60 cents) to fire a button press. The played
  note inherently encodes push vs pull, since each button sounds a different
  note per direction. The engine polls `detectNote()` each frame and debounces
  note onsets; it never plays the synth for mic hits (the real instrument does).
  While mic mode is on the engine `console.log`s a throttled `[mic]` readout
  (frequency, matched note, cents) to help calibrate a real instrument.

## Presets & the song library (localStorage)

Both note tunings and songs are user-editable and persisted in `localStorage`.
They follow the same pattern: a built-in default that can't be edited or deleted,
plus user entries, surfaced through a "picker/library" modal that opens a full
"editor" modal. All modals are portaled to `document.body` and stack as overlays.

- **Note-frequency presets** (`data/presets.ts`; keys `accordion-note-presets`,
  `accordion-active-preset`): `getPresets`, `getActivePreset`, `setActivePreset`,
  `savePreset`, `deletePreset`, `importPresetJSON`, `applyActivePreset`. The
  active preset's frequencies are written into the live `LANE_NOTES` (the note
  model in `data/instrument.ts`) by `applyActivePreset()` at startup (`main.tsx`)
  and by `setActivePreset` whenever it changes. Managed from Settings → "Select
  preset" (`PresetPicker` → `NoteFreq`).
- **Song library** (`data/songLibrary.ts`, over the model in `data/songs.ts`;
  key `accordion-user-songs`): `getSongs`
  (built-ins first, then user songs), `saveSong`, `deleteSong`, `importSongJSON`,
  `normalizeSongDef`, `chartNoteCount`. Songs are stored as raw defs and built on
  demand with `buildSong`; the built song keeps its raw `chart`/`color`/
  `difficulty` plus a `builtin` flag so it round-trips through the editor.
  Managed from the Song accordion → "Add / edit songs" (`SongLibrary` →
  `SongEditor`).
- **Difficulties** are `Easy | Medium | Hard` (`DIFFICULTIES` in `songs.ts`).
- Uploads use a file picker inside the modals — there is no drag-and-drop.
- `Start` tracks the selected song by **id** so selection survives songs
  being added or removed.

## Conventions & gotchas

- Push/pull colors are unified via the `--push-fill` (solid light orange) and
  `--pull-fill` (blue diagonal stripes) CSS variables in `index.css`. Reuse
  these anywhere push/pull is shown so all indicators stay consistent.
- Co-located component CSS is imported by the component and so loads _before_
  the global `index.css` in the bundle. When a screen/modal class must override
  a shared primitive of equal specificity (e.g. `.song-card` over `.paper`),
  give it a higher-specificity selector (`.paper.song-card`) instead of relying
  on source order.
- The game loop keeps mutable state in refs and re-renders once per animation
  frame via `setElapsed`; scoring/combo/feedback live in refs. Don't convert
  these to React state in the hot loop.
- The clock auto-pauses when the tab is hidden (and on manual Space pause) so a
  backgrounded tab doesn't dump a wall of misses.
- Keep edits minimal and in the existing style; don't add dependencies or a CSS
  framework without being asked, and keep new code typed (avoid `any` and
  `@ts-expect-error` — `npm run build` type-checks).

## Adding a song

Easiest: use the in-app **Song library** ("Add / edit songs" on the start
screen) to write or upload one — it's saved to `localStorage`. To ship a new
**built-in** song, add a raw def `{ id, name, blurb, bpm, color, difficulty,
chart }` to `BUILTIN_DEFS` in `data/songLibrary.ts` (chart in the `+N` / `-N`
notation); it appears in the menu and library automatically.
