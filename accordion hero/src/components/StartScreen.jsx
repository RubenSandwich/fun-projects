import { useState } from 'react'
import { LANE_LABELS, LANE_COLORS, LANE_NOTES } from '../data/constants'
import { resumeAudio } from '../audio/sound'
import { startMic, stopMic } from '../audio/pitch'

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

export default function StartScreen({ songs, onStart, micEnabled, onMicChange }) {
  const [selected, setSelected] = useState(0)
  const [showHowTo, setShowHowTo] = useState(false)
  const [showSongs, setShowSongs] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [waitForNote, setWaitForNote] = useState(false)
  const [micBusy, setMicBusy] = useState(false)
  const [micError, setMicError] = useState('')

  const handleStart = () => {
    resumeAudio() // unlock audio on this user gesture
    onStart(selected, speed, waitForNote)
  }

  const toggleMic = async () => {
    if (micEnabled) {
      stopMic()
      onMicChange(false)
      return
    }
    setMicBusy(true)
    setMicError('')
    try {
      await startMic()
      onMicChange(true)
    } catch {
      setMicError('Could not access the microphone. Check browser permissions.')
      onMicChange(false)
    } finally {
      setMicBusy(false)
    }
  }

  return (
    <div className="start-screen">
      <h1 className="title">
        <span className="title__accordion">🪗</span>
        Accordion&nbsp;Hero
      </h1>
      <p className="subtitle">A squeezebox rhythm game — notes fly in from the right!</p>

      <div className="paper accordion howto">
        <button
          className="accordion__toggle"
          onClick={() => setShowHowTo((v) => !v)}
          aria-expanded={showHowTo}
        >
          <span className="accordion__heading">How to play</span>
          <span className="accordion__chevron">▼</span>
        </button>

        <div className={'accordion__panel' + (showHowTo ? ' is-open' : '')}>
          <div className="accordion__body">
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
                Squeeze the bellows in — just <strong>tap</strong> the button's
                number key.
              </span>
            </div>
            <div className="howto__row">
              <span className="badge badge--pull">▲ PULL</span>
              <span>
                Draw the bellows out — hold{' '}
                <span className="key-cap key-cap--shift">⇧ Shift</span> + the
                number key.
              </span>
            </div>
            <p className="howto__hint">
              Every button plays a different note on push vs pull. The moving
              cards show the note — squeeze the matching button the right way!
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
        </div>
      </div>

      <div className="paper accordion songs">
        <button
          className="accordion__toggle"
          onClick={() => setShowSongs((v) => !v)}
          aria-expanded={showSongs}
        >
          <span className="accordion__heading">
            Song
            <span
              className="accordion__current"
              style={{ '--card': songs[selected].color }}
            >
              {songs[selected].name}
            </span>
          </span>
          <span className="accordion__chevron">▼</span>
        </button>

        <div className={'accordion__panel' + (showSongs ? ' is-open' : '')}>
          <div className="accordion__body">
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
          </div>
        </div>
      </div>

      <div className="paper accordion settings">
        <button
          className="accordion__toggle"
          onClick={() => setShowSettings((v) => !v)}
          aria-expanded={showSettings}
        >
          <span className="accordion__heading">Settings</span>
          <span className="accordion__chevron">▼</span>
        </button>

        <div className={'accordion__panel' + (showSettings ? ' is-open' : '')}>
          <div className="accordion__body">
            <div className="practice-row">
              <span className="practice-row__label">Speed</span>
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

            <div className="practice-row practice-row--divider practice-row--wait">
              <span className="practice-row__label">
                🐢 Wait for correct note
                <span className="practice-row__desc">
                  {' '}— pauses on each note until you play it right
                </span>
              </span>
              <button
                className={'checkbox' + (waitForNote ? ' is-checked' : '')}
                onClick={() => setWaitForNote((v) => !v)}
                role="checkbox"
                aria-checked={waitForNote}
              >
                <span className="checkbox__mark">✓</span>
              </button>
            </div>

            <div className="practice-row practice-row--divider mic-row">
              <div className="mic-toggle__info">
                <span className="mic-toggle__label">🎤 Microphone mode</span>
                <span className="mic-toggle__desc">
                  Play a note into the mic and it counts as the button press. The
                  keyboard still works too.
                </span>
                {micError && <span className="mic-toggle__err">{micError}</span>}
              </div>
              <button
                className={'checkbox' + (micEnabled ? ' is-checked' : '')}
                onClick={toggleMic}
                disabled={micBusy}
                role="checkbox"
                aria-checked={micEnabled}
              >
                <span className="checkbox__mark">✓</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn--primary btn--big" onClick={handleStart}>
        ▶ Play {songs[selected].name}
      </button>
    </div>
  )
}
