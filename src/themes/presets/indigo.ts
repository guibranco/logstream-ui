import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

/** Cool slate surfaces with indigo actions and violet filters. */
export default defineTheme({
  id: 'indigo',
  name: 'Indigo',
  description: 'Slate with indigo and violet accents',
  order: 6,
  dark: {
    neutral: colors.slate,
    primary: colors.indigo,
    secondary: colors.violet,
  },
  light: {
    neutral: colors.slate,
    primary: colors.indigo,
    secondary: colors.violet,
    overrides: {
      'gray-950': colors.white,
    },
  },
});
