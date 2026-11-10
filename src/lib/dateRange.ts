import { SearchFilters } from '../types';

/**
 * Date ranges the way Seq offers them: a relative window ending now ("last 15
 * minutes"), an absolute from/to, or any time.
 *
 * Relative ranges are stored as their key (`range=15m` in the URL) and turned
 * into a `date_from` each time the feed loads, so a shared link or a reload
 * always means "the last 15 minutes from now".
 */

export interface RangePreset {
  key: string;
  label: string;
  ms: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const RANGE_PRESETS: readonly RangePreset[] = [
  { key: '5m', label: 'Last 5 minutes', ms: 5 * MINUTE },
  { key: '15m', label: 'Last 15 minutes', ms: 15 * MINUTE },
  { key: '30m', label: 'Last 30 minutes', ms: 30 * MINUTE },
  { key: '1h', label: 'Last hour', ms: HOUR },
  { key: '4h', label: 'Last 4 hours', ms: 4 * HOUR },
  { key: '12h', label: 'Last 12 hours', ms: 12 * HOUR },
  { key: '1d', label: 'Last 24 hours', ms: DAY },
  { key: '3d', label: 'Last 3 days', ms: 3 * DAY },
  { key: '7d', label: 'Last 7 days', ms: 7 * DAY },
  { key: '30d', label: 'Last 30 days', ms: 30 * DAY },
];

export const findPreset = (key: string | undefined) => RANGE_PRESETS.find(p => p.key === key);

/** Instant of a filter date: ISO with an offset, or a `datetime-local` value read as local time. */
function toInstant(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Filters with the date range made concrete for one load: a relative range
 * becomes `date_from` (now minus the window, no `date_to`), and absolute
 * dates become ISO instants. The result is what requests and live matching use.
 */
export function resolveDateRange(filters: SearchFilters, now: number): SearchFilters {
  const { range, ...rest } = filters;
  const preset = findPreset(range);
  if (preset) {
    return { ...rest, date_from: new Date(now - preset.ms).toISOString(), date_to: undefined };
  }
  const from = toInstant(rest.date_from);
  const to = toInstant(rest.date_to);
  return {
    ...rest,
    date_from: from ? from.toISOString() : rest.date_from,
    date_to: to ? to.toISOString() : rest.date_to,
  };
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/**
 * The form the server compares against its UTC timestamps (`YYYY-MM-DD
 * HH:MM:SS.mmm`, UTC). The server passes the value straight to MariaDB or to
 * PHP's DateTime, and both read it as UTC; an ISO string with `T`/`Z` is
 * not reliably understood by the database.
 */
export function toServerTime(value: string): string {
  const date = toInstant(value);
  if (!date) return value;
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} `
    + `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.`
    + pad(date.getUTCMilliseconds(), 3);
}

/** `datetime-local` value (local time, minutes) for an instant, to prefill the custom inputs. */
export function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T`
    + `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Short description of the range in the filters, for the picker's button. */
export function describeRange(filters: SearchFilters, format: (d: Date) => string): string {
  const preset = findPreset(filters.range);
  if (preset) return preset.label;
  const from = toInstant(filters.date_from);
  const to = toInstant(filters.date_to);
  if (from && to) return `${format(from)} → ${format(to)}`;
  if (from) return `Since ${format(from)}`;
  if (to) return `Until ${format(to)}`;
  return 'Any time';
}

// ── Default and remembered range ─────────────────────────────────────────────

/** Range used until the user picks another one. */
export const DEFAULT_RANGE = '1d';

const RANGE_STORAGE_KEY = 'logservice:range';
/** Stored when the user chose "Any time", so the default doesn't come back. */
const ANY_TIME = 'any';

const hasDateRange = (f: SearchFilters) => !!(f.range || f.date_from || f.date_to);

/**
 * Filters with the remembered range (or the 1-day default) added when they
 * carry no date range of their own, e.g. a fresh browser or a shared link
 * without one.
 */
export function withRememberedRange(filters: SearchFilters, storage: Pick<Storage, 'getItem'> | null): SearchFilters {
  if (hasDateRange(filters)) return filters;
  let saved: string | null = null;
  try {
    saved = storage?.getItem(RANGE_STORAGE_KEY) ?? null;
  } catch {
    // Storage unavailable: use the default.
  }
  if (saved === ANY_TIME) return filters;
  return { ...filters, range: findPreset(saved ?? undefined)?.key ?? DEFAULT_RANGE };
}

/**
 * Remember the range choice: a preset key, or "any time". A custom from/to
 * travels with the saved filters, so it isn't stored here.
 */
export function rememberRange(filters: SearchFilters, storage: Pick<Storage, 'setItem'> | null): void {
  if (filters.date_from || filters.date_to) return;
  try {
    storage?.setItem(RANGE_STORAGE_KEY, findPreset(filters.range)?.key ?? ANY_TIME);
  } catch {
    // Storage unavailable (private mode, quota): the URL still carries the range.
  }
}
