"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface AddRevenueForm {
  mangaId: string;
  amount: string;
  type: "ad_view" | "tip" | "subscription_share";
  description: string;
}

export function AdminRevenueActions() {
  const [form, setForm] = useState<AddRevenueForm>({
    mangaId: "",
    amount: "",
    type: "ad_view",
    description: "",
  });
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [addError, setAddError] = useState("");

  const [distributeStatus, setDistributeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [distributeMsg, setDistributeMsg] = useState("");

  async function handleAddRevenue(e: React.FormEvent) {
    e.preventDefault();
    setAddStatus("loading");
    setAddError("");

    const amount = parseFloat(form.amount);
    if (!form.mangaId || isNaN(amount) || amount <= 0) {
      setAddError("漫画IDと正の金額を入力してください");
      setAddStatus("error");
      return;
    }

    try {
      const res = await fetch("/api/admin/revenue/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mangaId: form.mangaId,
          amount,
          type: form.type,
          description: form.description || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "エラーが発生しました");
      }

      setAddStatus("success");
      setForm({ mangaId: "", amount: "", type: "ad_view", description: "" });
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "エラーが発生しました");
      setAddStatus("error");
    }
  }

  async function handleDistribute() {
    if (!confirm("収益分配を実行しますか？")) return;
    setDistributeStatus("loading");
    setDistributeMsg("");

    try {
      const res = await fetch("/api/admin/revenue/distribute", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "エラーが発生しました");

      setDistributeMsg(data.message);
      setDistributeStatus("success");
    } catch (err) {
      setDistributeMsg(err instanceof Error ? err.message : "エラーが発生しました");
      setDistributeStatus("error");
    }
  }

  async function handleSheetsExport() {
    alert("Sheets連携: GAS_WEBHOOK_URLを設定後に有効になります");
  }

  return (
    <div className="mb-8 space-y-6">
      {/* Distribute and Sheets buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleDistribute}
          disabled={distributeStatus === "loading"}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          )}
        >
          {distributeStatus === "loading" ? (
            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
            </svg>
          )}
          収益分配を実行
        </button>

        <button
          onClick={handleSheetsExport}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125V9.75M6 18.375V9.75m0 0h12.75M6 9.75a.375.375 0 0 0-.375.375v2.25c0 .207.168.375.375.375h12.75a.375.375 0 0 0 .375-.375V10.125A.375.375 0 0 0 18.75 9.75H6Z" />
          </svg>
          Sheets へエクスポート
        </button>
      </div>

      {distributeMsg && (
        <p
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm",
            distributeStatus === "success"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
          )}
        >
          {distributeMsg}
        </p>
      )}

      {/* Add revenue form */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          手動収益追加
        </h2>

        <form onSubmit={handleAddRevenue} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              漫画 ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.mangaId}
              onChange={(e) => setForm((f) => ({ ...f, mangaId: e.target.value }))}
              placeholder="cuid..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              金額（円）<span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0"
              min="0.01"
              step="0.01"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              種別
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as AddRevenueForm["type"],
                }))
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
            >
              <option value="ad_view">広告収益</option>
              <option value="tip">チップ</option>
              <option value="subscription_share">サブスク分配</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              説明（任意）
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="追加メモ..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-4">
            <button
              type="submit"
              disabled={addStatus === "loading"}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {addStatus === "loading" ? "追加中..." : "収益を追加"}
            </button>

            {addStatus === "success" && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">
                追加しました
              </span>
            )}

            {addStatus === "error" && (
              <span className="text-sm text-red-500">{addError}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
