# 現状スナップショット — 2026-06-02

## 実装済み機能（14/14 完了）

| 機能 | ステータス | 備考 |
|------|-----------|------|
| AI漫画生成（FLUX.2） | ✅ 実装済み | ComfyUI未起動時はモック画像返却 |
| 漫画投稿・アップロード | ✅ 実装済み | drag&drop + sharp最適化 |
| 審査システム | ✅ 実装済み | 管理者ダッシュボードで承認/却下 |
| パブリックギャラリー | ✅ 実装済み | 検索・フィルター・ランキング |
| スコア制間引き | ✅ 実装済み | 30日+スコア<10 → culled |
| 収益表示 | ✅ 実装済み | CPM=0.5円/1000view（要確認） |
| SNS自動動画投稿 | ✅ 実装済み | Puppeteer（認証情報は空） |
| GAS+Sheets連携 | ✅ 実装済み | Service Account未設定 |
| 管理者ダッシュボード | ✅ 実装済み | 審査/ユーザー/収益/スコア管理 |
| バックグラウンドワーカー | ✅ 実装済み | Prisma Jobキュー + PM2 |
| 認証（NextAuth v5） | ✅ 実装済み | JWT + mustChangePassword |
| ffmpeg動画生成 | ✅ 実装済み | Ken Burns + TikTok/Instagram形式 |
| フロントエンドUI | ✅ 実装済み | ランディング・ダッシュボード等 |
| Xserverデプロイ設定 | ✅ 実装済み | GitHub Actions CI/CD + PM2 |

## セキュリティ対応（完了）
- [x] git履歴トークン混入: **ゼロ確認**
- [x] git remote URL: **平文トークン除去済み**
- [x] admin1234平文: **廃止（ADMIN_INIT_PASSWORD env化）**
- [x] mustChangePassword: **実装済み（初回強制変更）**
- [x] .env追跡: **なし（gitignore確認済み）**
- [x] dependabot.yml: **追加済み**
- [x] npm audit: **high/critical ゼロ（moderate 6件は許容）**

## エスカレ待ち（ユーザー確認5件）
1. **GitHub PAT** — Contents: Read & write 権限付きで再発行
2. **FLUX.2モデル認証** — Hugging Face token + ComfyUIセットアップ
3. **SNSアカウント認証** — Twitter/X・Instagram 認証情報
4. **Xserver本番環境** — ドメイン・MySQL・NEXTAUTH_URL
5. **収益単価確定** — CPM率・最低支払額（現在は仮値）

## Tech Stack
- Next.js 16.2 + TypeScript + Tailwind CSS
- Prisma v7 + SQLite（dev）/ MySQL（Xserver本番）
- NextAuth v5 beta
- Node.js 22 / PM2
- GitHub: gaihekitosoukuraberu/buzz-comic-main

## ローカル起動
```bash
cd ~/projects/buzz-comic-main
cp .env.local.example .env.local  # 値を設定
ADMIN_INIT_PASSWORD=<任意> npx prisma db seed
npm run dev
# http://localhost:3000
```
