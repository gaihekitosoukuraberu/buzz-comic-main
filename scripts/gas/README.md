# Google Apps Script セットアップ手順

## 概要

`BuzzComicGAS.js` は Buzz Comic と Google Sheets を連携するための GAS コードです。

## 事前準備

### 1. Google Sheets スプレッドシートの作成

1. [Google Sheets](https://sheets.google.com) で新しいスプレッドシートを作成
2. スプレッドシートの URL からIDを取得:
   ```
   https://docs.google.com/spreadsheets/d/【SPREADSHEET_ID】/edit
   ```
3. このIDを `.env.local` の `SHEETS_SPREADSHEET_ID` に設定

### 2. Google Cloud Service Account の作成

1. [Google Cloud Console](https://console.cloud.google.com) でプロジェクトを開く
2. 「IAM と管理」→「サービスアカウント」→「サービスアカウントを作成」
3. サービスアカウントのメールアドレスをコピー（例: `buzz-comic@project.iam.gserviceaccount.com`）
4. キーを作成: 「キー」タブ→「キーを追加」→「JSON」
5. ダウンロードした JSON から以下を `.env.local` に設定:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL="xxx@xxx.iam.gserviceaccount.com"
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
6. Google Sheets Spreadsheet のサービスアカウントへの共有:
   - スプレッドシートを開く
   - 「共有」→サービスアカウントのメールアドレスを追加（編集者権限）

### 3. Google Apps Script のセットアップ

1. [script.google.com](https://script.google.com) にアクセス
2. 「新しいプロジェクト」をクリック
3. `BuzzComicGAS.js` の内容を `コード.gs` にペースト
4. ファイル先頭の設定を変更:
   ```javascript
   const BUZZ_COMIC_API = 'https://your-domain.xserver.jp'; // 実際のドメインに変更
   const ADMIN_EMAIL = 'ryuryuyamauchi@gmail.com';          // 管理者メールアドレス
   const GAS_WEBHOOK_SECRET = 'your-secret-here';           // Webhookシークレット（任意）
   ```

### 4. トリガーの設定

1. GAS エディタで `setupTriggers` 関数を選択して実行
2. Google アカウントの権限を許可
3. 「トリガー」画面で毎日午前8時のトリガーが設定されていることを確認

### 5. Webhook シークレットの設定（任意）

セキュリティ強化のため、Webhook シークレットを設定することを推奨します。

1. ランダムな文字列を生成（例: `openssl rand -hex 32`）
2. `.env.local` に追加:
   ```
   GAS_WEBHOOK_SECRET="your-generated-secret"
   ```
3. GAS の `GAS_WEBHOOK_SECRET` にも同じ値を設定

## 環境変数の設定

`.env.local` に以下を追加してください:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=""
GOOGLE_PRIVATE_KEY=""
SHEETS_SPREADSHEET_ID=""
GAS_WEBHOOK_SECRET=""
```

## GAS の手動テスト

GAS エディタで以下の関数を手動実行してテストできます:

| 関数名 | 説明 |
|--------|------|
| `testConnection()` | API への接続確認 |
| `testPendingCheck()` | 審査待ち確認テスト |
| `testManualSync()` | 全データ同期テスト |
| `setupTriggers()` | トリガーの再設定 |
| `createPreviousMonthReport()` | 先月の月次レポート生成 |

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/sheets/sync` | GET | 設定状況の確認 |
| `/api/sheets/sync` | POST | データ同期 |
| `/api/sheets/webhook` | GET | Webhook 疎通確認 |
| `/api/sheets/webhook` | POST | GAS からの通知受信 |

### 同期タイプ

```json
{ "type": "manga" }           // 漫画データのみ
{ "type": "revenue" }         // 収益データのみ
{ "type": "users" }           // ユーザーデータのみ
{ "type": "all" }             // 全データ
{ "type": "monthly_report", "year": 2026, "month": 6 }  // 月次レポート
```

## Sheets のシート構成

自動で以下のシートが作成されます:

| シート名 | 内容 |
|---------|------|
| 漫画一覧 | 全漫画データ |
| 収益データ | 全収益レコード |
| ユーザー一覧 | 全ユーザーデータ |
| 月次レポート_YYYYMM | 月次統計レポート |

## トラブルシューティング

### 「Sheets未設定のためスキップ」と表示される

環境変数が未設定です。`.env.local` を確認してください。

### GAS から API に接続できない

- `BUZZ_COMIC_API` の URL が正しいか確認
- サーバーが起動しているか確認
- ファイアウォール/CORS 設定を確認

### 「認証に失敗しました」(401)

`GAS_WEBHOOK_SECRET` が GAS と `.env.local` で一致しているか確認してください。
