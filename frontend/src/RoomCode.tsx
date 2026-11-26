import { useEffect, useRef, useState } from 'react'

export const PLACEHOLDER = 'waiting for server…'
export const COPIED_MS = 2000

export function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isPlaceholder = code === PLACEHOLDER

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }

  return (
    <p className="room-code">
      Room code: {code}{' '}
      <button type="button" onClick={copy} disabled={isPlaceholder}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </p>
  )
}
