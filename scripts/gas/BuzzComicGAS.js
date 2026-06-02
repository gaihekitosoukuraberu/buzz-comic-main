// =====================================================
// Buzz Comic - Google Apps Script
// =====================================================
// 機能:
//   - トリガー: 毎日実行（全データ同期 + 審査待ち確認）
//   - 月初: 月次レポート自動生成
//   - 審査待ち漫画があればメール通知
//
// セットアップ: scripts/gas/README.md を参照
// =====================================================

const BUZZ_COMIC_API = 'https://your-domain.xserver.jp'; // 後で設定
const ADMIN_EMAIL = 'ryuryuyamauchi@gmail.com';
const GAS_WEBHOOK_SECRET = ''; // オプション: 環境変数から設定する場合はここに記述

// =====================================================
// メインエントリポイント（毎日のトリガー）
// =====================================================
function dailySync() {
  Logger.log('[BuzzComicGAS] dailySync 開始: ' + new Date().toISOString());

  try {
    // 1. 全データをSheetsに同期
    syncAllData();

    // 2. 審査待ち漫画をチェックしてメール通知
    checkPendingReviews();

    // 3. 月初なら月次レポートを生成
    const today = new Date();
    if (today.getDate() === 1) {
      Logger.log('[BuzzComicGAS] 月初のため月次レポートを生成します');
      createPreviousMonthReport();
    }

    Logger.log('[BuzzComicGAS] dailySync 完了');
  } catch (e) {
    Logger.log('[BuzzComicGAS] dailySync エラー: ' + e.toString());
    sendErrorEmail('dailySync エラー', e.toString());
  }
}

// =====================================================
// データ同期
// =====================================================
function syncAllData() {
  Logger.log('[BuzzComicGAS] 全データ同期開始');

  const url = BUZZ_COMIC_API + '/api/sheets/sync';
  const payload = JSON.stringify({ type: 'all' });

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const body = response.getContentText();

  if (statusCode !== 200) {
    Logger.log('[BuzzComicGAS] 同期エラー: HTTP ' + statusCode + ' - ' + body);
    throw new Error('データ同期に失敗しました: HTTP ' + statusCode);
  }

  const result = JSON.parse(body);
  Logger.log('[BuzzComicGAS] 同期完了: ' + JSON.stringify(result));

  return result;
}

function syncMangaOnly() {
  return syncData('manga');
}

function syncRevenueOnly() {
  return syncData('revenue');
}

function syncUsersOnly() {
  return syncData('users');
}

function syncData(type) {
  Logger.log('[BuzzComicGAS] ' + type + ' 同期開始');

  const url = BUZZ_COMIC_API + '/api/sheets/sync';
  const payload = JSON.stringify({ type: type });

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();

  if (statusCode !== 200) {
    throw new Error(type + ' 同期に失敗しました: HTTP ' + statusCode);
  }

  return JSON.parse(response.getContentText());
}

// =====================================================
// 審査待ちチェック & メール通知
// =====================================================
function checkPendingReviews() {
  Logger.log('[BuzzComicGAS] 審査待ちチェック開始');

  const url = BUZZ_COMIC_API + '/api/sheets/webhook';
  const payload = JSON.stringify({
    event: 'pending_review_check',
    secret: GAS_WEBHOOK_SECRET,
    timestamp: new Date().toISOString(),
  });

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();

  if (statusCode !== 200) {
    Logger.log('[BuzzComicGAS] 審査待ちチェック失敗: HTTP ' + statusCode);
    return;
  }

  const result = JSON.parse(response.getContentText());
  const pendingCount = result.pendingCount || 0;

  Logger.log('[BuzzComicGAS] 審査待ち件数: ' + pendingCount);

  if (pendingCount > 0) {
    sendPendingReviewEmail(pendingCount, result.pendingMangas || []);
  }
}

function sendPendingReviewEmail(pendingCount, pendingMangas) {
  const subject = '[Buzz Comic] 審査待ち漫画 ' + pendingCount + '件のお知らせ';

  let body = 'Buzz Comic 管理者の皆様\n\n';
  body += '審査待ちの漫画が ' + pendingCount + ' 件あります。\n\n';
  body += '--- 審査待ち漫画一覧 ---\n';

  pendingMangas.slice(0, 10).forEach(function(manga, index) {
    body += (index + 1) + '. ' + manga.title + '\n';
    body += '   作者: ' + manga.authorName + ' (' + manga.authorEmail + ')\n';
    body += '   投稿日: ' + new Date(manga.createdAt).toLocaleString('ja-JP') + '\n';
    body += '   URL: ' + BUZZ_COMIC_API + '/admin/review\n\n';
  });

  if (pendingCount > 10) {
    body += '... 他 ' + (pendingCount - 10) + ' 件\n';
  }

  body += '\n管理画面: ' + BUZZ_COMIC_API + '/admin/review\n';
  body += '\n---\nBuzz Comic 自動通知システム\n送信日時: ' + new Date().toLocaleString('ja-JP');

  GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
  Logger.log('[BuzzComicGAS] 審査待ちメール送信完了: ' + pendingCount + '件');
}

// =====================================================
// 月次レポート
// =====================================================
function createPreviousMonthReport() {
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const year = lastMonth.getFullYear();
  const month = lastMonth.getMonth() + 1;

  createMonthlyReport(year, month);
}

function createMonthlyReport(year, month) {
  Logger.log('[BuzzComicGAS] 月次レポート作成: ' + year + '年' + month + '月');

  const url = BUZZ_COMIC_API + '/api/sheets/sync';
  const payload = JSON.stringify({
    type: 'monthly_report',
    year: year,
    month: month,
  });

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const body = response.getContentText();

  if (statusCode !== 200) {
    Logger.log('[BuzzComicGAS] 月次レポート作成エラー: HTTP ' + statusCode);
    return;
  }

  const result = JSON.parse(body);
  Logger.log('[BuzzComicGAS] 月次レポート作成完了: ' + JSON.stringify(result));

  // レポート完成メールを送信
  sendMonthlyReportEmail(year, month, result);
}

function sendMonthlyReportEmail(year, month, result) {
  const monthStr = year + '年' + String(month).padStart(2, '0') + '月';
  const subject = '[Buzz Comic] ' + monthStr + ' 月次レポート作成完了';

  let body = 'Buzz Comic 管理者の皆様\n\n';
  body += monthStr + ' の月次レポートが作成されました。\n\n';
  body += 'スプレッドシートでご確認ください。\n\n';
  body += '結果: ' + JSON.stringify(result, null, 2) + '\n\n';
  body += '---\nBuzz Comic 自動通知システム\n送信日時: ' + new Date().toLocaleString('ja-JP');

  GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
  Logger.log('[BuzzComicGAS] 月次レポートメール送信完了');
}

// =====================================================
// エラー通知
// =====================================================
function sendErrorEmail(subject, errorMessage) {
  const fullSubject = '[Buzz Comic] エラー通知: ' + subject;
  const body = 'Buzz Comic GAS でエラーが発生しました。\n\n' +
    'エラー内容:\n' + errorMessage + '\n\n' +
    '発生日時: ' + new Date().toLocaleString('ja-JP') + '\n\n' +
    '---\nBuzz Comic 自動通知システム';

  try {
    GmailApp.sendEmail(ADMIN_EMAIL, fullSubject, body);
  } catch (e) {
    Logger.log('[BuzzComicGAS] エラーメール送信失敗: ' + e.toString());
  }
}

// =====================================================
// トリガーのセットアップ（初回のみ手動実行）
// =====================================================
function setupTriggers() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });

  // 毎日午前8時に実行
  ScriptApp.newTrigger('dailySync')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();

  Logger.log('[BuzzComicGAS] トリガーを設定しました: 毎日午前8時');
}

// =====================================================
// テスト用関数（手動実行可能）
// =====================================================
function testConnection() {
  Logger.log('[BuzzComicGAS] API接続テスト: ' + BUZZ_COMIC_API);

  const url = BUZZ_COMIC_API + '/api/sheets/sync';
  const options = {
    method: 'get',
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log('ステータス: ' + response.getResponseCode());
    Logger.log('レスポンス: ' + response.getContentText());
  } catch (e) {
    Logger.log('接続エラー: ' + e.toString());
  }
}

function testPendingCheck() {
  checkPendingReviews();
}

function testManualSync() {
  syncAllData();
}
