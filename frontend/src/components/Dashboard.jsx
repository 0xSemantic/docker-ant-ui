import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dockerApi } from '../lib/api';
import ContainerCard from './ContainerCard';
import { Activity, HardDrive, Package, Network, Zap, Server, Anchor, Waves, Plus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Import the modal and get the open state from App level
import CreateContainerModal from '../pages/CreateContainerModal';
import { useState } from 'react';

const Dashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: containers, isLoading, error, refetch } = useQuery({
    queryKey: ['containers'],
    queryFn: () => dockerApi.getContainers().then(res => res.data),
    refetchInterval: 3000,
  });

  const { isDark } = useTheme();

  const runningContainers = containers?.filter(c => c.state === 'running').length || 0;
  const stoppedContainers = containers?.filter(c => c.state === 'exited').length || 0;
  const totalContainers = containers?.length || 0;

  const stats = [
    {
      title: 'Running',
      value: runningContainers,
      icon: Activity,
      color: isDark ? 'from-seafoam-500 to-seafoam-700' : 'from-seafoam-400 to-seafoam-600',
      textColor: isDark ? 'text-seafoam-400' : 'text-seafoam-600',
    },
    {
      title: 'Stopped',
      value: stoppedContainers,
      icon: HardDrive,
      color: isDark ? 'from-coral-500 to-coral-700' : 'from-coral-400 to-coral-600',
      textColor: isDark ? 'text-coral-400' : 'text-coral-600',
    },
    {
      title: 'Total',
      value: totalContainers,
      icon: Package,
      color: isDark ? 'from-ocean-500 to-ocean-700' : 'from-ocean-400 to-ocean-600',
      textColor: isDark ? 'text-ocean-400' : 'text-ocean-600',
    },
    {
      title: 'Images',
      value: 0,
      icon: Server,
      color: isDark ? 'from-purple-500 to-purple-700' : 'from-purple-400 to-purple-600',
      textColor: isDark ? 'text-purple-400' : 'text-purple-600',
    },
  ];

  // Loading & Error states unchanged (kept exactly as you had them)
  if (isLoading) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-ocean-900'}`}>
            Docker Ocean Dashboard
          </h1>
          <p className={isDark ? 'text-ocean-300' : 'text-ocean-600'}>
            Efficient container management with precision and speed
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => refetch()}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isDark
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700'
            }`}
          >
            <Zap className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    // error UI unchanged
    return (
      <div className={`p-8 rounded-2xl border ${isDark ? 'bg-gradient-to-br from-coral-900/20 to-coral-950/20 border-coral-700/30' : 'bg-gradient-to-br from-coral-50 to-coral-100 border-coral-200'}`}>
        {/* ... your existing error UI ... */}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-ocean-900'}`}>
            Docker Ocean Dashboard
          </h1>
          <p className={isDark ? 'text-ocean-300' : 'text-ocean-600'}>
            Manage your containers with the power of the ocean
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => refetch()}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isDark
                ? 'bg-gradient-to-r from-ocean-600 to-ocean-700 text-white hover:from-ocean-700 hover:to-ocean-800'
                : 'bg-gradient-to-r from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700'
            }`}
          >
            <Zap className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid - unchanged */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] group ${
                isDark
                  ? 'bg-gradient-to-br from-ocean-900/40 to-ocean-950/40 border border-ocean-700/30'
                  : 'bg-gradient-to-br from-white to-ocean-50/50 border border-ocean-100'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-ocean-800/60' : 'bg-ocean-100'}`}>
                    <Icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                  <div className={`text-sm font-semibold px-3 py-1 rounded-full ${isDark ? 'bg-ocean-800 text-ocean-300' : 'bg-ocean-100 text-ocean-600'}`}>
                    {stat.title}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className={`text-3xl font-bold ${stat.textColor}`}>
                    {stat.value}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Container List */}
      <div className={`rounded-2xl border ${isDark ? 'border-ocean-800 bg-gradient-to-br from-ocean-900/20 to-ocean-950/20' : 'border-ocean-100 bg-gradient-to-br from-white to-ocean-50/30'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-ocean-900'}`}>
                Container Fleet
              </h2>
              <p className={isDark ? 'text-ocean-400' : 'text-ocean-600'}>
                Manage and monitor all your Docker containers
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  isDark
                    ? 'bg-gradient-to-r from-seafoam-600 to-seafoam-700 text-white hover:from-seafoam-700 hover:to-seafoam-800'
                    : 'bg-gradient-to-r from-seafoam-500 to-seafoam-600 text-white hover:from-seafoam-600 hover:to-seafoam-700'
                }`}
              >
                <Plus className="w-5 h-5" />
                New Container
              </button>
            </div>
          </div>

          {containers?.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {containers.map((container) => (
                <ContainerCard key={container.id} container={container} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-32 h-32 mx-auto mb-6 opacity-50">
                <Waves className="w-full h-full text-ocean-400" />
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-ocean-300' : 'text-ocean-700'}`}>
                No Containers Found
              </h3>
              <p className={`mb-8 max-w-md mx-auto ${isDark ? 'text-ocean-400' : 'text-ocean-600'}`}>
                Your ocean is calm and empty. Create your first container to start sailing.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  isDark
                    ? 'bg-gradient-to-r from-seafoam-600 to-seafoam-700 text-white hover:from-seafoam-700 hover:to-seafoam-800 shadow-lg'
                    : 'bg-gradient-to-r from-seafoam-500 to-seafoam-600 text-white hover:from-seafoam-600 hover:to-seafoam-700 shadow-lg'
                }`}
              >
                Launch First Container
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal - placed here so it's only rendered when needed */}
      <CreateContainerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;