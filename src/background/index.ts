import { getAuthToken, revokeAuthToken } from '../services/auth'
import { CalendarApiClient } from '../services/calendar-api'
import { CacheManager } from '../services/cache'
import type { MessageType, MessageResponse } from '../types/chrome-messages'

const cache = new CacheManager()
const FREEBUSY_TTL = 5 * 60 * 1000   // 5分
const LIST_TTL = 30 * 60 * 1000       // 30分

/** オブジェクトのキーをソートして決定的なJSON文字列を返す */
function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort())
}

chrome.runtime.onMessage.addListener(
  (message: MessageType, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => {
        console.error('Unhandled message handler error:', error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '不明なエラー',
        })
      })
    return true // 非同期レスポンス
  }
)

async function handleMessage(message: MessageType): Promise<MessageResponse> {
  try {
    const token = await getAuthToken()
    if (!token && message.type !== 'GET_AUTH_TOKEN') {
      return { success: false, error: '認証が必要です' }
    }

    switch (message.type) {
      case 'GET_AUTH_TOKEN':
        return token
          ? { success: true, data: { authenticated: true } }
          : { success: false, error: '認証に失敗しました' }

      case 'FETCH_FREE_BUSY': {
        const cacheKey = `freeBusy:${stableStringify(message.payload)}`
        const cached = await cache.get(cacheKey)
        if (cached) return { success: true, data: cached }

        const client = new CalendarApiClient(token!)
        const data = await client.fetchFreeBusy(message.payload)
        await cache.set(cacheKey, data, FREEBUSY_TTL)
        return { success: true, data }
      }

      case 'FETCH_CALENDAR_LIST': {
        const cacheKey = 'calendarList'
        const cached = await cache.get(cacheKey)
        if (cached) return { success: true, data: cached }

        const client = new CalendarApiClient(token!)
        const data = await client.fetchCalendarList()
        await cache.set(cacheKey, data, LIST_TTL)
        return { success: true, data }
      }

      case 'SEARCH_PEOPLE': {
        const cacheKey = `people:${message.payload.query}`
        const cached = await cache.get(cacheKey)
        if (cached) return { success: true, data: cached }

        const client = new CalendarApiClient(token!)
        const data = await client.searchPeople(message.payload.query)
        await cache.set(cacheKey, data, LIST_TTL)
        return { success: true, data }
      }

      case 'CREATE_EVENT': {
        const client = new CalendarApiClient(token!)
        const data = await client.createEvent(message.payload)
        return { success: true, data }
      }

      case 'REVOKE_AUTH_TOKEN':
        await revokeAuthToken()
        return { success: true, data: null }

      default:
        return { success: false, error: '不明なメッセージタイプ' }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    }
  }
}
