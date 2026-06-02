"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Eye, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MangaCardData {
  id: string;
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  genre?: string | null;
  score: number;
  totalViews: number;
  totalLikes: number;
  author: {
    id: string;
    name?: string | null;
    avatarUrl?: string | null;
  };
  createdAt: Date | string;
}

interface MangaCardProps {
  manga: MangaCardData;
  className?: string;
  priority?: boolean;
}

const GENRE_COLORS: Record<string, string> = {
  action: "bg-red-100 text-red-700",
  romance: "bg-pink-100 text-pink-700",
  comedy: "bg-yellow-100 text-yellow-700",
  horror: "bg-purple-100 text-purple-700",
  sf: "bg-blue-100 text-blue-700",
  general: "bg-gray-100 text-gray-700",
  "その他": "bg-gray-100 text-gray-700",
};

const GENRE_LABELS: Record<string, string> = {
  action: "アクション",
  romance: "ロマンス",
  comedy: "コメディ",
  horror: "ホラー",
  sf: "SF",
  general: "一般",
  "その他": "その他",
};

export default function MangaCard({ manga, className, priority = false }: MangaCardProps) {
  const genreKey = manga.genre ?? "general";
  const genreColor = GENRE_COLORS[genreKey] ?? "bg-gray-100 text-gray-700";
  const genreLabel = GENRE_LABELS[genreKey] ?? genreKey;

  return (
    <Link
      href={`/manga/${manga.id}`}
      className={cn(
        "group flex flex-col bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200",
        className
      )}
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
        {manga.coverImageUrl ? (
          <Image
            src={manga.coverImageUrl}
            alt={manga.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
            <span className="text-4xl">📖</span>
          </div>
        )}
        {/* Genre Badge */}
        <div className="absolute top-2 left-2">
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", genreColor)}>
            {genreLabel}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col gap-1.5 p-3 flex-1">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
          {manga.title}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-1">
          {manga.author.name ?? "匿名"}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-auto pt-1">
          <span className="flex items-center gap-1 text-xs text-amber-500">
            <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" />
            {manga.score.toFixed(1)}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Eye className="w-3 h-3" />
            {formatCount(manga.totalViews)}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Heart className="w-3 h-3" />
            {formatCount(manga.totalLikes)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
