import { describe, it, expect } from 'vitest'
import { findAvailableSlots, filterByDaysOfWeek, filterByTimeRange, filterByMinDuration } from '../slot-finder'
import type { TimeSlot } from '../../types'

describe('空き時間検索: 統合シナリオ', () => {
  it('3人のカレンダーから平日9-18時の30分以上の空き時間を見つける', () => {
    const personA: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00' },
      { start: '2026-02-24T14:00:00+09:00', end: '2026-02-24T15:00:00+09:00' },
    ]
    const personB: TimeSlot[] = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:30:00+09:00' },
      { start: '2026-02-24T16:00:00+09:00', end: '2026-02-24T17:00:00+09:00' },
    ]
    const personC: TimeSlot[] = [
      { start: '2026-02-24T09:30:00+09:00', end: '2026-02-24T10:30:00+09:00' },
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00' },
    ]

    const allBusy = [...personA, ...personB, ...personC]

    let slots = findAvailableSlots(
      allBusy,
      '2026-02-24T09:00:00+09:00',
      '2026-02-24T18:00:00+09:00'
    )

    slots = filterByDaysOfWeek(slots, [1, 2, 3, 4, 5])
    slots = filterByTimeRange(slots, '09:00', '18:00')
    slots = filterByMinDuration(slots, 30)

    // 3人の忙しい時間をマージすると:
    // 09:00-11:30, 13:00-15:00, 16:00-17:00
    // 空き時間: 11:30-13:00 (90min), 15:00-16:00 (60min), 17:00-18:00 (60min)
    expect(slots.length).toBeGreaterThan(0)
    for (const slot of slots) {
      expect(slot.durationMinutes).toBeGreaterThanOrEqual(30)
    }
  })

  it('週末を除外してフィルタリングする', () => {
    const busy: TimeSlot[] = []

    let slots = findAvailableSlots(
      busy,
      '2026-02-22T09:00:00+09:00',  // 日曜
      '2026-02-22T18:00:00+09:00'
    )

    slots = filterByDaysOfWeek(slots, [1, 2, 3, 4, 5]) // 平日のみ
    expect(slots).toHaveLength(0) // 日曜なので除外される
  })

  it('短すぎるスロットを除外する', () => {
    const busy: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T09:50:00+09:00' },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T18:00:00+09:00' },
    ]

    let slots = findAvailableSlots(
      busy,
      '2026-02-24T09:00:00+09:00',
      '2026-02-24T18:00:00+09:00'
    )

    slots = filterByMinDuration(slots, 30)
    // 09:50-10:00 = 10分 → 除外
    expect(slots.every(s => s.durationMinutes >= 30)).toBe(true)
  })
})
