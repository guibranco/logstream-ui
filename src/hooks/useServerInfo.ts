import { useQuery } from '@tanstack/react-query';
import { getConfig } from '../store/configStore';

export interface ServerInfo {
  version: string;
  storage_type: 'file' | 'mariadb';
  features: {
    client_management: boolean;
    retention: boolean;
    websocket: boolean;
  };
}

export function useServerInfo() {
  const config = getConfig();
  const apiUrl = config?.apiUrl;

  return useQuery({
    queryKey: ['server', 'info'],
    queryFn: async () => {
      if (!apiUrl) return undefined;
      const response = await fetch(`${apiUrl}/api/info`);
      if (!response.ok) {
        throw new Error('Failed to fetch server info');
      }
      return response.json() as Promise<ServerInfo>;
    },
    refetchInterval: 60000,
    staleTime: 50000,
    enabled: !!apiUrl,
  });
}
