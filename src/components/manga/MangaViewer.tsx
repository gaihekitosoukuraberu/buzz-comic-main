"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { ZoomIn, ZoomOut, Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Panel {
  id: string;
  order: number;
  imageUrl: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

interface MangaViewerProps {
  panels: Panel[];
  title: string;
  mangaId: string;
}

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2];
const DEFAULT_ZOOM_INDEX = 1;

export default function MangaViewer({ panels, title, mangaId }: MangaViewerProps) {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);

  const zoom = ZOOM_LEVELS[zoomIndex];

  // Count view once on mount
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    fetch(`/api/manga/${mangaId}/view`, { method: "POST" }).catch(() => {});
  }, [mangaId]);

  const zoomIn = useCallback(() => {
    setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomIndex((i) => Math.max(i - 1, 0));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "f" || e.key === "F") toggleFullscreen();
      if (e.key === "Escape" && isFullscreen) document.exitFullscreen().catch(() => {});
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoomIn, zoomOut, toggleFullscreen, isFullscreen]);

  const sortedPanels = [...panels].sort((a, b) => a.order - b.order);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-gray-950 rounded-xl overflow-hidden",
        isFullscreen && "fixed inset-0 z-50 rounded-none"
      )}
    >
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800">
        <span className="text-sm font-medium text-gray-200 truncate max-w-[200px]">{title}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={zoomIndex === 0}
            className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="縮小 (-)"
            aria-label="縮小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 w-10 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="拡大 (+)"
            aria-label="拡大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            title="フルスクリーン (F)"
            aria-label="フルスクリーン"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          {isFullscreen && (
            <button
              onClick={() => document.exitFullscreen().catch(() => {})}
              className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors ml-1"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Panels */}
      <div
        className={cn(
          "overflow-y-auto overflow-x-auto",
          isFullscreen ? "h-[calc(100vh-44px)]" : "max-h-[80vh]"
        )}
      >
        <div
          className="flex flex-col items-center py-4 gap-1 transition-all duration-200 origin-top"
          style={{ width: `${zoom * 100}%`, minWidth: "100%" }}
        >
          {sortedPanels.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>パネルがありません</p>
            </div>
          ) : (
            sortedPanels.map((panel) => (
              <PanelImage key={panel.id} panel={panel} zoom={zoom} />
            ))
          )}
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-gray-900/50 text-xs text-gray-600 border-t border-gray-800">
        <span>+ / - でズーム</span>
        <span>F でフルスクリーン</span>
      </div>
    </div>
  );
}

interface PanelImageProps {
  panel: Panel;
  zoom: number;
}

function PanelImage({ panel }: PanelImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 min-h-[200px]">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-indigo-400 rounded-full animate-spin" />
        </div>
      )}
      <Image
        src={panel.imageUrl}
        alt={panel.altText ?? `パネル ${panel.order}`}
        width={panel.width ?? 800}
        height={panel.height ?? 1200}
        className={cn(
          "w-full h-auto select-none transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        sizes="100vw"
      />
    </div>
  );
}
