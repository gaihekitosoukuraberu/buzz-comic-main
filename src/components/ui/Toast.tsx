"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---- Types ---- */
export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

/* ---- Context ---- */
interface ToastContextValue {
  toast: (data: Omit<ToastData, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/* ---- Provider ---- */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const toast = React.useCallback((data: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...data }]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <ToastItem key={t.id} data={t} onDismiss={dismiss} />
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-4 sm:right-4 sm:w-[390px]" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

/* ---- Item ---- */
const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
  success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
  error: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
  warning: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
  info: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
};

const VARIANT_ICONS: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const ICON_COLORS: Record<ToastVariant, string> = {
  default: "text-slate-500",
  success: "text-green-600",
  error: "text-red-600",
  warning: "text-amber-600",
  info: "text-blue-600",
};

function ToastItem({
  data,
  onDismiss,
}: {
  data: ToastData;
  onDismiss: (id: string) => void;
}) {
  const variant = data.variant ?? "default";
  const Icon = VARIANT_ICONS[variant];

  return (
    <ToastPrimitive.Root
      defaultOpen
      duration={data.duration ?? 4000}
      onOpenChange={(open) => {
        if (!open) onDismiss(data.id);
      }}
      className={cn(
        "group relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0",
        "data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full",
        "transition-all duration-300",
        VARIANT_STYLES[variant]
      )}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 flex-shrink-0", ICON_COLORS[variant])} />
      <div className="flex-1 min-w-0">
        <ToastPrimitive.Title className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {data.title}
        </ToastPrimitive.Title>
        {data.description && (
          <ToastPrimitive.Description className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {data.description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close
        className="flex-shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
        aria-label="閉じる"
      >
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}
