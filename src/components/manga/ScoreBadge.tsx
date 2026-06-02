"use client";

import { cn } from "@/lib/utils";

type ScoreTier = "gold" | "silver" | "bronze" | "low";

function getScoreTier(score: number): ScoreTier {
  if (score >= 500) return "gold";
  if (score >= 100) return "silver";
  if (score >= 10) return "bronze";
  return "low";
}

const tierStyles: Record<ScoreTier, string> = {
  gold: "bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-900/30 dark:text-amber-300",
  silver:
    "bg-slate-100 text-slate-700 border-slate-400 dark:bg-slate-800/50 dark:text-slate-300",
  bronze:
    "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300",
  low: "bg-red-50 text-red-500 border-red-200 dark:bg-red-900/20 dark:text-red-400",
};

const tierLabels: Record<ScoreTier, string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  low: "Low",
};

interface ScoreBadgeProps {
  score: number;
  /** Show a numeric score alongside the tier label. Defaults to true. */
  showValue?: boolean;
  className?: string;
}

export function ScoreBadge({
  score,
  showValue = true,
  className,
}: ScoreBadgeProps) {
  const tier = getScoreTier(score);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tierStyles[tier],
        className,
      )}
      title={`Buzz Score: ${score}`}
    >
      <TierIcon tier={tier} />
      {showValue ? (
        <>
          <span>{tierLabels[tier]}</span>
          <span className="opacity-70">{score.toFixed(1)}</span>
        </>
      ) : (
        <span>{tierLabels[tier]}</span>
      )}
    </span>
  );
}

function TierIcon({ tier }: { tier: ScoreTier }) {
  // Simple SVG icons to avoid extra dependencies
  switch (tier) {
    case "gold":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.83-4.401z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "silver":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    case "bronze":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
}

export type { ScoreTier };
