import { describe, it, expect, beforeEach } from 'vitest';
import {
  cacheResolvedTheme,
  DEFAULT_PREFERENCE,
  getThemePreference,
  saveThemePreference,
  THEME_CACHE_KEY,
  THEME_STORAGE_KEY,
} from '@/src/themes/themeStore';

describe('themeStore', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to the blue dark theme', () => {
    expect(getThemePreference()).toEqual(DEFAULT_PREFERENCE);
    expect(DEFAULT_PREFERENCE).toEqual({ themeId: 'blue', mode: 'dark' });
  });

  it('round-trips a saved preference', () => {
    saveThemePreference({ themeId: 'green', mode: 'system' });
    expect(getThemePreference()).toEqual({ themeId: 'green', mode: 'system' });
  });

  it('ignores invalid or corrupt values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ themeId: 42, mode: 'sepia' }));
    expect(getThemePreference()).toEqual(DEFAULT_PREFERENCE);
    localStorage.setItem(THEME_STORAGE_KEY, '{not json');
    expect(getThemePreference()).toEqual(DEFAULT_PREFERENCE);
  });

  it('caches both variants for the first-paint script', () => {
    cacheResolvedTheme('system', { '--color-gray-950': 'white' }, { '--color-gray-950': 'black' });
    expect(JSON.parse(localStorage.getItem(THEME_CACHE_KEY)!)).toEqual({
      mode: 'system',
      light: { '--color-gray-950': 'white' },
      dark: { '--color-gray-950': 'black' },
    });
  });
});
