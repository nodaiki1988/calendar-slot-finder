# Calendar Slot Finder v2 改善設計書

日付: 2026-02-24

## 概要

既存のChrome拡張機能に対する機能改善・リファクタリング。ユーザー要件とコードレビューの結果を統合した設計。

## 要件一覧

### ユーザー要件

1. **空き時間をMTG時間ごとに区切って表示** — 会議・個人モード両方に適用
2. **PurposeSelectorのデザイン統一** — カードサイズの固定
3. **リソース管理モードの削除** — 不要な機能の除去

### レビュー発見の改善点

- A. コード重複の排除（formatDate, formatTime, groupByDate）
- B. タイムゾーンのハードコード解消（Asia/Tokyo固定 → ブラウザTZ動的取得）
- C. エラーメッセージの具体化
- D. ResultListの共有ボタン未実装の修正
- E. リソース管理削除に伴う不要コード掃除

## 設計詳細

### 1. スロット分割ロジック

#### 関数仕様

```typescript
/**
 * 空きスロットを固定時間で分割する（30分刻みスライディングウィンドウ）
 *
 * 例: 空き 09:00-10:30、MTG時間 60分
 *   → 09:00-10:00, 09:30-10:30
 *
 * ステップ幅: 30分固定
 * 空き時間がdurationMinutes未満の場合は候補なし
 */
export function splitIntoFixedSlots(
  slots: AvailableSlot[],
  durationMinutes: number
): AvailableSlot[]
```

#### 適用パイプライン

```
findAvailableSlots → filterByDaysOfWeek → filterByTimeRange → splitIntoFixedSlots
```

`filterByMinDuration` は `splitIntoFixedSlots` に置き換え（指定時間未満のスロットは自動除外されるため）。

### 2. PurposeSelector デザイン統一

- `resource` 選択肢を削除（2つのモードのみ）
- カードの高さを `height: 80px` で固定統一
- `minHeight` → `height` に変更

### 3. コード重複排除

#### 新規ファイル: `src/utils/format.ts`

統合する関数:
- `formatDate(dateStr: string): string` — 日付フォーマット
- `formatTime(isoString: string): string` — 時刻フォーマット
- `groupSlotsByDate(slots: AvailableSlot[]): Map<string, AvailableSlot[]>` — 日付でグループ化

#### 影響ファイル
- `ResultList.tsx` — ローカル関数をimportに変更
- `SlotCard.tsx` — ローカル関数をimportに変更
- `share-formatter.ts` — ローカル関数をimportに変更

### 4. タイムゾーン動的取得

`SearchConfigForm.tsx` の `handleSearch` 内で:

```typescript
// 現在: ハードコード
timeMin: `${searchConfig.dateRange.start}T00:00:00+09:00`

// 変更後: ブラウザTZから動的取得
const tzOffset = getLocalTimezoneOffset() // 例: "+09:00"
timeMin: `${searchConfig.dateRange.start}T00:00:00${tzOffset}`
```

### 5. エラーメッセージ具体化

```
// 変更前
"条件に合う空き時間が見つかりません。条件を変更してください。"

// 変更後
"条件に合う空き時間が見つかりません。以下を試してください：
・日付範囲を広げる
・所要時間を短くする（現在: {minimumDurationMinutes}分）
・時間帯を広げる（現在: {timeRange.start}-{timeRange.end}）"
```

### 6. リソース管理削除のクリーンアップ

削除対象:
- `src/popup/components/ResourceResultList.tsx`
- `types/index.ts` の `MemberAvailability` インターフェース
- `AppContext.tsx` の `memberAvailabilities` state, `SET_MEMBER_AVAILABILITIES` action
- `SearchConfigForm.tsx` のリソースモード分岐
- `PurposeSelector.tsx` の `resource` 選択肢
- `App.tsx` の `ResourceResultList` import と条件分岐

### 7. ResultList共有ボタン修正

未実装コメント `/* Task 14で実装 */` を `ShareDialog` と接続。

## テスト計画

- `splitIntoFixedSlots` の単体テスト（TDD）
  - 通常ケース: 120分の空きを60分で分割 → 3スロット（30分刻み）
  - 端数ケース: 50分の空きを60分で分割 → 0スロット
  - 境界ケース: ちょうど60分の空きを60分で分割 → 1スロット
  - 複数スロット入力
- `formatDate`, `formatTime`, `groupSlotsByDate` のテスト
- 既存テストの回帰確認
