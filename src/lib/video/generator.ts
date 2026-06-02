/**
 * Manga video generation engine.
 *
 * Uses fluent-ffmpeg when the system ffmpeg binary is available.
 * Falls back to @ffmpeg/ffmpeg (WebAssembly) when it is not.
 *
 * Output is written to public/videos/{mangaId}/
 */

import path from 'path';
import fs from 'fs/promises';
import { kenBurnsFilter, fadeInFilter, fadeOutFilter, titleOverlayFilter, variantForIndex } from './effects';

export interface VideoOptions {
  /** Database ID of the manga */
  mangaId: string;
  /** Absolute filesystem paths to panel images, in display order */
  panels: string[];
  /** Manga title (shown as overlay) */
  title: string;
  /** Author display name (shown as overlay) */
  author: string;
  /** Output aspect ratio / platform */
  format: 'vertical' | 'square';
  /** Seconds each panel is shown. Default: 3 */
  panelDuration?: number;
}

/** Resolved output dimensions for each supported format */
const FORMAT_DIMENSIONS: Record<VideoOptions['format'], { width: number; height: number }> = {
  vertical: { width: 720, height: 1280 },  // TikTok / YouTube Shorts
  square:   { width: 1080, height: 1080 }, // Instagram
};

const FPS = 25;
const FADE_DURATION = 0.4; // seconds

/**
 * Ensure the output directory exists and return the output file path.
 */
async function resolveOutputPath(mangaId: string, format: VideoOptions['format']): Promise<string> {
  const dir = path.join(process.cwd(), 'public', 'videos', mangaId);
  await fs.mkdir(dir, { recursive: true });
  return path.join(dir, `${format}.mp4`);
}

/**
 * Check whether the system-level `ffmpeg` binary is reachable.
 */
async function isSystemFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    import('child_process').then(({ execFile }) => {
      execFile('ffmpeg', ['-version'], (err) => resolve(!err));
    }).catch(() => resolve(false));
  });
}

// ---------------------------------------------------------------------------
// fluent-ffmpeg path (server-side, system ffmpeg binary)
// ---------------------------------------------------------------------------

/**
 * Generate a video using the system ffmpeg binary via fluent-ffmpeg.
 */
async function generateWithFluentFfmpeg(
  options: VideoOptions,
  outputPath: string
): Promise<string> {
  const ffmpeg = (await import('fluent-ffmpeg')).default;
  const { panels, title, author, format, panelDuration = 3 } = options;
  const { width, height } = FORMAT_DIMENSIONS[format];

  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    // Add each panel image as a still-image input with an explicit duration
    for (const panelPath of panels) {
      command
        .input(panelPath)
        .inputOptions([`-loop 1`, `-t ${panelDuration}`]);
    }

    // Build the filter_complex graph:
    //   For each panel:
    //     1. Scale + pad to target dimensions (letterbox / pillarbox)
    //     2. Apply Ken Burns zoompan
    //     3. Apply fade-in and fade-out
    //   Then apply title overlay to the entire concatenated stream.

    const filterParts: string[] = [];
    const concatInputs: string[] = [];

    for (let i = 0; i < panels.length; i++) {
      const variant = variantForIndex(i);

      // Scale preserving aspect ratio, then pad to exact output size
      filterParts.push(
        `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[scaled${i}]`
      );

      // Ken Burns effect
      const kenBurns = kenBurnsFilter({ duration: panelDuration, width, height, fps: FPS, variant });
      filterParts.push(`[scaled${i}]${kenBurns}[kb${i}]`);

      // Fade in + fade out
      const fadeIn = fadeInFilter(FPS, FADE_DURATION);
      const fadeOut = fadeOutFilter(panelDuration - FADE_DURATION, FADE_DURATION);
      filterParts.push(`[kb${i}]${fadeIn},${fadeOut},setpts=PTS-STARTPTS[v${i}]`);

      concatInputs.push(`[v${i}]`);
    }

    // Concatenate all panel streams
    const n = panels.length;
    filterParts.push(
      `${concatInputs.join('')}concat=n=${n}:v=1:a=0[concat_v]`
    );

    // Title overlay on full video (show from t=0.2 so fade-in is past)
    const totalDuration = panels.length * panelDuration;
    const overlayFilter = titleOverlayFilter({
      title,
      author,
      width,
      height,
      startTime: 0.2,
      endTime: totalDuration - 0.2,
    });
    filterParts.push(`[concat_v]${overlayFilter}[outv]`);

    command
      .complexFilter(filterParts, 'outv')
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 22',
        '-pix_fmt yuv420p',
        '-movflags +faststart',
        '-an', // no audio
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        console.log('[video-generator] ffmpeg command:', cmd);
      })
      .on('progress', (progress) => {
        console.log('[video-generator] progress:', progress.percent?.toFixed(1), '%');
      })
      .on('end', () => {
        console.log('[video-generator] done:', outputPath);
        resolve(outputPath);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('[video-generator] error:', err.message);
        console.error('[video-generator] stderr:', stderr);
        reject(new Error(`ffmpeg failed: ${err.message}`));
      })
      .run();
  });
}

// ---------------------------------------------------------------------------
// @ffmpeg/ffmpeg (WebAssembly) fallback path
// ---------------------------------------------------------------------------

/**
 * Generate a video using @ffmpeg/ffmpeg (WASM).
 * This path is intentionally simpler (no Ken Burns, basic fade) because
 * WASM ffmpeg has limited filter support and is significantly slower.
 */
async function generateWithWasmFfmpeg(
  options: VideoOptions,
  outputPath: string
): Promise<string> {
  // @ffmpeg/ffmpeg v0.12 uses a class-based API
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { panels, title, author, format, panelDuration = 3 } = options;
  const { width, height } = FORMAT_DIMENSIONS[format];

  const ffmpegWasm = new FFmpeg();
  await ffmpegWasm.load();

  // Write all panel images into the WASM FS
  for (let i = 0; i < panels.length; i++) {
    const data = await fs.readFile(panels[i]);
    await ffmpegWasm.writeFile(`panel${i}.jpg`, new Uint8Array(data));
  }

  // Create a concat file
  let concatContent = '';
  for (let i = 0; i < panels.length; i++) {
    concatContent += `file 'panel${i}.jpg'\nduration ${panelDuration}\n`;
  }
  // repeat last frame to avoid truncation
  concatContent += `file 'panel${panels.length - 1}.jpg'\n`;
  const encoder = new TextEncoder();
  await ffmpegWasm.writeFile('concat.txt', encoder.encode(concatContent));

  const overlayFilter = titleOverlayFilter({ title, author, width, height, startTime: 0 });

  await ffmpegWasm.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
    '-vf',
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,` +
    overlayFilter,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-an',
    'output.mp4',
  ]);

  const outputData = await ffmpegWasm.readFile('output.mp4') as Uint8Array;
  await fs.writeFile(outputPath, Buffer.from(outputData));

  console.log('[video-generator] wasm done:', outputPath);
  return outputPath;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a manga slideshow video and return the absolute filesystem path
 * to the output MP4 file.
 *
 * The file is also accessible via HTTP at `/videos/{mangaId}/{format}.mp4`.
 */
export async function generateMangaVideo(options: VideoOptions): Promise<string> {
  const { mangaId, panels, format } = options;

  if (!panels || panels.length === 0) {
    throw new Error('panels 配列が空です');
  }

  const outputPath = await resolveOutputPath(mangaId, format);

  // Verify all panel files exist before starting ffmpeg
  for (const p of panels) {
    try {
      await fs.access(p);
    } catch {
      throw new Error(`パネル画像が見つかりません: ${p}`);
    }
  }

  const useSystem = await isSystemFfmpegAvailable();

  if (useSystem) {
    console.log('[video-generator] using system ffmpeg');
    return generateWithFluentFfmpeg(options, outputPath);
  } else {
    console.log('[video-generator] system ffmpeg not found, falling back to WASM');
    return generateWithWasmFfmpeg(options, outputPath);
  }
}

/**
 * Convert a public-URL image path (e.g. /uploads/mangas/abc/panels/xyz.jpg)
 * to an absolute filesystem path.
 */
export function publicUrlToFilePath(publicUrl: string): string {
  return path.join(process.cwd(), 'public', publicUrl);
}

/**
 * Convert an absolute filesystem path to a public video URL.
 */
export function videoFilePathToUrl(absolutePath: string): string {
  const publicDir = path.join(process.cwd(), 'public');
  return absolutePath.replace(publicDir, '');
}
