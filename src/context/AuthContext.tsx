import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { LogStreamConfig, getConfig, saveConfig, clearConfig, isConfigComplete } from '../store/configStore';
import { SharedConnection, hasConnectionParams, readSharedConnection, urlWithoutConnection } from '../lib/shareLink';

interface AuthContextValue {
  config: LogStreamConfig | null;
  openSettings: () => void;
  signOut: () => void;
  isConfigured: boolean;
  isSettingsOpen: boolean;
  closeSettings: () => void;
  updateConfig: (newConfig: LogStreamConfig) => void;
  /** Connection settings from a shared link, waiting to be reviewed on the settings screen. */
  sharedConnection: SharedConnection | null;
}

/**
 * Connection settings in the page URL, removed from the address bar right away
 * so the secret doesn't stay in history or get copied along with filters.
 */
let taken: { value: SharedConnection | null } | undefined;
export function takeSharedConnection(): SharedConnection | null {
  // Read once per page load: StrictMode runs state initializers twice, and the
  // second run would otherwise see the already-cleaned URL.
  if (taken) return taken.value;
  let value: SharedConnection | null = null;
  if (typeof window !== 'undefined' && hasConnectionParams(window.location)) {
    value = readSharedConnection(window.location);
    window.history.replaceState(window.history.state, '', urlWithoutConnection(window.location));
  }
  taken = { value };
  return value;
}

/** Test hook: forget the cached read so the next call looks at the URL again. */
export function resetSharedConnectionForTests(): void {
  taken = undefined;
}

/** True when the link only repeats what is already saved (nothing to review). */
function matchesSaved(shared: SharedConnection, config: LogStreamConfig | null): boolean {
  if (!config) return false;
  return (
    (shared.apiUrl === undefined || shared.apiUrl === config.apiUrl) &&
    (shared.wsUrl === undefined || shared.wsUrl === config.wsUrl) &&
    (shared.uiSecret === undefined || shared.uiSecret === config.uiSecret)
  );
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<LogStreamConfig | null>(getConfig);
  // A shared link never replaces the saved settings by itself: it opens the
  // settings screen pre-filled, and only "Validate and Connect" saves it.
  const [sharedConnection, setSharedConnection] = useState<SharedConnection | null>(() => {
    const shared = takeSharedConnection();
    return shared && !matchesSaved(shared, getConfig()) ? shared : null;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => sharedConnection !== null);

  const isConfigured = isConfigComplete(config);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSharedConnection(null);
    setIsSettingsOpen(false);
  }, []);

  const signOut = useCallback(() => {
    if (window.confirm('This will erase your saved connection settings. Continue?')) {
      clearConfig();
      setSharedConnection(null);
      setConfig(null);
      setIsSettingsOpen(true);
    }
  }, []);

  const updateConfig = useCallback((newConfig: LogStreamConfig) => {
    saveConfig(newConfig);
    setSharedConnection(null);
    setConfig(newConfig);
    setIsSettingsOpen(false);
  }, []);

  // Show settings on first visit if no config exists
  useEffect(() => {
    if (!isConfigured) {
      setIsSettingsOpen(true);
    }
  }, [isConfigured]);

  return (
    <AuthContext.Provider
      value={{
        config,
        openSettings,
        signOut,
        isConfigured,
        isSettingsOpen,
        closeSettings,
        updateConfig,
        sharedConnection
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
