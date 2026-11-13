import { LogEntry } from '../types';
import { exceptionToText, parseException, withoutExceptionStacks } from './exception';

/**
 * A fenced code block that survives any content: the fence is one backtick
 * longer than the longest run of backticks inside it.
 */
export function fence(content: string, lang = ''): string {
  const longest = Math.max(0, ...(content.match(/`+/g) ?? []).map(run => run.length));
  const ticks = '`'.repeat(Math.max(3, longest + 1));
  return `${ticks}${lang}\n${content.trimEnd()}\n${ticks}`;
}

/** A value made safe for one table cell: pipes escaped, line breaks flattened. */
const cell = (value: string): string => value.replaceAll('|', String.raw`\|`).replaceAll(/\r?\n/g, '<br>');

/** Inline code that survives backticks in the value. */
const code = (value: string): string => {
  const longest = Math.max(0, ...(value.match(/`+/g) ?? []).map(run => run.length));
  const ticks = '`'.repeat(longest + 1);
  const pad = value.startsWith('`') || value.endsWith('`') ? ' ' : '';
  return `${ticks}${pad}${value}${pad}${ticks}`;
};

/**
 * The whole event as Markdown, ready to paste into an AI agent or an issue:
 * a summary table, the message, the exception with its stack trace and the
 * context as JSON.
 */
export function logToMarkdown(log: LogEntry): string {
  const exception = parseException(log.context);
  const context = exception ? withoutExceptionStacks(log.context) : log.context;

  const rows: [string, string | null | undefined, boolean][] = [
    ['Timestamp', log.timestamp, false],
    ['Level', log.level.toUpperCase(), false],
    ['App key', log.app_key, true],
    ['App ID', log.app_id, true],
    ['Category', log.category, true],
    ['Trace ID', log.trace_id, true],
    ['Batch ID', log.batch_id, true],
    ['Event ID', log.id, true],
    ['Sender IP', log.sender_ip, true],
    ['User agent', log.user_agent, false],
  ];

  const source = log.app_key ? ` from ${code(log.app_key)}` : '';
  const sections: string[] = [
    `## ${log.level.toUpperCase()} log event${source}`,
    [
      '| Field | Value |',
      '| --- | --- |',
      ...rows
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([label, value, asCode]) => `| ${label} | ${cell(asCode ? code(value!) : value!)} |`),
    ].join('\n'),
    `### Message\n\n${fence(log.message, 'text')}`,
  ];

  if (log.message_template) {
    sections.push(`### Message template\n\n${fence(log.message_template, 'text')}`);
  }

  if (exception) {
    sections.push(`### Exception\n\n${fence(exceptionToText(exception), 'text')}`);
  }

  if (context && Object.keys(context).length > 0) {
    sections.push(`### Context\n\n${fence(JSON.stringify(context, null, 2), 'json')}`);
  }

  return `${sections.join('\n\n')}\n`;
}
