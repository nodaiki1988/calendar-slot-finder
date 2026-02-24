# Calendar Slot Finder v3 お気に入りグループ・UX改善 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** お気に入りグループ機能の追加、ボタン固定、終日予定除外オプションを実装する

**Architecture:** 既存の `FavoriteMemberStorage` をグループ対応の `FavoriteGroupStorage` に拡張し、MemberPicker UIをAccordionベースに再設計する。App.tsx の members ステップをスクロール可能なコンテンツ＋スティッキーフッターに変更。`slot-finder.ts` に終日予定フィルタを追加し、SearchConfigForm にチェックボックスを配置。

**Tech Stack:** React 19, MUI 7, TypeScript 5.9, Vitest, Chrome Storage API

---

### Task 1: FavoriteGroup型とexcludeAllDayEventsの型定義

**Files:**
- Modify: `src/types/index.ts`

**Step 1: 型定義を追加する**

`src/types/index.ts` に以下を追加:

```typescript
/** お気に入りグループ */
export interface FavoriteGroup {
  id: string
  name: string
  members: Member[]
}
```

`SearchConfig` に `excludeAllDayEvents` を追加:

```typescript
export interface SearchConfig {
  dateRange: {
    start: string
    end: string
  }
  daysOfWeek: number[]
  timeRange: {
    start: string
    end: string
  }
  minimumDurationMinutes: number
  excludeAllDayEvents: boolean
}
```

`MemberAvailability` インターフェースは不要なので削除する（v2で削除済みのはずだがstash popで復活した残骸）。

**Step 2: AppContextのデフォルト値と残骸を修正する**

`src/popup/context/AppContext.tsx`:
- `MemberAvailability` の import を削除
- `AppState` から `memberAvailabilities` を削除
- `Action` から `SET_MEMBER_AVAILABILITIES` を削除
- reducer の `SET_MEMBER_AVAILABILITIES` case を削除
- `initialState` から `memberAvailabilities` を削除
- `defaultSearchConfig` に `excludeAllDayEvents: true` を追加

**Step 3: 既存テストが通ることを確認する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run`
Expected: 全テストPASS（`template-storage.test.ts` の `SearchConfig` にも `excludeAllDayEvents` が必要になる場合は修正）

**Step 4: コミット**

```bash
git add src/types/index.ts src/popup/context/AppContext.tsx
git commit -m "feat: FavoriteGroup型追加、excludeAllDayEvents追加、MemberAvailability残骸削除"
```

---

### Task 2: FavoriteGroupStorageの実装（TDD）

**Files:**
- Create: `src/services/__tests__/favorite-group-storage.test.ts`
- Create: `src/services/favorite-group-storage.ts`
- Modify: `src/services/favorite-storage.ts`（移行ヘルパー追加）

**Step 1: テストを書く**

`src/services/__tests__/favorite-group-storage.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FavoriteGroupStorage } from '../favorite-group-storage'
import type { FavoriteGroup } from '../../types'
import type { Member } from '../../types'

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
    // 旧ストレージにデータがある状態をシミュレート
    store['csf_favorite_members'] = [
      { email: 'old@test.com', name: 'Old' },
    ]
    await storage.migrateFromLegacy()
    const groups = await storage.getAllGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].name).toBe('お気に入り')
    expect(groups[0].members[0].email).toBe('old@test.com')
    // 旧データが削除されること
    expect(store['csf_favorite_members']).toBeUndefined()
  })

  it('旧データがなければ移行しない', async () => {
    await storage.migrateFromLegacy()
    const groups = await storage.getAllGroups()
    expect(groups).toHaveLength(0)
  })
})
```

**Step 2: テストが失敗することを確認する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run src/services/__tests__/favorite-group-storage.test.ts`
Expected: FAIL（`favorite-group-storage` モジュールが存在しない）

**Step 3: 実装を書く**

`src/services/favorite-group-storage.ts`:

```typescript
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
```

**Step 4: テストを実行して通ることを確認する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run src/services/__tests__/favorite-group-storage.test.ts`
Expected: 全テストPASS

**Step 5: コミット**

```bash
git add src/services/favorite-group-storage.ts src/services/__tests__/favorite-group-storage.test.ts
git commit -m "feat: FavoriteGroupStorage実装（TDD）"
```

---

### Task 3: 終日予定フィルタの実装（TDD）

**Files:**
- Modify: `src/logic/__tests__/slot-finder.test.ts`
- Modify: `src/logic/slot-finder.ts`

**Step 1: テストを書く**

`src/logic/__tests__/slot-finder.test.ts` の末尾に追加:

```typescript
describe('filterAllDayEvents', () => {
  it('24時間以上のbusyスロットを除外する', () => {
    const busy: TimeSlot[] = [
      // 終日予定（24時間）
      { start: '2026-02-24T00:00:00+09:00', end: '2026-02-25T00:00:00+09:00' },
      // 通常の1時間の予定
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
    ]
    const result = filterAllDayEvents(busy)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(busy[1])
  })

  it('24時間未満のスロットはそのまま残す', () => {
    const busy: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T18:00:00+09:00' },
    ]
    const result = filterAllDayEvents(busy)
    expect(result).toHaveLength(1)
  })

  it('複数日にまたがる終日予定も除外する', () => {
    const busy: TimeSlot[] = [
      // 3日間の終日予定
      { start: '2026-02-24T00:00:00+09:00', end: '2026-02-27T00:00:00+09:00' },
      // 通常の予定
      { start: '2026-02-25T14:00:00+09:00', end: '2026-02-25T15:00:00+09:00' },
    ]
    const result = filterAllDayEvents(busy)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(busy[1])
  })

  it('空配列の場合は空配列を返す', () => {
    expect(filterAllDayEvents([])).toEqual([])
  })
})
```

**Step 2: テストが失敗することを確認する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run src/logic/__tests__/slot-finder.test.ts`
Expected: FAIL（`filterAllDayEvents` が未定義）

**Step 3: 実装を書く**

`src/logic/slot-finder.ts` に追加:

```typescript
/**
 * 終日予定（24時間以上のbusyスロット）を除外する
 */
export function filterAllDayEvents(busySlots: TimeSlot[]): TimeSlot[] {
  const DAY_MS = 24 * 60 * 60_000
  return busySlots.filter((slot) => {
    const duration = new Date(slot.end).getTime() - new Date(slot.start).getTime()
    return duration < DAY_MS
  })
}
```

import文の `filterAllDayEvents` をテストファイルのimportにも追加する。

**Step 4: テストを実行して通ることを確認する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run src/logic/__tests__/slot-finder.test.ts`
Expected: 全テストPASS

**Step 5: コミット**

```bash
git add src/logic/slot-finder.ts src/logic/__tests__/slot-finder.test.ts
git commit -m "feat: 終日予定フィルタ filterAllDayEvents 実装（TDD）"
```

---

### Task 4: SearchConfigFormに終日予定除外チェックボックスを追加

**Files:**
- Modify: `src/popup/components/SearchConfigForm.tsx`

**Step 1: チェックボックスUIを追加する**

`SearchConfigForm.tsx` の変更点:

1. importに `Checkbox`, `FormControlLabel` を追加
2. importに `filterAllDayEvents` を追加
3. MTG時間のSelectの下（`</FormControl>` の直後）にチェックボックスを追加:

```tsx
<FormControlLabel
  control={
    <Checkbox
      checked={searchConfig.excludeAllDayEvents}
      onChange={(e) =>
        dispatch({
          type: 'SET_SEARCH_CONFIG',
          payload: { ...searchConfig, excludeAllDayEvents: e.target.checked },
        })
      }
      size="small"
    />
  }
  label="終日の予定を除外する"
  sx={{ mb: 2 }}
/>
```

4. `handleSearch` 内の `allBusy` 算出の直後に終日フィルタを適用:

```typescript
let filteredBusy = allBusy
if (searchConfig.excludeAllDayEvents) {
  filteredBusy = filterAllDayEvents(allBusy)
}

let slots = findAvailableSlots(filteredBusy, startISO, endISO)
```

**Step 2: テストが通ることを確認する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run`
Expected: 全テストPASS

**Step 3: コミット**

```bash
git add src/popup/components/SearchConfigForm.tsx
git commit -m "feat: 検索画面に終日予定除外チェックボックス追加"
```

---

### Task 5: MemberPickerのお気に入りグループUI実装

**Files:**
- Modify: `src/popup/components/MemberPicker.tsx`

**Step 1: MemberPickerを書き換える**

主な変更点:
1. `FavoriteMemberStorage` → `FavoriteGroupStorage` に切り替え
2. お気に入りグループをAccordionで表示
3. グループ内メンバーをChipで表示（タップで検索対象に追加/解除）
4. 選択済みメンバーに「グループに追加」ボタン
5. 新規グループ作成ダイアログ
6. 初回アクセス時に旧データの移行を実行
7. 「次へ」ボタンは削除（Task 6でApp.tsxに移動）

```tsx
import { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import { FavoriteGroupStorage } from '../../services/favorite-group-storage'
import type { Member, FavoriteGroup } from '../../types'
import type { DirectoryPeopleResponse } from '../../types/api'

const groupStorage = new FavoriteGroupStorage()

export default function MemberPicker() {
  const { state, dispatch } = useAppContext()
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<Member[]>([])
  const [searching, setSearching] = useState(false)
  const [groups, setGroups] = useState<FavoriteGroup[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [addToGroupAnchor, setAddToGroupAnchor] = useState<null | HTMLElement>(null)
  const [addToGroupMember, setAddToGroupMember] = useState<Member | null>(null)

  useEffect(() => {
    const init = async () => {
      await groupStorage.migrateFromLegacy()
      setGroups(await groupStorage.getAllGroups())
    }
    init()
  }, [])

  const refreshGroups = async () => {
    setGroups(await groupStorage.getAllGroups())
  }

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setOptions([])
      return
    }
    setSearching(true)
    try {
      const result = await sendMessage<DirectoryPeopleResponse>({
        type: 'SEARCH_PEOPLE',
        payload: { query },
      })
      const members: Member[] = (result.people || [])
        .filter((p) => p.emailAddresses?.length)
        .map((p) => ({
          email: p.emailAddresses![0].value,
          name: p.names?.[0]?.displayName || p.emailAddresses![0].value,
          photoUrl: p.photos?.[0]?.url,
        }))
      setOptions(members)
    } catch {
      setOptions([])
    } finally {
      setSearching(false)
    }
  }

  const handleAddMember = (member: Member) => {
    if (!state.members.some((m) => m.email === member.email)) {
      dispatch({ type: 'ADD_MEMBER', payload: member })
    }
    setInputValue('')
    setOptions([])
  }

  const handleRemoveMember = (email: string) => {
    dispatch({ type: 'REMOVE_MEMBER', payload: email })
  }

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleAddManualEmail = () => {
    if (inputValue && isValidEmail(inputValue)) {
      handleAddMember({ email: inputValue, name: inputValue })
    }
  }

  const filteredOptions = options.filter(
    (o) => !state.members.some((m) => m.email === o.email)
  )

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    await groupStorage.saveGroup({ name: newGroupName.trim(), members: [] })
    await refreshGroups()
    setCreateDialogOpen(false)
    setNewGroupName('')
  }

  const handleDeleteGroup = async (groupId: string) => {
    await groupStorage.deleteGroup(groupId)
    await refreshGroups()
  }

  const handleAddToGroup = async (groupId: string) => {
    if (!addToGroupMember) return
    await groupStorage.addMemberToGroup(groupId, addToGroupMember)
    await refreshGroups()
    setAddToGroupAnchor(null)
    setAddToGroupMember(null)
  }

  const handleRemoveFromGroup = async (groupId: string, email: string) => {
    await groupStorage.removeMemberFromGroup(groupId, email)
    await refreshGroups()
  }

  const isSelected = (email: string) => state.members.some((m) => m.email === email)

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        メンバーを選択
      </Typography>

      {/* 選択済みメンバー */}
      {state.members.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {state.members.map((member) => (
            <Chip
              key={member.email}
              label={member.name}
              size="small"
              onDelete={() => handleRemoveMember(member.email)}
              deleteIcon={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      setAddToGroupMember(member)
                      setAddToGroupAnchor(e.currentTarget)
                    }}
                    sx={{ p: 0, mr: 0.3 }}
                  >
                    <GroupAddIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              }
            />
          ))}
        </Box>
      )}

      {/* グループに追加メニュー */}
      <Menu
        anchorEl={addToGroupAnchor}
        open={Boolean(addToGroupAnchor)}
        onClose={() => { setAddToGroupAnchor(null); setAddToGroupMember(null) }}
      >
        {groups.map((g) => (
          <MenuItem key={g.id} onClick={() => handleAddToGroup(g.id)}>
            {g.name}
          </MenuItem>
        ))}
        {groups.length === 0 && (
          <MenuItem disabled>グループがありません</MenuItem>
        )}
      </Menu>

      {/* お気に入りグループ */}
      {groups.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            お気に入りグループ
          </Typography>
          {groups.map((group) => (
            <Accordion key={group.id} disableGutters sx={{ '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                    {group.name}（{group.members.length}）
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id) }}
                    sx={{ p: 0.3 }}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {group.members.map((m) => (
                    <Chip
                      key={m.email}
                      label={m.name}
                      size="small"
                      color={isSelected(m.email) ? 'primary' : 'default'}
                      variant={isSelected(m.email) ? 'filled' : 'outlined'}
                      onClick={() => isSelected(m.email) ? handleRemoveMember(m.email) : handleAddMember(m)}
                      onDelete={() => handleRemoveFromGroup(group.id, m.email)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                  {group.members.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      メンバーがいません
                    </Typography>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* 新規グループ作成ボタン */}
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => setCreateDialogOpen(true)}
        sx={{ mb: 1 }}
      >
        新規グループ
      </Button>

      {/* グループ作成ダイアログ */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>グループを作成</DialogTitle>
        <DialogContent>
          <TextField
            label="グループ名"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
            作成
          </Button>
        </DialogActions>
      </Dialog>

      {/* メンバー検索 */}
      <Autocomplete
        options={filteredOptions}
        getOptionLabel={(o) => `${o.name} (${o.email})`}
        value={null}
        onChange={(_e, member) => {
          if (member) handleAddMember(member)
        }}
        inputValue={inputValue}
        onInputChange={(_e, value, reason) => {
          setInputValue(value)
          if (reason === 'input') handleSearch(value)
        }}
        loading={searching}
        renderInput={(params) => (
          <TextField
            {...params}
            label="名前またはメールアドレス"
            placeholder="検索..."
            size="small"
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {searching && <CircularProgress size={20} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
        noOptionsText={
          inputValue.length >= 2
            ? 'メールアドレスを直接入力できます'
            : '2文字以上入力してください'
        }
        sx={{ mb: 1 }}
      />

      {isValidEmail(inputValue) && (
        <Button size="small" onClick={handleAddManualEmail} sx={{ mb: 1 }}>
          「{inputValue}」を追加
        </Button>
      )}
    </Box>
  )
}
```

注意: 「次へ」ボタンはMemberPickerから削除し、Task 6でApp.tsxのスティッキーフッターとして実装する。

**Step 2: テストが通ることを確認する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run`
Expected: 全テストPASS

**Step 3: コミット**

```bash
git add src/popup/components/MemberPicker.tsx
git commit -m "feat: MemberPickerをお気に入りグループUI対応に書き換え"
```

---

### Task 6: メンバー選択画面のスティッキーフッターボタン

**Files:**
- Modify: `src/popup/App.tsx`

**Step 1: members ステップのレイアウトを変更する**

`App.tsx` の members ステップ（現在76-83行）を以下に変更:

```tsx
{state.step === 'members' && (
  <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
    <Box sx={{ flex: 1, overflowY: 'auto', pb: 1 }}>
      <MemberPicker />
      <CalendarPicker />
      <TemplateManager />
    </Box>
    <Box sx={{
      position: 'sticky',
      bottom: 0,
      bgcolor: 'background.paper',
      pt: 1,
      pb: 1,
      borderTop: '1px solid',
      borderColor: 'divider',
    }}>
      <Button
        variant="contained"
        fullWidth
        disabled={state.members.length === 0 && state.calendarIds.length === 0}
        onClick={() => dispatch({ type: 'SET_STEP', payload: 'config' })}
      >
        次へ：検索条件を設定
      </Button>
    </Box>
  </Box>
)}
```

外側の `<Box sx={{ width: 400, minHeight: 500, p: 2 }}>` に `display: 'flex'` と `flexDirection: 'column'` を追加して、フレックスレイアウトにする:

```tsx
<Box sx={{ width: 400, minHeight: 500, maxHeight: 600, p: 2, display: 'flex', flexDirection: 'column' }}>
```

ヘッダーの `<Box>` は `flexShrink: 0` にする。

**Step 2: テストが通ることを確認する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run`
Expected: 全テストPASS

**Step 3: コミット**

```bash
git add src/popup/App.tsx
git commit -m "feat: メンバー選択画面の「次へ」ボタンをスティッキーフッターに変更"
```

---

### Task 7: テンプレートのSearchConfig互換性修正

**Files:**
- Modify: `src/services/__tests__/template-storage.test.ts`（必要に応じて）
- Modify: `src/popup/context/AppContext.tsx`（LOAD_TEMPLATE で欠けているフィールドを補完）

**Step 1: LOAD_TEMPLATE アクションで `excludeAllDayEvents` のデフォルト値を保証する**

`AppContext.tsx` の `LOAD_TEMPLATE` case を修正:

```typescript
case 'LOAD_TEMPLATE':
  return {
    ...state,
    members: action.payload.members,
    calendarIds: action.payload.calendarIds,
    searchConfig: {
      ...defaultSearchConfig,
      ...action.payload.searchConfig,
    },
  }
```

これにより、旧テンプレート（`excludeAllDayEvents` がない）を読み込んでも `defaultSearchConfig` からデフォルト値（`true`）が適用される。

**Step 2: テンプレートStorageのテストを確認・修正する**

`template-storage.test.ts` の `searchConfig` に `excludeAllDayEvents: true` を追加する（必要な場合のみ）。

**Step 3: テストが通ることを確認する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run`
Expected: 全テストPASS

**Step 4: コミット**

```bash
git add src/popup/context/AppContext.tsx src/services/__tests__/template-storage.test.ts
git commit -m "fix: テンプレート読み込み時のSearchConfig互換性を確保"
```

---

### Task 8: 旧favorite-storage.tsの整理と全テスト確認

**Files:**
- Keep: `src/services/favorite-storage.ts`（移行完了後の互換性のため一旦残す）
- Optional delete: 不要であれば削除

**Step 1: 旧ストレージの参照を確認する**

`favorite-storage.ts` が他のファイルからimportされていないことを確認する。
MemberPicker.tsx は Task 5 で `FavoriteGroupStorage` に切り替え済み。

もしどこからも参照されていなければ `src/services/favorite-storage.ts` を削除する。

**Step 2: 全テストを実行する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run`
Expected: 全テストPASS

**Step 3: ビルドを確認する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vite build`
Expected: ビルド成功、エラーなし

**Step 4: コミット**

```bash
git add -A
git commit -m "chore: 旧favorite-storage.ts削除、全体整理"
```

---

### Task 9: 最終検証

**Step 1: 全テストを実行する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run`
Expected: 全テストPASS

**Step 2: TypeScriptの型チェックを実行する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx tsc --noEmit`
Expected: エラーなし

**Step 3: ビルドを実行する**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vite build`
Expected: ビルド成功

**Step 4: 変更内容のサマリ**

以下が実装されたことを確認:
- [x] `FavoriteGroup` 型とストレージ
- [x] 旧お気に入りからの自動移行
- [x] MemberPicker のAccordionグループUI
- [x] メンバーの「グループに追加」ボタン
- [x] 「次へ」ボタンのスティッキーフッター化
- [x] 終日予定除外チェックボックス（デフォルトON）
- [x] `MemberAvailability` 残骸の削除
- [x] テンプレート互換性の確保
