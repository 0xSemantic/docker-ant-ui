import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dockerApi } from '../lib/api';
import ContainerCard from './ContainerCard';
import { Activity, HardDrive, Package, Network, Zap, Server, Anchor, Waves } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Dashboard = () => {
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

  if (isLoading) {
    return (
      // Header
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-ocean-900'}`}>
            Docker Ant Dashboard
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
    return (
      <div className={`p-8 rounded-2xl border ${isDark ? 'bg-gradient-to-br from-coral-900/20 to-coral-950/20 border-coral-700/30' : 'bg-gradient-to-br from-coral-50 to-coral-100 border-coral-200'}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${isDark ? 'bg-coral-900/40' : 'bg-coral-100'}`}>
            <Anchor className={`w-8 h-8 ${isDark ? 'text-coral-400' : 'text-coral-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-coral-300' : 'text-coral-700'}`}>
              Connection to Docker Lost
            </h3>
            <p className={`mb-4 ${isDark ? 'text-coral-400' : 'text-coral-600'}`}>
              Unable to reach the Docker daemon. Please ensure Docker is running and the backend server is started.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => refetch()}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  isDark 
                    ? 'bg-gradient-to-r from-coral-600 to-coral-700 text-white hover:from-coral-700 hover:to-coral-800'
                    : 'bg-gradient-to-r from-coral-500 to-coral-600 text-white hover:from-coral-600 hover:to-coral-700'
                }`}
              >
                Retry Connection
              </button>
              <button 
                onClick={() => window.location.reload()}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  isDark 
                    ? 'bg-ocean-800/40 text-ocean-300 border border-ocean-700 hover:bg-ocean-700/40'
                    : 'bg-ocean-100 text-ocean-600 border border-ocean-200 hover:bg-ocean-200'
                }`}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
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
              {/* Background gradient */}
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
                  <div className={`text-sm ${isDark ? 'text-ocean-400' : 'text-ocean-500'}`}>
                    {stat.title === 'Running' && `${runningContainers} active containers`}
                    {stat.title === 'Stopped' && `${stoppedContainers} inactive containers`}
                    {stat.title === 'Total' && `${totalContainers} total containers`}
                    {stat.title === 'Images' && '0 images available'}
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
              <button className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                isDark
                  ? 'bg-gradient-to-r from-ocean-600 to-ocean-700 text-white hover:from-ocean-700 hover:to-ocean-800'
                  : 'bg-gradient-to-r from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700'
              }`}>
                + New Container
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
              <button className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                isDark
                  ? 'bg-gradient-to-r from-ocean-600 to-ocean-700 text-white hover:from-ocean-700 hover:to-ocean-800 shadow-lg'
                  : 'bg-gradient-to-r from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-lg'
              }`}>
                Launch First Container
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;