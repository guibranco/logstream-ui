import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { useDeleteClient } from '../../hooks/useClients';
import { useLogs } from '../../hooks/useLogs';
import { Client } from '../../types';
import { motion } from 'motion/react';

interface DeleteConfirmModalProps {
  client: Client;
  onClose: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ client, onClose }) => {
  const deleteMutation = useDeleteClient();
  const isLoading = deleteMutation.isPending;
  const [isDeleted, setIsDeleted] = useState(false);
  const [deletedInfo, setDeletedInfo] = useState<{ deleted: string; logs_deleted: number } | null>(null);

  // Fetch log count for context
  const { data: logsData, isLoading: isLoadingLogs } = useLogs({ app_key: client.app_key }, 0, 0);
  const logCount = logsData?.total ?? 0;

  const handleDelete = () => {
    deleteMutation.mutate(client.app_key, {
      onSuccess: (data) => {
        setDeletedInfo(data);
        setIsDeleted(true);
        // We'll close after a short delay to show the "Success" state if we wanted, 
        // but the prompt says "Show a brief toast/banner". 
        // Since I don't have a toast system, I'll show it in the modal or alert.
        setTimeout(() => onClose(), 3000);
      },
    });
  };

  if (isDeleted && deletedInfo) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gray-900 border border-green-900/50 rounded-xl max-w-md w-full shadow-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
            <Trash2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-100 mb-2">Application Deleted</h3>
          <p className="text-gray-400">
            <span className="text-white font-semibold">{deletedInfo.deleted}</span> and 
            <span className="text-white font-semibold"> {deletedInfo.logs_deleted.toLocaleString()}</span> log entries deleted.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-500">
            <Trash2 size={20} />
            <h3 className="text-lg font-bold">Delete Application</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 mb-6 flex gap-3">
            <AlertTriangle size={24} className="text-red-500 shrink-0" />
            <div className="text-sm text-red-200 leading-relaxed">
              Delete <span className="font-bold text-white">"{client.app_key}"</span>?
              <p className="mt-2 font-medium text-red-300">
                This will permanently delete the application and ALL log entries sent by it. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-gray-950 rounded-lg border border-gray-800 mb-8">
            <span className="text-sm text-gray-400">Logs that will be deleted:</span>
            <span className="text-sm font-mono font-bold text-gray-200">
              {isLoadingLogs ? '...' : logCount.toLocaleString()}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              disabled={isLoading}
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-800 text-gray-400 rounded-lg font-medium hover:bg-gray-800 hover:text-white transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={isLoading}
              onClick={handleDelete}
              className="flex-[1.5] px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              Delete permanently
            </button>
          </div>

          {deleteMutation.error && (
            <p className="text-red-400 text-sm mt-4 text-center">
              {(deleteMutation.error as Error).message}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
