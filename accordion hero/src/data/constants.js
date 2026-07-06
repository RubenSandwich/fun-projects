// Shared game constants and helpers.

// Seven lanes = the seven toy-accordion buttons, played with the number keys 1-7.
export const LANE_LABELS = ['1', '2', '3', '4', '5', '6', '7']

// Map physical key codes to lane indices. Using `event.code` means the lane is
// the same whether or not Shift is held (Shift is what distinguishes push/pull).
// Both the number row and the numpad work.
export const KEY_CODES = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Digit5: 4,
  Digit6: 5,
  Digit7: 6,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
  Numpad4: 3,
  Numpad5: 4,
  Numpad6: 5,
  Numpad7: 6,
}

// Each button is bisonoric: it sounds a different note when you push (squeeze in)
// vs pull (draw out), exactly like a real diatonic accordion.
//   button 1: C (middle C) / D      button 5: E (high) / D (high)
//   button 2: E / F                  button 6: G (high) / F (high)
//   button 3: G / A                  button 7: B (high) / A (high)
//   button 4: C (high) / B
// The default button/note map. Kept aside so a custom tuning can be reset.
const DEFAULT_LANE_NOTES = [
  { push: { name: 'C', freq: 261.63 }, pull: { name: 'D', freq: 293.66 } },
  { push: { name: 'E', freq: 329.63 }, pull: { name: 'F', freq: 349.23 } },
  { push: { name: 'G', freq: 392.0 }, pull: { name: 'A', freq: 440.0 } },
  { push: { name: 'C', freq: 523.25 }, pull: { name: 'B', freq: 493.88 } },
  { push: { name: 'E', freq: 659.25 }, pull: { name: 'D', freq: 587.33 } },
  { push: { name: 'G', freq: 783.99 }, pull: { name: 'F', freq: 698.46 } },
  { push: { name: 'B', freq: 987.77 }, pull: { name: 'A', freq: 880.0 } },
]

// The *active* map used by the synth and the mic detector. It's a live-mutated
// copy of the defaults (same object identity), so recalibrating a button's
// frequency is picked up immediately everywhere LANE_NOTES is read.
export const LANE_NOTES = DEFAULT_LANE_NOTES.map((n) => ({
  push: { ...n.push },
  pull: { ...n.pull },
}))

// A positive numeric frequency, or null if the value isn't usable.
function validFreq(value) {
  const f = Number(value)
  return Number.isFinite(f) && f > 0 ? f : null
}

// Bulk-apply frequencies from a 7-row array of { push: { freq }, pull: { freq } }.
// Names are left untouched — they describe the instrument's fixed layout.
export function setNoteFrequencies(rows) {
  if (!Array.isArray(rows)) return
  LANE_NOTES.forEach((note, i) => {
    for (const type of ['push', 'pull']) {
      const f = rows[i]?.[type] ? validFreq(rows[i][type].freq) : null
      if (f) note[type].freq = f
    }
  })
}

// ---------- Note-frequency presets (persisted in localStorage) ----------
//
// A preset is { id, name, notes } where `notes` is a full 7-row map. The
// built-in "Default" preset always exists and can't be edited or deleted; user
// presets live in localStorage. Activating a preset pushes its frequencies into
// the live LANE_NOTES map so the synth and mic detector pick them up at once.

const PRESETS_KEY = 'accordion-note-presets'
const ACTIVE_PRESET_KEY = 'accordion-active-preset'
export const DEFAULT_PRESET_ID = 'default'

// A short, collision-resistant id for a new user preset.
function makePresetId() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// A deep copy of the built-in default note map — the starting point for a new
// preset and the target of the editor's "Reset".
export function getDefaultNotes() {
  return DEFAULT_LANE_NOTES.map((n) => ({ push: { ...n.push }, pull: { ...n.pull } }))
}

// A fresh copy of the built-in default preset.
function makeDefaultPreset() {
  return { id: DEFAULT_PRESET_ID, name: 'Default', builtin: true, notes: getDefaultNotes() }
}

// Coerce arbitrary rows into a full, valid 7-row map. Missing or bad values
// fall back to the defaults so every preset is always playable.
function normalizeNotes(rows) {
  return DEFAULT_LANE_NOTES.map((def, i) => {
    const row = Array.isArray(rows) ? rows[i] : null
    const pick = (type) => {
      const src = (row && row[type]) || {}
      const f = validFreq(src.freq)
      return {
        name: typeof src.name === 'string' && src.name ? src.name : def[type].name,
        freq: f || def[type].freq,
      }
    }
    return { push: pick('push'), pull: pick('pull') }
  })
}

// User presets from localStorage (the built-in default is not stored here).
function readUserPresets() {
  try {
    const arr = JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]')
    if (!Array.isArray(arr)) return []
    return arr
      .filter((p) => p && typeof p === 'object')
      .map((p) => ({
        id: typeof p.id === 'string' && p.id ? p.id : makePresetId(),
        name: typeof p.name === 'string' && p.name.trim() ? p.name.trim() : 'Untitled preset',
        notes: normalizeNotes(p.notes),
      }))
  } catch {
    return []
  }
}

function writeUserPresets(presets) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
  } catch {
    /* storage unavailable — ignore */
  }
}

// Every preset, built-in default first.
export function getPresets() {
  return [makeDefaultPreset(), ...readUserPresets()]
}

// Look up a single preset by id (null if it doesn't exist).
export function getPreset(id) {
  return getPresets().find((p) => p.id === id) || null
}

// The id of the preset currently in effect.
export function getActivePresetId() {
  try {
    return localStorage.getItem(ACTIVE_PRESET_KEY) || DEFAULT_PRESET_ID
  } catch {
    return DEFAULT_PRESET_ID
  }
}

// The preset currently in effect (falls back to the default).
export function getActivePreset() {
  return getPreset(getActivePresetId()) || makeDefaultPreset()
}

// Make a preset active and push its frequencies into the live note map.
export function setActivePreset(id) {
  const preset = getPreset(id) || makeDefaultPreset()
  try {
    localStorage.setItem(ACTIVE_PRESET_KEY, preset.id)
  } catch {
    /* ignore */
  }
  setNoteFrequencies(preset.notes)
  return preset
}

// Create or update a user preset. Returns the stored preset (with its id).
export function savePreset({ id, name, notes }) {
  const preset = {
    id: id && id !== DEFAULT_PRESET_ID ? id : makePresetId(),
    name: (name || '').trim() || 'Untitled preset',
    notes: normalizeNotes(notes),
  }
  const presets = readUserPresets()
  const i = presets.findIndex((p) => p.id === preset.id)
  if (i >= 0) presets[i] = preset
  else presets.push(preset)
  writeUserPresets(presets)
  return preset
}

// Delete a user preset (the built-in default can't be removed). If it was the
// active preset, fall back to the default.
export function deletePreset(id) {
  if (id === DEFAULT_PRESET_ID) return
  writeUserPresets(readUserPresets().filter((p) => p.id !== id))
  if (getActivePresetId() === id) setActivePreset(DEFAULT_PRESET_ID)
}

// Validate an uploaded preset JSON and store it as a new preset. Throws a
// friendly Error if the file isn't usable.
export function importPresetJSON(data) {
  const rows = Array.isArray(data) ? data : data && data.notes
  if (!Array.isArray(rows)) throw new Error('Expected a JSON preset with a "notes" array.')
  const hasValid = rows.some(
    (row) => row && ['push', 'pull'].some((t) => row[t] && validFreq(row[t].freq))
  )
  if (!hasValid) throw new Error('No valid note frequencies found in the file.')
  const name =
    !Array.isArray(data) && typeof data.name === 'string' && data.name.trim()
      ? data.name.trim()
      : 'Uploaded preset'
  return savePreset({ name, notes: rows })
}

// Apply whichever preset was active last time, on load.
setActivePreset(getActivePresetId())

// Bright, saturated "cut paper" color per button (1-7).
export const LANE_COLORS = [
  '#ff5d5d', // 1 - coral red
  '#ff924c', // 2 - orange
  '#ffd23f', // 3 - sunshine yellow
  '#8ac926', // 4 - leaf green
  '#2ec4b6', // 5 - teal
  '#4cc9f0', // 6 - sky blue
  '#b892ff', // 7 - grape purple
]

// How long (ms) a note is visible before it must be hit.
export const LEAD_TIME = 2200

// Extra silent runway (ms) added before the first note so the 3-2-1 countdown
// fully finishes before anything scrolls in. One note's travel time (plus a
// small breather) means the playfield is empty until "1" disappears.
export const LEAD_IN = LEAD_TIME + 200

// Horizontal position of the hit line, as a percent from the left edge.
export const HIT_LINE_PCT = 17

// Timing windows (ms) measured from the ideal hit moment.
export const PERFECT_WINDOW = 70
export const GOOD_WINDOW = 125
export const HIT_WINDOW = 185 // largest offset that still counts as a hit
export const MISS_WINDOW = 185 // after this the note is auto-missed

// Convert a note's time-until-hit into a horizontal percent position.
// delta === LEAD_TIME  -> just entering from the right edge (~100%)
// delta === 0          -> exactly on the hit line
// delta < 0            -> already swept past the hit line (moving off left)
export function noteX(delta) {
  return HIT_LINE_PCT + (delta / LEAD_TIME) * (100 - HIT_LINE_PCT)
}
