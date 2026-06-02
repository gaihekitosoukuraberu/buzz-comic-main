"use client";

import { useState } from "react";
import Image from "next/image";
import { MessageCircle, Send } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  createdAt: Date | string;
  user: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
}

interface CommentSectionProps {
  mangaId: string;
  comments: Comment[];
  commentCount: number;
}

export default function CommentSection({ mangaId, comments: initial, commentCount }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/manga/${mangaId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.status === 401) {
        setError("コメントするにはログインが必要です");
        return;
      }
      if (!res.ok) {
        setError("コメントの送信に失敗しました");
        return;
      }
      const newComment = await res.json();
      setComments((prev) => [newComment, ...prev]);
      setContent("");
    } catch {
      setError("コメントの送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-gray-400" />
        <h2 className="text-xl font-bold text-gray-900">
          コメント
          <span className="ml-2 text-sm font-normal text-gray-400">({commentCount}件)</span>
        </h2>
      </div>

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-xs text-gray-500">
          あ
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="コメントを入力..."
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{content.length}/500</span>
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "送信中..." : "送信"}
            </button>
          </div>
        </div>
      </form>

      {/* Comment List */}
      {comments.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-6">まだコメントはありません。最初のコメントを書いてみよう！</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <div className="shrink-0">
                {comment.user.avatarUrl ? (
                  <Image
                    src={comment.user.avatarUrl}
                    alt={comment.user.name ?? "ユーザー"}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                    {(comment.user.name ?? "?")[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.user.name ?? "匿名"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
