import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, groupSlotsByDate } from '../format'
import type { AvailableSlot } from '../../types'

describe('formatDate', () => {
  it('月/日(曜日)形式にフォーマットする', () => {
    expect(formatDate('2026-02-24')).toBe('2/24(火)')
  })

  it('1桁の月日も正しくフォーマットする', () => {
    expect(formatDate('2026-01-05')).toBe('1/5(月)')
  })
})

describe('formatTime', () => {
  it('HH:mm形式にフォーマットする', () => {
    expect(formatTime('2026-02-24T09:30:00+09:00')).toBe('09:30')
  })

  it('午後の時刻も正しくフォーマットする', () => {
    expect(formatTime('2026-02-24T14:05:00+09:00')).toBe('14:05')
  })
})

describe('groupSlotsByDate', () => {
  it('スロットを日付ごとにグループ化する', () => {
    const slots: AvailableSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-25T09:00:00+09:00', end: '2026-02-25T10:00:00+09:00', durationMinutes: 60 },
    ]
    const grouped = groupSlotsByDate(slots)
    expect(grouped.size).toBe(2)
    expect(grouped.get('2026-02-24')).toHaveLength(2)
    expect(grouped.get('2026-02-25')).toHaveLength(1)
  })

  it('空配列の場合は空のMapを返す', () => {
    const grouped = groupSlotsByDate([])
    expect(grouped.size).toBe(0)
  })
})
