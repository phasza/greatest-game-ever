import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { PLACEHOLDER, RoomCode } from './RoomCode'
import { MAX_NAME_LENGTH, normalizeName } from './playerName'

function App() {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [inLobby, setInLobby] = useState(false)
  const [ready, setReady] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [lobbyCode, setLobbyCode] = useState(PLACEHOLDER)
  const name = normalizeName(playerName)
  const codeValid = /^[A-Z0-9]{4,6}$/.test(roomCode)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name) return
    console.log({ type: 'createRoom', payload: { playerName: name } })
    setLobbyCode(PLACEHOLDER)
    setInLobby(true)
  }

  useEffect(() => {
    if (!showHelp) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowHelp(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showHelp])

  if (inLobby) {
    return (
      <main className="lobby-screen">
        <h1>Lobby</h1>
        <RoomCode code={lobbyCode} />
        <h2>Players</h2>
        <ul aria-label="Players">
          <li>
            {name} <span data-testid="ready-state">{ready ? 'Ready' : 'Not ready'}</span>
          </li>
        </ul>
        <button type="button" aria-pressed={ready} onClick={() => setReady((r) => !r)}>
          {ready ? 'Not ready' : 'Ready'}
        </button>
        <button type="button" onClick={() => {
            setInLobby(false)
            setReady(false)
          }}>
          Leave
        </button>
      </main>
    )
  }

  const handleJoin = (e: FormEvent) => {
    e.preventDefault()
    if (!name || !codeValid) return
    console.log({ type: 'joinRoom', payload: { roomCode, playerName: name } })
    setLobbyCode(roomCode)
    setInLobby(true)
  }

  return (
    <main className="title-screen">
      <h1>GLITCH DUEL</h1>
      <p className="tagline">Outplay your rival while the arena glitches around you.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          aria-label="Player name"
          placeholder="Player name"
          maxLength={MAX_NAME_LENGTH}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <small className="name-counter" data-testid="name-counter">
          {name.length}/{MAX_NAME_LENGTH}
        </small>
        <button type="submit" disabled={!name}>
          Create room
        </button>
      </form>
      <form onSubmit={handleJoin}>
        <input
          type="text"
          aria-label="Room code"
          placeholder="Room code"
          minLength={4}
          maxLength={6}
          value={roomCode}
          onChange={(e) =>
            setRoomCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6))
          }
        />
        <button type="submit" disabled={!name || !codeValid}>
          Join room
        </button>
      </form>
      <button
        type="button"
        className="help-toggle"
        aria-expanded={showHelp}
        aria-controls="how-to-play"
        onClick={() => setShowHelp((v) => !v)}
      >
        How to play
      </button>
      {showHelp && (
        <section id="how-to-play" className="how-to-play" aria-label="How to play">
          <ul>
            <li>Two players face off in a duel.</li>
            <li>The arena glitches while you fight, so stay alert.</li>
            <li>Outplay your rival and dodge the chaos.</li>
            <li>The last one standing wins.</li>
          </ul>
        </section>
      )}
    </main>
  )
}

export default App
