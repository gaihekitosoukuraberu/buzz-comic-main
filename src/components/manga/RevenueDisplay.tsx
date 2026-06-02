import { cn } from "@/lib/utils";

interface RevenueDisplayProps {
  revenue: number;
  className?: string;
}

export function RevenueDisplay({ revenue, className }: RevenueDisplayProps) {
  if (revenue <= 0) return null;

  const formatted = revenue.toLocaleString("ja-JP", {
    maximumFractionDigits: 0,
  });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
        className
      )}
      title="この漫画の累計広告収益"
    >
      {/* coin icon (inline SVG) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"
          clipRule="evenodd"
        />
      </svg>
      この漫画は <strong>¥{formatted}</strong> の収益を生み出しています
    </span>
  );
}
