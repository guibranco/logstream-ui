import { scale } from '../palette';
import { defineTheme } from '../types';

/**
 * Catppuccin (https://catppuccin.com/palette): Mocha for dark, Latte for light.
 * Neutrals are the flavours' base/surface/overlay/text colours; accents run
 * from Mocha's pastel (text on dark) to Latte's saturated tone (buttons, and
 * text on light).
 */
const mauve = scale({ '50': '#f6f0fe', '400': '#cba6f7', '600': '#8839ef', '950': '#2b0d55' });
const blue = scale({ '50': '#eef4ff', '400': '#89b4fa', '600': '#1e66f5', '950': '#0b2357' });

export default defineTheme({
  id: 'catppuccin',
  name: 'Catppuccin',
  description: 'Mocha (dark) and Latte (light), mauve and blue',
  order: 11,
  dark: {
    // Mocha
    neutral: {
      '50': '#e6eaf9',
      '100': '#cdd6f4', // text
      '200': '#bac2de', // subtext1
      '300': '#a6adc8', // subtext0
      '400': '#9399b2', // overlay2
      '500': '#7f849c', // overlay1
      '600': '#6c7086', // overlay0
      '700': '#45475a', // surface1
      '800': '#313244', // surface0
      '900': '#1e1e2e', // base
      '950': '#181825', // mantle
    },
    primary: mauve,
    secondary: blue,
  },
  light: {
    // Latte, lightest first (the engine flips it)
    neutral: {
      '50': '#eff1f5', // base
      '100': '#e6e9ef', // mantle
      '200': '#ccd0da', // surface0
      '300': '#bcc0cc', // surface1
      '400': '#9ca0b0', // overlay0
      '500': '#7c7f93', // overlay2
      '600': '#6c6f85', // subtext0
      '700': '#5c5f77', // subtext1
      '800': '#54576f',
      '900': '#4c4f69', // text
      '950': '#363a4f',
    },
    primary: mauve,
    secondary: blue,
  },
});
