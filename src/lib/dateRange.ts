import { SearchFilters } from '../types';

/**
 * Date ranges the way Seq offers them: a relative window ending now ("last 15
 * minutes"), a calendar period so far ("this week"), an absolute from/to, or
 * any time.
 *
 * Relative ranges are stored as their key (`range=15m` in the URL) and turned
 * into a `date_from` each time the feed loads, so a shared link or a reload
 * always means "the last 15 minutes from now".
 */

export interface RangePreset {
  key: string;
  label: string;
  /** Start of the range for a given current time; the range always ends now. */
  start: (now: Date) => Date;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const last = (key: string, label: string, ms: number): RangePreset => ({
  key,
  label,
  start: now => new Date(now.getTime() - ms),
});

/** Midnight (local time) of the most recent Sunday; today if it is Sunday. */
export function startOfWeek(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
}

/** Midnight (local time) of the first day of the current month. */
export function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const RANGE_PRESETS: readonly RangePreset[] = [
  last('5m', 'Last 5 minutes', 5 * MINUTE),
  last('15m', 'Last 15 minutes', 15 * MINUTE),
  last('30m', 'Last 30 minutes', 30 * MINUTE),
  last('1h', 'Last hour', HOUR),
  last('4h', 'Last 4 hours', 4 * HOUR),
  last('12h', 'Last 12 hours', 12 * HOUR),
  last('1d', 'Last 24 hours', DAY),
  last('3d', 'Last 3 days', 3 * DAY),
  last('7d', 'Last 7 days', 7 * DAY),
  last('30d', 'Last 30 days', 30 * DAY),
  last('60d', 'Last 60 days', 60 * DAY),
  last('90d', 'Last 90 days', 90 * DAY),
  last('365d', 'Last 365 days', 365 * DAY),
  { key: 'week', label: 'This week', start: startOfWeek },
  { key: 'month', label: 'This month', start: startOfMonth },
  // Only what arrives after the feed (re)loads: a clean live tail.
  { key: 'now', label: 'From now', start: now => now },
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
 * becomes `date_from` (its start for the current time, no `date_to`), and absolute
 * dates become ISO instants. The result is what requests and live matching use.
 */
export function resolveDateRange(filters: SearchFilters, now: number): SearchFilters {
  const { range, ...rest } = filters;
  const preset = findPreset(range);
  if (preset) {
    return { ...rest, date_from: preset.start(new Date(now)).toISOString(), date_to: undefined };
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
