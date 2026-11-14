import type { AppKeyOption } from '../components/search/AppKeyPicker';
import type { ServerInfo } from '../hooks/useServerInfo';

/** App key the server stores its own log entries under (logstream-server#131). */
export const SERVER_APP_KEY = 'logstream-server';

/** Shown next to the server's own app key in the picker. */
export const SERVER_APP_NAME = 'LogStream server';

/**
 * The app key the server's own entries use, or null when self-logging is off
 * (or the server predates it). The key is never a registered client, so it
 * has to be added to the picker separately.
 */
export function serverAppKey(info: ServerInfo | undefined): string | null {
  const selfLogging = info?.self_logging;
  if (selfLogging?.enabled !== true && info?.features?.self_logging !== true) return null;
  return selfLogging?.app_key || SERVER_APP_KEY;
}

interface BuildOptions {
  /** Registered applications (MariaDB), or null without a client registry. */
  clients: { app_key: string; name: string }[] | null;
  /** App keys seen in the feed, used when there is no client registry. */
  seenAppKeys: Iterable<string>;
  /** The server's own app key when self-logging is enabled, else null. */
  serverAppKey: string | null;
}

/**
 * Options for the application filter: the registered applications (or the
 * app keys seen so far), plus the server's own app key only while the server
 * says self-logging is enabled.
 */
export function buildAppKeyOptions({ clients, seenAppKeys, serverAppKey }: BuildOptions): AppKeyOption[] {
  const options: AppKeyOption[] = clients
    ? clients.map(c => ({ appKey: c.app_key, name: c.name }))
    : [...seenAppKeys].map(appKey => ({ appKey }));

  // Seen in the feed from before it was turned off: not offered while it is off.
  const withoutServer = options.filter(o => o.appKey !== SERVER_APP_KEY && o.appKey !== serverAppKey);

  return serverAppKey
    ? [...withoutServer, { appKey: serverAppKey, name: SERVER_APP_NAME }]
    : withoutServer;
}
