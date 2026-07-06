import { LEAD_IN } from './constants'

// Chart format: a whitespace / line separated list of tokens like "+3" or "-4".
//   - the number (1-7) is the accordion button to press.
//   - "+" means PUSH (squeeze the bellows in); "-" means PULL (draw them out).
//     A bare number (e.g. "3") defaults to push.
//   - every token is one beat; a line break adds a short breath between phrases.
//
// Example ("Row, Row, Row Your Boat"):  +3 +3 +3 -3 -4  ...

function parseChart(chart, { bpm, subdivision = 1, breath = true }) {
  const step = 60000 / bpm / subdivision // ms between beats
  const notes = []
  let noteId = 0
  let cursor = 0
  const lines = chart.trim().split('\n')

  lines.forEach((line, li) => {
    const tokens = line.trim().split(/\s+/).filter(Boolean)
    tokens.forEach((tok) => {
      const m = /^([+-]?)([1-7])$/.exec(tok)
      if (!m) return
      const type = m[1] === '-' ? 'pull' : 'push'
      const lane = Number(m[2]) - 1
      notes.push({ id: noteId++, lane, time: Math.round(cursor * step), type })
      cursor += 1
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

function buildSong({ id, name, blurb, bpm, subdivision = 1, color, difficulty, chart }) {
  const { notes, duration } = parseChart(chart, { bpm, subdivision })
  const sections = deriveSections(notes, duration)
  return { id, name, blurb, bpm, color, difficulty, notes, sections, duration }
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
function randomAccentColor() {
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

// Build a song from an uploaded JSON object, validating the important fields and
// filling in sensible defaults. Throws a friendly Error if it can't be used.
export function songFromJSON(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('The file must contain a song object.')
  }
  const { name, bpm, chart } = data
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Song needs a "name".')
  }
  if (typeof bpm !== 'number' || !Number.isFinite(bpm) || bpm <= 0) {
    throw new Error('Song needs a positive "bpm".')
  }
  if (typeof chart !== 'string' || !chart.trim()) {
    throw new Error('Song needs a "chart" string (tokens like +3 or -4).')
  }
  const subdivision =
    typeof data.subdivision === 'number' && data.subdivision > 0 ? data.subdivision : 1
  const color =
    typeof data.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(data.color.trim())
      ? data.color.trim()
      : randomAccentColor()
  const difficulty = ['Easy', 'Medium', 'Hard', 'Custom'].includes(data.difficulty)
    ? data.difficulty
    : 'Custom'

  const song = buildSong({
    id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, 60),
    blurb:
      typeof data.blurb === 'string' && data.blurb.trim()
        ? data.blurb.trim().slice(0, 120)
        : 'Your uploaded song.',
    bpm,
    subdivision,
    color,
    difficulty,
    chart,
  })
  if (!song.notes.length) {
    throw new Error('The "chart" has no playable notes (use tokens like +3 or -4).')
  }
  return song
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

export const SONGS = [
  buildSong({
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
  }),
  buildSong({
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
  }),
  buildSong({
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
  }),
]
