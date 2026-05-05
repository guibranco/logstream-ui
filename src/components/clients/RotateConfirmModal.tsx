import React from 'react';
import { RefreshCw, AlertTriangle, Loader2, X } from 'lucide-react';
import { useRotateToken } from '../../hooks/useClients';
import { Client } from '../../types';
import { motion } from 'motion/react';

interface RotateConfirmModalProps {
  client: Client;
  onClose: () => void;
  onSuccess: (updatedClient: Client) => void;
}

export const RotateConfirmModal: React.FC<RotateConfirmModalProps> = ({ client, onClose, onSuccess }) => {
  const rotationMutation = useRotateToken();
  const isLoading = rotationMutation.isPending;

  const handleRotate = () => {
    rotationMutation.mutate(client.app_key, {
      onSuccess: (data) => onSuccess(data),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-500">
            <RefreshCw size={20} />
            <h3 className="text-lg font-bold">Rotate Token</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-amber-900/20 border border-amber-900/50 rounded-lg p-4 mb-6 flex gap-3">
            <AlertTriangle size={24} className="text-amber-500 shrink-0" />
            <div className="text-sm text-amber-200 leading-relaxed">
              Rotate token for <span className="font-bold text-white">"{client.app_key}"</span>?
              <p className="mt-2">
                This will immediately <span className="font-bold text-white underline decoration-amber-500/50">invalidate</span> the current token.
                Any applications using it will stop sending logs until they are updated with the new token.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              disabled={isLoading}
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-800 text-gray-400 rounded-lg font-medium hover:bg-gray-800 hover:text-white transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={isLoading}
              onClick={handleRotate}
              className="flex-[1.5] px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Rotate token
            </button>
          </div>

          {rotationMutation.error && (
            <p className="text-red-400 text-sm mt-4 text-center">
              {(rotationMutation.error as Error).message}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
