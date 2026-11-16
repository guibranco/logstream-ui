import { describe, it, expect } from 'vitest';
import { udpTarget, type ServerInfo } from '@/src/hooks/useServerInfo';

const info = (over: Partial<ServerInfo> = {}): ServerInfo => ({
  version: '1.0.0',
  storage_type: 'mariadb',
  features: { client_management: true, retention: true, websocket: true, udp_ingest: true },
  udp: { enabled: true, port: 8082, protocol_version: 1, max_packet_size: 8192, timestamp_window_ms: 30000 },
  ...over,
});

describe('udpTarget', () => {
  it('uses the API host with the UDP port', () => {
    expect(udpTarget(info(), 'https://logs.example.com/prefix')).toEqual({ host: 'logs.example.com', port: 8082 });
  });

  it('strips IPv6 brackets', () => {
    expect(udpTarget(info(), 'http://[2001:db8::1]:8081')).toEqual({ host: '2001:db8::1', port: 8082 });
  });

  it('is undefined when the server has no UDP listener or is older', () => {
    expect(udpTarget(info({ udp: { enabled: false } }), 'https://logs.example.com')).toBeUndefined();
    expect(udpTarget(info({ features: { client_management: true, retention: true, websocket: true } }), 'https://logs.example.com')).toBeUndefined();
    expect(udpTarget(undefined, 'https://logs.example.com')).toBeUndefined();
  });

  it('is undefined without a usable API URL', () => {
    expect(udpTarget(info(), undefined)).toBeUndefined();
    expect(udpTarget(info(), 'not a url')).toBeUndefined();
  });
});
