import type { TimeSlot, AvailableSlot } from '../types'

/**
 * ISO 8601 文字列からタイムゾーンオフセット部分を抽出する
 * 例: "2026-02-24T09:00:00+09:00" -> "+09:00"
 */
function extractTimezone(isoString: string): string {
  const match = isoString.match(/([+-]\d{2}:\d{2})$/)
  if (match) return match[1]
  if (isoString.endsWith('Z')) return 'Z'
  return ''
}

/**
 * Date オブジェクトを指定タイムゾーンオフセットの ISO 文字列にフォーマットする
 * タイムゾーンオフセット文字列（例: "+09:00"）に基づいて
 * ローカル時刻表現を算出し、そのオフセット付きで返す
 */
function formatWithTimezone(date: Date, tz: string): string {
  if (tz === 'Z') {
    return date.toISOString().replace('.000Z', 'Z')
  }

  // オフセットを分に変換
  const sign = tz.startsWith('-') ? -1 : 1
  const [hours, minutes] = tz.slice(1).split(':').map(Number)
  const offsetMinutes = sign * (hours * 60 + minutes)

  // UTC 時刻にオフセットを加算してローカル時刻を得る
  const local = new Date(date.getTime() + offsetMinutes * 60_000)

  const yyyy = local.getUTCFullYear()
  const MM = String(local.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(local.getUTCDate()).padStart(2, '0')
  const hh = String(local.getUTCHours()).padStart(2, '0')
  const mm = String(local.getUTCMinutes()).padStart(2, '0')
  const ss = String(local.getUTCSeconds()).padStart(2, '0')

  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}${tz}`
}

/**
 * ISO文字列からローカル時刻の時・分を抽出する
 * "2026-02-24T09:30:00+09:00" -> { hours: 9, minutes: 30 }
 */
function getLocalTime(isoString: string): { hours: number; minutes: number } {
  // ISO文字列のTの後ろ部分から直接パースする（タイムゾーン変換不要）
  const timePart = isoString.split('T')[1]
  const [hh, mm] = timePart.split(':').map(Number)
  return { hours: hh, minutes: mm }
}

/**
 * ISO文字列からローカル日付部分 "YYYY-MM-DD" を取得する
 */
function getLocalDatePart(isoString: string): string {
  return isoString.split('T')[0]
}

/**
 * 忙しいスロットをソートしてマージする
 * 重複・隣接するスロットを1つに結合する
 */
export function mergeBusySlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length === 0) return []

  // startの時刻でソート
  const sorted = [...slots].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  const merged: TimeSlot[] = [{ ...sorted[0] }]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]

    const lastEnd = new Date(last.end).getTime()
    const currentStart = new Date(current.start).getTime()
    const currentEnd = new Date(current.end).getTime()

    if (currentStart <= lastEnd) {
      // 重複または隣接 -> マージ
      if (currentEnd > lastEnd) {
        last.end = current.end
      }
    } else {
      // 離れている -> 新しいスロットとして追加
      merged.push({ ...current })
    }
  }

  return merged
}

/**
 * 忙しい時間帯の隙間から空きスロットを算出する
 * rangeStart, rangeEnd は検索範囲のISO文字列
 */
export function findAvailableSlots(
  busySlots: TimeSlot[],
  rangeStart: string,
  rangeEnd: string
): AvailableSlot[] {
  const tz = extractTimezone(rangeStart)
  const merged = mergeBusySlots(busySlots)

  const available: AvailableSlot[] = []
  let cursor = new Date(rangeStart).getTime()
  const end = new Date(rangeEnd).getTime()

  for (const slot of merged) {
    const busyStart = new Date(slot.start).getTime()
    const busyEnd = new Date(slot.end).getTime()

    // busyが範囲外なら無視
    if (busyEnd <= cursor) continue
    if (busyStart >= end) break

    // cursorからbusyStartまでが空き
    const gapStart = cursor
    const gapEnd = Math.min(busyStart, end)

    if (gapEnd > gapStart) {
      const durationMinutes = (gapEnd - gapStart) / 60_000
      available.push({
        start: formatWithTimezone(new Date(gapStart), tz),
        end: formatWithTimezone(new Date(gapEnd), tz),
        durationMinutes,
      })
    }

    cursor = Math.max(cursor, busyEnd)
  }

  // 最後のbusyの後からrangeEndまで
  if (cursor < end) {
    const durationMinutes = (end - cursor) / 60_000
    available.push({
      start: formatWithTimezone(new Date(cursor), tz),
      end: formatWithTimezone(new Date(end), tz),
      durationMinutes,
    })
  }

  return available
}

/**
 * 指定曜日のスロットのみフィルタする
 * daysOfWeek: 0=日, 1=月, ..., 6=土
 */
export function filterByDaysOfWeek(
  slots: AvailableSlot[],
  daysOfWeek: number[]
): AvailableSlot[] {
  return slots.filter((slot) => {
    // ISO文字列からローカル日付を取得し、そこから曜日を判定
    const datePart = getLocalDatePart(slot.start)
    const [year, month, day] = datePart.split('-').map(Number)
    // UTC正午で曜日を計算（日付ずれ防止）
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    const dayOfWeek = date.getUTCDay()
    return daysOfWeek.includes(dayOfWeek)
  })
}

/**
 * 時間帯フィルタ: スロットを指定時間帯にクランプする
 * timeStart, timeEnd は "HH:mm" 形式
 * スロットが時間帯に完全に外れる場合は除外する
 */
export function filterByTimeRange(
  slots: AvailableSlot[],
  timeStart: string,
  timeEnd: string
): AvailableSlot[] {
  const [startH, startM] = timeStart.split(':').map(Number)
  const [endH, endM] = timeEnd.split(':').map(Number)
  const rangeStartMinutes = startH * 60 + startM
  const rangeEndMinutes = endH * 60 + endM

  const result: AvailableSlot[] = []

  for (const slot of slots) {
    const tz = extractTimezone(slot.start)
    const slotLocalStart = getLocalTime(slot.start)
    const slotLocalEnd = getLocalTime(slot.end)

    const slotStartMinutes = slotLocalStart.hours * 60 + slotLocalStart.minutes
    const slotEndMinutes = slotLocalEnd.hours * 60 + slotLocalEnd.minutes

    // クランプ
    const clampedStart = Math.max(slotStartMinutes, rangeStartMinutes)
    const clampedEnd = Math.min(slotEndMinutes, rangeEndMinutes)

    if (clampedStart >= clampedEnd) continue

    const durationMinutes = clampedEnd - clampedStart

    // クランプ後のISO文字列を生成
    // 元のスロットの日付部分を使って、時刻だけ差し替える
    const datePart = getLocalDatePart(slot.start)
    const newStartHH = String(Math.floor(clampedStart / 60)).padStart(2, '0')
    const newStartMM = String(clampedStart % 60).padStart(2, '0')
    const newEndHH = String(Math.floor(clampedEnd / 60)).padStart(2, '0')
    const newEndMM = String(clampedEnd % 60).padStart(2, '0')

    result.push({
      start: `${datePart}T${newStartHH}:${newStartMM}:00${tz}`,
      end: `${datePart}T${newEndHH}:${newEndMM}:00${tz}`,
      durationMinutes,
    })
  }

  return result
}

/**
 * 最低所要時間フィルタ: 指定分数未満のスロットを除外する
 */
export function filterByMinDuration(
  slots: AvailableSlot[],
  minMinutes: number
): AvailableSlot[] {
  return slots.filter((slot) => slot.durationMinutes >= minMinutes)
}

const STEP_MINUTES = 30

/**
 * 空きスロットを固定時間で分割する（30分刻みスライディングウィンドウ）
 */
export function splitIntoFixedSlots(
  slots: AvailableSlot[],
  durationMinutes: number
): AvailableSlot[] {
  const result: AvailableSlot[] = []
  const stepMs = STEP_MINUTES * 60_000
  const durationMs = durationMinutes * 60_000

  for (const slot of slots) {
    const tz = extractTimezone(slot.start)
    const slotStart = new Date(slot.start).getTime()
    const slotEnd = new Date(slot.end).getTime()

    let cursor = slotStart
    while (cursor + durationMs <= slotEnd) {
      result.push({
        start: formatWithTimezone(new Date(cursor), tz),
        end: formatWithTimezone(new Date(cursor + durationMs), tz),
        durationMinutes,
      })
      cursor += stepMs
    }
  }

  return result
}


/**
 * 終日予定（24時間以上のbusyスロット）を除外する
 */
export function filterAllDayEvents(busySlots: TimeSlot[]): TimeSlot[] {
  const DAY_MS = 24 * 60 * 60_000
  return busySlots.filter((slot) => {
    const duration = new Date(slot.end).getTime() - new Date(slot.start).getTime()
    return duration < DAY_MS
  })
}
