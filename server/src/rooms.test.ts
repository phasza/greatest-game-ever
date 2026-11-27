import { describe, expect, it } from 'vitest'
import { MAX_NAME_LENGTH, ROOM_CODE_ALPHABET, RoomManager } from './rooms.ts'

describe('RoomManager', () => {
  it('creates rooms with 4-char unambiguous codes', () => {
    const m = new RoomManager()
    for (let i = 0; i < 200; i++) {
      const r = m.createRoom(`p${i}`, 'Alice')
      if (!r.ok) throw new Error('fail')
      expect(r.room.code).toMatch(new RegExp(`^[${ROOM_CODE_ALPHABET}]{4}$`))
    }
    expect(m.size).toBeGreaterThan(0)
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[01OIL]/)
  })

  it('keeps codes unique among live rooms (retries on collision)', () => {
    const seq = [0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5]
    let i = 0
    const m = new RoomManager(() => seq[i++])
    const a = m.createRoom('a', 'A')
    const b = m.createRoom('b', 'B')
    if (!a.ok || !b.ok) throw new Error('fail')
    expect(a.room.code).toBe('AAAA')
    expect(b.room.code).not.toBe('AAAA')
  })

  it('normalises names and rejects empty ones', () => {
    const m = new RoomManager()
    const r = m.createRoom('a', `  ${'x'.repeat(40)}  `)
    if (!r.ok) throw new Error('fail')
    expect(r.player.name).toBe('x'.repeat(MAX_NAME_LENGTH))
    expect(m.createRoom('b', '   ')).toMatchObject({ ok: false, code: 'INVALID_NAME' })
    expect(m.createRoom('c', 5)).toMatchObject({ ok: false, code: 'INVALID_NAME' })
  })

  it('joins case-insensitively, reports opponent', () => {
    const m = new RoomManager()
    const c = m.createRoom('a', 'Alice')
    if (!c.ok) throw new Error('fail')
    const j = m.joinRoom('b', ` ${c.room.code.toLowerCase()} `, 'Bob')
    expect(j).toMatchObject({ ok: true, opponent: { id: 'a', name: 'Alice' } })
  })

  it('errors: not found, full, already in room, bad name', () => {
    const m = new RoomManager()
    const c = m.createRoom('a', 'Alice')
    if (!c.ok) throw new Error('fail')
    expect(m.joinRoom('b', 'ZZZZ', 'Bob')).toMatchObject({ ok: false, code: 'ROOM_NOT_FOUND' })
    expect(m.joinRoom('b', undefined, 'Bob')).toMatchObject({ ok: false, code: 'ROOM_NOT_FOUND' })
    expect(m.joinRoom('b', c.room.code, '')).toMatchObject({ ok: false, code: 'INVALID_NAME' })
    expect(m.joinRoom('b', c.room.code, 'Bob').ok).toBe(true)
    expect(m.joinRoom('c', c.room.code, 'Cy')).toMatchObject({ ok: false, code: 'ROOM_FULL' })
    expect(m.joinRoom('a', c.room.code, 'Al')).toMatchObject({ ok: false, code: 'ALREADY_IN_ROOM' })
  })

  it('leave returns opponent and deletes empty rooms', () => {
    const m = new RoomManager()
    const c = m.createRoom('a', 'Alice')
    if (!c.ok) throw new Error('fail')
    m.joinRoom('b', c.room.code, 'Bob')
    expect(m.leave('a')).toMatchObject({ opponent: { id: 'b' }, roomDeleted: false })
    expect(m.leave('a')).toBeNull()
    expect(m.leave('b')).toMatchObject({ opponent: null, roomDeleted: true })
    expect(m.size).toBe(0)
    expect(m.joinRoom('x', c.room.code, 'X')).toMatchObject({ code: 'ROOM_NOT_FOUND' })
  })
})
