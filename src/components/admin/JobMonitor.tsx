"use client";

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobInfo {
  id: string;
  type: string;
  status: "pending" | "running" | "done" | "failed" | "cancelled";
  mangaId: string | null;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  runAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface StatusCounts {
  pending: number;
  running: number;
  done: number;
  failed: number;
  cancelled: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<JobInfo["status"], string> = {
  pending: "待機中",
  running: "実行中",
  done: "完了",
  failed: "失敗",
  cancelled: "キャンセル",
};

const STATUS_COLORS: Record<JobInfo["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
};

const TYPE_LABELS: Record<string, string> = {
  flux_generate: "画像生成",
  video_generate: "動画生成",
  sns_post: "SNS投稿",
  score_calc: "スコア計算",
  sheets_sync: "Sheets同期",
};

function formatDate(iso: string | null): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getProgress(job: JobInfo): number {
  if (job.status === "done") return 100;
  if (job.status === "failed" || job.status === "cancelled") return 0;
  const p = job.payload?.progress;
  return typeof p === "number" ? p : 0;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: JobInfo["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function CountCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm mt-1">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface JobMonitorProps {
  autoRefreshInterval?: number; // ms, default 5000
}

export default function JobMonitor({ autoRefreshInterval = 5_000 }: JobMonitorProps) {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({ pending: 0, running: 0, done: 0, failed: 0, cancelled: 0 });
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<JobInfo["status"] | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filter) params.set("status", filter);

      const res = await fetch(`/api/admin/jobs?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as {
        jobs: JobInfo[];
        total: number;
        counts: StatusCounts;
      };
      setJobs(data.jobs);
      setTotal(data.total);
      setCounts(data.counts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Initial load + filter change
  useEffect(() => {
    setLoading(true);
    void fetchJobs();
  }, [fetchJobs]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => void fetchJobs(), autoRefreshInterval);
    return () => clearInterval(id);
  }, [autoRefresh, autoRefreshInterval, fetchJobs]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/admin/jobs/retry", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchJobs();
    } catch (err) {
      alert(`再試行に失敗: ${err instanceof Error ? err.message : err}`);
    } finally {
      setRetrying(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm("完了・キャンセル済みジョブ（7日以上前）を削除しますか？")) return;
    setCleaning(true);
    try {
      const res = await fetch("/api/admin/jobs/cleanup", { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { deleted: number };
      alert(`${data.deleted} 件のジョブを削除しました`);
      await fetchJobs();
    } catch (err) {
      alert(`削除に失敗: ${err instanceof Error ? err.message : err}`);
    } finally {
      setCleaning(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchJobs();
    } catch (err) {
      alert(`キャンセルに失敗: ${err instanceof Error ? err.message : err}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status counts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <CountCard label="待機中" count={counts.pending} color="border-yellow-300 bg-yellow-50" />
        <CountCard label="実行中" count={counts.running} color="border-blue-300 bg-blue-50" />
        <CountCard label="完了" count={counts.done} color="border-green-300 bg-green-50" />
        <CountCard label="失敗" count={counts.failed} color="border-red-300 bg-red-50" />
        <CountCard label="キャンセル" count={counts.cancelled} color="border-gray-300 bg-gray-50" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {(["", "pending", "running", "done", "failed", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === s
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s === "" ? "すべて" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Auto refresh toggle */}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              autoRefresh
                ? "border-blue-400 bg-blue-50 text-blue-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {autoRefresh ? "自動更新 ON" : "自動更新 OFF"}
          </button>

          {/* Manual refresh */}
          <button
            onClick={() => { setLoading(true); void fetchJobs(); }}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            更新
          </button>

          {/* Retry failed */}
          {counts.failed > 0 && (
            <button
              onClick={() => void handleRetry()}
              disabled={retrying}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {retrying ? "再試行中..." : `失敗ジョブを再試行 (${counts.failed})`}
            </button>
          )}

          {/* Cleanup */}
          <button
            onClick={() => void handleCleanup()}
            disabled={cleaning}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {cleaning ? "削除中..." : "完了ジョブ削除"}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600">
            {loading ? "読込中..." : `${total} 件`}
          </span>
          {autoRefresh && (
            <span className="text-xs text-gray-400">
              {autoRefreshInterval / 1000}秒ごとに自動更新
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">タイプ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">ステータス</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">進捗</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">試行</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">作成日時</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">完了日時</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    ジョブがありません
                  </td>
                </tr>
              )}
              {jobs.map((job) => {
                const progress = getProgress(job);
                const isExpanded = expandedId === job.id;

                return (
                  <>
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : job.id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {job.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-800 font-medium">
                          {TYPE_LABELS[job.type] ?? job.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3 min-w-[100px]">
                        {job.status === "running" || job.status === "done" ? (
                          <div className="flex items-center gap-2">
                            <ProgressBar value={progress} />
                            <span className="text-xs text-gray-500 whitespace-nowrap">{progress}%</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {job.attempts}/{job.maxAttempts}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {formatDate(job.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {formatDate(job.completedAt)}
                      </td>
                      <td className="px-4 py-3">
                        {job.status === "pending" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleCancel(job.id);
                            }}
                            className="text-xs text-red-600 hover:underline"
                          >
                            キャンセル
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr key={`${job.id}-expanded`} className="bg-gray-50">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="font-medium text-gray-700 mb-1">ジョブID</div>
                              <div className="font-mono text-gray-500 break-all">{job.id}</div>
                            </div>
                            {job.mangaId && (
                              <div>
                                <div className="font-medium text-gray-700 mb-1">漫画ID</div>
                                <div className="font-mono text-gray-500">{job.mangaId}</div>
                              </div>
                            )}
                            {job.payload && (
                              <div>
                                <div className="font-medium text-gray-700 mb-1">ペイロード</div>
                                <pre className="bg-white rounded border border-gray-200 p-2 overflow-x-auto text-gray-600">
                                  {JSON.stringify(job.payload, null, 2)}
                                </pre>
                              </div>
                            )}
                            {job.error && (
                              <div>
                                <div className="font-medium text-red-600 mb-1">エラー</div>
                                <pre className="bg-red-50 rounded border border-red-100 p-2 overflow-x-auto text-red-700 whitespace-pre-wrap">
                                  {job.error}
                                </pre>
                              </div>
                            )}
                            {job.result && (
                              <div>
                                <div className="font-medium text-green-700 mb-1">結果</div>
                                <pre className="bg-green-50 rounded border border-green-100 p-2 overflow-x-auto text-green-700">
                                  {JSON.stringify(job.result, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
