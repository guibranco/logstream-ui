import React, { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { LogTable } from './components/LogTable';
import { StatsDrawer } from './components/StatsDrawer';
import { SettingsScreen } from './components/SettingsScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useWebSocket } from './hooks/useWebSocket';
import { useEventFeed } from './hooks/useEventFeed';
import { SearchFilters } from './types';
import { withContextFilter } from './lib/contextProperties';
import { filtersFromQuery, urlWithFilters } from './lib/filterUrl';
import { useServerInfo } from './hooks/useServerInfo';

import { RetentionScreen } from './screens/RetentionScreen';
import { ApplicationsScreen } from './screens/ApplicationsScreen';

const queryClient = new QueryClient();

const STORAGE_KEY = 'logservice:filters';
const VIEW_STORAGE_KEY = 'logservice:view';

function LogStreamApp() {
  const { config, isConfigured, isSettingsOpen, openSettings, signOut } = useAuth();
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'retention' | 'applications'>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return (saved === 'retention' || saved === 'applications') ? saved : 'dashboard';
  });

  // A shared link wins over the filters saved in this browser.
  const [initialUrlFilters] = useState(() => filtersFromQuery(window.location.search));
  const [filters, setFilters] = useState<SearchFilters>(() => {
    if (initialUrlFilters) return initialUrlFilters;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const { data: serverInfo } = useServerInfo();
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  // Pausing holds new events above the list; the screen stays the same.
  const [isPaused, setIsPaused] = useState(false);

  const feed = useEventFeed(filters);
  const { status, connections, isWebsocketEnabled } = useWebSocket(feed.pushLive, feed.catchUp);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Storage unavailable (private mode, quota): the URL still carries the filters.
    }
    window.history.replaceState(window.history.state, '', urlWithFilters(window.location, filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, currentView);
  }, [currentView]);

  const handleSearch = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  const handleFilterBatch = useCallback((batchId: string) => {
    setFilters(f => ({ ...f, batch_id: batchId, trace_id: undefined, search: undefined }));
  }, []);

  const handleFilterTrace = useCallback((traceId: string) => {
    setFilters(f => ({ ...f, trace_id: traceId, batch_id: undefined, search: undefined }));
  }, []);

  const handleFilterContext = useCallback((path: string, value: string, exclude: boolean) => {
    setFilters(f => withContextFilter(f, path, value, exclude));
  }, []);

  // Resuming shows the held events as soon as nothing else holds the feed (expanded row, scroll).
  const handleSetIsLive = useCallback((live: boolean) => setIsPaused(!live), []);

  if (isSettingsOpen || !isConfigured) {
    return <SettingsScreen />;
  }

  const renderScreen = () => {
    switch (currentView) {
      case 'retention':
        return <RetentionScreen />;
      case 'applications':
        return <ApplicationsScreen />;
      default:
        return (
          <>
            <FilterBar
              filters={filters}
              onSearch={handleSearch}
              storageType={serverInfo?.storage_type}
            />

            <main className="flex-1 flex flex-col min-h-0">
              <LogTable
                key={JSON.stringify(filters)}
                logs={feed.entries}
                pendingCount={feed.pendingCount}
                pendingOverflow={feed.pendingOverflow}
                total={feed.total}
                hasMore={feed.hasMore}
                isLoading={feed.isLoadingInitial}
                isLoadingOlder={feed.isLoadingOlder}
                error={feed.error}
                isPaused={isPaused}
                isLiveEnabled={isWebsocketEnabled}
                onLoadOlder={feed.loadOlder}
                onShowPending={feed.flush}
                onHoldChange={feed.setHold}
                onFilterBatch={handleFilterBatch}
                onFilterTrace={handleFilterTrace}
                onFilterContext={handleFilterContext}
                onRetry={feed.reload}
              />
            </main>

            <StatsDrawer
              isOpen={isStatsOpen}
              onClose={() => setIsStatsOpen(false)}
              logs={feed.entries}
            />
          </>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
      <Header
        status={status}
        connections={connections}
        isLive={!isPaused}
        setIsLive={handleSetIsLive}
        pendingCount={feed.pendingCount}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onReload={feed.reload}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenSettings={openSettings}
        onDisconnect={signOut}
      />
      
      {renderScreen()}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LogStreamApp />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
