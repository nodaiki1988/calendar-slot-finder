import type { AvailableSlot } from '../types'

function formatTime(iso: string): string {
  const d = new Date(iso)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`
}

export function formatSlotsAsText(slots: AvailableSlot[]): string {
  const grouped = new Map<string, AvailableSlot[]>()
  for (const slot of slots) {
    const date = slot.start.split('T')[0]
    const existing = grouped.get(date) || []
    existing.push(slot)
    grouped.set(date, existing)
  }

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
