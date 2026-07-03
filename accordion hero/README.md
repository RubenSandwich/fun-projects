# 🪗 Accordion Hero

A "Guitar Hero" style rhythm game for **toy accordions**, built with React + Vite
and dressed up in a bright, cut-from-paper **Paper Mario / paper-mache** style.

Notes fly in from the **right** across **7 lanes** on the home row —
**A · S · D · F · G · H · J** — and you play them as they cross the dashed hit line
on the left.

## Push vs. Pull sections

A real toy accordion makes different notes depending on whether you squeeze the
bellows in (**push**) or draw them out (**pull**). Each song is split into whole
**push** and **pull** sections — a scrolling ribbon up top and the banner in the
HUD tell you which one you're in:

| Section | Notes show | What to press |
| ------- | ---------- | ------------- |
| ▼ **PUSH** | lowercase `a` | just tap the key |
| ▲ **PULL** | UPPERCASE `A` | hold **⇧ Shift** + the key |

Push notes are solid paper stickers; pull notes are striped. Match the section's
direction *and* the timing to score Perfect / Good / Ok. Miss it, or use the
wrong direction, and your combo resets.

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
  data/constants.js       lanes, colors, timing windows, positioning
  data/songs.js           the charts (a mini push/pull note language)
  hooks/useGameEngine.js  animation loop, keyboard input, scoring
  components/
    StartScreen.jsx
    Game.jsx
    ResultsScreen.jsx
```

## Add your own song

Songs live in [`src/data/songs.js`](src/data/songs.js). Each is a list of
**sections**, and every section is either `dir: 'push'` or `dir: 'pull'`. Inside
a section's `pattern`, each step is a lane letter (`'a'`..`'j'`), an array like
`['a','j']` for a chord, or `null` for a rest — the section's direction decides
whether its notes are push or pull. Copy an existing `buildSong({ ... })` block,
tweak the `bpm`, `subdivision`, and `sections`, and it shows up on the menu
automatically.
