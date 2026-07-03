// Microphone pitch detection. Listens to the mic, estimates the fundamental
// frequency with a (range-limited) autocorrelation, and maps it to one of the
// accordion's button notes so a played note can count as a button press.

import { LANE_NOTES } from '../data/constants.js'
import { getAudioContext, resumeAudio } from './sound.js'

let stream = null
let source = null
let analyser = null
let buf = null

// How far off a played note may be (in cents) and still count as a button note.
export const TOLERANCE_CENTS = 60

export function isMicActive() {
  return !!analyser
}

// Ask for the mic and wire it into an analyser on the shared audio graph. Must
// be called from a user gesture (e.g. a button click).
export async function startMic() {
  if (analyser) return true
  const ctx = getAudioContext()
  if (!ctx || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('mic-unsupported')
  }
  resumeAudio()
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  })
  source = ctx.createMediaStreamSource(stream)
  analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  buf = new Float32Array(analyser.fftSize)
  source.connect(analyser) // note: NOT connected to destination — no playback
  return true
}

export function stopMic() {
  if (source) source.disconnect()
  if (stream) stream.getTracks().forEach((t) => t.stop())
  stream = source = analyser = buf = null
}

// Range-limited autocorrelation. Returns the detected frequency (Hz) or -1.
export function autoCorrelate(b, sampleRate) {
  const SIZE = b.length
  let sumSq = 0
  for (let i = 0; i < SIZE; i++) sumSq += b[i] * b[i]
  const rms = Math.sqrt(sumSq / SIZE)
  if (rms < 0.01) return -1 // too quiet to be a note

  // Only search lags for the notes we care about (~150–1200 Hz).
  const minLag = Math.max(2, Math.floor(sampleRate / 1200))
  const maxLag = Math.min(SIZE - 1, Math.floor(sampleRate / 150))
  const corr = new Float32Array(maxLag + 1)
  let bestLag = -1
  let bestCorr = 0
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0
    for (let i = 0; i < SIZE - lag; i++) sum += b[i] * b[i + lag]
    const c = sum / (SIZE - lag)
    corr[lag] = c
    if (c > bestCorr) {
      bestCorr = c
      bestLag = lag
    }
  }
  if (bestLag <= 0) return -1
  if (bestCorr / (sumSq / SIZE) < 0.5) return -1 // not tonal enough

  // Prefer the shortest-lag strong peak (the fundamental) to dodge octave-down
  // errors, then refine it with parabolic interpolation.
  let chosen = bestLag
  const thr = 0.9 * bestCorr
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (corr[lag] >= thr && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
      chosen = lag
      break
    }
  }
  const a = corr[chosen - 1]
  const b0 = corr[chosen]
  const c0 = corr[chosen + 1]
  const denom = a - 2 * b0 + c0
  const refined = denom ? chosen + (0.5 * (a - c0)) / denom : chosen
  return sampleRate / refined
}

// Find the closest button note to a frequency. Returns the note plus the signed
// cents offset (positive = the played note is sharp), or null if there are no
// notes. Does not apply the tolerance — callers decide with `cents`.
export function closestNote(freq) {
  let best = null
  let bestCents = Infinity
  for (let lane = 0; lane < LANE_NOTES.length; lane++) {
    for (const type of ['push', 'pull']) {
      const cents = 1200 * Math.log2(freq / LANE_NOTES[lane][type].freq)
      if (Math.abs(cents) < Math.abs(bestCents)) {
        bestCents = cents
        best = { lane, type }
      }
    }
  }
  if (!best) return null
  return {
    lane: best.lane,
    type: best.type,
    name: LANE_NOTES[best.lane][best.type].name,
    cents: bestCents,
  }
}

// Analyse a raw time-domain buffer. Returns null when there's no confident
// pitch, otherwise { freq, lane, type, name, cents, matched } where lane is -1
// (and matched false) when the pitch isn't close enough to a button note.
// This is the whole detection pipeline, factored out so it can be unit-tested.
export function analyzeBuffer(b, sampleRate) {
  const freq = autoCorrelate(b, sampleRate)
  if (freq <= 0) return null
  const c = closestNote(freq)
  if (!c) return { freq, lane: -1, type: null, name: null, cents: 0, matched: false }
  const matched = Math.abs(c.cents) <= TOLERANCE_CENTS
  return {
    freq,
    lane: matched ? c.lane : -1,
    type: matched ? c.type : null,
    name: c.name,
    cents: c.cents,
    matched,
  }
}

// Sample the mic once and analyse it. Returns null if the mic isn't running or
// there's no confident pitch.
export function detectNote() {
  if (!analyser) return null
  const ctx = getAudioContext()
  analyser.getFloatTimeDomainData(buf)
  return analyzeBuffer(buf, ctx.sampleRate)
}
