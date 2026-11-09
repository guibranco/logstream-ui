import { useQuery } from '@tanstack/react-query';
import { SearchFilters, SearchResult } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchLogs, UnauthorizedError } from '../lib/fetchLogs';

export function useLogs(filters: SearchFilters, limit: number, offset: number) {
  const { config, openSettings } = useAuth();

  return useQuery<SearchResult>({
    queryKey: ['logs', filters, limit, offset, config?.apiUrl],
    queryFn: async ({ signal }) => {
      if (!config?.apiUrl || !config?.uiSecret) {
        throw new Error('LogStream not configured');
      }
      try {
        return await fetchLogs(config.apiUrl, config.uiSecret, filters, limit, offset, signal);
      } catch (e) {
        if (e instanceof UnauthorizedError) openSettings();
        throw e;
      }
    },
    placeholderData: (previousData) => previousData,
    enabled: !!config?.apiUrl && !!config?.uiSecret,
  });
}
