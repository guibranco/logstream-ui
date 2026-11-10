import { SearchFilters, SearchResult } from '../types';
import { appendContextParams } from './contextProperties';
import { apiEndpoint } from './serverUrl';
import { toServerTime } from './dateRange';
import { asList } from './multiValue';

const DATE_KEYS = new Set(['date_from', 'date_to']);

export class UnauthorizedError extends Error {
  constructor() {
    super('Session expired or secret rejected — update your settings.');
    this.name = 'UnauthorizedError';
  }
}

/** One page of `/api/logs`, newest first. */
export async function fetchLogs(
  apiUrl: string,
  uiSecret: string,
  filters: SearchFilters,
  limit: number,
  offset: number,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    // Several values go as a list (`level[]=a&level[]=b`), which the server matches with "any of".
    if (Array.isArray(value)) {
      const values = asList<string>(value);
      if (values.length === 1) params.append(key, values[0]);
      else values.forEach(v => params.append(`${key}[]`, v));
      return;
    }
    // `range` is resolved into date_from by the caller; the server doesn't know it.
    if (typeof value !== 'string' || !value || key === 'range') return;
    params.append(key, DATE_KEYS.has(key) ? toServerTime(value) : value);
  });
  appendContextParams(params, filters);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await fetch(apiEndpoint(apiUrl, '/api/logs', params), {
    headers: { Authorization: `Bearer ${uiSecret}` },
    signal,
  });

  if (response.status === 401) throw new UnauthorizedError();
  if (!response.ok) throw new Error('Failed to fetch logs');
  return response.json();
}
