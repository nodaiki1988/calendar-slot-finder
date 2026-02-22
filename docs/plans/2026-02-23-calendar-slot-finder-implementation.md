# Calendar Slot Finder 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Googleカレンダーから複数人の空き時間を検索し、予定を作成できるChrome拡張機能を構築する

**Architecture:** Chrome拡張機能（Manifest V3）で、Popup（React + MUI）がメインUI、Service WorkerがOAuth認証とAPI通信を担当、Content ScriptがGoogleカレンダーページ上にオーバーレイ表示。Google Calendar FreeBusy APIで複数人の空き状況を一括取得し、クライアントサイドで空きスロットを計算する。

**Tech Stack:** TypeScript, React 19, Material UI (MUI), Vite + CRXJS, Vitest, Google Calendar API, Chrome Extensions API (Manifest V3)

---

## Task 1: プロジェクトスキャフォールド

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/manifest.ts`
- Create: `src/popup/index.html`
- Create: `src/popup/main.tsx`
- Create: `src/popup/App.tsx`
- Create: `.gitignore`

**Step 1: Vite + CRXJS + React プロジェクトを初期化**

```bash
cd /Users/daikinoda/calendar-slot-finder
npm create vite@latest . -- --template react-ts
```

（既存ファイルがあるので上書き確認に応じる）

**Step 2: 依存パッケージをインストール**

```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled @mui/x-date-pickers dayjs
npm install -D @crxjs/vite-plugin@latest vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/chrome
```

**Step 3: vite.config.ts を Chrome拡張用に設定**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

**Step 4: manifest.ts を作成**

```typescript
// src/manifest.ts
import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Calendar Slot Finder',
  version: '1.0.0',
  description: 'Googleカレンダーから複数人の空き時間を検索',
  permissions: ['identity', 'storage'],
  oauth2: {
    client_id: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/directory.readonly',
    ],
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://calendar.google.com/*'],
      js: ['src/content/index.ts'],
      css: ['src/content/overlay.css'],
    },
  ],
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
  },
})
```

**Step 5: テストセットアップファイルを作成**

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'

// chrome API のモック
global.chrome = {
  identity: {
    getAuthToken: vi.fn(),
    removeCachedAuthToken: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
    session: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
} as unknown as typeof chrome
```

**Step 6: 最小限のApp.tsxを作成**

```tsx
// src/popup/App.tsx
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'

const theme = createTheme({
  palette: {
    primary: { main: '#1a73e8' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ width: 400, minHeight: 500, padding: 16 }}>
        <h1>Calendar Slot Finder</h1>
      </div>
    </ThemeProvider>
  )
}
```

**Step 7: popup/index.html と main.tsx を調整**

```html
<!-- src/popup/index.html -->
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Calendar Slot Finder</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

```tsx
// src/popup/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 8: 空のService WorkerとContent Scriptを作成**

```typescript
// src/background/index.ts
console.log('Calendar Slot Finder: Service Worker loaded')

// src/content/index.ts
console.log('Calendar Slot Finder: Content Script loaded')
```

```css
/* src/content/overlay.css */
.csf-overlay-slot {
  position: absolute;
  background-color: rgba(52, 168, 83, 0.2);
  border: 1px solid rgba(52, 168, 83, 0.6);
  border-radius: 4px;
  cursor: pointer;
  z-index: 1000;
}
```

**Step 9: プレースホルダーアイコンを作成**

```bash
mkdir -p icons
# 16x16, 48x48, 128x128 のプレースホルダーPNGを配置（後で差し替え）
```

**Step 10: ビルドして動作確認**

```bash
npm run build
```

Expected: `dist/` ディレクトリにChrome拡張ファイルが生成される

**Step 11: コミット**

```bash
git add -A && git commit -m "プロジェクトスキャフォールド: Vite + CRXJS + React + MUI"
```

---

## Task 2: 型定義とドメインモデル

**Files:**
- Create: `src/types/index.ts`
- Create: `src/types/api.ts`
- Create: `src/types/chrome-messages.ts`

**Step 1: コアの型定義を作成**

```typescript
// src/types/index.ts

/** 利用目的 */
export type Purpose = 'meeting' | 'resource' | 'personal'

/** 時間スロット */
export interface TimeSlot {
  start: string // ISO 8601
  end: string   // ISO 8601
}

/** 空きスロット（表示用） */
export interface AvailableSlot extends TimeSlot {
  durationMinutes: number
}

/** 検索条件 */
export interface SearchConfig {
  dateRange: {
    start: string // YYYY-MM-DD
    end: string   // YYYY-MM-DD
  }
  daysOfWeek: number[] // 0=日, 1=月, ..., 6=土
  timeRange: {
    start: string // HH:mm
    end: string   // HH:mm
  }
  minimumDurationMinutes: number
}

/** メンバー */
export interface Member {
  email: string
  name: string
  photoUrl?: string
}

/** テンプレート */
export interface Template {
  id: string
  name: string
  members: Member[]
  calendarIds: string[]
  searchConfig: SearchConfig
  createdAt: string
}

/** 繰り返しルール */
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  count?: number
  until?: string // YYYY-MM-DD
}

/** 予定作成パラメータ */
export interface CreateEventParams {
  summary: string
  description?: string
  start: string
  end: string
  attendees: string[]
  recurrence?: RecurrenceRule
}
```

**Step 2: API型定義を作成**

```typescript
// src/types/api.ts

/** FreeBusy API レスポンス */
export interface FreeBusyResponse {
  kind: string
  timeMin: string
  timeMax: string
  calendars: Record<string, {
    busy: Array<{ start: string; end: string }>
    errors?: Array<{ domain: string; reason: string }>
  }>
}

/** FreeBusy API リクエスト */
export interface FreeBusyRequest {
  timeMin: string
  timeMax: string
  timeZone?: string
  items: Array<{ id: string }>
}

/** CalendarList API レスポンス */
export interface CalendarListResponse {
  items: Array<{
    id: string
    summary: string
    description?: string
    primary?: boolean
    accessRole: string
  }>
}

/** Events API リクエスト */
export interface InsertEventRequest {
  summary: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees?: Array<{ email: string }>
  recurrence?: string[]
}

/** People API (Directory) レスポンス */
export interface DirectoryPeopleResponse {
  people: Array<{
    names?: Array<{ displayName: string }>
    emailAddresses?: Array<{ value: string }>
    photos?: Array<{ url: string }>
  }>
}
```

**Step 3: Chrome メッセージ型定義を作成**

```typescript
// src/types/chrome-messages.ts
import type { FreeBusyRequest, InsertEventRequest } from './api'

export type MessageType =
  | { type: 'GET_AUTH_TOKEN' }
  | { type: 'REVOKE_AUTH_TOKEN' }
  | { type: 'FETCH_FREE_BUSY'; payload: FreeBusyRequest }
  | { type: 'FETCH_CALENDAR_LIST' }
  | { type: 'SEARCH_PEOPLE'; payload: { query: string } }
  | { type: 'CREATE_EVENT'; payload: InsertEventRequest }

export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }
```

**Step 4: コミット**

```bash
git add src/types/ && git commit -m "型定義とドメインモデルを追加"
```

---

## Task 3: 空き時間計算ロジック（TDD）

**Files:**
- Create: `src/logic/slot-finder.ts`
- Create: `src/logic/__tests__/slot-finder.test.ts`

**Step 1: テストファイルを作成（全テストケース）**

```typescript
// src/logic/__tests__/slot-finder.test.ts
import { describe, it, expect } from 'vitest'
import {
  mergeBusySlots,
  findAvailableSlots,
  filterByDaysOfWeek,
  filterByTimeRange,
  filterByMinDuration,
} from '../slot-finder'
import type { TimeSlot, SearchConfig } from '../../types'

describe('mergeBusySlots', () => {
  it('空配列の場合は空配列を返す', () => {
    expect(mergeBusySlots([])).toEqual([])
  })

  it('重複しないスロットはそのまま返す', () => {
    const slots: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00' },
      { start: '2026-02-24T11:00:00+09:00', end: '2026-02-24T12:00:00+09:00' },
    ]
    expect(mergeBusySlots(slots)).toEqual(slots)
  })

  it('重複するスロットをマージする', () => {
    const slots: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T12:00:00+09:00' },
    ]
    expect(mergeBusySlots(slots)).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T12:00:00+09:00' },
    ])
  })

  it('隣接するスロットをマージする', () => {
    const slots: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00' },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
    ]
    expect(mergeBusySlots(slots)).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
    ])
  })

  it('複数人のスロットをマージする', () => {
    const slots: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00' },
      { start: '2026-02-24T14:00:00+09:00', end: '2026-02-24T15:00:00+09:00' },
      { start: '2026-02-24T09:30:00+09:00', end: '2026-02-24T11:00:00+09:00' },
      { start: '2026-02-24T14:30:00+09:00', end: '2026-02-24T16:00:00+09:00' },
    ]
    expect(mergeBusySlots(slots)).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
      { start: '2026-02-24T14:00:00+09:00', end: '2026-02-24T16:00:00+09:00' },
    ])
  })
})

describe('findAvailableSlots', () => {
  it('忙しい時間がない場合、全範囲を返す', () => {
    const result = findAvailableSlots(
      [],
      '2026-02-24T09:00:00+09:00',
      '2026-02-24T18:00:00+09:00'
    )
    expect(result).toEqual([
      {
        start: '2026-02-24T09:00:00+09:00',
        end: '2026-02-24T18:00:00+09:00',
        durationMinutes: 540,
      },
    ])
  })

  it('忙しい時間の前後に空きスロットを返す', () => {
    const busy: TimeSlot[] = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
    ]
    const result = findAvailableSlots(
      busy,
      '2026-02-24T09:00:00+09:00',
      '2026-02-24T12:00:00+09:00'
    )
    expect(result).toEqual([
      {
        start: '2026-02-24T09:00:00+09:00',
        end: '2026-02-24T10:00:00+09:00',
        durationMinutes: 60,
      },
      {
        start: '2026-02-24T11:00:00+09:00',
        end: '2026-02-24T12:00:00+09:00',
        durationMinutes: 60,
      },
    ])
  })

  it('全範囲が忙しい場合、空配列を返す', () => {
    const busy: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T18:00:00+09:00' },
    ]
    const result = findAvailableSlots(
      busy,
      '2026-02-24T09:00:00+09:00',
      '2026-02-24T18:00:00+09:00'
    )
    expect(result).toEqual([])
  })
})

describe('filterByDaysOfWeek', () => {
  it('指定曜日のスロットのみ返す', () => {
    const slots = [
      { start: '2026-02-23T10:00:00+09:00', end: '2026-02-23T11:00:00+09:00', durationMinutes: 60 }, // 月
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 }, // 火
      { start: '2026-02-25T10:00:00+09:00', end: '2026-02-25T11:00:00+09:00', durationMinutes: 60 }, // 水
    ]
    const result = filterByDaysOfWeek(slots, [1, 3]) // 月, 水
    expect(result).toHaveLength(2)
    expect(result[0].start).toContain('02-23')
    expect(result[1].start).toContain('02-25')
  })
})

describe('filterByTimeRange', () => {
  it('指定時間帯内のスロットに切り詰める', () => {
    const slots = [
      { start: '2026-02-24T08:00:00+09:00', end: '2026-02-24T12:00:00+09:00', durationMinutes: 240 },
    ]
    const result = filterByTimeRange(slots, '09:00', '11:00')
    expect(result).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 120 },
    ])
  })

  it('時間帯外のスロットは除外する', () => {
    const slots = [
      { start: '2026-02-24T06:00:00+09:00', end: '2026-02-24T08:00:00+09:00', durationMinutes: 120 },
    ]
    const result = filterByTimeRange(slots, '09:00', '18:00')
    expect(result).toEqual([])
  })
})

describe('filterByMinDuration', () => {
  it('最低時間未満のスロットを除外する', () => {
    const slots = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T09:15:00+09:00', durationMinutes: 15 },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
    ]
    const result = filterByMinDuration(slots, 30)
    expect(result).toHaveLength(1)
    expect(result[0].durationMinutes).toBe(60)
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npx vitest run src/logic/__tests__/slot-finder.test.ts
```

Expected: FAIL（関数が存在しない）

**Step 3: slot-finder.ts を実装**

```typescript
// src/logic/slot-finder.ts
import type { TimeSlot, AvailableSlot } from '../types'

/**
 * 複数の忙しい時間スロットをソートしてマージする
 */
export function mergeBusySlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length === 0) return []

  const sorted = [...slots].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )

  const merged: TimeSlot[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const current = sorted[i]

    if (new Date(current.start).getTime() <= new Date(last.end).getTime()) {
      last.end =
        new Date(current.end) > new Date(last.end) ? current.end : last.end
    } else {
      merged.push({ ...current })
    }
  }

  return merged
}

/**
 * 忙しい時間を差し引いて空きスロットを算出する
 */
export function findAvailableSlots(
  busySlots: TimeSlot[],
  rangeStart: string,
  rangeEnd: string
): AvailableSlot[] {
  const merged = mergeBusySlots(busySlots)
  const available: AvailableSlot[] = []

  let cursor = new Date(rangeStart).getTime()
  const end = new Date(rangeEnd).getTime()

  for (const slot of merged) {
    const busyStart = new Date(slot.start).getTime()
    const busyEnd = new Date(slot.end).getTime()

    if (cursor < busyStart) {
      const durationMinutes = (busyStart - cursor) / 60000
      available.push({
        start: new Date(cursor).toISOString().replace('Z', '+09:00'),
        end: new Date(busyStart).toISOString().replace('Z', '+09:00'),
        durationMinutes,
      })
    }

    cursor = Math.max(cursor, busyEnd)
  }

  if (cursor < end) {
    const durationMinutes = (end - cursor) / 60000
    available.push({
      start: new Date(cursor).toISOString().replace('Z', '+09:00'),
      end: new Date(end).toISOString().replace('Z', '+09:00'),
      durationMinutes,
    })
  }

  return available
}

/**
 * 指定曜日のスロットのみフィルタリング
 */
export function filterByDaysOfWeek(
  slots: AvailableSlot[],
  daysOfWeek: number[]
): AvailableSlot[] {
  return slots.filter((slot) => {
    const day = new Date(slot.start).getDay()
    return daysOfWeek.includes(day)
  })
}

/**
 * 指定時間帯にスロットを切り詰める
 */
export function filterByTimeRange(
  slots: AvailableSlot[],
  startTime: string,
  endTime: string
): AvailableSlot[] {
  const result: AvailableSlot[] = []

  for (const slot of slots) {
    const slotDate = slot.start.split('T')[0]
    const rangeStart = new Date(`${slotDate}T${startTime}:00+09:00`).getTime()
    const rangeEnd = new Date(`${slotDate}T${endTime}:00+09:00`).getTime()

    const slotStart = new Date(slot.start).getTime()
    const slotEnd = new Date(slot.end).getTime()

    const clampedStart = Math.max(slotStart, rangeStart)
    const clampedEnd = Math.min(slotEnd, rangeEnd)

    if (clampedStart < clampedEnd) {
      const durationMinutes = (clampedEnd - clampedStart) / 60000
      const tz = '+09:00'
      result.push({
        start: formatDateTimeWithTz(clampedStart, tz),
        end: formatDateTimeWithTz(clampedEnd, tz),
        durationMinutes,
      })
    }
  }

  return result
}

/**
 * 最低時間未満のスロットを除外
 */
export function filterByMinDuration(
  slots: AvailableSlot[],
  minimumMinutes: number
): AvailableSlot[] {
  return slots.filter((slot) => slot.durationMinutes >= minimumMinutes)
}

function formatDateTimeWithTz(timestamp: number, tz: string): string {
  const d = new Date(timestamp)
  const offset = tz === '+09:00' ? 9 * 60 : 0
  const local = new Date(d.getTime() + offset * 60000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}${tz}`
}
```

**Step 4: テストがパスすることを確認**

```bash
npx vitest run src/logic/__tests__/slot-finder.test.ts
```

Expected: ALL PASS

**Step 5: コミット**

```bash
git add src/logic/ && git commit -m "空き時間計算ロジックを追加（TDD）"
```

---

## Task 4: 認証モジュール

**Files:**
- Create: `src/services/auth.ts`
- Create: `src/services/__tests__/auth.test.ts`

**Step 1: テストを作成**

```typescript
// src/services/__tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAuthToken, revokeAuthToken } from '../auth'

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAuthToken はトークンを返す', async () => {
    const mockGetAuthToken = vi.fn().mockResolvedValue({ token: 'test-token' })
    global.chrome = {
      ...global.chrome,
      identity: {
        ...global.chrome.identity,
        getAuthToken: mockGetAuthToken,
      },
    } as unknown as typeof chrome

    const token = await getAuthToken()
    expect(token).toBe('test-token')
    expect(mockGetAuthToken).toHaveBeenCalledWith({ interactive: true })
  })

  it('getAuthToken はエラー時にnullを返す', async () => {
    const mockGetAuthToken = vi.fn().mockRejectedValue(new Error('auth failed'))
    global.chrome = {
      ...global.chrome,
      identity: {
        ...global.chrome.identity,
        getAuthToken: mockGetAuthToken,
      },
    } as unknown as typeof chrome

    const token = await getAuthToken()
    expect(token).toBeNull()
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npx vitest run src/services/__tests__/auth.test.ts
```

**Step 3: auth.ts を実装**

```typescript
// src/services/auth.ts

export async function getAuthToken(): Promise<string | null> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive: true })
    return result.token
  } catch {
    return null
  }
}

export async function revokeAuthToken(): Promise<void> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive: false })
    if (result.token) {
      await chrome.identity.removeCachedAuthToken({ token: result.token })
    }
  } catch {
    // ignore
  }
}
```

**Step 4: テストがパスすることを確認**

```bash
npx vitest run src/services/__tests__/auth.test.ts
```

**Step 5: コミット**

```bash
git add src/services/ && git commit -m "認証モジュールを追加"
```

---

## Task 5: Google Calendar APIクライアント

**Files:**
- Create: `src/services/calendar-api.ts`
- Create: `src/services/__tests__/calendar-api.test.ts`

**Step 1: テストを作成**

```typescript
// src/services/__tests__/calendar-api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CalendarApiClient } from '../calendar-api'

describe('CalendarApiClient', () => {
  let client: CalendarApiClient

  beforeEach(() => {
    client = new CalendarApiClient('test-token')
    vi.clearAllMocks()
  })

  it('fetchFreeBusy は忙しい時間を返す', async () => {
    const mockResponse = {
      calendars: {
        'user@example.com': {
          busy: [
            { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00' },
          ],
        },
      },
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await client.fetchFreeBusy({
      timeMin: '2026-02-24T09:00:00+09:00',
      timeMax: '2026-02-24T18:00:00+09:00',
      items: [{ id: 'user@example.com' }],
    })

    expect(result.calendars['user@example.com'].busy).toHaveLength(1)
    expect(fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/freeBusy',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('fetchCalendarList はカレンダー一覧を返す', async () => {
    const mockResponse = {
      items: [{ id: 'primary', summary: 'My Calendar', accessRole: 'owner' }],
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await client.fetchCalendarList()
    expect(result.items).toHaveLength(1)
  })

  it('createEvent は予定を作成する', async () => {
    const mockResponse = { id: 'event-123', status: 'confirmed' }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await client.createEvent({
      summary: 'テスト会議',
      start: { dateTime: '2026-02-24T10:00:00+09:00', timeZone: 'Asia/Tokyo' },
      end: { dateTime: '2026-02-24T11:00:00+09:00', timeZone: 'Asia/Tokyo' },
    })

    expect(result.id).toBe('event-123')
  })

  it('APIエラー時に例外をスローする', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: { message: 'Forbidden' } }),
    })

    await expect(
      client.fetchCalendarList()
    ).rejects.toThrow('Forbidden')
  })
})
```

**Step 2: テストが失敗することを確認**

```bash
npx vitest run src/services/__tests__/calendar-api.test.ts
```

**Step 3: calendar-api.ts を実装**

```typescript
// src/services/calendar-api.ts
import type {
  FreeBusyRequest,
  FreeBusyResponse,
  CalendarListResponse,
  InsertEventRequest,
  DirectoryPeopleResponse,
} from '../types/api'

const BASE_URL = 'https://www.googleapis.com'

export class CalendarApiClient {
  constructor(private token: string) {}

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || `API error: ${response.status}`)
    }

    return data as T
  }

  async fetchFreeBusy(params: FreeBusyRequest): Promise<FreeBusyResponse> {
    return this.request<FreeBusyResponse>(
      `${BASE_URL}/calendar/v3/freeBusy`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    )
  }

  async fetchCalendarList(): Promise<CalendarListResponse> {
    return this.request<CalendarListResponse>(
      `${BASE_URL}/calendar/v3/users/me/calendarList`
    )
  }

  async createEvent(params: InsertEventRequest): Promise<{ id: string; status: string }> {
    return this.request(
      `${BASE_URL}/calendar/v3/calendars/primary/events`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    )
  }

  async searchPeople(query: string): Promise<DirectoryPeopleResponse> {
    const encoded = encodeURIComponent(query)
    return this.request<DirectoryPeopleResponse>(
      `${BASE_URL}/people/v1/people:searchDirectoryPeople?query=${encoded}&readMask=names,emailAddresses,photos&sources=DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE`
    )
  }
}
```

**Step 4: テストがパスすることを確認**

```bash
npx vitest run src/services/__tests__/calendar-api.test.ts
```

**Step 5: コミット**

```bash
git add src/services/ && git commit -m "Google Calendar APIクライアントを追加"
```

---

## Task 6: キャッシュレイヤー

**Files:**
- Create: `src/services/cache.ts`
- Create: `src/services/__tests__/cache.test.ts`

**Step 1: テストを作成**

```typescript
// src/services/__tests__/cache.test.ts
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
```

**Step 2: テストが失敗することを確認**

**Step 3: cache.ts を実装**

```typescript
// src/services/cache.ts

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
```

**Step 4: テストがパスすることを確認**

**Step 5: コミット**

```bash
git add src/services/cache.ts src/services/__tests__/cache.test.ts && git commit -m "キャッシュレイヤーを追加"
```

---

## Task 7: Service Worker（バックグラウンド処理）

**Files:**
- Modify: `src/background/index.ts`

**Step 1: Service Worker にメッセージハンドラを実装**

```typescript
// src/background/index.ts
import { getAuthToken } from '../services/auth'
import { CalendarApiClient } from '../services/calendar-api'
import { CacheManager } from '../services/cache'
import type { MessageType, MessageResponse } from '../types/chrome-messages'

const cache = new CacheManager()
const FREEBUSY_TTL = 5 * 60 * 1000   // 5分
const LIST_TTL = 30 * 60 * 1000       // 30分

chrome.runtime.onMessage.addListener(
  (message: MessageType, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse)
    return true // 非同期レスポンス
  }
)

async function handleMessage(message: MessageType): Promise<MessageResponse> {
  try {
    const token = await getAuthToken()
    if (!token && message.type !== 'GET_AUTH_TOKEN') {
      return { success: false, error: '認証が必要です' }
    }

    switch (message.type) {
      case 'GET_AUTH_TOKEN':
        return token
          ? { success: true, data: { token } }
          : { success: false, error: '認証に失敗しました' }

      case 'FETCH_FREE_BUSY': {
        const cacheKey = `freeBusy:${JSON.stringify(message.payload)}`
        const cached = await cache.get(cacheKey)
        if (cached) return { success: true, data: cached }

        const client = new CalendarApiClient(token!)
        const data = await client.fetchFreeBusy(message.payload)
        await cache.set(cacheKey, data, FREEBUSY_TTL)
        return { success: true, data }
      }

      case 'FETCH_CALENDAR_LIST': {
        const cacheKey = 'calendarList'
        const cached = await cache.get(cacheKey)
        if (cached) return { success: true, data: cached }

        const client = new CalendarApiClient(token!)
        const data = await client.fetchCalendarList()
        await cache.set(cacheKey, data, LIST_TTL)
        return { success: true, data }
      }

      case 'SEARCH_PEOPLE': {
        const cacheKey = `people:${message.payload.query}`
        const cached = await cache.get(cacheKey)
        if (cached) return { success: true, data: cached }

        const client = new CalendarApiClient(token!)
        const data = await client.searchPeople(message.payload.query)
        await cache.set(cacheKey, data, LIST_TTL)
        return { success: true, data }
      }

      case 'CREATE_EVENT': {
        const client = new CalendarApiClient(token!)
        const data = await client.createEvent(message.payload)
        return { success: true, data }
      }

      case 'REVOKE_AUTH_TOKEN':
        await import('../services/auth').then((m) => m.revokeAuthToken())
        return { success: true, data: null }

      default:
        return { success: false, error: '不明なメッセージタイプ' }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    }
  }
}
```

**Step 2: コミット**

```bash
git add src/background/ && git commit -m "Service Workerにメッセージハンドラを実装"
```

---

## Task 8: Popup - 状態管理とAPI通信フック

**Files:**
- Create: `src/popup/hooks/useApi.ts`
- Create: `src/popup/context/AppContext.tsx`

**Step 1: chrome.runtime.sendMessage のラッパーフックを作成**

```typescript
// src/popup/hooks/useApi.ts
import type { MessageType, MessageResponse } from '../../types/chrome-messages'

export async function sendMessage<T>(
  message: MessageType
): Promise<T> {
  const response: MessageResponse<T> = await chrome.runtime.sendMessage(message)
  if (!response.success) {
    throw new Error(response.error)
  }
  return response.data
}
```

**Step 2: AppContext を作成**

```tsx
// src/popup/context/AppContext.tsx
import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { Purpose, Member, SearchConfig, AvailableSlot, Template } from '../../types'

interface AppState {
  step: 'purpose' | 'members' | 'config' | 'results'
  purpose: Purpose | null
  members: Member[]
  calendarIds: string[]
  searchConfig: SearchConfig
  results: AvailableSlot[]
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'SET_PURPOSE'; payload: Purpose }
  | { type: 'SET_MEMBERS'; payload: Member[] }
  | { type: 'ADD_MEMBER'; payload: Member }
  | { type: 'REMOVE_MEMBER'; payload: string }
  | { type: 'SET_CALENDAR_IDS'; payload: string[] }
  | { type: 'SET_SEARCH_CONFIG'; payload: SearchConfig }
  | { type: 'SET_RESULTS'; payload: AvailableSlot[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STEP'; payload: AppState['step'] }
  | { type: 'LOAD_TEMPLATE'; payload: Template }
  | { type: 'RESET' }

const defaultSearchConfig: SearchConfig = {
  dateRange: {
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  daysOfWeek: [1, 2, 3, 4, 5], // 月〜金
  timeRange: { start: '09:00', end: '18:00' },
  minimumDurationMinutes: 30,
}

const initialState: AppState = {
  step: 'purpose',
  purpose: null,
  members: [],
  calendarIds: [],
  searchConfig: defaultSearchConfig,
  results: [],
  loading: false,
  error: null,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PURPOSE':
      return { ...state, purpose: action.payload, step: 'members' }
    case 'SET_MEMBERS':
      return { ...state, members: action.payload }
    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.payload] }
    case 'REMOVE_MEMBER':
      return { ...state, members: state.members.filter((m) => m.email !== action.payload) }
    case 'SET_CALENDAR_IDS':
      return { ...state, calendarIds: action.payload }
    case 'SET_SEARCH_CONFIG':
      return { ...state, searchConfig: action.payload }
    case 'SET_RESULTS':
      return { ...state, results: action.payload, step: 'results' }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_STEP':
      return { ...state, step: action.payload }
    case 'LOAD_TEMPLATE':
      return {
        ...state,
        members: action.payload.members,
        calendarIds: action.payload.calendarIds,
        searchConfig: action.payload.searchConfig,
      }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<Action>
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
```

**Step 3: コミット**

```bash
git add src/popup/hooks/ src/popup/context/ && git commit -m "状態管理（AppContext）とAPI通信フックを追加"
```

---

## Task 9: Popup - PurposeSelectorコンポーネント

**Files:**
- Create: `src/popup/components/PurposeSelector.tsx`
- Modify: `src/popup/App.tsx`

**Step 1: PurposeSelector を実装**

```tsx
// src/popup/components/PurposeSelector.tsx
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
} from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import { useAppContext } from '../context/AppContext'
import type { Purpose } from '../../types'

const purposes: Array<{
  value: Purpose
  label: string
  description: string
  icon: React.ReactNode
}> = [
  {
    value: 'meeting',
    label: '会議の日程調整',
    description: 'チームメンバーの空き時間を見つけて会議をスケジュール',
    icon: <GroupsIcon sx={{ fontSize: 40 }} />,
  },
  {
    value: 'resource',
    label: 'リソース管理',
    description: '誰がいつ空いているかを一覧で確認',
    icon: <AssignmentIndIcon sx={{ fontSize: 40 }} />,
  },
  {
    value: 'personal',
    label: '個人の予定確認',
    description: '自分と相手の空き時間を素早く確認',
    icon: <PersonSearchIcon sx={{ fontSize: 40 }} />,
  },
]

export default function PurposeSelector() {
  const { dispatch } = useAppContext()

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        何をしますか？
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {purposes.map((p) => (
          <Card key={p.value} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardActionArea onClick={() => dispatch({ type: 'SET_PURPOSE', payload: p.value })}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ color: 'primary.main' }}>{p.icon}</Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {p.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {p.description}
                  </Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  )
}
```

**Step 2: App.tsx を更新**

```tsx
// src/popup/App.tsx
import { ThemeProvider, createTheme, CssBaseline, Box, IconButton, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { AppProvider, useAppContext } from './context/AppContext'
import PurposeSelector from './components/PurposeSelector'

const theme = createTheme({
  palette: {
    primary: { main: '#1a73e8' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 12 },
})

function AppContent() {
  const { state, dispatch } = useAppContext()

  const handleBack = () => {
    const steps: Array<typeof state.step> = ['purpose', 'members', 'config', 'results']
    const idx = steps.indexOf(state.step)
    if (idx > 0) dispatch({ type: 'SET_STEP', payload: steps[idx - 1] })
  }

  return (
    <Box sx={{ width: 400, minHeight: 500, p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {state.step !== 'purpose' && (
          <IconButton onClick={handleBack} size="small" sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Calendar Slot Finder
        </Typography>
      </Box>

      {state.step === 'purpose' && <PurposeSelector />}
      {state.step === 'members' && <div>メンバー選択（次のタスクで実装）</div>}
      {state.step === 'config' && <div>検索条件設定（次のタスクで実装）</div>}
      {state.step === 'results' && <div>結果表示（次のタスクで実装）</div>}
    </Box>
  )
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  )
}
```

**Step 3: コミット**

```bash
git add src/popup/ && git commit -m "PurposeSelectorコンポーネントとApp画面遷移を追加"
```

---

## Task 10: Popup - MemberPickerコンポーネント

**Files:**
- Create: `src/popup/components/MemberPicker.tsx`
- Create: `src/popup/components/CalendarPicker.tsx`
- Modify: `src/popup/App.tsx`

**Step 1: MemberPicker を実装**

```tsx
// src/popup/components/MemberPicker.tsx
import { useState } from 'react'
import {
  Box,
  TextField,
  Autocomplete,
  Chip,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import type { Member } from '../../types'
import type { DirectoryPeopleResponse } from '../../types/api'

export default function MemberPicker() {
  const { state, dispatch } = useAppContext()
  const [inputValue, setInputValue] = useState('')
  const [options, setOptions] = useState<Member[]>([])
  const [searching, setSearching] = useState(false)

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

  const handleAddManualEmail = () => {
    if (inputValue && inputValue.includes('@')) {
      dispatch({
        type: 'ADD_MEMBER',
        payload: { email: inputValue, name: inputValue },
      })
      setInputValue('')
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        メンバーを選択
      </Typography>

      <Autocomplete
        multiple
        options={options}
        getOptionLabel={(o) => `${o.name} (${o.email})`}
        value={state.members}
        onChange={(_e, newValue) => dispatch({ type: 'SET_MEMBERS', payload: newValue })}
        inputValue={inputValue}
        onInputChange={(_e, value) => {
          setInputValue(value)
          handleSearch(value)
        }}
        loading={searching}
        renderTags={(value, getTagProps) =>
          value.map((member, index) => (
            <Chip
              {...getTagProps({ index })}
              key={member.email}
              label={member.name}
              size="small"
            />
          ))
        }
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

      {inputValue.includes('@') && (
        <Button size="small" onClick={handleAddManualEmail} sx={{ mb: 2 }}>
          「{inputValue}」を追加
        </Button>
      )}

      <Button
        variant="contained"
        fullWidth
        disabled={state.members.length === 0}
        onClick={() => dispatch({ type: 'SET_STEP', payload: 'config' })}
        sx={{ mt: 2 }}
      >
        次へ：検索条件を設定
      </Button>
    </Box>
  )
}
```

**Step 2: CalendarPicker を実装**

```tsx
// src/popup/components/CalendarPicker.tsx
import { useState, useEffect } from 'react'
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography,
  CircularProgress,
} from '@mui/material'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import type { CalendarListResponse } from '../../types/api'

interface CalendarItem {
  id: string
  summary: string
  primary?: boolean
}

export default function CalendarPicker() {
  const { state, dispatch } = useAppContext()
  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCalendars()
  }, [])

  const loadCalendars = async () => {
    try {
      const result = await sendMessage<CalendarListResponse>({
        type: 'FETCH_CALENDAR_LIST',
      })
      setCalendars(
        result.items
          .filter((c) => !c.primary)
          .map((c) => ({ id: c.id, summary: c.summary }))
      )
    } catch {
      // エラー時は空リスト
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (id: string) => {
    const newIds = state.calendarIds.includes(id)
      ? state.calendarIds.filter((cid) => cid !== id)
      : [...state.calendarIds, id]
    dispatch({ type: 'SET_CALENDAR_IDS', payload: newIds })
  }

  if (loading) return <CircularProgress size={24} />

  if (calendars.length === 0) return null

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        共有カレンダー
      </Typography>
      <FormGroup>
        {calendars.map((cal) => (
          <FormControlLabel
            key={cal.id}
            control={
              <Checkbox
                checked={state.calendarIds.includes(cal.id)}
                onChange={() => handleToggle(cal.id)}
                size="small"
              />
            }
            label={cal.summary}
          />
        ))}
      </FormGroup>
    </Box>
  )
}
```

**Step 3: App.tsx の members ステップを更新**

App.tsx の `{state.step === 'members' && <div>メンバー選択（次のタスクで実装）</div>}` を以下に置換:

```tsx
{state.step === 'members' && (
  <>
    <MemberPicker />
    <CalendarPicker />
  </>
)}
```

import文も追加:
```tsx
import MemberPicker from './components/MemberPicker'
import CalendarPicker from './components/CalendarPicker'
```

**Step 4: コミット**

```bash
git add src/popup/ && git commit -m "MemberPickerとCalendarPickerコンポーネントを追加"
```

---

## Task 11: Popup - SearchConfigコンポーネント

**Files:**
- Create: `src/popup/components/SearchConfigForm.tsx`
- Modify: `src/popup/App.tsx`

**Step 1: SearchConfigForm を実装**

```tsx
// src/popup/components/SearchConfigForm.tsx
import {
  Box,
  Typography,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material'
import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import { mergeBusySlots, findAvailableSlots, filterByDaysOfWeek, filterByTimeRange, filterByMinDuration } from '../../logic/slot-finder'
import type { FreeBusyResponse } from '../../types/api'
import type { TimeSlot } from '../../types'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export default function SearchConfigForm() {
  const { state, dispatch } = useAppContext()
  const { searchConfig } = state
  const [error, setError] = useState<string | null>(null)

  const handleDaysChange = (_e: unknown, newDays: number[]) => {
    dispatch({
      type: 'SET_SEARCH_CONFIG',
      payload: { ...searchConfig, daysOfWeek: newDays },
    })
  }

  const handleSearch = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    setError(null)

    try {
      const items = [
        ...state.members.map((m) => ({ id: m.email })),
        ...state.calendarIds.map((id) => ({ id })),
      ]

      const result = await sendMessage<FreeBusyResponse>({
        type: 'FETCH_FREE_BUSY',
        payload: {
          timeMin: `${searchConfig.dateRange.start}T00:00:00+09:00`,
          timeMax: `${searchConfig.dateRange.end}T23:59:59+09:00`,
          timeZone: 'Asia/Tokyo',
          items,
        },
      })

      // 全員の忙しい時間を集約
      const allBusy: TimeSlot[] = Object.values(result.calendars).flatMap(
        (cal) => cal.busy || []
      )

      // 空き時間を計算
      let slots = findAvailableSlots(
        allBusy,
        `${searchConfig.dateRange.start}T${searchConfig.timeRange.start}:00+09:00`,
        `${searchConfig.dateRange.end}T${searchConfig.timeRange.end}:00+09:00`
      )

      slots = filterByDaysOfWeek(slots, searchConfig.daysOfWeek)
      slots = filterByTimeRange(slots, searchConfig.timeRange.start, searchConfig.timeRange.end)
      slots = filterByMinDuration(slots, searchConfig.minimumDurationMinutes)

      if (slots.length === 0) {
        setError('条件に合う空き時間が見つかりません。条件を変更してください。')
      } else {
        dispatch({ type: 'SET_RESULTS', payload: slots })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '検索中にエラーが発生しました')
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        検索条件
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          label="開始日"
          type="date"
          value={searchConfig.dateRange.start}
          onChange={(e) =>
            dispatch({
              type: 'SET_SEARCH_CONFIG',
              payload: {
                ...searchConfig,
                dateRange: { ...searchConfig.dateRange, start: e.target.value },
              },
            })
          }
          size="small"
          sx={{ flex: 1 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="終了日"
          type="date"
          value={searchConfig.dateRange.end}
          onChange={(e) =>
            dispatch({
              type: 'SET_SEARCH_CONFIG',
              payload: {
                ...searchConfig,
                dateRange: { ...searchConfig.dateRange, end: e.target.value },
              },
            })
          }
          size="small"
          sx={{ flex: 1 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>

      <Typography variant="subtitle2" gutterBottom>
        曜日
      </Typography>
      <ToggleButtonGroup
        value={searchConfig.daysOfWeek}
        onChange={handleDaysChange}
        size="small"
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        {DAY_LABELS.map((label, idx) => (
          <ToggleButton key={idx} value={idx} sx={{ px: 1.5 }}>
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          label="開始時間"
          type="time"
          value={searchConfig.timeRange.start}
          onChange={(e) =>
            dispatch({
              type: 'SET_SEARCH_CONFIG',
              payload: {
                ...searchConfig,
                timeRange: { ...searchConfig.timeRange, start: e.target.value },
              },
            })
          }
          size="small"
          sx={{ flex: 1 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="終了時間"
          type="time"
          value={searchConfig.timeRange.end}
          onChange={(e) =>
            dispatch({
              type: 'SET_SEARCH_CONFIG',
              payload: {
                ...searchConfig,
                timeRange: { ...searchConfig.timeRange, end: e.target.value },
              },
            })
          }
          size="small"
          sx={{ flex: 1 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>

      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
        <InputLabel>最低時間</InputLabel>
        <Select
          value={searchConfig.minimumDurationMinutes}
          label="最低時間"
          onChange={(e) =>
            dispatch({
              type: 'SET_SEARCH_CONFIG',
              payload: {
                ...searchConfig,
                minimumDurationMinutes: e.target.value as number,
              },
            })
          }
        >
          <MenuItem value={15}>15分</MenuItem>
          <MenuItem value={30}>30分</MenuItem>
          <MenuItem value={60}>1時間</MenuItem>
          <MenuItem value={90}>1時間30分</MenuItem>
          <MenuItem value={120}>2時間</MenuItem>
        </Select>
      </FormControl>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        variant="contained"
        fullWidth
        onClick={handleSearch}
        disabled={state.loading}
      >
        {state.loading ? '検索中...' : '空き時間を検索'}
      </Button>
    </Box>
  )
}
```

**Step 2: App.tsx の config ステップを更新**

```tsx
import SearchConfigForm from './components/SearchConfigForm'

// config ステップ部分を置換:
{state.step === 'config' && <SearchConfigForm />}
```

**Step 3: コミット**

```bash
git add src/popup/ && git commit -m "SearchConfigFormコンポーネントを追加"
```

---

## Task 12: Popup - ResultListとSlotCardコンポーネント

**Files:**
- Create: `src/popup/components/ResultList.tsx`
- Create: `src/popup/components/SlotCard.tsx`
- Create: `src/popup/components/EventCreator.tsx`
- Modify: `src/popup/App.tsx`

**Step 1: SlotCard を実装**

```tsx
// src/popup/components/SlotCard.tsx
import { Box, Button, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import type { AvailableSlot } from '../../types'

interface Props {
  slot: AvailableSlot
  onCreateEvent: (slot: AvailableSlot) => void
}

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}時間`
  return `${h}時間${m}分`
}

export default function SlotCard({ slot, onCreateEvent }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'rgba(52, 168, 83, 0.08)',
        border: '1px solid rgba(52, 168, 83, 0.3)',
        mb: 1,
      }}
    >
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {formatTime(slot.start)} - {formatTime(slot.end)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatDuration(slot.durationMinutes)}
        </Typography>
      </Box>
      <Button
        size="small"
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => onCreateEvent(slot)}
      >
        作成
      </Button>
    </Box>
  )
}
```

**Step 2: EventCreator を実装**

```tsx
// src/popup/components/EventCreator.tsx
import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material'
import { useAppContext } from '../context/AppContext'
import { sendMessage } from '../hooks/useApi'
import type { AvailableSlot, RecurrenceFrequency } from '../../types'

interface Props {
  slot: AvailableSlot | null
  open: boolean
  onClose: () => void
}

function toRRule(freq: RecurrenceFrequency, count: number): string {
  const f = freq === 'BIWEEKLY' ? 'WEEKLY' : freq
  const interval = freq === 'BIWEEKLY' ? ';INTERVAL=2' : ''
  return `RRULE:FREQ=${f}${interval};COUNT=${count}`
}

export default function EventCreator({ slot, open, onClose }: Props) {
  const { state } = useAppContext()
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency | ''>('')
  const [recurrenceCount, setRecurrenceCount] = useState(4)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleCreate = async () => {
    if (!slot || !summary.trim()) return
    setLoading(true)
    setError(null)

    try {
      const params: Record<string, unknown> = {
        summary: summary.trim(),
        description: description.trim() || undefined,
        start: { dateTime: slot.start, timeZone: 'Asia/Tokyo' },
        end: { dateTime: slot.end, timeZone: 'Asia/Tokyo' },
        attendees: state.members.map((m) => ({ email: m.email })),
      }

      if (recurrence) {
        params.recurrence = [toRRule(recurrence, recurrenceCount)]
      }

      await sendMessage({ type: 'CREATE_EVENT', payload: params })
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setSummary('')
        setDescription('')
        setRecurrence('')
      }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : '予定の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>予定を作成</DialogTitle>
      <DialogContent>
        {success && <Alert severity="success" sx={{ mb: 2 }}>予定を作成しました</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="タイトル"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          fullWidth
          size="small"
          sx={{ mt: 1, mb: 2 }}
          required
        />

        <TextField
          label="説明（任意）"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          size="small"
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />

        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>繰り返し（任意）</InputLabel>
          <Select
            value={recurrence}
            label="繰り返し（任意）"
            onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency | '')}
          >
            <MenuItem value="">なし</MenuItem>
            <MenuItem value="DAILY">毎日</MenuItem>
            <MenuItem value="WEEKLY">毎週</MenuItem>
            <MenuItem value="BIWEEKLY">隔週</MenuItem>
            <MenuItem value="MONTHLY">毎月</MenuItem>
          </Select>
        </FormControl>

        {recurrence && (
          <TextField
            label="繰り返し回数"
            type="number"
            value={recurrenceCount}
            onChange={(e) => setRecurrenceCount(Number(e.target.value))}
            size="small"
            fullWidth
            slotProps={{ htmlInput: { min: 1, max: 52 } }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={loading || !summary.trim()}
        >
          {loading ? '作成中...' : '作成'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

**Step 3: ResultList を実装**

```tsx
// src/popup/components/ResultList.tsx
import { useState } from 'react'
import { Box, Typography, Button, Divider } from '@mui/material'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ShareIcon from '@mui/icons-material/Share'
import SlotCard from './SlotCard'
import EventCreator from './EventCreator'
import { useAppContext } from '../context/AppContext'
import type { AvailableSlot } from '../../types'

function groupByDate(slots: AvailableSlot[]): Map<string, AvailableSlot[]> {
  const groups = new Map<string, AvailableSlot[]>()
  for (const slot of slots) {
    const date = slot.start.split('T')[0]
    const existing = groups.get(date) || []
    existing.push(slot)
    groups.set(date, existing)
  }
  return groups
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`
}

export default function ResultList() {
  const { state } = useAppContext()
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const grouped = groupByDate(state.results)

  const handleOverlay = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SHOW_OVERLAY',
          payload: state.results,
        })
      }
    })
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        空き時間（{state.results.length}件）
      </Typography>

      {Array.from(grouped.entries()).map(([date, slots]) => (
        <Box key={date} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            {formatDate(date)}
          </Typography>
          {slots.map((slot, i) => (
            <SlotCard
              key={i}
              slot={slot}
              onCreateEvent={setSelectedSlot}
            />
          ))}
          <Divider sx={{ mt: 1 }} />
        </Box>
      ))}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<CalendarTodayIcon />}
          onClick={handleOverlay}
          fullWidth
        >
          カレンダーに表示
        </Button>
        <Button
          variant="outlined"
          startIcon={<ShareIcon />}
          onClick={() => {/* Task 14で実装 */}}
          fullWidth
        >
          共有
        </Button>
      </Box>

      <EventCreator
        slot={selectedSlot}
        open={selectedSlot !== null}
        onClose={() => setSelectedSlot(null)}
      />
    </Box>
  )
}
```

**Step 4: App.tsx の results ステップを更新**

```tsx
import ResultList from './components/ResultList'

// results ステップ部分を置換:
{state.step === 'results' && <ResultList />}
```

**Step 5: コミット**

```bash
git add src/popup/ && git commit -m "ResultList, SlotCard, EventCreatorコンポーネントを追加"
```

---

## Task 13: テンプレート管理

**Files:**
- Create: `src/services/template-storage.ts`
- Create: `src/services/__tests__/template-storage.test.ts`
- Create: `src/popup/components/TemplateManager.tsx`

**Step 1: テンプレートストレージのテストを作成**

```typescript
// src/services/__tests__/template-storage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TemplateStorage } from '../template-storage'

describe('TemplateStorage', () => {
  let storage: TemplateStorage

  beforeEach(() => {
    storage = new TemplateStorage()
    const store: Record<string, unknown> = {}
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
})
```

**Step 2: テンプレートストレージを実装**

```typescript
// src/services/template-storage.ts
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
    return result[STORAGE_KEY] || []
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
```

**Step 3: TemplateManager コンポーネントを実装**

```tsx
// src/popup/components/TemplateManager.tsx
import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import BookmarkIcon from '@mui/icons-material/Bookmark'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import { useAppContext } from '../context/AppContext'
import { TemplateStorage } from '../../services/template-storage'
import type { Template } from '../../types'

const storage = new TemplateStorage()

export default function TemplateManager() {
  const { state, dispatch } = useAppContext()
  const [templates, setTemplates] = useState<Template[]>([])
  const [saveOpen, setSaveOpen] = useState(false)
  const [loadOpen, setLoadOpen] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    storage.getAll().then(setTemplates)
  }, [])

  const handleSave = async () => {
    if (!name.trim()) return
    await storage.save({
      name: name.trim(),
      members: state.members,
      calendarIds: state.calendarIds,
      searchConfig: state.searchConfig,
    })
    setTemplates(await storage.getAll())
    setSaveOpen(false)
    setName('')
  }

  const handleLoad = (template: Template) => {
    dispatch({ type: 'LOAD_TEMPLATE', payload: template })
    setLoadOpen(false)
  }

  const handleDelete = async (id: string) => {
    await storage.remove(id)
    setTemplates(await storage.getAll())
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
      <Button
        size="small"
        startIcon={<BookmarkBorderIcon />}
        onClick={() => setSaveOpen(true)}
        disabled={state.members.length === 0}
      >
        保存
      </Button>
      <Button
        size="small"
        startIcon={<BookmarkIcon />}
        onClick={() => setLoadOpen(true)}
        disabled={templates.length === 0}
      >
        読み込み ({templates.length})
      </Button>

      {/* 保存ダイアログ */}
      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)}>
        <DialogTitle>テンプレートを保存</DialogTitle>
        <DialogContent>
          <TextField
            label="テンプレート名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>キャンセル</Button>
          <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 読み込みダイアログ */}
      <Dialog open={loadOpen} onClose={() => setLoadOpen(false)}>
        <DialogTitle>テンプレートを選択</DialogTitle>
        <DialogContent>
          <List>
            {templates.map((t) => (
              <ListItem
                key={t.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleDelete(t.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
                disablePadding
              >
                <ListItemButton onClick={() => handleLoad(t)}>
                  <ListItemText
                    primary={t.name}
                    secondary={`${t.members.length}人`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
```

**Step 4: MemberPicker画面にTemplateManagerを追加**

App.tsx の members ステップに `<TemplateManager />` を追加。

**Step 5: コミット**

```bash
git add src/services/template-storage.ts src/services/__tests__/template-storage.test.ts src/popup/components/TemplateManager.tsx src/popup/App.tsx && git commit -m "テンプレート管理機能を追加"
```

---

## Task 14: 結果共有機能

**Files:**
- Create: `src/popup/components/ShareDialog.tsx`
- Create: `src/logic/share-formatter.ts`
- Create: `src/logic/__tests__/share-formatter.test.ts`
- Modify: `src/popup/components/ResultList.tsx`

**Step 1: share-formatter のテストを作成**

```typescript
// src/logic/__tests__/share-formatter.test.ts
import { describe, it, expect } from 'vitest'
import { formatSlotsAsText, formatSlotsAsMailto } from '../share-formatter'

describe('formatSlotsAsText', () => {
  it('空きスロットをテキスト形式でフォーマットする', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
    ]
    const text = formatSlotsAsText(slots)
    expect(text).toContain('2/24')
    expect(text).toContain('10:00')
    expect(text).toContain('11:00')
  })
})

describe('formatSlotsAsMailto', () => {
  it('mailto URLを生成する', () => {
    const slots = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
    ]
    const url = formatSlotsAsMailto(slots, ['test@example.com'])
    expect(url).toContain('mailto:test@example.com')
    expect(url).toContain('subject=')
  })
})
```

**Step 2: share-formatter を実装**

```typescript
// src/logic/share-formatter.ts
import type { AvailableSlot } from '../types'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`
}

export function formatSlotsAsText(slots: AvailableSlot[]): string {
  const grouped = new Map<string, AvailableSlot[]>()
  for (const slot of slots) {
    const date = slot.start.split('T')[0]
    const existing = grouped.get(date) || []
    existing.push(slot)
    grouped.set(date, existing)
  }

  const lines: string[] = ['【空き時間】', '']
  for (const [, dateSlots] of grouped) {
    lines.push(`■ ${formatDate(dateSlots[0].start)}`)
    for (const slot of dateSlots) {
      lines.push(`  ${formatTime(slot.start)} - ${formatTime(slot.end)}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function formatSlotsAsMailto(
  slots: AvailableSlot[],
  recipients: string[]
): string {
  const subject = encodeURIComponent('日程調整：空き時間のご連絡')
  const body = encodeURIComponent(formatSlotsAsText(slots))
  const to = recipients.join(',')
  return `mailto:${to}?subject=${subject}&body=${body}`
}
```

**Step 3: ShareDialog を実装**

```tsx
// src/popup/components/ShareDialog.tsx
import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EmailIcon from '@mui/icons-material/Email'
import { useAppContext } from '../context/AppContext'
import { formatSlotsAsText, formatSlotsAsMailto } from '../../logic/share-formatter'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ShareDialog({ open, onClose }: Props) {
  const { state } = useAppContext()
  const [mode, setMode] = useState<'copy' | 'email'>('copy')
  const [copied, setCopied] = useState(false)

  const text = formatSlotsAsText(state.results)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEmail = () => {
    const emails = state.members.map((m) => m.email)
    const url = formatSlotsAsMailto(state.results, emails)
    window.open(url)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>結果を共有</DialogTitle>
      <DialogContent>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_e, v) => v && setMode(v)}
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="copy">
            <ContentCopyIcon sx={{ mr: 0.5 }} /> コピー
          </ToggleButton>
          <ToggleButton value="email">
            <EmailIcon sx={{ mr: 0.5 }} /> メール
          </ToggleButton>
        </ToggleButtonGroup>

        <TextField
          value={text}
          multiline
          rows={8}
          fullWidth
          size="small"
          slotProps={{ input: { readOnly: true } }}
        />

        {copied && <Alert severity="success" sx={{ mt: 1 }}>コピーしました</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
        {mode === 'copy' ? (
          <Button variant="contained" onClick={handleCopy}>クリップボードにコピー</Button>
        ) : (
          <Button variant="contained" onClick={handleEmail}>メールで送信</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
```

**Step 4: ResultList に ShareDialog を接続**

ResultList.tsx の共有ボタンに ShareDialog を接続。

**Step 5: テストを実行して確認**

```bash
npx vitest run src/logic/__tests__/share-formatter.test.ts
```

**Step 6: コミット**

```bash
git add src/logic/share-formatter.ts src/logic/__tests__/share-formatter.test.ts src/popup/components/ShareDialog.tsx src/popup/components/ResultList.tsx && git commit -m "結果共有機能を追加（コピー・メール）"
```

---

## Task 15: Content Script - カレンダーオーバーレイ

**Files:**
- Modify: `src/content/index.ts`
- Modify: `src/content/overlay.css`

**Step 1: Content Script を実装**

```typescript
// src/content/index.ts
import type { AvailableSlot } from '../types'

interface OverlayMessage {
  type: 'SHOW_OVERLAY' | 'HIDE_OVERLAY'
  payload?: AvailableSlot[]
}

chrome.runtime.onMessage.addListener(
  (message: OverlayMessage, _sender, sendResponse) => {
    if (message.type === 'SHOW_OVERLAY' && message.payload) {
      showOverlay(message.payload)
      sendResponse({ success: true })
    } else if (message.type === 'HIDE_OVERLAY') {
      hideOverlay()
      sendResponse({ success: true })
    }
  }
)

function showOverlay(slots: AvailableSlot[]) {
  hideOverlay()

  const container = document.createElement('div')
  container.id = 'csf-overlay-container'
  container.innerHTML = `
    <div class="csf-overlay-panel">
      <div class="csf-overlay-header">
        <span>空き時間（${slots.length}件）</span>
        <button class="csf-overlay-close">&times;</button>
      </div>
      <div class="csf-overlay-list">
        ${slots.map((slot) => {
          const start = new Date(slot.start)
          const end = new Date(slot.end)
          const formatTime = (d: Date) =>
            d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
          const formatDate = (d: Date) => {
            const days = ['日', '月', '火', '水', '木', '金', '土']
            return `${d.getMonth() + 1}/${d.getDate()}(${days[d.getDay()]})`
          }
          return `
            <div class="csf-overlay-slot" data-start="${slot.start}" data-end="${slot.end}">
              <span class="csf-overlay-date">${formatDate(start)}</span>
              <span class="csf-overlay-time">${formatTime(start)} - ${formatTime(end)}</span>
            </div>
          `
        }).join('')}
      </div>
    </div>
  `
  document.body.appendChild(container)

  container.querySelector('.csf-overlay-close')?.addEventListener('click', hideOverlay)

  container.querySelectorAll('.csf-overlay-slot').forEach((el) => {
    el.addEventListener('click', () => {
      const start = el.getAttribute('data-start')
      const end = el.getAttribute('data-end')
      if (start && end) {
        // Googleカレンダーの予定作成URLを開く
        const url = new URL('https://calendar.google.com/calendar/render')
        url.searchParams.set('action', 'TEMPLATE')
        url.searchParams.set('dates', `${toGCalDate(start)}/${toGCalDate(end)}`)
        window.open(url.toString(), '_blank')
      }
    })
  })
}

function hideOverlay() {
  document.getElementById('csf-overlay-container')?.remove()
}

function toGCalDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}
```

**Step 2: overlay.css を更新**

```css
/* src/content/overlay.css */
#csf-overlay-container {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 99999;
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
}

.csf-overlay-panel {
  position: fixed;
  top: 64px;
  right: 16px;
  width: 300px;
  max-height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.csf-overlay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #1a73e8;
  color: white;
  font-weight: 500;
}

.csf-overlay-close {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}

.csf-overlay-list {
  overflow-y: auto;
  max-height: 436px;
  padding: 8px;
}

.csf-overlay-slot {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  margin: 4px 0;
  background: rgba(52, 168, 83, 0.08);
  border: 1px solid rgba(52, 168, 83, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.csf-overlay-slot:hover {
  background: rgba(52, 168, 83, 0.18);
}

.csf-overlay-date {
  font-size: 12px;
  color: #5f6368;
  font-weight: 500;
}

.csf-overlay-time {
  font-size: 14px;
  color: #202124;
  font-weight: 500;
}
```

**Step 3: コミット**

```bash
git add src/content/ && git commit -m "Content Script: カレンダーオーバーレイを追加"
```

---

## Task 16: 全体テスト実行と仕上げ

**Files:**
- Create: `src/logic/__tests__/integration.test.ts`

**Step 1: 統合テストを作成**

```typescript
// src/logic/__tests__/integration.test.ts
import { describe, it, expect } from 'vitest'
import { mergeBusySlots, findAvailableSlots, filterByDaysOfWeek, filterByTimeRange, filterByMinDuration } from '../slot-finder'
import type { TimeSlot, AvailableSlot } from '../../types'

describe('空き時間検索: 統合シナリオ', () => {
  it('3人のカレンダーから平日9-18時の30分以上の空き時間を見つける', () => {
    const personA: TimeSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00' },
      { start: '2026-02-24T14:00:00+09:00', end: '2026-02-24T15:00:00+09:00' },
    ]
    const personB: TimeSlot[] = [
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:30:00+09:00' },
      { start: '2026-02-24T16:00:00+09:00', end: '2026-02-24T17:00:00+09:00' },
    ]
    const personC: TimeSlot[] = [
      { start: '2026-02-24T09:30:00+09:00', end: '2026-02-24T10:30:00+09:00' },
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00' },
    ]

    const allBusy = [...personA, ...personB, ...personC]

    let slots = findAvailableSlots(
      allBusy,
      '2026-02-24T09:00:00+09:00',
      '2026-02-24T18:00:00+09:00'
    )

    slots = filterByDaysOfWeek(slots, [1, 2, 3, 4, 5])
    slots = filterByTimeRange(slots, '09:00', '18:00')
    slots = filterByMinDuration(slots, 30)

    expect(slots.length).toBeGreaterThan(0)
    for (const slot of slots) {
      expect(slot.durationMinutes).toBeGreaterThanOrEqual(30)
    }
  })
})
```

**Step 2: 全テストを実行**

```bash
npx vitest run
```

Expected: ALL PASS

**Step 3: ビルド確認**

```bash
npm run build
```

Expected: `dist/` にChrome拡張機能の成果物が生成される

**Step 4: コミット**

```bash
git add -A && git commit -m "統合テストを追加、全テストパス確認"
```

---

## タスク依存関係

```
Task 1 (スキャフォールド)
  ├── Task 2 (型定義)
  │     ├── Task 3 (空き時間計算ロジック)
  │     ├── Task 4 (認証モジュール)
  │     ├── Task 5 (APIクライアント)
  │     │     └── Task 7 (Service Worker)
  │     └── Task 6 (キャッシュ)
  │           └── Task 7 (Service Worker)
  │
  ├── Task 8 (状態管理・フック) ← Task 2 に依存
  │     ├── Task 9 (PurposeSelector)
  │     ├── Task 10 (MemberPicker + CalendarPicker)
  │     ├── Task 11 (SearchConfigForm) ← Task 3 に依存
  │     └── Task 12 (ResultList + EventCreator)
  │
  ├── Task 13 (テンプレート管理) ← Task 10 に依存
  ├── Task 14 (結果共有) ← Task 12 に依存
  ├── Task 15 (Content Script) ← Task 12 に依存
  └── Task 16 (統合テスト + 仕上げ) ← 全タスクに依存
```

## 並列実行可能なタスクグループ

- **グループ1**: Task 3, 4, 5, 6 （互いに独立）
- **グループ2**: Task 9, 10 （互いに独立）
- **グループ3**: Task 13, 14, 15 （互いに独立）
