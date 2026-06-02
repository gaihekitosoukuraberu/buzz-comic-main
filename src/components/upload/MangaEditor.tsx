"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { PanelUploader, PanelItem } from "./PanelUploader";

const GENRES = [
  { value: "general", label: "一般" },
  { value: "action", label: "アクション" },
  { value: "romance", label: "ロマンス" },
  { value: "comedy", label: "コメディ" },
  { value: "horror", label: "ホラー" },
  { value: "sf", label: "SF" },
  { value: "fantasy", label: "ファンタジー" },
  { value: "slice_of_life", label: "日常" },
];

export interface MangaFormData {
  title: string;
  description: string;
  genre: string;
  tags: string[];
  coverUrl: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  panels: PanelItem[];
}

interface MangaEditorProps {
  mangaId: string;
  initialData?: Partial<MangaFormData>;
  onSave?: (data: MangaFormData) => Promise<void>;
  onSubmit?: (data: MangaFormData) => Promise<void>;
  isSaving?: boolean;
  isSubmitting?: boolean;
}

export function MangaEditor({
  mangaId,
  initialData,
  onSave,
  onSubmit,
  isSaving = false,
  isSubmitting = false,
}: MangaEditorProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [genre, setGenre] = useState(initialData?.genre ?? "general");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialData?.coverUrl ?? null);
  const [coverWidth, setCoverWidth] = useState<number | null>(initialData?.coverWidth ?? null);
  const [coverHeight, setCoverHeight] = useState<number | null>(initialData?.coverHeight ?? null);
  const [panels, setPanels] = useState<PanelItem[]>(initialData?.panels ?? []);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ---- Tag management ----
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  // ---- Cover upload ----
  const uploadCover = useCallback(
    async (file: File) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setCoverError("jpg/png/webp のみ対応しています");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setCoverError("ファイルサイズは50MB以下にしてください");
        return;
      }

      setCoverUploading(true);
      setCoverError(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("manga_id", mangaId);
      formData.append("type", "cover");

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const d = await res.json();
          setCoverError(d.error ?? "アップロード失敗");
          return;
        }
        const data = await res.json();
        setCoverUrl(data.url);
        setCoverWidth(data.width);
        setCoverHeight(data.height);
      } catch {
        setCoverError("ネットワークエラーが発生しました");
      } finally {
        setCoverUploading(false);
      }
    },
    [mangaId]
  );

  // ---- Form validation ----
  const validate = (): boolean => {
    if (!title.trim()) {
      setFormError("タイトルを入力してください");
      return false;
    }
    setFormError(null);
    return true;
  };

  const buildFormData = (): MangaFormData => ({
    title,
    description,
    genre,
    tags,
    coverUrl,
    coverWidth,
    coverHeight,
    panels,
  });

  const handleSave = async () => {
    if (!validate()) return;
    await onSave?.(buildFormData());
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (panels.length === 0) {
      setFormError("パネルを1枚以上追加してください");
      return;
    }
    await onSubmit?.(buildFormData());
  };

  const disabled = isSaving || isSubmitting;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="漫画タイトルを入力"
          disabled={disabled}
          maxLength={200}
          className={cn(
            "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
            disabled && "opacity-60 bg-gray-50"
          )}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/200</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">あらすじ</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="作品の紹介文を入力"
          disabled={disabled}
          rows={4}
          maxLength={2000}
          className={cn(
            "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y",
            disabled && "opacity-60 bg-gray-50"
          )}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/2000</p>
      </div>

      {/* Genre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ジャンル</label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
            disabled && "opacity-60 bg-gray-50"
          )}
        >
          {GENRES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">タグ</label>
        <div
          className={cn(
            "flex flex-wrap gap-1.5 rounded-lg border border-gray-300 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500",
            disabled && "opacity-60 bg-gray-50"
          )}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs rounded px-2 py-0.5"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-blue-900 leading-none"
                >
                  x
                </button>
              )}
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
            placeholder={tags.length === 0 ? "タグを入力 (Enter で追加)" : ""}
            disabled={disabled}
            className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">Enter または , で追加</p>
      </div>

      {/* Cover image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">カバー画像</label>
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "w-32 h-44 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden relative",
              !disabled && "hover:border-blue-400",
              disabled && "cursor-not-allowed opacity-60"
            )}
            onClick={() => !disabled && coverInputRef.current?.click()}
          >
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt="カバー"
                fill
                className="object-cover"
                sizes="128px"
              />
            ) : coverUploading ? (
              <div className="text-xs text-gray-500 text-center px-2">
                アップロード中...
              </div>
            ) : (
              <div className="text-xs text-gray-400 text-center px-2">
                クリックして選択
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs text-gray-500">
              推奨サイズ: 512 x 720px (2:3)
              <br />
              形式: jpg / png / webp
            </p>
            {coverUrl && !disabled && (
              <button
                type="button"
                onClick={() => {
                  setCoverUrl(null);
                  setCoverWidth(null);
                  setCoverHeight(null);
                }}
                className="text-xs text-red-500 underline"
              >
                削除
              </button>
            )}
            {coverError && (
              <p className="text-xs text-red-500">{coverError}</p>
            )}
          </div>
        </div>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadCover(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Panels */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          パネル管理
        </label>
        <PanelUploader
          mangaId={mangaId}
          panels={panels}
          onChange={setPanels}
          disabled={disabled}
        />
      </div>

      {/* Error */}
      {formError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-600">{formError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled}
          className={cn(
            "px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        >
          {isSaving ? "保存中..." : "下書き保存"}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          className={cn(
            "px-5 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        >
          {isSubmitting ? "提出中..." : "審査に提出"}
        </button>
      </div>
    </div>
  );
}
