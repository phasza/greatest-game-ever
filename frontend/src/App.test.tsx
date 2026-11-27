// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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

  it('logs the createRoom message on submit', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    render(<App />)
    await userEvent.type(nameInput(), 'Ann')
    await userEvent.click(createBtn())
    expect(log).toHaveBeenCalledWith({ type: 'createRoom', payload: { playerName: 'Ann' } })
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
    vi.spyOn(console, 'log').mockImplementation(() => {})
    render(<App />)
    await userEvent.type(nameInput(), 'Ann')
    await userEvent.click(createBtn())
    expect(screen.getByRole('list', { name: 'Players' })).toHaveProperty('textContent', 'Ann Not ready')
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(screen.getByText('GLITCH DUEL')).toBeTruthy()
  })

  it('toggles ready state and resets it on leave', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
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
    vi.spyOn(console, 'log').mockImplementation(() => {})
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
    vi.spyOn(console, 'log').mockImplementation(() => {})
    render(<App />)
    await userEvent.type(nameInput(), 'Ann')
    await userEvent.type(screen.getByLabelText('Room code'), 'abcd')
    await userEvent.click(screen.getByRole('button', { name: 'Join room' }))
    expect(screen.getByRole('heading', { name: 'Lobby' })).toBeTruthy()
    expect(screen.getByText(/ABCD/)).toBeTruthy()
  })
})
