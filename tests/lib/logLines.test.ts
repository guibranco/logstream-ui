import { describe, it, expect } from 'vitest';
import { format } from 'date-fns';
import { logToLine, logsToText } from '@/src/lib/logLines';
import { LogEntry } from '@/src/types';

const entry = (id: string, timestamp: string, overrides: Partial<LogEntry> = {}): LogEntry => ({
  id,
  trace_id: '123e4567-e89b-12d3-a456-426614174000',
  batch_id: null,
  app_key: 'billing',
  app_id: 'api',
  user_agent: null,
  level: 'error',
  category: 'db',
  message: `Message ${id}`,
  context: null,
  timestamp,
  created_at: timestamp,
  ...overrides,
});

const local = (iso: string) => format(new Date(iso), 'yyyy-MM-dd HH:mm:ss.SSS');

describe('logToLine', () => {
  it('writes timestamp, level, app and message on one line', () => {
    const iso = '2026-11-14T18:25:03.123Z';
    expect(logToLine(entry('a', iso))).toBe(`${local(iso)} [ERROR] billing: Message a`);
  });

  it('indents continuation lines of a multi-line message', () => {
    const line = logToLine(entry('a', '2026-11-14T18:25:03.123Z', { message: 'first\r\nsecond\nthird' }));
    expect(line.split('\n')).toEqual([expect.stringContaining('first'), '    second', '    third']);
  });

  it('leaves the app out when the event has none', () => {
    expect(logToLine(entry('a', '2026-11-14T18:25:03.123Z', { app_key: '' }))).toMatch(/\[ERROR\] Message a$/);
  });
});

describe('logsToText', () => {
  // As the feed holds them: newest first.
  const logs = [
    entry('new', '2026-11-14T18:25:03.000Z'),
    entry('mid', '2026-11-14T18:20:00.000Z'),
    entry('old', '2026-11-14T18:10:00.000Z'),
  ];

  it('copies lines oldest first, like a log file', () => {
    const lines = logsToText(logs, 'lines').split('\n');
    expect(lines.map(l => l.split(': ')[1])).toEqual(['Message old', 'Message mid', 'Message new']);
  });

  it('copies Markdown with each event in full, separated by rules', () => {
    const md = logsToText(logs, 'markdown');
    expect(md.match(/## ERROR log event/g)).toHaveLength(3);
    expect(md.split('\n\n---\n\n')).toHaveLength(3);
    expect(md.indexOf('Message old')).toBeLessThan(md.indexOf('Message new'));
  });

  it('copies the raw events as a JSON array', () => {
    const parsed = JSON.parse(logsToText(logs, 'json'));
    expect(parsed.map((l: LogEntry) => l.id)).toEqual(['old', 'mid', 'new']);
  });

  it('does not reorder the array it was given', () => {
    logsToText(logs, 'lines');
    expect(logs.map(l => l.id)).toEqual(['new', 'mid', 'old']);
  });
});
