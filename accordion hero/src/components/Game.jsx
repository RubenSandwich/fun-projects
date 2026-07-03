import { useEffect, useRef, useState } from 'react'
import { useGameEngine } from '../hooks/useGameEngine'
import { LANE_LABELS, LANE_COLORS, LANE_NOTES, HIT_LINE_PCT, noteX } from '../data/constants'
import '../game.css'

// Note card width in px — keep in sync with `.note { width }` in game.css. Used
// to offset the ribbon so a section band lines up with the edge of a note card,
// not its center.
const NOTE_WIDTH_PX = 80

// Decide whether a note should currently be on screen, and where.
function renderInfo(note, elapsed) {
  if (note.state === 'active') {
    const x = noteX(note.time - elapsed)
    if (x < -14 || x > 112) return null
    return { x, judged: false }
  }
  // Recently hit/missed: keep it briefly for a pop-out animation.
  if (elapsed - note.judgeElapsed < 340) {
    return { x: note.judgeX, judged: true }
  }
  return null
}

// Which direction the song wants right now (drives the mode UI).
function currentDir(sections, elapsed) {
  for (const s of sections) if (elapsed < s.end) return s.dir
  return sections.length ? sections[sections.length - 1].dir : 'push'
}

function Note({ note, x }) {
  const noteName = LANE_NOTES[note.lane][note.type].name
  const isPull = note.type === 'pull'
  const cls =
    'note note--' +
    note.type +
    (note.state === 'hit' ? ' note--hit note--' + note.rating : '') +
    (note.state === 'miss' ? ' note--miss' : '')
  return (
    <div className={cls} style={{ left: x + '%' }}>
      <span className="note-name">{noteName}</span>
      <span className={'note-dir note-dir--' + note.type}>
        <span className="note-dir__arrow">{isPull ? '▲' : '▼'}</span>
        {isPull ? 'PULL' : 'PUSH'}
      </span>
    </div>
  )
}

export default function Game({ song, speed = 1, onFinish, onQuit }) {
  const g = useGameEngine(song, speed, onFinish)

  // Measure the ribbon so we can express half a note's width as a percent and
  // shift the section bands to line up with the note-card edges.
  const ribbonRef = useRef(null)
  const [halfNotePct, setHalfNotePct] = useState(3.2)
  useEffect(() => {
    const el = ribbonRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      if (w) setHalfNotePct(((NOTE_WIDTH_PX / 2) / w) * 100)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const judged = g.counts.perfect + g.counts.good + g.counts.ok + g.counts.miss
  const accuracy = judged
    ? Math.round(((g.counts.perfect + g.counts.good + g.counts.ok) / judged) * 100)
    : 100
  const mode = currentDir(song.sections, Math.max(g.elapsed, 0))

  return (
    <div className={'game mode--' + mode}>
      <div className="hud">
        <button className="btn btn--ghost quit-btn" onClick={onQuit}>
          ‹ Quit
        </button>
        <div className="hud__song">
          <span className="hud__label">Now Playing</span>
          <span className="hud__song-name">
            {song.name}
            {speed < 1 && <span className="speed-tag">{speed}× slow</span>}
          </span>
        </div>

        <div className="hud__stats">
          <div className="hud__block">
            <span className="hud__label">Score</span>
            <span className="hud__value">{g.score}</span>
          </div>
          <div className="hud__block">
            <span className="hud__label">Accuracy</span>
            <span className="hud__value">{accuracy}%</span>
          </div>
          <div className={'hud__block combo' + (g.combo >= 5 ? ' combo--hot' : '')}>
            <span className="hud__label">Combo</span>
            <span className="hud__value">{g.combo}</span>
          </div>
        </div>
      </div>

      {/* Feedback lives above the playfield so it never covers the notes. */}
      <div className="feedback-bar">
        {g.feedback && (
          <div
            key={g.feedback.id}
            className={'feedback feedback--' + g.feedback.rating}
          >
            {g.feedback.text}
          </div>
        )}
      </div>

      <div className="playfield">
        {/* Scrolling ribbon showing the push/pull sections as they approach. */}
        <div className="section-ribbon" ref={ribbonRef}>
          <div className="section-ribbon__marker" style={{ left: HIT_LINE_PCT + '%' }} />
          {song.sections.map((s) => {
            // Shift left by half a note so a band starts at the note's leading
            // edge rather than through its middle.
            const left = noteX(s.start - g.elapsed) - halfNotePct
            const right = noteX(s.end - g.elapsed) - halfNotePct
            if (right < -6 || left > 112) return null
            return (
              <div
                key={s.id}
                className={'section-block section-block--' + s.dir}
                style={{ left: left + '%', width: right - left + '%' }}
              >
                <span>{s.dir === 'pull' ? '▲ PULL' : '▼ PUSH'}</span>
              </div>
            )
          })}
        </div>

        <div className="lanes">
          <div className="hit-zone" style={{ left: HIT_LINE_PCT + '%' }} />

          {LANE_LABELS.map((label, i) => {
            const activeType = g.activeKeys[i]
            const laneNotes = []
            for (const n of g.notes) {
              if (n.lane !== i) continue
              const info = renderInfo(n, g.elapsed)
              if (info) laneNotes.push({ n, x: info.x })
            }
            return (
              <div className="lane" key={label} style={{ '--lane': LANE_COLORS[i] }}>
                <div className="lane-track">
                  {laneNotes.map(({ n, x }) => (
                    <Note key={n.id} note={n} x={x} />
                  ))}
                </div>
                <div
                  className={
                    'key-target' +
                    (activeType ? ' is-active' : '') +
                    (mode === 'pull' ? ' is-pull' : '')
                  }
                  style={{ left: HIT_LINE_PCT + '%' }}
                >
                  <span className="key-letter">{label}</span>
                </div>
              </div>
            )
          })}
        </div>

        {g.countdown > 0 && (
          <div className="countdown">
            <span key={g.countdown}>{g.countdown}</span>
          </div>
        )}

        {g.paused && (
          <div className="pause-overlay">
            <div className="paper pause-card">
              <span className="pause-card__title">⏸ Paused</span>
              <span className="pause-card__hint">
                Press <b>Space</b> to resume
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
