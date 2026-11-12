import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { RetentionVolumeReport } from '../types';

export const RETENTION_VOLUME_KEY = ['retention', 'volume'] as const;

export function useRetentionVolume(days: number) {
  const { config } = useAuth();

  return useQuery({
    queryKey: [...RETENTION_VOLUME_KEY, days],
    queryFn: async () => {
      if (!config?.apiUrl || !config?.uiSecret) {
        throw new Error('LogStream not configured');
      }

      const response = await fetch(`${config.apiUrl}/api/retention/volume?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${config.uiSecret}`,
          'Accept': 'application/json'
        }
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
    },
    enabled: !!config?.apiUrl && !!config?.uiSecret,
    // The server caches the report for 5 minutes; refetching sooner gains nothing.
    staleTime: 60_000,
    placeholderData: (previous) => previous,
    retry: (failureCount, error: any) => {
      if (error.message === 'SERVICE_UNAVAILABLE') return false;
      return failureCount < 3;
    }
  });
}
