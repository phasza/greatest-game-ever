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

describe('lobby', () => {
  it('shows the player name and Leave returns to the title screen', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    render(<App />)
    await userEvent.type(nameInput(), 'Ann')
    await userEvent.click(createBtn())
    expect(screen.getByRole('list', { name: 'Players' })).toHaveProperty('textContent', 'Ann')
    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(screen.getByText('GLITCH DUEL')).toBeTruthy()
  })
})
