# 🪗 Accordion Hero

A "Guitar Hero" style rhythm game for **toy accordions**, built with React + Vite
and dressed up in a bright, cut-from-paper **Paper Mario / paper-mache** style.

Notes fly in from the **right** across **7 lanes** — the seven accordion buttons,
played with the number keys **1 · 2 · 3 · 4 · 5 · 6 · 7** — and you play them as
they cross the dashed hit line on the left.

## Push vs. Pull

A real toy accordion is *bisonoric*: each button sounds a different note
depending on whether you squeeze the bellows in (**push**) or draw them out
(**pull**). Each note tells you which way to go:

| Direction | What to press | Bellows |
| --------- | ------------- | ------- |
| ▼ **PUSH** | just tap the button's number key | squeeze in |
| ▲ **PULL** | hold **⇧ Shift** + the number key | draw out |

Push notes are solid paper stickers; pull notes are striped. Each moving card
shows the **note name** to play; the lane tells you the button. A look-ahead
ribbon and HUD banner preview the upcoming push/pull direction. Match the
direction *and* the timing to score Perfect / Good / Ok.

### Button → note map

| Button | Push | Pull |
| ------ | ---- | ---- |
| 1 | C (middle) | D |
| 2 | E | F |
| 3 | G | A |
| 4 | C (high) | B |
| 5 | E (high) | D (high) |
| 6 | G (high) | F (high) |
| 7 | B (high) | A (high) |

## Practice speed

Learning a chart? Pick **0.5×**, **0.75×**, or **1×** on the start screen. Lower
speeds slow the whole song down — notes move slower and are spaced further
apart — so you can rehearse the push/pull switches before going full tempo.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (it opens automatically). Build for production with
`npm run build` and preview with `npm run preview`.

## Project layout

```
src/
  App.jsx                 screen router (start → game → results)
  index.css               global styles + start/results screens (paper theme)
  game.css                playfield, lanes, notes, feedback
  audio/sound.js          tiny Web Audio "toy accordion" synth
  data/constants.js       lanes, button/note map, timing windows, positioning
  data/songs.js           the charts (the +N / -N push/pull number notation)
  hooks/useGameEngine.js  animation loop, keyboard input, scoring
  components/
    StartScreen.jsx
    Game.jsx
    ResultsScreen.jsx
```

## Add your own song

Songs live in [`src/data/songs.js`](src/data/songs.js). Each has a `chart`
string written in a simple tab-style notation:

- a token is `+N` (push button *N*) or `-N` (pull button *N*), where *N* is 1–7;
  a bare number defaults to push.
- every token is one beat; a line break adds a short breath between phrases.

For example, "Row, Row, Row Your Boat":

```
+3 +3 +3 -3 -4
-4 -3 -4 +4 -5
+6 +6 +6
-5 -5 -5
-4 -4 -4
+3
-5 +4 -4 -3 +3
```

Copy an existing `buildSong({ ... })` block, tweak the `bpm` and `chart`, and it
shows up on the menu automatically. (Consecutive same-direction notes are grouped
into the look-ahead ribbon for you.)
