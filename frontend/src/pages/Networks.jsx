// src/pages/Networks.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dockerApi } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { Network, Plus, Trash2, Loader2, Server, Globe, Link2 } from 'lucide-react';

const Networks = () => {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newNetwork, setNewNetwork] = useState({ name: '', driver: 'bridge' });

  const { data: networks = [], isLoading } = useQuery({
    queryKey: ['networks'],
    queryFn: () => dockerApi.getNetworks().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: dockerApi.createNetwork,
    onSuccess: () => {
      setShowCreate(false);
      setNewNetwork({ name: '', driver: 'bridge' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dockerApi.deleteNetwork,
    onSuccess: () => queryClient.invalidateQueries(['networks']),
  });

  const handleCreate = () => {
    if (!newNetwork.name.trim()) return;
    createMutation.mutate(newNetwork);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-ocean-900'}`}>
            Networks
          </h1>
          <p className={isDark ? 'text-ocean-300' : 'text-ocean-600'}>
            Manage Docker networks and container connectivity
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all hover:scale-105 ${
            isDark
              ? 'bg-gradient-to-r from-seafoam-600 to-seafoam-700 text-white'
              : 'bg-gradient-to-r from-seafoam-500 to-seafoam-600 text-white'
          }`}
        >
          <Plus className="w-5 h-5" />
          Create Network
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-ocean-400' : 'text-ocean-600'}`} />
        </div>
      ) : (
        <div className="grid gap-6">
          {networks.map(network => (
            <div
              key={network.id}
              className={`rounded-2xl border p-6 ${
                isDark
                  ? 'bg-gradient-to-br from-ocean-900/30 to-ocean-950/30 border-ocean-700/30'
                  : 'bg-white border-ocean-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-ocean-800' : 'bg-ocean-100'}`}>
                    <Network className={`w-6 h-6 ${isDark ? 'text-seafoam-400' : 'text-seafoam-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-ocean-900'}`}>
                      {network.name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className={isDark ? 'text-ocean-400' : 'text-ocean-600'}>
                        Driver: <span className="font-medium">{network.driver}</span>
                      </span>
                      <span className={isDark ? 'text-ocean-400' : 'text-ocean-600'}>
                        ID: <code className="font-mono">{network.id}</code>
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(network.id)}
                  className={`p-3 rounded-lg transition-colors ${
                    isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-100'
                  }`}
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-ocean-900' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-ocean-900'}`}>
              Create New Network
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Network name (optional)"
                value={newNetwork.name}
                onChange={e => setNewNetwork({ ...newNetwork, name: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border ${
                  isDark ? 'bg-ocean-800 border-ocean-700' : 'bg-white border-ocean-200'
                }`}
              />
              <select
                value={newNetwork.driver}
                onChange={e => setNewNetwork({ ...newNetwork, driver: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border ${
                  isDark ? 'bg-ocean-800 border-ocean-700' : 'bg-white border-ocean-200'
                }`}
              >
                <option value="bridge">bridge</option>
                <option value="host">host</option>
                <option value="none">none</option>
              </select>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-ocean-800' : 'bg-gray-200'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className={`flex-1 py-3 rounded-xl bg-gradient-to-r from-seafoam-600 to-seafoam-700 text-white`}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Networks;