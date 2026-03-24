import React, { useMemo } from 'react';
import { LogEntry, LogLevel } from '../types';
import { X, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface StatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'bg-gray-400',
  info: 'bg-sky-400',
  notice: 'bg-teal-400',
  warning: 'bg-amber-400',
  error: 'bg-rose-400',
  critical: 'bg-fuchsia-400',
};

export const StatsDrawer: React.FC<StatsDrawerProps> = ({ isOpen, onClose, logs }) => {
  const stats = useMemo(() => {
    const counts: Record<LogLevel, number> = {
      debug: 0, info: 0, notice: 0, warning: 0, error: 0, critical: 0
    };
    const appKeys: Record<string, number> = {};

    logs.forEach(log => {
      counts[log.level]++;
      appKeys[log.app_key] = (appKeys[log.app_key] || 0) + 1;
    });

    const topAppKeys = Object.entries(appKeys)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { counts, topAppKeys, total: logs.length };
  }, [logs]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-gray-950 border-l border-gray-800 z-[70] shadow-2xl p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-gray-100">
                <BarChart3 size={20} className="text-sky-400" />
                <h2 className="text-lg font-bold">Live Statistics</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-900 rounded transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8">
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-4">Entries by Level</h3>
                <div className="space-y-4">
                  {(Object.keys(stats.counts) as LogLevel[]).map(level => {
                    const count = stats.counts[level];
                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    return (
                      <div key={level} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize text-gray-400">{level}</span>
                          <span className="font-mono text-gray-200">{count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className={cn("h-full rounded-full", LEVEL_COLORS[level])}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-4">Top App Keys</h3>
                <div className="space-y-3">
                  {stats.topAppKeys.map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between bg-gray-900/50 p-2 rounded border border-gray-900">
                      <span className="text-xs font-mono text-sky-400 truncate flex-1 mr-2">{key}</span>
                      <span className="text-xs font-bold text-gray-500">{count}</span>
                    </div>
                  ))}
                  {stats.topAppKeys.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No data yet</p>
                  )}
                </div>
              </section>

              <section className="pt-4 border-t border-gray-900">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Total session entries</span>
                  <span className="text-lg font-bold text-gray-100 font-mono">{stats.total}</span>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
