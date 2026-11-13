import { describe, it, expect } from 'vitest';
import { fence, logToMarkdown } from '@/src/lib/logMarkdown';
import { LogEntry } from '@/src/types';

const log: LogEntry = {
  id: '01HZY0000000000000000000000',
  trace_id: '123e4567-e89b-12d3-a456-426614174000',
  batch_id: null,
  app_key: 'billing-api',
  app_id: 'worker',
  user_agent: 'MyBot/2.0',
  sender_ip: '203.0.113.42',
  level: 'error',
  category: 'payments',
  message: 'Charge failed for INV-1',
  message_template: 'Charge failed for {invoice_id}',
  context: null,
  timestamp: '2026-11-13T11:00:00.000Z',
  created_at: '2026-11-13T11:00:00.000Z',
};

describe('fence', () => {
  it('uses three backticks for plain content', () => {
    expect(fence('hello', 'text')).toBe('```text\nhello\n```');
  });

  it('outgrows backtick runs inside the content', () => {
    expect(fence('a ```js``` b')).toBe('````\na ```js``` b\n````');
  });
});

describe('logToMarkdown', () => {
  it('lists the fields, message and template', () => {
    const md = logToMarkdown(log);
    expect(md).toContain('## ERROR log event from `billing-api`');
    expect(md).toContain('| Level | ERROR |');
    expect(md).toContain('| Trace ID | `123e4567-e89b-12d3-a456-426614174000` |');
    expect(md).toContain('| Sender IP | `203.0.113.42` |');
    expect(md).toContain('### Message\n\n```text\nCharge failed for INV-1\n```');
    expect(md).toContain('### Message template\n\n```text\nCharge failed for {invoice_id}\n```');
    expect(md).not.toContain('Batch ID');
    expect(md).not.toContain('### Exception');
    expect(md).not.toContain('### Context');
  });

  it('includes the exception with its stack and the context without the stack', () => {
    const md = logToMarkdown({
      ...log,
      context: {
        invoice_id: 'INV-1',
        exception: {
          type: 'System.InvalidOperationException',
          message: 'Charge failed',
          stack_trace: '   at Billing.Charge() in /src/Billing.cs:line 42',
        },
      },
    });
    expect(md).toContain(
      '### Exception\n\n```text\nSystem.InvalidOperationException: Charge failed\n   at Billing.Charge() in /src/Billing.cs:line 42\n```',
    );
    const context = md.split('### Context\n\n```json\n')[1].split('\n```')[0];
    expect(JSON.parse(context)).toEqual({
      invoice_id: 'INV-1',
      exception: { type: 'System.InvalidOperationException', message: 'Charge failed' },
    });
  });

  it('keeps table cells on one line and escapes pipes', () => {
    const md = logToMarkdown({ ...log, user_agent: 'a|b\nc' });
    expect(md).toContain('| User agent | a\\|b<br>c |');
  });
});
