import { describe, it, expect } from 'vitest';
import { apiEndpoint, streamEndpoint } from '@/src/lib/serverUrl';

describe('apiEndpoint', () => {
  it('joins the API path and parameters', () => {
    const params = new URLSearchParams({ limit: '100', offset: '0' });
    expect(apiEndpoint('https://logs.example.com', '/api/logs', params))
      .toBe('https://logs.example.com/api/logs?limit=100&offset=0');
  });

  it('keeps a base path and drops trailing slashes', () => {
    expect(apiEndpoint('https://example.com/logstream/', '/api/logs')).toBe('https://example.com/logstream/api/logs');
  });

  it('rejects other schemes and invalid URLs', () => {
    expect(() => apiEndpoint('javascript:alert(1)', '/api/logs')).toThrow(/must start with/);
    expect(() => apiEndpoint('not a url', '/api/logs')).toThrow(/not a valid URL/);
  });
});

describe('streamEndpoint', () => {
  it('adds the token as a query parameter', () => {
    expect(streamEndpoint('wss://logs.example.com/ws', 'a b&c')).toBe('wss://logs.example.com/ws?token=a+b%26c');
  });

  it('only accepts ws and wss', () => {
    expect(() => streamEndpoint('https://logs.example.com/ws', 't')).toThrow(/must start with/);
  });
});
