import { describe, it, expect } from 'vitest';
import { resolveDateRange, toServerTime, describeRange, findPreset, withRememberedRange, rememberRange } from '@/src/lib/dateRange';

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

describe('remembered range', () => {
  const store = (initial: Record<string, string> = {}) => {
    const data = { ...initial };
    return {
      data,
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => { data[k] = v; },
    };
  };

  it('defaults to the last 24 hours', () => {
    expect(withRememberedRange({ level: 'error' }, store())).toEqual({ level: 'error', range: '1d' });
  });

  it('uses the remembered preset, or none after "any time"', () => {
    expect(withRememberedRange({}, store({ 'logservice:range': '15m' }))).toEqual({ range: '15m' });
    expect(withRememberedRange({}, store({ 'logservice:range': 'any' }))).toEqual({});
    expect(withRememberedRange({}, store({ 'logservice:range': 'bogus' }))).toEqual({ range: '1d' });
  });

  it('leaves filters that already carry a range alone', () => {
    expect(withRememberedRange({ range: '1h' }, store())).toEqual({ range: '1h' });
    expect(withRememberedRange({ date_from: '2026-11-09T10:00' }, store())).toEqual({ date_from: '2026-11-09T10:00' });
  });

  it('remembers presets and "any time", not custom dates', () => {
    const s = store();
    rememberRange({ range: '7d' }, s);
    expect(s.data['logservice:range']).toBe('7d');
    rememberRange({}, s);
    expect(s.data['logservice:range']).toBe('any');
    rememberRange({ date_from: '2026-11-09T10:00' }, s);
    expect(s.data['logservice:range']).toBe('any');
  });

  it('copes with storage that throws or is missing', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(withRememberedRange({}, broken)).toEqual({ range: '1d' });
    expect(() => rememberRange({ range: '1h' }, broken)).not.toThrow();
    expect(withRememberedRange({}, null)).toEqual({ range: '1d' });
  });
});
