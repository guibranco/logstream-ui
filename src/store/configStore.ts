export interface LogStreamConfig {
  apiUrl: string;
  wsUrl: string;
  uiSecret: string;
  featureOverrides?: {
    client_management?: boolean;
    retention?: boolean;
    websocket?: boolean;
  };
}

const STORAGE_KEY = 'logservice:config';

export function getConfig(): LogStreamConfig | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    const config = JSON.parse(saved) as LogStreamConfig;
    if (config && typeof config.apiUrl === 'string') {
      config.apiUrl = config.apiUrl.trim().replace(/\/+$/, '');
    }
    return config;
  } catch (e) {
    console.error('Failed to parse config', e);
    return null;
  }
}

export function saveConfig(config: LogStreamConfig): void {
  if (config && typeof config.apiUrl === 'string') {
    config.apiUrl = config.apiUrl.trim().replace(/\/+$/, '');
  }
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
