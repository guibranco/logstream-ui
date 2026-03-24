import React, { useState } from 'react';
import { LogEntry, SearchFilters } from '../types';
import { formatDistanceToNow, format } from 'date-fns';
import { LevelBadge } from './LevelBadge';
import { JsonViewer } from './JsonViewer';
import { ChevronDown, ChevronRight, Copy, Check, ExternalLink, Package } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LogRowProps {
  log: LogEntry;
  isLive?: boolean;
  onFilterBatch: (batchId: string) => void;
  onFilterTrace: (traceId: string) => void;
}

export const LogRow: React.FC<LogRowProps> = ({ log, isLive, onFilterBatch, onFilterTrace }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const timestamp = new Date(log.timestamp);

  return (
    <div className={cn(
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
        className="flex items-center px-4 h-12 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-32 flex-shrink-0 text-xs text-gray-500 group relative">
          <span title={log.timestamp}>
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </span>
          <div className="absolute hidden group-hover:block bg-gray-800 text-white p-1 rounded -top-8 left-0 z-10 whitespace-nowrap border border-gray-700">
            {format(timestamp, 'yyyy-MM-dd HH:mm:ss.SSS')}
          </div>
        </div>

        <div className="w-24 flex-shrink-0">
          <LevelBadge level={log.level} />
        </div>

        <div className="w-32 flex-shrink-0 text-xs font-mono text-sky-400 truncate px-2">
          {log.app_key}
        </div>

        <div className="w-24 flex-shrink-0 text-xs text-gray-400 truncate px-2">
          {log.app_id}
        </div>

        <div className="w-32 flex-shrink-0 text-xs text-gray-500 italic truncate px-2">
          {log.category}
        </div>

        <div className="flex-1 text-sm text-gray-200 truncate px-2 font-medium">
          {log.message}
        </div>

        <div className="w-32 flex-shrink-0 text-[10px] font-mono text-gray-600 flex items-center gap-1 group">
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

        <div className="w-10 flex-shrink-0 flex justify-center">
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
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Full Message</h4>
                    <p className="text-gray-100 whitespace-pre-wrap font-medium leading-relaxed bg-gray-900/50 p-4 rounded border border-gray-800">
                      {log.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">User Agent</h4>
                      <p className="text-xs text-gray-400 italic break-all">
                        {log.user_agent || 'N/A'}
                      </p>
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

                  <div className="flex gap-3 pt-2">
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
                      className="flex items-center gap-2 px-3 py-1.5 bg-sky-900/30 border border-sky-800/50 text-sky-400 text-xs font-bold rounded hover:bg-sky-900/50 transition-all"
                    >
                      <ExternalLink size={14} />
                      View trace
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Context</h4>
                  <div className="bg-gray-900/50 p-4 rounded border border-gray-800 max-h-[400px] overflow-auto">
                    <JsonViewer data={log.context} />
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
