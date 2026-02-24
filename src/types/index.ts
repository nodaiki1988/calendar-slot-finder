/** 利用目的 */
export type Purpose = 'meeting' | 'personal'

/** 時間スロット */
export interface TimeSlot {
  start: string // ISO 8601
  end: string   // ISO 8601
}

/** 空きスロット（表示用） */
export interface AvailableSlot extends TimeSlot {
  durationMinutes: number
}

/** 検索条件 */
export interface SearchConfig {
  dateRange: {
    start: string // YYYY-MM-DD
    end: string   // YYYY-MM-DD
  }
  daysOfWeek: number[] // 0=日, 1=月, ..., 6=土
  timeRange: {
    start: string // HH:mm
    end: string   // HH:mm
  }
  minimumDurationMinutes: number
}

/** メンバー */
export interface Member {
  email: string
  name: string
  photoUrl?: string
}

/** テンプレート */
export interface Template {
  id: string
  name: string
  members: Member[]
  calendarIds: string[]
  searchConfig: SearchConfig
  createdAt: string
}

/** 繰り返しルール */
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  count?: number
  until?: string // YYYY-MM-DD
}

/** 予定作成パラメータ */
export interface CreateEventParams {
  summary: string
  description?: string
  start: string
  end: string
  attendees: string[]
  recurrence?: RecurrenceRule
}
