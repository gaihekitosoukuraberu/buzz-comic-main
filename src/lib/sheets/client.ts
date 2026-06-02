import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";

// Google Sheets クライアント
// Service Account 認証を使用
// GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY / SHEETS_SPREADSHEET_ID が未設定の場合は graceful に失敗

export type SheetsClient = sheets_v4.Sheets;

let _client: SheetsClient | null = null;

function isSheetsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.SHEETS_SPREADSHEET_ID
  );
}

export function getSheetsClient(): SheetsClient | null {
  if (!isSheetsConfigured()) {
    return null;
  }

  if (_client) return _client;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    _client = google.sheets({ version: "v4", auth });
    return _client;
  } catch (error) {
    console.error("[sheets/client] Failed to initialize Google Sheets client:", error);
    return null;
  }
}

export function getSpreadsheetId(): string | null {
  return process.env.SHEETS_SPREADSHEET_ID ?? null;
}

// シートに値を書き込む
export async function writeToSheet(
  range: string,
  values: (string | number | boolean | null)[][]
): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets || !spreadsheetId) {
    console.warn("[sheets/client] Sheets not configured, skipping write to:", range);
    return false;
  }

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    return true;
  } catch (error) {
    console.error(`[sheets/client] Failed to write to range ${range}:`, error);
    return false;
  }
}

// シートの値を読み込む
export async function readFromSheet(
  range: string
): Promise<(string | number | boolean | null)[][] | null> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets || !spreadsheetId) {
    console.warn("[sheets/client] Sheets not configured, skipping read from:", range);
    return null;
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return (response.data.values as (string | number | boolean | null)[][]) ?? [];
  } catch (error) {
    console.error(`[sheets/client] Failed to read from range ${range}:`, error);
    return null;
  }
}

// シートをクリアしてから書き込む
export async function clearAndWriteToSheet(
  range: string,
  values: (string | number | boolean | null)[][]
): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets || !spreadsheetId) {
    console.warn("[sheets/client] Sheets not configured, skipping clearAndWrite to:", range);
    return false;
  }

  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    return true;
  } catch (error) {
    console.error(`[sheets/client] Failed to clearAndWrite to range ${range}:`, error);
    return false;
  }
}

// シートが存在しない場合は追加する
export async function ensureSheet(title: string): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  if (!sheets || !spreadsheetId) {
    return false;
  }

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existing = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === title
    );

    if (!existing) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title },
              },
            },
          ],
        },
      });
    }
    return true;
  } catch (error) {
    console.error(`[sheets/client] Failed to ensure sheet "${title}":`, error);
    return false;
  }
}
