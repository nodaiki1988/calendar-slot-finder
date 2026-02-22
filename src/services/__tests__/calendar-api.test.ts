import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CalendarApiClient } from '../calendar-api'

describe('CalendarApiClient', () => {
  let client: CalendarApiClient

  beforeEach(() => {
    client = new CalendarApiClient('test-token')
    vi.clearAllMocks()
  })

  it('fetchFreeBusy は忙しい時間を返す', async () => {
    const mockResponse = {
      calendars: {
        'user@example.com': {
          busy: [
            { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
          ],
        },
      },
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await client.fetchFreeBusy({
      timeMin: '2026-02-24T09:00:00+09:00',
      timeMax: '2026-02-24T18:00:00+09:00',
      items: [{ id: 'user@example.com' }],
    })

    expect(result.calendars['user@example.com'].busy).toHaveLength(1)
    expect(fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/freeBusy',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('fetchCalendarList はカレンダー一覧を返す', async () => {
    const mockResponse = {
      items: [{ id: 'primary', summary: 'My Calendar', accessRole: 'owner' }],
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await client.fetchCalendarList()
    expect(result.items).toHaveLength(1)
  })

  it('createEvent は予定を作成する', async () => {
    const mockResponse = { id: 'event-123', status: 'confirmed' }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await client.createEvent({
      summary: 'テスト会議',
      start: { dateTime: '2026-02-24T10:00:00+09:00', timeZone: 'Asia/Tokyo' },
      end: { dateTime: '2026-02-24T11:00:00+09:00', timeZone: 'Asia/Tokyo' },
    })

    expect(result.id).toBe('event-123')
  })

  it('APIエラー時に例外をスローする', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: { message: 'Forbidden' } }),
    })

    await expect(
      client.fetchCalendarList()
    ).rejects.toThrow('Forbidden')
  })
})
