import { describe, it, expect } from 'vitest';
import { buildAppKeyOptions, serverAppKey, SERVER_APP_KEY } from '@/src/lib/appKeyOptions';
import type { ServerInfo } from '@/src/hooks/useServerInfo';

const info = (extra: Partial<ServerInfo> = {}): ServerInfo => ({
  version: '1.0.0',
  storage_type: 'mariadb',
  features: { client_management: true, retention: false, websocket: true },
  ...extra,
});

describe('serverAppKey', () => {
  it('is the reserved key when self-logging is enabled', () => {
    expect(serverAppKey(info({
      features: { client_management: true, retention: false, websocket: true, self_logging: true },
      self_logging: { enabled: true, app_key: 'logstream-server' },
    }))).toBe('logstream-server');
  });

  it('uses the app key the server reports', () => {
    expect(serverAppKey(info({ self_logging: { enabled: true, app_key: 'my-logstream' } }))).toBe('my-logstream');
  });

  it('falls back to the default key when only the feature flag is set', () => {
    expect(serverAppKey(info({
      features: { client_management: true, retention: false, websocket: true, self_logging: true },
    }))).toBe(SERVER_APP_KEY);
  });

  it('is null when self-logging is disabled', () => {
    expect(serverAppKey(info({
      features: { client_management: true, retention: false, websocket: true, self_logging: false },
      self_logging: { enabled: false, app_key: 'logstream-server' },
    }))).toBeNull();
  });

  it('is null for servers without the feature, or before /api/info loads', () => {
    expect(serverAppKey(info())).toBeNull();
    expect(serverAppKey(undefined)).toBeNull();
  });
});

describe('buildAppKeyOptions', () => {
  const clients = [{ app_key: 'billing-api', name: 'Billing API' }];

  it('lists the registered applications plus the server when enabled', () => {
    expect(buildAppKeyOptions({ clients, seenAppKeys: [], serverAppKey: 'logstream-server' })).toEqual([
      { appKey: 'billing-api', name: 'Billing API' },
      { appKey: 'logstream-server', name: 'LogStream server' },
    ]);
  });

  it('leaves the server out when disabled', () => {
    expect(buildAppKeyOptions({ clients, seenAppKeys: [], serverAppKey: null })).toEqual([
      { appKey: 'billing-api', name: 'Billing API' },
    ]);
  });

  it('uses the seen app keys without a client registry', () => {
    expect(buildAppKeyOptions({ clients: null, seenAppKeys: ['demo'], serverAppKey: 'logstream-server' })).toEqual([
      { appKey: 'demo' },
      { appKey: 'logstream-server', name: 'LogStream server' },
    ]);
  });

  it('does not list the server twice when its entries were seen in the feed', () => {
    const options = buildAppKeyOptions({
      clients: null,
      seenAppKeys: ['demo', 'logstream-server'],
      serverAppKey: 'logstream-server',
    });
    expect(options.filter(o => o.appKey === 'logstream-server')).toHaveLength(1);
  });

  it('drops seen server entries while self-logging is disabled', () => {
    expect(buildAppKeyOptions({ clients: null, seenAppKeys: ['demo', 'logstream-server'], serverAppKey: null })).toEqual([
      { appKey: 'demo' },
    ]);
  });
});
