// src/hooks/useWebSocket.js
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActivityLog } from '../context/ActivityLogContext';

export const useWebSocket = () => {
  const ws = useRef(null);
  const queryClient = useQueryClient();
  const { addLog } = useActivityLog();

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket('ws://localhost:8080/ws');

    socket.onopen = () => {
      console.log('WebSocket connected');
      addLog({
        id: `log-${Date.now()}`,
        type: 'system',
        message: 'Connected to Docker Ant backend',
        container: null,
        timestamp: new Date()
      });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'init') {
          queryClient.setQueryData(['containers'], data.containers);
          queryClient.setQueryData(['images'], data.images);
          queryClient.setQueryData(['networks'], data.networks);
          queryClient.setQueryData(['volumes'], data.volumes);
        }

        if (data.type === 'container_update') {
          queryClient.setQueryData(['containers'], data.containers);
        }

        if (data.type === 'container_created') {
          queryClient.invalidateQueries({ queryKey: ['containers'] });
          addLog({
            id: `log-${Date.now()}`,
            type: 'success',
            message: `Container created: ${data.data.name || data.data.id}`,
            container: data.data.id,
            timestamp: new Date()
          });
        }

        if (data.type === 'network_created') {
          queryClient.invalidateQueries({ queryKey: ['networks'] });
          addLog({
            id: `log-${Date.now()}`,
            type: 'success',
            message: `Network created: ${data.data.name}`,
            container: null,
            timestamp: new Date()
          });
        }

        if (data.type === 'volume_created') {
          queryClient.invalidateQueries({ queryKey: ['volumes'] });
          addLog({
            id: `log-${Date.now()}`,
            type: 'success',
            message: `Volume created: ${data.data.name}`,
            container: null,
            timestamp: new Date()
          });
        }

        if (data.type === 'activity_log') {
          addLog(data.data);
        }
      } catch (error) {
        console.error('WebSocket parse error:', error);
      }
    };

    socket.onclose = () => {
      setTimeout(connect, 3000);
    };

    ws.current = socket;
  }, [queryClient, addLog]);

  useEffect(() => {
    connect();
    return () => ws.current?.close();
  }, [connect]);
};