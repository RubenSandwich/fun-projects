import { useState } from 'react'
import {
  DEFAULT_PRESET_ID,
  getPresets,
  getActivePresetId,
  getActivePreset,
  setActivePreset,
  savePreset,
  deletePreset,
  importPresetJSON,
  type Preset,
} from '#data/presets'
import Modal from '#components/Modal/Modal'
import UploadButton from '#components/UploadButton/UploadButton'
import NoteFreq, { type PresetDraft } from '#modals/NoteFreq/NoteFreq'
import './PresetPicker.css'

interface PresetPickerProps {
  onClose: () => void
  onActiveChange?: (preset: Preset) => void
  micEnabled?: boolean
  onMicStarted?: () => void
}

type Editing = 'new' | { preset: Preset } | null

// A full-page modal listing the saved note-frequency presets. You can pick the
// active tuning, edit or delete a user preset, create a new one, or upload one
// from a file. Editing/creating opens the NoteFreqModal on top of this one.
export default function PresetPicker({
  onClose,
  onActiveChange,
  micEnabled = false,
  onMicStarted,
}: PresetPickerProps) {
  const [presets, setPresets] = useState<Preset[]>(() => getPresets())
  const [activeId, setActiveId] = useState<string>(() => getActivePresetId())
  const [editing, setEditing] = useState<Editing>(null)
  const [uploadError, setUploadError] = useState('')

  // Re-read the store after any change and tell the parent what's active now.
  const refresh = () => {
    setPresets(getPresets())
    setActiveId(getActivePresetId())
    onActiveChange?.(getActivePreset())
  }

  const select = (id: string) => {
    setActivePreset(id)
    refresh()
  }

  const remove = (id: string) => {
    deletePreset(id)
    refresh()
  }

  const handleSave = ({ id, name, notes }: PresetDraft) => {
    const saved = savePreset({ id, name, notes })
    setActivePreset(saved.id) // start using what you just made
    setEditing(null)
    refresh()
  }

  const handleUpload = (data: unknown) => {
    const saved = importPresetJSON(data) // throws on invalid -> shown via onError
    setActivePreset(saved.id)
    refresh()
  }

  return (
    <>
      <Modal title="Note-frequency presets" onClose={onClose}>
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
          <UploadButton className="btn btn--ghost" onData={handleUpload} onError={setUploadError}>
            ↑ Upload
          </UploadButton>
          <button className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>

      {editing && (
        <NoteFreq
          preset={editing === 'new' ? null : editing.preset}
          micEnabled={micEnabled}
          onMicStarted={onMicStarted}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
