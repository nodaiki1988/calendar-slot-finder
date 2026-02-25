import { describe, it, expect } from 'vitest'
import {
  formatSlotsAsText,
  formatSlotsAsMailto,
  formatSlotsAsVoting,
  formatSlotsForSlack,
  formatSlotsForTeams,
  mergeContiguousSlots,
} from '../share-formatter'

describe('mergeContiguousSlots', () => {
  it('重複するスロットを結合する（13:00-14:00 + 13:30-14:30 → 13:00-14:30）', () => {
    const slots = [
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:30:00+09:00', end: '2026-02-24T14:30:00+09:00', durationMinutes: 60 },
    ]
    const result = mergeContiguousSlots(slots)
    expect(result).toHaveLength(1)
    expect(result[0].start).toBe('2026-02-24T13:00:00+09:00')
    expect(result[0].end).toBe('2026-02-24T14:30:00+09:00')
    expect(result[0].durationMinutes).toBe(90)
  })

  it('隣接するスロットを結合する（13:00-14:00 + 14:00-15:00 → 13:00-15:00）', () => {
    const slots = [
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T14:00:00+09:00', end: '2026-02-24T15:00:00+09:00', durationMinutes: 60 },
    ]
    const result = mergeContiguousSlots(slots)
    expect(result).toHaveLength(1)
    expect(result[0].start).toBe('2026-02-24T13:00:00+09:00')
    expect(result[0].end).toBe('2026-02-24T15:00:00+09:00')
    expect(result[0].durationMinutes).toBe(120)
  })

  it('離れたスロットは結合しない', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T14:00:00+09:00', end: '2026-02-24T15:00:00+09:00', durationMinutes: 60 },
    ]
    const result = mergeContiguousSlots(slots)
    expect(result).toHaveLength(2)
  })

  it('異なる日のスロットは結合しない', () => {
    const slots = [
      { start: '2026-02-24T17:00:00+09:00', end: '2026-02-24T18:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-25T09:00:00+09:00', end: '2026-02-25T10:00:00+09:00', durationMinutes: 60 },
    ]
    const result = mergeContiguousSlots(slots)
    expect(result).toHaveLength(2)
  })

  it('3つ以上の連続スロットを1つに結合する', () => {
    const slots = [
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:30:00+09:00', end: '2026-02-24T14:30:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T14:00:00+09:00', end: '2026-02-24T15:00:00+09:00', durationMinutes: 60 },
    ]
    const result = mergeContiguousSlots(slots)
    expect(result).toHaveLength(1)
    expect(result[0].start).toBe('2026-02-24T13:00:00+09:00')
    expect(result[0].end).toBe('2026-02-24T15:00:00+09:00')
    expect(result[0].durationMinutes).toBe(120)
  })

  it('空配列は空配列を返す', () => {
    expect(mergeContiguousSlots([])).toEqual([])
  })
})

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

  it('カスタムヘッダー文言でフォーマットする', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
    ]
    const text = formatSlotsAsText(slots, '【候補日程】')
    expect(text).toContain('【候補日程】')
    expect(text).not.toContain('【空き時間】')
  })

  it('連続スロットを結合してフォーマットする', () => {
    const slots = [
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:30:00+09:00', end: '2026-02-24T14:30:00+09:00', durationMinutes: 60 },
    ]
    const text = formatSlotsAsText(slots)
    expect(text).toContain('13:00 - 14:30')
    expect(text).not.toContain('13:30')
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

  it('カスタムヘッダー文言でmailto URLを生成する', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
    ]
    const url = formatSlotsAsMailto(slots, ['test@example.com'], '【候補日程】')
    expect(url).toContain(encodeURIComponent('【候補日程】'))
    expect(url).not.toContain(encodeURIComponent('【空き時間】'))
  })
})

describe('formatSlotsAsVoting', () => {
  it('投票用テキストを生成する（チェックボックス付き）', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-25T09:00:00+09:00', end: '2026-02-25T10:00:00+09:00', durationMinutes: 60 },
    ]
    const text = formatSlotsAsVoting(slots)
    expect(text).toContain('【日程調整】')
    expect(text).toContain('□ 2/24(火) 10:00-11:00')
    expect(text).toContain('□ 2/24(火) 13:00-14:00')
    expect(text).toContain('□ 2/25(水) 09:00-10:00')
  })

  it('連続スロットをmergeしない（個別にチェックボックスを表示）', () => {
    const slots = [
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:30:00+09:00', end: '2026-02-24T14:30:00+09:00', durationMinutes: 60 },
    ]
    const text = formatSlotsAsVoting(slots)
    expect(text).toContain('□ 2/24(火) 13:00-14:00')
    expect(text).toContain('□ 2/24(火) 13:30-14:30')
  })

  it('空配列の場合はヘッダーのみ返す', () => {
    const text = formatSlotsAsVoting([])
    expect(text).toContain('【日程調整】')
    expect(text).not.toContain('□')
  })
})

describe('formatSlotsForSlack', () => {
  it('Slack mrkdwn形式でフォーマットする', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
    ]
    const text = formatSlotsForSlack(slots)
    expect(text).toContain('*【空き時間】*')
    expect(text).toContain('*2/24(火)*')
    expect(text).toContain('• 10:00 - 11:00')
    expect(text).toContain('• 13:00 - 14:00')
  })

  it('カスタムヘッダー文言でフォーマットする', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
    ]
    const text = formatSlotsForSlack(slots, '【候補日程】')
    expect(text).toContain('*【候補日程】*')
    expect(text).not.toContain('*【空き時間】*')
  })

  it('連続スロットを結合する', () => {
    const slots = [
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:30:00+09:00', end: '2026-02-24T14:30:00+09:00', durationMinutes: 60 },
    ]
    const text = formatSlotsForSlack(slots)
    expect(text).toContain('• 13:00 - 14:30')
    expect(text).not.toContain('13:30')
  })
})

describe('formatSlotsForTeams', () => {
  it('Teams Markdown形式でフォーマットする', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
    ]
    const text = formatSlotsForTeams(slots)
    expect(text).toContain('**【空き時間】**')
    expect(text).toContain('**2/24(火)**')
    expect(text).toContain('- 10:00 - 11:00')
    expect(text).toContain('- 13:00 - 14:00')
  })

  it('カスタムヘッダー文言でフォーマットする', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
    ]
    const text = formatSlotsForTeams(slots, '【候補日程】')
    expect(text).toContain('**【候補日程】**')
    expect(text).not.toContain('**【空き時間】**')
  })

  it('連続スロットを結合する', () => {
    const slots = [
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:30:00+09:00', end: '2026-02-24T14:30:00+09:00', durationMinutes: 60 },
    ]
    const text = formatSlotsForTeams(slots)
    expect(text).toContain('- 13:00 - 14:30')
    expect(text).not.toContain('13:30')
  })
})
