import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

/** Cool slate surfaces with violet actions and purple filters. */
export default defineTheme({
  id: 'violet',
  name: 'Violet',
  description: 'Slate with violet and purple accents',
  order: 5,
  dark: {
    neutral: colors.slate,
    primary: colors.violet,
    secondary: colors.purple,
  },
  light: {
    neutral: colors.slate,
    primary: colors.violet,
    secondary: colors.purple,
    overrides: {
      'gray-950': colors.white,
    },
  },
});
