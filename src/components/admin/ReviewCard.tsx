"use client";

import { useState } from "react";
import Image from "next/image";
import { formatDateTime } from "@/lib/utils";

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

interface ReviewCardManga {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  author: Author;
  panels: Panel[];
}

interface ReviewCardProps {
  manga: ReviewCardManga;
  onDecision: (mangaId: string, decision: "approved" | "rejected", reason?: string) => Promise<void>;
}

export default function ReviewCard({ manga, onDecision }: ReviewCardProps) {
  const [panelIndex, setPanelIndex] = useState(0);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const sortedPanels = [...manga.panels].sort((a, b) => a.order - b.order);

  async function handleApprove() {
    setLoading(true);
    try {
      await onDecision(manga.id, "approved");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!showRejectForm) {
      setShowRejectForm(true);
      return;
    }
    setLoading(true);
    try {
      await onDecision(manga.id, "rejected", rejectReason);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {manga.author.avatarUrl ? (
            <Image
              src={manga.author.avatarUrl}
              alt={manga.author.name ?? manga.author.email}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
              {(manga.author.name ?? manga.author.email)[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">
              {manga.author.name ?? manga.author.email}
            </p>
            <p className="text-xs text-gray-500">{manga.author.email}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            審査待ち
          </span>
          <p className="mt-1 text-xs text-gray-400">
            {formatDateTime(manga.createdAt)}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">{manga.title}</h3>
          {manga.genre && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 mt-1">
              {manga.genre}
            </span>
          )}
          {manga.description && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-3">
              {manga.description}
            </p>
          )}
        </div>

        {/* Panel viewer */}
        {sortedPanels.length > 0 ? (
          <div className="space-y-3">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={sortedPanels[panelIndex]?.imageUrl ?? "/placeholder.png"}
                alt={`パネル ${panelIndex + 1}`}
                fill
                className="object-contain"
              />
            </div>
            {sortedPanels.length > 1 && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPanelIndex((i) => Math.max(0, i - 1))}
                  disabled={panelIndex === 0}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                <span className="text-sm text-gray-500">
                  {panelIndex + 1} / {sortedPanels.length}
                </span>
                <button
                  onClick={() =>
                    setPanelIndex((i) => Math.min(sortedPanels.length - 1, i + 1))
                  }
                  disabled={panelIndex === sortedPanels.length - 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
            )}
            {/* Thumbnail strip */}
            {sortedPanels.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {sortedPanels.map((panel, idx) => (
                  <button
                    key={panel.id}
                    onClick={() => setPanelIndex(idx)}
                    className={`relative h-14 w-10 flex-shrink-0 overflow-hidden rounded border-2 transition-colors ${
                      idx === panelIndex
                        ? "border-blue-500"
                        : "border-transparent"
                    }`}
                  >
                    <Image
                      src={panel.imageUrl}
                      alt={`サムネイル ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
            パネルなし
          </div>
        )}
      </div>

      {/* Reject reason form */}
      {showRejectForm && (
        <div className="px-5 pb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            却下理由
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="却下理由を入力してください（任意）"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <button
            onClick={() => {
              setShowRejectForm(false);
              setRejectReason("");
            }}
            className="mt-1 text-xs text-gray-400 hover:text-gray-600"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 border-t border-gray-100 p-4">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "処理中..." : "承認"}
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="flex-1 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "処理中..." : showRejectForm ? "却下を確定" : "却下"}
        </button>
      </div>
    </div>
  );
}
