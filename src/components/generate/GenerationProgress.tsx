"use client";

/**
 * GenerationProgress – polls /api/generate/[jobId] every 2 seconds
 * and shows real-time progress + image previews once done.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type JobStatus = "pending" | "running" | "done" | "failed";

interface JobState {
  job_id: string;
  status: JobStatus;
  progress: number;
  images: string[];
  error: string | null;
}

interface GenerationProgressProps {
  jobId: string;
  onComplete?: (images: string[]) => void;
}

const POLL_INTERVAL_MS = 2000;

const STATUS_LABELS: Record<JobStatus, string> = {
  pending: "キューに追加されました",
  running: "生成中…",
  done: "生成完了",
  failed: "生成失敗",
};

export default function GenerationProgress({
  jobId,
  onComplete,
}: GenerationProgressProps) {
  const [state, setState] = useState<JobState | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/generate/${jobId}`);
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setFetchError(data.error ?? `HTTP ${res.status}`);
          return;
        }

        const data = (await res.json()) as JobState;
        if (!cancelled) {
          setState(data);

          if (data.status === "done") {
            onCompleteRef.current?.(data.images);
            return; // Stop polling
          }

          if (data.status === "failed") {
            return; // Stop polling
          }

          // Schedule next poll
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(
            err instanceof Error ? err.message : "ネットワークエラー"
          );
        }
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [jobId]);

  if (fetchError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        ジョブ状態の取得に失敗しました: {fetchError}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex items-center gap-3 text-zinc-500">
        <Spinner />
        <span className="text-sm">読み込み中…</span>
      </div>
    );
  }

  const isDone = state.status === "done";
  const isFailed = state.status === "failed";
  const isActive = state.status === "pending" || state.status === "running";

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="flex items-center gap-3">
        {isActive && <Spinner />}
        {isDone && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs">
            ✓
          </span>
        )}
        {isFailed && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs">
            ✕
          </span>
        )}
        <span
          className={`text-sm font-medium ${
            isDone
              ? "text-green-700"
              : isFailed
              ? "text-red-700"
              : "text-zinc-700"
          }`}
        >
          {STATUS_LABELS[state.status]}
        </span>
        <span className="ml-auto text-xs text-zinc-400">
          Job ID: {state.job_id.slice(0, 12)}…
        </span>
      </div>

      {/* Progress bar */}
      {(isActive || isDone) && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${isDone ? 100 : state.progress}%` }}
          />
        </div>
      )}

      {/* Error message */}
      {isFailed && state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {/* Image grid */}
      {isDone && state.images.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">
            生成画像 ({state.images.length}枚)
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {state.images.map((src, idx) => (
              <div
                key={idx}
                className="group relative aspect-[2/3] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
              >
                <Image
                  src={src}
                  alt={`生成パネル ${idx + 1}`}
                  fill
                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                  unoptimized
                />
                <a
                  href={src}
                  download={`panel-${idx + 1}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-end justify-end p-2 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label={`パネル ${idx + 1} をダウンロード`}
                >
                  <span className="rounded bg-black/60 px-2 py-1 text-xs text-white">
                    保存
                  </span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-indigo-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
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
  );
}
