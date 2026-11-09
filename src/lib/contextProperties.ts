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

/** Return filters without the condition on the given path. */
export function withoutContextFilter(filters: SearchFilters, path: string, exclude: boolean): SearchFilters {
  const key = exclude ? 'context_not' : 'context';
  const group = { ...filters[key] };
  delete group[path];
  return { ...filters, [key]: Object.keys(group).length ? group : undefined };
}
