import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

function App() {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const name = playerName.trim()
  const codeValid = /^[A-Z0-9]{4,6}$/.test(roomCode)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name) return
    console.log({ type: 'createRoom', payload: { playerName: name } })
  }

  const handleJoin = (e: FormEvent) => {
    e.preventDefault()
    if (!name || !codeValid) return
    console.log({ type: 'joinRoom', payload: { roomCode, playerName: name } })
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
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
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
    </main>
  )
}

export default App
