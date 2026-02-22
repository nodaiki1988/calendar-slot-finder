import type {
  FreeBusyRequest,
  FreeBusyResponse,
  CalendarListResponse,
  InsertEventRequest,
  DirectoryPeopleResponse,
} from '../types/api'

const BASE_URL = 'https://www.googleapis.com'

export class CalendarApiClient {
  constructor(private token: string) {}

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || `API error: ${response.status}`)
    }

    return data as T
  }

  async fetchFreeBusy(params: FreeBusyRequest): Promise<FreeBusyResponse> {
    return this.request<FreeBusyResponse>(
      `${BASE_URL}/calendar/v3/freeBusy`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    )
  }

  async fetchCalendarList(): Promise<CalendarListResponse> {
    return this.request<CalendarListResponse>(
      `${BASE_URL}/calendar/v3/users/me/calendarList`
    )
  }

  async createEvent(params: InsertEventRequest): Promise<{ id: string; status: string }> {
    return this.request(
      `${BASE_URL}/calendar/v3/calendars/primary/events`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    )
  }

  async searchPeople(query: string): Promise<DirectoryPeopleResponse> {
    const encoded = encodeURIComponent(query)
    return this.request<DirectoryPeopleResponse>(
      `${BASE_URL}/people/v1/people:searchDirectoryPeople?query=${encoded}&readMask=names,emailAddresses,photos&sources=DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE`
    )
  }
}
