// src/pages/Volumes.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dockerApi } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { HardDrive, Plus, Trash2, Loader2 } from 'lucide-react';

const Volumes = () => {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [volumeName, setVolumeName] = useState('');

  const { data: volumes = [], isLoading } = useQuery({
    queryKey: ['volumes'],
    queryFn: () => dockerApi.getVolumes().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: () => dockerApi.createVolume({ name: volumeName || undefined }),
    onSuccess: () => {
      setShowCreate(false);
      setVolumeName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: dockerApi.deleteVolume,
    onSuccess: () => queryClient.invalidateQueries(['volumes']),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-ocean-900'}`}>
            Volumes
          </h1>
          <p className={isDark ? 'text-ocean-300' : 'text-ocean-600'}>
            Persistent storage for your containers
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all hover:scale-105 ${
            isDark
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
          }`}
        >
          <Plus className="w-5 h-5" />
          Create Volume
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-ocean-400' : 'text-ocean-600'}`} />
        </div>
      ) : (
        <div className="grid gap-6">
          {volumes.map(volume => (
            <div
              key={volume.name}
              className={`rounded-2xl border p-6 ${
                isDark
                  ? 'bg-gradient-to-br from-ocean-900/30 to-ocean-950/30 border-ocean-700/30'
                  : 'bg-white border-ocean-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-ocean-800' : 'bg-ocean-100'}`}>
                    <HardDrive className={`w-6 h-6 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-ocean-900'}`}>
                      {volume.name}
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-ocean-400' : 'text-ocean-600'}`}>
                      Driver: {volume.driver} • Mount: {volume.mountpoint}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(volume.name)}
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

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-ocean-900' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-ocean-900'}`}>
              Create Volume
            </h3>
            <input
              type="text"
              placeholder="Volume name (optional)"
              value={volumeName}
              onChange={e => setVolumeName(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border mb-4 ${
                isDark ? 'bg-ocean-800 border-ocean-700' : 'bg-white border-ocean-200'
              }`}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-ocean-800' : 'bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Volumes;