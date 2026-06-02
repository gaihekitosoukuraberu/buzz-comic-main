'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import VideoPlayer from './VideoPlayer';

interface VideoGeneratorProps {
  mangaId: string;
  mangaTitle: string;
}

type Format = 'vertical' | 'square';
type JobStatus = 'idle' | 'pending' | 'running' | 'done' | 'failed';

interface JobPollResult {
  job_id: string;
  status: JobStatus;
  error?: string;
  result?: {
    video_url?: string;
  };
  completed_at?: string;
}

const FORMAT_LABELS: Record<Format, string> = {
  vertical: 'TikTok / Shorts (720×1280)',
  square: 'Instagram (1080×1080)',
};

const STATUS_LABELS: Record<JobStatus, string> = {
  idle: '待機中',
  pending: 'キュー待ち',
  running: '生成中...',
  done: '完成',
  failed: '失敗',
};

/** Polling interval in ms */
const POLL_INTERVAL = 2500;

export default function VideoGenerator({ mangaId, mangaTitle }: VideoGeneratorProps) {
  const [format, setFormat] = useState<Format>('vertical');
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate a fake progress bar while running (real progress not exposed by API)
  useEffect(() => {
    if (jobStatus === 'running') {
      setProgress(0);
      const tick = setInterval(() => {
        setProgress((p) => {
          // Approach 95 % asymptotically
          if (p >= 95) return p;
          return Math.min(p + Math.random() * 4, 95);
        });
      }, 600);
      return () => clearInterval(tick);
    }
    if (jobStatus === 'done') setProgress(100);
    if (jobStatus === 'failed') setProgress(0);
  }, [jobStatus]);

  // Poll job status
  const startPolling = useCallback(
    (id: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/video/generate?job_id=${id}`);
          if (!res.ok) return;
          const data = (await res.json()) as JobPollResult;
          setJobStatus(data.status);
          if (data.status === 'done') {
            clearInterval(pollRef.current!);
            const url = data.result?.video_url ?? `/api/video/${mangaId}?format=${format}`;
            setVideoUrl(url);
          } else if (data.status === 'failed') {
            clearInterval(pollRef.current!);
            setErrorMsg(data.error ?? '不明なエラーが発生しました');
          }
        } catch {
          // Network error — keep polling
        }
      }, POLL_INTERVAL);
    },
    [mangaId, format]
  );

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    setJobStatus('pending');
    setErrorMsg(null);
    setVideoUrl(null);
    setJobId(null);

    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manga_id: mangaId, format }),
      });
      const data = (await res.json()) as { job_id?: string; error?: string; status?: string };

      if (!res.ok || !data.job_id) {
        throw new Error(data.error ?? '動画生成に失敗しました');
      }

      setJobId(data.job_id);
      setJobStatus((data.status as JobStatus) ?? 'pending');
      startPolling(data.job_id);
    } catch (err) {
      setJobStatus('failed');
      setErrorMsg(err instanceof Error ? err.message : '動画生成に失敗しました');
    }
  }, [mangaId, format, startPolling]);

  const handleDownload = useCallback(() => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${mangaTitle}-${format}.mp4`;
    a.click();
  }, [videoUrl, mangaTitle, format]);

  const handleShare = useCallback(async () => {
    if (!videoUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: mangaTitle, url: videoUrl });
      } catch {
        // User cancelled or API unsupported — ignore
      }
    } else {
      await navigator.clipboard.writeText(window.location.origin + videoUrl);
      alert('動画 URL をコピーしました');
    }
  }, [videoUrl, mangaTitle]);

  const isGenerating = jobStatus === 'pending' || jobStatus === 'running';

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">動画を生成</h2>

      {/* Format selector */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">フォーマット</label>
        <div className="flex gap-3">
          {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              disabled={isGenerating}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors
                ${format === f
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white
          hover:bg-indigo-700 active:bg-indigo-800 transition-colors
          disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Spinner />
            {STATUS_LABELS[jobStatus]}
          </>
        ) : (
          '動画を生成'
        )}
      </button>

      {/* Progress bar */}
      {isGenerating && (
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-indigo-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Status / error */}
      {jobId && !isGenerating && jobStatus !== 'idle' && (
        <p className={`text-sm ${jobStatus === 'failed' ? 'text-red-600' : 'text-gray-500'}`}>
          {jobStatus === 'failed' ? `エラー: ${errorMsg}` : STATUS_LABELS[jobStatus]}
          {jobId && <span className="ml-2 text-gray-400 text-xs">job: {jobId}</span>}
        </p>
      )}

      {/* Video preview */}
      {videoUrl && jobStatus === 'done' && (
        <div className="flex flex-col gap-4">
          <VideoPlayer
            src={videoUrl}
            className={format === 'vertical' ? 'aspect-[9/16] max-h-[480px]' : 'aspect-square max-h-[480px]'}
          />

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2
                text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ダウンロード
            </button>
            <button
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2
                text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              SNSに投稿
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
      />
    </svg>
  );
}
