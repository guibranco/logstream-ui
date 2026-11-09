import React, { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { LogTable } from './components/LogTable';
import { StatsDrawer } from './components/StatsDrawer';
import { SettingsScreen } from './components/SettingsScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useWebSocket } from './hooks/useWebSocket';
import { useLogs } from './hooks/useLogs';
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
  
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const {
    status,
    connections,
    logs: liveLogs,
    buffer,
    isLive,
    setIsLive,
    flushBuffer,
    clearLogs
  } = useWebSocket();

  const {
    data: searchResult,
    isLoading,
    isError,
    error,
    refetch
  } = useLogs(filters, limit, offset);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Storage unavailable (private mode, quota): the URL still carries the filters.
    }
    window.history.replaceState(window.history.state, '', urlWithFilters(window.location, filters));
  }, [filters]);

  // Opening a link that carries filters means "show me these results", not the live tail.
  useEffect(() => {
    if (initialUrlFilters) setIsLive(false);
  }, [initialUrlFilters, setIsLive]);

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, currentView);
  }, [currentView]);

  const handleSearch = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    setOffset(0);
    setIsLive(false); // Switch to search mode
  }, [setIsLive]);

  const handleFilterBatch = useCallback((batchId: string) => {
    const newFilters = { ...filters, batch_id: batchId, trace_id: undefined, search: undefined };
    setFilters(newFilters);
    setOffset(0);
    setIsLive(false);
  }, [filters, setIsLive]);

  const handleFilterTrace = useCallback((traceId: string) => {
    const newFilters = { ...filters, trace_id: traceId, batch_id: undefined, search: undefined };
    setFilters(newFilters);
    setOffset(0);
    setIsLive(false);
  }, [filters, setIsLive]);

  const handleFilterContext = useCallback((path: string, value: string, exclude: boolean) => {
    setFilters(withContextFilter(filters, path, value, exclude));
    setOffset(0);
    setIsLive(false);
  }, [filters, setIsLive]);

  const activeLogs = isLive ? liveLogs : (searchResult?.entries || []);
  const total = isLive ? liveLogs.length : (searchResult?.total || 0);

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
                logs={activeLogs}
                isLoading={isLoading && !isLive}
                isError={isError && !isLive}
                error={error as Error}
                total={total}
                limit={limit}
                offset={offset}
                onPageChange={setOffset}
                onLimitChange={setLimit}
                onFilterBatch={handleFilterBatch}
                onFilterTrace={handleFilterTrace}
                onFilterContext={handleFilterContext}
                isLiveMode={isLive}
                onRetry={() => refetch()}
              />
            </main>

            <StatsDrawer
              isOpen={isStatsOpen}
              onClose={() => setIsStatsOpen(false)}
              logs={liveLogs}
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
        isLive={isLive}
        setIsLive={setIsLive}
        bufferCount={buffer.length}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onFlush={flushBuffer}
        onClear={clearLogs}
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LogStreamApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}
