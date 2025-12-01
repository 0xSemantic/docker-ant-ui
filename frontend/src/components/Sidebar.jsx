import React from 'react';
import { 
  LayoutDashboard, 
  Box, 
  Image, 
  Network, 
  HardDrive,
  GitBranch,
  Settings,
  Terminal,
  Globe,
  Bug,
  Server
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Containers', href: '/containers', icon: Box },
  { name: 'Images', href: '/images', icon: Image },
  { name: 'Networks', href: '/networks', icon: Network },
  { name: 'Volumes', href: '/volumes', icon: HardDrive },
  { name: 'Compose', href: '/compose', icon: GitBranch },
  { name: 'Terminal', href: '/terminal', icon: Terminal },
  { name: 'Registry', href: '/registry', icon: Globe },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();
  const { isDark } = useTheme();
  
  return (
    <div className={`w-64 border-r h-screen sticky top-0 transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-b from-ocean-900 to-ocean-950 border-ocean-800' 
        : 'bg-gradient-to-b from-ocean-50 to-white border-ocean-200'
    }`}>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg">
            <Bug className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${
              isDark 
                ? 'bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent' 
                : 'bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent'
            }`}>
              Docker Ant UI
            </h1>
            <p className={`text-xs ${isDark ? 'text-ocean-400' : 'text-ocean-500'}`}>
              Native Docker Management
            </p>
          </div>
        </div>
      </div>
      
      <nav className="px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300
                ${isActive 
                  ? (isDark
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 border border-amber-500/30' 
                    : 'bg-gradient-to-r from-amber-400/20 to-amber-500/20 text-amber-600 border border-amber-400/30')
                  : (isDark
                    ? 'text-ocean-300 hover:text-amber-300 hover:bg-ocean-800/50'
                    : 'text-ocean-600 hover:text-amber-600 hover:bg-ocean-100')
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="absolute bottom-0 w-full p-4 border-t  pb-16">
        <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors duration-300 ${
          isDark 
            ? 'bg-ocean-800/50 border border-ocean-700/50' 
            : 'bg-ocean-100 border border-ocean-200'
        }`}>
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md">
            <Server className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              Docker Connected
            </p>
            <p className={`text-xs ${isDark ? 'text-ocean-400' : 'text-ocean-500'}`}>
              Local daemon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;