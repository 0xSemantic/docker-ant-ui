import React, { useState } from 'react';
import { Play, Square, RotateCcw, Trash2, Terminal, Cpu, Clock, Loader2, Check, X, Bug } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dockerApi } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useActivityLog } from '../context/ActivityLogContext';

const ContainerCard = ({ container }) => {
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const { addLog } = useActivityLog();
  
  const [localState, setLocalState] = useState({
    loading: false,
    success: false,
    error: false,
    action: null
  });

  const startMutation = useMutation({
    mutationFn: () => dockerApi.startContainer(container.id),
    onMutate: () => {
      setLocalState({ loading: true, success: false, error: false, action: 'start' });
      addLog({
        id: `log-${Date.now()}`,
        type: 'info',
        message: `Starting container ${container.names[0]?.replace('/', '') || container.id}`,
        container: container.id,
        timestamp: new Date()
      });
      queryClient.setQueryData(['containers'], (old) => {
        return old.map(c => 
          c.id === container.id ? { ...c, state: 'starting' } : c
        );
      });
    },
    onSuccess: () => {
      setLocalState({ loading: false, success: true, error: false, action: 'start' });
      setTimeout(() => setLocalState({ loading: false, success: false, error: false, action: null }), 1500);
      addLog({
        id: `log-${Date.now()}`,
        type: 'success',
        message: `Container ${container.names[0]?.replace('/', '') || container.id} started successfully`,
        container: container.id,
        timestamp: new Date()
      });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
    onError: (error) => {
      setLocalState({ loading: false, success: false, error: true, action: 'start' });
      setTimeout(() => setLocalState({ loading: false, success: false, error: false, action: null }), 2000);
      addLog({
        id: `log-${Date.now()}`,
        type: 'error',
        message: `Failed to start container ${container.names[0]?.replace('/', '') || container.id}: ${error.message}`,
        container: container.id,
        timestamp: new Date()
      });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
  });
  
  const stopMutation = useMutation({
    mutationFn: () => dockerApi.stopContainer(container.id),
    onMutate: () => {
      setLocalState({ loading: true, success: false, error: false, action: 'stop' });
      addLog({
        id: `log-${Date.now()}`,
        type: 'info',
        message: `Stopping container ${container.names[0]?.replace('/', '') || container.id}`,
        container: container.id,
        timestamp: new Date()
      });
      queryClient.setQueryData(['containers'], (old) => {
        return old.map(c => 
          c.id === container.id ? { ...c, state: 'stopping' } : c
        );
      });
    },
    onSuccess: () => {
      setLocalState({ loading: false, success: true, error: false, action: 'stop' });
      setTimeout(() => setLocalState({ loading: false, success: false, error: false, action: null }), 1500);
      addLog({
        id: `log-${Date.now()}`,
        type: 'success',
        message: `Container ${container.names[0]?.replace('/', '') || container.id} stopped successfully`,
        container: container.id,
        timestamp: new Date()
      });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
    onError: (error) => {
      setLocalState({ loading: false, success: false, error: true, action: 'stop' });
      setTimeout(() => setLocalState({ loading: false, success: false, error: false, action: null }), 2000);
      addLog({
        id: `log-${Date.now()}`,
        type: 'error',
        message: `Failed to stop container ${container.names[0]?.replace('/', '') || container.id}: ${error.message}`,
        container: container.id,
        timestamp: new Date()
      });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
  });

  const restartMutation = useMutation({
    mutationFn: () => dockerApi.restartContainer(container.id),
    onMutate: () => {
      setLocalState({ loading: true, success: false, error: false, action: 'restart' });
      addLog({
        id: `log-${Date.now()}`,
        type: 'info',
        message: `Restarting container ${container.names[0]?.replace('/', '') || container.id}`,
        container: container.id,
        timestamp: new Date()
      });
      queryClient.setQueryData(['containers'], (old) => {
        return old.map(c => 
          c.id === container.id ? { ...c, state: 'restarting' } : c
        );
      });
    },
    onSuccess: () => {
      setLocalState({ loading: false, success: true, error: false, action: 'restart' });
      setTimeout(() => setLocalState({ loading: false, success: false, error: false, action: null }), 1500);
      addLog({
        id: `log-${Date.now()}`,
        type: 'success',
        message: `Container ${container.names[0]?.replace('/', '') || container.id} restarted successfully`,
        container: container.id,
        timestamp: new Date()
      });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
    onError: (error) => {
      setLocalState({ loading: false, success: false, error: true, action: 'restart' });
      setTimeout(() => setLocalState({ loading: false, success: false, error: false, action: null }), 2000);
      addLog({
        id: `log-${Date.now()}`,
        type: 'error',
        message: `Failed to restart container ${container.names[0]?.replace('/', '') || container.id}: ${error.message}`,
        container: container.id,
        timestamp: new Date()
      });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => dockerApi.deleteContainer(container.id),
    onMutate: () => {
      setLocalState({ loading: true, success: false, error: false, action: 'delete' });
      addLog({
        id: `log-${Date.now()}`,
        type: 'warning',
        message: `Deleting container ${container.names[0]?.replace('/', '') || container.id}`,
        container: container.id,
        timestamp: new Date()
      });
    },
    onSuccess: () => {
      setLocalState({ loading: false, success: true, error: false, action: 'delete' });
      addLog({
        id: `log-${Date.now()}`,
        type: 'success',
        message: `Container ${container.names[0]?.replace('/', '') || container.id} deleted successfully`,
        container: container.id,
        timestamp: new Date()
      });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    },
    onError: (error) => {
      setLocalState({ loading: false, success: false, error: true, action: 'delete' });
      setTimeout(() => setLocalState({ loading: false, success: false, error: false, action: null }), 2000);
      addLog({
        id: `log-${Date.now()}`,
        type: 'error',
        message: `Failed to delete container ${container.names[0]?.replace('/', '') || container.id}: ${error.message}`,
        container: container.id,
        timestamp: new Date()
      });
    },
  });

  const getStatusColor = (state) => {
    if (state === 'running' || state === 'starting') {
      return isDark 
        ? 'bg-gradient-to-r from-seafoam-500/20 to-seafoam-600/20 border-seafoam-500/30 text-seafoam-400'
        : 'bg-gradient-to-r from-seafoam-200 to-seafoam-300 border-seafoam-400 text-seafoam-800';
    } else if (state === 'exited' || state === 'stopping') {
      return isDark
        ? 'bg-gradient-to-r from-coral-500/20 to-coral-600/20 border-coral-500/30 text-coral-400'
        : 'bg-gradient-to-r from-coral-200 to-coral-300 border-coral-400 text-coral-800';
    } else if (state === 'restarting') {
      return isDark
        ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500/30 text-amber-400'
        : 'bg-gradient-to-r from-amber-200 to-amber-300 border-amber-400 text-amber-800';
    } else {
      return isDark
        ? 'bg-gradient-to-r from-ocean-500/20 to-ocean-600/20 border-ocean-500/30 text-ocean-400'
        : 'bg-gradient-to-r from-ocean-200 to-ocean-300 border-ocean-400 text-ocean-800';
    }
  };

  const getStatusIcon = (state) => {
    if (state === 'running') return <Play className="w-3 h-3" />;
    if (state === 'starting') return <Loader2 className="w-3 h-3 animate-spin" />;
    if (state === 'exited') return <Square className="w-3 h-3" />;
    if (state === 'stopping') return <Loader2 className="w-3 h-3 animate-spin" />;
    if (state === 'restarting') return <Loader2 className="w-3 h-3 animate-spin" />;
    if (state === 'deleting') return <Loader2 className="w-3 h-3 animate-spin" />;
    return <Clock className="w-3 h-3" />;
  };

  const getStatusText = (state) => {
    if (state === 'starting') return 'STARTING';
    if (state === 'stopping') return 'STOPPING';
    if (state === 'restarting') return 'RESTARTING';
    if (state === 'deleting') return 'DELETING';
    return state.toUpperCase();
  };

  const getActionButtonClass = (type, isPending = false) => {
    const base = "p-2.5 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center ";
    
    if (isPending) {
      return base + (isDark 
        ? 'bg-gray-700 text-gray-400 cursor-wait'
        : 'bg-gray-300 text-gray-500 cursor-wait');
    }
    
    if (localState.success && localState.action === type) {
      return base + (isDark 
        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
        : 'bg-gradient-to-br from-green-400 to-green-500 text-white');
    }
    
    if (localState.error && localState.action === type) {
      return base + (isDark 
        ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
        : 'bg-gradient-to-br from-red-400 to-red-500 text-white');
    }

    if (type === 'start') {
      return base + (isDark 
        ? 'bg-gradient-to-br from-seafoam-500 to-seafoam-600 text-white hover:from-seafoam-600 hover:to-seafoam-700'
        : 'bg-gradient-to-br from-seafoam-400 to-seafoam-500 text-white hover:from-seafoam-500 hover:to-seafoam-600');
    } else if (type === 'stop') {
      return base + (isDark
        ? 'bg-gradient-to-br from-coral-500 to-coral-600 text-white hover:from-coral-600 hover:to-coral-700'
        : 'bg-gradient-to-br from-coral-400 to-coral-500 text-white hover:from-coral-500 hover:to-coral-600');
    } else if (type === 'delete') {
      return base + (isDark
        ? 'bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
        : 'bg-gradient-to-br from-red-400 to-red-500 text-white hover:from-red-500 hover:to-red-600');
    } else {
      return base + (isDark
        ? 'bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700'
        : 'bg-gradient-to-br from-ocean-400 to-ocean-500 text-white hover:from-ocean-500 hover:to-ocean-600');
    }
  };

  const getButtonIcon = (action, isPending) => {
    if (isPending) {
      return <Loader2 className="w-5 h-5 animate-spin" />;
    }
    
    if (localState.success && localState.action === action) {
      return <Check className="w-5 h-5" />;
    }
    
    if (localState.error && localState.action === action) {
      return <X className="w-5 h-5" />;
    }

    switch(action) {
      case 'start': return <Play className="w-5 h-5" />;
      case 'stop': return <Square className="w-5 h-5" />;
      case 'restart': return <RotateCcw className="w-5 h-5" />;
      case 'delete': return <Trash2 className="w-5 h-5" />;
      default: return null;
    }
  };

  const isActionPending = startMutation.isPending || stopMutation.isPending || restartMutation.isPending || deleteMutation.isPending;
  const currentState = localState.loading ? localState.action + 'ing' : container.state;

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border transition-all duration-300
      ${isDark 
        ? 'bg-gradient-to-br from-ocean-900/30 to-ocean-950/30 border-ocean-700/30 hover:border-ocean-500/50'
        : 'bg-white border-ocean-200 hover:border-ocean-300 shadow-lg hover:shadow-xl'
      }
      hover:shadow-xl group
    `}>
      {/* Success/Error overlay */}
      {(localState.success || localState.error) && (
        <div className={`absolute inset-0 z-10 flex items-center justify-center rounded-2xl ${
          localState.success 
            ? (isDark ? 'bg-green-500/20' : 'bg-green-500/10') 
            : (isDark ? 'bg-red-500/20' : 'bg-red-500/10')
        }`}>
          {localState.success ? (
            <Check className={`w-8 h-8 ${isDark ? 'text-green-400' : 'text-green-600'} animate-pulse`} />
          ) : (
            <X className={`w-8 h-8 ${isDark ? 'text-red-400' : 'text-red-600'} animate-pulse`} />
          )}
        </div>
      )}

      {/* Loading overlay */}
      {localState.loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/20">
          <div className={`w-12 h-12 border-4 ${isDark ? 'border-ocean-500' : 'border-ocean-400'} border-t-transparent rounded-full animate-spin`} />
        </div>
      )}

      <div className="relative p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(currentState)}`}>
                {getStatusIcon(currentState)}
                <span>{getStatusText(currentState)}</span>
              </div>
              <h3 className={`text-xl font-bold truncate max-w-xs ${isDark ? 'text-white' : 'text-ocean-900'}`}>
                {container.names[0]?.replace('/', '') || 'Unnamed'}
              </h3>
            </div>
            
            <div className="space-y-2.5">
              <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-ocean-800/40' : 'bg-ocean-100'}`}>
                <Terminal className={`w-4 h-4 ${isDark ? 'text-ocean-300' : 'text-ocean-600'}`} />
                <span className={`font-mono text-sm truncate ${isDark ? 'text-ocean-200' : 'text-ocean-700'}`}>
                  {container.id}
                </span>
              </div>
              
              <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-ocean-800/40' : 'bg-ocean-100'}`}>
                <Cpu className={`w-4 h-4 ${isDark ? 'text-ocean-300' : 'text-ocean-600'}`} />
                <span className={`text-sm truncate ${isDark ? 'text-ocean-200' : 'text-ocean-700'}`}>
                  {container.image.split(':')[0] || 'Unknown'}
                </span>
                {container.image.includes(':') && (
                  <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-ocean-700 text-ocean-300' : 'bg-ocean-200 text-ocean-700'}`}>
                    {container.image.split(':')[1]}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            {container.state === 'running' ? (
              <>
                <button
                  onClick={() => stopMutation.mutate()}
                  disabled={isActionPending}
                  className={getActionButtonClass('stop', stopMutation.isPending)}
                  title="Stop Container"
                >
                  {getButtonIcon('stop', stopMutation.isPending)}
                </button>
                <button
                  onClick={() => restartMutation.mutate()}
                  disabled={isActionPending}
                  className={getActionButtonClass('restart', restartMutation.isPending)}
                  title="Restart Container"
                >
                  {getButtonIcon('restart', restartMutation.isPending)}
                </button>
              </>
            ) : (
              <button
                onClick={() => startMutation.mutate()}
                disabled={isActionPending}
                className={getActionButtonClass('start', startMutation.isPending)}
                title="Start Container"
              >
                {getButtonIcon('start', startMutation.isPending)}
              </button>
            )}
            
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete container "${container.names[0]?.replace('/', '') || container.id}"? This action cannot be undone.`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={isActionPending}
              className={getActionButtonClass('delete', deleteMutation.isPending)}
              title="Delete Container"
            >
              {getButtonIcon('delete', deleteMutation.isPending)}
            </button>
          </div>
        </div>
        
        <div className={`pt-4 mt-4 border-t ${isDark ? 'border-ocean-700/40' : 'border-ocean-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${isDark ? 'text-ocean-400' : 'text-ocean-600'}`}>
              Status Details:
            </span>
            <span className={`text-sm font-medium ${
              container.state === 'running' 
                ? (isDark ? 'text-seafoam-400' : 'text-seafoam-600') 
                : (isDark ? 'text-ocean-300' : 'text-ocean-700')
            }`}>
              {container.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContainerCard;