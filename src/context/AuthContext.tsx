import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { LogServiceConfig, getConfig, saveConfig, clearConfig, isConfigComplete } from '../store/configStore';

interface AuthContextValue {
  config: LogServiceConfig | null;
  openSettings: () => void;
  signOut: () => void;
  isConfigured: boolean;
  isSettingsOpen: boolean;
  closeSettings: () => void;
  updateConfig: (newConfig: LogServiceConfig) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<LogServiceConfig | null>(getConfig());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isConfigured = isConfigComplete(config);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const signOut = useCallback(() => {
    if (window.confirm('This will erase your saved connection settings. Continue?')) {
      clearConfig();
      setConfig(null);
      setIsSettingsOpen(true);
    }
  }, []);

  const updateConfig = useCallback((newConfig: LogServiceConfig) => {
    saveConfig(newConfig);
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
        updateConfig
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
