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
