import { useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { SONGS, withLeadIn } from './data/songs'
import StartScreen from './components/StartScreen'
import Game from './components/Game'
import ResultsScreen from './components/ResultsScreen'

// Run a screen change inside a directional View Transition. `direction` is
// 'forward' (new screen slides in from the right) or 'backward' (from the left).
// Falls back to an instant swap where the API isn't supported.
function transition(direction, update) {
  if (!document.startViewTransition) {
    update()
    return
  }
  document.documentElement.dataset.transition = direction
  document.startViewTransition(() => flushSync(update))
}

export default function App() {
  const [screen, setScreen] = useState('start') // 'start' | 'game' | 'results'
  const [songs, setSongs] = useState(SONGS) // built-in songs plus uploaded ones
  const [songIndex, setSongIndex] = useState(0)
  const [speed, setSpeed] = useState(1) // practice playback multiplier
  const [waitForNote, setWaitForNote] = useState(false) // hold on each note
  const [micEnabled, setMicEnabled] = useState(false) // play via microphone
  const [result, setResult] = useState(null)
  const [runId, setRunId] = useState(0) // bump to force a fresh Game mount

  // The run-ready song: notes/sections shifted so nothing appears until the
  // countdown ends. Stable within a run (only changes when the song changes).
  const song = useMemo(() => withLeadIn(songs[songIndex]), [songs, songIndex])

  // Append an uploaded song to the list so it can be selected and played.
  const addSong = (s) => setSongs((list) => [...list, s])

  const startGame = (index, spd = speed, wait = waitForNote, direction = 'forward') => {
    transition(direction, () => {
      setSongIndex(index)
      setSpeed(spd)
      setWaitForNote(wait)
      setRunId((n) => n + 1)
      setResult(null)
      setScreen('game')
    })
  }

  const handleFinish = (r) => {
    transition('forward', () => {
      setResult(r)
      setScreen('results')
    })
  }

  const goToMenu = () => transition('backward', () => setScreen('start'))

  return (
    <div className="app paper-grain">
      <div className="app-bg" aria-hidden="true" />

      <div className="screen-stage">
        {screen === 'start' && (
          <StartScreen
            songs={songs}
            onStart={startGame}
            onAddSong={addSong}
            micEnabled={micEnabled}
            onMicChange={setMicEnabled}
          />
        )}

        {screen === 'game' && (
          <Game
            key={runId}
            song={song}
            speed={speed}
            micEnabled={micEnabled}
            waitForNote={waitForNote}
            onFinish={handleFinish}
            onQuit={goToMenu}
          />
        )}

        {screen === 'results' && result && (
          <ResultsScreen
            song={song}
            result={result}
            speed={speed}
            onReplay={() => startGame(songIndex, speed, waitForNote, 'backward')}
            onMenu={goToMenu}
          />
        )}
      </div>
    </div>
  )
}
