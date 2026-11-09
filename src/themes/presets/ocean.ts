import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

/** Blue-green mist surfaces with teal actions and cyan filters. */
export default defineTheme({
  id: 'ocean',
  name: 'Ocean',
  description: 'Mist with teal and cyan accents',
  order: 7,
  dark: {
    neutral: colors.mist,
    primary: colors.teal,
    secondary: colors.cyan,
  },
  light: {
    neutral: colors.mist,
    primary: colors.teal,
    secondary: colors.cyan,
    overrides: {
      'gray-950': colors.white,
    },
  },
});
