import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { queryClient } from './lib/queryClient';
import { ThemeProvider } from './context/ThemeContext';
import { ActivityLogProvider } from './context/ActivityLogContext';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Images from './pages/Images';
import Networks from './pages/Networks';               // NEW
import Volumes from './pages/Volumes';                   // NEW
import CreateContainerModal from './pages/CreateContainerModal'; // NEW

import ThemeSwitcher from './components/ThemeSwitcher';
import ActivityLog from './components/ActivityLog';
import { useWebSocket } from './hooks/useWebSocket';     // CORRECT import

import './App.css';

// WebSocket initializer (fixed typo)
const WebSocketInitializer = () => {
  useWebSocket();          // this is correct
  return null;
};

function App() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ActivityLogProvider>
          <BrowserRouter>
            <WebSocketInitializer />

            <div className="min-h-screen bg-gradient-to-br from-ocean-50 to-white dark:from-ocean-950 dark:to-ocean-900 text-ocean-900 dark:text-white transition-colors duration-300">
              <div className="flex">
                <Sidebar />

                <main className="flex-1 p-6 pb-16">
                  <div className="max-w-7xl mx-auto">
                    {/* Theme Switcher */}
                    <div className="fixed top-6 right-6 z-50">
                      <ThemeSwitcher />
                    </div>

                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/containers" element={<Dashboard />} />
                      <Route path="/images" element={<Images />} />
                      <Route path="/networks" element={<Networks />} />
                      <Route path="/volumes" element={<Volumes />} />
                    </Routes>
                  </div>
                </main>
              </div>

              {/* Activity Log (bottom dock) */}
              <ActivityLog />

              {/* Full Create Container Modal */}
              <CreateContainerModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
              />
            </div>
          </BrowserRouter>
        </ActivityLogProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;