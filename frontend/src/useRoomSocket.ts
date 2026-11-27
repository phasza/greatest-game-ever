import { useCallback, useEffect, useRef, useState } from 'react'

export type Phase = 'idle' | 'connecting' | 'lobby'

export const WS_URL: string = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000'
export const CONNECT_ERROR = 'Could not connect to the server'

export interface RoomState {
  phase: Phase
  roomCode: string | null
  playerId: string | null
  opponentName: string | null
  error: string | null
  notice: string | null
}

const initial: RoomState = {
  phase: 'idle',
  roomCode: null,
  playerId: null,
  opponentName: null,
  error: null,
  notice: null,
}

export function useRoomSocket() {
  const [state, setState] = useState<RoomState>(initial)
  const socketRef = useRef<WebSocket | null>(null)

  const close = useCallback(() => {
    const ws = socketRef.current
    socketRef.current = null
    if (ws) {
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null
      ws.close()
    }
  }, [])

  const open = useCallback(
    (message: { type: string; payload: Record<string, unknown> }, pendingCode: string | null) => {
      close()
      setState({ ...initial, phase: 'connecting', roomCode: pendingCode })
      const ws = new WebSocket(WS_URL)
      socketRef.current = ws
      const fail = (error: string) => {
        if (socketRef.current !== ws) return
        close()
        setState({ ...initial, error })
      }
      ws.onopen = () => ws.send(JSON.stringify(message))
      ws.onerror = () => fail(CONNECT_ERROR)
      ws.onclose = () => fail(CONNECT_ERROR)
      ws.onmessage = (ev) => {
        let msg: { type?: string; payload?: Record<string, unknown> }
        try {
          msg = JSON.parse(String(ev.data))
        } catch {
          return
        }
        const p = msg.payload ?? {}
        switch (msg.type) {
          case 'roomCreated':
          case 'roomJoined':
            setState((s) => ({
              ...s,
              phase: 'lobby',
              roomCode: String(p.roomCode),
              playerId: String(p.playerId),
              opponentName:
                typeof p.opponentName === 'string'
                  ? p.opponentName
                  : msg.type === 'roomJoined'
                    ? 'Opponent'
                    : null,
            }))
            break
          case 'opponentJoined':
            setState((s) => ({ ...s, opponentName: String(p.opponentName), notice: null }))
            break
          case 'opponentDisconnected':
            setState((s) => ({
              ...s,
              opponentName: null,
              notice: typeof p.message === 'string' ? p.message : 'Your opponent has disconnected',
            }))
            break
          case 'error':
            fail(typeof p.message === 'string' ? p.message : 'Server error')
            break
        }
      }
    },
    [close],
  )

  const createRoom = useCallback(
    (playerName: string) => open({ type: 'createRoom', payload: { playerName } }, null),
    [open],
  )
  const joinRoom = useCallback(
    (roomCode: string, playerName: string) =>
      open({ type: 'joinRoom', payload: { roomCode, playerName } }, roomCode),
    [open],
  )
  const leaveRoom = useCallback(() => {
    const ws = socketRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'leaveRoom', payload: {} }))
    }
    close()
    setState(initial)
  }, [close])

  useEffect(() => close, [close])

  return { ...state, createRoom, joinRoom, leaveRoom }
}
