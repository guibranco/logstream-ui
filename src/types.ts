export type LogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical';

export interface LogEntry {
  id: string;           // ULID — time-sortable
  trace_id: string;     // UUID
  batch_id: string | null;
  app_key: string;
  app_id: string;
  user_agent: string | null;
  level: LogLevel;
  category: string;
  message: string;
  context: Record<string, unknown> | null;
  timestamp: string;    // ISO 8601
  created_at: string;   // ISO 8601
}

export interface SearchResult {
  total: number;
  limit: number;
  offset: number;
  entries: LogEntry[];
}

export interface SearchFilters {
  app_key?: string;
  app_id?: string;
  user_agent?: string;
  level?: LogLevel;
  category?: string;
  trace_id?: string;
  batch_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export type WSStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface WSMessage {
  type: 'connected' | 'log' | 'pong' | 'stats';
  connections?: number;
  data?: any;
}
