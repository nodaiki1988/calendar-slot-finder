/** FreeBusy API レスポンス */
export interface FreeBusyResponse {
  kind: string
  timeMin: string
  timeMax: string
  calendars: Record<string, {
    busy: Array<{ start: string; end: string }>
    errors?: Array<{ domain: string; reason: string }>
  }>
}

/** FreeBusy API リクエスト */
export interface FreeBusyRequest {
  timeMin: string
  timeMax: string
  timeZone?: string
  items: Array<{ id: string }>
}

/** CalendarList API レスポンス */
export interface CalendarListResponse {
  items: Array<{
    id: string
    summary: string
    description?: string
    primary?: boolean
    accessRole: string
  }>
}

/** Events API リクエスト */
export interface InsertEventRequest {
  summary: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees?: Array<{ email: string }>
  recurrence?: string[]
}

/** People API (Directory) レスポンス */
export interface DirectoryPeopleResponse {
  people: Array<{
    names?: Array<{ displayName: string }>
    emailAddresses?: Array<{ value: string }>
    photos?: Array<{ url: string }>
  }>
}
