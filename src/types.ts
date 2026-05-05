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
  type: 'connected' | 'log' | 'pong' | 'stats' | 'error';
  connections?: number;
  data?: any;
  message?: string;
}

export interface RetentionPolicy {
  name: string;
  older_than_days: number;
  cutoff_date: string;
  app_key?: string;
  app_id?: string;
  level?: LogLevel;
  category?: string;
  message_regex?: string;
  message_glob?: string;
}

export interface RetentionRunResult {
  policy: string;
  deleted: number;
  files_removed: number;
  files_rewritten: number;
  dry_run: boolean;
  duration_ms: number;
  summary: string;
  warnings: string[];
}

export interface RetentionRunResponse {
  dry_run: boolean;
  policies_run: number;
  total_deleted: number;
  results: RetentionRunResult[];
}
