"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/manga/ScoreBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoreTableRow {
  id: string;
  title: string;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  score: number;
  publishedAt: string | null;
  status: string;
}

interface ScoreTableProps {
  rows: ScoreTableRow[];
  /** Callback fired when the admin wants to manually recalculate scores */
  onRecalculate?: () => Promise<void>;
  /** Callback fired when the admin wants to run a cull pass */
  onCull?: () => Promise<void>;
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CULL_WARN_DAYS = 7; // warn when within 7 days of cull threshold
const CULL_DAYS = 30;
const CULL_THRESHOLD = 10;

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

function willBeCulledSoon(row: ScoreTableRow): boolean {
  if (!row.publishedAt) return false;
  if (row.status === "culled") return false;
  const days = daysSince(row.publishedAt);
  return days >= CULL_DAYS - CULL_WARN_DAYS && row.score < CULL_THRESHOLD;
}

function isCulled(row: ScoreTableRow): boolean {
  return row.status === "culled";
}

/** Map a score to a heat-map CSS class (higher = warmer colour). */
function heatClass(score: number): string {
  if (score >= 500) return "bg-red-500";
  if (score >= 200) return "bg-orange-400";
  if (score >= 100) return "bg-yellow-300";
  if (score >= 50) return "bg-lime-300";
  if (score >= 10) return "bg-emerald-200";
  return "bg-slate-200";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScoreTable({
  rows,
  onRecalculate,
  onCull,
  isLoading = false,
}: ScoreTableProps) {
  const [tab, setTab] = useState<"all" | "soon">("all");
  const [busy, setBusy] = useState(false);

  const soonRows = rows.filter(willBeCulledSoon);
  const displayRows = tab === "soon" ? soonRows : rows;

  async function handleAction(fn?: () => Promise<void>) {
    if (!fn) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header / actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Manga Scores
        </h2>
        <div className="flex gap-2">
          {onRecalculate && (
            <button
              disabled={busy || isLoading}
              onClick={() => handleAction(onRecalculate)}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Recalculate All
            </button>
          )}
          {onCull && (
            <button
              disabled={busy || isLoading}
              onClick={() => handleAction(onCull)}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Run Cull
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(["all", "soon"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium",
              tab === t
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            {t === "all" ? (
              <>All ({rows.length})</>
            ) : (
              <>
                Cull Pending{" "}
                <span
                  className={cn(
                    "ml-1 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                    soonRows.length > 0
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600",
                  )}
                >
                  {soonRows.length}
                </span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Heatmap legend */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="font-medium">Score heatmap:</span>
        {[
          { label: "<10", cls: "bg-slate-200" },
          { label: "10+", cls: "bg-emerald-200" },
          { label: "50+", cls: "bg-lime-300" },
          { label: "100+", cls: "bg-yellow-300" },
          { label: "200+", cls: "bg-orange-400" },
          { label: "500+", cls: "bg-red-500" },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={cn("inline-block h-3 w-3 rounded-sm", cls)} />
            {label}
          </span>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-gray-400">
          Loading...
        </div>
      ) : displayRows.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">
          No manga found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                  Title
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  Views
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  Likes
                </th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  Shares
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                  Score
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                  Published
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
              {displayRows.map((row) => {
                const soon = willBeCulledSoon(row);
                const culled = isCulled(row);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "transition-colors",
                      culled && "opacity-50",
                      soon && !culled && "bg-red-50 dark:bg-red-900/10",
                    )}
                  >
                    <td className="max-w-[200px] truncate px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {row.title}
                      {soon && !culled && (
                        <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          Cull soon
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {row.totalViews.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {row.totalLikes.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {row.totalShares.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Heatmap dot */}
                        <span
                          className={cn(
                            "inline-block h-3 w-3 rounded-full",
                            heatClass(row.score),
                          )}
                        />
                        <ScoreBadge score={row.score} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-gray-400">
                      {row.publishedAt
                        ? new Date(row.publishedAt).toLocaleDateString("ja-JP")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          row.status === "published" &&
                            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                          row.status === "culled" &&
                            "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
                          row.status === "draft" &&
                            "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
