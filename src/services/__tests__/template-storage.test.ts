import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TemplateStorage } from '../template-storage'

describe('TemplateStorage', () => {
  let storage: TemplateStorage
  let store: Record<string, unknown>

  beforeEach(() => {
    store = {}
    storage = new TemplateStorage()
    vi.mocked(chrome.storage.local.get).mockImplementation((keys) =>
      Promise.resolve(
        typeof keys === 'string' ? { [keys]: store[keys] } : {}
      )
    )
    vi.mocked(chrome.storage.local.set).mockImplementation((items) => {
      Object.assign(store, items)
      return Promise.resolve()
    })
  })

  it('テンプレートを保存し読み込める', async () => {
    const template = {
      name: 'テスト',
      members: [{ email: 'a@test.com', name: 'A' }],
      calendarIds: [],
      searchConfig: {
        dateRange: { start: '2026-02-23', end: '2026-02-28' },
        daysOfWeek: [1, 2, 3, 4, 5],
        timeRange: { start: '09:00', end: '18:00' },
        minimumDurationMinutes: 30,
      },
    }

    await storage.save(template)
    const all = await storage.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('テスト')
  })

  it('テンプレートを削除できる', async () => {
    const template = {
      name: '削除テスト',
      members: [],
      calendarIds: [],
      searchConfig: {
        dateRange: { start: '2026-02-23', end: '2026-02-28' },
        daysOfWeek: [1, 2, 3, 4, 5],
        timeRange: { start: '09:00', end: '18:00' },
        minimumDurationMinutes: 30,
      },
    }

    const saved = await storage.save(template)
    await storage.remove(saved.id)
    const all = await storage.getAll()
    expect(all).toHaveLength(0)
  })
})
