import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Braces, Check, Copy, FileText, X } from 'lucide-react';
import { CopyFormat } from '../lib/logLines';
import { cn } from '../lib/utils';

/** The last copy: which format, and whether the clipboard accepted it. */
export interface CopyResult {
  format: CopyFormat;
  ok: boolean;
  count: number;
}

interface SelectionBarProps {
  count: number;
  lastCopy: CopyResult | null;
  onCopy: (format: CopyFormat) => void;
  onClear: () => void;
}

const ACTIONS: { format: CopyFormat; label: string; icon: React.ElementType; title: string }[] = [
  { format: 'lines', label: 'Copy lines', icon: Copy, title: 'One line per event, oldest first (Ctrl/⌘+C)' },
  { format: 'markdown', label: 'Markdown', icon: FileText, title: 'Every event in full as Markdown, e.g. for an AI agent or an issue' },
  { format: 'json', label: 'JSON', icon: Braces, title: 'The raw events as a JSON array' },
];

const label = (action: (typeof ACTIONS)[number], lastCopy: CopyResult | null): string => {
  if (lastCopy?.format !== action.format) return action.label;
  if (!lastCopy.ok) return 'Copy failed';
  return `Copied ${lastCopy.count}`;
};

/** Floating actions for the selected events; slides in once something is selected. */
export const SelectionBar: React.FC<SelectionBarProps> = ({ count, lastCopy, onCopy, onClear }) => (
  <AnimatePresence>
    {count > 0 && (
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 36 }}
        role="toolbar"
        aria-label="Selected events"
        data-testid="selection-bar"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 pl-4 pr-1.5 py-1.5 max-w-[calc(100%-1.5rem)] rounded-full bg-gray-900/95 backdrop-blur border border-gray-700 shadow-2xl shadow-black/40 text-xs"
      >
        <span className="font-medium text-gray-200 whitespace-nowrap mr-2" aria-live="polite" data-testid="selection-count">
          <span className="font-mono text-secondary-300">{count}</span> selected
        </span>
        {ACTIONS.map(action => {
          const isLast = lastCopy?.format === action.format;
          const Icon = isLast && lastCopy.ok ? Check : action.icon;
          return (
            <button
              key={action.format}
              onClick={() => onCopy(action.format)}
              title={action.title}
              data-testid={`copy-selected-${action.format}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-colors',
                action.format === 'lines'
                  ? 'bg-secondary-600 text-white hover:bg-secondary-500'
                  : 'text-gray-300 hover:bg-gray-800',
                isLast && !lastCopy.ok && 'text-rose-300',
              )}
            >
              <Icon size={14} className={cn(isLast && lastCopy.ok && action.format !== 'lines' && 'text-green-500')} />
              <span className={cn(action.format !== 'lines' && !isLast && 'hidden sm:inline')}>{label(action, lastCopy)}</span>
            </button>
          );
        })}
        <button
          onClick={onClear}
          title="Clear selection (Esc)"
          aria-label="Clear selection"
          className="ml-1 p-1.5 rounded-full text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
        >
          <X size={14} />
        </button>
      </motion.div>
    )}
  </AnimatePresence>
);
