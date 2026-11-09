import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyThemeVariables, resolveThemeVariables } from '../themes/engine';
import { getTheme, themes } from '../themes/registry';
import { cacheResolvedTheme, getThemePreference, saveThemePreference, ThemePreference } from '../themes/themeStore';
import { ColorMode, ModePreference, ThemeDefinition } from '../themes/types';

interface ThemeContextValue {
  themes: ReadonlyArray<ThemeDefinition>;
  theme: ThemeDefinition;
  /** What the user picked. */
  mode: ModePreference;
  /** The variant on screen (`system` resolved). */
  resolvedMode: ColorMode;
  setThemeId: (id: string) => void;
  setMode: (mode: ModePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// "No preference" counts as dark, the app's original look.
const LIGHT_QUERY = '(prefers-color-scheme: light)';

function systemMode(): ColorMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreference] = useState<ThemePreference>(getThemePreference);
  const [systemPrefersMode, setSystemPrefersMode] = useState<ColorMode>(systemMode);

  useEffect(() => {
    if (preference.mode !== 'system' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(LIGHT_QUERY);
    const onChange = () => setSystemPrefersMode(query.matches ? 'light' : 'dark');
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [preference.mode]);

  const theme = getTheme(preference.themeId);
  const resolvedMode: ColorMode = preference.mode === 'system' ? systemPrefersMode : preference.mode;

  useEffect(() => {
    const light = resolveThemeVariables(theme, 'light');
    const dark = resolveThemeVariables(theme, 'dark');
    applyThemeVariables(document.documentElement, resolvedMode === 'light' ? light : dark, resolvedMode);
    document.documentElement.dataset.theme = theme.id;
    cacheResolvedTheme(preference.mode, light, dark);
  }, [theme, resolvedMode, preference.mode]);

  const update = useCallback((patch: Partial<ThemePreference>) => {
    setPreference((current) => {
      const next = { ...current, ...patch };
      saveThemePreference(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themes,
      theme,
      mode: preference.mode,
      resolvedMode,
      setThemeId: (themeId) => update({ themeId }),
      setMode: (mode) => update({ mode }),
    }),
    [theme, preference.mode, resolvedMode, update],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
