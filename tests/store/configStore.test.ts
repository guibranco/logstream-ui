import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getConfig, saveConfig, clearConfig, isConfigComplete, LogStreamConfig } from '@/src/store/configStore';

describe('configStore', () => {
  const STORAGE_KEY = 'logservice:config';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('saveConfig saves and normalizes trailing slashes on apiUrl', () => {
    const config: LogStreamConfig = {
      apiUrl: 'https://logs.straccini.com/',
      wsUrl: 'wss://logs.straccini.com/ws',
      uiSecret: 'super_secret_123'
    };

    saveConfig(config);

    const saved = localStorage.getItem(STORAGE_KEY);
    expect(saved).toBeDefined();
    const parsed = JSON.parse(saved!) as LogStreamConfig;
    expect(parsed.apiUrl).toBe('https://logs.straccini.com');
  });

  it('saveConfig handles multiple trailing slashes', () => {
    const config: LogStreamConfig = {
      apiUrl: 'http://localhost:8081///',
      wsUrl: 'ws://localhost:8081/ws',
      uiSecret: 'secret'
    };

    saveConfig(config);

    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(saved!) as LogStreamConfig;
    expect(parsed.apiUrl).toBe('http://localhost:8081');
  });

  it('getConfig retrieves and normalizes existing trailing slashes in localStorage', () => {
    // Manually set config with a trailing slash to simulate legacy storage pattern
    const legacyConfig = {
      apiUrl: 'https://logs.legacy.com/',
      wsUrl: 'wss://logs.legacy.com/ws',
      uiSecret: 'legacy_secret'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyConfig));

    const retrieved = getConfig();
    expect(retrieved).not.toBeNull();
    expect(retrieved!.apiUrl).toBe('https://logs.legacy.com');
  });

  it('clearConfig removes config from localStorage', () => {
    const config: LogStreamConfig = {
      apiUrl: 'http://localhost',
      wsUrl: 'ws://localhost/ws',
      uiSecret: 'secret'
    };
    saveConfig(config);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    clearConfig();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('isConfigComplete validates completeness of config object', () => {
    expect(isConfigComplete(null)).toBe(false);

    const incomplete1: LogStreamConfig = {
      apiUrl: '',
      wsUrl: 'wss://ok',
      uiSecret: 'ok'
    };
    expect(isConfigComplete(incomplete1)).toBe(false);

    const incomplete2: LogStreamConfig = {
      apiUrl: 'http://ok',
      wsUrl: ' ',
      uiSecret: 'ok'
    };
    expect(isConfigComplete(incomplete2)).toBe(false);

    const complete: LogStreamConfig = {
      apiUrl: 'http://ok',
      wsUrl: 'ws://ok',
      uiSecret: 'secret'
    };
    expect(isConfigComplete(complete)).toBe(true);
  });
});
