import { useEffect, useRef, useState } from 'react'
import {
  KEY_CODES,
  HIT_WINDOW,
  PERFECT_WINDOW,
  GOOD_WINDOW,
  MISS_WINDOW,
  noteX,
} from '../data/constants'
import { playNote, playMiss, resumeAudio } from '../audio/sound'

const COUNTDOWN_MS = 3000 // "3, 2, 1" before the song starts
const END_BUFFER = 1800 // grace time after the last note before results

const POINTS = { perfect: 100, good: 60, ok: 30 }

// Owns the whole run: the animation loop, keyboard input, scoring and phases.
// `speed` is a playback multiplier (1 = full speed, 0.5 = half-speed practice);
// it slows the game clock so both the note motion and the gaps stretch out.
export function useGameEngine(song, speed, onFinish) {
  // `elapsed` is milliseconds relative to song start. It is negative during the
  // countdown and drives every re-render (once per animation frame).
  const [elapsed, setElapsed] = useState(-COUNTDOWN_MS)

  const startRef = useRef(0)
  const hiddenAtRef = useRef(0)
  const rafRef = useRef(0)
  const countdownRef = useRef(Math.ceil(COUNTDOWN_MS / 1000))
  const notesRef = useRef([])
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const countsRef = useRef({ perfect: 0, good: 0, ok: 0, miss: 0 })
  const feedbackRef = useRef(null)
  const feedbackIdRef = useRef(0)
  const activeKeysRef = useRef({}) // lane index -> 'push' | 'pull' while held
  const shiftRef = useRef(false)
  const finishedRef = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    // Fresh state for this run.
    notesRef.current = song.notes.map((n) => ({
      ...n,
      state: 'active', // 'active' | 'hit' | 'miss'
      rating: null, // 'perfect' | 'good' | 'ok' | 'miss'
      judgeElapsed: 0,
      judgeX: 0,
    }))
    scoreRef.current = 0
    comboRef.current = 0
    maxComboRef.current = 0
    countsRef.current = { perfect: 0, good: 0, ok: 0, miss: 0 }
    feedbackRef.current = null
    activeKeysRef.current = {}
    shiftRef.current = false
    finishedRef.current = false
    startRef.current = performance.now() + COUNTDOWN_MS
    hiddenAtRef.current = 0
    setElapsed(-COUNTDOWN_MS)

    const setFeedback = (text, rating) => {
      feedbackIdRef.current += 1
      feedbackRef.current = { text, rating, id: feedbackIdRef.current }
    }

    // Real elapsed time is scaled by `speed` to get the game clock, so a lower
    // speed slows note motion and spacing together.
    const gameTime = () => (performance.now() - startRef.current) * speed

    const judge = (note, now, rating) => {
      note.state = rating === 'miss' ? 'miss' : 'hit'
      note.rating = rating
      note.judgeElapsed = now
      note.judgeX = noteX(note.time - now)
    }

    const registerPress = (lane, wantPull) => {
      const now = gameTime()

      // Find the closest still-active note in this lane.
      let best = null
      let bestDelta = Infinity
      for (const n of notesRef.current) {
        if (n.lane !== lane || n.state !== 'active') continue
        const d = Math.abs(n.time - now)
        if (d < bestDelta) {
          bestDelta = d
          best = n
        }
      }

      // Nothing in range: treat as a harmless "just playing around" press.
      if (!best || bestDelta > HIT_WINDOW) return

      const wantType = wantPull ? 'pull' : 'push'
      if (best.type !== wantType) {
        // Right button, wrong bellows direction.
        judge(best, now, 'miss')
        comboRef.current = 0
        countsRef.current.miss += 1
        setFeedback('Wrong Way!', 'miss')
        playMiss()
        return
      }

      let rating = 'ok'
      if (bestDelta <= PERFECT_WINDOW) rating = 'perfect'
      else if (bestDelta <= GOOD_WINDOW) rating = 'good'

      judge(best, now, rating)
      comboRef.current += 1
      maxComboRef.current = Math.max(maxComboRef.current, comboRef.current)
      const comboBonus = Math.floor(comboRef.current / 10) * 5
      scoreRef.current += POINTS[rating] + comboBonus
      countsRef.current[rating] += 1
      setFeedback(rating.toUpperCase() + '!', rating)
    }

    const onKeyDown = (e) => {
      if (e.key === 'Shift') {
        shiftRef.current = true
        return
      }
      if (e.repeat) return
      const lane = KEY_CODES[e.code]
      if (lane === undefined) return
      e.preventDefault()
      resumeAudio()
      const pull = e.shiftKey
      activeKeysRef.current[lane] = pull ? 'pull' : 'push'
      playNote(lane, pull ? 'pull' : 'push')
      registerPress(lane, pull)
    }

    const onKeyUp = (e) => {
      if (e.key === 'Shift') {
        shiftRef.current = false
        return
      }
      const lane = KEY_CODES[e.code]
      if (lane === undefined) return
      delete activeKeysRef.current[lane]
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // Pause the game clock while the tab is hidden so alt-tabbing (or a
    // throttled background tab) doesn't dump a wall of "miss" notes at once.
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = performance.now()
      } else if (hiddenAtRef.current) {
        startRef.current += performance.now() - hiddenAtRef.current
        hiddenAtRef.current = 0
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const loop = () => {
      const now = gameTime()

      // Real-time 3-2-1 countdown (unaffected by playback speed).
      const realRemaining = startRef.current - performance.now()
      countdownRef.current = realRemaining > 0 ? Math.ceil(realRemaining / 1000) : 0

      // Auto-miss notes that swept past the hit line untouched.
      for (const n of notesRef.current) {
        if (n.state === 'active' && now > n.time + MISS_WINDOW) {
          judge(n, now, 'miss')
          comboRef.current = 0
          countsRef.current.miss += 1
          setFeedback('Miss', 'miss')
        }
      }

      setElapsed(now)

      if (!finishedRef.current && now > song.duration + END_BUFFER) {
        finishedRef.current = true
        const total = song.notes.length
        const c = countsRef.current
        const hits = c.perfect + c.good + c.ok
        onFinishRef.current?.({
          score: scoreRef.current,
          maxCombo: maxComboRef.current,
          counts: { ...c },
          total,
          accuracy: total ? Math.round((hits / total) * 100) : 0,
        })
        return // stop the loop
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [song, speed])

  return {
    elapsed,
    countdown: countdownRef.current,
    notes: notesRef.current,
    score: scoreRef.current,
    combo: comboRef.current,
    maxCombo: maxComboRef.current,
    counts: countsRef.current,
    feedback: feedbackRef.current,
    activeKeys: activeKeysRef.current,
    shiftHeld: shiftRef.current,
  }
}
