import { useRef, useState } from 'react'
import { getSongs, deleteSong, saveSong, importSongJSON, DIFF_CLASS } from '#data/songs'
import { jsonErrorText } from '../../../utils'
import Modal from '#components/Modal/Modal'
import SongEditor from '#modals/SongEditor/SongEditor'
import './SongLibrary.css'

// A full-page modal listing every song. Built-in songs are locked; user songs
// can be edited or deleted, and you can write a new one or upload a chart.
// Editing/creating opens the SongEditorModal on top of this one.
export default function SongLibrary({ onClose, onChange, onSelect }) {
  const [songs, setSongs] = useState(() => getSongs())
  const [editing, setEditing] = useState(null) // 'new' | { song } | null
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)

  // Re-read the store after any change and tell the parent to refresh too.
  const refresh = () => {
    setSongs(getSongs())
    onChange?.()
  }

  const remove = (id) => {
    deleteSong(id)
    refresh()
  }

  const handleSave = (def) => {
    const saved = saveSong(def) // throws on invalid -> caught in the editor
    refresh()
    onSelect?.(saved.id)
    setEditing(null)
  }

  const upload = async (file) => {
    setUploadError('')
    if (!file) return
    try {
      const saved = importSongJSON(JSON.parse(await file.text()))
      refresh()
      onSelect?.(saved.id)
    } catch (err) {
      setUploadError(jsonErrorText(err))
    }
  }

  return (
    <>
      <Modal title="Song library" onClose={onClose}>
        <p className="modal__hint">
          Edit or delete your songs, write a new one, or upload a chart.
        </p>

        <div className="modal__body">
          <div className="song-lib-list">
            {songs.map((s) => (
              <div className="song-lib-row" key={s.id} style={{ '--card': s.color }}>
                <div className="song-lib-row__info">
                  <span className="song-lib-row__name">{s.name}</span>
                  <span className="song-lib-row__meta">
                    <span className={'diff ' + DIFF_CLASS[s.difficulty]}>{s.difficulty}</span>
                    <span className="song-lib-row__bpm">{s.bpm} BPM</span>
                  </span>
                </div>
                {s.builtin ? (
                  <span className="preset-row__tag">Built-in</span>
                ) : (
                  <div className="song-lib-row__actions">
                    <button
                      className="preset-icon-btn"
                      onClick={() => setEditing({ song: s })}
                      title="Edit song"
                      aria-label={`Edit ${s.name}`}
                    >
                      ✎
                    </button>
                    <button
                      className="preset-icon-btn preset-icon-btn--danger"
                      onClick={() => remove(s.id)}
                      title="Delete song"
                      aria-label={`Delete ${s.name}`}
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {uploadError && <p className="modal__err">{uploadError}</p>}

        <div className="modal__footer">
          <button
            className="btn btn--ghost"
            style={{ marginRight: 'auto' }}
            onClick={() => setEditing('new')}
          >
            ＋ New song
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
      </Modal>

      {editing && (
        <SongEditor
          song={editing === 'new' ? null : editing.song}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
