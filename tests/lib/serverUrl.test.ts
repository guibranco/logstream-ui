import { describe, it, expect } from 'vitest';
import { apiEndpoint, streamEndpoint, deriveWsUrl, deriveApiUrl, editPairedUrl, initialPairedUrls } from '@/src/lib/serverUrl';

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

describe('deriveWsUrl / deriveApiUrl', () => {
  it('maps http(s) to ws(s) on /ws and back', () => {
    expect(deriveWsUrl('https://logs.example.com')).toBe('wss://logs.example.com/ws');
    expect(deriveWsUrl('http://localhost:8080/')).toBe('ws://localhost:8080/ws');
    expect(deriveApiUrl('wss://logs.example.com/ws')).toBe('https://logs.example.com');
    expect(deriveApiUrl('ws://localhost:8080/ws')).toBe('http://localhost:8080');
  });

  it('returns empty for incomplete or wrong-scheme input', () => {
    expect(deriveWsUrl('')).toBe('');
    expect(deriveWsUrl('https:')).toBe('');
    expect(deriveWsUrl('wss://logs.example.com')).toBe('');
    expect(deriveApiUrl('logs.example')).toBe('');
    expect(deriveApiUrl('https://logs.example.com')).toBe('');
  });
});

describe('editPairedUrl', () => {
  const empty = initialPairedUrls('', '');

  it('fills the WebSocket URL from the API URL while it is empty', () => {
    const s = editPairedUrl(empty, 'apiUrl', 'https://a.com');
    expect(s).toMatchObject({ apiUrl: 'https://a.com', wsUrl: 'wss://a.com/ws', apiAuto: false, wsAuto: true });
    // keeps following as the user keeps typing
    expect(editPairedUrl(s, 'apiUrl', 'https://a.com.br').wsUrl).toBe('wss://a.com.br/ws');
  });

  it('fills the API URL from the WebSocket URL while it is empty', () => {
    const s = editPairedUrl(empty, 'wsUrl', 'wss://a.com/ws');
    expect(s).toMatchObject({ apiUrl: 'https://a.com', wsUrl: 'wss://a.com/ws', apiAuto: true, wsAuto: false });
  });

  it('keeps a value the user typed themselves', () => {
    let s = editPairedUrl(empty, 'apiUrl', 'https://a.com');
    s = editPairedUrl(s, 'wsUrl', 'wss://stream.a.com/live');
    s = editPairedUrl(s, 'apiUrl', 'https://b.com');
    expect(s.wsUrl).toBe('wss://stream.a.com/live');
    expect(s.apiUrl).toBe('https://b.com');
  });

  it('auto-fills again after the user clears a field', () => {
    let s = editPairedUrl(empty, 'apiUrl', 'https://a.com');
    s = editPairedUrl(s, 'wsUrl', 'wss://custom/ws');
    s = editPairedUrl(s, 'wsUrl', '');
    s = editPairedUrl(s, 'apiUrl', 'https://b.com');
    expect(s.wsUrl).toBe('wss://b.com/ws');
  });
});

describe('initialPairedUrls', () => {
  it('treats a saved default pairing as auto, and a custom one as manual', () => {
    expect(initialPairedUrls('https://a.com', 'wss://a.com/ws').wsAuto).toBe(true);
    expect(initialPairedUrls('https://a.com', 'wss://other.com/ws').wsAuto).toBe(false);
    expect(initialPairedUrls('https://a.com', 'wss://a.com/ws').apiAuto).toBe(false);
  });
});
