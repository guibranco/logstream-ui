import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useCreateClient, useUpdateClient } from '../../hooks/useClients';
import { Client } from '../../types';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ClientFormProps {
  client: Client | null;
  onClose: () => void;
  onSuccess: (client: Client) => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ client, onClose, onSuccess }) => {
  const isEditing = !!client;
  const [name, setName] = useState(client?.name || '');
  const [appKey, setAppKey] = useState(client?.app_key || '');
  const [active, setActive] = useState(client?.active ?? true);
  
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const appKeyRegex = /^[a-z0-9][a-z0-9\-]*$/;
  const isAppKeyValid = appKeyRegex.test(appKey);

  const handleSubmit = async () => {
    if (!name || (!isEditing && !isAppKeyValid)) return;

    if (isEditing) {
      updateMutation.mutate({
        appKey: client.app_key,
        data: { name, active },
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
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
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
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all placeholder:text-gray-600"
            />
          </div>

          {/* App Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">App Key</label>
            <div className="relative">
              <input
                type="text"
                value={appKey}
                onChange={(e) => setAppKey(e.target.value.toLowerCase())}
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
                {isAppKeyValid ? 'Unique identifier for your application' : 'Lowercase letters, numbers, and hyphens only'}
              </p>
            )}
            
            <div className="mt-4 p-3 bg-gray-950 rounded border border-gray-800 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">Header Preview</span>
              <p className="text-xs font-mono text-gray-400">
                X-Api-Key: <span className="text-blue-400">{appKey || 'your-service'}</span>
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
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900",
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
            disabled={isLoading || !name || (!isEditing && !isAppKeyValid)}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            {isEditing ? 'Save Changes' : 'Register App'}
          </button>
        </div>
      </motion.div>
    </>
  );
};
