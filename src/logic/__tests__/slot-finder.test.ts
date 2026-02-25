import { describe, it, expect } from 'vitest'
import {
  mergeBusySlots,
  findAvailableSlots,
  filterByDaysOfWeek,
  filterByTimeRange,
  filterByMinDuration,
  splitIntoFixedSlots,
  filterAllDayEvents,
  filterByHolidays,
  extractTimezone,
} from '../slot-finder'
import type { TimeSlot } from '../../types'

describe('extractTimezone', () => {
  it('標準的なオフセット "+09:00" を抽出する', () => {
    expect(extractTimezone('2026-02-24T09:00:00+09:00')).toBe('+09:00')
  })

  it('負のオフセット "-05:00" を抽出する', () => {
    expect(extractTimezone('2026-02-24T09:00:00-05:00')).toBe('-05:00')
  })

  it('小数点付き秒 ".000" ありでもオフセットを抽出する', () => {
    expect(extractTimezone('2026-02-24T09:00:00.000+09:00')).toBe('+09:00')
  })

  it('小数点付き秒 ".123456" ありでもオフセットを抽出する', () => {
    expect(extractTimezone('2026-02-24T09:00:00.123456+09:00')).toBe('+09:00')
  })

  it('"Z" 終端を正しく返す', () => {
    expect(extractTimezone('2026-02-24T00:00:00Z')).toBe('Z')
  })

  it('小数点付き秒 + "Z" 終端を正しく返す', () => {
    expect(extractTimezone('2026-02-24T00:00:00.000Z')).toBe('Z')
  })

  it('タイムゾーン情報なしは空文字を返す', () => {
    expect(extractTimezone('2026-02-24T09:00:00')).toBe('')
  })
})

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

  it('9:45開始 → 10:00にスナップ（60分MTG → 10:00-11:00のみ）', () => {
    const slots = [
      { start: '2026-02-24T09:45:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 75 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result).toEqual([
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
    ])
  })

  it('10:15開始 → 10:30にスナップ', () => {
    const slots = [
      { start: '2026-02-24T10:15:00+09:00', end: '2026-02-24T12:00:00+09:00', durationMinutes: 105 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result).toEqual([
      { start: '2026-02-24T10:30:00+09:00', end: '2026-02-24T11:30:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T11:00:00+09:00', end: '2026-02-24T12:00:00+09:00', durationMinutes: 60 },
    ])
  })

  it('10:00開始 → そのまま（境界上はスナップ不要）', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T12:00:00+09:00', durationMinutes: 120 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result[0].start).toBe('2026-02-24T10:00:00+09:00')
  })

  it('10:30開始 → そのまま', () => {
    const slots = [
      { start: '2026-02-24T10:30:00+09:00', end: '2026-02-24T12:00:00+09:00', durationMinutes: 90 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result[0].start).toBe('2026-02-24T10:30:00+09:00')
  })

  it('スナップ後にduration分の余裕がない → 空配列', () => {
    const slots = [
      { start: '2026-02-24T09:45:00+09:00', end: '2026-02-24T10:50:00+09:00', durationMinutes: 65 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result).toEqual([])
  })

  it('30分MTGで中途半端な開始時間のスナップ', () => {
    const slots = [
      { start: '2026-02-24T09:15:00+09:00', end: '2026-02-24T10:30:00+09:00', durationMinutes: 75 },
    ]
    const result = splitIntoFixedSlots(slots, 30)
    expect(result).toEqual([
      { start: '2026-02-24T09:30:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 30 },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T10:30:00+09:00', durationMinutes: 30 },
    ])
  })
})

describe('filterAllDayEvents', () => {
  it('24時間以上のbusyスロットを除外する', () => {
    const busy: TimeSlot[] = [
      { start: '2026-02-24T00:00:00+09:00', end: '2026-02-25T00:00:00+09:00' },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
    ]
    const result = filterAllDayEvents(busy)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(busy[1])
  })

  it('24時間未満のスロットはそのまま残す', () => {
    const busy: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T18:00:00+09:00' },
    ]
    const result = filterAllDayEvents(busy)
    expect(result).toHaveLength(1)
  })

  it('複数日にまたがる終日予定も除外する', () => {
    const busy: TimeSlot[] = [
      { start: '2026-02-24T00:00:00+09:00', end: '2026-02-27T00:00:00+09:00' },
      { start: '2026-02-25T14:00:00+09:00', end: '2026-02-25T15:00:00+09:00' },
    ]
    const result = filterAllDayEvents(busy)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(busy[1])
  })

  it('空配列の場合は空配列を返す', () => {
    expect(filterAllDayEvents([])).toEqual([])
  })
})

describe('filterByHolidays', () => {
  it('2026-02-11（建国記念の日）のスロットが除外される', () => {
    const slots = [
      { start: '2026-02-10T10:00:00+09:00', end: '2026-02-10T11:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-11T10:00:00+09:00', end: '2026-02-11T11:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-12T10:00:00+09:00', end: '2026-02-12T11:00:00+09:00', durationMinutes: 60 },
    ]
    const result = filterByHolidays(slots, '2026-02-09', '2026-02-13')
    expect(result).toHaveLength(2)
    expect(result[0].start).toContain('2026-02-10')
    expect(result[1].start).toContain('2026-02-12')
  })

  it('祝日がない期間はそのまま返る', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-25T10:00:00+09:00', end: '2026-02-25T11:00:00+09:00', durationMinutes: 60 },
    ]
    const result = filterByHolidays(slots, '2026-02-23', '2026-02-27')
    expect(result).toHaveLength(2)
  })

  it('空配列は空配列を返す', () => {
    const result = filterByHolidays([], '2026-02-01', '2026-02-28')
    expect(result).toEqual([])
  })
})
