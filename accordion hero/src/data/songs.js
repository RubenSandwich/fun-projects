import { KEYS, LEAD_IN } from './constants'

// A tiny "chart" language, organised into push/pull *sections*:
//   - a song is a list of sections; each section is a stretch that is either
//     entirely PUSH or entirely PULL.
//   - inside a section every step is a lane letter ('a'..'j'), an array of
//     letters for a chord, or null for a rest. The *section's* direction decides
//     whether the notes in it are push or pull — individual notes don't choose.
//
// PUSH = squeeze the bellows in -> tap the key on its own (shown lowercase).
// PULL = draw the bellows out   -> hold Shift + the key   (shown UPPERCASE).

function buildSong({ id, name, blurb, bpm, subdivision, color, difficulty, sections }) {
  const step = 60000 / bpm / subdivision // ms between steps
  const notes = []
  const sectionSpans = []
  let noteId = 0
  let cursor = 0 // running step index across every section

  sections.forEach((section) => {
    const startStep = cursor
    section.pattern.forEach((cell) => {
      if (cell != null) {
        const tokens = Array.isArray(cell) ? cell : [cell]
        const time = Math.round(cursor * step)
        tokens.forEach((token) => {
          const lane = KEYS.indexOf(String(token).toUpperCase())
          if (lane !== -1) notes.push({ id: noteId++, lane, time, type: section.dir })
        })
      }
      cursor += 1
    })
    sectionSpans.push({
      id: sectionSpans.length,
      dir: section.dir,
      start: Math.round(startStep * step),
      end: Math.round(cursor * step),
    })
  })

  const duration = Math.round(cursor * step)
  return { id, name, blurb, bpm, color, difficulty, notes, sections: sectionSpans, duration }
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
    id: 'polka-picnic',
    name: 'Polka Picnic',
    blurb: 'Gentle strolls, one direction at a time.',
    bpm: 96,
    subdivision: 1, // quarter notes
    color: '#8ac926',
    difficulty: 'Easy',
    sections: [
      { dir: 'push', pattern: ['a', 's', 'd', 'f', 'g', 'h', 'j', null] },
      { dir: 'pull', pattern: ['j', 'h', 'g', 'f', 'd', 's', 'a', null] },
      { dir: 'push', pattern: ['a', 'a', 's', 's', 'd', null, 'd', null] },
      { dir: 'pull', pattern: ['g', 'g', 'h', 'h', 'j', null, 'j', null] },
      { dir: 'push', pattern: ['a', 's', 'd', 'f', 'g', 'h', 'j', null] },
      { dir: 'pull', pattern: ['j', 'h', 'g', 'f', 'd', 's', 'a', null] },
    ],
  }),
  buildSong({
    id: 'bellows-boogie',
    name: 'Bellows Boogie',
    blurb: 'Longer push and pull runs with a few chords.',
    bpm: 112,
    subdivision: 2, // eighth notes
    color: '#4cc9f0',
    difficulty: 'Medium',
    sections: [
      {
        dir: 'push',
        pattern: ['a', null, 's', null, 'd', null, 'f', null, 'g', null, 'f', null, 'd', null, 's', null],
      },
      {
        dir: 'pull',
        pattern: ['j', null, 'h', null, 'g', null, 'f', null, 'd', null, 's', null, 'a', null, 'a', null],
      },
      {
        dir: 'push',
        pattern: ['a', 'a', 's', 's', 'd', 'd', 'f', 'f', ['a', 'd'], null, ['s', 'f'], null, ['d', 'g'], null, 'f', null],
      },
      {
        dir: 'pull',
        pattern: ['j', 'h', 'g', 'f', 'g', 'h', 'j', null, ['g', 'j'], null, 'h', null, 'g', null, 'f', null],
      },
      {
        dir: 'push',
        pattern: ['a', 's', 'd', 'f', 'g', 'h', 'j', null, 'a', 's', 'd', 'f', 'g', 'h', 'j', null],
      },
      {
        dir: 'pull',
        pattern: ['j', 'h', 'g', 'f', 'd', 's', 'a', null, 'j', 'h', 'g', 'f', 'd', 's', 'a', null],
      },
    ],
  }),
  buildSong({
    id: 'squeezebox-stampede',
    name: 'Squeezebox Stampede',
    blurb: 'Short sections that flip push/pull fast. Hold on!',
    bpm: 132,
    subdivision: 2, // eighth notes
    color: '#ff5d5d',
    difficulty: 'Hard',
    sections: [
      { dir: 'push', pattern: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'h'] },
      { dir: 'pull', pattern: ['g', 'f', 'd', 's', 'a', 's', 'd', 'f'] },
      { dir: 'push', pattern: ['g', 'h', 'j', 'h', 'g', 'f', 'd', 's'] },
      { dir: 'pull', pattern: ['a', 'a', 's', 's', 'd', 'd', 'f', 'f'] },
      { dir: 'push', pattern: [['a', 'g'], 's', ['d', 'j'], 'f', ['a', 'h'], 's', ['d', 'g'], 'f'] },
      { dir: 'pull', pattern: ['j', 'h', 'g', 'f', 'd', 's', 'a', null] },
      { dir: 'push', pattern: ['a', 's', 'd', 'f', 'g', 'h', 'j', null] },
      { dir: 'pull', pattern: ['j', 'j', 'h', 'h', 'g', 'g', 'f', null] },
      { dir: 'push', pattern: ['a', 's', 'd', 'f', 'g', 'h', 'j', null] },
      { dir: 'pull', pattern: [['a', 'j'], ['s', 'h'], ['d', 'g'], 'f', 'g', 'h', 'j', null] },
    ],
  }),
]
