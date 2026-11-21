import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { RetentionPolicy, LogLevel, Transport, TRANSPORTS } from '../../types';
import { useCreatePolicy, useUpdatePolicy } from '../../hooks/useRetentionPolicies';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { AppKeyPicker, AppKeyOption } from '../search/AppKeyPicker';
import {
  AgeUnit,
  CUSTOM_AGE_KEY,
  RETENTION_AGE_PRESETS,
  RetentionAge,
  ageFields,
  ageOf,
  cutoffFor,
  formatAge,
  presetFor,
} from '../../lib/retentionAge';

interface PolicyFormProps {
  policy: RetentionPolicy | null;
  /** Registered applications (or app keys seen so far) to pick the app key from. */
  appKeyOptions?: AppKeyOption[];
  /**
   * The server accepts a transport criterion (features.transport_filters).
   * Older servers ignore it, which would widen the policy to every transport,
   * so it is only offered when supported.
   */
  transportFilters?: boolean;
  /**
   * The server accepts older_than_hours (features.retention_hours). Older
   * servers ignore it, which would leave the policy with no age at all, so
   * hour ages are only offered when supported.
   */
  retentionHours?: boolean;
  onClose: () => void;
}

const DEFAULT_AGE: RetentionAge = { value: 7, unit: 'days' };

const TRANSPORT_LABELS: Record<Transport, string> = { tcp: 'TCP (HTTP)', udp: 'UDP' };

export function PolicyForm({ policy, appKeyOptions = [], transportFilters = false, retentionHours = false, onClose }: Readonly<PolicyFormProps>) {
  const isEditing = !!policy;
  const createMutation = useCreatePolicy();
  const updateMutation = useUpdatePolicy();

  const [formData, setFormData] = useState<Partial<RetentionPolicy>>({
    name: '',
    level: undefined,
    app_key: '',
    app_id: '',
    category: '',
    transport: undefined,
    message_regex: '',
    message_glob: ''
  });

  const initialAge = (policy && ageOf(policy)) || DEFAULT_AGE;
  const [age, setAge] = useState<RetentionAge>(initialAge);
  // A preset key, or "custom" for any other number of hours/days.
  const [ageChoice, setAgeChoice] = useState<string>(presetFor(initialAge)?.key ?? CUSTOM_AGE_KEY);
  // Hours stay visible when editing a policy that already uses them.
  const hoursAvailable = retentionHours || initialAge.unit === 'hours';
  const agePresets = RETENTION_AGE_PRESETS.filter((p) => hoursAvailable || p.unit === 'days');

  const handleAgeChoice = (key: string) => {
    setAgeChoice(key);
    const picked = RETENTION_AGE_PRESETS.find((p) => p.key === key);
    if (picked) setAge({ value: picked.value, unit: picked.unit });
  };

  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (policy) {
      setFormData(policy);
      const policyAge = ageOf(policy) || DEFAULT_AGE;
      setAge(policyAge);
      setAgeChoice(presetFor(policyAge)?.key ?? CUSTOM_AGE_KEY);
    }
  }, [policy]);

  const ageValid = Number.isInteger(age.value) && age.value >= 1;

  const cutoffLabel = useMemo(() => {
    if (!ageValid) return null;
    const cutoff = cutoffFor(age);
    return format(cutoff, age.unit === 'hours' ? 'MMM d, HH:mm' : 'MMM d, yyyy');
  }, [age, ageValid]);

  const summary = useMemo(() => {
    const parts = ['Delete'];
    const levelText = formData.level ? ` ${formData.level}` : '';
    const transportText = formData.transport ? ` received over ${formData.transport.toUpperCase()}` : '';
    const appText = formData.app_key ? ` from ${formData.app_key}` : '';
    const appIdText = formData.app_id ? `with app ID ${formData.app_id}` : '';
    
    parts.push(`${levelText} entries${transportText}`.trim());
    if (appText) parts.push(appText);
    if (appIdText) parts.push(appIdText);
    parts.push(`older than ${ageValid ? formatAge(age) : '…'}`);
    
    if (formData.category) parts.push(`matching category "${formData.category}"`);
    if (formData.message_regex) parts.push('matching regex');
    if (formData.message_glob) parts.push(`matching glob "${formData.message_glob}"`);

    return parts.join(' ');
  }, [formData, age, ageValid]);

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
    if (!ageValid) {
      setError(`Older than must be a whole number of ${age.unit}, at least 1`);
      return;
    }

    const { cutoff_date: _cutoff, ...fields } = formData;
    const payload = { ...fields, ...ageFields(age) };

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
            <h2 className="text-xl font-bold text-gray-50">
              {isEditing ? 'Edit Policy' : 'New Policy'}
            </h2>
            {isEditing && (
              <p className="text-xs font-mono text-primary-400 mt-0.5">{policy.name}</p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-50 hover:bg-gray-900 rounded-lg transition-colors"
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
                    "w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all",
                    isEditing && "opacity-50 cursor-not-allowed"
                  )}
                />
                {!isEditing && (
                  <p className="text-[10px] text-gray-500 italic">Lowercase letters, numbers, and hyphens only.</p>
                )}
              </div>

              {/* Older Than: Seq-style presets, or a custom number of hours/days */}
              <div className="space-y-1.5">
                <label htmlFor="policy-age" className="text-sm font-medium text-gray-300">Older than</label>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    id="policy-age"
                    value={ageChoice}
                    onChange={(e) => handleAgeChoice(e.target.value)}
                    className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all appearance-none"
                  >
                    {agePresets.map((p) => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                    <option value={CUSTOM_AGE_KEY}>Custom…</option>
                  </select>
                  {ageChoice === CUSTOM_AGE_KEY && (
                    <>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        aria-label="Custom age"
                        value={Number.isNaN(age.value) ? '' : age.value}
                        onChange={(e) => setAge({ ...age, value: e.target.valueAsNumber })}
                        className="w-20 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                      />
                      <select
                        aria-label="Custom age unit"
                        value={age.unit}
                        onChange={(e) => setAge({ ...age, unit: e.target.value as AgeUnit })}
                        className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all appearance-none"
                      >
                        {hoursAvailable && <option value="hours">hours</option>}
                        <option value="days">days</option>
                      </select>
                    </>
                  )}
                  {cutoffLabel && (
                    <span className="text-xs text-primary-400 font-medium bg-primary-400/10 px-2 py-1 rounded">
                      Entries before: {cutoffLabel}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 italic">
                  {age.unit === 'hours'
                    ? 'Hours are a rolling window, applied on each scheduled run.'
                    : 'Days are counted from midnight.'}
                </p>
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
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all appearance-none"
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
                  {/* One app per policy: the server matches app_key exactly. */}
                  <AppKeyPicker
                    selected={formData.app_key ? [formData.app_key] : []}
                    options={appKeyOptions}
                    multiple={false}
                    onChange={(keys) => setFormData({ ...formData, app_key: keys[0] ?? '' })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">App ID</label>
                  <input
                    type="text"
                    value={formData.app_id || ''}
                    onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
                    placeholder="e.g. api-01"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Category</label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. auth"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  />
                </div>
              </div>

              {(transportFilters || formData.transport) && (
                <div className="space-y-1.5">
                  <label htmlFor="policy-transport" className="text-sm font-medium text-gray-300">Transport</label>
                  <select
                    id="policy-transport"
                    value={formData.transport || ''}
                    onChange={(e) => setFormData({ ...formData, transport: (e.target.value || undefined) as Transport | undefined })}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all appearance-none"
                  >
                    <option value="">(any)</option>
                    {TRANSPORTS.map(t => (
                      <option key={t} value={t}>{TRANSPORT_LABELS[t]}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 italic">
                    Entries without a recorded transport (older entries, the server's own logs) never match.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Message Regex</label>
                <textarea
                  value={formData.message_regex || ''}
                  onChange={(e) => setFormData({ ...formData, message_regex: e.target.value })}
                  placeholder="e.g. .*@hotmail\.com"
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Message Glob</label>
                <input
                  type="text"
                  value={formData.message_glob || ''}
                  onChange={(e) => setFormData({ ...formData, message_glob: e.target.value })}
                  placeholder="e.g. *@gmail.com"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
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
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-50 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              form="policy-form"
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-all active:scale-95"
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
