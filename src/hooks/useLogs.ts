import { useQuery } from '@tanstack/react-query';
import { SearchFilters, SearchResult } from '../types';
import { useAuth } from '../context/AuthContext';

export function useLogs(filters: SearchFilters, limit: number, offset: number) {
  const { config, openSettings } = useAuth();

  return useQuery<SearchResult>({
    queryKey: ['logs', filters, limit, offset, config?.apiUrl],
    queryFn: async () => {
      if (!config?.apiUrl || !config?.uiSecret) {
        throw new Error('LogService not configured');
      }

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`${config.apiUrl}/api/logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${config.uiSecret}`
        }
      });

      if (response.status === 401) {
        openSettings();
        throw new Error('Session expired or secret rejected — update your settings.');
      }

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      return response.json();
    },
    placeholderData: (previousData) => previousData,
    enabled: !!config?.apiUrl && !!config?.uiSecret,
  });
}
