"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RevenueCardProps {
  label: string;
  amount: number;
  previousAmount?: number;
  icon?: React.ReactNode;
  className?: string;
  /** 金額の接頭辞。デフォルト "¥" */
  prefix?: string;
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    startRef.current = start;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("ja-JP", { maximumFractionDigits: 0 });
}

export function RevenueCard({
  label,
  amount,
  previousAmount,
  icon,
  className,
  prefix = "¥",
}: RevenueCardProps) {
  const displayAmount = useCountUp(amount);

  const changePercent =
    previousAmount != null && previousAmount !== 0
      ? ((amount - previousAmount) / previousAmount) * 100
      : null;

  const isPositive = changePercent !== null && changePercent >= 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {icon}
          </span>
        )}
      </div>

      <p className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {prefix}
        {formatCurrency(displayAmount)}
      </p>

      {changePercent !== null && (
        <p
          className={cn(
            "mt-1 text-sm font-medium",
            isPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400"
          )}
        >
          {isPositive ? "+" : ""}
          {changePercent.toFixed(1)}% 前月比
        </p>
      )}
    </div>
  );
}
