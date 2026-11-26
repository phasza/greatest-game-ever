import { describe, expect, it } from 'vitest'
import { MAX_NAME_LENGTH, normalizeName } from './playerName'

describe('normalizeName', () => {
  it('caps long names at the maximum length', () => {
    expect(normalizeName('x'.repeat(200))).toHaveLength(MAX_NAME_LENGTH)
  })
  it('trims whitespace', () => {
    expect(normalizeName('  bob  ')).toBe('bob')
  })
  it('does not leave trailing space after cutting', () => {
    expect(normalizeName('a'.repeat(15) + ' bbb')).toBe('a'.repeat(15))
  })
})
