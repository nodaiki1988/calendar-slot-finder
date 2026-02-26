import type { Template, Member, SearchConfig } from '../types'

const STORAGE_KEY = 'csf_templates'

interface SaveTemplateParams {
  name: string
  members: Member[]
  calendarIds: string[]
  searchConfig: SearchConfig
}

export class TemplateStorage {
  async getAll(): Promise<Template[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const raw = (result as Record<string, unknown>)[STORAGE_KEY]
    if (!Array.isArray(raw)) return []
    return raw.filter((entry): entry is Template =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as Record<string, unknown>).id === 'string' &&
      typeof (entry as Record<string, unknown>).name === 'string' &&
      Array.isArray((entry as Record<string, unknown>).members) &&
      typeof (entry as Record<string, unknown>).searchConfig === 'object'
    )
  }

  async save(params: SaveTemplateParams): Promise<Template> {
    const templates = await this.getAll()
    const template: Template = {
      id: crypto.randomUUID(),
      ...params,
      createdAt: new Date().toISOString(),
    }
    templates.push(template)
    await chrome.storage.local.set({ [STORAGE_KEY]: templates })
    return template
  }

  async remove(id: string): Promise<void> {
    const templates = await this.getAll()
    const filtered = templates.filter((t) => t.id !== id)
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered })
  }
}
