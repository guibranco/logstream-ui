import { ThemeDefinition } from './types';

/**
 * Every theme in `./presets`. Adding a theme is adding a file there that
 * default-exports `defineTheme({...})`; nothing else needs registering.
 */
const modules = import.meta.glob<{ default: ThemeDefinition }>('./presets/*.ts', { eager: true });

export const DEFAULT_THEME_ID = 'green';

function byOrderThenName(a: ThemeDefinition, b: ThemeDefinition): number {
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  return ao !== bo ? ao - bo : a.name.localeCompare(b.name);
}

function collect(): ThemeDefinition[] {
  const seen = new Map<string, string>();
  const themes: ThemeDefinition[] = [];
  for (const [file, mod] of Object.entries(modules)) {
    const theme = mod.default;
    if (!theme || typeof theme.id !== 'string' || !theme.dark || !theme.light) {
      console.warn(`Theme file ${file} does not default-export a theme; skipped.`);
      continue;
    }
    if (seen.has(theme.id)) {
      console.warn(`Theme id "${theme.id}" in ${file} is already used by ${seen.get(theme.id)}; skipped.`);
      continue;
    }
    seen.set(theme.id, file);
    themes.push(theme);
  }
  return themes.sort(byOrderThenName);
}

export const themes: ReadonlyArray<ThemeDefinition> = collect();

/** The theme with this id, or the default one when it no longer exists. */
export function getTheme(id: string | null | undefined): ThemeDefinition {
  return (
    themes.find((t) => t.id === id) ??
    themes.find((t) => t.id === DEFAULT_THEME_ID) ??
    themes[0]
  );
}
