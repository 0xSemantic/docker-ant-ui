import React from 'react';
import { Sun, Moon, Waves } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeSwitcher = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative group flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-700 hover:from-ocean-600 hover:to-ocean-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-seafoam-300/20 to-ocean-400/20 animate-pulse-slow" />
      
      <div className="relative z-10">
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-yellow-300 animate-wave" />
        ) : (
          <Moon className="w-5 h-5 text-blue-100 animate-float" />
        )}
      </div>
      
      {/* Ocean wave indicator */}
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-1">
        <div className="flex items-center justify-center space-x-0.5">
          <div className={`w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-ocean-300' : 'bg-ocean-600'} transition-all duration-300`} />
          <div className={`w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-ocean-400' : 'bg-ocean-500'} transition-all duration-300`} />
          <div className={`w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-ocean-500' : 'bg-ocean-400'} transition-all duration-300`} />
        </div>
      </div>
    </button>
  );
};

export default ThemeSwitcher;