"use client";

/**
 * GenerateForm – FLUX.2 image generation form.
 *
 * - Prompt input
 * - Style selection (anime / realistic / monochrome)
 * - Panel count selector (1-8)
 * - Generate button with loading state
 * - Inline GenerationProgress once a job is submitted
 */

import { FormEvent, useState } from "react";
import { cn } from "@/lib/utils";
import GenerationProgress from "./GenerationProgress";

type MangaStyle = "anime" | "realistic" | "monochrome";

const STYLES: { value: MangaStyle; label: string; description: string }[] = [
  {
    value: "anime",
    label: "アニメ",
    description: "鮮やかなアニメ・漫画スタイル",
  },
  {
    value: "realistic",
    label: "リアル",
    description: "フォトリアリスティックな表現",
  },
  {
    value: "monochrome",
    label: "モノクロ",
    description: "白黒漫画・インクイラスト",
  },
];

interface GenerateFormProps {
  mangaId?: string;
  onComplete?: (images: string[]) => void;
}

export default function GenerateForm({ mangaId, onComplete }: GenerateFormProps) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<MangaStyle>("anime");
  const [panelsCount, setPanelsCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setJobId(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style,
          panels_count: panelsCount,
          manga_id: mangaId,
        }),
      });

      const data = (await res.json()) as { job_id?: string; error?: string };

      if (!res.ok) {
        setSubmitError(data.error ?? `エラー: HTTP ${res.status}`);
        return;
      }

      if (data.job_id) {
        setJobId(data.job_id);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "ネットワークエラーが発生しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleComplete(images: string[]) {
    onComplete?.(images);
  }

  function handleReset() {
    setJobId(null);
    setSubmitError(null);
  }

  return (
    <div className="space-y-8">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt */}
        <div className="space-y-2">
          <label
            htmlFor="prompt"
            className="block text-sm font-medium text-zinc-700"
          >
            プロンプト
            <span className="ml-1 text-red-500">*</span>
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例: 夜の都市を走る少女、サイバーパンク、ネオンライト"
            rows={4}
            maxLength={500}
            required
            disabled={isSubmitting || !!jobId}
            className={cn(
              "w-full resize-none rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400",
              "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
              "disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
            )}
          />
          <p className="text-right text-xs text-zinc-400">
            {prompt.length}/500
          </p>
        </div>

        {/* Style selector */}
        <div className="space-y-2">
          <span className="block text-sm font-medium text-zinc-700">
            スタイル
          </span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStyle(s.value)}
                disabled={isSubmitting || !!jobId}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  style === s.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                )}
              >
                <span className="block text-sm font-medium">{s.label}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {s.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Panel count */}
        <div className="space-y-2">
          <label
            htmlFor="panels"
            className="block text-sm font-medium text-zinc-700"
          >
            パネル数:{" "}
            <span className="font-semibold text-indigo-600">{panelsCount}枚</span>
          </label>
          <input
            id="panels"
            type="range"
            min={1}
            max={8}
            step={1}
            value={panelsCount}
            onChange={(e) => setPanelsCount(Number(e.target.value))}
            disabled={isSubmitting || !!jobId}
            className={cn(
              "h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200",
              "accent-indigo-500",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
          <div className="flex justify-between text-xs text-zinc-400">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i + 1}>{i + 1}</span>
            ))}
          </div>
        </div>

        {/* Submit error */}
        {submitError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !!jobId || !prompt.trim()}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white",
              "bg-indigo-600 transition-colors hover:bg-indigo-700",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:bg-indigo-300"
            )}
          >
            {isSubmitting ? (
              <>
                <SmallSpinner />
                送信中…
              </>
            ) : jobId ? (
              "生成中…"
            ) : (
              "生成する"
            )}
          </button>

          {jobId && (
            <button
              type="button"
              onClick={handleReset}
              className={cn(
                "rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700",
                "transition-colors hover:bg-zinc-50",
                "focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
              )}
            >
              新しく生成
            </button>
          )}
        </div>
      </form>

      {/* Progress */}
      {jobId && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <GenerationProgress jobId={jobId} onComplete={handleComplete} />
        </div>
      )}
    </div>
  );
}

function SmallSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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
