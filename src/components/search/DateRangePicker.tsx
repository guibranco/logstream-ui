import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RANGE_PRESETS, describeRange, toLocalInput } from '../../lib/dateRange';

/** The date part of the filters: a relative range, or absolute from/to. */
export interface DateRangeValue {
  range?: string;
  date_from?: string;
  date_to?: string;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  /** Called with the new range, applied straight away. */
  onChange: (value: DateRangeValue) => void;
}

const formatShort = (d: Date) => format(d, 'dd MMM HH:mm');

const inputClass =
  'w-full bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-secondary-500 text-gray-300';

/**
 * Seq-style range picker: quick relative windows ("Last 15 minutes") or a
 * custom from/to. Relative windows keep following new events; they are
 * re-evaluated against the current time on every load.
 */
export const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  // Prefill the custom inputs from what is applied when the panel opens.
  // Primitive deps: the parent passes a new object on every render, and
  // re-running this while the user types would wipe their input.
  const { range, date_from: appliedFrom, date_to: appliedTo } = value;
  useEffect(() => {
    if (!open) return;
    setFrom(range ? '' : appliedFrom ?? '');
    setTo(range ? '' : appliedTo ?? '');
  }, [open, range, appliedFrom, appliedTo]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const apply = (next: DateRangeValue) => {
    onChange(next);
    setOpen(false);
  };

  const hasRange = !!(value.range || value.date_from || value.date_to);
  const customInvalid = !!from && !!to && new Date(from) > new Date(to);

  return (
    <div ref={rootRef} className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="date-range-button"
        className={cn(
          'flex items-center gap-2 px-3 py-1 rounded border text-xs font-medium transition-colors',
          hasRange
            ? 'bg-secondary-900/40 border-secondary-700 text-secondary-300'
            : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700',
        )}
      >
        <CalendarClock size={14} />
        {describeRange(value, formatShort)}
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {hasRange && (
        <button
          type="button"
          onClick={() => apply({})}
          className="p-1 rounded text-gray-500 hover:text-gray-200 hover:bg-gray-800"
          aria-label="Clear date range"
          title="Any time"
        >
          <X size={12} />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Date range"
          className="absolute left-0 top-full mt-2 z-50 w-[22rem] max-w-[calc(100vw-2rem)] p-3 rounded-lg border border-gray-800 bg-gray-900 shadow-xl space-y-3"
        >
          <div className="grid grid-cols-2 gap-1">
            {RANGE_PRESETS.map(preset => (
              <button
                key={preset.key}
                type="button"
                onClick={() => apply({ range: preset.key })}
                className={cn(
                  'text-left px-2 py-1.5 rounded text-xs transition-colors',
                  value.range === preset.key
                    ? 'bg-secondary-900/60 text-secondary-300'
                    : 'text-gray-300 hover:bg-gray-800',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-800 pt-3 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Custom range</div>
            <label className="block text-xs text-gray-500">
              From
              <input
                type="datetime-local"
                value={from}
                onChange={e => setFrom(e.target.value)}
                aria-label="From"
                className={inputClass}
              />
            </label>
            <label className="block text-xs text-gray-500">
              To <span className="text-gray-600">(empty = now, keeps following)</span>
              <input
                type="datetime-local"
                value={to}
                onChange={e => setTo(e.target.value)}
                aria-label="To"
                className={inputClass}
              />
            </label>
            {customInvalid && <p className="text-xs text-rose-400" role="alert">“From” is after “To”.</p>}
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setTo(toLocalInput(new Date()))}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Set “To” to now
              </button>
              <button
                type="button"
                disabled={(!from && !to) || customInvalid}
                onClick={() => apply({ date_from: from || undefined, date_to: to || undefined })}
                className="px-3 py-1 rounded text-xs font-medium bg-secondary-600 hover:bg-secondary-500 text-white disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
