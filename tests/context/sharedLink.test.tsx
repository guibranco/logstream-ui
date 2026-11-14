import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, resetSharedConnectionForTests, useAuth } from '@/src/context/AuthContext';
import { SettingsScreen, initialConnection } from '@/src/components/SettingsScreen';
import { ThemeProvider } from '@/src/context/ThemeContext';

const STORAGE_KEY = 'logservice:config';

function Harness() {
  const { isSettingsOpen, isConfigured, config } = useAuth();
  if (isSettingsOpen || !isConfigured) return <SettingsScreen />;
  return <div data-testid="connected">{config?.apiUrl}</div>;
}

function renderApp() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <Harness />
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('shared connection link', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSharedConnectionForTests();
    window.history.replaceState(null, '', '/');
  });

  it('pre-fills settings from the link and strips it from the address bar', () => {
    window.history.replaceState(null, '', '/?level=error#server=logs.example.com&secret=lsu_shared');
    renderApp();

    expect(screen.getByTestId('shared-link-notice')).toHaveTextContent('https://logs.example.com');
    expect(screen.getByPlaceholderText('https://logs.yourdomain.com')).toHaveValue('https://logs.example.com');
    expect(screen.getByPlaceholderText('wss://logs.yourdomain.com/ws')).toHaveValue('wss://logs.example.com/ws');
    expect(screen.getByPlaceholderText('Paste your UI_SECRET here')).toHaveValue('lsu_shared');
    expect(window.location.hash).toBe('');
    expect(window.location.search).toBe('?level=error');
    // Nothing is saved until the user confirms.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Validate and Connect' }));
    expect(screen.getByTestId('connected')).toHaveTextContent('https://logs.example.com');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).uiSecret).toBe('lsu_shared');
  });

  it('opens settings over a saved config, and Close keeps the saved one', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      apiUrl: 'https://mine.example.com', wsUrl: 'wss://mine.example.com/ws', uiSecret: 'lsu_mine',
    }));
    window.history.replaceState(null, '', '/#server=other.example.com');
    renderApp();

    // A different server without a secret doesn't inherit the saved secret.
    expect(screen.getByPlaceholderText('Paste your UI_SECRET here')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByTestId('connected')).toHaveTextContent('https://mine.example.com');
  });

  it('skips the settings screen when the link matches the saved settings', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      apiUrl: 'https://mine.example.com', wsUrl: 'wss://mine.example.com/ws', uiSecret: 'lsu_mine',
    }));
    window.history.replaceState(null, '', '/#server=mine.example.com&secret=lsu_mine');
    renderApp();
    expect(screen.getByTestId('connected')).toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });
});

describe('initialConnection', () => {
  const saved = { apiUrl: 'https://a.com', wsUrl: 'wss://a.com/ws', uiSecret: 's' };

  it('keeps the saved secret for the same server', () => {
    expect(initialConnection(saved, { apiUrl: 'https://a.com' })).toEqual(saved);
  });

  it('applies a secret-only link to the saved server', () => {
    expect(initialConnection(saved, { uiSecret: 'new' })).toEqual({ ...saved, uiSecret: 'new' });
  });
});
