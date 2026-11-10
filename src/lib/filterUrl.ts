import { LogLevel, SearchFilters } from '../types';
import { appendContextParams } from './contextProperties';
import { findPreset } from './dateRange';
import { asList, fromList, MULTI_VALUE_KEYS } from './multiValue';

/** Plain string filters, in the order they appear in the URL. */
const PLAIN_KEYS = [
  'search',
  'message_template',
  'context_search',
  'app_key',
  'app_id',
  'user_agent',
  'level',
  'category',
  'trace_id',
  'batch_id',
  'date_from',
  'date_to',
  'range',
] as const satisfies readonly (keyof SearchFilters)[];

const LEVELS: readonly LogLevel[] = ['debug', 'info', 'notice', 'warning', 'error', 'critical'];

const CONTEXT_PARAM = /^(context|context_not)\[(.+)\]$/;

/** Query string (without "?") for the given filters — same shape the API takes. */
export function filtersToQuery(filters: SearchFilters): string {
  const params = new URLSearchParams();
  for (const key of PLAIN_KEYS) {
    // One-or-many filters repeat their key (`level=error&level=critical`).
    for (const value of asList<string>(filters[key])) params.append(key, value);
  }
  appendContextParams(params, filters);
  return params.toString();
}

const isMultiValue = (key: string): boolean => (MULTI_VALUE_KEYS as readonly string[]).includes(key);

/** Value of one filter in the query, dropping invalid levels and ranges. */
function readParam(params: URLSearchParams, key: (typeof PLAIN_KEYS)[number]): string | string[] | undefined {
  let values = params.getAll(key).filter(v => v !== '');
  if (key === 'level') values = values.filter(v => LEVELS.includes(v as LogLevel));
  if (key === 'range') values = values.filter(v => findPreset(v));
  if (values.length === 0) return undefined;
  return isMultiValue(key) ? fromList(values) : values[0];
}

/**
 * Filters encoded in a URL query string, or null when it carries none
 * (so the caller can fall back to the last saved filters).
 */
export function filtersFromQuery(search: string): SearchFilters | null {
  const params = new URLSearchParams(search);
  const filters: SearchFilters = {};
  let found = false;

  for (const key of PLAIN_KEYS) {
    const value = readParam(params, key);
    if (value === undefined) continue;
    (filters as Record<string, string | string[]>)[key] = value;
    found = true;
  }

  for (const [name, value] of params.entries()) {
    const match = CONTEXT_PARAM.exec(name);
    if (!match) continue;
    const group = match[1] as 'context' | 'context_not';
    filters[group] = { ...filters[group], [match[2]]: value };
    found = true;
  }

  return found ? filters : null;
}

/** Current URL with its query string replaced by the given filters. */
export function urlWithFilters(location: Pick<Location, 'pathname' | 'hash'>, filters: SearchFilters): string {
  const query = filtersToQuery(filters);
  return `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
}
