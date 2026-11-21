import { describe, it, expect } from 'vitest';
import {
  RETENTION_AGE_PRESETS,
  ageFields,
  ageInDays,
  ageOf,
  cutoffFor,
  formatAge,
  presetFor,
} from '@/src/lib/retentionAge';
import { RANGE_PRESETS } from '@/src/lib/dateRange';

describe('retention age presets', () => {
  it('follows Seq\'s relative ranges from one hour up', () => {
    expect(RETENTION_AGE_PRESETS.map((p) => p.key)).toEqual(['1h', '4h', '12h', '1d', '3d', '7d', '30d', '60d', '90d', '365d']);
    const searchKeys = RANGE_PRESETS.map((p) => p.key);
    for (const preset of RETENTION_AGE_PRESETS) {
      expect(searchKeys).toContain(preset.key);
    }
  });

  it('labels ages in words', () => {
    expect(formatAge({ value: 1, unit: 'hours' })).toBe('1 hour');
    expect(formatAge({ value: 12, unit: 'hours' })).toBe('12 hours');
    expect(formatAge({ value: 1, unit: 'days' })).toBe('1 day');
    expect(formatAge({ value: 30, unit: 'days' })).toBe('30 days');
  });

  it('finds the preset of an age, or none for a custom one', () => {
    expect(presetFor({ value: 12, unit: 'hours' })?.key).toBe('12h');
    expect(presetFor({ value: 5, unit: 'days' })).toBeUndefined();
    expect(presetFor(null)).toBeUndefined();
  });
});

describe('ageOf / ageFields', () => {
  it('reads hours before days and none as any age', () => {
    expect(ageOf({ older_than_hours: 4 })).toEqual({ value: 4, unit: 'hours' });
    expect(ageOf({ older_than_days: 7 })).toEqual({ value: 7, unit: 'days' });
    expect(ageOf({ older_than_days: null, older_than_hours: null })).toBeNull();
  });

  it('sets exactly one field', () => {
    expect(ageFields({ value: 4, unit: 'hours' })).toEqual({ older_than_days: undefined, older_than_hours: 4 });
    expect(ageFields({ value: 7, unit: 'days' })).toEqual({ older_than_days: 7, older_than_hours: undefined });
  });
});

describe('cutoffFor', () => {
  const now = new Date(2026, 10, 21, 14, 30);

  it('rolls hours back from now', () => {
    expect(cutoffFor({ value: 4, unit: 'hours' }, now)).toEqual(new Date(2026, 10, 21, 10, 30));
  });

  it('cuts days at midnight', () => {
    expect(cutoffFor({ value: 7, unit: 'days' }, now)).toEqual(new Date(2026, 10, 14));
  });

  it('orders a 12-hour age before a 1-day age', () => {
    expect(ageInDays({ value: 12, unit: 'hours' }, now)).toBeLessThan(ageInDays({ value: 1, unit: 'days' }, now));
  });
});
