import { useMemo, useState } from 'react'
import { SONGS, withLeadIn } from './data/songs'
import StartScreen from './components/StartScreen'
import Game from './components/Game'
import ResultsScreen from './components/ResultsScreen'

export default function App() {
  const [screen, setScreen] = useState('start') // 'start' | 'game' | 'results'
  const [songIndex, setSongIndex] = useState(0)
  const [speed, setSpeed] = useState(1) // practice playback multiplier
  const [waitForNote, setWaitForNote] = useState(false) // hold on each note
  const [micEnabled, setMicEnabled] = useState(false) // play via microphone
  const [result, setResult] = useState(null)
  const [runId, setRunId] = useState(0) // bump to force a fresh Game mount

  // The run-ready song: notes/sections shifted so nothing appears until the
  // countdown ends. Stable within a run (only changes when the song changes).
  const song = useMemo(() => withLeadIn(SONGS[songIndex]), [songIndex])

  const startGame = (index, spd = speed, wait = waitForNote) => {
    setSongIndex(index)
    setSpeed(spd)
    setWaitForNote(wait)
    setRunId((n) => n + 1)
    setResult(null)
    setScreen('game')
  }

  const handleFinish = (r) => {
    setResult(r)
    setScreen('results')
  }

  return (
    <div className="app paper-grain">
      <div className="app-bg" aria-hidden="true" />

      {screen === 'start' && (
        <StartScreen
          songs={SONGS}
          onStart={startGame}
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
          onQuit={() => setScreen('start')}
        />
      )}

      {screen === 'results' && result && (
        <ResultsScreen
          song={song}
          result={result}
          speed={speed}
          onReplay={() => startGame(songIndex, speed)}
          onMenu={() => setScreen('start')}
        />
      )}
    </div>
  )
}
