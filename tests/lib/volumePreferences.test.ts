import { describe, it, expect } from 'vitest';
import {
  DEFAULT_VOLUME_PREFERENCES,
  VOLUME_PREFS_STORAGE_KEY,
  loadVolumePreferences,
  saveVolumePreferences,
} from '@/src/lib/volumePreferences';

const WINDOWS = [7, 10, 15, 30, 90, 180, 365] as const;

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    data,
  };
}

describe('volume preferences', () => {
  it('round-trips the window and measure', () => {
    const storage = memoryStorage();
    saveVolumePreferences({ days: 10, metric: 'bytes' }, storage);
    expect(loadVolumePreferences(storage, WINDOWS)).toEqual({ days: 10, metric: 'bytes' });
  });

  it('uses the defaults when nothing is saved or storage is unavailable', () => {
    expect(loadVolumePreferences(memoryStorage(), WINDOWS)).toEqual(DEFAULT_VOLUME_PREFERENCES);
    expect(loadVolumePreferences(null, WINDOWS)).toEqual(DEFAULT_VOLUME_PREFERENCES);
  });

  it('falls back per field for values no longer offered', () => {
    const storage = memoryStorage({ [VOLUME_PREFS_STORAGE_KEY]: JSON.stringify({ days: 12, metric: 'bytes' }) });
    expect(loadVolumePreferences(storage, WINDOWS)).toEqual({ days: 90, metric: 'bytes' });

    const badMetric = memoryStorage({ [VOLUME_PREFS_STORAGE_KEY]: JSON.stringify({ days: 30, metric: 'rows' }) });
    expect(loadVolumePreferences(badMetric, WINDOWS)).toEqual({ days: 30, metric: 'count' });
  });

  it('ignores corrupted entries', () => {
    expect(loadVolumePreferences(memoryStorage({ [VOLUME_PREFS_STORAGE_KEY]: '{not json' }), WINDOWS))
      .toEqual(DEFAULT_VOLUME_PREFERENCES);
    expect(loadVolumePreferences(memoryStorage({ [VOLUME_PREFS_STORAGE_KEY]: '"10d"' }), WINDOWS))
      .toEqual(DEFAULT_VOLUME_PREFERENCES);
  });

  it('does not throw when storage throws', () => {
    const throwing = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('quota'); },
    };
    expect(loadVolumePreferences(throwing, WINDOWS)).toEqual(DEFAULT_VOLUME_PREFERENCES);
    expect(() => saveVolumePreferences({ days: 7, metric: 'count' }, throwing)).not.toThrow();
  });
});
