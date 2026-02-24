import type { AvailableSlot } from '../types'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * 日付文字列を "M/D(曜日)" 形式にフォーマットする
 * @param dateStr ISO 8601 文字列または YYYY-MM-DD 文字列
 */
export function formatDate(dateStr: string): string {
  const datePart = dateStr.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${DAY_LABELS[d.getUTCDay()]})`
}

/**
 * ISO 8601 時刻文字列を "HH:mm" 形式にフォーマットする
 */
export function formatTime(isoString: string): string {
  const timePart = isoString.split('T')[1]
  const [hh, mm] = timePart.split(':')
  return `${hh}:${mm}`
}

/**
 * スロットを日付ごとにグループ化する
 */
export function groupSlotsByDate(slots: AvailableSlot[]): Map<string, AvailableSlot[]> {
  const groups = new Map<string, AvailableSlot[]>()
  for (const slot of slots) {
    const date = slot.start.split('T')[0]
    const existing = groups.get(date) || []
    existing.push(slot)
    groups.set(date, existing)
  }
  return groups
}

/**
 * ブラウザのローカルタイムゾーンオフセットを "+HH:mm" 形式で返す
 * 例: 日本 → "+09:00", 米国東部（EST） → "-05:00"
 */
export function getLocalTimezoneOffset(): string {
  const offset = new Date().getTimezoneOffset() // 分単位、UTCからの差（日本は -540）
  const sign = offset <= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const minutes = String(abs % 60).padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}
