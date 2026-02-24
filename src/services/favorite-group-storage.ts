import type { Member, FavoriteGroup } from '../types'

const STORAGE_KEY = 'csf_favorite_groups'
const LEGACY_STORAGE_KEY = 'csf_favorite_members'

export class FavoriteGroupStorage {
  async getAllGroups(): Promise<FavoriteGroup[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return (result[STORAGE_KEY] as FavoriteGroup[] | undefined) || []
  }

  async saveGroup(group: Omit<FavoriteGroup, 'id'> | FavoriteGroup): Promise<FavoriteGroup> {
    const groups = await this.getAllGroups()
    const saved: FavoriteGroup = {
      id: 'id' in group && group.id ? group.id : crypto.randomUUID(),
      name: group.name,
      members: group.members,
    }

    const idx = groups.findIndex((g) => g.id === saved.id)
    if (idx >= 0) {
      groups[idx] = saved
    } else {
      groups.push(saved)
    }

    await chrome.storage.local.set({ [STORAGE_KEY]: groups })
    return saved
  }

  async deleteGroup(id: string): Promise<void> {
    const groups = await this.getAllGroups()
    const filtered = groups.filter((g) => g.id !== id)
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered })
  }

  async addMemberToGroup(groupId: string, member: Member): Promise<void> {
    const groups = await this.getAllGroups()
    const group = groups.find((g) => g.id === groupId)
    if (!group) return
    if (group.members.some((m) => m.email === member.email)) return
    group.members.push(member)
    await chrome.storage.local.set({ [STORAGE_KEY]: groups })
  }

  async removeMemberFromGroup(groupId: string, email: string): Promise<void> {
    const groups = await this.getAllGroups()
    const group = groups.find((g) => g.id === groupId)
    if (!group) return
    group.members = group.members.filter((m) => m.email !== email)
    await chrome.storage.local.set({ [STORAGE_KEY]: groups })
  }

  async migrateFromLegacy(): Promise<void> {
    const result = await chrome.storage.local.get(LEGACY_STORAGE_KEY)
    const legacyMembers = result[LEGACY_STORAGE_KEY] as Member[] | undefined
    if (!legacyMembers || legacyMembers.length === 0) return

    await this.saveGroup({
      name: 'お気に入り',
      members: legacyMembers,
    })
    await chrome.storage.local.remove(LEGACY_STORAGE_KEY)
  }
}
