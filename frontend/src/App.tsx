import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

function App() {
  const [playerName, setPlayerName] = useState('')
  const name = playerName.trim()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name) return
    console.log({ type: 'createRoom', payload: { playerName: name } })
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
    </main>
  )
}

export default App
