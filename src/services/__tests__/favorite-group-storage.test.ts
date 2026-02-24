import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FavoriteGroupStorage } from '../favorite-group-storage'
import type { FavoriteGroup, Member } from '../../types'

describe('FavoriteGroupStorage', () => {
  let storage: FavoriteGroupStorage
  let store: Record<string, unknown>

  beforeEach(() => {
    store = {}
    storage = new FavoriteGroupStorage()
    vi.mocked(chrome.storage.local.get).mockImplementation((keys) =>
      Promise.resolve(
        typeof keys === 'string' ? { [keys]: store[keys] } : {}
      )
    )
    vi.mocked(chrome.storage.local.set).mockImplementation((items) => {
      Object.assign(store, items)
      return Promise.resolve()
    })
    vi.mocked(chrome.storage.local.remove).mockImplementation((keys) => {
      const keyList = Array.isArray(keys) ? keys : [keys]
      for (const k of keyList) delete store[k]
      return Promise.resolve()
    })
  })

  it('初期状態では空配列を返す', async () => {
    const groups = await storage.getAllGroups()
    expect(groups).toEqual([])
  })

  it('グループを保存して取得できる', async () => {
    const group: Omit<FavoriteGroup, 'id'> = {
      name: 'チームA',
      members: [{ email: 'a@test.com', name: 'A' }],
    }
    await storage.saveGroup(group)
    const groups = await storage.getAllGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('チームA')
    expect(groups[0].members).toHaveLength(1)
    expect(groups[0].id).toBeDefined()
  })

  it('グループを削除できる', async () => {
    await storage.saveGroup({ name: 'テスト', members: [] })
    const groups = await storage.getAllGroups()
    await storage.deleteGroup(groups[0].id)
    const after = await storage.getAllGroups()
    expect(after).toHaveLength(0)
  })

  it('グループにメンバーを追加できる', async () => {
    await storage.saveGroup({ name: 'テスト', members: [] })
    const groups = await storage.getAllGroups()
    const member: Member = { email: 'b@test.com', name: 'B' }
    await storage.addMemberToGroup(groups[0].id, member)
    const updated = await storage.getAllGroups()
    expect(updated[0].members).toHaveLength(1)
    expect(updated[0].members[0].email).toBe('b@test.com')
  })

  it('同じメンバーを二重追加しない', async () => {
    const member: Member = { email: 'a@test.com', name: 'A' }
    await storage.saveGroup({ name: 'テスト', members: [member] })
    const groups = await storage.getAllGroups()
    await storage.addMemberToGroup(groups[0].id, member)
    const updated = await storage.getAllGroups()
    expect(updated[0].members).toHaveLength(1)
  })

  it('グループからメンバーを削除できる', async () => {
    const member: Member = { email: 'a@test.com', name: 'A' }
    await storage.saveGroup({ name: 'テスト', members: [member] })
    const groups = await storage.getAllGroups()
    await storage.removeMemberFromGroup(groups[0].id, 'a@test.com')
    const updated = await storage.getAllGroups()
    expect(updated[0].members).toHaveLength(0)
  })

  it('旧お気に入りからの移行: 既存メンバーをデフォルトグループとして取り込む', async () => {
    store['csf_favorite_members'] = [
      { email: 'old@test.com', name: 'Old' },
    ]
    await storage.migrateFromLegacy()
    const groups = await storage.getAllGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('お気に入り')
    expect(groups[0].members[0].email).toBe('old@test.com')
    expect(store['csf_favorite_members']).toBeUndefined()
  })

  it('旧データがなければ移行しない', async () => {
    await storage.migrateFromLegacy()
    const groups = await storage.getAllGroups()
    expect(groups).toHaveLength(0)
  })
})
