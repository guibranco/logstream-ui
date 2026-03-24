import React, { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { LogTable } from './components/LogTable';
import { StatsDrawer } from './components/StatsDrawer';
import { useWebSocket } from './hooks/useWebSocket';
import { useLogs } from './hooks/useLogs';
import { SearchFilters } from './types';

const queryClient = new QueryClient();

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

const STORAGE_KEY = 'logservice:filters';

function LogServiceApp() {
  const [filters, setFilters] = useState<SearchFilters>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });
  
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
  } = useWebSocket(WS_URL);

  const {
    data: searchResult,
    isLoading,
    isError,
    error,
    refetch
  } = useLogs(filters, limit, offset);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

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

  const activeLogs = isLive ? liveLogs : (searchResult?.entries || []);
  const total = isLive ? liveLogs.length : (searchResult?.total || 0);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
      <Header
        status={status}
        connections={connections}
        isLive={isLive}
        setIsLive={setIsLive}
        bufferCount={buffer.length}
        onFlush={flushBuffer}
        onClear={clearLogs}
        onOpenStats={() => setIsStatsOpen(true)}
      />
      
      <FilterBar
        filters={filters}
        onSearch={handleSearch}
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
          isLiveMode={isLive}
          onRetry={() => refetch()}
        />
      </main>

      <StatsDrawer
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        logs={liveLogs}
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LogServiceApp />
    </QueryClientProvider>
  );
}
