export type LogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical';

export interface LogEntry {
  id: string;           // ULID — time-sortable
  trace_id: string;     // UUID
  batch_id: string | null;
  app_key: string;
  app_id: string;
  user_agent: string | null;
  sender_ip?: string | null; // optional: older servers don't send it
  level: LogLevel;
  category: string;
  message: string;
  /** Template the message was rendered from (`Charge failed for {invoice_id}`); null or absent when none. */
  message_template?: string | null;
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
  /** One app key, or several (any of them matches; needs features.multi_value_filters). */
  app_key?: string | string[];
  app_id?: string;
  user_agent?: string;
  /** One level, or several (any of them matches; needs features.multi_value_filters). */
  level?: LogLevel | LogLevel[];
  category?: string;
  trace_id?: string;
  batch_id?: string;
  date_from?: string;
  date_to?: string;
  /** Relative range ending now (e.g. `15m`, `90d`, `week`, `month`, `now`); replaces date_from/date_to. See lib/dateRange. */
  range?: string;
  search?: string;
  /** Exact message template: every entry logged from the same line, whatever its values. */
  message_template?: string;
  /** Context property path → value that must match (Find). */
  context?: Record<string, string>;
  /** Context property path → value that must not match (Exclude). */
  context_not?: Record<string, string>;
  /** Free text across all context keys and values (min. 3 characters). */
  context_search?: string;
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
  older_than_days?: number;
  cutoff_date?: string;
  app_key?: string;
  app_id?: string;
  level?: LogLevel;
  category?: string;
  message_regex?: string;
  message_glob?: string;
}

export interface RetentionRunResult {
  policy: string;
  pruned?: number;
  deleted?: number; // legacy support
  files_removed: number;
  files_rewritten: number;
  dry_run: boolean;
  duration_ms: number;
  summary: string;
  warnings?: string[];
  error?: string | null;
}

export interface RetentionRunResponse {
  ran_at?: string;
  policies?: RetentionRunResult[];
  total_pruned?: number;
  dry_run?: boolean; // legacy support
  policies_run?: number; // legacy support
  total_deleted?: number; // legacy support
  results?: RetentionRunResult[]; // legacy support
}

export interface RetentionVolumeTotals {
  count: number;
  bytes: number;
  due_count: number;
  due_bytes: number;
}

export interface RetentionVolumeBucket extends RetentionVolumeTotals {
  /** Local date of the entries' timestamps (YYYY-MM-DD). */
  date: string;
  /** Days before today; 0 = today. */
  age_days: number;
}

export interface RetentionVolumePolicy {
  name: string;
  older_than_days: number | null;
  /** False for a policy without criteria, which never deletes anything. */
  active: boolean;
  matched_count: number;
  matched_bytes: number;
  due_count: number;
  due_bytes: number;
  /** matched_count ÷ all stored entries, 0–1. */
  matched_share: number;
}

/**
 * On-disk size of the log table from information_schema.TABLES (MariaDB/MySQL
 * only). InnoDB statistics, so estimates; table-wide, not per day.
 */
export interface RetentionVolumeStorage {
  table: string;
  engine: string | null;
  /** DATA_LENGTH: rows, including InnoDB's clustered primary key. */
  data_bytes: number;
  /** INDEX_LENGTH: every secondary and full-text index. */
  index_bytes: number;
  /** DATA_FREE: allocated but unused, reclaimable by OPTIMIZE TABLE. */
  free_bytes: number;
  /** data_bytes + index_bytes. */
  total_bytes: number;
  rows_estimate: number;
}

export interface RetentionVolumeReport {
  generated_at: string;
  days: number;
  /** file = exact JSONL line sizes; payload = message + template + context length. */
  size_basis: 'file' | 'payload';
  /** One bucket per day, oldest first. */
  buckets: RetentionVolumeBucket[];
  older: RetentionVolumeTotals;
  future: RetentionVolumeTotals;
  policies: RetentionVolumePolicy[];
  totals: RetentionVolumeTotals;
  /** Data vs. index split of the table on disk; null in file storage, absent on older servers. */
  storage?: RetentionVolumeStorage | null;
}

export interface Client {
  name: string;
  app_key: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  api_token?: string; // Only returned on Create or Rotate
}

export interface ClientListResponse {
  clients: Client[];
}

export interface DeleteClientResponse {
  deleted: string;
  logs_deleted: number;
}
