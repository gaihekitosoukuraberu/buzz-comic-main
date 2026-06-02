"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDateTime } from "@/lib/utils";

interface MangaRow {
  id: string;
  title: string;
  status: string;
  genre: string | null;
  score: number;
  totalViews: number;
  createdAt: string;
  author: { name: string | null; email: string };
  _count: { panels: number; revenues: number };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "審査待ち", className: "bg-amber-100 text-amber-700" },
  published: { label: "公開中", className: "bg-green-100 text-green-700" },
  culled: { label: "間引き済み", className: "bg-gray-100 text-gray-600" },
  rejected: { label: "却下", className: "bg-red-100 text-red-700" },
  draft: { label: "下書き", className: "bg-blue-100 text-blue-700" },
};

const allStatuses = ["", "draft", "pending", "published", "culled", "rejected"];

export default function MangaManagementPage() {
  const [mangas, setMangas] = useState<MangaRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const fetchMangas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/admin/manga?${params}`);
      if (!res.ok) throw new Error("取得失敗");
      const data = await res.json();
      setMangas(data.mangas);
      setPagination(data.pagination);
    } catch {
      showToast("漫画一覧の取得に失敗しました", "error");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchMangas();
  }, [fetchMangas]);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleStatusChange(mangaId: string, newStatus: string) {
    setChangingStatus(mangaId);
    try {
      const res = await fetch("/api/admin/manga", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manga_id: mangaId, status: newStatus }),
      });
      if (!res.ok) throw new Error("更新失敗");
      showToast("ステータスを更新しました", "success");
      setMangas((prev) =>
        prev.map((m) => (m.id === mangaId ? { ...m, status: newStatus } : m))
      );
    } catch {
      showToast("ステータスの更新に失敗しました", "error");
    } finally {
      setChangingStatus(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">漫画管理</h2>
          <p className="mt-1 text-sm text-gray-500">
            {pagination ? `全${pagination.total}件` : "読み込み中..."}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="タイトルで検索..."
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            検索
          </button>
          {(search || searchInput) && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              クリア
            </button>
          )}
        </form>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">すべてのステータス</option>
          {allStatuses.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]?.label ?? s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">読み込み中...</div>
        ) : mangas.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">漫画が見つかりません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タイトル
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作者
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    スコア
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    投稿日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {mangas.map((manga) => {
                  const s = statusLabels[manga.status] ?? { label: manga.status, className: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={manga.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {manga.title}
                        </p>
                        {manga.genre && (
                          <p className="text-xs text-gray-400">{manga.genre}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-700 truncate max-w-[160px]">
                          {manga.author.name ?? manga.author.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {manga.score.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatDateTime(manga.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={manga.status}
                          onChange={(e) => handleStatusChange(manga.id, e.target.value)}
                          disabled={changingStatus === manga.id}
                          className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                        >
                          {allStatuses.filter(Boolean).map((s) => (
                            <option key={s} value={s}>
                              {statusLabels[s]?.label ?? s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            全{pagination.total}件中 {(pagination.page - 1) * pagination.limit + 1}〜
            {Math.min(pagination.page * pagination.limit, pagination.total)}件
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
    </div>
  );
}
