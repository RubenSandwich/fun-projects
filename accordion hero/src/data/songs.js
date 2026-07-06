import { LEAD_IN } from './constants'

// Chart format: a whitespace / line separated list of tokens like "+3" or "-4".
//   - the number (1-7) is the accordion button to press.
//   - "+" means PUSH (squeeze the bellows in); "-" means PULL (draw them out).
//     A bare number (e.g. "3") defaults to push.
//   - "X" (or "x") is a REST: a silent beat where nothing is played.
//   - a CHORD is several buttons in parentheses that sound on the same beat,
//     e.g. "(-4 -3)" plays buttons 4 and 3 together (draw). One beat is used.
//   - every token is one beat; a line break adds a short breath between phrases.
//
// Example ("Row, Row, Row Your Boat"):  +3 +3 +3 -3 -4  ...

const NOTE_RE = /^([+-]?)([1-7])$/
// A token is either a "(...)" chord group or a run of non-space characters.
const TOKEN_RE = /\([^)]*\)|\S+/g

function parseChart(chart, { bpm, subdivision = 1, breath = true }) {
  const step = 60000 / bpm / subdivision // ms between beats
  const notes = []
  let noteId = 0
  let cursor = 0
  const lines = chart.trim().split('\n')

  const addNote = (tok, time) => {
    const m = NOTE_RE.exec(tok)
    if (!m) return
    const type = m[1] === '-' ? 'pull' : 'push'
    const lane = Number(m[2]) - 1
    notes.push({ id: noteId++, lane, time, type })
  }

  lines.forEach((line, li) => {
    const tokens = line.trim().match(TOKEN_RE) || []
    tokens.forEach((tok) => {
      if (tok === 'X' || tok === 'x') {
        cursor += 1 // rest: a silent beat
        return
      }
      const time = Math.round(cursor * step)
      if (tok[0] === '(') {
        // Chord: every button inside sounds on this beat.
        const inner = tok.slice(1, -1).trim().split(/\s+/).filter(Boolean)
        inner.forEach((t) => addNote(t, time))
        cursor += 1
        return
      }
      const before = notes.length
      addNote(tok, time)
      if (notes.length > before) cursor += 1 // only a valid note uses a beat
    })
    if (breath && tokens.length && li < lines.length - 1) cursor += 1
  })

  return { notes, duration: Math.round(cursor * step) }
}

// Group consecutive same-direction notes into push/pull runs. These drive the
// look-ahead ribbon and the current-direction banner.
function deriveSections(notes, duration) {
  const runs = []
  notes.forEach((n) => {
    const last = runs[runs.length - 1]
    if (!last || last.dir !== n.type) runs.push({ dir: n.type, start: n.time })
  })
  return runs.map((r, i) => ({
    id: i,
    dir: r.dir,
    start: r.start,
    end: i < runs.length - 1 ? runs[i + 1].start : duration,
  }))
}

function buildSong({
  id,
  name,
  blurb,
  bpm,
  subdivision = 1,
  color,
  difficulty,
  chart,
  builtin = false,
}) {
  const { notes, duration } = parseChart(chart, { bpm, subdivision })
  const sections = deriveSections(notes, duration)
  // Keep the raw fields (chart/subdivision/builtin) on the built song so the
  // library and editor can round-trip and re-save it.
  return {
    id,
    name,
    blurb,
    bpm,
    subdivision,
    color,
    difficulty,
    chart,
    builtin,
    notes,
    sections,
    duration,
  }
}

// WCAG relative luminance of an [r, g, b] colour.
function luminance(r, g, b) {
  const f = (c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const PAPER_LUM = luminance(255, 251, 239) // the --paper card background

function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return [f(0), f(8), f(4)]
}

const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('')

// A vivid but accessible random accent: keeps at least 3:1 contrast against the
// paper card so the coloured edge/ring stays clearly visible.
export function randomAccentColor() {
  const hue = Math.floor(Math.random() * 360)
  const sat = 0.6 + Math.random() * 0.25
  // Start bright and darken until the colour clears the 3:1 contrast bar.
  let rgb
  for (let l = 0.55; l >= 0.2; l -= 0.04) {
    rgb = hslToRgb(hue, sat, l)
    if ((PAPER_LUM + 0.05) / (luminance(...rgb) + 0.05) >= 3) break
  }
  return toHex(rgb)
}

// ---------- Song library (built-ins + user songs in localStorage) ----------
//
// A song is stored as a raw definition { id, name, blurb, bpm, subdivision,
// color, difficulty, chart } and built on demand with buildSong. Built-in songs
// come from BUILTIN_DEFS and can't be edited or deleted; user songs live in
// localStorage.

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

// Maps a difficulty to its badge CSS class (shared by every song UI).
export const DIFF_CLASS = {
  Easy: 'diff--easy',
  Medium: 'diff--med',
  Hard: 'diff--hard',
}

const HEX_RE = /^#[0-9a-f]{3,8}$/i
const SONGS_KEY = 'accordion-user-songs'

// Count the playable notes in a chart string (editor feedback + validation).
export function chartNoteCount(chart) {
  return parseChart(String(chart || ''), { bpm: 120 }).notes.length
}

function makeSongId() {
  return 'song-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function isBuiltinId(id) {
  return BUILTIN_DEFS.some((d) => d.id === id)
}

// Validate + normalize a raw song definition (from the editor or an upload) into
// the fields buildSong needs. Throws a friendly Error when something's missing.
export function normalizeSongDef(data, { id } = {}) {
  if (!data || typeof data !== 'object') throw new Error('The file must contain a song object.')
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  if (!name) throw new Error('Song needs a name.')
  const bpm = Number(data.bpm)
  if (!Number.isFinite(bpm) || bpm <= 0) throw new Error('Song needs a positive BPM.')
  const chart = typeof data.chart === 'string' ? data.chart : ''
  if (!chart.trim()) throw new Error('Song needs a chart (tokens like +3 or -4).')
  if (!chartNoteCount(chart)) {
    throw new Error('The chart has no playable notes (use tokens like +3 or -4).')
  }
  const sub = Number(data.subdivision)
  const subdivision = Number.isFinite(sub) && sub > 0 ? sub : 1
  const color =
    typeof data.color === 'string' && HEX_RE.test(data.color.trim())
      ? data.color.trim()
      : randomAccentColor()
  const difficulty = DIFFICULTIES.includes(data.difficulty) ? data.difficulty : 'Medium'
  const blurb =
    typeof data.blurb === 'string' && data.blurb.trim()
      ? data.blurb.trim().slice(0, 120)
      : 'A custom song.'
  return {
    id: id || makeSongId(),
    name: name.slice(0, 60),
    blurb,
    bpm,
    subdivision,
    color,
    difficulty,
    chart,
  }
}

// User song definitions from localStorage.
function readUserDefs() {
  try {
    const arr = JSON.parse(localStorage.getItem(SONGS_KEY) || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeUserDefs(defs) {
  try {
    localStorage.setItem(SONGS_KEY, JSON.stringify(defs))
  } catch {
    /* storage unavailable — ignore */
  }
}

// Every playable song: the built-in ones first, then user songs from storage.
// Built songs carry their raw fields (chart, color, difficulty, builtin flag) so
// the library and editor can round-trip them.
export function getSongs() {
  const builtin = BUILTIN_DEFS.map((d) => buildSong({ ...d, builtin: true }))
  const user = []
  for (const raw of readUserDefs()) {
    try {
      const def = normalizeSongDef(raw, { id: typeof raw?.id === 'string' ? raw.id : undefined })
      user.push(buildSong({ ...def, builtin: false }))
    } catch {
      /* skip an unusable stored song */
    }
  }
  return [...builtin, ...user]
}

// Create or update a user song from a raw definition. Returns the built song.
export function saveSong(data) {
  const keepId =
    typeof data.id === 'string' && data.id && !isBuiltinId(data.id) ? data.id : undefined
  const def = normalizeSongDef(data, { id: keepId })
  const song = buildSong({ ...def, builtin: false })
  const defs = readUserDefs()
  const i = defs.findIndex((d) => d && d.id === def.id)
  if (i >= 0) defs[i] = def
  else defs.push(def)
  writeUserDefs(defs)
  return song
}

// Delete a user song (built-ins can't be removed).
export function deleteSong(id) {
  if (isBuiltinId(id)) return
  writeUserDefs(readUserDefs().filter((d) => d && d.id !== id))
}

// Validate + store an uploaded song JSON as a new user song. Returns the song.
export function importSongJSON(data) {
  return saveSong({ ...data, id: undefined })
}

// Shift a song so the first note only appears *after* the countdown ends: every
// note and section starts LEAD_IN ms in, so the playfield stays empty during the
// 3-2-1.
export function withLeadIn(song) {
  return {
    ...song,
    notes: song.notes.map((n) => ({ ...n, time: n.time + LEAD_IN })),
    sections: song.sections.map((s) => ({
      ...s,
      start: s.start + LEAD_IN,
      end: s.end + LEAD_IN,
    })),
    duration: song.duration + LEAD_IN,
  }
}

// Raw definitions for the built-in songs (source of truth; built on demand).
const BUILTIN_DEFS = [
  {
    id: 'twinkle',
    name: 'Twinkle, Twinkle',
    blurb: 'The classic. Mostly gentle push/pull pairs.',
    bpm: 100,
    color: '#8ac926',
    difficulty: 'Easy',
    chart: `
      +1 +1 +3 +3 -3 -3 +3
      -2 -2 +2 +2 -1 -1 +1
      +3 +3 -2 -2 +2 +2 -1
      +3 +3 -2 -2 +2 +2 -1
      +1 +1 +3 +3 -3 -3 +3
      -2 -2 +2 +2 -1 -1 +1
    `,
  },
  {
    id: 'row-your-boat',
    name: 'Row, Row, Row Your Boat',
    blurb: 'Reaches the high buttons with quick direction flips.',
    bpm: 112,
    color: '#4cc9f0',
    difficulty: 'Medium',
    chart: `
      +3 +3 +3 -3 -4
      -4 -3 -4 +4 -5
      +6 +6 +6
      -5 -5 -5
      -4 -4 -4
      +3
      -5 +4 -4 -3 +3
    `,
  },
  {
    id: 'ode-to-joy',
    name: 'Ode to Joy',
    blurb: 'Beethoven at a brisk pace — mind the push/pull switches.',
    bpm: 124,
    color: '#ff5d5d',
    difficulty: 'Hard',
    chart: `
      +2 +2 -2 +3 +3 -2 +2 -1
      +1 +1 -1 +2 +2 -1 -1
      +2 +2 -2 +3 +3 -2 +2 -1
      +1 +1 -1 +2 -1 +1 +1
    `,
  },
  {
    id: 'chord-parade',
    name: 'Chord Parade',
    blurb: 'Squeeze a few buttons at once, then breathe — full of chords and rests.',
    bpm: 108,
    color: '#9d4edd',
    difficulty: 'Medium',
    chart: `
      +1 X +1 (+1 +3)
      -2 X (-2 -3) X
      +3 +3 (+3 +5) X
      (-4 -3) X +2 X
      +1 (+1 +3) +1 X
      (+1 +3 +5) X (+1 +3 +5) X
    `,
  },
]
