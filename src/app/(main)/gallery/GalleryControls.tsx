"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useTransition, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GENRES } from "@/lib/manga";

type GenresType = typeof GENRES;

interface GalleryControlsProps {
  currentGenre: string;
  currentSort: string;
  currentSearch: string;
  genres: GenresType;
}

const SORT_OPTIONS = [
  { value: "newest", label: "新着順" },
  { value: "popular", label: "人気順" },
  { value: "score", label: "スコア順" },
] as const;

export default function GalleryControls({
  currentGenre,
  currentSort,
  currentSearch,
  genres,
}: GalleryControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch);

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams();
      const values: Record<string, string> = {
        genre: currentGenre,
        sort: currentSort,
        q: currentSearch,
        page: "1",
        ...overrides,
      };
      for (const [k, v] of Object.entries(values)) {
        if (v && v !== "all" && v !== "1" && v !== "") {
          params.set(k, v);
        }
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [currentGenre, currentSort, currentSearch, pathname]
  );

  const navigate = (url: string) => {
    startTransition(() => {
      router.push(url);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(buildUrl({ q: searchValue }));
  };

  const clearSearch = () => {
    setSearchValue("");
    navigate(buildUrl({ q: "" }));
  };

  return (
    <div className={cn("space-y-4", isPending && "opacity-60 pointer-events-none")}>
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="タイトルや説明で検索..."
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
        {searchValue && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="検索をクリア"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Genre Tabs + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Genre Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {genres.map((g) => (
            <button
              key={g.value}
              onClick={() => navigate(buildUrl({ genre: g.value }))}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                currentGenre === g.value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-200 hover:text-indigo-600"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => navigate(buildUrl({ sort: opt.value }))}
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors",
                  currentSort === opt.value
                    ? "bg-indigo-600 text-white font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
