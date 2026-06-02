"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Manga {
  id: string;
  title: string;
  description?: string | null;
  genre?: string | null;
}

interface SnsSchedulerProps {
  manga: Manga;
  onScheduled?: (postId: string) => void;
}

type Platform = "twitter" | "instagram";

const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: "Twitter / X",
  instagram: "Instagram",
};

const PLATFORM_ICONS: Record<Platform, string> = {
  twitter: "𝕏",
  instagram: "📷",
};

export function SnsScheduler({ manga, onScheduled }: SnsSchedulerProps) {
  const [platform, setPlatform] = useState<Platform>("twitter");
  const [postText, setPostText] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isImmediate, setIsImmediate] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const generateAutoText = useCallback(async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/sns/auto-text?manga_id=${manga.id}`);
      if (!res.ok) throw new Error("自動テキスト生成に失敗しました");
      const data = await res.json();
      setPostText(data.text ?? "");
      setHashtags(data.hashtags ?? []);
      setHashtagInput((data.hashtags ?? []).join(", "));
    } catch (err) {
      console.error(err);
      // フォールバックテキスト
      const fallback = `📚 ${manga.title}\n\n${(manga.description ?? "").slice(0, 100)}`;
      setPostText(fallback);
      setHashtags(["漫画", "AI漫画", "BuzzComic"]);
      setHashtagInput("漫画, AI漫画, BuzzComic");
    } finally {
      setIsGenerating(false);
    }
  }, [manga]);

  // マウント時に自動テキスト生成
  useEffect(() => {
    generateAutoText();
  }, [generateAutoText]);

  // ハッシュタグ入力を配列に同期
  const handleHashtagInputChange = (value: string) => {
    setHashtagInput(value);
    const parsed = value
      .split(/[,、\s]+/)
      .map((t) => t.replace(/^#/, "").trim())
      .filter(Boolean);
    setHashtags(parsed);
  };

  const handleSchedule = async (immediate: boolean) => {
    if (!postText.trim()) {
      setMessage({ type: "error", text: "投稿テキストを入力してください" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const body = {
        manga_id: manga.id,
        platform,
        text: postText,
        hashtags,
        scheduled_at: immediate ? undefined : scheduledAt || undefined,
      };

      const res = await fetch("/api/sns/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "スケジュール作成に失敗しました");
      }

      setMessage({
        type: "success",
        text: immediate
          ? "投稿キューに追加しました"
          : `${new Date(scheduledAt).toLocaleString("ja-JP")} に投稿予約しました`,
      });

      if (onScheduled) {
        onScheduled(data.post.id);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "エラーが発生しました";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  // 最小スケジュール日時（5分後）
  const minScheduledAt = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">SNS 投稿スケジュール</h3>
        <span className="text-sm text-gray-500 truncate max-w-[180px]">
          {manga.title}
        </span>
      </div>

      {/* プラットフォーム選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          プラットフォーム
        </label>
        <div className="flex gap-3">
          {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                platform === p
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              )}
            >
              <span className="text-base">{PLATFORM_ICONS[p]}</span>
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 投稿テキスト */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            投稿テキスト
          </label>
          <button
            type="button"
            onClick={generateAutoText}
            disabled={isGenerating}
            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {isGenerating ? "生成中..." : "自動生成"}
          </button>
        </div>
        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          rows={5}
          maxLength={280}
          placeholder="投稿テキストを入力してください..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-right text-xs text-gray-400 mt-1">
          {postText.length} / 280
        </div>
      </div>

      {/* ハッシュタグ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ハッシュタグ（カンマ区切り）
        </label>
        <input
          type="text"
          value={hashtagInput}
          onChange={(e) => handleHashtagInputChange(e.target.value)}
          placeholder="漫画, AI漫画, BuzzComic"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {hashtags.map((tag, i) => (
              <span
                key={i}
                className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* スケジュール設定 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          投稿タイミング
        </label>
        <div className="flex gap-3 mb-3">
          <button
            type="button"
            onClick={() => setIsImmediate(true)}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
              isImmediate
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            )}
          >
            即時投稿
          </button>
          <button
            type="button"
            onClick={() => setIsImmediate(false)}
            className={cn(
              "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
              !isImmediate
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            )}
          >
            日時指定
          </button>
        </div>

        {!isImmediate && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={minScheduledAt}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* メッセージ */}
      {message && (
        <div
          className={cn(
            "px-4 py-3 rounded-lg text-sm",
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          )}
        >
          {message.text}
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3">
        {isImmediate ? (
          <button
            type="button"
            onClick={() => handleSchedule(true)}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "処理中..." : "今すぐ投稿"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSchedule(false)}
            disabled={isLoading || !scheduledAt}
            className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "処理中..." : "投稿予約する"}
          </button>
        )}
      </div>
    </div>
  );
}
