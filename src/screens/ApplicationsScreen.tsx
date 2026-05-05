import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { ClientTable } from '../components/clients/ClientTable';
import { ClientForm } from '../components/clients/ClientForm';
import { TokenRevealModal } from '../components/clients/TokenRevealModal';
import { RotateConfirmModal } from '../components/clients/RotateConfirmModal';
import { DeleteConfirmModal } from '../components/clients/DeleteConfirmModal';
import { Client } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const ApplicationsScreen: React.FC = () => {
  const { data, isLoading, isError, error } = useClients();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [rotatingClient, setRotatingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [revealingToken, setRevealingToken] = useState<{ appKey: string; token: string } | null>(null);
  const [rotatedAppKeys, setRotatedAppKeys] = useState<Set<string>>(new Set());

  const handleCreate = () => {
    setEditingClient(null);
    setIsFormOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingClient(null);
  };

  const handleSuccess = (client: Client) => {
    if (client.api_token) {
      setRevealingToken({ appKey: client.app_key, token: client.api_token });
      if (editingClient) {
        setRotatedAppKeys(prev => new Set(prev).add(client.app_key));
      }
    }
    handleCloseForm();
  };

  return (
    <div className="flex-1 overflow-auto p-6 bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Applications</h2>
            <p className="text-gray-400 mt-1">Manage API keys and access for your services</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            <Plus size={18} />
            Register App
          </button>
        </div>

        {isError && (
          <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium">Error loading applications</p>
              <p className="text-sm opacity-80">{(error as Error).message}</p>
            </div>
          </div>
        )}

        <ClientTable
          clients={data?.clients || []}
          isLoading={isLoading}
          onEdit={handleEdit}
          onRotate={setRotatingClient}
          onDelete={setDeletingClient}
          rotatedAppKeys={rotatedAppKeys}
        />

        <AnimatePresence>
          {isFormOpen && (
            <ClientForm
              client={editingClient}
              onClose={handleCloseForm}
              onSuccess={handleSuccess}
            />
          )}
        </AnimatePresence>

        {revealingToken && (
          <TokenRevealModal
            appKey={revealingToken.appKey}
            token={revealingToken.token}
            onClose={() => setRevealingToken(null)}
          />
        )}

        {rotatingClient && (
          <RotateConfirmModal
            client={rotatingClient}
            onClose={() => setRotatingClient(null)}
            onSuccess={(updatedClient) => {
              setRotatingClient(null);
              if (updatedClient.api_token) {
                setRevealingToken({ appKey: updatedClient.app_key, token: updatedClient.api_token });
                setRotatedAppKeys(prev => new Set(prev).add(updatedClient.app_key));
              }
            }}
          />
        )}

        {deletingClient && (
          <DeleteConfirmModal
            client={deletingClient}
            onClose={() => setDeletingClient(null)}
          />
        )}
      </div>
    </div>
  );
};
