/**
 * FFmpeg video effect filter definitions for manga video generation.
 * All filters are expressed as fluent-ffmpeg / raw filter-complex strings.
 */

export interface KenBurnsConfig {
  /** Duration of the effect in seconds */
  duration: number;
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
  /** Frames per second */
  fps?: number;
  /**
   * Direction variant: zooms in from centre, or pans diagonally.
   * Cycling through variants keeps the slideshow visually varied.
   */
  variant?: 'zoom-in' | 'zoom-out' | 'pan-right' | 'pan-left';
}

export interface TitleOverlayConfig {
  title: string;
  author: string;
  width: number;
  height: number;
  /** Where in the clip to show the overlay (seconds from start) */
  startTime?: number;
  endTime?: number;
}

/**
 * Build a zoompan filter string that produces the Ken Burns (pan & zoom) effect
 * for a single still image.
 *
 * The zoompan filter syntax:
 *   zoompan=z='...':x='...':y='...':d=<frames>:s=<w>x<h>:fps=<fps>
 */
export function kenBurnsFilter(config: KenBurnsConfig): string {
  const { duration, width, height, fps = 25, variant = 'zoom-in' } = config;
  const frames = Math.round(duration * fps);

  // Scale factor: we over-scale the source so we can move/zoom within it.
  // zoompan 'z' expression ranges 1..maxZoom (relative to input).
  let zExpr: string;
  let xExpr: string;
  let yExpr: string;

  switch (variant) {
    case 'zoom-out':
      // Start zoomed in, slowly pull back
      zExpr = `'min(zoom,1.5)-0.002'`;
      xExpr = `'iw/2-(iw/zoom/2)'`;
      yExpr = `'ih/2-(ih/zoom/2)'`;
      break;

    case 'pan-right':
      // Steady zoom + pan left-to-right
      zExpr = `'1.3'`;
      xExpr = `'x+1.5'`;
      yExpr = `'ih/2-(ih/zoom/2)'`;
      break;

    case 'pan-left':
      // Steady zoom + pan right-to-left
      zExpr = `'1.3'`;
      xExpr = `'if(eq(on,1),iw/zoom*0.25,x-1.5)'`;
      yExpr = `'ih/2-(ih/zoom/2)'`;
      break;

    case 'zoom-in':
    default:
      // Slowly zoom into centre
      zExpr = `'min(zoom+0.0015,1.5)'`;
      xExpr = `'iw/2-(iw/zoom/2)'`;
      yExpr = `'ih/2-(ih/zoom/2)'`;
      break;
  }

  return `zoompan=z=${zExpr}:x=${xExpr}:y=${yExpr}:d=${frames}:s=${width}x${height}:fps=${fps}`;
}

/**
 * Build a simple fade-in filter for the beginning of a stream.
 * Uses the `fade` video filter.
 */
export function fadeInFilter(fps = 25, fadeDurationSec = 0.4): string {
  const nbFrames = Math.round(fadeDurationSec * fps);
  return `fade=t=in:st=0:d=${fadeDurationSec}:nb_frames=${nbFrames}`;
}

/**
 * Build a fade-out filter starting at `startSec` (seconds from stream start).
 */
export function fadeOutFilter(startSec: number, fadeDurationSec = 0.4): string {
  return `fade=t=out:st=${startSec}:d=${fadeDurationSec}`;
}

/**
 * Build a drawtext filter that renders a title + author overlay at the
 * bottom of the frame.
 *
 * Note: fontfile path must be an absolute path on the server where ffmpeg runs.
 * We fall back to the built-in "sans-serif" alias that most ffmpeg builds support.
 */
export function titleOverlayFilter(config: TitleOverlayConfig): string {
  const {
    title,
    author,
    width,
    height,
    startTime = 0,
    endTime,
  } = config;

  const enableExpr =
    endTime != null
      ? `between(t,${startTime},${endTime})`
      : `gte(t,${startTime})`;

  // Escape single-quotes and special chars for ffmpeg filter syntax
  const esc = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:');

  const safeTitle = esc(title);
  const safeAuthor = esc(author);

  const boxColor = '0x00000088'; // semi-transparent black
  const fontColor = 'white';
  const titleSize = Math.round(height * 0.045); // ~4.5% of frame height
  const authorSize = Math.round(height * 0.03);
  const bottomMargin = Math.round(height * 0.04);
  const lineGap = Math.round(height * 0.055);

  const titleFilter =
    `drawtext=text='${safeTitle}'` +
    `:fontsize=${titleSize}` +
    `:fontcolor=${fontColor}` +
    `:box=1:boxcolor=${boxColor}:boxborderw=10` +
    `:x=(w-text_w)/2` +
    `:y=h-text_h-${bottomMargin + lineGap}` +
    `:enable='${enableExpr}'`;

  const authorFilter =
    `drawtext=text='${safeAuthor}'` +
    `:fontsize=${authorSize}` +
    `:fontcolor=${fontColor}` +
    `:box=1:boxcolor=${boxColor}:boxborderw=8` +
    `:x=(w-text_w)/2` +
    `:y=h-text_h-${bottomMargin}` +
    `:enable='${enableExpr}'`;

  return `${titleFilter},${authorFilter}`;
}

/**
 * Select a Ken Burns variant based on panel index so consecutive panels
 * look varied.
 */
export function variantForIndex(
  index: number
): KenBurnsConfig['variant'] {
  const variants: KenBurnsConfig['variant'][] = [
    'zoom-in',
    'pan-right',
    'zoom-out',
    'pan-left',
  ];
  return variants[index % variants.length];
}
