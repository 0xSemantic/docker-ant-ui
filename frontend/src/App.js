import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { queryClient } from './lib/queryClient';
import { ThemeProvider } from './context/ThemeContext';
import { ActivityLogProvider } from './context/ActivityLogContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ThemeSwitcher from './components/ThemeSwitcher';
import ActivityLog from './components/ActivityLog';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

// Component to initialize WebSocket
const WebSocketInitializer = () => {
  useWebSocket();
  return null;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ActivityLogProvider>
          <BrowserRouter>
            <WebSocketInitializer />
            <div className="min-h-screen bg-gradient-to-br from-ocean-50 to-white dark:from-ocean-950 dark:to-ocean-900 text-ocean-900 dark:text-white transition-colors duration-300">
              <div className="flex">
                <Sidebar />
                
                <main className="flex-1 p-6 pb-16"> {/* Added pb-16 for activity log space */}
                  <div className="max-w-7xl mx-auto">
                    {/* Theme Switcher in top right */}
                    <div className="fixed top-6 right-6 z-50">
                      <ThemeSwitcher />
                    </div>
                    
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/containers" element={<Dashboard />} />
                    </Routes>
                  </div>
                </main>
              </div>
              
              {/* Activity Log at bottom */}
              <ActivityLog />
            </div>
          </BrowserRouter>
        </ActivityLogProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;