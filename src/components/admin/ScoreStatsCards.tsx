"use client";

import { cn } from "@/lib/utils";

interface ScoreStatsCardsProps {
  publishedCount: number;
  culledCount: number;
  averageScore: number;
  soonToCullCount: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  variant?: "default" | "warning" | "danger";
}

function StatCard({
  label,
  value,
  description,
  variant = "default",
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-sm",
        variant === "default" &&
          "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900",
        variant === "warning" &&
          "border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20",
        variant === "danger" &&
          "border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20",
      )}
    >
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-3xl font-bold",
          variant === "default" && "text-gray-900 dark:text-white",
          variant === "warning" && "text-yellow-700 dark:text-yellow-400",
          variant === "danger" && "text-red-700 dark:text-red-400",
        )}
      >
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}
    </div>
  );
}

export function ScoreStatsCards({
  publishedCount,
  culledCount,
  averageScore,
  soonToCullCount,
}: ScoreStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard
        label="Published"
        value={publishedCount.toLocaleString()}
        description="Active manga"
      />
      <StatCard
        label="Average Score"
        value={averageScore.toFixed(1)}
        description="Across all published manga"
      />
      <StatCard
        label="Culled"
        value={culledCount.toLocaleString()}
        description="Low-score removals"
        variant="warning"
      />
      <StatCard
        label="Cull Pending"
        value={soonToCullCount.toLocaleString()}
        description="Within 7 days of cull threshold"
        variant={soonToCullCount > 0 ? "danger" : "default"}
      />
    </div>
  );
}
