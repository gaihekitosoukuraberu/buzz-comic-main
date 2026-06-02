"use client";

import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type SyncType = "manga" | "revenue" | "users" | "all" | "monthly_report";

type SyncResult = {
  success: boolean;
  rowsWritten: number;
  message: string;
  skipped?: boolean;
};

type SyncResponse = {
  type: SyncType;
  result: SyncResult | Record<string, SyncResult>;
  syncedAt: string;
};

type SheetsStatus = {
  configured: boolean;
  spreadsheetId: string | null;
  message: string;
};

const syncButtons: { type: SyncType; label: string; description: string }[] = [
  { type: "manga", label: "漫画データ", description: "全漫画情報を同期" },
  { type: "revenue", label: "収益データ", description: "全収益レコードを同期" },
  { type: "users", label: "ユーザーデータ", description: "全ユーザー情報を同期" },
  { type: "all", label: "全データ", description: "漫画・収益・ユーザーを一括同期" },
  { type: "monthly_report", label: "月次レポート", description: "今月の月次レポートを生成" },
];

export default function SheetsSync() {
  const [status, setStatus] = useState<SheetsStatus | null>(null);
  const [lastSync, setLastSync] = useState<SyncResponse | null>(null);
  const [loading, setLoading] = useState<SyncType | "status" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkStatus() {
    setLoading("status");
    setError(null);
    try {
      const res = await fetch("/api/sheets/sync");
      const data: SheetsStatus = await res.json();
      setStatus(data);
    } catch {
      setError("設定状況の確認に失敗しました");
    } finally {
      setLoading(null);
    }
  }

  async function handleSync(type: SyncType) {
    setLoading(type);
    setError(null);
    try {
      const body: Record<string, unknown> = { type };
      if (type === "monthly_report") {
        const now = new Date();
        body.year = now.getFullYear();
        body.month = now.getMonth() + 1;
      }

      const res = await fetch("/api/sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const data: SyncResponse = await res.json();
      setLastSync(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "同期に失敗しました");
    } finally {
      setLoading(null);
    }
  }

  function renderResult(result: SyncResult | Record<string, SyncResult>) {
    if ("success" in result) {
      const r = result as SyncResult;
      return (
        <div
          className={cn(
            "rounded-lg p-3 text-sm",
            r.skipped
              ? "bg-gray-50 text-gray-600"
              : r.success
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
          )}
        >
          <span className="font-medium">{r.skipped ? "スキップ" : r.success ? "成功" : "失敗"}</span>
          {" - "}
          {r.message}
          {!r.skipped && r.success && (
            <span className="ml-2 text-xs text-gray-500">({r.rowsWritten} 行)</span>
          )}
        </div>
      );
    }

    // Record<string, SyncResult>
    const entries = Object.entries(result as Record<string, SyncResult>);
    return (
      <div className="space-y-2">
        {entries.map(([key, r]) => (
          <div key={key} className="flex items-start gap-2">
            <span className="w-20 shrink-0 text-xs font-medium text-gray-500">{key}</span>
            <div
              className={cn(
                "flex-1 rounded p-2 text-xs",
                r.skipped
                  ? "bg-gray-50 text-gray-600"
                  : r.success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
              )}
            >
              {r.skipped ? "スキップ" : r.success ? "成功" : "失敗"} - {r.message}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 設定状況 */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Google Sheets 接続設定</h3>
            {status && (
              <p
                className={cn(
                  "mt-1 text-xs",
                  status.configured ? "text-green-600" : "text-amber-600"
                )}
              >
                {status.message}
                {status.spreadsheetId && (
                  <span className="ml-2 font-mono text-gray-500">
                    ID: {status.spreadsheetId}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={checkStatus}
            disabled={loading === "status"}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading === "status" ? "確認中..." : "設定確認"}
          </button>
        </div>

        {status !== null && (
          <div
            className={cn(
              "mt-3 flex items-center gap-2 rounded-lg p-2 text-xs",
              status.configured
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                status.configured ? "bg-green-500" : "bg-amber-400"
              )}
            />
            {status.configured ? "接続済み" : "未設定 - 環境変数を設定してください"}
          </div>
        )}
      </div>

      {/* 同期ボタン */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">手動同期</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {syncButtons.map(({ type, label, description }) => (
            <button
              key={type}
              onClick={() => handleSync(type)}
              disabled={loading !== null}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-50",
                type === "all"
                  ? "border-blue-200 bg-blue-50 hover:bg-blue-100"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{label}</span>
                {loading === type && (
                  <svg
                    className="h-4 w-4 animate-spin text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="font-medium">エラー:</span> {error}
        </div>
      )}

      {/* 同期結果 */}
      {lastSync && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">最終同期結果</h3>
            <span className="text-xs text-gray-400">
              {format(new Date(lastSync.syncedAt), "yyyy/MM/dd HH:mm:ss")}
            </span>
          </div>
          <div className="mb-2">
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {lastSync.type}
            </span>
          </div>
          {renderResult(lastSync.result)}
        </div>
      )}

      {/* 補足 */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500">
        <p className="font-medium text-gray-700">自動同期について</p>
        <p className="mt-1">
          Google Apps Script (GAS) による自動同期が毎日午前8時に実行されます。
          手動で即時同期したい場合は上記のボタンを使用してください。
        </p>
        <p className="mt-1">
          設定手順は{" "}
          <code className="rounded bg-gray-100 px-1 font-mono">scripts/gas/README.md</code>{" "}
          を参照してください。
        </p>
      </div>
    </div>
  );
}
