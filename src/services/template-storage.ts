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
    return (result[STORAGE_KEY] as Template[] | undefined) || []
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
