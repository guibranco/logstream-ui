import { LogEntry, LogLevel } from '../types';
import {
  DEFAULT_PALETTE,
  ImageFormat,
  ImagePalette,
  LogImageOptions,
  imageFileName,
  logsToSvg,
} from './logImage';

/** PNG and JPEG are drawn at up to twice the size, for sharp text on high-DPI screens. */
const MAX_SCALE = 2;
/** Browsers refuse canvases past roughly these (Safari is the strictest on area). */
const MAX_CANVAS_SIDE = 16_384;
const MAX_CANVAS_AREA = 16_000_000;
/** Rows drawn in a PNG/JPEG; more would pass the canvas limits. SVG takes many more. */
export const RASTER_MAX_ROWS = 500;
export const SVG_MAX_ROWS = 5_000;

const LEVEL_FAMILIES: Record<LogLevel, string> = {
  debug: 'gray',
  info: 'sky',
  notice: 'teal',
  warning: 'amber',
  error: 'rose',
  critical: 'fuchsia',
};

let probe: CanvasRenderingContext2D | null | undefined;

/**
 * Any CSS colour (the themes use oklch) as `rgb()`/hex, so the SVG also opens in
 * tools that don't know newer colour syntaxes. Unchanged where no canvas is available.
 */
function toSrgb(colour: string): string {
  if (probe === undefined) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      probe = canvas.getContext('2d', { willReadFrequently: true });
    } catch {
      probe = null;
    }
  }
  if (!probe) return colour;
  try {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#000';
    probe.fillStyle = colour;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    return a === 255 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
  } catch {
    return colour;
  }
}

/** The colours on screen now (theme and light/dark), falling back to the default dark look. */
export function readPalette(root: HTMLElement = document.documentElement): ImagePalette {
  const style = getComputedStyle(root);
  const read = (name: string, fallback: string) => {
    const value = style.getPropertyValue(`--color-${name}`).trim();
    return value ? toSrgb(value) : fallback;
  };
  const levels = {} as ImagePalette['levels'];
  for (const [level, family] of Object.entries(LEVEL_FAMILIES) as [LogLevel, string][]) {
    const fallback = DEFAULT_PALETTE.levels[level];
    const shades = family === 'gray' ? ['400', '800'] : ['400', '900'];
    levels[level] = { fg: read(`${family}-${shades[0]}`, fallback.fg), bg: read(`${family}-${shades[1]}`, fallback.bg) };
  }
  return {
    background: read('gray-950', DEFAULT_PALETTE.background),
    surface: read('gray-900', DEFAULT_PALETTE.surface),
    border: read('gray-800', DEFAULT_PALETTE.border),
    text: read('gray-100', DEFAULT_PALETTE.text),
    muted: read('gray-500', DEFAULT_PALETTE.muted),
    accent: read('secondary-400', DEFAULT_PALETTE.accent),
    levels,
  };
}

/** Largest scale ≤ MAX_SCALE that keeps the canvas within what browsers allow. */
export function rasterScale(width: number, height: number): number {
  return Math.min(
    MAX_SCALE,
    MAX_CANVAS_SIDE / width,
    MAX_CANVAS_SIDE / height,
    Math.sqrt(MAX_CANVAS_AREA / (width * height)),
  );
}

/** Draws an SVG onto a canvas and encodes it as PNG or JPEG. */
async function rasterise(svg: string, width: number, height: number, fmt: 'png' | 'jpeg', background: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('The image could not be drawn'));
      img.src = url;
    });
    const scale = rasterScale(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available in this browser');
    // JPEG has no transparency: paint the background first.
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('The image is too large to encode'))),
        fmt === 'png' ? 'image/png' : 'image/jpeg',
        0.92,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Saves a blob through the browser's download. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the download a moment to start before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ExportImageOptions = Omit<LogImageOptions, 'palette' | 'maxRows'>;

/** Draws the events in the current theme and downloads them as PNG, JPEG or SVG. Resolves with the file name. */
export async function exportLogsImage(logs: LogEntry[], fmt: ImageFormat, options: ExportImageOptions): Promise<string> {
  const exportedAt = options.exportedAt ?? new Date();
  const palette = readPalette();
  const image = logsToSvg(logs, {
    ...options,
    exportedAt,
    palette,
    maxRows: fmt === 'svg' ? SVG_MAX_ROWS : RASTER_MAX_ROWS,
  });
  const fileName = imageFileName(options.scope, logs.length, fmt, exportedAt);
  const blob = fmt === 'svg'
    ? new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${image.svg}`], { type: 'image/svg+xml;charset=utf-8' })
    : await rasterise(image.svg, image.width, image.height, fmt, palette.background);
  downloadBlob(blob, fileName);
  return fileName;
}
