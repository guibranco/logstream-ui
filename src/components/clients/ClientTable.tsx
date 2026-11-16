import React, { useMemo } from 'react';
import { Pencil, RefreshCw, Trash2, ShieldCheck, Info } from 'lucide-react';
import { Client } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { useNow } from '../../hooks/useNow';
import {
  displayStatus,
  formatAbsolute,
  formatLastSeen,
  hasHealth,
  sortByUrgency,
  statusTooltip,
} from '../../lib/clientHealth';
import { ClientStatusPill } from './ClientStatusPill';

interface ClientTableProps {
  clients: Client[];
  isLoading: boolean;
  onEdit: (client: Client) => void;
  onRotate: (client: Client) => void;
  onDelete: (client: Client) => void;
  rotatedAppKeys: Set<string>;
}

export const ClientTable: React.FC<ClientTableProps> = ({
  clients,
  isLoading,
  onEdit,
  onRotate,
  onDelete,
  rotatedAppKeys
}) => {
  // Re-render every minute so relative times and Silent pills stay current between refetches.
  const now = useNow(60_000);
  const sorted = useMemo(() => sortByUrgency(clients, now), [clients, now]);

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 border-b border-gray-800 last:border-0 flex items-center px-6 gap-4">
            <div className="w-1/4 h-4 bg-gray-800 rounded" />
            <div className="w-1/4 h-4 bg-gray-800 rounded" />
            <div className="w-1/6 h-6 bg-gray-800 rounded-full" />
            <div className="w-1/6 h-4 bg-gray-800 rounded" />
            <div className="ml-auto w-24 h-8 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
          <ShieldCheck size={32} />
        </div>
        <h3 className="text-gray-200 font-medium text-lg">No applications registered</h3>
        <p className="text-gray-500 max-w-sm mx-auto mt-2">
          Register your first application to start receiving logs with secure authentication.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-800/50 border-b border-gray-800">
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">App Key</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last seen</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((client) => {
              const wasRotated = rotatedAppKeys.has(client.app_key);
              return (
                <tr key={client.app_key} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <button
                        onClick={() => onEdit(client)}
                        className="text-gray-100 font-semibold hover:text-primary-400 text-left transition-colors"
                      >
                        {client.name}
                      </button>
                      {wasRotated && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-medium mt-1">
                          <Info size={10} />
                          Token rotated — update your app
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-gray-400 text-xs bg-gray-950 px-2 py-1 rounded border border-gray-800 font-mono">
                      {client.app_key}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <ClientStatusPill
                      status={displayStatus(client, now)}
                      title={statusTooltip(client, now)}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {hasHealth(client) ? (
                      <span title={formatAbsolute(client) ?? 'No logs received yet'}>
                        {formatLastSeen(client, now)}
                      </span>
                    ) : (
                      <span title="This server does not report last-seen times">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(client)}
                        className="p-2 text-gray-500 hover:text-gray-50 hover:bg-gray-800 rounded-lg transition-all"
                        title="Edit application"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onRotate(client)}
                        className="p-2 text-gray-500 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-all"
                        title="Rotate API token"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(client)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all"
                        title="Delete application"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
