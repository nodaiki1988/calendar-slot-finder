# Lessons Learned

## 2026-02-24: v3.1 UX改善

### Vite base パス設定 (重要)
- **問題**: Chrome拡張のビルドで `index.html` 内のスクリプトパスが `/assets/...`（絶対パス）になり、拡張が動かない
- **原因**: Vite のデフォルト `base` が `/` のため
- **修正**: `vite.config.ts` に `base: ''` を追加 → 相対パス `../../assets/...` が生成される
- **教訓**: Chrome拡張ではファイルシステムのルートが存在しないため、絶対パスは使えない。Viteでビルドする場合は必ず `base: ''` を設定すること

### スティッキーフッターのパターン
- Chrome拡張のポップアップ（maxHeight制限あり）でボタンを固定するには:
  - 親に `display: flex; flexDirection: column; flex: 1; minHeight: 0`
  - スクロール領域に `flex: 1; overflowY: auto`
  - フッターに `position: sticky; bottom: 0; bgcolor: background.paper`
- App.tsx 側でも flex コンテナを設定しないと、ResultList 内の sticky が効かない

### Chip内のIconButtonは見つけにくい
- MUIの `Chip` の `label` 内に小さな `IconButton` を埋め込むと、ユーザーが気づかない
- Chip の外側に独立した `IconButton` として配置し、サイズを少し大きくする方が良い

### worktree運用
- マージ済みのworktreeを削除する際、`node_modules` がuntrackedとして残るため `--force` が必要
- featureブランチはマージ後に `git branch -d` で削除すること
