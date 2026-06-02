import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "default" | "lg" | "xl";
  className?: string;
  alt?: string;
}

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  default: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

const SIZE_PX = {
  xs: 24,
  sm: 32,
  default: 40,
  lg: 56,
  xl: 80,
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(name: string | null | undefined): string {
  const colors = [
    "from-blue-400 to-indigo-500",
    "from-purple-400 to-pink-500",
    "from-green-400 to-teal-500",
    "from-amber-400 to-orange-500",
    "from-rose-400 to-red-500",
    "from-cyan-400 to-blue-500",
  ];
  if (!name) return colors[0];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export function Avatar({ src, name, size = "default", className, alt }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const px = SIZE_PX[size];
  const initials = getInitials(name);
  const gradient = getAvatarColor(name);

  return (
    <div
      className={cn(
        "relative flex-shrink-0 overflow-hidden rounded-full",
        sizeClass,
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? name ?? "アバター"}
          width={px}
          height={px}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-gradient-to-br text-white font-semibold select-none",
            gradient
          )}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
