'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface VideoPlayerProps {
  src: string;
  /** Poster image shown before playback starts */
  poster?: string;
  /** CSS class applied to the outer wrapper */
  className?: string;
  /** Called when the video has successfully loaded metadata */
  onLoaded?: (duration: number) => void;
}

/**
 * A minimal HTML5 video player with custom controls.
 * Optimised for portrait (9:16) and square (1:1) aspect ratios.
 */
export default function VideoPlayer({ src, poster, className = '', onLoaded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffered, setBuffered] = useState(0);

  // Sync play/pause state
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const t = parseFloat(e.target.value);
    video.currentTime = t;
    setCurrentTime(t);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const v = parseFloat(e.target.value);
    video.volume = v;
    setVolume(v);
    setMuted(v === 0);
  }, []);

  const handleMuteToggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const handleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    } else {
      video.requestFullscreen().catch(console.error);
    }
  }, []);

  // Update buffered progress
  const updateBuffered = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.buffered.length) return;
    setBuffered(video.buffered.end(video.buffered.length - 1));
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      updateBuffered();
    };
    const onLoadedMetadata = () => {
      setDuration(video.duration);
      onLoaded?.(video.duration);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [onLoaded, updateBuffered]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div className={`relative bg-black overflow-hidden rounded-xl group ${className}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        className="w-full h-full object-contain"
        onClick={handlePlayPause}
      />

      {/* Centre play/pause button (fades in on hover or when paused) */}
      <button
        aria-label={playing ? '一時停止' : '再生'}
        onClick={handlePlayPause}
        className={`
          absolute inset-0 flex items-center justify-center
          transition-opacity duration-200
          ${playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}
        `}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white text-3xl">
          {playing ? '⏸' : '▶'}
        </span>
      </button>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
        {/* Progress / seek */}
        <div className="relative h-1 mb-3 rounded-full bg-white/30 cursor-pointer">
          {/* Buffered */}
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-white/40"
            style={{ width: `${bufferedProgress}%` }}
          />
          {/* Played */}
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-white"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
            aria-label="シーク"
          />
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-3 text-white text-sm">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button onClick={handlePlayPause} aria-label={playing ? '一時停止' : '再生'} className="hover:opacity-80">
              {playing ? '⏸' : '▶'}
            </button>

            {/* Mute / Volume */}
            <button onClick={handleMuteToggle} aria-label={muted ? 'ミュート解除' : 'ミュート'} className="hover:opacity-80">
              {muted || volume === 0 ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 accent-white cursor-pointer"
              aria-label="音量"
            />

            {/* Time */}
            <span className="tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Fullscreen */}
          <button onClick={handleFullscreen} aria-label="フルスクリーン" className="hover:opacity-80">
            ⛶
          </button>
        </div>
      </div>
    </div>
  );
}
