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
        message: 'WebSocket connected to Docker Ant UI backend',
        container: null,
        timestamp: new Date()
      });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'container_update') {
          queryClient.setQueryData(['containers'], data.containers);
        } else if (data.type === 'container_event') {
          queryClient.invalidateQueries({ queryKey: ['containers'] });
          // Add to activity log
          addLog({
            id: `log-${Date.now()}`,
            type: data.status === 'error' ? 'error' : 'success',
            message: data.message || `${data.action} ${data.containerId}`,
            container: data.containerId,
            timestamp: new Date(data.timestamp * 1000)
          });
        } else if (data.type === 'activity_log') {
          addLog(data.log);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected, reconnecting in 3 seconds...');
      addLog({
        id: `log-${Date.now()}`,
        type: 'warning',
        message: 'WebSocket disconnected, attempting to reconnect...',
        container: null,
        timestamp: new Date()
      });
      setTimeout(connect, 3000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      addLog({
        id: `log-${Date.now()}`,
        type: 'error',
        message: `WebSocket error: ${error.message}`,
        container: null,
        timestamp: new Date()
      });
    };

    ws.current = socket;
  }, [queryClient, addLog]);

  useEffect(() => {
    connect();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return { ws: ws.current };
};