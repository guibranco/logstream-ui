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

  const query = useQuery({
    queryKey: ['server', 'info', config?.featureOverrides],
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

  if (query.data) {
    const features = { ...query.data.features };
    if (config?.featureOverrides) {
      if (config.featureOverrides.client_management !== undefined) {
        features.client_management = config.featureOverrides.client_management;
      }
      if (config.featureOverrides.retention !== undefined) {
        features.retention = config.featureOverrides.retention;
      }
      if (config.featureOverrides.websocket !== undefined) {
        features.websocket = config.featureOverrides.websocket;
      }
    }
    return {
      ...query,
      data: {
        ...query.data,
        features,
      },
    };
  }

  return query;
}
