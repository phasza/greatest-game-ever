import { randomUUID } from 'node:crypto'
import { WebSocketServer, WebSocket } from 'ws'
import { RoomManager } from './rooms.ts'

export function createServer(port: number) {
  const rooms = new RoomManager()
  const sockets = new Map<string, WebSocket>()
  const wss = new WebSocketServer({ port })

  const sendTo = (id: string, type: string, payload: unknown) => {
    const ws = sockets.get(id)
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, payload }))
  }

  const leave = (id: string) => {
    const res = rooms.leave(id)
    if (res?.opponent) {
      sendTo(res.opponent.id, 'opponentDisconnected', { message: 'Your opponent has disconnected' })
    }
  }

  wss.on('connection', (ws) => {
    const id = randomUUID()
    sockets.set(id, ws)
    const send = (type: string, payload: unknown) => sendTo(id, type, payload)
    const error = (code: string, message: string) => send('error', { message, code })

    send('connected', { clientId: id })

    ws.on('message', (data) => {
      let msg: unknown
      try {
        msg = JSON.parse(data.toString())
      } catch {
        return error('INVALID_MESSAGE', 'Malformed JSON')
      }
      if (typeof msg !== 'object' || msg === null || typeof (msg as { type?: unknown }).type !== 'string') {
        return error('INVALID_MESSAGE', 'Message must have a string type')
      }
      const { type, payload } = msg as { type: string; payload?: unknown }
      const p = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<string, unknown>

      switch (type) {
        case 'createRoom': {
          const r = rooms.createRoom(id, p.playerName)
          if (!r.ok) return error(r.code, r.message)
          return send('roomCreated', { roomCode: r.room.code, playerId: id })
        }
        case 'joinRoom': {
          const r = rooms.joinRoom(id, p.roomCode, p.playerName)
          if (!r.ok) return error(r.code, r.message)
          send('roomJoined', { roomCode: r.room.code, playerId: id })
          return sendTo(r.opponent.id, 'opponentJoined', { opponentName: r.player.name })
        }
        case 'leaveRoom':
          return leave(id)
        default:
          return error('UNKNOWN_TYPE', `Unknown message type: ${type}`)
      }
    })

    ws.on('close', () => {
      leave(id)
      sockets.delete(id)
    })
    ws.on('error', () => ws.terminate())
  })

  return {
    wss,
    rooms,
    close: () =>
      new Promise<void>((res) => {
        for (const ws of wss.clients) ws.terminate()
        wss.close(() => res())
      }),
  }
}
