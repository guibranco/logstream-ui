import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

/** Monochrome: neutral surfaces and gray accents, so log levels are the only colour on screen. */
export default defineTheme({
  id: 'graphite',
  name: 'Graphite',
  description: 'Monochrome: only log levels add colour',
  order: 8,
  dark: {
    neutral: colors.neutral,
    primary: colors.neutral,
    secondary: colors.zinc,
  },
  light: {
    neutral: colors.neutral,
    primary: colors.neutral,
    secondary: colors.zinc,
    overrides: {
      'gray-950': colors.white,
    },
  },
});
