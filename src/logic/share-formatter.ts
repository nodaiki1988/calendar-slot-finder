import type { AvailableSlot } from '../types'
import { formatDate, formatTime, groupSlotsByDate } from '../utils/format'

export function formatSlotsAsText(slots: AvailableSlot[]): string {
  const grouped = groupSlotsByDate(slots)

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
