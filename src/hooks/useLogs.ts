import { useQuery } from '@tanstack/react-query';
import { SearchFilters, SearchResult } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

export function useLogs(filters: SearchFilters, limit: number, offset: number) {
  return useQuery<SearchResult>({
    queryKey: ['logs', filters, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`${API_URL}/api/logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      return response.json();
    },
    placeholderData: (previousData) => previousData,
  });
}
