import { describe, it, expect } from 'vitest'
import {
  mergeBusySlots,
  findAvailableSlots,
  filterByDaysOfWeek,
  filterByTimeRange,
  filterByMinDuration,
  splitIntoFixedSlots,
} from '../slot-finder'
import type { TimeSlot } from '../../types'

describe('mergeBusySlots', () => {
  it('空配列の場合は空配列を返す', () => {
    expect(mergeBusySlots([])).toEqual([])
  })

  it('重複しないスロットはそのまま返す', () => {
    const slots: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00' },
      { start: '2026-02-24T11:00:00+09:00', end: '2026-02-24T12:00:00+09:00' },
    ]
    expect(mergeBusySlots(slots)).toEqual(slots)
  })

  it('重複するスロットをマージする', () => {
    const slots: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T12:00:00+09:00' },
    ]
    expect(mergeBusySlots(slots)).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T12:00:00+09:00' },
    ])
  })

  it('隣接するスロットをマージする', () => {
    const slots: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00' },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
    ]
    expect(mergeBusySlots(slots)).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
    ])
  })

  it('複数人のスロットをマージする', () => {
    const slots: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00' },
      { start: '2026-02-24T14:00:00+09:00', end: '2026-02-24T15:00:00+09:00' },
      { start: '2026-02-24T09:30:00+09:00', end: '2026-02-24T11:00:00+09:00' },
      { start: '2026-02-24T14:30:00+09:00', end: '2026-02-24T16:00:00+09:00' },
    ]
    expect(mergeBusySlots(slots)).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
      { start: '2026-02-24T14:00:00+09:00', end: '2026-02-24T16:00:00+09:00' },
    ])
  })
})

describe('findAvailableSlots', () => {
  it('忙しい時間がない場合、全範囲を返す', () => {
    const result = findAvailableSlots(
      [],
      '2026-02-24T09:00:00+09:00',
      '2026-02-24T18:00:00+09:00'
    )
    expect(result).toEqual([
      {
        start: '2026-02-24T09:00:00+09:00',
        end: '2026-02-24T18:00:00+09:00',
        durationMinutes: 540,
      },
    ])
  })

  it('忙しい時間の前後に空きスロットを返す', () => {
    const busy: TimeSlot[] = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
    ]
    const result = findAvailableSlots(
      busy,
      '2026-02-24T09:00:00+09:00',
      '2026-02-24T12:00:00+09:00'
    )
    expect(result).toEqual([
      {
        start: '2026-02-24T09:00:00+09:00',
        end: '2026-02-24T10:00:00+09:00',
        durationMinutes: 60,
      },
      {
        start: '2026-02-24T11:00:00+09:00',
        end: '2026-02-24T12:00:00+09:00',
        durationMinutes: 60,
      },
    ])
  })

  it('全範囲が忙しい場合、空配列を返す', () => {
    const busy: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T18:00:00+09:00' },
    ]
    const result = findAvailableSlots(
      busy,
      '2026-02-24T09:00:00+09:00',
      '2026-02-24T18:00:00+09:00'
    )
    expect(result).toEqual([])
  })
})

describe('filterByDaysOfWeek', () => {
  it('指定曜日のスロットのみ返す', () => {
    const slots = [
      { start: '2026-02-23T10:00:00+09:00', end: '2026-02-23T11:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-25T10:00:00+09:00', end: '2026-02-25T11:00:00+09:00', durationMinutes: 60 },
    ]
    const result = filterByDaysOfWeek(slots, [1, 3])
    expect(result).toHaveLength(2)
  })
})

describe('filterByTimeRange', () => {
  it('指定時間帯内のスロットに切り詰める', () => {
    const slots = [
      { start: '2026-02-24T08:00:00+09:00', end: '2026-02-24T12:00:00+09:00', durationMinutes: 240 },
    ]
    const result = filterByTimeRange(slots, '09:00', '11:00')
    expect(result).toHaveLength(1)
    expect(result[0].durationMinutes).toBe(120)
  })

  it('時間帯外のスロットは除外する', () => {
    const slots = [
      { start: '2026-02-24T06:00:00+09:00', end: '2026-02-24T08:00:00+09:00', durationMinutes: 120 },
    ]
    const result = filterByTimeRange(slots, '09:00', '18:00')
    expect(result).toEqual([])
  })
})

describe('filterByMinDuration', () => {
  it('最低時間未満のスロットを除外する', () => {
    const slots = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T09:15:00+09:00', durationMinutes: 15 },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
    ]
    const result = filterByMinDuration(slots, 30)
    expect(result).toHaveLength(1)
    expect(result[0].durationMinutes).toBe(60)
  })
})

describe('splitIntoFixedSlots', () => {
  it('空き時間を指定時間ごとに30分刻みで分割する', () => {
    const slots = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T12:00:00+09:00', durationMinutes: 180 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T09:30:00+09:00', end: '2026-02-24T10:30:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T10:30:00+09:00', end: '2026-02-24T11:30:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T11:00:00+09:00', end: '2026-02-24T12:00:00+09:00', durationMinutes: 60 },
    ])
  })

  it('空き時間が指定時間未満の場合は空配列を返す', () => {
    const slots = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T09:50:00+09:00', durationMinutes: 50 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result).toEqual([])
  })

  it('ちょうど指定時間の空きは1スロットを返す', () => {
    const slots = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 60 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 60 },
    ])
  })

  it('複数の空きスロットをそれぞれ分割する', () => {
    const slots = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:30:00+09:00', durationMinutes: 90 },
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T09:30:00+09:00', end: '2026-02-24T10:30:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
    ])
  })

  it('30分のMTG時間でも正しく分割する', () => {
    const slots = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:30:00+09:00', durationMinutes: 90 },
    ]
    const result = splitIntoFixedSlots(slots, 30)
    expect(result).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T09:30:00+09:00', durationMinutes: 30 },
      { start: '2026-02-24T09:30:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 30 },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T10:30:00+09:00', durationMinutes: 30 },
    ])
  })

  it('空配列の場合は空配列を返す', () => {
    expect(splitIntoFixedSlots([], 60)).toEqual([])
  })
})
