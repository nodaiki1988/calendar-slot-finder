import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CacheManager } from '../cache'

describe('CacheManager', () => {
  let cache: CacheManager

  beforeEach(() => {
    cache = new CacheManager()
    vi.useFakeTimers()
  })

  it('キャッシュに保存し取得できる', async () => {
    await cache.set('key1', { data: 'test' }, 5 * 60 * 1000)
    const result = await cache.get('key1')
    expect(result).toEqual({ data: 'test' })
  })

  it('TTL経過後はnullを返す', async () => {
    await cache.set('key1', { data: 'test' }, 1000)
    vi.advanceTimersByTime(1001)
    const result = await cache.get('key1')
    expect(result).toBeNull()
  })

  it('存在しないキーはnullを返す', async () => {
    const result = await cache.get('nonexistent')
    expect(result).toBeNull()
  })

  it('キャッシュを削除できる', async () => {
    await cache.set('key1', { data: 'test' }, 5 * 60 * 1000)
    await cache.remove('key1')
    const result = await cache.get('key1')
    expect(result).toBeNull()
  })
})
