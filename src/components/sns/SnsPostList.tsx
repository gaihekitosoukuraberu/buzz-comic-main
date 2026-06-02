"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SnsPost {
  id: string;
  mangaId: string;
  platform: string;
  status: string;
  postUrl: string | null;
  error: string | null;
  scheduledAt: string | null;
  postedAt: string | null;
  createdAt: string;
  manga?: { title: string };
}

interface SnsPostListProps {
  mangaId?: string; // 指定すると特定漫画の投稿のみ表示
  refreshTrigger?: number; // 値が変わると再取得
}

const STATUS_LABELS: Record<string, string> = {
  pending: "待機中",
  posting: "投稿中",
  posted: "投稿済み",
  failed: "失敗",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  posting: "bg-blue-100 text-blue-800 border-blue-200",
  posted: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

const PLATFORM_ICONS: Record<string, string> = {
  twitter: "𝕏",
  instagram: "📷",
  tiktok: "🎵",
};

export function SnsPostList({ mangaId, refreshTrigger }: SnsPostListProps) {
  const [posts, setPosts] = useState<SnsPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = mangaId
        ? `/api/sns/schedule?manga_id=${mangaId}`
        : "/api/sns/schedule";
      const res = await fetch(url);
      if (!res.ok) throw new Error("投稿一覧の取得に失敗しました");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [mangaId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, refreshTrigger]);

  const handleCancel = async (postId: string) => {
    if (!confirm("この投稿予約をキャンセルしますか？")) return;
    setCancellingId(postId);
    try {
      const res = await fetch(`/api/sns/status/${postId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "キャンセルに失敗しました");
      }
      // 一覧から削除
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "キャンセルに失敗しました");
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
        {error}
        <button
          onClick={fetchPosts}
          className="ml-3 underline hover:no-underline"
        >
          再試行
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        SNS 投稿履歴がありません
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          SNS 投稿履歴
          <span className="ml-2 text-gray-400 font-normal">({posts.length}件)</span>
        </h3>
        <button
          onClick={fetchPosts}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          更新
        </button>
      </div>

      <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
        {posts.map((post) => (
          <div key={post.id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {/* プラットフォームアイコン */}
                <span className="text-lg flex-shrink-0" title={post.platform}>
                  {PLATFORM_ICONS[post.platform] ?? "📱"}
                </span>

                <div className="min-w-0">
                  {/* 漫画タイトル */}
                  {post.manga?.title && (
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {post.manga.title}
                    </p>
                  )}

                  {/* 日時情報 */}
                  <div className="text-xs text-gray-400 space-x-2 mt-0.5">
                    {post.postedAt ? (
                      <span>投稿: {formatDateTime(post.postedAt)}</span>
                    ) : post.scheduledAt ? (
                      <span>予定: {formatDateTime(post.scheduledAt)}</span>
                    ) : (
                      <span>作成: {formatDateTime(post.createdAt)}</span>
                    )}
                  </div>

                  {/* エラーメッセージ */}
                  {post.error && (
                    <p className="text-xs text-red-500 mt-1 line-clamp-2">
                      エラー: {post.error}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* ステータスバッジ */}
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 rounded-full text-xs font-medium border",
                    STATUS_COLORS[post.status] ?? STATUS_COLORS.pending
                  )}
                >
                  {STATUS_LABELS[post.status] ?? post.status}
                </span>

                {/* アクション */}
                {post.status === "posted" && post.postUrl && (
                  <a
                    href={post.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    表示
                  </a>
                )}

                {post.status === "pending" && (
                  <button
                    onClick={() => handleCancel(post.id)}
                    disabled={cancellingId === post.id}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                  >
                    {cancellingId === post.id ? "..." : "キャンセル"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
