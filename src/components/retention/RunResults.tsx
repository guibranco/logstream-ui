import React from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Clock, FileJson, Trash2, AlertCircle } from 'lucide-react';
import { RetentionRunResponse } from '../../types';
import { cn } from '../../lib/utils';

interface RunResultsProps {
  results: RetentionRunResponse;
}

export function RunResults({ results }: RunResultsProps) {
  const policyResults = results.policies ?? results.results ?? [];
  const policiesRunCount = results.policies_run ?? policyResults.length;
  const isDryRun = results.dry_run ?? policyResults.some(r => r.dry_run);
  const totalPrunedCount = results.total_pruned ?? results.total_deleted ?? policyResults.reduce((acc, r) => acc + (r.pruned ?? r.deleted ?? 0), 0);

  return (
    <div id="run-results" className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-sm font-semibold text-green-400">
             Run complete — {policiesRunCount} {policiesRunCount === 1 ? 'policy' : 'policies'}, {totalPrunedCount.toLocaleString()} entries {isDryRun ? 'would be deleted' : 'deleted'}
          </span>
        </div>
        {isDryRun && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-400/20 px-2 py-0.5 rounded">
            Dry run results
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {policyResults.map((result, idx) => {
          const prunedCount = result.pruned ?? result.deleted ?? 0;
          const warningsArray = result.warnings ?? [];
          return (
            <div 
              key={`${result.policy}-${idx}`}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm hover:border-gray-700 transition-colors"
            >
              <div className="px-4 py-3 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-gray-200">{result.policy}</span>
                {prunedCount === 0 ? (
                  <span className="text-[10px] text-gray-500 font-medium bg-gray-800 px-1.5 py-0.5 rounded">Clean</span>
                ) : (
                  <span className="text-[10px] text-blue-400 font-bold bg-blue-400/10 px-1.5 py-0.5 rounded uppercase">Active</span>
                )}
              </div>
              
              <div className="p-4 space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                      <Trash2 size={12} />
                      <span className="text-[10px] uppercase tracking-wider font-semibold">Deleted Entries</span>
                    </div>
                    <div className="text-2xl font-bold text-white tabular-nums">
                      {result.dry_run ? '~' : ''}{prunedCount.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-gray-400 justify-end mb-1">
                      <Clock size={12} />
                      <span className="text-[10px] uppercase tracking-wider font-semibold">Duration</span>
                    </div>
                    <div className="text-sm font-medium text-gray-300">
                      {result.duration_ms} ms
                    </div>
                  </div>
                </div>

                {(result.files_removed > 0 || result.files_rewritten > 0) && (
                  <div className="grid grid-cols-2 gap-2 p-2 bg-gray-950 rounded-lg border border-gray-800">
                    <div className="text-center">
                      <div className="text-[10px] font-semibold text-gray-500 mb-0.5 uppercase">Files Removed</div>
                      <div className="text-sm font-bold text-gray-300">{result.files_removed}</div>
                    </div>
                    <div className="text-center border-l border-gray-800">
                      <div className="text-[10px] font-semibold text-gray-500 mb-0.5 uppercase">Files Rewritten</div>
                      <div className="text-sm font-bold text-gray-300">{result.files_rewritten}</div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs text-gray-400 leading-relaxed italic">
                    {result.summary}
                  </p>
                  
                  {warningsArray.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {warningsArray.map((warning, wIdx) => (
                        <div key={wIdx} className="flex items-start gap-1.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-400 leading-tight">
                          <AlertCircle size={10} className="mt-0.5 shrink-0" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
