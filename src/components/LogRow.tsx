import React, { useMemo, useState } from 'react';
import { LogEntry, LogLevel, SearchFilters } from '../types';
import { formatDistanceToNow, format } from 'date-fns';
import { LevelBadge } from './LevelBadge';
import { ContextProperties } from './ContextProperties';
import { ChevronDown, ChevronRight, Copy, Check, ExternalLink, Package, Filter, Bug, Tag, FileText } from 'lucide-react';
import { ExceptionDetails } from './ExceptionDetails';
import { parseException, withoutExceptionStacks } from '../lib/exception';
import { logToMarkdown } from '../lib/logMarkdown';
import { TemplatedMessage, TemplateText } from './TemplatedMessage';
import { cn } from '../lib/utils';
import { splitUrls } from '../lib/linkify';
import { motion, AnimatePresence } from 'motion/react';

interface LogRowProps {
  log: LogEntry;
  isLive?: boolean;
  onFilterBatch: (batchId: string) => void;
  onFilterTrace: (traceId: string) => void;
  onFilterContext: (path: string, value: string, exclude: boolean) => void;
  /** Show every entry logged from this message template. */
  onFilterTemplate?: (template: string) => void;
  /** Show every entry in this category. */
  onFilterCategory?: (category: string) => void;
  /** Controlled expansion; when omitted the row keeps its own state. */
  isExpanded?: boolean;
  onToggle?: (id: string) => void;
}

/** Dot before the message for the levels that need attention, as in Seq. */
const LEVEL_DOT: Partial<Record<LogLevel, { className: string; label: string }>> = {
  warning: { className: 'bg-yellow-400', label: 'Warning' },
  error: { className: 'bg-red-500', label: 'Error' },
  critical: { className: 'bg-purple-500', label: 'Critical' },
};

const LevelDot: React.FC<{ level: LogLevel }> = ({ level }) => {
  const dot = LEVEL_DOT[level];
  // The empty slot keeps every message starting at the same column.
  if (!dot) return <span className="w-2 h-2 flex-shrink-0" aria-hidden="true" />;
  return (
    <span
      className={cn('w-2 h-2 rounded-full flex-shrink-0', dot.className)}
      title={dot.label}
      data-testid="level-dot"
    >
      <span className="sr-only">{dot.label}</span>
    </span>
  );
};

export const LogRow: React.FC<LogRowProps> = ({
  log,
  isLive,
  onFilterBatch,
  onFilterTrace,
  onFilterContext,
  onFilterTemplate,
  onFilterCategory,
  isExpanded: expandedProp,
  onToggle,
}) => {
  const [expandedState, setExpandedState] = useState(false);
  const isExpanded = expandedProp ?? expandedState;
  const toggle = () => (onToggle ? onToggle(log.id) : setExpandedState(v => !v));
  const [copied, setCopied] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState<string | null>(null);

  /** Marks the button as copied only once the write succeeds; a denied clipboard shows as failed. */
  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFailed(null);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
      setCopyFailed(type);
      setTimeout(() => setCopyFailed(null), 2000);
    }
  };

  const timestamp = new Date(log.timestamp);
  const exception = useMemo(() => parseException(log.context), [log.context]);
  const contextProperties = useMemo(
    () => (exception ? withoutExceptionStacks(log.context) : log.context),
    [exception, log.context],
  );

  return (
    <div
      // Off-screen rows skip layout and paint, so long feeds stay cheap without windowing.
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 48px' }}
      className={cn(
      "border-b border-gray-900 transition-colors",
      isExpanded ? "bg-gray-900/50" : "hover:bg-gray-900/30",
      isLive && "border-l-2",
      isLive && {
        debug: 'border-l-gray-400',
        info: 'border-l-sky-400',
        notice: 'border-l-teal-400',
        warning: 'border-l-amber-400',
        error: 'border-l-rose-400',
        critical: 'border-l-fuchsia-400',
      }[log.level]
    )}>
      <div 
        className="flex flex-wrap md:flex-nowrap items-center gap-x-2 md:gap-x-0 gap-y-1 px-3 md:px-4 py-2 md:py-0 md:h-12 cursor-pointer select-none"
        onClick={toggle}
      >
        <div className="md:w-32 flex-shrink-0 text-xs text-gray-500 group relative">
          <span title={log.timestamp}>
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </span>
          <div className="absolute hidden group-hover:block bg-gray-800 text-gray-50 p-1 rounded -top-8 left-0 z-10 whitespace-nowrap border border-gray-700">
            {format(timestamp, 'yyyy-MM-dd HH:mm:ss.SSS')}
          </div>
        </div>

        <div className="md:w-24 flex-shrink-0">
          <LevelBadge level={log.level} />
        </div>

        <div className="min-w-0 flex-1 md:flex-none md:w-32 md:flex-shrink-0 text-xs font-mono text-secondary-400 truncate md:px-2">
          {log.app_key}
        </div>

        <div className="hidden md:block w-24 flex-shrink-0 text-xs text-gray-400 truncate px-2">
          {log.app_id}
        </div>

        <div className="hidden md:block w-32 flex-shrink-0 text-xs text-gray-500 italic truncate px-2">
          {log.category}
        </div>

        <div className="order-last md:order-none basis-full md:basis-auto flex-1 min-w-0 flex items-center gap-2 md:px-2">
          <LevelDot level={log.level} />
          <span className="min-w-0 text-sm text-gray-200 font-medium line-clamp-2 md:line-clamp-1 [overflow-wrap:anywhere]">
            <TemplatedMessage message={log.message} template={log.message_template} context={log.context} />
          </span>
          {exception && (
            <Bug size={14} className="flex-shrink-0 text-rose-400" aria-label="Has exception" data-testid="exception-indicator" />
          )}
        </div>

        <div className="hidden md:flex w-32 flex-shrink-0 text-[10px] font-mono text-gray-600 items-center gap-1 group">
          <span className="truncate">{log.trace_id.slice(0, 8)}…</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(log.trace_id, 'trace');
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-800 rounded transition-all"
          >
            {copied === 'trace' ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          </button>
        </div>

        <div className="md:w-10 flex-shrink-0 flex justify-center">
          {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-gray-950/50 border-t border-gray-900"
          >
            <div className="p-3 md:p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 min-w-0 space-y-4">
                  {/* The columns a phone has no room for. */}
                  <dl className="md:hidden grid grid-cols-2 gap-x-4 gap-y-3" data-testid="mobile-summary">
                    <div className="col-span-2">
                      <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Time</dt>
                      <dd className="text-xs font-mono text-gray-300">{format(timestamp, 'yyyy-MM-dd HH:mm:ss.SSS')}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">App ID</dt>
                      <dd className="text-xs font-mono text-gray-300 break-all">{log.app_id || 'N/A'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Trace ID</dt>
                      <dd className="flex items-start gap-1">
                        <span className="text-xs font-mono text-gray-300 break-all">{log.trace_id}</span>
                        <button
                          onClick={() => handleCopy(log.trace_id, 'trace')}
                          className="p-1 -mt-0.5 hover:bg-gray-800 rounded flex-shrink-0"
                          aria-label="Copy trace ID"
                        >
                          {copied === 'trace' ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-500" />}
                        </button>
                      </dd>
                    </div>
                  </dl>

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Full Message</h4>
                    <p className="text-gray-100 whitespace-pre-wrap [overflow-wrap:anywhere] font-medium leading-relaxed bg-gray-900/50 p-3 md:p-4 rounded border border-gray-800">
                      <TemplatedMessage message={log.message} template={log.message_template} context={log.context} />
                    </p>
                  </div>

                  {exception && <ExceptionDetails exception={exception} />}

                  {log.message_template && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Message Template</h4>
                      <div className="flex items-start gap-2 group">
                        <p
                          className="flex-1 min-w-0 text-xs font-mono text-gray-300 whitespace-pre-wrap break-words bg-gray-900/50 px-4 py-2 rounded border border-gray-800"
                          data-testid="message-template"
                        >
                          <TemplateText template={log.message_template} />
                        </p>
                        <button
                          onClick={() => handleCopy(log.message_template!, 'template')}
                          className="p-1 mt-1 hover:bg-gray-800 rounded transition-all"
                          aria-label="Copy message template"
                        >
                          {copied === 'template' ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-500" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Category</h4>
                      <div className="flex items-center gap-2 group">
                        <span className="text-xs font-mono text-gray-300 truncate" data-testid="category">
                          {log.category || 'N/A'}
                        </span>
                        {log.category && (
                          <button
                            onClick={() => handleCopy(log.category, 'category')}
                            className="p-1 hover:bg-gray-800 rounded transition-all"
                            aria-label="Copy category"
                          >
                            {copied === 'category' ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-500" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">User Agent</h4>
                      <p className="text-xs text-gray-400 italic break-all" data-testid="user-agent">
                        {log.user_agent
                          ? splitUrls(log.user_agent).map((segment, index) =>
                              segment.type === 'url' ? (
                                <a
                                  key={index}
                                  href={segment.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-secondary-400 underline hover:text-secondary-300"
                                >
                                  {segment.value}
                                </a>
                              ) : (
                                <React.Fragment key={index}>{segment.value}</React.Fragment>
                              ),
                            )
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Sender IP</h4>
                      <div className="flex items-center gap-2 group">
                        <span className="text-xs font-mono text-gray-300 truncate" data-testid="sender-ip">
                          {log.sender_ip || 'N/A'}
                        </span>
                        {log.sender_ip && (
                          <button
                            onClick={() => handleCopy(log.sender_ip!, 'ip')}
                            className="p-1 hover:bg-gray-800 rounded transition-all"
                            aria-label="Copy sender IP"
                          >
                            {copied === 'ip' ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-500" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Batch ID</h4>
                      <div className="flex items-center gap-2 group">
                        <span className="text-xs font-mono text-amber-400 truncate">
                          {log.batch_id || 'N/A'}
                        </span>
                        {log.batch_id && (
                          <button 
                            onClick={() => handleCopy(log.batch_id!, 'batch')}
                            className="p-1 hover:bg-gray-800 rounded transition-all"
                          >
                            {copied === 'batch' ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-500" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:gap-3 pt-2">
                    <button
                      onClick={() => handleCopy(logToMarkdown(log), 'markdown')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-gray-700 text-gray-300 text-xs font-bold rounded hover:bg-gray-800 transition-all"
                      title="Copy the whole event (message, exception, context) as Markdown, e.g. to paste into an AI agent"
                      data-testid="copy-markdown"
                    >
                      {copied === 'markdown' ? <Check size={14} className="text-green-500" /> : <FileText size={14} />}
                      {copied === 'markdown' && 'Copied!'}
                      {copyFailed === 'markdown' && 'Copy failed'}
                      {copied !== 'markdown' && copyFailed !== 'markdown' && 'Copy as Markdown'}
                    </button>
                    {log.batch_id && (
                      <button 
                        onClick={() => onFilterBatch(log.batch_id!)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/30 border border-amber-800/50 text-amber-400 text-xs font-bold rounded hover:bg-amber-900/50 transition-all"
                      >
                        <Package size={14} />
                        View all in batch
                      </button>
                    )}
                    <button 
                      onClick={() => onFilterTrace(log.trace_id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-secondary-900/30 border border-secondary-800/50 text-secondary-400 text-xs font-bold rounded hover:bg-secondary-900/50 transition-all"
                    >
                      <ExternalLink size={14} />
                      View trace
                    </button>
                    {log.category && onFilterCategory && (
                      <button
                        onClick={() => onFilterCategory(log.category)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-gray-700 text-gray-300 text-xs font-bold rounded hover:bg-gray-800 transition-all"
                      >
                        <Tag size={14} />
                        View all in category
                      </button>
                    )}
                    {log.message_template && onFilterTemplate && (
                      <button
                        onClick={() => onFilterTemplate(log.message_template!)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-sky-900/30 border border-sky-800/50 text-sky-400 text-xs font-bold rounded hover:bg-sky-900/50 transition-all"
                      >
                        <Filter size={14} />
                        View all with this template
                      </button>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Context</h4>
                  <div className="bg-gray-900/50 p-3 rounded border border-gray-800 max-h-[400px] overflow-auto">
                    <ContextProperties
                      context={contextProperties}
                      onFind={(path, value) => onFilterContext(path, value, false)}
                      onExclude={(path, value) => onFilterContext(path, value, true)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
