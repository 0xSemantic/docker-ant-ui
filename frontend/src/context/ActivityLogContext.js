import React, { createContext, useContext, useState, useCallback } from 'react';

const ActivityLogContext = createContext();

export const useActivityLog = () => {
  const context = useContext(ActivityLogContext);
  if (!context) {
    throw new Error('useActivityLog must be used within an ActivityLogProvider');
  }
  return context;
};

export const ActivityLogProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState(null);

  const addLog = useCallback((log) => {
    setLogs(prev => {
      const newLogs = [log, ...prev.slice(0, 49)]; // Keep last 50 logs
      return newLogs;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const filterByContainer = useCallback((containerId) => {
    setSelectedContainer(containerId);
  }, []);

  const clearFilter = useCallback(() => {
    setSelectedContainer(null);
  }, []);

  const getFilteredLogs = useCallback(() => {
    if (!selectedContainer) return logs;
    return logs.filter(log => log.container === selectedContainer);
  }, [logs, selectedContainer]);

  const value = {
    logs,
    addLog,
    clearLogs,
    selectedContainer,
    filterByContainer,
    clearFilter,
    getFilteredLogs,
  };

  return (
    <ActivityLogContext.Provider value={value}>
      {children}
    </ActivityLogContext.Provider>
  );
};