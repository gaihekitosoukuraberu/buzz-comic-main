@AGENTS.md

# POLICY-V5 — Buzz Comic 開発規約

## 絶対禁止
- `~/projects/kuraberu-main` への一切のアクセス禁止
- `api.anthropic.com` への直接呼び出し禁止
- 外部API課金が発生する実装禁止（無料枠超え・有料Tier使用）
- `.env.local` / シークレット値をコードや会話にそのまま出力しない
- トークン・パスワードのgit管理（gitignore確認必須）

## タスク採番ルール（P0/P1/P2）
- **P0**: セキュリティ・データ破壊・サービス停止リスク → 即時対応・他より優先
- **P1**: 機能不全・本番影響あり → 当日中
- **P2**: 改善・技術的負債 → 次スプリント

## 3層データ保護
1. 本番DB（Xserver MySQL）への直接編集禁止 → 必ずマイグレーション経由
2. 破壊的操作（テーブル削除・データ消去）は必ずユーザー確認後に実行
3. `prisma db push` は開発DBのみ。本番は `prisma migrate deploy`

## ユーザー確認が必要な項目（自律判断不可）
- 送金 / 新規ドメイン取得・支払い
- FLUX.2モデル認証（Hugging Face）
- SNSアカウント認証（Twitter/X・Instagram）
- 価格・分配率の確定
- 法務確定稿
- 外部API課金が発生する変更

## 完了報告の必須要件
各タスク完了時は必ず以下を含む実動作証跡を添付：
- ビルドログ（`npm run build` 成功確認）
- HTTPレスポンス（`curl` 出力）
- 型チェック（`tsc --noEmit` 通過）

## コスト制約
- MAX定額内で運用（トークン消費に注意）
- ローカル生成（FLUX.2/ffmpeg）を優先
- 外部SaaS APIはゼロコスト枠内のみ

## セキュリティ基準
- 平文パスワードをコードに書かない（env var + bcrypt必須）
- git remote URLにトークンを含めない（credential store使用）
- `mustChangePassword` フラグでseed初期パスワードを強制変更
- GitHub Actions Secretsを使用（コードにシークレット値直書き禁止）
