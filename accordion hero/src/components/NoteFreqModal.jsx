import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LANE_COLORS, getDefaultNotes } from '../data/constants'
import { startMic, stopMic, detectNote } from '../audio/pitch'

const cloneRows = (rows) => rows.map((r) => ({ push: { ...r.push }, pull: { ...r.pull } }))

// Turn a preset name into a safe-ish download filename.
const slug = (name) =>
  (name || 'preset').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
  'preset'

// A full-page modal for building or tuning a note-frequency *preset*: give it a
// name, then set each button's push/pull frequency by typing a value or by
// clicking 🎤 and playing the note. Nothing is applied until "Save & Close",
// which hands the finished draft back to the parent via onSave.
export default function NoteFreqModal({
  preset = null,
  onSave,
  onClose,
  micEnabled = false,
  onMicStarted,
}) {
  const [name, setName] = useState(() => preset?.name || '')
  const [rows, setRows] = useState(() => cloneRows(preset?.notes || getDefaultNotes()))
  const [listening, setListening] = useState(null) // { lane, type } | null
  const [micErr, setMicErr] = useState('')
  const [nameErr, setNameErr] = useState('')
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
      onMicStarted?.()
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
          setRows((prev) => {
            const next = cloneRows(prev)
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
      const next = cloneRows(prev)
      next[lane][type].freq = value
      return next
    })
  }

  const reset = () => {
    stopListening()
    setRows(getDefaultNotes())
  }

  const download = () => {
    const data = { name: name.trim() || 'Untitled preset', notes: rows }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accordion-preset-${slug(name)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const save = () => {
    if (!name.trim()) {
      setNameErr('Give your preset a name.')
      return
    }
    stopListening()
    onSave?.({ id: preset?.id, name: name.trim(), notes: rows })
  }

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="paper modal"
        role="dialog"
        aria-modal="true"
        aria-label="Note-frequency preset"
      >
        <div className="modal__head">
          <h2 className="modal__title">{preset ? 'Edit preset' : 'New preset'}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <label className="modal__field">
          <span className="modal__field-label">Preset name</span>
          <input
            className="modal__field-input"
            type="text"
            value={name}
            placeholder="e.g. My toy accordion"
            maxLength={40}
            onChange={(e) => {
              setName(e.target.value)
              if (nameErr) setNameErr('')
            }}
          />
        </label>
        {nameErr && <p className="modal__err">{nameErr}</p>}

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
          <button className="btn btn--ghost" onClick={download}>
            Download
          </button>
          <button className="btn btn--primary" onClick={save}>
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
