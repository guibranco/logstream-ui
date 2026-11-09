import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

/** Warm stone surfaces with red actions and rose filters. */
export default defineTheme({
  id: 'red',
  name: 'Red',
  description: 'Warm stone with red and rose accents',
  order: 2,
  dark: {
    neutral: colors.stone,
    primary: colors.red,
    secondary: colors.rose,
  },
  light: {
    neutral: colors.stone,
    primary: colors.red,
    secondary: colors.rose,
    overrides: {
      'gray-950': colors.white,
    },
  },
});
