import * as React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: string;
}

const SIZE_CLASSES = {
  sm: "h-4 w-4 border-2",
  default: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export function Spinner({ size = "default", className, label }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label ?? "読み込み中"}
      className={cn("flex items-center justify-center", className)}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400",
          SIZE_CLASSES[size]
        )}
      />
      {label && (
        <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
    </div>
  );
}

export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[300px] w-full items-center justify-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}
