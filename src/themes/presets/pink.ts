import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

/** Mauve-tinted surfaces with pink actions and fuchsia filters. */
export default defineTheme({
  id: 'pink',
  name: 'Pink',
  description: 'Mauve with pink and fuchsia accents',
  order: 4,
  dark: {
    neutral: colors.mauve,
    primary: colors.pink,
    secondary: colors.fuchsia,
  },
  light: {
    neutral: colors.mauve,
    primary: colors.pink,
    secondary: colors.fuchsia,
    overrides: {
      'gray-950': colors.white,
    },
  },
});
