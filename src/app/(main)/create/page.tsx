"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MangaEditor, MangaFormData } from "@/components/upload/MangaEditor";

export default function CreateMangaPage() {
  const router = useRouter();
  const [mangaId, setMangaId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Create a draft manga on mount so we have an ID for file uploads
  useEffect(() => {
    async function initDraft() {
      try {
        const res = await fetch("/api/manga", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "（タイトル未設定）", status: "draft" }),
        });
        if (!res.ok) {
          const d = await res.json();
          setSaveError(d.error ?? "初期化に失敗しました");
          return;
        }
        const manga = await res.json();
        setMangaId(manga.id);
      } catch {
        setSaveError("ネットワークエラーが発生しました");
      } finally {
        setIsInitializing(false);
      }
    }
    initDraft();
  }, []);

  const handleSave = async (data: MangaFormData) => {
    if (!mangaId) return;
    setIsSaving(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      // Update manga metadata
      const res = await fetch(`/api/manga/${mangaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          genre: data.genre,
          tags: data.tags,
          coverUrl: data.coverUrl,
          coverWidth: data.coverWidth,
          coverHeight: data.coverHeight,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error ?? "保存に失敗しました");
        return;
      }

      // Sync panels: reorder
      if (data.panels.length > 0) {
        // Add panels that have a server imageUrl but no DB ID yet (newly uploaded)
        for (const panel of data.panels) {
          if (!panel.id.match(/^[a-z0-9]{20,}$/)) {
            // tempId – need to persist
            await fetch(`/api/manga/${mangaId}/panels`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageUrl: panel.imageUrl,
                width: panel.width,
                height: panel.height,
                order: panel.order,
              }),
            });
          }
        }

        // Reorder existing panels
        await fetch(`/api/manga/${mangaId}/panels`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            panels: data.panels.map((p) => ({ id: p.id, order: p.order })),
          }),
        });
      }

      setSuccessMessage("下書きを保存しました");
    } catch {
      setSaveError("ネットワークエラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (data: MangaFormData) => {
    if (!mangaId) return;
    setIsSubmitting(true);
    setSaveError(null);
    setSuccessMessage(null);
    try {
      // Save first
      await handleSave(data);

      // Then submit for review
      const res = await fetch(`/api/manga/${mangaId}/submit`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error ?? "提出に失敗しました");
        return;
      }

      setSuccessMessage("審査に提出しました！");
      // Redirect to manga detail page after short delay
      setTimeout(() => {
        router.push(`/manga/${mangaId}`);
      }, 1500);
    } catch {
      setSaveError("ネットワークエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">漫画を作成</h1>
        <p className="text-sm text-gray-500 mt-1">
          パネルをアップロードして漫画を投稿しましょう
        </p>
      </div>

      {saveError && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-600">{saveError}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      {isInitializing ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
          準備中...
        </div>
      ) : mangaId ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <MangaEditor
            mangaId={mangaId}
            onSave={handleSave}
            onSubmit={handleSubmit}
            isSaving={isSaving}
            isSubmitting={isSubmitting}
          />
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400 text-sm">
          初期化に失敗しました。ページを再読み込みしてください。
        </div>
      )}
    </div>
  );
}
