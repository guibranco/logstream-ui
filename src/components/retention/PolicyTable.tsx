import React, { useState } from 'react';
import { Pencil, Trash2, Clock, AlertCircle } from 'lucide-react';
import { RetentionPolicy } from '../../types';
import { useRetentionPolicies, useDeletePolicy } from '../../hooks/useRetentionPolicies';
import { format, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';
import { Skeleton } from '../Skeleton';

interface PolicyTableProps {
  onEdit: (policy: RetentionPolicy) => void;
}

export function PolicyTable({ onEdit }: PolicyTableProps) {
  const { data: policies, isLoading, isError, error } = useRetentionPolicies();
  const deleteMutation = useDeletePolicy();
  const [deletingName, setDeletingName] = useState<string | null>(null);

  const getCutoffDateString = (policy: RetentionPolicy) => {
    if (policy.cutoff_date) {
      try {
        return format(parseISO(policy.cutoff_date), 'MMM d, yyyy');
      } catch (e) {
        // ignore and fallback
      }
    }
    if (policy.older_than_days) {
      try {
        const d = new Date();
        d.setDate(d.getDate() - policy.older_than_days);
        return format(d, 'MMM d, yyyy');
      } catch (e) {
        // ignore and fallback
      }
    }
    return 'N/A';
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    const isUnavailable = (error as Error).message === 'SERVICE_UNAVAILABLE';
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-900 border border-gray-800 rounded-xl text-center">
        {isUnavailable ? (
          <>
            <div className="p-4 bg-amber-500/10 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Retention is not enabled</h3>
            <p className="text-gray-400 max-w-md">
              Set <code className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">RETENTION_CONFIG</code> in the server's .env to enable policy management.
            </p>
          </>
        ) : (
          <>
            <div className="p-4 bg-red-500/10 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Could not load policies</h3>
            <p className="text-gray-400">{(error as Error).message}</p>
          </>
        )}
      </div>
    );
  }

  if (!policies || policies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-900 border border-gray-800 rounded-xl text-center">
        <div className="p-4 bg-gray-800 rounded-full mb-4">
          <Clock className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No retention policies</h3>
        <p className="text-gray-400 max-w-md">
          Create your first policy to start managing log lifecycle.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-gray-950 border-b border-gray-800">
            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Older Than</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cutoff Date</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Filters</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {policies.map((policy) => (
            <tr key={policy.name} className="hover:bg-gray-800/50 transition-colors group">
              <td className="px-4 py-4">
                <span className="font-mono text-sm font-bold text-blue-400">{policy.name}</span>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-gray-200">
                  {policy.older_than_days ? `${policy.older_than_days} days` : 'Any age'}
                </span>
              </td>
              <td className="px-4 py-4 text-sm text-gray-400">
                {getCutoffDateString(policy)}
              </td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {policy.level && (
                    <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] text-gray-300 font-medium">
                      level: {policy.level}
                    </span>
                  )}
                  {policy.app_key && (
                    <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] text-gray-300 font-medium">
                      app: {policy.app_key}
                    </span>
                  )}
                  {policy.app_id && (
                    <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] text-gray-300 font-medium">
                      env: {policy.app_id}
                    </span>
                  )}
                  {policy.category && (
                    <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] text-gray-300 font-medium">
                      cat: {policy.category}
                    </span>
                  )}
                  {(policy.message_regex || policy.message_glob) && (
                    <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-[10px] text-gray-300 font-medium">
                      msg filter
                    </span>
                  )}
                  {!policy.level && !policy.app_key && !policy.app_id && !policy.category && !policy.message_regex && !policy.message_glob && (
                    <span className="text-xs text-gray-600">No extra filters</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {deletingName === policy.name ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setDeletingName(null)}
                        className="text-xs text-gray-400 hover:text-white px-2 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(policy.name, { onSuccess: () => setDeletingName(null) })}
                        disabled={deleteMutation.isPending}
                        className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-400/10 px-2 py-1 rounded"
                      >
                        {deleteMutation.isPending ? '...' : 'Delete'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onEdit(policy)}
                        className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors"
                        title="Edit policy"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingName(policy.name)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                        title="Delete policy"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
