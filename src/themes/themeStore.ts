import { ModePreference } from './types';
import { ThemeVariables } from './engine';

export interface ThemePreference {
  themeId: string;
  mode: ModePreference;
}

export const THEME_STORAGE_KEY = 'logservice:theme';
/** Resolved variables of the last applied theme, read by the first-paint script in `index.html`. */
export const THEME_CACHE_KEY = 'logservice:theme-cache';

const MODES: ReadonlyArray<ModePreference> = ['light', 'dark', 'system'];

export const DEFAULT_PREFERENCE: ThemePreference = { themeId: 'blue', mode: 'dark' };

export function getThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCE };
    const parsed = JSON.parse(raw) as Partial<ThemePreference>;
    return {
      themeId: typeof parsed.themeId === 'string' && parsed.themeId ? parsed.themeId : DEFAULT_PREFERENCE.themeId,
      mode: MODES.includes(parsed.mode as ModePreference) ? (parsed.mode as ModePreference) : DEFAULT_PREFERENCE.mode,
    };
  } catch {
    return { ...DEFAULT_PREFERENCE };
  }
}

export function saveThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Storage unavailable (private mode, quota): the choice lasts for this page only.
  }
}

/**
 * Stores both variants of the selected theme so the first-paint script can pick
 * the right one before React loads, including when the mode follows the system.
 */
export function cacheResolvedTheme(mode: ModePreference, light: ThemeVariables, dark: ThemeVariables): void {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({ mode, light, dark }));
  } catch {
    // Only costs a brief flash of the default theme on the next load.
  }
}
