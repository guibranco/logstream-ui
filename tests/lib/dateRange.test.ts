import { describe, it, expect } from 'vitest';
import { resolveDateRange, toServerTime, describeRange, findPreset } from '@/src/lib/dateRange';

const NOW = Date.parse('2026-11-09T12:00:00.000Z');

describe('resolveDateRange', () => {
  it('turns a relative range into date_from ending now', () => {
    const r = resolveDateRange({ range: '15m', app_key: 'x', date_to: '2026-01-01T00:00' }, NOW);
    expect(r).toEqual({ app_key: 'x', date_from: '2026-11-09T11:45:00.000Z', date_to: undefined });
  });

  it('turns absolute local dates into ISO instants', () => {
    const r = resolveDateRange({ date_from: '2026-11-09T10:00:00Z', date_to: '2026-11-09T11:00:00+01:00' }, NOW);
    expect(r.date_from).toBe('2026-11-09T10:00:00.000Z');
    expect(r.date_to).toBe('2026-11-09T10:00:00.000Z');
  });

  it('ignores an unknown range key', () => {
    expect(resolveDateRange({ range: 'forever' }, NOW)).toEqual({ date_from: undefined, date_to: undefined });
  });
});

describe('toServerTime', () => {
  it('formats in UTC the way the server compares', () => {
    expect(toServerTime('2026-11-09T11:45:30.250Z')).toBe('2026-11-09 11:45:30.250');
    expect(toServerTime('2026-07-01T10:00:00+01:00')).toBe('2026-07-01 09:00:00.000');
  });

  it('leaves values it cannot read untouched', () => {
    expect(toServerTime('yesterday')).toBe('yesterday');
  });
});

describe('describeRange', () => {
  const fmt = (d: Date) => d.toISOString().slice(0, 16);
  it('names presets, absolute ranges and no range', () => {
    expect(describeRange({ range: '1h' }, fmt)).toBe('Last hour');
    expect(describeRange({ date_from: '2026-11-09T10:00:00Z' }, fmt)).toBe('Since 2026-11-09T10:00');
    expect(describeRange({ date_to: '2026-11-09T10:00:00Z' }, fmt)).toBe('Until 2026-11-09T10:00');
    expect(describeRange({}, fmt)).toBe('Any time');
    expect(findPreset('7d')?.label).toBe('Last 7 days');
  });
});
