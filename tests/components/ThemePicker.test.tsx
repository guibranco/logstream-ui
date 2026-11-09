import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import colors from 'tailwindcss/colors';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { ThemePicker } from '@/src/components/ThemePicker';
import { THEME_STORAGE_KEY } from '@/src/themes/themeStore';

const renderPicker = () =>
  render(
    <ThemeProvider>
      <ThemePicker />
    </ThemeProvider>,
  );

const rootVar = (name: string) => document.documentElement.style.getPropertyValue(name);

describe('ThemePicker', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    delete document.documentElement.dataset.mode;
  });

  it('applies the default green dark theme on mount', () => {
    renderPicker();
    expect(rootVar('--color-primary-500')).toBe(colors.emerald['500']);
    expect(document.documentElement.dataset.mode).toBe('dark');
  });

  it('opens a menu listing every theme and mode', () => {
    renderPicker();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Theme' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Green/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Blue/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  });

  it('switches theme and mode, and remembers the choice', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Theme' }));
    fireEvent.click(screen.getByRole('radio', { name: /Blue/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));

    expect(rootVar('--color-primary-600')).toBe(colors.blue['600']);
    expect(rootVar('--color-gray-950')).toBe(colors.white);
    expect(document.documentElement.dataset.mode).toBe('light');
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY)!)).toEqual({ themeId: 'blue', mode: 'light' });
  });

  it('closes on Escape', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Theme' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
