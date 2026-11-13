import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { rememberRange, withRememberedRange } from './lib/dateRange';
import { useServerInfo } from './hooks/useServerInfo';
import { useClients } from './hooks/useClients';
import { AppKeyOption } from './components/search/AppKeyPicker';
import { Footer } from './components/Footer';
import { UI_VERSION } from './lib/version';

import { RetentionScreen } from './screens/RetentionScreen';
import { ApplicationsScreen } from './screens/ApplicationsScreen';

const queryClient = new QueryClient();

const STORAGE_KEY = 'logservice:filters';

/** localStorage, or null where reading it throws (blocked storage). */
function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
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
    let initial: SearchFilters = initialUrlFilters ?? {};
    if (!initialUrlFilters) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        initial = saved ? JSON.parse(saved) : {};
      } catch {
        initial = {};
      }
    }
    // No range in the link or the saved filters: the remembered one, or the last 24 hours.
    return withRememberedRange(initial, safeStorage());
  });
  const { data: serverInfo, isError: isServerInfoError } = useServerInfo();
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  // Pausing holds new events above the list; the screen stays the same.
  const [isPaused, setIsPaused] = useState(false);

  const feed = useEventFeed(filters);

  const multiValue = serverInfo?.features?.multi_value_filters === true;
  const hasClientRegistry = serverInfo?.features?.client_management === true;
  const { data: clientList } = useClients(hasClientRegistry);
  // Without a registry (file storage), offer every app key seen in this session,
  // so filtering by one app doesn't hide the others from the picker.
  const [seenAppKeys, setSeenAppKeys] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    if (hasClientRegistry) return;
    setSeenAppKeys(prev => {
      const fresh = feed.entries.filter(e => !prev.has(e.app_key));
      if (fresh.length === 0) return prev;
      const next = new Set(prev);
      for (const e of fresh) next.add(e.app_key);
      return next;
    });
  }, [hasClientRegistry, feed.entries]);

  // Registered applications, or the app keys seen so far.
  const appKeyOptions = useMemo<AppKeyOption[]>(() => {
    if (hasClientRegistry) {
      return (clientList?.clients ?? []).map(c => ({ appKey: c.app_key, name: c.name }));
    }
    return [...seenAppKeys].map(appKey => ({ appKey }));
  }, [hasClientRegistry, clientList, seenAppKeys]);
  const { status, connections, isWebsocketEnabled } = useWebSocket(feed.pushLive, feed.catchUp);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Storage unavailable (private mode, quota): the URL still carries the filters.
    }
    rememberRange(filters, safeStorage());
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

  const handleFilterTemplate = useCallback((template: string) => {
    setFilters(f => ({ ...f, message_template: template, search: undefined }));
  }, []);

  const handleFilterCategory = useCallback((category: string) => {
    setFilters(f => ({ ...f, category }));
  }, []);

  const handleFilterContext = useCallback((path: string, value: string, exclude: boolean) => {
    setFilters(f => withContextFilter(f, path, value, exclude));
  }, []);

  // Resuming shows the held events as soon as nothing else holds the feed (expanded row, scroll).
  const handleSetIsLive = useCallback((live: boolean) => setIsPaused(!live), []);

  // While the server is unreachable the footer shows a dash, not the last version it reported.
  const footer = (
    <Footer uiVersion={UI_VERSION} serverVersion={isServerInfoError ? undefined : serverInfo?.version} />
  );

  if (isSettingsOpen || !isConfigured) {
    return <SettingsScreen footer={footer} />;
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
              multiValue={multiValue}
              appKeyOptions={appKeyOptions}
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
                onResume={() => setIsPaused(false)}
                isCleared={feed.isCleared}
                onShowEarlier={feed.reload}
                onHoldChange={feed.setHold}
                onFilterBatch={handleFilterBatch}
                onFilterTrace={handleFilterTrace}
                onFilterContext={handleFilterContext}
                onFilterTemplate={handleFilterTemplate}
                onFilterCategory={handleFilterCategory}
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
        onClear={feed.clear}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenSettings={openSettings}
        onDisconnect={signOut}
      />
      
      {renderScreen()}

      {footer}
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
