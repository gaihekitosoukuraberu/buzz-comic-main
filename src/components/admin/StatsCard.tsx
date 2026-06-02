import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  variant?: "default" | "warning" | "success" | "danger";
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-white border-gray-200",
  warning: "bg-amber-50 border-amber-200",
  success: "bg-green-50 border-green-200",
  danger: "bg-red-50 border-red-200",
};

const iconVariantStyles: Record<string, string> = {
  default: "bg-blue-100 text-blue-600",
  warning: "bg-amber-100 text-amber-600",
  success: "bg-green-100 text-green-600",
  danger: "bg-red-100 text-red-600",
};

export default function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = "default",
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-sm",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
          {trend && (
            <p
              className={cn(
                "mt-2 text-xs font-medium",
                trend.value >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              iconVariantStyles[variant]
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
