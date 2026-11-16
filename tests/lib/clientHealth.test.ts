import { describe, it, expect } from 'vitest';
import {
  displayStatus,
  formatDuration,
  formatLastSeen,
  healthAt,
  parseHeartbeatTimeout,
  sortByUrgency,
  statusTooltip,
} from '@/src/lib/clientHealth';
import { Client } from '@/src/types';

const NOW = new Date('2026-04-17T15:09:00Z');

function client(overrides: Partial<Client> = {}): Client {
  return {
    name: 'App',
    app_key: 'app',
    active: true,
    created_at: '2026-04-01T12:00:00+00:00',
    updated_at: '2026-04-01T12:00:00+00:00',
    last_seen_at: null,
    heartbeat_timeout_min: null,
    status: 'never_seen',
    ...overrides,
  };
}

describe('healthAt', () => {
  it('is never_seen without last_seen_at', () => {
    expect(healthAt(client(), NOW)).toBe('never_seen');
  });

  it('is active within the timeout and exactly at it', () => {
    expect(healthAt(client({ last_seen_at: '2026-04-17T15:06:00Z', heartbeat_timeout_min: 10 }), NOW)).toBe('active');
    expect(healthAt(client({ last_seen_at: '2026-04-17T14:59:00Z', heartbeat_timeout_min: 10 }), NOW)).toBe('active');
  });

  it('is silent past the timeout', () => {
    expect(healthAt(client({ last_seen_at: '2026-04-17T14:58:59Z', heartbeat_timeout_min: 10 }), NOW)).toBe('silent');
  });

  it('is active without a timeout however old', () => {
    expect(healthAt(client({ last_seen_at: '2025-01-01T00:00:00Z' }), NOW)).toBe('active');
  });
});

describe('displayStatus', () => {
  it('is inactive for disabled apps whatever their health', () => {
    expect(displayStatus(client({ active: false, status: 'silent' }), NOW)).toBe('inactive');
  });

  it('is active for enabled apps on servers without health', () => {
    expect(displayStatus(client({ status: undefined, last_seen_at: undefined }), NOW)).toBe('active');
  });
});

describe('sortByUrgency', () => {
  it('orders inactive, silent, never seen, active, then by name, without mutating', () => {
    const input = [
      client({ name: 'B active', app_key: 'b', last_seen_at: '2026-04-17T15:08:00Z', status: 'active' }),
      client({ name: 'A active', app_key: 'a', last_seen_at: '2026-04-17T15:08:00Z', status: 'active' }),
      client({ name: 'Never', app_key: 'n' }),
      client({ name: 'Silent', app_key: 's', last_seen_at: '2026-04-17T10:00:00Z', heartbeat_timeout_min: 5, status: 'silent' }),
      client({ name: 'Off', app_key: 'o', active: false }),
    ];
    const sorted = sortByUrgency(input, NOW);
    expect(sorted.map((c) => c.app_key)).toEqual(['o', 's', 'n', 'a', 'b']);
    expect(input[0].app_key).toBe('b');
  });
});

describe('formatLastSeen', () => {
  it.each([
    [null, 'Never'],
    ['2026-04-17T15:08:30Z', 'just now'],
    ['2026-04-17T15:06:00Z', '3 min ago'],
    ['2026-04-17T14:09:00Z', '1 hour ago'],
    ['2026-04-17T13:00:00Z', '2 hours ago'],
    ['2026-04-14T15:09:00Z', '3 days ago'],
  ])('%s → %s', (lastSeen, expected) => {
    expect(formatLastSeen(client({ last_seen_at: lastSeen }), NOW)).toBe(expected);
  });
});

describe('formatDuration', () => {
  it.each([
    [30, 'less than a minute'],
    [60, '1 minute'],
    [47 * 60, '47 minutes'],
    [2 * 3600, '2 hours'],
    [2 * 3600 + 5 * 60, '2 hours 5 minutes'],
    [3 * 86400 + 4 * 3600, '3 days 4 hours'],
  ])('%i s → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('statusTooltip', () => {
  it('has no tooltip for active apps on servers without health', () => {
    expect(statusTooltip(client({ status: undefined, last_seen_at: undefined }), NOW)).toBeUndefined();
  });

  it('explains never seen and disabled apps', () => {
    expect(statusTooltip(client({ heartbeat_timeout_min: 10 }), NOW)).toBe(
      'No logs received yet\nSilence threshold: 10 minutes',
    );
    expect(statusTooltip(client({ active: false }), NOW)).toMatch(/Disabled/);
  });
});

describe('parseHeartbeatTimeout', () => {
  it.each([
    ['', null],
    ['  ', null],
    ['10', 10],
    [' 15 ', 15],
    ['43200', 43200],
    ['0', undefined],
    ['43201', undefined],
    ['1.5', undefined],
    ['-3', undefined],
    ['ten', undefined],
  ])('%j → %s', (value, expected) => {
    expect(parseHeartbeatTimeout(value)).toBe(expected);
  });
});
