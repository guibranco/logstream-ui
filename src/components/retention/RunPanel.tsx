import React, { useState } from 'react';
import { Play, ShieldCheck, AlertTriangle } from 'lucide-react';
import { RetentionPolicy, RetentionRunResponse } from '../../types';
import { useRunRetention, useRetentionPolicies } from '../../hooks/useRetentionPolicies';
import { cn } from '../../lib/utils';

interface RunPanelProps {
  onResults: (results: RetentionRunResponse) => void;
}

export function RunPanel({ onResults }: RunPanelProps) {
  const { data: policies } = useRetentionPolicies();
  const runMutation = useRunRetention();
  
  const [dryRun, setDryRun] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<string>('');

  const handleRun = () => {
    runMutation.mutate(
      { 
        dry_run: dryRun, 
        policy: selectedPolicy || undefined 
      },
      {
        onSuccess: (data) => {
          onResults(data);
          // Scroll results into view
          setTimeout(() => {
            const resultsEl = document.getElementById('run-results');
            if (resultsEl) resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    );
  };

  const isPending = runMutation.isPending;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Trigger retention run</h2>
            {dryRun ? (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">
                Simulation mode
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Live run
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <label 
                className="relative inline-flex items-center cursor-pointer"
                title="When ON, no data will be deleted"
              >
                <input 
                  type="checkbox" 
                  checked={dryRun} 
                  onChange={(e) => setDryRun(e.target.checked)}
                  disabled={isPending}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-800 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-800 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                <span className="ms-3 text-sm font-medium text-gray-300">Dry run</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-400 whitespace-nowrap">For:</span>
              <select
                value={selectedPolicy}
                onChange={(e) => setSelectedPolicy(e.target.value)}
                disabled={isPending}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-w-[180px]"
              >
                <option value="">(all policies)</option>
                {policies?.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={cn(
            "p-3 rounded-lg flex items-start gap-2.5 transition-all text-sm",
            dryRun 
              ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" 
              : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
          )}>
            {dryRun ? (
              <>
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                <p>Safe mode: The server will calculate what would be deleted without modifying the filesystem.</p>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p><strong>Warning:</strong> Live run will permanently delete log entries and reclaim disk space.</p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleRun}
            disabled={isPending}
            className={cn(
              "flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg min-w-[200px]",
              dryRun 
                ? "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20" 
                : "bg-red-600 hover:bg-red-500 shadow-red-600/20",
              isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            {isPending ? (
              <>
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                <span>{dryRun ? 'Simulate Deletion' : 'Run Maintenance'}</span>
              </>
            )}
          </button>
          
          {runMutation.isError && (
            <p className="text-center text-xs text-red-400 font-medium">
              {runMutation.error.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
