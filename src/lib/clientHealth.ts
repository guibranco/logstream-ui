import { format } from 'date-fns';
import { Client, ClientDisplayStatus, ClientHealthStatus } from '../types';

/** Largest heartbeat timeout the server accepts: 30 days. */
export const MAX_HEARTBEAT_TIMEOUT_MINUTES = 43200;

/** Whether the server reports health for this client (servers before client health don't). */
export function hasHealth(client: Client): boolean {
  return client.status !== undefined;
}

function lastSeenDate(client: Client): Date | null {
  if (!client.last_seen_at) return null;
  const date = new Date(client.last_seen_at);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole seconds since the client was last seen (never negative), or null when never seen. */
export function secondsSinceSeen(client: Client, now: Date): number | null {
  const seen = lastSeenDate(client);
  if (!seen) return null;
  return Math.max(0, Math.floor((now.getTime() - seen.getTime()) / 1000));
}

/**
 * Health at `now`, worked out the same way as the server so the pill turns
 * Silent between refetches: never seen → never_seen; past the timeout →
 * silent; otherwise (or without a timeout) → active.
 */
export function healthAt(client: Client, now: Date): ClientHealthStatus {
  const elapsed = secondsSinceSeen(client, now);
  if (elapsed === null) return 'never_seen';
  const timeout = client.heartbeat_timeout_min;
  if (timeout && timeout > 0 && elapsed > timeout * 60) return 'silent';
  return 'active';
}

/** Status for the pill. Disabled apps are `inactive` whatever their health. */
export function displayStatus(client: Client, now: Date): ClientDisplayStatus {
  if (!client.active) return 'inactive';
  if (!hasHealth(client)) return 'active';
  return healthAt(client, now);
}

const URGENCY: Record<ClientDisplayStatus, number> = {
  inactive: 0,
  silent: 1,
  never_seen: 2,
  active: 3,
};

/** Most urgent first (inactive → silent → never seen → active), then by name. Does not mutate. */
export function sortByUrgency(clients: Client[], now: Date): Client[] {
  return [...clients].sort((a, b) => {
    const diff = URGENCY[displayStatus(a, now)] - URGENCY[displayStatus(b, now)];
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

/** "just now", "3 min ago", "2 hours ago", "4 days ago" — or "Never". */
export function formatLastSeen(client: Client, now: Date): string {
  const elapsed = secondsSinceSeen(client, now);
  if (elapsed === null) return 'Never';
  if (elapsed < 60) return 'just now';
  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${plural(hours, 'hour')} ago`;
  return `${plural(Math.floor(hours / 24), 'day')} ago`;
}

/** "47 minutes", "2 hours 5 minutes", "3 days 4 hours". */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return plural(minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${plural(hours, 'hour')} ${plural(rest, 'minute')}` : plural(hours, 'hour');
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${plural(days, 'day')} ${plural(rest, 'hour')}` : plural(days, 'day');
}

/** Absolute local time, e.g. "2026-04-17 14:22:00", or null when never seen. */
export function formatAbsolute(client: Client): string | null {
  const seen = lastSeenDate(client);
  return seen ? format(seen, 'yyyy-MM-dd HH:mm:ss') : null;
}

/** Tooltip for the status pill. */
export function statusTooltip(client: Client, now: Date): string | undefined {
  const status = displayStatus(client, now);
  if (status === 'inactive') return 'Disabled — requests from this app are rejected';
  if (!hasHealth(client)) return undefined;

  const absolute = formatAbsolute(client);
  const timeout = client.heartbeat_timeout_min;
  const threshold = timeout ? `Silence threshold: ${plural(timeout, 'minute')}` : 'Silence threshold: not set';

  if (status === 'never_seen') return `No logs received yet\n${threshold}`;
  if (status === 'silent') {
    return [
      `Last seen: ${absolute}`,
      threshold,
      `Silent for: ${formatDuration(secondsSinceSeen(client, now) ?? 0)}`,
    ].join('\n');
  }
  return `Last seen: ${absolute}\n${threshold}`;
}

/**
 * Parses the heartbeat timeout field: '' → null (monitoring off), a whole
 * number from 1 to 43200 → that number, anything else → undefined (invalid).
 */
export function parseHeartbeatTimeout(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const minutes = Number(trimmed);
  return minutes >= 1 && minutes <= MAX_HEARTBEAT_TIMEOUT_MINUTES ? minutes : undefined;
}
