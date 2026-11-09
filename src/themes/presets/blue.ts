import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

/** The original LogStream look: cool gray surfaces, blue actions, sky filters. */
export default defineTheme({
  id: 'blue',
  name: 'Blue',
  description: 'Cool gray with blue and sky accents',
  order: 0,
  dark: {
    neutral: colors.gray,
    primary: colors.blue,
    secondary: colors.sky,
  },
  light: {
    neutral: colors.gray,
    primary: colors.blue,
    secondary: colors.sky,
    overrides: {
      // Page background pure white instead of gray-50; panels (gray-900) become gray-100.
      'gray-950': colors.white,
    },
  },
});
