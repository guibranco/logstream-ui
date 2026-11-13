import React from 'react';
import { WSStatus } from '../types';
import { cn } from '../lib/utils';
import { Activity, Eraser, RefreshCw, Zap, ZapOff, Settings, LogOut, Clock, Server as ServerIcon, BarChart3 } from 'lucide-react';
import { useServerInfo } from '../hooks/useServerInfo';
import { ThemePicker } from './ThemePicker';

interface HeaderProps {
  status: WSStatus;
  connections: number;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
  pendingCount: number;
  currentView: 'events' | 'retention' | 'applications';
  setCurrentView: (view: 'events' | 'retention' | 'applications') => void;
  onReload: () => void;
  onClear: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onDisconnect: () => void;
}

function liveLabel(isLive: boolean, pendingCount: number): string {
  if (isLive) return 'Live';
  return pendingCount > 0 ? `Paused · ${pendingCount} new` : 'Paused';
}

export const Header: React.FC<HeaderProps> = ({
  status,
  connections,
  isLive,
  setIsLive,
  pendingCount,
  currentView,
  setCurrentView,
  onReload,
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
  const isWebsocketEnabled = serverInfo?.features?.websocket !== false;

  return (
    <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800 px-3 md:px-4 py-2 md:py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-2 shadow-md">
      {/* On phones the tabs move to a second line under the title and the buttons. */}
      <div className="contents md:flex md:items-center md:gap-8 md:min-w-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-gray-100">LogStream</h1>
            <div className={cn("w-2 h-2 rounded-full animate-pulse", statusColor)} />
          </div>
          
          {isWebsocketEnabled && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-800">
              <Activity size={14} />
              <span>{connections} connections</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="order-last md:order-none w-full md:w-auto flex items-center bg-gray-900/50 rounded-lg p-1 border border-gray-800/50 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setCurrentView('events')}
            className={cn(
              "flex-1 md:flex-none px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap",
              currentView === 'events' ? "bg-gray-800 text-gray-50 shadow-sm" : "text-gray-500 hover:text-gray-300"
            )}
          >
            Events
          </button>

          {serverInfo?.features.client_management && (
            <button
              onClick={() => setCurrentView('applications')}
              className={cn(
                "flex-1 md:flex-none justify-center px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap",
                currentView === 'applications' ? "bg-gray-800 text-gray-50 shadow-sm" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <ServerIcon size={14} />
              Applications
            </button>
          )}

          <button
            onClick={() => setCurrentView('retention')}
            className={cn(
              "flex-1 md:flex-none justify-center px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap",
              currentView === 'retention' ? "bg-gray-800 text-gray-50 shadow-sm" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Clock size={14} />
            Retention
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        {currentView === 'events' && (
          <>
            {isWebsocketEnabled ? (
              <button
                onClick={() => setIsLive(!isLive)}
                title={isLive ? 'Pause: hold new events above the list' : 'Resume following new events'}
                className={cn(
                  "flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded text-xs font-medium border transition-all whitespace-nowrap",
                  isLive
                    ? "bg-gray-900 border-gray-800 text-green-400 hover:bg-gray-800"
                    : "bg-amber-900/20 border-amber-800/50 text-amber-400 hover:bg-amber-900/30"
                )}
              >
                {isLive ? <Zap size={14} /> : <ZapOff size={14} />}
                {/* A phone shows only the icon, and the new-event count while paused. */}
                <span className="hidden sm:inline">{liveLabel(isLive, pendingCount)}</span>
                {!isLive && pendingCount > 0 && <span className="sm:hidden">{pendingCount}</span>}
              </button>
            ) : (
              <div
                className="flex items-center bg-gray-900/40 rounded px-2 sm:px-3 py-1.5 border border-gray-800 text-xs font-semibold text-amber-500 gap-1.5 cursor-not-allowed select-none"
                title="Live view disabled"
              >
                <ZapOff size={14} />
                <span className="hidden sm:inline">Live view disabled</span>
              </div>
            )}

            <button
              onClick={onClear}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-200 hover:bg-gray-900 rounded transition-all"
              title="Clear the screen (new events keep arriving)"
              aria-label="Clear the screen"
            >
              <Eraser size={18} />
            </button>

            <button
              onClick={onReload}
              className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-200 hover:bg-gray-900 rounded transition-all"
              title="Reload from the latest events"
              aria-label="Reload from the latest events"
            >
              <RefreshCw size={18} />
            </button>

            <button
              onClick={onOpenStats}
              className="flex items-center gap-1 text-xs font-medium bg-gray-900 border border-gray-800 px-2 sm:px-3 py-1.5 rounded hover:bg-gray-800 transition-colors"
              aria-label="Stats"
            >
              <BarChart3 size={14} className="sm:hidden" />
              <span className="hidden sm:inline">Stats <span className="text-gray-500">▸</span></span>
            </button>

            <div className="hidden sm:block w-px h-4 bg-gray-800 mx-1" />
          </>
        )}

        <div className="flex items-center sm:gap-1">
          <ThemePicker />

          <button
            onClick={onOpenSettings}
            className="p-1.5 sm:p-2 text-gray-500 hover:text-primary-400 hover:bg-gray-900 rounded transition-all"
            title="Update connection settings"
          >
            <Settings size={18} />
          </button>

          <button
            onClick={onDisconnect}
            className="p-1.5 sm:p-2 text-gray-500 hover:text-red-400 hover:bg-gray-900 rounded transition-all"
            title="Disconnect and clear settings"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
