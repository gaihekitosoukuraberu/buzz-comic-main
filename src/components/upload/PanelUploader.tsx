"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface PanelItem {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  order: number;
  file?: File;
}

interface UploadProgress {
  [key: string]: number; // fileId -> 0-100
}

interface PanelUploaderProps {
  mangaId: string;
  panels: PanelItem[];
  onChange: (panels: PanelItem[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function PanelUploader({
  mangaId,
  panels,
  onChange,
  disabled = false,
}: PanelUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({});
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag state for panel reorder
  const dragPanelIdx = useRef<number | null>(null);

  // ---- File validation ----
  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `${file.name}: jpg/png/webp のみ対応しています`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: ファイルサイズは50MB以下にしてください`;
    }
    return null;
  }

  // ---- Upload a single file ----
  const uploadFile = useCallback(
    async (file: File): Promise<PanelItem | null> => {
      const tempId = crypto.randomUUID();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("manga_id", mangaId);
      formData.append("type", "panel");

      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress((prev) => ({
              ...prev,
              [tempId]: Math.round((e.loaded / e.total) * 100),
            }));
          }
        });

        xhr.addEventListener("load", () => {
          setProgress((prev) => {
            const next = { ...prev };
            delete next[tempId];
            return next;
          });

          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            resolve({
              id: tempId,
              imageUrl: data.url,
              width: data.width,
              height: data.height,
              order: 0,
              file,
            });
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              setErrors((prev) => [...prev, data.error ?? "アップロード失敗"]);
            } catch {
              setErrors((prev) => [...prev, "アップロード失敗"]);
            }
            resolve(null);
          }
        });

        xhr.addEventListener("error", () => {
          setProgress((prev) => {
            const next = { ...prev };
            delete next[tempId];
            return next;
          });
          setErrors((prev) => [...prev, `${file.name}: ネットワークエラー`]);
          resolve(null);
        });

        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });
    },
    [mangaId]
  );

  // ---- Handle file selection/drop ----
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newErrors: string[] = [];
      const validFiles: File[] = [];

      for (const file of fileArray) {
        const err = validateFile(file);
        if (err) {
          newErrors.push(err);
        } else {
          validFiles.push(file);
        }
      }

      if (newErrors.length > 0) {
        setErrors((prev) => [...prev, ...newErrors]);
      }

      if (validFiles.length === 0) return;

      // Upload all valid files concurrently
      const results = await Promise.all(validFiles.map(uploadFile));
      const uploaded = results.filter((r): r is PanelItem => r !== null);

      if (uploaded.length > 0) {
        const startOrder = panels.length;
        const withOrder = uploaded.map((p, i) => ({
          ...p,
          order: startOrder + i,
        }));
        onChange([...panels, ...withOrder]);
      }
    },
    [panels, onChange, uploadFile]
  );

  // ---- Drag & Drop (file drop zone) ----
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  // ---- Panel reorder via native drag ----
  const onPanelDragStart = (idx: number) => {
    dragPanelIdx.current = idx;
  };
  const onPanelDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const from = dragPanelIdx.current;
    if (from === null || from === idx) return;

    const reordered = [...panels];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(idx, 0, moved);
    dragPanelIdx.current = idx;
    onChange(reordered.map((p, i) => ({ ...p, order: i })));
  };
  const onPanelDragEnd = () => {
    dragPanelIdx.current = null;
  };

  // ---- Remove panel ----
  const removePanel = (idx: number) => {
    const updated = panels
      .filter((_, i) => i !== idx)
      .map((p, i) => ({ ...p, order: i }));
    onChange(updated);
  };

  const isUploading = Object.keys(progress).length > 0;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-10 h-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm text-gray-600">
            ここにドロップ、または
            <span className="text-blue-600 font-medium"> クリックして選択</span>
          </p>
          <p className="text-xs text-gray-400">
            jpg / png / webp &nbsp;·&nbsp; 最大 50MB &nbsp;·&nbsp; 複数ファイル可
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-sm text-red-600">
              {err}
            </p>
          ))}
          <button
            type="button"
            onClick={() => setErrors([])}
            className="text-xs text-red-400 underline mt-1"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Uploading indicator */}
      {isUploading && (
        <div className="space-y-2">
          {Object.entries(progress).map(([id, pct]) => (
            <div key={id} className="flex items-center gap-2 text-sm text-gray-600">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right">{pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Panel grid */}
      {panels.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-2">
            パネル {panels.length} 枚 &nbsp;·&nbsp; ドラッグで並び替え可
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {panels.map((panel, idx) => (
              <div
                key={panel.id}
                draggable
                onDragStart={() => onPanelDragStart(idx)}
                onDragOver={(e) => onPanelDragOver(e, idx)}
                onDragEnd={onPanelDragEnd}
                className="relative group rounded-md overflow-hidden border border-gray-200 bg-gray-50 aspect-square cursor-grab active:cursor-grabbing"
              >
                <Image
                  src={panel.imageUrl}
                  alt={`パネル ${idx + 1}`}
                  fill
                  className="object-cover pointer-events-none"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                />
                {/* Order badge */}
                <span className="absolute top-1 left-1 bg-black/60 text-white text-xs rounded px-1.5 py-0.5">
                  {idx + 1}
                </span>
                {/* Remove button */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removePanel(idx)}
                    className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-6 h-6 bg-red-500 rounded-full text-white text-xs hover:bg-red-600 transition-colors"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
