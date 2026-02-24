# Calendar Slot Finder v2 改善 実装計画

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** リソース管理モード削除、MTG時間ごとのスロット分割、コード重複排除、タイムゾーン動的取得、エラーメッセージ改善、共有ボタン修正を一括実装する。

**Architecture:** ロジック層にスライディングウィンドウ方式のスロット分割関数を追加し、共通ユーティリティを`src/utils/format.ts`に抽出。リソース管理モードの全関連コードを削除。TDDで進める。

**Tech Stack:** TypeScript, React 19, Vitest, MUI 7, Chrome Extension Manifest V3

---

## Task 1: ユーティリティ関数のテストを書く

**Files:**
- Create: `src/utils/__tests__/format.test.ts`

**Step 1: テストファイルを作成**

```typescript
import { describe, it, expect } from 'vitest'
import { formatDate, formatTime, groupSlotsByDate } from '../format'
import type { AvailableSlot } from '../../types'

describe('formatDate', () => {
  it('月/日(曜日)形式にフォーマットする', () => {
    expect(formatDate('2026-02-24')).toBe('2/24(火)')
  })

  it('1桁の月日も正しくフォーマットする', () => {
    expect(formatDate('2026-01-05')).toBe('1/5(月)')
  })
})

describe('formatTime', () => {
  it('HH:mm形式にフォーマットする', () => {
    expect(formatTime('2026-02-24T09:30:00+09:00')).toBe('09:30')
  })

  it('午後の時刻も正しくフォーマットする', () => {
    expect(formatTime('2026-02-24T14:05:00+09:00')).toBe('14:05')
  })
})

describe('groupSlotsByDate', () => {
  it('スロットを日付ごとにグループ化する', () => {
    const slots: AvailableSlot[] = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-25T09:00:00+09:00', end: '2026-02-25T10:00:00+09:00', durationMinutes: 60 },
    ]
    const grouped = groupSlotsByDate(slots)
    expect(grouped.size).toBe(2)
    expect(grouped.get('2026-02-24')).toHaveLength(2)
    expect(grouped.get('2026-02-25')).toHaveLength(1)
  })

  it('空配列の場合は空のMapを返す', () => {
    const grouped = groupSlotsByDate([])
    expect(grouped.size).toBe(0)
  })
})
```

**Step 2: テストを実行して失敗を確認**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run src/utils/__tests__/format.test.ts`
Expected: FAIL — モジュールが存在しない

**Step 3: コミット（失敗テスト）**

```bash
git add src/utils/__tests__/format.test.ts
git commit -m "ユーティリティ関数のテストを追加（RED）"
```

---

## Task 2: ユーティリティ関数を実装する

**Files:**
- Create: `src/utils/format.ts`

**Step 1: 実装を作成**

```typescript
import type { AvailableSlot } from '../types'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/**
 * 日付文字列を "M/D(曜日)" 形式にフォーマットする
 * @param dateStr ISO 8601 文字列または YYYY-MM-DD 文字列
 */
export function formatDate(dateStr: string): string {
  // YYYY-MM-DD部分を取得してUTC正午でパースし、タイムゾーンによる日付ズレを防止
  const datePart = dateStr.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${DAY_LABELS[d.getUTCDay()]})`
}

/**
 * ISO 8601 時刻文字列を "HH:mm" 形式にフォーマットする
 * ISO文字列のローカル時刻部分を直接パースする（TZ変換不要）
 */
export function formatTime(isoString: string): string {
  const timePart = isoString.split('T')[1]
  const [hh, mm] = timePart.split(':')
  return `${hh}:${mm}`
}

/**
 * スロットを日付ごとにグループ化する
 */
export function groupSlotsByDate(slots: AvailableSlot[]): Map<string, AvailableSlot[]> {
  const groups = new Map<string, AvailableSlot[]>()
  for (const slot of slots) {
    const date = slot.start.split('T')[0]
    const existing = groups.get(date) || []
    existing.push(slot)
    groups.set(date, existing)
  }
  return groups
}
```

**Step 2: テストを実行してパスを確認**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run src/utils/__tests__/format.test.ts`
Expected: PASS

**Step 3: コミット**

```bash
git add src/utils/format.ts src/utils/__tests__/format.test.ts
git commit -m "共通ユーティリティ関数を追加（GREEN）"
```

---

## Task 3: splitIntoFixedSlots のテストを書く

**Files:**
- Modify: `src/logic/__tests__/slot-finder.test.ts`

**Step 1: splitIntoFixedSlots のテストを追加**

ファイル末尾に以下を追加:

```typescript
import { splitIntoFixedSlots } from '../slot-finder'

// ... 既存テストの後に追加 ...

describe('splitIntoFixedSlots', () => {
  it('空き時間を指定時間ごとに30分刻みで分割する', () => {
    const slots = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T12:00:00+09:00', durationMinutes: 180 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T09:30:00+09:00', end: '2026-02-24T10:30:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T11:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T10:30:00+09:00', end: '2026-02-24T11:30:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T11:00:00+09:00', end: '2026-02-24T12:00:00+09:00', durationMinutes: 60 },
    ])
  })

  it('空き時間が指定時間未満の場合は空配列を返す', () => {
    const slots = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T09:50:00+09:00', durationMinutes: 50 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result).toEqual([])
  })

  it('ちょうど指定時間の空きは1スロットを返す', () => {
    const slots = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 60 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 60 },
    ])
  })

  it('複数の空きスロットをそれぞれ分割する', () => {
    const slots = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:30:00+09:00', durationMinutes: 90 },
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
    ]
    const result = splitIntoFixedSlots(slots, 60)
    expect(result).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T09:30:00+09:00', end: '2026-02-24T10:30:00+09:00', durationMinutes: 60 },
      { start: '2026-02-24T13:00:00+09:00', end: '2026-02-24T14:00:00+09:00', durationMinutes: 60 },
    ])
  })

  it('30分のMTG時間でも正しく分割する', () => {
    const slots = [
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T10:30:00+09:00', durationMinutes: 90 },
    ]
    const result = splitIntoFixedSlots(slots, 30)
    expect(result).toEqual([
      { start: '2026-02-24T09:00:00+09:00', end: '2026-02-24T09:30:00+09:00', durationMinutes: 30 },
      { start: '2026-02-24T09:30:00+09:00', end: '2026-02-24T10:00:00+09:00', durationMinutes: 30 },
      { start: '2026-02-24T10:00:00+09:00', end: '2026-02-24T10:30:00+09:00', durationMinutes: 30 },
    ])
  })

  it('空配列の場合は空配列を返す', () => {
    expect(splitIntoFixedSlots([], 60)).toEqual([])
  })
})
```

**Step 2: テストを実行して失敗を確認**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run src/logic/__tests__/slot-finder.test.ts`
Expected: FAIL — splitIntoFixedSlots が存在しない

**Step 3: コミット（失敗テスト）**

```bash
git add src/logic/__tests__/slot-finder.test.ts
git commit -m "splitIntoFixedSlotsのテストを追加（RED）"
```

---

## Task 4: splitIntoFixedSlots を実装する

**Files:**
- Modify: `src/logic/slot-finder.ts` — 末尾に関数追加

**Step 1: 実装を追加**

`slot-finder.ts` の末尾に追加:

```typescript
const STEP_MINUTES = 30

/**
 * 空きスロットを固定時間で分割する（30分刻みスライディングウィンドウ）
 *
 * 例: 空き 09:00-12:00、MTG時間 60分
 *   → 09:00-10:00, 09:30-10:30, 10:00-11:00, 10:30-11:30, 11:00-12:00
 *
 * @param slots 空きスロットの配列
 * @param durationMinutes 各スロットの固定時間（分）
 */
export function splitIntoFixedSlots(
  slots: AvailableSlot[],
  durationMinutes: number
): AvailableSlot[] {
  const result: AvailableSlot[] = []
  const stepMs = STEP_MINUTES * 60_000
  const durationMs = durationMinutes * 60_000

  for (const slot of slots) {
    const tz = extractTimezone(slot.start)
    const slotStart = new Date(slot.start).getTime()
    const slotEnd = new Date(slot.end).getTime()

    let cursor = slotStart
    while (cursor + durationMs <= slotEnd) {
      result.push({
        start: formatWithTimezone(new Date(cursor), tz),
        end: formatWithTimezone(new Date(cursor + durationMs), tz),
        durationMinutes,
      })
      cursor += stepMs
    }
  }

  return result
}
```

**注意:** `extractTimezone` と `formatWithTimezone` は既存のプライベート関数。`splitIntoFixedSlots` は同一ファイル内なのでアクセス可能。

**Step 2: テストを実行してパスを確認**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run src/logic/__tests__/slot-finder.test.ts`
Expected: ALL PASS

**Step 3: コミット**

```bash
git add src/logic/slot-finder.ts src/logic/__tests__/slot-finder.test.ts
git commit -m "splitIntoFixedSlotsを実装（GREEN）"
```

---

## Task 5: リソース管理モードを削除する

**Files:**
- Delete: `src/popup/components/ResourceResultList.tsx`
- Modify: `src/types/index.ts` — `MemberAvailability` インターフェース削除
- Modify: `src/popup/context/AppContext.tsx` — `memberAvailabilities` state, `SET_MEMBER_AVAILABILITIES` action 削除
- Modify: `src/popup/components/PurposeSelector.tsx` — `resource` 選択肢を削除
- Modify: `src/popup/App.tsx` — `ResourceResultList` のimportと条件分岐を削除
- Modify: `src/popup/components/SearchConfigForm.tsx` — リソースモード分岐を削除

**Step 1: ResourceResultList.tsx を削除**

```bash
rm src/popup/components/ResourceResultList.tsx
```

**Step 2: types/index.ts から MemberAvailability を削除**

削除する行:
```typescript
/** メンバーごとの空き状況（リソース管理用） */
export interface MemberAvailability {
  member: Member
  availableSlots: AvailableSlot[]
}
```

**Step 3: AppContext.tsx を修正**

- import から `MemberAvailability` を削除
- `AppState` から `memberAvailabilities: MemberAvailability[]` を削除
- `Action` から `{ type: 'SET_MEMBER_AVAILABILITIES'; payload: MemberAvailability[] }` を削除
- `initialState` から `memberAvailabilities: []` を削除
- `reducer` から `case 'SET_MEMBER_AVAILABILITIES':` を削除

**Step 4: PurposeSelector.tsx から resource を削除**

`purposes` 配列から `resource` オブジェクトを削除。`AssignmentIndIcon` のimportも削除。

**Step 5: App.tsx を修正**

- `ResourceResultList` のimportを削除
- results の条件分岐を変更:
  ```typescript
  // 変更前
  {state.step === 'results' && (
    state.purpose === 'resource' ? <ResourceResultList /> : <ResultList />
  )}

  // 変更後
  {state.step === 'results' && <ResultList />}
  ```

**Step 6: SearchConfigForm.tsx のリソースモード分岐を削除**

- import から `MemberAvailability` を削除
- `handleSearch` 内の `if (state.purpose === 'resource') { ... } else { ... }` を、`else` ブロックの中身だけに簡素化:

```typescript
const handleSearch = async () => {
  dispatch({ type: 'SET_LOADING', payload: true })
  setError(null)

  try {
    const items = [
      ...state.members.map((m) => ({ id: m.email })),
      ...state.calendarIds.map((id) => ({ id })),
    ]

    const tzOffset = getLocalTimezoneOffset()

    const result = await sendMessage<FreeBusyResponse>({
      type: 'FETCH_FREE_BUSY',
      payload: {
        timeMin: `${searchConfig.dateRange.start}T00:00:00${tzOffset}`,
        timeMax: `${searchConfig.dateRange.end}T23:59:59${tzOffset}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        items,
      },
    })

    const startISO = `${searchConfig.dateRange.start}T${searchConfig.timeRange.start}:00${tzOffset}`
    const endISO = `${searchConfig.dateRange.end}T${searchConfig.timeRange.end}:00${tzOffset}`

    const allBusy: TimeSlot[] = Object.values(result.calendars).flatMap(
      (cal) => cal.busy || []
    )

    let slots = findAvailableSlots(allBusy, startISO, endISO)
    slots = filterByDaysOfWeek(slots, searchConfig.daysOfWeek)
    slots = filterByTimeRange(slots, searchConfig.timeRange.start, searchConfig.timeRange.end)
    slots = splitIntoFixedSlots(slots, searchConfig.minimumDurationMinutes)

    if (slots.length === 0) {
      setError(
        `条件に合う空き時間が見つかりません。以下を試してください：\n` +
        `・日付範囲を広げる\n` +
        `・所要時間を短くする（現在: ${searchConfig.minimumDurationMinutes}分）\n` +
        `・時間帯を広げる（現在: ${searchConfig.timeRange.start}〜${searchConfig.timeRange.end}）`
      )
    } else {
      dispatch({ type: 'SET_RESULTS', payload: slots })
    }
  } catch (e) {
    setError(e instanceof Error ? e.message : '検索中にエラーが発生しました')
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false })
  }
}
```

**Step 7: テストを実行して既存テストがパスすることを確認**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run`
Expected: ALL PASS

**Step 8: コミット**

```bash
git add -A
git commit -m "リソース管理モードを削除し、スロット分割・TZ動的取得・エラー改善を適用"
```

---

## Task 6: タイムゾーンヘルパーを追加する

**Files:**
- Modify: `src/utils/format.ts` — `getLocalTimezoneOffset` を追加

**Step 1: テストを追加**

`src/utils/__tests__/format.test.ts` に追加:

```typescript
import { getLocalTimezoneOffset } from '../format'

describe('getLocalTimezoneOffset', () => {
  it('+HH:mm または -HH:mm 形式を返す', () => {
    const offset = getLocalTimezoneOffset()
    expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/)
  })
})
```

**Step 2: 実装を追加**

`src/utils/format.ts` に追加:

```typescript
/**
 * ブラウザのローカルタイムゾーンオフセットを "+HH:mm" 形式で返す
 * 例: 日本 → "+09:00", 米国東部（EST） → "-05:00"
 */
export function getLocalTimezoneOffset(): string {
  const offset = new Date().getTimezoneOffset() // 分単位、UTCからの差（日本は -540）
  const sign = offset <= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const minutes = String(abs % 60).padStart(2, '0')
  return `${sign}${hours}:${minutes}`
}
```

**Step 3: テストを実行してパスを確認**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run src/utils/__tests__/format.test.ts`
Expected: ALL PASS

**Step 4: コミット**

```bash
git add src/utils/format.ts src/utils/__tests__/format.test.ts
git commit -m "タイムゾーンオフセットヘルパーを追加"
```

---

## Task 7: コード重複を排除する（コンポーネント側）

**Files:**
- Modify: `src/popup/components/ResultList.tsx` — ローカル関数を削除、import追加
- Modify: `src/popup/components/SlotCard.tsx` — ローカル関数を削除、import追加
- Modify: `src/logic/share-formatter.ts` — ローカル関数を削除、import追加

**Step 1: ResultList.tsx を修正**

- `groupByDate` 関数（行10-19）と `formatDate` 関数（行21-25）を削除
- import追加:
  ```typescript
  import { formatDate, groupSlotsByDate } from '../../utils/format'
  ```
- `groupByDate` の呼び出しを `groupSlotsByDate` に変更

**Step 2: SlotCard.tsx を修正**

- `formatTime` 関数（行10-13）を削除
- import追加:
  ```typescript
  import { formatTime } from '../../utils/format'
  ```

**Step 3: share-formatter.ts を修正**

- `formatTime` 関数（行3-8）と `formatDate` 関数（行10-14）を削除
- `grouped` のローカル変数作成ロジック（行17-23）を `groupSlotsByDate` に変更
- import追加:
  ```typescript
  import { formatDate, formatTime, groupSlotsByDate } from '../utils/format'
  ```

**Step 4: 全テストを実行**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run`
Expected: ALL PASS

**Step 5: コミット**

```bash
git add src/popup/components/ResultList.tsx src/popup/components/SlotCard.tsx src/logic/share-formatter.ts
git commit -m "コード重複を排除し共通ユーティリティに統合"
```

---

## Task 8: PurposeSelector のデザイン統一

**Files:**
- Modify: `src/popup/components/PurposeSelector.tsx`

**Step 1: CardContent の高さを固定**

`CardContent` の `sx` を修正:
```typescript
// 変更前
minHeight: 80,

// 変更後
height: 80,
```

**Step 2: ビルドして確認**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx tsc --noEmit`
Expected: 成功（型エラーなし）

**Step 3: コミット**

```bash
git add src/popup/components/PurposeSelector.tsx
git commit -m "PurposeSelectorのカード高さを統一"
```

---

## Task 9: ResultList の共有ボタンを修正する

**Files:**
- Modify: `src/popup/components/ResultList.tsx`

**Step 1: ShareDialog のimportと状態を追加**

```typescript
import ShareDialog from './ShareDialog'

// コンポーネント内に追加
const [shareOpen, setShareOpen] = useState(false)
```

**Step 2: 共有ボタンの onClick を修正**

```typescript
// 変更前
onClick={() => {/* Task 14で実装 */}}

// 変更後
onClick={() => setShareOpen(true)}
```

**Step 3: ShareDialog コンポーネントを追加**

`EventCreator` の下に:
```typescript
<ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
```

**Step 4: ビルドして確認**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx tsc --noEmit`
Expected: 成功

**Step 5: コミット**

```bash
git add src/popup/components/ResultList.tsx
git commit -m "ResultListの共有ボタンをShareDialogに接続"
```

---

## Task 10: SearchConfigForm にスロット分割とTZ動的取得を適用

**Files:**
- Modify: `src/popup/components/SearchConfigForm.tsx`

**Step 1: import を更新**

```typescript
// 削除
import { findAvailableSlots, filterByDaysOfWeek, filterByTimeRange, filterByMinDuration } from '../../logic/slot-finder'
import type { MemberAvailability } from '../../types'

// 追加
import { findAvailableSlots, filterByDaysOfWeek, filterByTimeRange, splitIntoFixedSlots } from '../../logic/slot-finder'
import { getLocalTimezoneOffset } from '../../utils/format'
```

**Step 2: handleSearch を修正**

- `filterByMinDuration` を `splitIntoFixedSlots` に置き換え
- `+09:00` ハードコードを `getLocalTimezoneOffset()` に置き換え
- `timeZone: 'Asia/Tokyo'` を `Intl.DateTimeFormat().resolvedOptions().timeZone` に置き換え
- リソースモード分岐を削除
- エラーメッセージを具体化

（具体的なコードは Task 5 の Step 6 に記載済み）

**Step 3: 「最低時間」ラベルを「MTG時間」に変更**

```typescript
// 変更前
<InputLabel>最低時間</InputLabel>
<Select value={searchConfig.minimumDurationMinutes} label="最低時間" ...>

// 変更後
<InputLabel>MTG時間</InputLabel>
<Select value={searchConfig.minimumDurationMinutes} label="MTG時間" ...>
```

**Step 4: 全テストを実行**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run`
Expected: ALL PASS

**Step 5: ビルドを実行**

Run: `cd /Users/daikinoda/calendar-slot-finder && npm run build`
Expected: 成功

**Step 6: コミット**

```bash
git add src/popup/components/SearchConfigForm.tsx
git commit -m "スロット分割・TZ動的取得・エラー改善を検索フォームに適用"
```

---

## Task 11: 最終検証

**Step 1: 全テストを実行**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx vitest run`
Expected: ALL PASS

**Step 2: TypeScript 型チェック**

Run: `cd /Users/daikinoda/calendar-slot-finder && npx tsc --noEmit`
Expected: 成功

**Step 3: ビルド**

Run: `cd /Users/daikinoda/calendar-slot-finder && npm run build`
Expected: 成功

**Step 4: 不要なexportの確認**

`filterByMinDuration` が他から使われていないことを確認。`slot-finder.ts` から削除可能（ただし将来使う可能性があるため残してもOK）。

---

## 変更ファイルまとめ

| ファイル | 操作 |
|---------|------|
| `src/utils/format.ts` | 新規作成 |
| `src/utils/__tests__/format.test.ts` | 新規作成 |
| `src/logic/slot-finder.ts` | 修正（splitIntoFixedSlots追加） |
| `src/logic/__tests__/slot-finder.test.ts` | 修正（テスト追加） |
| `src/popup/components/ResourceResultList.tsx` | 削除 |
| `src/popup/components/PurposeSelector.tsx` | 修正 |
| `src/popup/components/ResultList.tsx` | 修正 |
| `src/popup/components/SlotCard.tsx` | 修正 |
| `src/popup/components/SearchConfigForm.tsx` | 修正 |
| `src/popup/context/AppContext.tsx` | 修正 |
| `src/popup/App.tsx` | 修正 |
| `src/logic/share-formatter.ts` | 修正 |
| `src/types/index.ts` | 修正 |
