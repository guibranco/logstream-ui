import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { RetentionPolicy, LogLevel } from '../../types';
import { useCreatePolicy, useUpdatePolicy } from '../../hooks/useRetentionPolicies';
import { format, subDays } from 'date-fns';
import { cn } from '../../lib/utils';

interface PolicyFormProps {
  policy: RetentionPolicy | null;
  onClose: () => void;
}

export function PolicyForm({ policy, onClose }: PolicyFormProps) {
  const isEditing = !!policy;
  const createMutation = useCreatePolicy();
  const updateMutation = useUpdatePolicy();

  const [formData, setFormData] = useState<Partial<RetentionPolicy>>({
    name: '',
    older_than_days: 7,
    level: undefined,
    app_key: '',
    app_id: '',
    category: '',
    message_regex: '',
    message_glob: ''
  });

  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (policy) {
      setFormData(policy);
    }
  }, [policy]);

  const cutoffDate = useMemo(() => {
    const days = Number(formData.older_than_days) || 0;
    if (days < 1) return null;
    return subDays(new Date(), days);
  }, [formData.older_than_days]);

  const summary = useMemo(() => {
    const parts = ['Delete'];
    const levelText = formData.level ? ` ${formData.level}` : '';
    const appText = formData.app_key ? ` from ${formData.app_key}` : '';
    const envText = formData.app_id ? ` (env: ${formData.app_id})` : '';
    
    parts.push(`${levelText} entries`.trim());
    if (appText) parts.push(appText);
    if (envText) parts.push(envText);
    parts.push(`older than ${formData.older_than_days} days`);
    
    if (formData.category) parts.push(`matching category "${formData.category}"`);
    if (formData.message_regex) parts.push('matching regex');
    if (formData.message_glob) parts.push(`matching glob "${formData.message_glob}"`);

    return parts.join(' ');
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = formData.name?.trim() || '';
    if (!name && !isEditing) {
      setError('Name is required');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(name) && !isEditing) {
      setError('Name must be lowercase alphanumeric with hyphens');
      return;
    }
    if (Number(formData.older_than_days) < 1) {
      setError('Older than must be at least 1 day');
      return;
    }

    const payload = {
      ...formData,
      older_than_days: Number(formData.older_than_days)
    };

    if (isEditing && policy) {
      updateMutation.mutate(
        { name: policy.name, policy: payload },
        {
          onSuccess: onClose,
          onError: (err) => setError(err.message)
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: onClose,
        onError: (err) => setError(err.message)
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-gray-950 border-l border-gray-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {isEditing ? 'Edit Policy' : 'New Policy'}
            </h2>
            {isEditing && (
              <p className="text-xs font-mono text-blue-400 mt-0.5">{policy.name}</p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white hover:bg-gray-900 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="policy-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. remove-old-debug"
                  disabled={isEditing}
                  className={cn(
                    "w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all",
                    isEditing && "opacity-50 cursor-not-allowed"
                  )}
                />
                {!isEditing && (
                  <p className="text-[10px] text-gray-500 italic">Lowercase letters, numbers, and hyphens only.</p>
                )}
              </div>

              {/* Older Than */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Older than (days)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={formData.older_than_days}
                    onChange={(e) => setFormData({ ...formData, older_than_days: Number(e.target.value) })}
                    className="w-24 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  {cutoffDate && (
                    <span className="text-xs text-blue-400 font-medium bg-blue-400/10 px-2 py-1 rounded">
                      Entries before: {format(cutoffDate, 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>

              <div className="h-px bg-gray-900 my-2" />

              {/* Optional Filters */}
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Optional Filters</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Level</label>
                  <select
                    value={formData.level || ''}
                    onChange={(e) => setFormData({ ...formData, level: (e.target.value || undefined) as LogLevel })}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                  >
                    <option value="">(any)</option>
                    <option value="debug">debug</option>
                    <option value="info">info</option>
                    <option value="notice">notice</option>
                    <option value="warning">warning</option>
                    <option value="error">error</option>
                    <option value="critical">critical</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">App Key</label>
                  <input
                    type="text"
                    value={formData.app_key || ''}
                    onChange={(e) => setFormData({ ...formData, app_key: e.target.value })}
                    placeholder="e.g. billing-api"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">App ID (Env)</label>
                  <input
                    type="text"
                    value={formData.app_id || ''}
                    onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
                    placeholder="e.g. production"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Category</label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. auth"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Message Regex</label>
                <textarea
                  value={formData.message_regex || ''}
                  onChange={(e) => setFormData({ ...formData, message_regex: e.target.value })}
                  placeholder="e.g. .*@hotmail\.com"
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Message Glob</label>
                <input
                  type="text"
                  value={formData.message_glob || ''}
                  onChange={(e) => setFormData({ ...formData, message_glob: e.target.value })}
                  placeholder="e.g. *@gmail.com"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>
            </div>
          </form>

          {/* Summary */}
          <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900/50">
            <button
              onClick={() => setIsSummaryOpen(!isSummaryOpen)}
              className="w-full h-10 px-3 flex items-center justify-between hover:bg-gray-800 transition-colors"
            >
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Policy Summary</span>
              {isSummaryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isSummaryOpen && (
              <div className="p-3 bg-gray-950 border-t border-gray-800">
                <p className="text-sm text-gray-300 leading-relaxed italic">
                  "{summary}"
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="px-6 py-4 border-t border-gray-800 bg-gray-900/30 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              form="policy-form"
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-all active:scale-95"
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {isEditing ? 'Save Changes' : 'Create Policy'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
