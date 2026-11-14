/**
 * URLs of the LogStream server the user configured. Only the expected schemes
 * are accepted, and paths and parameters are set through URL instead of being
 * concatenated, so a malformed setting can't point requests somewhere else.
 */

function parse(base: string, protocols: string[]): URL {
  let url: URL;
  try {
    url = new URL(base.trim());
  } catch {
    throw new Error('The LogStream server URL in your settings is not a valid URL.');
  }
  if (!protocols.includes(url.protocol)) {
    const allowed = protocols.map(p => p + '//').join(' or ');
    throw new Error(`The LogStream server URL must start with ${allowed}.`);
  }
  return url;
}

/** `${apiUrl}${path}?params` for the HTTP API (http/https only). */
export function apiEndpoint(apiUrl: string, path: string, params?: URLSearchParams): string {
  const url = parse(apiUrl, ['http:', 'https:']);
  let base = url.pathname;
  while (base.endsWith('/')) base = base.slice(0, -1);
  url.pathname = base + path;
  url.search = params ? params.toString() : '';
  url.hash = '';
  return url.toString();
}

/**
 * The WebSocket URL a given API base URL most likely pairs with:
 * `https://foo.com` → `wss://foo.com/ws`, `http://localhost:8080` → `ws://localhost:8080/ws`.
 * Returns '' while the input isn't a complete http(s) URL yet.
 */
export function deriveWsUrl(apiUrl: string): string {
  try {
    const url = new URL(apiUrl.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    if (!url.host) return '';
    return `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/ws`;
  } catch {
    return '';
  }
}

/**
 * The API base URL a given WebSocket URL most likely pairs with:
 * `wss://foo.com/ws` → `https://foo.com`. Returns '' while the input isn't a
 * complete ws(s) URL yet.
 */
export function deriveApiUrl(wsUrl: string): string {
  try {
    const url = new URL(wsUrl.trim());
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return '';
    if (!url.host) return '';
    return `${url.protocol === 'wss:' ? 'https:' : 'http:'}//${url.host}`;
  } catch {
    return '';
  }
}

/** The two connection URLs, plus whether each one may still be filled in automatically. */
export interface PairedUrls {
  apiUrl: string;
  wsUrl: string;
  /** false once the user typed something in the API field themselves. */
  apiAuto: boolean;
  /** false once the user typed something in the WebSocket field themselves. */
  wsAuto: boolean;
}

/**
 * Initial state from saved settings. A field counts as auto-fillable when it is
 * empty, or (for the WebSocket URL) when it is exactly what would be derived
 * from the API URL, so a default pairing keeps following the API field.
 */
export function initialPairedUrls(apiUrl: string, wsUrl: string): PairedUrls {
  const wsAuto = !wsUrl.trim() || (!!apiUrl.trim() && wsUrl.trim() === deriveWsUrl(apiUrl));
  return { apiUrl, wsUrl, apiAuto: !apiUrl.trim(), wsAuto };
}

/**
 * The user typed `value` into one field. That field becomes manual (unless it
 * was cleared, which makes it auto-fillable again), and the other field is
 * pre-filled from it only while it is empty or was itself auto-filled.
 */
export function editPairedUrl(state: PairedUrls, field: 'apiUrl' | 'wsUrl', value: string): PairedUrls {
  const cleared = value.trim() === '';
  if (field === 'apiUrl') {
    const next = { ...state, apiUrl: value, apiAuto: cleared };
    if (state.wsAuto || !state.wsUrl.trim()) {
      next.wsUrl = deriveWsUrl(value);
      next.wsAuto = true;
    }
    return next;
  }
  const next = { ...state, wsUrl: value, wsAuto: cleared };
  if (state.apiAuto || !state.apiUrl.trim()) {
    next.apiUrl = deriveApiUrl(value);
    next.apiAuto = true;
  }
  return next;
}

/** The live stream URL with the UI secret as `token` (ws/wss only). */
export function streamEndpoint(wsUrl: string, token: string): string {
  const url = parse(wsUrl, ['ws:', 'wss:']);
  url.searchParams.set('token', token);
  url.hash = '';
  return url.toString();
}
