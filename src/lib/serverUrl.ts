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
    throw new Error(`The LogStream server URL must start with ${protocols.map(p => `${p}//`).join(' or ')}.`);
  }
  return url;
}

/** `${apiUrl}${path}?params` for the HTTP API (http/https only). */
export function apiEndpoint(apiUrl: string, path: string, params?: URLSearchParams): string {
  const url = parse(apiUrl, ['http:', 'https:']);
  url.pathname = `${url.pathname.replace(/\/+$/, '')}${path}`;
  url.search = params ? params.toString() : '';
  url.hash = '';
  return url.toString();
}

/** The live stream URL with the UI secret as `token` (ws/wss only). */
export function streamEndpoint(wsUrl: string, token: string): string {
  const url = parse(wsUrl, ['ws:', 'wss:']);
  url.searchParams.set('token', token);
  url.hash = '';
  return url.toString();
}
