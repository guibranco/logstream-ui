/** The eleven steps of a Tailwind colour scale. */
export const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const;

export type Shade = (typeof SHADES)[number];

/** A full colour scale, lightest (50) to darkest (950), e.g. `colors.emerald` from `tailwindcss/colors`. */
export type ColorScale = Record<Shade, string>;

/** Light or dark: the two variants every theme provides. */
export type ColorMode = 'light' | 'dark';

/** What the user picks: a fixed mode, or follow the operating system. */
export type ModePreference = ColorMode | 'system';

/**
 * One variant (light or dark) of a theme.
 *
 * Components are written for a dark UI with three roles:
 * - `gray-*`      the neutral scale (backgrounds, borders, text)
 * - `primary-*`   the main accent (buttons, links, focus rings)
 * - `secondary-*` the second accent (filters, live-tail highlights)
 *
 * Give each scale in its natural order (50 = lightest). For a light variant the
 * engine flips the scales so that `bg-gray-950` becomes the lightest surface and
 * `text-primary-400` a readable dark accent; status colours (red, amber, green…)
 * are flipped the same way.
 */
export interface ThemeVariant {
  neutral: ColorScale;
  primary: ColorScale;
  /** Defaults to `primary`. */
  secondary?: ColorScale;
  /**
   * Last-word overrides, applied after the scales are mapped. Keys are Tailwind
   * colour names without the `--color-` prefix, values any CSS colour:
   * `{ 'gray-950': '#ffffff', 'primary-600': 'oklch(52% 0.15 160)' }`.
   */
  overrides?: Record<string, string>;
}

export interface ThemeDefinition {
  /** Stable id, stored in the user's preferences. Lowercase, no spaces. */
  id: string;
  /** Name shown in the theme picker. */
  name: string;
  description?: string;
  /** Position in the picker; lower first. Themes without one are sorted by name, after those with one. */
  order?: number;
  dark: ThemeVariant;
  light: ThemeVariant;
}

/** Identity helper that gives theme files type checking and autocompletion. */
export function defineTheme(theme: ThemeDefinition): ThemeDefinition {
  return theme;
}
