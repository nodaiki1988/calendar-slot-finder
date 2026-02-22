import { describe, it, expect } from 'vitest'
import { formatSlotsAsText, formatSlotsAsMailto } from '../share-formatter'

describe('formatSlotsAsText', () => {
  it('空きスロットをテキスト形式でフォーマットする', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
    ]
    const text = formatSlotsAsText(slots)
    expect(text).toContain('2/24')
    expect(text).toContain('10:00')
    expect(text).toContain('11:00')
  })
})

describe('formatSlotsAsMailto', () => {
  it('mailto URLを生成する', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
    ]
    const url = formatSlotsAsMailto(slots, ['test@example.com'])
    expect(url).toContain('mailto:test@example.com')
    expect(url).toContain('subject=')
  })
})
