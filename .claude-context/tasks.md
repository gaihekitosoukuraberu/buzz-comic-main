# タスク台帳 — Buzz Comic

## 凡例
- P0: セキュリティ/データ破壊/停止リスク → 即時
- P1: 機能不全/本番影響 → 当日中
- P2: 改善/技術的負債 → 次スプリント

---

## 完了済み ✅

| ID | 優先度 | タスク | 完了日 |
|----|--------|--------|--------|
| T001 | P1 | Next.js 14 ブートストラップ + 全パッケージ | 2026-06-02 |
| T002 | P1 | Prismaスキーマ + SQLite DB（14テーブル）+ seed | 2026-06-02 |
| T003 | P1 | NextAuth v5 認証・ログイン/登録画面 | 2026-06-02 |
| T004 | P1 | FLUX.2/ComfyUI生成モジュール（モックfallback付き） | 2026-06-02 |
| T005 | P1 | 漫画アップロード・ストレージ・CRUD API | 2026-06-02 |
| T006 | P1 | パブリックギャラリー・縦スクロールビューワー・ランキング | 2026-06-02 |
| T007 | P1 | 管理者審査ダッシュボード | 2026-06-02 |
| T008 | P1 | スコアエンジン + Cron間引きシステム | 2026-06-02 |
| T009 | P1 | 収益表示システム（CPM・SVGチャート） | 2026-06-02 |
| T010 | P1 | ffmpeg動画生成パイプライン | 2026-06-02 |
| T011 | P1 | Puppeteer SNS自動投稿（Twitter/X・Instagram） | 2026-06-02 |
| T012 | P1 | GAS + Google Sheets連携 | 2026-06-02 |
| T013 | P1 | フロントエンドUI・ランディングページ | 2026-06-02 |
| T014 | P1 | バックグラウンドワーカー + ジョブキュー（PM2対応） | 2026-06-02 |
| T015 | P1 | Xserverデプロイ設定 + GitHub Actions CI/CD | 2026-06-02 |
| T016 | P0 | git remote URLからトークン除去 | 2026-06-02 |
| T017 | P0 | admin1234平文廃止 → ADMIN_INIT_PASSWORD + mustChangePassword | 2026-06-02 |
| T018 | P0 | Edge Runtime対応ミドルウェア修正 | 2026-06-02 |
| T019 | P1 | dependabot.yml + CIにnpm audit --audit-level=high | 2026-06-02 |
| T020 | P1 | POLICY-V5 移植（CLAUDE.md） | 2026-06-02 |

---

## 未完了 / エスカレ待ち 🔴

| ID | 優先度 | タスク | ブロッカー |
|----|--------|--------|-----------|
| T021 | P0 | GitHub PAT 再発行（Contents: Read & write） | ユーザー操作: GitHubでContents書き込み権限付与 |
| T022 | P1 | Xserver初回セットアップ + 本番env設定 | ユーザー確認: ドメイン・DATABASE_URL(MySQL) |
| T023 | P1 | FLUX.2モデルのComfyUIセットアップ | ユーザー確認: Hugging Face認証 |
| T024 | P1 | SNS自動投稿 本番設定 | ユーザー確認: Twitter/Instagram認証情報 |
| T025 | P1 | Google Sheets / GAS本番接続 | ユーザー確認: Service Account作成・Spreadsheet ID |
| T026 | P2 | 収益単価・分配率確定 → env更新 | ユーザー確認: 価格・法務確定 |
| T027 | P2 | 本番MySQLマイグレーション | T022依存 |
| T028 | P2 | GitHub Actions Secrets登録 | T021依存 |
