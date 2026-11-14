import { deriveWsUrl } from './serverUrl';

/**
 * Connection settings carried in a link, so a LogStream UI can be shared
 * already pointed at a server:
 *
 *   https://host/logstream-ui/#server=logs.example.com&secret=lsu_abc
 *
 * The fragment (after `#`) is the recommended place: browsers never send it to
 * the web server, so the secret stays out of access logs and Referer headers.
 * The same parameters in the query string (`?server=…`) are read too.
 *
 * - `server` (alias `domain`, `api`): API base URL, or a bare domain (`https://` is assumed).
 * - `ws`: WebSocket URL, only needed when it isn't the one derived from `server`.
 * - `secret`: the UI secret (read key).
 */
export interface SharedConnection {
  apiUrl?: string;
  wsUrl?: string;
  uiSecret?: string;
}

const SERVER_KEYS = ['server', 'domain', 'api'] as const;
const WS_KEY = 'ws';
const SECRET_KEY = 'secret';
const ALL_KEYS: readonly string[] = [...SERVER_KEYS, WS_KEY, SECRET_KEY];

function trimSlashes(path: string): string {
  let p = path;
  while (p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

/** http(s) URL from a full URL or a bare domain (`logs.example.com[:port][/path]`); undefined when invalid. */
export function normalizeServer(value: string): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    if (!url.host || url.username || url.password) return undefined;
    return `${url.protocol}//${url.host}${trimSlashes(url.pathname)}`;
  } catch {
    return undefined;
  }
}

/** ws(s) URL; undefined when invalid. */
function normalizeWs(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return undefined;
    if (!url.host || url.username || url.password) return undefined;
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Parameters of the fragment (`#a=1&b=2`, also `#/?a=1`). */
function hashParams(hash: string): URLSearchParams {
  let h = hash.startsWith('#') ? hash.slice(1) : hash;
  const q = h.indexOf('?');
  if (q >= 0) h = h.slice(q + 1);
  return new URLSearchParams(h);
}

function firstValue(sources: URLSearchParams[], keys: readonly string[]): string | undefined {
  for (const params of sources) {
    for (const key of keys) {
      const value = params.get(key);
      if (value !== null && value.trim() !== '') return value;
    }
  }
  return undefined;
}

/**
 * Connection settings in the URL (fragment first, then the query string), or
 * null when it carries none. Invalid URLs are ignored rather than half-applied.
 */
export function readSharedConnection(location: Pick<Location, 'search' | 'hash'>): SharedConnection | null {
  const sources = [hashParams(location.hash), new URLSearchParams(location.search)];
  const result: SharedConnection = {};

  const server = firstValue(sources, SERVER_KEYS);
  const apiUrl = server !== undefined ? normalizeServer(server) : undefined;
  if (apiUrl) result.apiUrl = apiUrl;

  const ws = firstValue(sources, [WS_KEY]);
  const wsUrl = ws !== undefined ? normalizeWs(ws) : undefined;
  if (wsUrl) result.wsUrl = wsUrl;

  const secret = firstValue(sources, [SECRET_KEY]);
  if (secret !== undefined) result.uiSecret = secret.trim();

  return Object.keys(result).length > 0 ? result : null;
}

/** True when the URL has any connection parameter (valid or not) that should be removed. */
export function hasConnectionParams(location: Pick<Location, 'search' | 'hash'>): boolean {
  const sources = [hashParams(location.hash), new URLSearchParams(location.search)];
  return sources.some(p => ALL_KEYS.some(k => p.has(k)));
}

/**
 * The current URL without the connection parameters, keeping everything else
 * (filters in the query string, other fragment content), so the secret doesn't
 * linger in the address bar, history or a bookmark.
 */
export function urlWithoutConnection(location: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  let search = location.search;
  const query = new URLSearchParams(search);
  if (ALL_KEYS.some(k => query.has(k))) {
    for (const key of ALL_KEYS) query.delete(key);
    const rest = query.toString();
    search = rest ? `?${rest}` : '';
  }

  let hash = location.hash;
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const q = raw.indexOf('?');
  const prefix = q >= 0 ? raw.slice(0, q) : '';
  const hashQuery = new URLSearchParams(q >= 0 ? raw.slice(q + 1) : raw);
  if (ALL_KEYS.some(k => hashQuery.has(k))) {
    for (const key of ALL_KEYS) hashQuery.delete(key);
    const rest = hashQuery.toString();
    const value = rest ? (q >= 0 ? `${prefix}?${rest}` : rest) : prefix;
    hash = value ? `#${value}` : '';
  }

  return `${location.pathname}${search}${hash}`;
}

/**
 * A link to this UI (`base`, e.g. origin + pathname) that pre-fills the given
 * connection. The WebSocket URL is left out when it's the one derived from the
 * API URL, and the secret only when `includeSecret` is false.
 */
export function buildShareLink(
  base: string,
  connection: { apiUrl: string; wsUrl: string; uiSecret: string },
  includeSecret: boolean,
): string {
  const params = new URLSearchParams();
  const apiUrl = normalizeServer(connection.apiUrl) ?? connection.apiUrl.trim();
  params.set('server', apiUrl);
  const wsUrl = connection.wsUrl.trim();
  if (wsUrl && wsUrl !== deriveWsUrl(apiUrl)) params.set(WS_KEY, wsUrl);
  if (includeSecret && connection.uiSecret.trim()) params.set(SECRET_KEY, connection.uiSecret.trim());
  const cleanBase = base.split('#')[0];
  return `${cleanBase}#${params.toString()}`;
}
