import type { Member, SearchConfig } from '../types'

export interface SearchHistoryEntry {
  id: string
  members: Member[]
  calendarIds: string[]
  searchConfig: SearchConfig
  timestamp: number
}

const STORAGE_KEY = 'csf_search_history'
const MAX_ENTRIES = 5

export class SearchHistoryStorage {
  async save(entry: Omit<SearchHistoryEntry, 'id' | 'timestamp'>): Promise<void> {
    const all = await this.getAll()
    const newEntry: SearchHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    const updated = [newEntry, ...all].slice(0, MAX_ENTRIES)
    await chrome.storage.local.set({ [STORAGE_KEY]: updated })
  }

  async getAll(): Promise<SearchHistoryEntry[]> {
    const data = await chrome.storage.local.get(STORAGE_KEY) as Record<string, unknown>
    const raw = data[STORAGE_KEY]
    return Array.isArray(raw) ? raw : []
  }

  async clear(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY)
  }
}
