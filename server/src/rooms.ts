import { MAX_NAME_LENGTH, normalizeName } from '../../frontend/src/playerName.ts'

export { MAX_NAME_LENGTH }

/** No 0/O, 1/I/L lookalikes. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 4
export const MAX_PLAYERS = 2

export type RoomErrorCode = 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'INVALID_NAME' | 'ALREADY_IN_ROOM'

export interface Player {
  id: string
  name: string
}

export interface Room {
  code: string
  players: Player[] // [host, guest?]
}

export type RoomError = { ok: false; code: RoomErrorCode; message: string }

const fail = (code: RoomErrorCode, message: string): RoomError => ({ ok: false, code, message })

export function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = normalizeName(raw)
  return name.length > 0 ? name : null
}

export function normalizeRoomCode(raw: unknown): string | null {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : null
}

export type CreateResult = { ok: true; room: Room; player: Player } | RoomError
export type JoinResult = { ok: true; room: Room; player: Player; opponent: Player } | RoomError
export type LeaveResult = { room: Room; opponent: Player | null; roomDeleted: boolean } | null

export class RoomManager {
  private rooms = new Map<string, Room>()
  private playerRoom = new Map<string, string>()

  private random: () => number

  constructor(random: () => number = Math.random) {
    this.random = random
  }

  get size(): number {
    return this.rooms.size
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code)
  }

  roomOf(playerId: string): Room | undefined {
    const code = this.playerRoom.get(playerId)
    return code ? this.rooms.get(code) : undefined
  }

  private generateCode(): string {
    for (;;) {
      let code = ''
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET[Math.floor(this.random() * ROOM_CODE_ALPHABET.length)]
      }
      if (!this.rooms.has(code)) return code
    }
  }

  createRoom(playerId: string, rawName: unknown): CreateResult {
    const name = sanitizeName(rawName)
    if (!name) return fail('INVALID_NAME', 'Player name is required')
    if (this.playerRoom.has(playerId)) return fail('ALREADY_IN_ROOM', 'Already in a room')
    const player = { id: playerId, name }
    const room: Room = { code: this.generateCode(), players: [player] }
    this.rooms.set(room.code, room)
    this.playerRoom.set(playerId, room.code)
    return { ok: true, room, player }
  }

  joinRoom(playerId: string, rawCode: unknown, rawName: unknown): JoinResult {
    const name = sanitizeName(rawName)
    if (!name) return fail('INVALID_NAME', 'Player name is required')
    if (this.playerRoom.has(playerId)) return fail('ALREADY_IN_ROOM', 'Already in a room')
    const code = normalizeRoomCode(rawCode)
    const room = code ? this.rooms.get(code) : undefined
    if (!room) return fail('ROOM_NOT_FOUND', 'Room not found')
    if (room.players.length >= MAX_PLAYERS) return fail('ROOM_FULL', 'Room is full')
    const player = { id: playerId, name }
    const opponent = room.players[0]
    room.players.push(player)
    this.playerRoom.set(playerId, room.code)
    return { ok: true, room, player, opponent }
  }

  /** Remove a player (leave or disconnect). Deletes the room when empty. */
  leave(playerId: string): LeaveResult {
    const room = this.roomOf(playerId)
    if (!room) return null
    this.playerRoom.delete(playerId)
    room.players = room.players.filter((p) => p.id !== playerId)
    const opponent = room.players[0] ?? null
    const roomDeleted = room.players.length === 0
    if (roomDeleted) this.rooms.delete(room.code)
    return { room, opponent, roomDeleted }
  }
}
