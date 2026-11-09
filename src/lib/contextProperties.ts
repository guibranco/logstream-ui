import { SearchFilters } from '../types';

export interface ContextProperty {
  /** Dotted path from the root of `context`, e.g. `order.customer.id`. */
  path: string;
  value: unknown;
  /** Scalars at a path the server can address; arrays and odd keys are display-only. */
  filterable: boolean;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Flatten a context object into one row per scalar property, walking nested
 * objects with dotted paths, the way Seq lists event properties.
 */
export function flattenContext(context: Record<string, unknown> | null | undefined): ContextProperty[] {
  const rows: ContextProperty[] = [];

  const walk = (node: Record<string, unknown>, prefix: string[], addressable: boolean) => {
    for (const [key, value] of Object.entries(node)) {
      const path = [...prefix, key];
      // The server splits paths on "." so a key containing one can't be targeted.
      const ok = addressable && key !== '' && !key.includes('.');

      if (isPlainObject(value) && Object.keys(value).length > 0) {
        walk(value, path, ok);
      } else {
        const scalar = !Array.isArray(value) && !isPlainObject(value);
        rows.push({ path: path.join('.'), value, filterable: ok && scalar });
      }
    }
  };

  if (isPlainObject(context)) walk(context, [], true);
  return rows;
}

/** String form the server compares against (mirrors ContextFilter::stringify). */
export function toFilterValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  return String(value);
}

/** Append `context[path]=v` / `context_not[path]=v` pairs for the API. */
export function appendContextParams(params: URLSearchParams, filters: SearchFilters): void {
  for (const [path, value] of Object.entries(filters.context ?? {})) {
    params.append(`context[${path}]`, value);
  }
  for (const [path, value] of Object.entries(filters.context_not ?? {})) {
    params.append(`context_not[${path}]`, value);
  }
}

/** Return filters with a Find (include) or Exclude condition on a context path. */
export function withContextFilter(
  filters: SearchFilters,
  path: string,
  value: string,
  exclude: boolean,
): SearchFilters {
  const context = { ...filters.context };
  const contextNot = { ...filters.context_not };
  // A path is either included or excluded, never both.
  delete context[path];
  delete contextNot[path];
  (exclude ? contextNot : context)[path] = value;

  return {
    ...filters,
    context: Object.keys(context).length ? context : undefined,
    context_not: Object.keys(contextNot).length ? contextNot : undefined,
  };
}

// ── Manual key/value builder ─────────────────────────────────────────────────

/** Limits enforced by the server (ContextFilter::MAX_FILTERS / MIN_SEARCH_LEN). */
export const MAX_CONTEXT_FILTERS = 10;
export const MIN_CONTEXT_SEARCH_LEN = 3;
export const MAX_CONTEXT_SEARCH_LEN = 200;

/** One editable row of the context filter builder. */
export interface ContextRow {
  id: string;
  key: string;
  value: string;
  exclude: boolean;
}

let rowSeq = 0;
export const newContextRow = (key = '', value = '', exclude = false): ContextRow => ({
  id: `ctx-${++rowSeq}`,
  key,
  value,
  exclude,
});

export function filtersToRows(filters: SearchFilters): ContextRow[] {
  return [
    ...Object.entries(filters.context ?? {}).map(([k, v]) => newContextRow(k, v, false)),
    ...Object.entries(filters.context_not ?? {}).map(([k, v]) => newContextRow(k, v, true)),
  ];
}

/** Rows with both a key and a value; empty rows are drafts and are ignored. */
const completeRows = (rows: ContextRow[]) => rows.filter(r => r.key.trim() !== '' && r.value !== '');

/** Why a path would be rejected by the server, or null when it is valid. */
export function contextPathError(key: string): string | null {
  const path = key.trim();
  if (path === '') return null; // draft row
  if (path.length > 200) return 'Path is too long (max. 200 characters)';
  if (path.split('.').some(segment => segment === '')) return 'Path has an empty segment (check the dots)';
  return null;
}

/** Validation messages for the builder and the free-text search, empty when valid. */
export function contextFilterErrors(rows: ContextRow[], search: string | undefined): string[] {
  const errors: string[] = [];

  for (const row of rows) {
    const err = contextPathError(row.key);
    if (err) errors.push(`${row.key.trim()}: ${err}`);
  }
  if (completeRows(rows).length > MAX_CONTEXT_FILTERS) {
    errors.push(`At most ${MAX_CONTEXT_FILTERS} context filters are allowed`);
  }

  const term = (search ?? '').trim();
  if (term !== '' && term.length < MIN_CONTEXT_SEARCH_LEN) {
    errors.push(`Context search needs at least ${MIN_CONTEXT_SEARCH_LEN} characters`);
  }

  return errors;
}

/** Convert builder rows into `context` / `context_not` (a later row wins on duplicate paths). */
export function rowsToFilters(rows: ContextRow[]): Pick<SearchFilters, 'context' | 'context_not'> {
  let result: SearchFilters = {};
  for (const row of completeRows(rows)) {
    result = withContextFilter(result, row.key.trim(), row.value, row.exclude);
  }
  return { context: result.context, context_not: result.context_not };
}

/** Return filters without the condition on the given path. */
export function withoutContextFilter(filters: SearchFilters, path: string, exclude: boolean): SearchFilters {
  const key = exclude ? 'context_not' : 'context';
  const group = { ...filters[key] };
  delete group[path];
  return { ...filters, [key]: Object.keys(group).length ? group : undefined };
}
