"use client";

import { useState, useEffect, useCallback } from "react";
import ReviewCard from "@/components/admin/ReviewCard";

interface Panel {
  id: string;
  imageUrl: string;
  order: number;
}

interface Author {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

interface Manga {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  author: Author;
  panels: Panel[];
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ReviewQueuePage() {
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchMangas = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/review?page=${p}&limit=10`);
      if (!res.ok) throw new Error("取得失敗");
      const data = await res.json();
      setMangas(data.mangas);
      setPagination(data.pagination);
    } catch {
      showToast("審査キューの取得に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMangas(page);
  }, [page, fetchMangas]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleDecision(
    mangaId: string,
    decision: "approved" | "rejected",
    reason?: string
  ) {
    const res = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manga_id: mangaId, decision, reason }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "エラーが発生しました");
    }

    showToast(
      decision === "approved" ? "承認しました" : "却下しました",
      "success"
    );
    // Remove from list
    setMangas((prev) => prev.filter((m) => m.id !== mangaId));
    if (pagination) {
      setPagination((prev) =>
        prev ? { ...prev, total: prev.total - 1 } : prev
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">審査キュー</h2>
          <p className="mt-1 text-sm text-gray-500">
            {pagination ? `${pagination.total}件の漫画が審査待ちです` : "読み込み中..."}
          </p>
        </div>
        <button
          onClick={() => fetchMangas(page)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          更新
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : mangas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-20 text-center">
          <svg className="h-12 w-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-base font-medium text-gray-500">審査待ちの漫画はありません</p>
          <p className="text-sm text-gray-400 mt-1">すべての漫画が審査済みです</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {mangas.map((manga) => (
              <ReviewCard key={manga.id} manga={manga} onDecision={handleDecision} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500">
                {pagination.total}件中 {(pagination.page - 1) * pagination.limit + 1}〜
                {Math.min(pagination.page * pagination.limit, pagination.total)}件表示
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                <span className="flex items-center text-sm text-gray-600 px-2">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
