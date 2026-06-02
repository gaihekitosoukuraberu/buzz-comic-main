import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
        secondary:
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        success:
          "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
        warning:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        destructive:
          "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        outline:
          "border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300",
        accent:
          "bg-amber-400 text-slate-900",
        action: "bg-red-100 text-red-700",
        romance: "bg-pink-100 text-pink-700",
        comedy: "bg-yellow-100 text-yellow-700",
        horror: "bg-purple-100 text-purple-700",
        sf: "bg-blue-100 text-blue-700",
        general: "bg-gray-100 text-gray-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
