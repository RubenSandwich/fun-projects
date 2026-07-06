import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DEFAULT_PRESET_ID,
  getPresets,
  getActivePresetId,
  getActivePreset,
  setActivePreset,
  savePreset,
  deletePreset,
  importPresetJSON,
} from '../data/constants'
import NoteFreqModal from './NoteFreqModal'

// Friendly message for a failed JSON read.
const jsonErrorText = (err) =>
  err instanceof SyntaxError ? "That file isn't valid JSON." : err.message

// A full-page modal listing the saved note-frequency presets. You can pick the
// active tuning, edit or delete a user preset, create a new one, or upload one
// from a file. Editing/creating opens the NoteFreqModal on top of this one.
export default function PresetPickerModal({
  onClose,
  onActiveChange,
  micEnabled = false,
  onMicStarted,
}) {
  const [presets, setPresets] = useState(() => getPresets())
  const [activeId, setActiveId] = useState(() => getActivePresetId())
  const [editing, setEditing] = useState(null) // 'new' | { preset } | null
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)

  // Escape closes the picker — but only when the editor isn't the thing on top
  // (the editor handles its own Escape).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !editing) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, editing])

  // Re-read the store after any change and tell the parent what's active now.
  const refresh = () => {
    setPresets(getPresets())
    setActiveId(getActivePresetId())
    onActiveChange?.(getActivePreset())
  }

  const select = (id) => {
    setActivePreset(id)
    refresh()
  }

  const remove = (id) => {
    deletePreset(id)
    refresh()
  }

  const handleSave = ({ id, name, notes }) => {
    const saved = savePreset({ id, name, notes })
    setActivePreset(saved.id) // start using what you just made
    setEditing(null)
    refresh()
  }

  const upload = async (file) => {
    setUploadError('')
    if (!file) return
    try {
      const saved = importPresetJSON(JSON.parse(await file.text()))
      setActivePreset(saved.id)
      refresh()
    } catch (err) {
      setUploadError(jsonErrorText(err))
    }
  }

  return createPortal(
    <>
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
          aria-label="Note-frequency presets"
        >
          <div className="modal__head">
            <h2 className="modal__title">Note-frequency presets</h2>
            <button className="modal__close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <p className="modal__hint">
            Pick which tuning the game uses, or build your own from a real instrument.
          </p>

          <div className="modal__body">
            <div className="preset-list">
              {presets.map((p) => {
                const active = p.id === activeId
                const builtin = p.id === DEFAULT_PRESET_ID
                return (
                  <div className={'preset-row' + (active ? ' is-active' : '')} key={p.id}>
                    <button
                      className="preset-row__select"
                      onClick={() => select(p.id)}
                      aria-pressed={active}
                    >
                      <span className="preset-row__radio" aria-hidden="true" />
                      <span className="preset-row__name">{p.name}</span>
                      {builtin && <span className="preset-row__tag">Built-in</span>}
                      {active && (
                        <span className="preset-row__tag preset-row__tag--active">Active</span>
                      )}
                    </button>
                    {!builtin && (
                      <div className="preset-row__actions">
                        <button
                          className="preset-icon-btn"
                          onClick={() => setEditing({ preset: p })}
                          title="Edit preset"
                          aria-label={`Edit ${p.name}`}
                        >
                          ✎
                        </button>
                        <button
                          className="preset-icon-btn preset-icon-btn--danger"
                          onClick={() => remove(p.id)}
                          title="Delete preset"
                          aria-label={`Delete ${p.name}`}
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {uploadError && <p className="modal__err">{uploadError}</p>}

          <div className="modal__footer">
            <button
              className="btn btn--ghost"
              style={{ marginRight: 'auto' }}
              onClick={() => setEditing('new')}
            >
              ＋ New preset
            </button>
            <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
              ↑ Upload
            </button>
            <button className="btn btn--primary" onClick={onClose}>
              Done
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                upload(e.target.files[0])
                e.target.value = ''
              }}
            />
          </div>
        </div>
      </div>

      {editing && (
        <NoteFreqModal
          preset={editing === 'new' ? null : editing.preset}
          micEnabled={micEnabled}
          onMicStarted={onMicStarted}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </>,
    document.body
  )
}
