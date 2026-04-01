export interface LogStreamConfig {
  apiUrl: string;
  wsUrl: string;
  uiSecret: string;
}

const STORAGE_KEY = 'logservice:config';

export function getConfig(): LogStreamConfig | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to parse config', e);
    return null;
  }
}

export function saveConfig(config: LogStreamConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isConfigComplete(config: LogStreamConfig | null): boolean {
  if (!config) return false;
  return (
    typeof config.apiUrl === 'string' && config.apiUrl.trim().length > 0 &&
    typeof config.wsUrl === 'string' && config.wsUrl.trim().length > 0 &&
    typeof config.uiSecret === 'string' && config.uiSecret.trim().length > 0
  );
}
