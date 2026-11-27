import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import type { AddressInfo } from 'node:net'
import { createServer } from './server.ts'

type Msg = { type: string; payload: Record<string, string> }

class Client {
  ws: WebSocket
  queue: Msg[] = []
  waiters: ((m: Msg) => void)[] = []
  constructor(port: number) {
    this.ws = new WebSocket(`ws://localhost:${port}`)
    this.ws.on('message', (d) => {
      const m = JSON.parse(d.toString()) as Msg
      const w = this.waiters.shift()
      if (w) w(m)
      else this.queue.push(m)
    })
  }
  next(): Promise<Msg> {
    const m = this.queue.shift()
    if (m) return Promise.resolve(m)
    return new Promise((res) => this.waiters.push(res))
  }
  send(type: string, payload: unknown) {
    this.ws.send(JSON.stringify({ type, payload }))
  }
  raw(s: string) {
    this.ws.send(s)
  }
  close() {
    return new Promise<void>((res) => {
      this.ws.once('close', () => res())
      this.ws.close()
    })
  }
}

let server: ReturnType<typeof createServer>
let port: number

async function connect() {
  const c = new Client(port)
  const m = await c.next()
  expect(m.type).toBe('connected')
  return { c, id: m.payload.clientId }
}

async function makeRoom() {
  const a = await connect()
  a.c.send('createRoom', { playerName: 'Alice' })
  const created = await a.c.next()
  return { a, code: created.payload.roomCode, created }
}

beforeEach(async () => {
  server = createServer(0)
  await new Promise((r) => server.wss.once('listening', r))
  port = (server.wss.address() as AddressInfo).port
})

afterEach(async () => {
  await server.close()
})

describe('ws room server', () => {
  it('create and join', async () => {
    const { a, code, created } = await makeRoom()
    expect(created.type).toBe('roomCreated')
    expect(created.payload.playerId).toBe(a.id)
    expect(code).toMatch(/^[A-Z0-9]{4}$/)

    const b = await connect()
    b.c.send('joinRoom', { roomCode: code.toLowerCase(), playerName: 'Bob' })
    expect(await b.c.next()).toEqual({ type: 'roomJoined', payload: { roomCode: code, playerId: b.id } })
    expect(await a.c.next()).toEqual({ type: 'opponentJoined', payload: { opponentName: 'Bob' } })
  })

  it('room full', async () => {
    const { code } = await makeRoom()
    const b = await connect()
    b.c.send('joinRoom', { roomCode: code, playerName: 'Bob' })
    await b.c.next()
    const c = await connect()
    c.c.send('joinRoom', { roomCode: code, playerName: 'Cy' })
    expect(await c.c.next()).toEqual({ type: 'error', payload: { message: 'Room is full', code: 'ROOM_FULL' } })
  })

  it('room not found', async () => {
    const b = await connect()
    b.c.send('joinRoom', { roomCode: 'ZZZZ', playerName: 'Bob' })
    expect(await b.c.next()).toEqual({ type: 'error', payload: { message: 'Room not found', code: 'ROOM_NOT_FOUND' } })
  })

  it('leaveRoom notifies the other player and frees the room', async () => {
    const { a, code } = await makeRoom()
    const b = await connect()
    b.c.send('joinRoom', { roomCode: code, playerName: 'Bob' })
    await b.c.next()
    await a.c.next()
    b.c.send('leaveRoom', {})
    expect((await a.c.next()).type).toBe('opponentDisconnected')
    a.c.send('leaveRoom', {})
    const d = await connect()
    d.c.send('joinRoom', { roomCode: code, playerName: 'Dee' })
    expect((await d.c.next()).payload.code).toBe('ROOM_NOT_FOUND')
    expect(server.rooms.size).toBe(0)
  })

  it('disconnect notifies the other player', async () => {
    const { a, code } = await makeRoom()
    const b = await connect()
    b.c.send('joinRoom', { roomCode: code, playerName: 'Bob' })
    await b.c.next()
    await a.c.next()
    await a.c.close()
    expect(await b.c.next()).toEqual({
      type: 'opponentDisconnected',
      payload: { message: 'Your opponent has disconnected' },
    })
  })

  it('survives malformed input', async () => {
    const a = await connect()
    a.c.raw('not json')
    expect((await a.c.next()).payload.code).toBe('INVALID_MESSAGE')
    a.c.raw('42')
    expect((await a.c.next()).payload.code).toBe('INVALID_MESSAGE')
    a.c.send('bogus', {})
    expect((await a.c.next()).payload.code).toBe('UNKNOWN_TYPE')
    a.c.send('createRoom', { playerName: '' })
    expect((await a.c.next()).payload.code).toBe('INVALID_NAME')
    a.c.send('createRoom', { playerName: 'Ok' })
    expect((await a.c.next()).type).toBe('roomCreated')
  })
})
