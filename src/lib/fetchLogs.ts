import { SearchFilters, SearchResult } from '../types';
import { appendContextParams } from './contextProperties';

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
    if (typeof value === 'string' && value) params.append(key, value);
  });
  appendContextParams(params, filters);
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await fetch(`${apiUrl}/api/logs?${params.toString()}`, {
    headers: { Authorization: `Bearer ${uiSecret}` },
    signal,
  });

  if (response.status === 401) throw new UnauthorizedError();
  if (!response.ok) throw new Error('Failed to fetch logs');
  return response.json();
}
