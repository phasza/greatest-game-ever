// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

class FakeWebSocket {
  static OPEN = 1
  static instances: FakeWebSocket[] = []
  readyState = 0
  sent: unknown[] = []
  closed = false
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  constructor(public url: string) {
    FakeWebSocket.instances.push(this)
  }
  send(data: string) {
    this.sent.push(JSON.parse(data))
  }
  close() {
    this.closed = true
    this.readyState = 3
  }
  open() {
    this.readyState = 1
    act(() => this.onopen?.())
  }
  receive(type: string, payload: object = {}) {
    act(() => this.onmessage?.({ data: JSON.stringify({ type, payload }) }))
  }
}
const sock = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1]

beforeEach(() => {
  FakeWebSocket.instances = []
  vi.stubGlobal('WebSocket', FakeWebSocket)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const createBtn = () => screen.getByRole('button', { name: 'Create room' })
const nameInput = () => screen.getByLabelText('Player name')

describe('title screen', () => {
  it('shows a counter of the trimmed, capped name', async () => {
    render(<App />)
    expect(screen.getByTestId('name-counter').textContent).toBe('0/16')
    await userEvent.type(nameInput(), '  Ann ')
    expect(screen.getByTestId('name-counter').textContent).toBe('3/16')
    await userEvent.clear(nameInput())
    await userEvent.type(nameInput(), 'x'.repeat(30))
    expect(screen.getByTestId('name-counter').textContent).toBe('16/16')
  })

  it('disables Create room for empty or whitespace names', async () => {
    render(<App />)
    expect(createBtn()).toHaveProperty('disabled', true)
    await userEvent.type(nameInput(), '   ')
    expect(createBtn()).toHaveProperty('disabled', true)
    await userEvent.type(nameInput(), 'Ann')
    expect(createBtn()).toHaveProperty('disabled', false)
  })

  it('sends createRoom on submit and shows the real code once roomCreated arrives', async () => {
    render(<App />)
    await userEvent.type(nameInput(), 'Ann')
    await userEvent.click(createBtn())
    expect(sock().url).toBe('ws://localhost:3000')
    expect(screen.getByText(/waiting for server/)).toBeTruthy()
    sock().open()
    expect(sock().sent).toEqual([{ type: 'createRoom', payload: { playerName: 'Ann' } }])
    sock().receive('roomCreated', { roomCode: 'X7K9', playerId: 'abc' })
    expect(screen.getByText(/X7K9/)).toBeTruthy()
    expect(screen.queryByText(/waiting for server/)).toBeNull()
  })

  it('limits the room code input to 4 characters', async () => {
    render(<App />)
    await userEvent.type(screen.getByLabelText('Room code'), 'abcdef')
    expect(screen.getByLabelText('Room code')).toHaveProperty('value', 'ABCD')
  })
})

describe('how to play', () => {
  const btn = () => screen.getByRole('button', { name: 'How to play' })

  it('toggles the panel with the button and closes on Escape', async () => {
    render(<App />)
    expect(screen.queryByRole('region', { name: 'How to play' })).toBeNull()
    await userEvent.click(btn())
    expect(screen.getByRole('region', { name: 'How to play' })).toBeTruthy()
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
    await userEvent.click(btn())
    expect(screen.queryByRole('region', { name: 'How to play' })).toBeNull()
    await userEvent.click(btn())
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'How to play' })).toBeNull()
  })
})

describe('lobby', () => {
  it('shows the player name and Leave returns to the title screen', async () => {
    render(<App />)
    await userEvent.type(nameInput(), 'Ann')
    await userEvent.click(createBtn())
    expect(screen.getByRole('list', { name: 'Players' })).toHaveProperty('textContent', 'Ann Not ready')
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(screen.getByText('GLITCH DUEL')).toBeTruthy()
  })

  it('toggles ready state and resets it on leave', async () => {
    render(<App />)
    await userEvent.type(nameInput(), 'Ann')
    await userEvent.click(createBtn())
    const state = () => screen.getByTestId('ready-state').textContent
    expect(state()).toBe('Not ready')
    await userEvent.click(screen.getByRole('button', { name: 'Ready' }))
    expect(state()).toBe('Ready')
    expect(screen.queryByRole('button', { name: 'Ready' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Not ready' }))
    expect(state()).toBe('Not ready')
    await userEvent.click(screen.getByRole('button', { name: 'Ready' }))
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    await userEvent.click(createBtn())
    expect(state()).toBe('Not ready')
  })
})

describe('start match', () => {
  it('is gated on Ready and shows a starting screen with Back to lobby', async () => {
    render(<App />)
    await userEvent.type(nameInput(), 'Ann')
    await userEvent.click(createBtn())
    const start = () => screen.getByRole('button', { name: 'Start match' })
    expect(start()).toHaveProperty('disabled', true)
    await userEvent.click(screen.getByRole('button', { name: 'Ready' }))
    expect(start()).toHaveProperty('disabled', false)
    await userEvent.click(start())
    expect(screen.getByRole('heading', { name: 'Match starting…' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Back to lobby' }))
    expect(screen.getByRole('heading', { name: 'Lobby' })).toBeTruthy()
    expect(screen.getByTestId('ready-state').textContent).toBe('Ready')
  })
})

describe('join room', () => {
  it('opens the lobby showing the entered room code', async () => {
    render(<App />)
    await userEvent.type(nameInput(), 'Ann')
    await userEvent.type(screen.getByLabelText('Room code'), 'abcd')
    await userEvent.click(screen.getByRole('button', { name: 'Join room' }))
    expect(screen.getByRole('heading', { name: 'Lobby' })).toBeTruthy()
    expect(screen.getByText(/ABCD/)).toBeTruthy()
  })
})

describe('room server', () => {
  const start = async () => {
    render(<App />)
    await userEvent.type(nameInput(), 'Ann')
  }

  it('sends joinRoom and lists both players after roomJoined', async () => {
    await start()
    await userEvent.type(screen.getByLabelText('Room code'), 'x7k9')
    await userEvent.click(screen.getByRole('button', { name: 'Join room' }))
    sock().open()
    expect(sock().sent).toEqual([{ type: 'joinRoom', payload: { roomCode: 'X7K9', playerName: 'Ann' } }])
    sock().receive('roomJoined', { roomCode: 'X7K9', playerId: 'def' })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows server errors on the title screen', async () => {
    await start()
    await userEvent.type(screen.getByLabelText('Room code'), 'ZZZZ')
    await userEvent.click(screen.getByRole('button', { name: 'Join room' }))
    sock().open()
    sock().receive('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' })
    expect(screen.getByText('GLITCH DUEL')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe('Room not found')
    expect(sock().closed).toBe(true)
  })

  it('shows an error when the connection fails', async () => {
    await start()
    await userEvent.click(createBtn())
    act(() => sock().onerror?.())
    expect(screen.getByRole('alert').textContent).toMatch(/connect/)
  })

  it('shows the opponent on opponentJoined and a notice on opponentDisconnected', async () => {
    await start()
    await userEvent.click(createBtn())
    sock().open()
    sock().receive('roomCreated', { roomCode: 'X7K9', playerId: 'abc' })
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    sock().receive('opponentJoined', { opponentName: 'Bob' })
    expect(screen.getByTestId('opponent').textContent).toBe('Bob')
    sock().receive('opponentDisconnected', { message: 'Your opponent has disconnected' })
    expect(screen.queryByTestId('opponent')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Your opponent has disconnected')
  })

  it('Leave sends leaveRoom, closes the socket and returns to the title', async () => {
    await start()
    await userEvent.click(createBtn())
    sock().open()
    sock().receive('roomCreated', { roomCode: 'X7K9', playerId: 'abc' })
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(sock().sent[1]).toEqual({ type: 'leaveRoom', payload: {} })
    expect(sock().closed).toBe(true)
    expect(screen.getByText('GLITCH DUEL')).toBeTruthy()
  })
})
