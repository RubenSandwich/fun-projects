import { useState } from 'react'
import { LANE_LABELS, LANE_COLORS, LANE_NOTES } from '../data/constants'
import { resumeAudio } from '../audio/sound'

const DIFF_CLASS = {
  Easy: 'diff--easy',
  Medium: 'diff--med',
  Hard: 'diff--hard',
}

const SPEEDS = [
  { label: '0.5×', value: 0.5, note: 'Practice' },
  { label: '0.75×', value: 0.75, note: 'Relaxed' },
  { label: '1×', value: 1, note: 'Full speed' },
]

export default function StartScreen({ songs, onStart }) {
  const [selected, setSelected] = useState(0)
  const [speed, setSpeed] = useState(1)

  const handleStart = () => {
    resumeAudio() // unlock audio on this user gesture
    onStart(selected, speed)
  }

  return (
    <div className="start-screen">
      <h1 className="title">
        <span className="title__accordion">🪗</span>
        Accordion&nbsp;Hero
      </h1>
      <p className="subtitle">A squeezebox rhythm game — notes fly in from the right!</p>

      <div className="paper howto">
        <h2 className="howto__heading">How to play</h2>

        <div className="howto__keys">
          {LANE_LABELS.map((label, i) => (
            <span
              key={label}
              className="key-cap"
              style={{ '--lane': LANE_COLORS[i] }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="howto__row">
          <span className="badge badge--push">▼ PUSH</span>
          <span>
            Squeeze the bellows in — just <strong>tap</strong> the button's number
            key.
          </span>
        </div>
        <div className="howto__row">
          <span className="badge badge--pull">▲ PULL</span>
          <span>
            Draw the bellows out — hold{' '}
            <span className="key-cap key-cap--shift">⇧ Shift</span> + the number
            key.
          </span>
        </div>
        <p className="howto__hint">
          Every button plays a different note on push vs pull. The moving cards
          show the note — squeeze the matching button the right way!
        </p>

        <div className="note-map">
          {LANE_NOTES.map((n, i) => (
            <div
              key={i}
              className="note-map__btn"
              style={{ '--lane': LANE_COLORS[i] }}
            >
              <span className="note-map__num">{i + 1}</span>
              <span className="note-map__notes">
                <span className="nm nm--push">▼ {n.push.name}</span>
                <span className="nm nm--pull">▲ {n.pull.name}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="song-list">
        {songs.map((song, i) => (
          <button
            key={song.id}
            className={'paper song-card' + (i === selected ? ' is-selected' : '')}
            style={{ '--card': song.color }}
            onClick={() => setSelected(i)}
          >
            <span className="song-card__name">{song.name}</span>
            <span className="song-card__blurb">{song.blurb}</span>
            <span className="song-card__meta">
              <span className={'diff ' + DIFF_CLASS[song.difficulty]}>
                {song.difficulty}
              </span>
              <span className="song-card__bpm">{song.bpm} BPM</span>
            </span>
          </button>
        ))}
      </div>

      <div className="paper speed-select">
        <span className="speed-select__label">Practice speed</span>
        <div className="speed-select__options">
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              className={'speed-chip' + (s.value === speed ? ' is-selected' : '')}
              onClick={() => setSpeed(s.value)}
            >
              <strong>{s.label}</strong>
              <span>{s.note}</span>
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn--primary btn--big" onClick={handleStart}>
        ▶ Play
      </button>
    </div>
  )
}
