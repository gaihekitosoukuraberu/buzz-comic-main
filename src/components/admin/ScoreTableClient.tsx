"use client";

import { useState, useCallback } from "react";
import { ScoreTable, type ScoreTableRow } from "@/components/admin/ScoreTable";

interface ScoreTableClientProps {
  rows: ScoreTableRow[];
}

export function ScoreTableClient({ rows: initialRows }: ScoreTableClientProps) {
  const [rows, setRows] = useState<ScoreTableRow[]>(initialRows);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  function showMessage(text: string, ok: boolean) {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 4000);
  }

  const handleRecalculate = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/score/recalculate", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        // Reload page data by re-fetching stats
        showMessage("Scores recalculated successfully.", true);
        // Refresh the page to show updated scores (server component pattern)
        window.location.reload();
      } else {
        showMessage(data.error ?? "Failed to recalculate.", false);
      }
    } catch (err) {
      showMessage("Network error.", false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCull = useCallback(async () => {
    if (
      !window.confirm(
        "Run cull pass now? This will set low-score manga to 'culled' status.",
      )
    )
      return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/score/cull", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showMessage(`Culled ${data.culled} manga(s).`, true);
        window.location.reload();
      } else {
        showMessage(data.error ?? "Failed to run cull.", false);
      }
    } catch (err) {
      showMessage("Network error.", false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="space-y-3">
      {message && (
        <div
          role="alert"
          className={`rounded-md px-4 py-3 text-sm font-medium ${
            message.ok
              ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <ScoreTable
        rows={rows}
        onRecalculate={handleRecalculate}
        onCull={handleCull}
        isLoading={isLoading}
      />
    </div>
  );
}
