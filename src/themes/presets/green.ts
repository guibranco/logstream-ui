import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

/** Neutral zinc surfaces with emerald actions and green filters. */
export default defineTheme({
  id: 'green',
  name: 'Green',
  description: 'Neutral zinc with emerald and green accents',
  order: 1,
  dark: {
    neutral: colors.zinc,
    primary: colors.emerald,
    secondary: colors.green,
  },
  light: {
    neutral: colors.zinc,
    primary: colors.emerald,
    secondary: colors.green,
    overrides: {
      'gray-950': colors.white,
    },
  },
});
