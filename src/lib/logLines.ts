import { format } from 'date-fns';
import { LogEntry } from '../types';
import { logToMarkdown } from './logMarkdown';

/** How a set of selected events is put on the clipboard. */
export type CopyFormat = 'lines' | 'markdown' | 'json';

/** One event as a log-file line; continuation lines are indented so they stay with their event. */
export function logToLine(log: LogEntry): string {
  const timestamp = format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS');
  const source = log.app_key ? ` ${log.app_key}:` : '';
  const message = log.message.replaceAll(/\r?\n/g, '\n    ');
  return `${timestamp} [${log.level.toUpperCase()}]${source} ${message}`;
}

/** Oldest first, like a log file; the feed itself shows newest first. */
export function chronological(logs: LogEntry[]): LogEntry[] {
  return [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/** The selected events as clipboard text in the chosen format. */
export function logsToText(logs: LogEntry[], fmt: CopyFormat): string {
  const ordered = chronological(logs);
  switch (fmt) {
    case 'markdown':
      return ordered.map(logToMarkdown).join('\n\n---\n\n');
    case 'json':
      return JSON.stringify(ordered, null, 2);
    default:
      return ordered.map(logToLine).join('\n');
  }
}
