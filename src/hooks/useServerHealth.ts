import { useQuery } from '@tanstack/react-query';
import { getConfig } from '../store/configStore';
import { apiEndpoint } from '../lib/serverUrl';

/** The `udp` block of GET /api/health: settings plus live counters since the server started. */
export interface UdpHealth {
  enabled: boolean;
  port?: number;
  /** Whether the UDP socket is bound. */
  listening?: boolean;
  received?: number;
  accepted?: number;
  /** Valid packets that could not be stored (e.g. the ingest buffer was full). */
  dropped?: number;
  /** Rejected packets by reason (bad_signature, stale, replay, source_not_allowed, …). */
  rejected?: Record<string, number>;
  /** Nonces currently held for replay protection. */
  nonces?: number;
}

export interface ServerHealth {
  status: string;
  time: string;
  ws_connections?: number;
  udp?: UdpHealth;
}

/** GET /api/health (public). Polls while `enabled`, e.g. only while a panel showing it is open. */
export function useServerHealth(enabled: boolean, refetchInterval = 10_000) {
  const apiUrl = getConfig()?.apiUrl;

  return useQuery({
    queryKey: ['server', 'health', apiUrl],
    queryFn: async () => {
      const response = await fetch(apiEndpoint(apiUrl!, '/api/health'));
      if (!response.ok) {
        throw new Error('Failed to fetch server health');
      }
      return response.json() as Promise<ServerHealth>;
    },
    enabled: enabled && !!apiUrl,
    refetchInterval: enabled ? refetchInterval : false,
    staleTime: refetchInterval / 2,
  });
}
