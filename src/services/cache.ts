interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export class CacheManager {
  private store = new Map<string, CacheEntry<unknown>>()

  async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    })
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.data as T
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
  }
}
