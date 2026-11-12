import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { RetentionVolumeReport } from '../types';

export const RETENTION_VOLUME_KEY = ['retention', 'volume'] as const;

/** Matches the server's report cache: a sooner refetch would get the same report. */
export const VOLUME_REFRESH_MS = 5 * 60_000;

/** A request still pending after this is aborted, so the panel shows an error instead of loading forever. */
export const VOLUME_TIMEOUT_MS = 60_000;

/** Aborts when the query is cancelled or the timeout passes, whichever comes first. */
export function timeoutSignal(querySignal: AbortSignal | undefined, ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('The storage report timed out')), ms);
  const onAbort = () => controller.abort(querySignal?.reason);
  querySignal?.addEventListener('abort', onAbort, { once: true });
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      querySignal?.removeEventListener('abort', onAbort);
    },
  };
}

export function useRetentionVolume(days: number) {
  const { config } = useAuth();

  return useQuery({
    // The server URL is part of the key so switching servers never shows the previous one's report.
    queryKey: [...RETENTION_VOLUME_KEY, config?.apiUrl ?? '', days],
    queryFn: async ({ signal: querySignal }) => {
      if (!config?.apiUrl || !config?.uiSecret) {
        throw new Error('LogStream not configured');
      }

      const { signal, clear } = timeoutSignal(querySignal, VOLUME_TIMEOUT_MS);
      try {
        const response = await fetch(`${config.apiUrl}/api/retention/volume?days=${days}`, {
          headers: {
            'Authorization': `Bearer ${config.uiSecret}`,
            'Accept': 'application/json'
          },
          signal,
        });

        // 404: a server without the volume endpoint; 503: retention disabled.
        if (response.status === 404 || response.status === 503) {
          throw new Error('SERVICE_UNAVAILABLE');
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }

        return await response.json() as RetentionVolumeReport;
      } catch (e) {
        // Surface the timeout message rather than a bare AbortError.
        throw signal.aborted && signal.reason instanceof Error ? signal.reason : e;
      } finally {
        clear();
      }
    },
    enabled: !!config?.apiUrl && !!config?.uiSecret,
    // The server caches the report for 5 minutes: refetching sooner gains nothing,
    // and polling at that pace keeps an open chart current with new logs and
    // runs from other clients. Policy edits and local runs invalidate it at once.
    staleTime: VOLUME_REFRESH_MS,
    refetchInterval: VOLUME_REFRESH_MS,
    // Keep the last report on screen while another window loads, but never one from another server.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === (config?.apiUrl ?? '') ? previous : undefined,
    retry: (failureCount, error: any) => {
      if (error.message === 'SERVICE_UNAVAILABLE') return false;
      return failureCount < 3;
    }
  });
}
