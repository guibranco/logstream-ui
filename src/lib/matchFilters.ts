import { LogEntry, SearchFilters } from '../types';
import { asList } from './multiValue';

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

function fieldsMatch(entry: LogEntry, filters: SearchFilters): boolean {
  // A list matches when the entry's value is any of its values.
  const exact = EXACT_FIELDS.every(field => {
    const wanted = asList<string>(filters[field]);
    return wanted.length === 0 || wanted.includes(entry[field] ?? '');
  });
  return exact
    && (!filters.user_agent || containsCI(entry.user_agent, filters.user_agent))
    && (!filters.category || containsCI(entry.category, filters.category))
    && (!filters.search || containsCI(entry.message, filters.search));
}

function contextFiltersMatch(entry: LogEntry, filters: SearchFilters): boolean {
  const context = isPlainObject(entry.context) ? entry.context : null;
  const finds = Object.entries(filters.context ?? {})
    .every(([path, value]) => contextMatches(context, path, value, false));
  const excludes = Object.entries(filters.context_not ?? {})
    .every(([path, value]) => contextMatches(context, path, value, true));
  const search = !filters.context_search
    || (context !== null && nodeContains(context, filters.context_search.toLowerCase()));
  return finds && excludes && search;
}

function dateRangeMatches(entry: LogEntry, filters: SearchFilters): boolean {
  const ts = time(entry.timestamp);
  if (filters.date_from && ts < time(filters.date_from)) return false;
  return !(filters.date_to && ts > time(filters.date_to));
}

export function matchesFilters(entry: LogEntry, filters: SearchFilters): boolean {
  return fieldsMatch(entry, filters) && contextFiltersMatch(entry, filters) && dateRangeMatches(entry, filters);
}
