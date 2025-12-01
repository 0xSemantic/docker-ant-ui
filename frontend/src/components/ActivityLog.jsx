import React, { useState, useRef, useEffect } from 'react';
import { Terminal, X, Filter, Download, Trash2, CheckCircle, XCircle, AlertCircle, Info, Bug, ChevronUp, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useActivityLog } from '../context/ActivityLogContext';

const ActivityLog = () => {
  const { isDark } = useTheme();
  const { logs, clearLogs, selectedContainer, filterByContainer, clearFilter, getFilteredLogs } = useActivityLog();
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef(null);
  const logEndRef = useRef(null);
  const filteredLogs = getFilteredLogs();

  const scrollToBottom = () => {
    if (logContainerRef.current && autoScroll) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const scrollToTop = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
      setAutoScroll(false);
    }
  };

  const scrollToBottomManual = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  useEffect(() => {
    if (isExpanded && autoScroll) {
      scrollToBottom();
    }
  }, [logs, isExpanded, autoScroll]);

  useEffect(() => {
    const container = logContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [isExpanded]);

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'system': return <Bug className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return isDark ? 'bg-green-900/20 border-green-800/30' : 'bg-green-50 border-green-200';
      case 'error': return isDark ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200';
      case 'warning': return isDark ? 'bg-yellow-900/20 border-yellow-800/30' : 'bg-yellow-50 border-yellow-200';
      case 'system': return isDark ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-200';
      default: return isDark ? 'bg-gray-900/20 border-gray-800/30' : 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${formatDate(log.timestamp)} ${formatTime(log.timestamp)}] ${log.type.toUpperCase()}: ${log.message} ${log.container ? `(Container: ${log.container})` : ''}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docker-ant-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
      isExpanded ? 'h-96' : 'h-12'
    }`}>
      {/* Header Bar */}
      <div className={`flex items-center justify-between px-4 h-12 border-t ${
        isDark 
          ? 'bg-gradient-to-r from-ocean-800 to-ocean-900 border-ocean-700' 
          : 'bg-gradient-to-r from-ocean-600 to-ocean-700 border-ocean-500'
      }`}>
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-white" />
          <div className="text-white font-medium">
            Activity Log {logs.length > 0 && `(${logs.length})`}
          </div>
          {selectedContainer && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-ocean-200">Filtered by: {selectedContainer}</span>
              <button
                onClick={clearFilter}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <>
              <button
                onClick={exportLogs}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Export Logs"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={clearLogs}
                className="p-2 rounded hover:bg-white/10 transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded hover:bg-white/10 transition-colors"
          >
            {isExpanded ? (
              <X className="w-4 h-4 text-white" />
            ) : (
              <Terminal className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Log Content */}
      {isExpanded && (
        <div className={`h-84 flex flex-col ${isDark ? 'bg-gray-950/95' : 'bg-white'}`}>
          {/* Scroll Controls */}
          <div className={`flex items-center justify-between px-4 py-2 border-b ${
            isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {filteredLogs.length} logs
              </span>
              {autoScroll && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                }`}>
                  Auto-scroll enabled
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={scrollToTop}
                className={`p-1.5 rounded ${
                  isDark 
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                }`}
                title="Scroll to top"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={scrollToBottomManual}
                className={`p-1.5 rounded ${
                  isDark 
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900'
                }`}
                title="Scroll to bottom"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  autoScroll
                    ? isDark
                      ? 'bg-green-900/30 text-green-400 border border-green-800'
                      : 'bg-green-100 text-green-700 border border-green-200'
                    : isDark
                      ? 'bg-gray-800 text-gray-400 border border-gray-700'
                      : 'bg-gray-200 text-gray-600 border border-gray-300'
                }`}
              >
                {autoScroll ? 'Auto ✓' : 'Auto'}
              </button>
            </div>
          </div>

          {/* Logs Container */}
          <div 
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-4"
            style={{ scrollBehavior: 'smooth' }}
          >
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Terminal className={`w-16 h-16 mb-4 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                <p className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                  No activity logs yet. Start managing your containers to see logs here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log, index) => {
                  const showDateHeader = index === 0 || 
                    formatDate(filteredLogs[index - 1].timestamp) !== formatDate(log.timestamp);
                  
                  return (
                    <React.Fragment key={log.id}>
                      {showDateHeader && (
                        <div className={`sticky top-0 z-10 py-2 mb-2 ${
                          isDark 
                            ? 'bg-gray-900/95 border-b border-gray-800' 
                            : 'bg-white/95 border-b border-gray-200'
                        }`}>
                          <div className={`text-sm font-medium px-2 ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {formatDate(log.timestamp)}
                          </div>
                        </div>
                      )}
                      
                      <div
                        className={`p-3 rounded-lg border ${getLogColor(log.type)} transition-all hover:scale-[1.01]`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="pt-0.5">
                            {getLogIcon(log.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-medium ${
                                isDark ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {log.message}
                              </span>
                              <span className={`text-xs whitespace-nowrap ml-2 ${
                                isDark ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {formatTime(log.timestamp)}
                              </span>
                            </div>
                            {log.container && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => filterByContainer(log.container)}
                                  className={`text-xs px-2 py-1 rounded ${
                                    isDark 
                                      ? 'bg-ocean-800/50 text-ocean-300 hover:bg-ocean-700/50' 
                                      : 'bg-ocean-100 text-ocean-600 hover:bg-ocean-200'
                                  } transition-colors`}
                                >
                                  <Filter className="w-3 h-3 inline mr-1" />
                                  {log.container}
                                </button>
                                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                  Container ID
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;