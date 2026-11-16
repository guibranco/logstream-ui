import React, { useState, useRef } from 'react';
import { X, Check, AlertCircle, Loader2, Pencil, Sparkles } from 'lucide-react';
import { useCreateClient, useUpdateClient } from '../../hooks/useClients';
import { Client } from '../../types';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { suggestAppKey } from '../../lib/suggestAppKey';
import {
  formatAbsolute,
  formatLastSeen,
  hasHealth,
  MAX_HEARTBEAT_TIMEOUT_MINUTES,
  parseHeartbeatTimeout,
} from '../../lib/clientHealth';
import { useNow } from '../../hooks/useNow';

interface ClientFormProps {
  client: Client | null;
  onClose: () => void;
  onSuccess: (client: Client) => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ client, onClose, onSuccess }) => {
  const isEditing = !!client;
  const [name, setName] = useState(client?.name || '');
  const [customAppKey, setCustomAppKey] = useState(client?.app_key || '');
  // New apps start with the key following the display name; typing in the
  // key field (or pressing "Type my own") switches to a custom key.
  const [useSuggested, setUseSuggested] = useState(!isEditing);
  const appKeyInputRef = useRef<HTMLInputElement>(null);

  const suggestedAppKey = suggestAppKey(name);
  const appKey = isEditing ? client.app_key : useSuggested ? suggestedAppKey : customAppKey;
  const [active, setActive] = useState(client?.active ?? true);
  // Health monitoring: only for servers that report it.
  const showHealth = isEditing && hasHealth(client);
  const [heartbeatTimeout, setHeartbeatTimeout] = useState(
    client?.heartbeat_timeout_min != null ? String(client.heartbeat_timeout_min) : '',
  );
  const parsedTimeout = parseHeartbeatTimeout(heartbeatTimeout);
  const isTimeoutValid = !showHealth || parsedTimeout !== undefined;
  const now = useNow(60_000);
  
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const appKeyRegex = /^[a-z0-9][a-z0-9\-]*$/;
  const isAppKeyValid = appKeyRegex.test(appKey);

  const handleAppKeyChange = (value: string) => {
    setCustomAppKey(value.toLowerCase());
    setUseSuggested(false);
  };

  const handleTypeOwn = () => {
    setCustomAppKey(appKey);
    setUseSuggested(false);
    appKeyInputRef.current?.focus();
  };

  const handleUseSuggested = () => setUseSuggested(true);

  const handleSubmit = async () => {
    if (!name || (!isEditing && !isAppKeyValid) || !isTimeoutValid) return;

    if (isEditing) {
      updateMutation.mutate({
        appKey: client.app_key,
        data: showHealth
          ? { name, active, heartbeat_timeout_min: parsedTimeout ?? null }
          : { name, active },
      }, {
        onSuccess: (data) => onSuccess(data),
      });
    } else {
      createMutation.mutate({ name, app_key: appKey }, {
        onSuccess: (data) => onSuccess(data),
      });
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-gray-900 border-l border-gray-800 z-[70] shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-xl font-bold text-gray-100">
            {isEditing ? 'Edit Application' : 'Register Application'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-50 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-8">
          {/* Display Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Billing service"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all placeholder:text-gray-600"
            />
          </div>

          {/* App Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="client-app-key" className="text-sm font-medium text-gray-400">
                App Key
                {!isEditing && useSuggested && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded bg-primary-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-400">
                    <Sparkles size={10} /> Suggested
                  </span>
                )}
              </label>
              {!isEditing && useSuggested && (
                <button
                  type="button"
                  onClick={handleTypeOwn}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-100 transition-colors"
                >
                  <Pencil size={12} /> Type my own
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="client-app-key"
                ref={appKeyInputRef}
                type="text"
                value={appKey}
                onChange={(e) => handleAppKeyChange(e.target.value)}
                disabled={isEditing}
                placeholder="e.g. billing-api"
                className={cn(
                  "w-full bg-gray-950 border rounded-lg px-4 py-2.5 text-gray-100 font-mono text-sm focus:outline-none transition-all placeholder:text-gray-600",
                  isEditing ? "opacity-50 border-gray-800" : isAppKeyValid ? "border-green-900/50 focus:ring-green-500/20 focus:border-green-500" : "border-red-900/50 focus:ring-red-500/20 focus:border-red-500"
                )}
              />
              {!isEditing && appKey && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isAppKeyValid ? (
                    <Check size={18} className="text-green-500" />
                  ) : (
                    <AlertCircle size={18} className="text-red-500" />
                  )}
                </div>
              )}
            </div>
            {!isEditing && (
              <p className={cn("text-xs", isAppKeyValid ? "text-gray-500" : "text-red-400")}>
                {isAppKeyValid
                  ? useSuggested
                    ? 'Generated from the display name — unique identifier for your application'
                    : 'Unique identifier for your application'
                  : useSuggested && !appKey
                    ? 'Type a display name to get a suggestion, or type your own key'
                    : 'Lowercase letters, numbers, and hyphens only'}
              </p>
            )}

            {!isEditing && !useSuggested && suggestedAppKey && suggestedAppKey !== appKey && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                <p className="min-w-0 truncate text-xs text-gray-500">
                  Suggested: <span className="font-mono text-gray-300">{suggestedAppKey}</span>
                </p>
                <button
                  type="button"
                  onClick={handleUseSuggested}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary-600/20 px-2 py-1 text-xs font-medium text-primary-300 hover:bg-primary-600/30 transition-colors"
                >
                  <Sparkles size={12} /> Use suggested
                </button>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-gray-950 rounded border border-gray-800 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">Header Preview</span>
              <p className="text-xs font-mono text-gray-400">
                X-Api-Key: <span className="text-primary-400">{appKey || 'your-service'}</span>
              </p>
            </div>
          </div>

          {/* Status Toggle (only when editing) */}
          {isEditing && (
            <div className="flex items-center justify-between p-4 bg-gray-950 rounded-lg border border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-200">Active Status</p>
                <p className="text-xs text-gray-500 mt-0.5">Inactive apps will be rejected when sending logs</p>
              </div>
              <button
                onClick={() => setActive(!active)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900",
                  active ? "bg-green-600" : "bg-gray-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    active ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          )}

          {/* Health monitoring (only when editing, on servers that report it) */}
          {showHealth && (
            <section aria-labelledby="client-health-heading" className="space-y-4">
              <div className="flex items-center gap-3">
                <h4 id="client-health-heading" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Health monitoring
                </h4>
                <div className="h-px flex-1 bg-gray-800" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Last seen</span>
                <span
                  className="text-gray-200"
                  title={formatAbsolute(client) ?? 'No logs received yet'}
                  data-testid="client-last-seen"
                >
                  {formatLastSeen(client, now)}
                </span>
              </div>

              <div className="space-y-2">
                <label htmlFor="client-heartbeat-timeout" className="text-sm font-medium text-gray-400">
                  Heartbeat timeout
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="client-heartbeat-timeout"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_HEARTBEAT_TIMEOUT_MINUTES}
                    step={1}
                    value={heartbeatTimeout}
                    onChange={(e) => setHeartbeatTimeout(e.target.value)}
                    placeholder="Off"
                    aria-invalid={!isTimeoutValid}
                    aria-describedby="client-heartbeat-timeout-help"
                    className={cn(
                      "w-28 bg-gray-950 border rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 transition-all placeholder:text-gray-600",
                      isTimeoutValid
                        ? "border-gray-800 focus:ring-primary-500/40 focus:border-primary-500"
                        : "border-red-900/50 focus:ring-red-500/20 focus:border-red-500"
                    )}
                  />
                  <span className="text-sm text-gray-400">minutes</span>
                </div>
                <p
                  id="client-heartbeat-timeout-help"
                  className={cn("text-xs", isTimeoutValid ? "text-gray-500" : "text-red-400")}
                >
                  {isTimeoutValid
                    ? 'Alert if silent longer than this. Leave blank to disable monitoring.'
                    : `Whole minutes from 1 to ${MAX_HEARTBEAT_TIMEOUT_MINUTES}, or blank to disable monitoring.`}
                </p>
              </div>
            </section>
          )}

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{(error as Error).message}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-800 bg-gray-900 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !name || (!isEditing && !isAppKeyValid) || !isTimeoutValid}
            className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-900/20"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            {isEditing ? 'Save Changes' : 'Register App'}
          </button>
        </div>
      </motion.div>
    </>
  );
};
