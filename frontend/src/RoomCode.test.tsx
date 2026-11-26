// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PLACEHOLDER, RoomCode } from './RoomCode'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const mockClipboard = () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return writeText
}

describe('RoomCode', () => {
  it('disables Copy while showing the placeholder', () => {
    render(<RoomCode code={PLACEHOLDER} />)
    expect(screen.getByRole('button', { name: 'Copy' })).toHaveProperty('disabled', true)
  })

  it('copies the code and shows Copied for 2 seconds', async () => {
    vi.useFakeTimers()
    const writeText = mockClipboard()
    render(<RoomCode code="ABCD" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    })
    expect(writeText).toHaveBeenCalledWith('ABCD')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(1999)
    })
    expect(screen.queryByRole('button', { name: 'Copied' })).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
  })
})
