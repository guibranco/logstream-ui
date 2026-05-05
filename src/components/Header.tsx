import React from 'react';
import { WSStatus } from '../types';
import { cn } from '../lib/utils';
import { Activity, Trash2, Zap, ZapOff, Settings, LogOut, Clock, Server as ServerIcon } from 'lucide-react';
import { useServerInfo } from '../hooks/useServerInfo';

interface HeaderProps {
  status: WSStatus;
  connections: number;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
  bufferCount: number;
  currentView: 'dashboard' | 'retention' | 'applications';
  setCurrentView: (view: 'dashboard' | 'retention' | 'applications') => void;
  onFlush: () => void;
  onClear: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onDisconnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  connections,
  isLive,
  setIsLive,
  bufferCount,
  currentView,
  setCurrentView,
  onFlush,
  onClear,
  onOpenStats,
  onOpenSettings,
  onDisconnect
}) => {
  const statusColor = {
    connected: 'bg-green-500',
    reconnecting: 'bg-amber-500',
    disconnected: 'bg-red-500'
  }[status];

  const { data: serverInfo } = useServerInfo();

  return (
    <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-gray-100">LogStream</h1>
            <div className={cn("w-2 h-2 rounded-full animate-pulse", statusColor)} />
          </div>
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-800">
            <Activity size={14} />
            <span>{connections} connections</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-gray-900/50 rounded-lg p-1 border border-gray-800/50">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              currentView === 'dashboard' ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Dashboard
          </button>

          {serverInfo?.features.client_management && (
            <button
              onClick={() => setCurrentView('applications')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                currentView === 'applications' ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <ServerIcon size={14} />
              Applications
            </button>
          )}

          <button
            onClick={() => setCurrentView('retention')}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
              currentView === 'retention' ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Clock size={14} />
            Retention
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {currentView === 'dashboard' && (
          <>
            {bufferCount > 0 && !isLive && (
              <button
                onClick={onFlush}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors animate-bounce"
              >
                {bufferCount} new entries — click to load
              </button>
            )}

            <div className="flex items-center bg-gray-900 rounded p-1 border border-gray-800">
              <button
                onClick={() => setIsLive(true)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all",
                  isLive ? "bg-gray-800 text-green-400 shadow-sm" : "text-gray-500 hover:text-gray-300"
                )}
              >
                <Zap size={14} />
                Live
              </button>
              <button
                onClick={() => setIsLive(false)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all",
                  !isLive ? "bg-gray-800 text-amber-400 shadow-sm" : "text-gray-500 hover:text-gray-300"
                )}
              >
                <ZapOff size={14} />
                Paused
              </button>
            </div>

            <button
              onClick={onClear}
              className="p-2 text-gray-500 hover:text-rose-400 hover:bg-gray-900 rounded transition-all"
              title="Clear live buffer"
            >
              <Trash2 size={18} />
            </button>

            <button
              onClick={onOpenStats}
              className="flex items-center gap-1 text-xs font-medium bg-gray-900 border border-gray-800 px-3 py-1.5 rounded hover:bg-gray-800 transition-colors"
            >
              Stats <span className="text-gray-500">▸</span>
            </button>

            <div className="w-px h-4 bg-gray-800 mx-1" />
          </>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-500 hover:text-blue-400 hover:bg-gray-900 rounded transition-all"
            title="Update connection settings"
          >
            <Settings size={18} />
          </button>

          <button
            onClick={onDisconnect}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-900 rounded transition-all"
            title="Disconnect and clear settings"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
