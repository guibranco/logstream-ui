import { describe, it, expect } from 'vitest';
import {
  buildShareLink,
  hasConnectionParams,
  normalizeServer,
  readSharedConnection,
  urlWithoutConnection,
} from '@/src/lib/shareLink';

const loc = (search: string, hash: string, pathname = '/logstream-ui/') => ({ pathname, search, hash });

describe('normalizeServer', () => {
  it('assumes https for a bare domain', () => {
    expect(normalizeServer('logs.example.com')).toBe('https://logs.example.com');
    expect(normalizeServer('logs.example.com:8080/base/')).toBe('https://logs.example.com:8080/base');
  });

  it('keeps an explicit http(s) scheme and drops trailing slashes', () => {
    expect(normalizeServer('http://localhost:8080/')).toBe('http://localhost:8080');
    expect(normalizeServer('https://logs.example.com/logstream//')).toBe('https://logs.example.com/logstream');
  });

  it('rejects other schemes, credentials and garbage', () => {
    expect(normalizeServer('javascript://alert(1)')).toBeUndefined();
    expect(normalizeServer('ftp://logs.example.com')).toBeUndefined();
    expect(normalizeServer('https://user:pw@logs.example.com')).toBeUndefined();
    expect(normalizeServer('   ')).toBeUndefined();
    expect(normalizeServer('https://')).toBeUndefined();
  });
});

describe('readSharedConnection', () => {
  it('reads server and secret from the fragment', () => {
    expect(readSharedConnection(loc('', '#server=logs.example.com&secret=lsu_abc'))).toEqual({
      apiUrl: 'https://logs.example.com',
      uiSecret: 'lsu_abc',
    });
  });

  it('accepts domain and api as aliases, and the query string', () => {
    expect(readSharedConnection(loc('?domain=logs.example.com', ''))).toEqual({ apiUrl: 'https://logs.example.com' });
    expect(readSharedConnection(loc('', '#api=http%3A%2F%2Flocalhost%3A8080'))).toEqual({ apiUrl: 'http://localhost:8080' });
  });

  it('prefers the fragment over the query string', () => {
    expect(readSharedConnection(loc('?secret=from_query', '#secret=from_hash'))).toEqual({ uiSecret: 'from_hash' });
  });

  it('reads an explicit ws URL and ignores an invalid one', () => {
    expect(readSharedConnection(loc('', '#server=a.com&ws=wss%3A%2F%2Fb.com%2Fstream'))).toEqual({
      apiUrl: 'https://a.com',
      wsUrl: 'wss://b.com/stream',
    });
    expect(readSharedConnection(loc('', '#ws=https%3A%2F%2Fb.com'))).toBeNull();
  });

  it('supports a hash-router style fragment', () => {
    expect(readSharedConnection(loc('', '#/?server=a.com'))).toEqual({ apiUrl: 'https://a.com' });
  });

  it('returns null without connection parameters', () => {
    expect(readSharedConnection(loc('?level=error', '#section'))).toBeNull();
  });
});

describe('hasConnectionParams', () => {
  it('detects parameters even when their values are invalid', () => {
    expect(hasConnectionParams(loc('', '#server=javascript%3Aalert(1)'))).toBe(true);
    expect(hasConnectionParams(loc('?level=error', ''))).toBe(false);
  });
});

describe('urlWithoutConnection', () => {
  it('removes the connection parameters and keeps filters', () => {
    expect(urlWithoutConnection(loc('?level=error&secret=x', '#server=a.com&secret=y')))
      .toBe('/logstream-ui/?level=error');
  });

  it('keeps other fragment content', () => {
    expect(urlWithoutConnection(loc('', '#tab=1&secret=y'))).toBe('/logstream-ui/#tab=1');
    expect(urlWithoutConnection(loc('', '#/events?secret=y'))).toBe('/logstream-ui/#/events');
  });

  it('leaves a URL without connection parameters untouched', () => {
    expect(urlWithoutConnection(loc('?search=a%20b', '#section'))).toBe('/logstream-ui/?search=a%20b#section');
  });
});

describe('buildShareLink', () => {
  const base = 'https://guilherme.stracini.com.br/logstream-ui/';

  it('puts server and secret in the fragment, leaving out a derived ws URL', () => {
    const link = buildShareLink(base, {
      apiUrl: 'https://logs.example.com',
      wsUrl: 'wss://logs.example.com/ws',
      uiSecret: 'lsu_abc',
    }, true);
    expect(link).toBe(`${base}#server=https%3A%2F%2Flogs.example.com&secret=lsu_abc`);
  });

  it('includes a non-derived ws URL and can leave out the secret', () => {
    const link = buildShareLink(`${base}#old`, {
      apiUrl: 'https://logs.example.com',
      wsUrl: 'wss://stream.example.com/ws',
      uiSecret: 'lsu_abc',
    }, false);
    expect(link).toBe(`${base}#server=https%3A%2F%2Flogs.example.com&ws=wss%3A%2F%2Fstream.example.com%2Fws`);
  });

  it('round-trips through readSharedConnection', () => {
    const link = new URL(buildShareLink(base, {
      apiUrl: 'https://logs.example.com/base',
      wsUrl: 'wss://other.example.com/ws',
      uiSecret: 'lsu_a+b/c=',
    }, true));
    expect(readSharedConnection(link)).toEqual({
      apiUrl: 'https://logs.example.com/base',
      wsUrl: 'wss://other.example.com/ws',
      uiSecret: 'lsu_a+b/c=',
    });
  });
});
