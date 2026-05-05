import React, { useState } from 'react';
import { Plus, Clock, Search, Settings as SettingsIcon, Database } from 'lucide-react';
import { PolicyTable } from '../components/retention/PolicyTable';
import { PolicyForm } from '../components/retention/PolicyForm';
import { RunPanel } from '../components/retention/RunPanel';
import { RunResults } from '../components/retention/RunResults';
import { RetentionPolicy, RetentionRunResponse } from '../types';

export function RetentionScreen() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
  const [lastRunResults, setLastRunResults] = useState<RetentionRunResponse | null>(null);

  const handleEdit = (policy: RetentionPolicy) => {
    setEditingPolicy(policy);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setEditingPolicy(null);
    setIsFormOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-950">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Database className="w-7 h-7 text-blue-500" />
              Retention Management
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Configure and run policies to automatically clean up old log entries.
            </p>
          </div>
          
          <button
            onClick={handleCreateNew}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} />
            New Policy
          </button>
        </div>

        {/* Run Controls */}
        <section className="space-y-4">
          <RunPanel onResults={setLastRunResults} />
          {lastRunResults && <RunResults results={lastRunResults} />}
        </section>

        {/* Policy List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Active Policies</h2>
          </div>
          <PolicyTable onEdit={handleEdit} />
        </section>
      </div>

      {/* Slide-over Form */}
      {isFormOpen && (
        <PolicyForm
          policy={editingPolicy}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
