import { VolumeMetric } from './retentionVolume';

/** The "Storage by age" panel's window (days) and measure, kept between visits. */
export interface VolumePreferences {
  days: number;
  metric: VolumeMetric;
}

export const VOLUME_PREFS_STORAGE_KEY = 'logservice:retention-volume';

export const DEFAULT_VOLUME_PREFERENCES: VolumePreferences = { days: 90, metric: 'count' };

const METRICS: readonly VolumeMetric[] = ['count', 'bytes'];

/**
 * The saved window and measure, or the defaults. Each field falls back on its own
 * when missing or no longer offered (e.g. a window removed from the list), and
 * unreadable storage (private mode, blocked) falls back entirely.
 */
export function loadVolumePreferences(
  storage: Pick<Storage, 'getItem'> | null,
  allowedDays: readonly number[],
): VolumePreferences {
  let parsed: unknown;
  try {
    const raw = storage?.getItem(VOLUME_PREFS_STORAGE_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const saved = (parsed && typeof parsed === 'object' ? parsed : {}) as Partial<Record<keyof VolumePreferences, unknown>>;

  return {
    days: typeof saved.days === 'number' && allowedDays.includes(saved.days)
      ? saved.days
      : DEFAULT_VOLUME_PREFERENCES.days,
    metric: METRICS.includes(saved.metric as VolumeMetric)
      ? (saved.metric as VolumeMetric)
      : DEFAULT_VOLUME_PREFERENCES.metric,
  };
}

export function saveVolumePreferences(prefs: VolumePreferences, storage: Pick<Storage, 'setItem'> | null): void {
  try {
    storage?.setItem(VOLUME_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable (private mode, quota): the selection lasts for this visit only.
  }
}

/** localStorage, or null where reading it throws (blocked storage). */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
