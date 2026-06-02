"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  User,
  LogIn,
  LogOut,
  Settings,
  LayoutDashboard,
  Shield,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return (
      <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          <LogIn className="h-4 w-4" />
          <span>ログイン</span>
        </Link>
        <Link
          href="/register"
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-sm font-medium text-white transition-colors"
        >
          <User className="h-4 w-4" />
          <span>登録</span>
        </Link>
      </div>
    );
  }

  const user = session.user;
  const isAdmin = user.role === "admin";
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {/* Avatar */}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-semibold">
          {initials}
        </div>
        {/* Name */}
        <span className="hidden sm:block max-w-[120px] truncate font-medium text-zinc-900 dark:text-white">
          {user.name ?? user.email}
        </span>
        {isAdmin && (
          <Shield className="h-3.5 w-3.5 text-indigo-500" aria-label="管理者" />
        )}
        <ChevronDown
          className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg py-1 z-50"
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
              {user.name ?? "ユーザー"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {user.email}
            </p>
            {isAdmin && (
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <Shield className="h-3 w-3" />
                管理者
              </span>
            )}
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4 text-zinc-400" />
              ダッシュボード
            </Link>

            <Link
              href="/dashboard/settings"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <Settings className="h-4 w-4 text-zinc-400" />
              設定
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
              >
                <Shield className="h-4 w-4" />
                管理パネル
              </Link>
            )}
          </div>

          {/* Sign out */}
          <div className="border-t border-zinc-100 dark:border-zinc-700 py-1">
            <button
              role="menuitem"
              onClick={async () => {
                setIsOpen(false);
                await signOut({ callbackUrl: "/" });
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
