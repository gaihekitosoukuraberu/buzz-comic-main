"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  mangaId: string;
  initialLikes: number;
}

export default function LikeButton({ mangaId, initialLikes }: LikeButtonProps) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);
    const wasLiked = liked;
    // Optimistic update
    setLiked(!wasLiked);
    setLikes((n) => n + (wasLiked ? -1 : 1));
    try {
      const res = await fetch(`/api/manga/${mangaId}/like`, {
        method: wasLiked ? "DELETE" : "POST",
      });
      if (!res.ok) {
        // Revert on failure
        setLiked(wasLiked);
        setLikes((n) => n + (wasLiked ? 1 : -1));
      }
    } catch {
      setLiked(wasLiked);
      setLikes((n) => n + (wasLiked ? 1 : -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full border font-medium text-sm transition-all",
        liked
          ? "bg-pink-50 border-pink-300 text-pink-600 hover:bg-pink-100"
          : "bg-white border-gray-200 text-gray-600 hover:border-pink-300 hover:text-pink-600",
        loading && "opacity-60 cursor-not-allowed"
      )}
      aria-label={liked ? "いいねを取り消す" : "いいねする"}
    >
      <Heart
        className={cn(
          "w-4 h-4 transition-transform",
          liked ? "fill-pink-500 stroke-pink-500 scale-110" : "fill-none",
          loading && "animate-pulse"
        )}
      />
      {likes.toLocaleString()}
    </button>
  );
}
