# Calendar Slot Finder v3 お気に入りグループ・UX改善 設計書

日付: 2026-02-24

## 概要

お気に入りグループ機能の追加、UI/UXの改善（ボタン固定、お気に入りボタンの視認性向上）、終日予定除外オプションの追加。

## 要件一覧

1. お気に入りボタンを分かりやすくする（独立したUI）
2. お気に入りグループ機能（自由命名、メンバーを分類、個別選択で追加）
3. カレンダー選択画面の「次へ」ボタン固定（リストのみスクロール）
4. 終日予定の除外オプション

## 設計詳細

### 1. お気に入りグループ

#### データモデル

```typescript
interface FavoriteGroup {
  id: string
  name: string
  members: Member[]
}
```

#### Storage

`FavoriteGroupStorage` クラス（`favorite-storage.ts` を拡張）:
- `getAllGroups(): Promise<FavoriteGroup[]>`
- `saveGroup(group: FavoriteGroup): Promise<void>`
- `deleteGroup(id: string): Promise<void>`
- `addMemberToGroup(groupId: string, member: Member): Promise<void>`
- `removeMemberFromGroup(groupId: string, email: string): Promise<void>`

Storage key: `csf_favorite_groups`
既存の `csf_favorite_members` は移行後に廃止。

#### UI（MemberPicker内）

メンバー選択画面の上部にグループセクション:
- グループごとにAccordionで展開/折りたたみ
- メンバーのChipタップで検索対象に追加
- 選択済みメンバーの☆ボタンで「グループに追加」メニュー
- [+新規] ボタンでグループ作成ダイアログ
- グループ名横に[削除]ボタン

### 2. カレンダー選択画面の「次へ」ボタン固定

App.tsx の members ステップで:
- コンテンツ領域: `overflow-y: auto` + `flex: 1`
- フッターボタン: `position: sticky; bottom: 0`

### 3. 終日予定の除外

#### ロジック

`slot-finder.ts` に `filterAllDayEvents` 関数を追加:
- busyスロットのうち、開始〜終了の差が24時間以上のものを除外
- SearchConfigForm の handleSearch 内で、FreeBusy結果取得後に適用

#### UI

SearchConfigForm にチェックボックスを追加:
```
□ 終日の予定を除外する
```

#### 型拡張

```typescript
interface SearchConfig {
  // ...既存
  excludeAllDayEvents: boolean
}
```

デフォルト値: `true`（終日予定は通常備忘録なので、デフォルトで除外）
