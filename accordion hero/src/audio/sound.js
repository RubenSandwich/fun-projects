// Lightweight Web Audio "toy accordion" synth. No external assets needed.

let ctx = null

function getCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
  }
  return ctx
}

// Browsers start the AudioContext suspended until a user gesture. Call this
// from a click/keydown so sound is allowed to play.
export function resumeAudio() {
  const c = getCtx()
  if (c && c.state === 'suspended') c.resume()
}

// A cheerful major-ish scale, one base note per lane.
const SCALE = [
  261.63, // C4  (A lane)
  293.66, // D4  (S lane)
  329.63, // E4  (D lane)
  349.23, // F4  (F lane)
  392.0, // G4   (G lane)
  440.0, // A4   (H lane)
  493.88, // B4  (J lane)
]

// Play a short reedy accordion note. Pull notes ring a fifth higher than push
// notes on the same button, echoing how a bisonoric accordion works.
export function playNote(lane, type) {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  let freq = SCALE[lane] ?? 440
  if (type === 'pull') freq *= 1.5 // up a perfect fifth

  const master = c.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.22, now + 0.012)
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)
  master.connect(c.destination)

  // Two slightly detuned reeds give that wheezy accordion timbre.
  for (const detune of [-6, 6]) {
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now)
    osc.detune.setValueAtTime(detune, now)
    osc.connect(master)
    osc.start(now)
    osc.stop(now + 0.4)
  }
}

// A soft paper "thunk" for missed / wrong-direction presses.
export function playMiss() {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const gain = c.createGain()
  gain.gain.setValueAtTime(0.14, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
  gain.connect(c.destination)

  const osc = c.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(150, now)
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.18)
  osc.connect(gain)
  osc.start(now)
  osc.stop(now + 0.2)
}
