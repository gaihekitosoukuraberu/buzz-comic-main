"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryPaginationProps {
  currentPage: number;
  totalPages: number;
  genre: string;
  sort: string;
  search: string;
}

function buildUrl(page: number, genre: string, sort: string, search: string) {
  const params = new URLSearchParams();
  if (genre && genre !== "all") params.set("genre", genre);
  if (sort && sort !== "newest") params.set("sort", sort);
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/gallery?${qs}` : "/gallery";
}

export default function GalleryPagination({
  currentPage,
  totalPages,
  genre,
  sort,
  search,
}: GalleryPaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="ページネーション">
      {/* Previous */}
      <Link
        href={buildUrl(currentPage - 1, genre, sort, search)}
        className={cn(
          "p-2 rounded-lg border transition-colors",
          currentPage === 1
            ? "border-gray-200 text-gray-300 pointer-events-none"
            : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
        )}
        aria-label="前のページ"
        aria-disabled={currentPage === 1}
      >
        <ChevronLeft className="w-4 h-4" />
      </Link>

      {/* Pages */}
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={buildUrl(p as number, genre, sort, search)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg border text-sm font-medium transition-colors",
              currentPage === p
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
            )}
            aria-current={currentPage === p ? "page" : undefined}
          >
            {p}
          </Link>
        )
      )}

      {/* Next */}
      <Link
        href={buildUrl(currentPage + 1, genre, sort, search)}
        className={cn(
          "p-2 rounded-lg border transition-colors",
          currentPage === totalPages
            ? "border-gray-200 text-gray-300 pointer-events-none"
            : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
        )}
        aria-label="次のページ"
        aria-disabled={currentPage === totalPages}
      >
        <ChevronRight className="w-4 h-4" />
      </Link>
    </nav>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
