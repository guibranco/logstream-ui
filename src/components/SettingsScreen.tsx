import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Eye, EyeOff, Settings, Globe, Zap, Trash2 } from 'lucide-react';
import { LogServiceConfig } from '../store/configStore';
import { useAuth } from '../context/AuthContext';

export function SettingsScreen() {
  const { config, updateConfig, signOut, isConfigured } = useAuth();
  
  const [apiUrl, setApiUrl] = useState(config?.apiUrl || '');
  const [wsUrl, setWsUrl] = useState(config?.wsUrl || '');
  const [uiSecret, setUiSecret] = useState(config?.uiSecret || '');
  const [showSecret, setShowSecret] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const deriveWsUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${parsed.host}/ws`;
    } catch (e) {
      return '';
    }
  };

  const suggestedWsUrl = deriveWsUrl(apiUrl);

  const handleApiUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApiUrl(value);
    // Auto-fill behavior: only if WS URL is empty or matches previous derivation
    const currentDerivation = deriveWsUrl(apiUrl);
    if (!wsUrl || wsUrl === currentDerivation) {
      // We don't auto-fill immediately to avoid overwriting user intent, 
      // but we show the chip.
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const trimmedApiUrl = apiUrl.trim();
    const trimmedWsUrl = wsUrl.trim();
    const trimmedUiSecret = uiSecret.trim();

    if (!trimmedApiUrl) newErrors.apiUrl = 'API Base URL is required';
    if (!trimmedWsUrl) newErrors.wsUrl = 'WebSocket URL is required';
    else if (!trimmedWsUrl.startsWith('ws://') && !trimmedWsUrl.startsWith('wss://')) {
      newErrors.wsUrl = 'WebSocket URL must start with ws:// or wss://';
    }
    if (!trimmedUiSecret) newErrors.uiSecret = 'UI Secret is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateConfig({
      apiUrl: trimmedApiUrl,
      wsUrl: trimmedWsUrl,
      uiSecret: trimmedUiSecret
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              LogService Settings
            </h1>
          </div>
          <p className="text-gray-400 text-sm mb-8">
            These settings are stored in your browser only.
          </p>

          <form onSubmit={handleSave} className="space-y-6">
            {/* API URL */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Globe className="w-4 h-4 text-gray-500" />
                API Base URL
              </label>
              <input
                type="url"
                value={apiUrl}
                onChange={handleApiUrlChange}
                placeholder="https://logs.yourdomain.com"
                className={`w-full bg-gray-800 border ${errors.apiUrl ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
              />
              <p className="text-xs text-gray-500">The HTTP server address (no trailing slash)</p>
              {errors.apiUrl && <p className="text-xs text-red-400 mt-1">{errors.apiUrl}</p>}
            </div>

            {/* WebSocket URL */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Zap className="w-4 h-4 text-gray-500" />
                WebSocket URL
              </label>
              <input
                type="url"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                placeholder="wss://logs.yourdomain.com/ws"
                className={`w-full bg-gray-800 border ${errors.wsUrl ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
              />
              {suggestedWsUrl && suggestedWsUrl !== wsUrl && (
                <button
                  type="button"
                  onClick={() => setWsUrl(suggestedWsUrl)}
                  className="mt-1 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors bg-blue-400/10 px-2 py-1 rounded-md"
                >
                  Use {suggestedWsUrl} ↗
                </button>
              )}
              <p className="text-xs text-gray-500">Must start with ws:// or wss://</p>
              {errors.wsUrl && <p className="text-xs text-red-400 mt-1">{errors.wsUrl}</p>}
            </div>

            {/* UI Secret */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Lock className="w-4 h-4 text-gray-500" />
                UI Secret (read key)
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={uiSecret}
                  onChange={(e) => setUiSecret(e.target.value)}
                  placeholder="Paste your UI_SECRET here"
                  className={`w-full bg-gray-800 border ${errors.uiSecret ? 'border-red-500' : 'border-gray-700'} rounded-xl pl-4 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">Required to view and search logs. Never shared with the server over the URL.</p>
              {errors.uiSecret && <p className="text-xs text-red-400 mt-1">{errors.uiSecret}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
            >
              Validate and Connect
            </button>

            {isConfigured && (
              <div className="pt-4 border-t border-gray-800 flex justify-center">
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all saved settings and disconnect
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
