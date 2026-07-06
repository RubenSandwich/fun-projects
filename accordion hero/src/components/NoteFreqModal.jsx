import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  LANE_COLORS,
  getNoteFrequencies,
  setNoteFreq,
  resetNoteFrequencies,
} from '../data/constants'
import { startMic, stopMic, detectNote } from '../audio/pitch'

// A full-page modal for tuning each button's push/pull frequency, either by
// typing a value or by listening for a note through the microphone. Edits are
// applied live to the shared note map (so a song plays with them), and can be
// exported as a JSON file.
export default function NoteFreqModal({ onClose, micEnabled = false }) {
  const [rows, setRows] = useState(() => getNoteFrequencies())
  const [listening, setListening] = useState(null) // { lane, type } | null
  const [micErr, setMicErr] = useState('')
  const rafRef = useRef(0)
  const startedMicRef = useRef(false)
  const lastApplyRef = useRef(0)

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // On unmount, stop any listening loop and release the mic (unless the game's
  // own mic mode is using it).
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (startedMicRef.current && !micEnabled) stopMic()
    }
  }, [micEnabled])

  const stopListening = () => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    setListening(null)
  }

  const listen = async (lane, type) => {
    // Clicking the active mic toggles it off.
    if (listening && listening.lane === lane && listening.type === type) {
      stopListening()
      return
    }
    cancelAnimationFrame(rafRef.current)
    setMicErr('')
    try {
      await startMic()
      startedMicRef.current = true
    } catch {
      setMicErr('Could not access the microphone. Check browser permissions.')
      return
    }
    setListening({ lane, type })
    lastApplyRef.current = 0
    const tick = () => {
      const det = detectNote()
      if (det && det.freq > 0) {
        const now = performance.now()
        if (now - lastApplyRef.current > 80) {
          lastApplyRef.current = now
          const freq = Math.round(det.freq * 100) / 100
          setNoteFreq(lane, type, freq) // apply live to the shared map
          setRows((prev) => {
            const next = prev.map((r) => ({ push: { ...r.push }, pull: { ...r.pull } }))
            next[lane][type].freq = freq
            return next
          })
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const setFreq = (lane, type, value) => {
    setRows((prev) => {
      const next = prev.map((r) => ({ push: { ...r.push }, pull: { ...r.pull } }))
      next[lane][type].freq = value
      return next
    })
    const f = parseFloat(value)
    if (Number.isFinite(f) && f > 0) setNoteFreq(lane, type, f)
  }

  const reset = () => {
    stopListening()
    resetNoteFrequencies()
    setRows(getNoteFrequencies())
  }

  const download = () => {
    const data = getNoteFrequencies() // the live, in-effect map
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'accordion-note-frequencies.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="paper modal" role="dialog" aria-modal="true" aria-label="Note frequencies">
        <div className="modal__head">
          <h2 className="modal__title">Note frequencies</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="modal__hint">
          Tune each button to your instrument — type a frequency, or click 🎤 and play the note.
        </p>

        <div className="modal__body">
          <div className="freq-list">
            {rows.map((row, lane) => (
              <div className="freq-row" key={lane}>
                <span className="freq-row__btn" style={{ '--lane': LANE_COLORS[lane] }}>
                  {lane + 1}
                </span>
                {['push', 'pull'].map((type) => {
                  const on = listening && listening.lane === lane && listening.type === type
                  return (
                    <div className={'freq-cell' + (on ? ' is-listening' : '')} key={type}>
                      <span className="freq-cell__name">
                        {type === 'push' ? '▼' : '▲'} {row[type].name}
                      </span>
                      <input
                        className="freq-cell__input"
                        type="number"
                        min="20"
                        step="0.01"
                        value={row[type].freq}
                        onChange={(e) => setFreq(lane, type, e.target.value)}
                        aria-label={`Button ${lane + 1} ${type} frequency (Hz)`}
                      />
                      <span className="freq-cell__unit">Hz</span>
                      <button
                        type="button"
                        className={'freq-cell__mic' + (on ? ' is-on' : '')}
                        onClick={() => listen(lane, type)}
                        aria-pressed={on}
                        title="Listen through the microphone"
                      >
                        🎤
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {micErr && <p className="modal__err">{micErr}</p>}
        {listening && (
          <p className="modal__listening">
            🎤 Listening… play button {listening.lane + 1} ({listening.type}).
          </p>
        )}

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={reset}>
            Reset
          </button>
          <button className="btn btn--primary" onClick={download}>
            Save &amp; download
          </button>
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
