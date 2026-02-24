import type { AvailableSlot } from '../types'
import { formatDate, formatTime, groupSlotsByDate } from '../utils/format'

/**
 * 連続・重複するスロットを結合して1枠にまとめる
 * 例: 13:00-14:00 + 13:30-14:30 → 13:00-14:30
 */
export function mergeContiguousSlots(slots: AvailableSlot[]): AvailableSlot[] {
  if (slots.length === 0) return []

  const sorted = [...slots].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  const merged: AvailableSlot[] = [{ ...sorted[0] }]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]

    const lastEnd = new Date(last.end).getTime()
    const currentStart = new Date(current.start).getTime()
    const currentEnd = new Date(current.end).getTime()

    // 同じ日かつ隣接・重複 → 結合
    if (
      last.start.split('T')[0] === current.start.split('T')[0] &&
      currentStart <= lastEnd
    ) {
      if (currentEnd > lastEnd) {
        last.end = current.end
        last.durationMinutes =
          (currentEnd - new Date(last.start).getTime()) / 60_000
      }
    } else {
      merged.push({ ...current })
    }
  }

  return merged
}

export function formatSlotsAsText(slots: AvailableSlot[]): string {
  const merged = mergeContiguousSlots(slots)
  const grouped = groupSlotsByDate(merged)

  const lines: string[] = ['【空き時間】', '']
  for (const [, dateSlots] of grouped) {
    lines.push(`■ ${formatDate(dateSlots[0].start)}`)
    for (const slot of dateSlots) {
      lines.push(`  ${formatTime(slot.start)} - ${formatTime(slot.end)}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function formatSlotsAsMailto(
  slots: AvailableSlot[],
  recipients: string[]
): string {
  const subject = encodeURIComponent('日程調整：空き時間のご連絡')
  const body = encodeURIComponent(formatSlotsAsText(slots))
  const to = recipients.join(',')
  return `mailto:${to}?subject=${subject}&body=${body}`
}
