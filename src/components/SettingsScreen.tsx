import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Settings, Globe, Zap, Trash2 } from 'lucide-react';
import { LogStreamConfig } from '../store/configStore';
import { useAuth } from '../context/AuthContext';

export function SettingsScreen() {
  const { config, updateConfig, signOut, isConfigured, closeSettings } = useAuth();
  
  const [apiUrl, setApiUrl] = useState(config?.apiUrl || '');
  const [wsUrl, setWsUrl] = useState(config?.wsUrl || '');
  const [uiSecret, setUiSecret] = useState(config?.uiSecret || '');
  const [showSecret, setShowSecret] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getInitialOverrideState = (val: boolean | undefined): 'default' | 'enabled' | 'disabled' => {
    if (val === true) return 'enabled';
    if (val === false) return 'disabled';
    return 'default';
  };

  const [clientMgmtOverride, setClientMgmtOverride] = useState<'default' | 'enabled' | 'disabled'>(
    getInitialOverrideState(config?.featureOverrides?.client_management)
  );
  const [retentionOverride, setRetentionOverride] = useState<'default' | 'enabled' | 'disabled'>(
    getInitialOverrideState(config?.featureOverrides?.retention)
  );
  const [websocketOverride, setWebsocketOverride] = useState<'default' | 'enabled' | 'disabled'>(
    getInitialOverrideState(config?.featureOverrides?.websocket)
  );

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
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const trimmedApiUrl = apiUrl.trim().replace(/\/+$/, '');
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

    const featureOverrides: Record<string, boolean> = {};
    if (clientMgmtOverride === 'enabled') featureOverrides.client_management = true;
    if (clientMgmtOverride === 'disabled') featureOverrides.client_management = false;
    
    if (retentionOverride === 'enabled') featureOverrides.retention = true;
    if (retentionOverride === 'disabled') featureOverrides.retention = false;

    if (websocketOverride === 'enabled') featureOverrides.websocket = true;
    if (websocketOverride === 'disabled') featureOverrides.websocket = false;

    updateConfig({
      apiUrl: trimmedApiUrl,
      wsUrl: trimmedWsUrl,
      uiSecret: trimmedUiSecret,
      featureOverrides
    });
  };

  const renderSegmentedControl = (
    label: string,
    value: 'default' | 'enabled' | 'disabled',
    onChange: (val: 'default' | 'enabled' | 'disabled') => void
  ) => {
    return (
      <div className="flex flex-col gap-1.5" id={`override-control-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
        <span className="text-xs text-gray-300 font-medium">{label}</span>
        <div className="grid grid-cols-3 bg-gray-950 border border-gray-850 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onChange('default')}
            className={`py-1 text-[11px] font-medium rounded-lg transition-all ${
              value === 'default'
                ? 'bg-gray-800 text-white shadow-sm font-bold'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Default
          </button>
          <button
            type="button"
            onClick={() => onChange('enabled')}
            className={`py-1 text-[11px] font-medium rounded-lg transition-all ${
              value === 'enabled'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-sm font-bold animate-pulse'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Force En
          </button>
          <button
            type="button"
            onClick={() => onChange('disabled')}
            className={`py-1 text-[11px] font-medium rounded-lg transition-all ${
              value === 'disabled'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-sm font-bold'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Force Dis
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-y-auto max-h-[95vh]">
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Settings className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight animate-in fade-in">
                LogStream Settings
              </h1>
            </div>
            {isConfigured && (
              <button
                type="button"
                onClick={closeSettings}
                className="px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-all"
                title="Close settings"
              >
                Close
              </button>
            )}
          </div>
          <p className="text-gray-400 text-sm mb-6">
            These settings are stored in your browser only.
          </p>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left Column: Connection Setup */}
              <div className="space-y-5 bg-gray-950/20 p-5 rounded-2xl border border-gray-800/40">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-800/60">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                    Connection Config
                  </h2>
                </div>

                {/* API URL */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    API Base URL
                  </label>
                  <input
                    type="url"
                    value={apiUrl}
                    onChange={handleApiUrlChange}
                    placeholder="https://logs.yourdomain.com"
                    className={`w-full bg-gray-800 border ${errors.apiUrl ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                  />
                  <p className="text-[11px] text-gray-500 leading-normal">The HTTP server address (no trailing slash)</p>
                  {errors.apiUrl && <p className="text-xs text-red-400 mt-1">{errors.apiUrl}</p>}
                </div>

                {/* WebSocket URL */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    WebSocket URL
                  </label>
                  <input
                    type="url"
                    value={wsUrl}
                    onChange={(e) => setWsUrl(e.target.value)}
                    placeholder="wss://logs.yourdomain.com/ws"
                    className={`w-full bg-gray-800 border ${errors.wsUrl ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                  />
                  {suggestedWsUrl && suggestedWsUrl !== wsUrl && (
                    <button
                      type="button"
                      onClick={() => setWsUrl(suggestedWsUrl)}
                      className="mt-1 flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 transition-colors bg-blue-400/10 px-2 py-0.5 rounded"
                    >
                      Use {suggestedWsUrl} ↗
                    </button>
                  )}
                  <p className="text-[11px] text-gray-500 leading-normal">Must start with ws:// or wss://</p>
                  {errors.wsUrl && <p className="text-xs text-red-400 mt-1">{errors.wsUrl}</p>}
                </div>

                {/* UI Secret */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    UI Secret (read key)
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={uiSecret}
                      onChange={(e) => setUiSecret(e.target.value)}
                      placeholder="Paste your UI_SECRET here"
                      className={`w-full bg-gray-800 border ${errors.uiSecret ? 'border-red-500' : 'border-gray-700'} rounded-xl pl-4 pr-12 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Required to view & search logs. Never sent over the API query parameters.</p>
                  {errors.uiSecret && <p className="text-xs text-red-400 mt-1">{errors.uiSecret}</p>}
                </div>
              </div>

              {/* Right Column: Feature Flag Overrides */}
              <div className="space-y-5 bg-gray-950/20 p-5 rounded-2xl border border-gray-800/40">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-800/60">
                  <Lock className="w-4 h-4 text-blue-400" />
                  <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                    Overrides (For Testing)
                  </h2>
                </div>

                <div className="space-y-4 bg-gray-950/50 p-4 border border-gray-800/60 rounded-xl">
                  {renderSegmentedControl("Client management feature", clientMgmtOverride, setClientMgmtOverride)}
                  {renderSegmentedControl("Log retention policies feature", retentionOverride, setRetentionOverride)}
                  {renderSegmentedControl("WebSocket connections feature", websocketOverride, setWebsocketOverride)}
                </div>
              </div>
            </div>

            {/* Centered Bottom Actions Row */}
            <div className="pt-6 border-t border-gray-800 flex flex-col items-center justify-center gap-4 max-w-sm mx-auto w-full">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
              >
                Validate and Connect
              </button>

              {isConfigured && (
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors py-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear saved settings and disconnect
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
