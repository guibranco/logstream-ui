import { format } from 'date-fns';
import { LogEntry, LogLevel, SearchFilters } from '../types';

/** Image formats events can be exported to. */
export type ImageFormat = 'png' | 'jpeg' | 'svg';

/** Which events an image shows: the whole loaded view, or only the selected ones. */
export type ImageScope = 'view' | 'selection';

/** Colours an image is drawn with; read from the current theme (see exportImage). */
export interface ImagePalette {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  levels: Record<LogLevel, { fg: string; bg: string }>;
}

/** The app's original dark look; used where the theme can't be read. */
export const DEFAULT_PALETTE: ImagePalette = {
  background: '#030712',
  surface: '#111827',
  border: '#1f2937',
  text: '#f3f4f6',
  muted: '#6b7280',
  accent: '#818cf8',
  levels: {
    debug: { fg: '#9ca3af', bg: '#1f2937' },
    info: { fg: '#38bdf8', bg: '#0c4a6e' },
    notice: { fg: '#2dd4bf', bg: '#134e4a' },
    warning: { fg: '#fbbf24', bg: '#78350f' },
    error: { fg: '#fb7185', bg: '#881337' },
    critical: { fg: '#e879f9', bg: '#701a75' },
  },
};

export interface LogImageOptions {
  scope: ImageScope;
  palette?: ImagePalette;
  /** Events loaded on screen; shown next to the count of selected ones. */
  loadedCount?: number;
  /** Events matching the filters on the server. */
  total?: number;
  filters?: SearchFilters;
  /** Image width in CSS pixels. */
  width?: number;
  /** At most this many events are drawn; the rest are counted in the footer. */
  maxRows?: number;
  /** When the image was made; defaults to now. */
  exportedAt?: Date;
  /** UI version shown in the footer. */
  version?: string;
}

export interface LogImage {
  svg: string;
  width: number;
  height: number;
  /** Events drawn (may be fewer than given, see maxRows). */
  rows: number;
}

const FONT = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
const FONT_SIZE = 12;
/** Advance of one monospace character at FONT_SIZE; used to cut text to a column. */
const CHAR_WIDTH = FONT_SIZE * 0.6;
const PAD = 20;
const HEADER_HEIGHT = 64;
const COLUMNS_HEIGHT = 28;
const ROW_HEIGHT = 24;
const FOOTER_HEIGHT = 36;
export const DEFAULT_WIDTH = 1280;
export const DEFAULT_MAX_ROWS = 1000;

interface Column {
  key: 'timestamp' | 'level' | 'app' | 'category' | 'message';
  label: string;
  width: number;
}

/** Characters XML does not allow at all (control characters other than tab, LF, CR). */
// eslint-disable-next-line no-control-regex
const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

/** Text made safe for an SVG text node or attribute. */
export function escapeXml(text: string): string {
  return text
    .replace(XML_INVALID, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** At most `max` characters on one line, ending in "…" when cut. Counts code points, not UTF-16 units. */
export function fitText(text: string, max: number): string {
  const oneLine = text.replaceAll(/\s*\r?\n\s*/g, ' ⏎ ').replaceAll('\t', ' ');
  const chars = Array.from(oneLine);
  if (chars.length <= max) return oneLine;
  if (max <= 1) return '…';
  return chars.slice(0, max - 1).join('') + '…';
}

const charsFor = (width: number) => Math.max(1, Math.floor((width - 12) / CHAR_WIDTH));

function columnsFor(width: number): Column[] {
  const fixed: Column[] = [
    { key: 'timestamp', label: 'Timestamp', width: 186 },
    { key: 'level', label: 'Level', width: 92 },
    { key: 'app', label: 'App Key', width: 150 },
    { key: 'category', label: 'Category', width: 130 },
  ];
  const used = fixed.reduce((sum, c) => sum + c.width, 0);
  return [...fixed, { key: 'message', label: 'Message', width: Math.max(160, width - PAD * 2 - used) }];
}

const plural = (n: number, word: string) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

/** "3 selected of 120 loaded" / "120 events (of 4,512 matching)". */
export function describeScope(count: number, opts: Pick<LogImageOptions, 'scope' | 'loadedCount' | 'total'>): string {
  if (opts.scope === 'selection') {
    const of = opts.loadedCount ? ` of ${opts.loadedCount.toLocaleString('en-US')} loaded` : '';
    return `${count.toLocaleString('en-US')} selected${of}`;
  }
  const matching = opts.total && opts.total > count ? ` (of ${opts.total.toLocaleString('en-US')} matching)` : '';
  return `${plural(count, 'event')}${matching}`;
}

const listOf = (value: string | string[] | undefined) => (Array.isArray(value) ? value.join(', ') : value);

/** The active filters as one line, e.g. "level: error, critical · app: billing · last 24h". */
export function describeFilters(filters: SearchFilters | undefined): string {
  if (!filters) return '';
  const parts: string[] = [];
  const add = (label: string, value: string | undefined) => {
    if (value) parts.push(`${label}: ${value}`);
  };
  add('app', listOf(filters.app_key));
  add('app id', filters.app_id);
  add('level', listOf(filters.level));
  add('category', filters.category);
  add('trace', filters.trace_id);
  add('batch', filters.batch_id);
  add('template', filters.message_template);
  add('user agent', filters.user_agent);
  if (filters.search) parts.push(`"${filters.search}"`);
  if (filters.context_search) add('context', `"${filters.context_search}"`);
  for (const [path, value] of Object.entries(filters.context ?? {})) parts.push(`${path} = ${value}`);
  for (const [path, value] of Object.entries(filters.context_not ?? {})) parts.push(`${path} ≠ ${value}`);
  if (filters.range && filters.range !== 'now') add('range', filters.range);
  else if (filters.date_from || filters.date_to) add('range', `${filters.date_from ?? '…'} → ${filters.date_to ?? 'now'}`);
  return parts.join(' · ');
}

const timestampOf = (log: LogEntry) => {
  const date = new Date(log.timestamp);
  return Number.isNaN(date.getTime()) ? log.timestamp : format(date, 'yyyy-MM-dd HH:mm:ss.SSS');
};

/** Oldest → newest timestamp of the events, or '' when they can't be read. */
function spanOf(logs: LogEntry[]): string {
  const times = logs.map(l => new Date(l.timestamp).getTime()).filter(t => !Number.isNaN(t));
  if (times.length === 0) return '';
  const fmt = (t: number) => format(new Date(t), 'yyyy-MM-dd HH:mm:ss');
  const from = Math.min(...times);
  const to = Math.max(...times);
  return from === to ? fmt(from) : `${fmt(from)} → ${fmt(to)}`;
}

const text = (x: number, y: number, content: string, attrs = '') =>
  `<text x="${x}" y="${y}"${attrs ? ' ' + attrs : ''}>${escapeXml(content)}</text>`;

/**
 * Draws events as a standalone SVG, in the order given (the feed's: newest first),
 * one row each like the Events table. Self-contained: no external fonts or
 * styles, so it opens anywhere and can be rasterised to PNG or JPEG.
 */
export function logsToSvg(logs: LogEntry[], options: LogImageOptions): LogImage {
  const palette = options.palette ?? DEFAULT_PALETTE;
  const width = Math.max(640, Math.round(options.width ?? DEFAULT_WIDTH));
  const maxRows = Math.max(1, options.maxRows ?? DEFAULT_MAX_ROWS);
  const drawn = logs.slice(0, maxRows);
  const hidden = logs.length - drawn.length;
  const columns = columnsFor(width);
  const height = HEADER_HEIGHT + COLUMNS_HEIGHT + Math.max(1, drawn.length) * ROW_HEIGHT + FOOTER_HEIGHT;
  const exportedAt = options.exportedAt ?? new Date();

  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`
      + ` font-family="${FONT.replaceAll("'", '&apos;')}" font-size="${FONT_SIZE}">`,
    `<title>${escapeXml(`LogStream — ${describeScope(logs.length, { ...options })}`)}</title>`,
    `<rect width="100%" height="100%" fill="${palette.background}"/>`,
  );

  // Header: title, scope and time span, filters.
  const scopeLine = [describeScope(logs.length, options), spanOf(logs)].filter(Boolean).join(' · ');
  const filterLine = describeFilters(options.filters);
  const headerChars = charsFor(width - PAD * 2);
  out.push(
    `<rect width="${width}" height="${HEADER_HEIGHT}" fill="${palette.surface}"/>`,
    `<rect x="0" y="${HEADER_HEIGHT - 1}" width="${width}" height="1" fill="${palette.border}"/>`,
    text(PAD, 26, 'LogStream', `fill="${palette.accent}" font-size="15" font-weight="700"`),
    text(PAD + 96, 26, fitText(scopeLine, headerChars - 14), `fill="${palette.text}"`),
  );
  out.push(
    text(PAD, 48, fitText(filterLine ? `Filters: ${filterLine}` : 'No filters', headerChars), `fill="${palette.muted}" font-size="11"`),
  );

  // Column headings.
  let x = PAD;
  const colY = HEADER_HEIGHT + COLUMNS_HEIGHT / 2 + 4;
  for (const col of columns) {
    out.push(text(x, colY, col.label.toUpperCase(), `fill="${palette.muted}" font-size="10" font-weight="700" letter-spacing="1"`));
    x += col.width;
  }
  out.push(`<rect x="0" y="${HEADER_HEIGHT + COLUMNS_HEIGHT - 1}" width="${width}" height="1" fill="${palette.border}"/>`);

  // Rows.
  const top = HEADER_HEIGHT + COLUMNS_HEIGHT;
  if (drawn.length === 0) {
    out.push(text(PAD, top + 16, 'No events', `fill="${palette.muted}"`));
  }
  drawn.forEach((log, i) => {
    const y = top + i * ROW_HEIGHT;
    const baseline = y + ROW_HEIGHT / 2 + 4;
    if (i % 2 === 1) out.push(`<rect x="0" y="${y}" width="${width}" height="${ROW_HEIGHT}" fill="${palette.surface}" fill-opacity="0.45"/>`);
    let cx = PAD;
    for (const col of columns) {
      const max = charsFor(col.width);
      switch (col.key) {
        case 'timestamp':
          out.push(text(cx, baseline, fitText(timestampOf(log), max), `fill="${palette.muted}"`));
          break;
        case 'level': {
          const colours = palette.levels[log.level] ?? palette.levels.debug;
          const label = fitText(String(log.level ?? '').toUpperCase(), 8);
          const pill = Math.ceil(label.length * 6.6 + 14);
          out.push(
            `<rect x="${cx}" y="${y + 5}" width="${pill}" height="${ROW_HEIGHT - 10}" rx="3" fill="${colours.bg}"/>`,
            text(cx + 7, baseline - 1, label, `fill="${colours.fg}" font-size="10" font-weight="700" letter-spacing="0.5"`),
          );
          break;
        }
        case 'app':
          out.push(text(cx, baseline, fitText(log.app_key ?? '', max), `fill="${palette.accent}"`));
          break;
        case 'category':
          out.push(text(cx, baseline, fitText(log.category ?? '', max), `fill="${palette.muted}"`));
          break;
        default:
          out.push(text(cx, baseline, fitText(log.message ?? '', max), `fill="${palette.text}"`));
      }
      cx += col.width;
    }
  });

  // Footer: what was left out, when and by what it was made.
  const footY = height - FOOTER_HEIGHT;
  const version = options.version ? ` · logstream-ui ${options.version}` : '';
  const more = hidden > 0 ? `${plural(hidden, 'more event')} not shown · ` : '';
  out.push(
    `<rect x="0" y="${footY}" width="${width}" height="1" fill="${palette.border}"/>`,
    text(PAD, footY + 22, `${more}Exported ${format(exportedAt, 'yyyy-MM-dd HH:mm:ss')}${version}`, `fill="${palette.muted}" font-size="11"`),
    '</svg>',
  );

  return { svg: out.join('\n'), width, height, rows: drawn.length };
}

/** e.g. `logstream-selected-3-20261116-213900.png`. */
export function imageFileName(scope: ImageScope, count: number, fmt: ImageFormat, at: Date = new Date()): string {
  const what = scope === 'selection' ? `selected-${count}` : `events-${count}`;
  return `logstream-${what}-${format(at, 'yyyyMMdd-HHmmss')}.${fmt === 'jpeg' ? 'jpg' : fmt}`;
}
