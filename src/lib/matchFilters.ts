import { LogEntry, SearchFilters } from '../types';

/**
 * Client-side mirror of the server's search filters (FileStorage::matches and
 * ContextFilter), used to decide whether an event pushed over the WebSocket
 * belongs in the feed currently on screen.
 */

const EXACT_FIELDS = ['app_key', 'app_id', 'level', 'trace_id', 'batch_id'] as const;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Same as ContextFilter::stringify: scalars as strings, null for arrays/objects. */
function stringify(value: unknown): string | null {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return null;
}

function resolve(context: Record<string, unknown> | null, path: string): { found: boolean; value: string | null } {
  let node: unknown = context;
  for (const segment of path.split('.')) {
    if (!isPlainObject(node) || !(segment in node)) return { found: false, value: null };
    node = node[segment];
  }
  return { found: true, value: stringify(node) };
}

function contextMatches(context: Record<string, unknown> | null, path: string, expected: string, negate: boolean): boolean {
  const { found, value } = resolve(context, path);
  const equal = found && value !== null && value === expected;
  return negate ? !equal : equal;
}

function nodeContains(node: unknown, needle: string): boolean {
  if (Array.isArray(node)) return node.some(item => nodeContains(item, needle));
  if (isPlainObject(node)) {
    return Object.entries(node).some(
      ([key, value]) => key.toLowerCase().includes(needle) || nodeContains(value, needle),
    );
  }
  return (stringify(node) ?? '').toLowerCase().includes(needle);
}

const containsCI = (haystack: string | null | undefined, needle: string) =>
  (haystack ?? '').toLowerCase().includes(needle.toLowerCase());

const time = (iso: string) => new Date(iso).getTime();

export function matchesFilters(entry: LogEntry, filters: SearchFilters): boolean {
  for (const field of EXACT_FIELDS) {
    const wanted = filters[field];
    if (wanted && entry[field] !== wanted) return false;
  }

  if (filters.user_agent && !containsCI(entry.user_agent, filters.user_agent)) return false;
  if (filters.category && !containsCI(entry.category, filters.category)) return false;
  if (filters.search && !containsCI(entry.message, filters.search)) return false;

  const context = isPlainObject(entry.context) ? entry.context : null;
  for (const [path, value] of Object.entries(filters.context ?? {})) {
    if (!contextMatches(context, path, value, false)) return false;
  }
  for (const [path, value] of Object.entries(filters.context_not ?? {})) {
    if (!contextMatches(context, path, value, true)) return false;
  }
  if (filters.context_search && (context === null || !nodeContains(context, filters.context_search.toLowerCase()))) {
    return false;
  }

  const ts = time(entry.timestamp);
  if (filters.date_from && !(ts >= time(filters.date_from))) return false;
  if (filters.date_to && !(ts <= time(filters.date_to))) return false;

  return true;
}
