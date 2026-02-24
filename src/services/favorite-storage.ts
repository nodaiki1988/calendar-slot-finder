import type { Member } from '../types'

const STORAGE_KEY = 'csf_favorite_members'

export class FavoriteMemberStorage {
  async getAll(): Promise<Member[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    return (result[STORAGE_KEY] as Member[] | undefined) || []
  }

  async add(member: Member): Promise<void> {
    const favorites = await this.getAll()
    if (favorites.some((f) => f.email === member.email)) return
    favorites.push(member)
    await chrome.storage.local.set({ [STORAGE_KEY]: favorites })
  }

  async remove(email: string): Promise<void> {
    const favorites = await this.getAll()
    const filtered = favorites.filter((f) => f.email !== email)
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered })
  }
}
