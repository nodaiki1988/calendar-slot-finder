# Calendar Slot Finder セットアップガイド

## 前提
- Google Chrome がインストールされていること
- Google アカウント（Gmail）を持っていること

---

## 1. Chrome 拡張機能の仮ロード

1. Chrome のアドレスバーに `chrome://extensions` と入力してEnter
2. 右上の **「デベロッパーモード」** のスイッチをONにする
3. **「パッケージ化されていない拡張機能を読み込む」** をクリック
4. フォルダ選択ダイアログが開いたら:
   - Mac: `Cmd + Shift + G` を押してパスを入力
   - パス: `/Users/daikinoda/calendar-slot-finder/dist`
5. 「開く」をクリック
6. 拡張機能カードに表示される **ID**（32文字の英小文字）をメモ

---

## 2. Google Cloud Console でプロジェクト作成

1. https://console.cloud.google.com/ にアクセスしてGoogleアカウントでログイン
2. ページ上部のプロジェクト選択から **「新しいプロジェクト」** をクリック
3. プロジェクト名: `Calendar Slot Finder`
4. 「作成」をクリック
5. 作成したプロジェクトが選択されていることを確認

---

## 3. API を有効化

以下の各URLを開いて「有効にする」ボタンをクリック:

- **Google Calendar API**:
  https://console.cloud.google.com/apis/library/calendar-json.googleapis.com

- **People API**:
  https://console.cloud.google.com/apis/library/people.googleapis.com

---

## 4. OAuth 同意画面の設定

1. https://console.cloud.google.com/apis/credentials/consent にアクセス
2. User Type: **「外部」** を選択して「作成」
3. 以下を入力:
   - アプリ名: `Calendar Slot Finder`
   - ユーザーサポートメール: 自分のメールアドレス
   - デベロッパー連絡先メール: 自分のメールアドレス
4. 「保存して次へ」をクリック
5. スコープ画面: そのまま「保存して次へ」
6. テストユーザー画面:
   - 「ユーザーを追加」をクリック
   - 自分のGmailアドレスを追加
   - 「保存して次へ」
7. 概要画面: 「ダッシュボードに戻る」

---

## 5. OAuth クライアント ID の作成

1. https://console.cloud.google.com/apis/credentials にアクセス
2. 「認証情報を作成」→「OAuth クライアント ID」をクリック
3. アプリケーションの種類: **「Chrome 拡張機能」** を選択
4. 名前: `Calendar Slot Finder`
5. アイテム ID: **Step 1でメモした拡張機能ID**（32文字の英小文字）を入力
6. 「作成」をクリック
7. 表示される **クライアント ID** をコピー
   （例: `123456789-abcdefg.apps.googleusercontent.com`）

---

## 6. 拡張機能にクライアント ID を設定

ターミナルで以下を実行（Claude Code に依頼可能）:

クライアントIDを `src/manifest.ts` の `YOUR_CLIENT_ID.apps.googleusercontent.com` に置き換え

```bash
# 例:
# YOUR_CLIENT_ID を実際のクライアントIDに置換
```

その後:
```bash
npm run build
```

Chrome の `chrome://extensions` で拡張機能の更新ボタン（丸い矢印）をクリック。

---

## 7. 動作確認

1. Chrome ツールバーの Calendar Slot Finder アイコンをクリック
2. 初回は Google アカウントの認証画面が表示される
3. 「許可」をクリックして認証
4. 目的を選択 → メンバーを追加 → 検索条件を設定 → 検索

---

## 更新履歴

### v3.1 (2026-02-24) UX改善

- **結果画面のボタン固定**: 「カレンダーに表示」「共有」ボタンがスクロールしても画面下部に固定表示されるようになった
- **お気に入りグループ追加ボタンの視認性向上**: 選択済みメンバーの横にグループ追加ボタンが独立表示され、見つけやすくなった
- **検索候補にグループ追加ボタン追加**: メンバー検索のドロップダウン内から直接グループに追加可能に
- **ビルド設定修正**: Chrome拡張でアセットパスが正しく解決されるよう `vite.config.ts` に `base: ''` を追加

---

## トラブルシューティング

### 「このアプリはGoogleで確認されていません」と表示される
- テスト段階では正常です。「詳細」→「（アプリ名）に移動（安全ではないページ）」をクリック

### 認証エラーが出る
- クライアントIDが正しいか確認
- 拡張機能IDがOAuthクライアントIDの設定と一致しているか確認
- テストユーザーに自分のメールアドレスが追加されているか確認

### 「このユーザーの予定を参照する権限がありません」
- Google Workspace の同じ組織内のユーザー、または自分にカレンダーを共有しているユーザーのみ参照可能
