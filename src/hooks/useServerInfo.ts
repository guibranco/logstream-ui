import { useQuery } from '@tanstack/react-query';
import { getConfig } from '../store/configStore';

export interface ServerInfo {
  version: string;
  storage_type: 'file' | 'mariadb';
  features: {
    client_management: boolean;
    retention: boolean;
    /** GET /api/retention/log lists past retention runs. */
    retention_log?: boolean;
    websocket: boolean;
    /** GET /api/logs accepts app_key[] / level[] lists (logstream-server#115). */
    multi_value_filters?: boolean;
    /** The server stores its own messages as entries of a reserved app (logstream-server#131). */
    self_logging?: boolean;
    /** HMAC-signed log packets over UDP; details in `udp` (logstream-server#54). */
    udp_ingest?: boolean;
    /** `transport` is a search filter and a retention policy criterion. */
    transport_filters?: boolean;
  };
  /** The reserved app the server's own messages are stored under. */
  self_logging?: {
    enabled: boolean;
    app_key: string;
  };
  /** UDP ingest settings a sender needs; `{ enabled: false }` when the listener is off. */
  udp?: UdpInfo;
}

/** The `udp` block of GET /api/info. */
export interface UdpInfo {
  enabled: boolean;
  port?: number;
  protocol_version?: number;
  max_packet_size?: number;
  timestamp_window_ms?: number;
}

/** Where and how to send signed UDP packets, or undefined when the server has no UDP listener. */
export function udpTarget(info: ServerInfo | undefined, apiUrl: string | undefined): { host: string; port: number } | undefined {
  if (!info?.features?.udp_ingest || !info.udp?.enabled || !info.udp.port || !apiUrl) return undefined;
  try {
    const host = new URL(apiUrl).hostname.replace(/^\[(.*)\]$/, '$1');
    return host ? { host, port: info.udp.port } : undefined;
  } catch {
    return undefined;
  }
}

export function useServerInfo() {
  const config = getConfig();
  const apiUrl = config?.apiUrl;

  const query = useQuery({
    queryKey: ['server', 'info', apiUrl, config?.featureOverrides],
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
