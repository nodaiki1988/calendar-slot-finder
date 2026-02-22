import type { FreeBusyRequest, InsertEventRequest } from './api'

export type MessageType =
  | { type: 'GET_AUTH_TOKEN' }
  | { type: 'REVOKE_AUTH_TOKEN' }
  | { type: 'FETCH_FREE_BUSY'; payload: FreeBusyRequest }
  | { type: 'FETCH_CALENDAR_LIST' }
  | { type: 'SEARCH_PEOPLE'; payload: { query: string } }
  | { type: 'CREATE_EVENT'; payload: InsertEventRequest }

export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }
