"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";

interface ShareButtonProps {
  title: string;
}

export default function ShareButton({ title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-600 font-medium text-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors"
      aria-label="シェア"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-500" />
          コピーしました
        </>
      ) : typeof navigator !== "undefined" && "share" in navigator ? (
        <>
          <Share2 className="w-4 h-4" />
          シェア
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          URLをコピー
        </>
      )}
    </button>
  );
}
