import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { RetentionLogResponse } from '../types';

export const RETENTION_LOG_KEY = ['retention', 'log'] as const;

/** How far back the run history goes by default. */
export const RETENTION_LOG_DAYS = 90;

/** Past retention runs (GET /api/retention/log), newest first. */
export function useRetentionLog(days: number = RETENTION_LOG_DAYS, policy?: string) {
  const { config } = useAuth();

  return useQuery({
    // The server URL is part of the key so switching servers never shows the previous one's history.
    queryKey: [...RETENTION_LOG_KEY, config?.apiUrl ?? '', days, policy ?? ''],
    queryFn: async ({ signal }) => {
      if (!config?.apiUrl || !config?.uiSecret) {
        throw new Error('LogStream not configured');
      }

      const params = new URLSearchParams({ days: String(days) });
      if (policy) params.set('policy', policy);

      const response = await fetch(`${config.apiUrl}/api/retention/log?${params}`, {
        headers: {
          'Authorization': `Bearer ${config.uiSecret}`,
          'Accept': 'application/json'
        },
        signal,
      });

      // 404: a server without the run history endpoint; 503: retention disabled.
      if (response.status === 404 || response.status === 503) {
        throw new Error('SERVICE_UNAVAILABLE');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      return await response.json() as RetentionLogResponse;
    },
    enabled: !!config?.apiUrl && !!config?.uiSecret,
    retry: (failureCount, error: Error) => {
      if (error.message === 'SERVICE_UNAVAILABLE') return false;
      return failureCount < 3;
    },
  });
}
