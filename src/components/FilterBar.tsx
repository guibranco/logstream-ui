import React, { useState, useEffect } from 'react';
import { SearchFilters, LogLevel } from '../types';
import { Search, RotateCcw, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  ContextRow,
  contextFilterErrors,
  filtersToRows,
  rowsToFilters,
  withoutContextFilter,
} from '../lib/contextProperties';
import { ContextSearchInput } from './search/ContextSearchInput';
import { ContextKeyValueFilter } from './search/ContextKeyValueFilter';

interface FilterBarProps {
  filters: SearchFilters;
  onSearch: (filters: SearchFilters) => void;
  /** From GET /api/info; adjusts the context search hint. */
  storageType?: 'file' | 'mariadb';
}

const LEVELS: LogLevel[] = ['debug', 'info', 'notice', 'warning', 'error', 'critical'];

const hasContextFilters = (f: SearchFilters) =>
  !!f.context_search || Object.keys(f.context ?? {}).length > 0 || Object.keys(f.context_not ?? {}).length > 0;

export const FilterBar: React.FC<FilterBarProps> = ({ filters: initialFilters, onSearch, storageType }) => {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(initialFilters);
  const [contextRows, setContextRows] = useState<ContextRow[]>(() => filtersToRows(initialFilters));
  const [advancedOpen, setAdvancedOpen] = useState(() => hasContextFilters(initialFilters));

  useEffect(() => {
    setLocalFilters(initialFilters);
    setContextRows(filtersToRows(initialFilters));
    if (hasContextFilters(initialFilters)) setAdvancedOpen(true);
  }, [initialFilters]);

  const errors = contextFilterErrors(contextRows, localFilters.context_search);
  const activeAdvanced = contextRows.filter(r => r.key.trim() && r.value).length
    + (localFilters.context_search?.trim() ? 1 : 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({ ...prev, [name]: value }));
  };

  const toggleLevel = (level: LogLevel) => {
    setLocalFilters(prev => ({
      ...prev,
      level: prev.level === level ? undefined : level
    }));
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {};
    setLocalFilters(resetFilters);
    onSearch(resetFilters);
  };

  // Chips show what is applied, not what is being edited.
  const contextChips = [
    ...Object.entries(initialFilters.context ?? {}).map(([path, value]) => ({ path, value, exclude: false })),
    ...Object.entries(initialFilters.context_not ?? {}).map(([path, value]) => ({ path, value, exclude: true })),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.length > 0) return;

    const term = localFilters.context_search?.trim();
    onSearch({
      ...localFilters,
      ...rowsToFilters(contextRows),
      context_search: term ? term : undefined,
    });
  };

  return (
    <div className="sticky top-[57px] z-40 bg-gray-900 border-b border-gray-800 p-4 shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              name="search"
              placeholder="Search message text..."
              value={localFilters.search || ''}
              onChange={handleChange}
              className="w-full bg-gray-950 border border-gray-800 rounded px-10 py-2 text-sm focus:outline-none focus:border-secondary-500 transition-colors"
            />
          </div>

          <input
            type="text"
            name="app_key"
            placeholder="App Key"
            value={localFilters.app_key || ''}
            onChange={handleChange}
            className="bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary-500"
          />

          <input
            type="text"
            name="app_id"
            placeholder="App ID"
            value={localFilters.app_id || ''}
            onChange={handleChange}
            className="bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary-500"
          />

          <input
            type="text"
            name="category"
            placeholder="Category"
            value={localFilters.category || ''}
            onChange={handleChange}
            className="bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary-500"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={errors.length > 0}
              title={errors.length > 0 ? errors.join('\n') : undefined}
              className="flex-1 bg-secondary-600 hover:bg-secondary-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded transition-colors flex items-center justify-center gap-2"
            >
              <Search size={16} />
              Search
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded transition-colors"
              title="Reset filters"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {LEVELS.map(level => (
              <button
                key={level}
                type="button"
                onClick={() => toggleLevel(level)}
                className={cn(
                  "px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border transition-all",
                  localFilters.level === level
                    ? "bg-secondary-900 border-secondary-500 text-secondary-400"
                    : "bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700"
                )}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-800 hidden lg:block" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">From:</span>
            <input
              type="datetime-local"
              name="date_from"
              value={localFilters.date_from || ''}
              onChange={handleChange}
              className="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-secondary-500 text-gray-300"
            />
            <span className="text-xs text-gray-500 font-medium">To:</span>
            <input
              type="datetime-local"
              name="date_to"
              value={localFilters.date_to || ''}
              onChange={handleChange}
              className="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-secondary-500 text-gray-300"
            />
          </div>

          <div className="h-6 w-px bg-gray-800 hidden lg:block" />

          <div className="flex gap-2 flex-1 lg:flex-none">
            <input
              type="text"
              name="trace_id"
              placeholder="Trace ID"
              value={localFilters.trace_id || ''}
              onChange={handleChange}
              className="flex-1 lg:w-40 bg-gray-950 border border-gray-800 rounded px-3 py-1 text-xs focus:outline-none focus:border-secondary-500"
            />
            <input
              type="text"
              name="batch_id"
              placeholder="Batch ID"
              value={localFilters.batch_id || ''}
              onChange={handleChange}
              className="flex-1 lg:w-40 bg-gray-950 border border-gray-800 rounded px-3 py-1 text-xs focus:outline-none focus:border-secondary-500"
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen(open => !open)}
            aria-expanded={advancedOpen}
            aria-controls="advanced-filters"
            className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-200"
          >
            <SlidersHorizontal size={14} />
            Advanced filters
            {activeAdvanced > 0 && (
              <span className="px-1.5 rounded-full bg-secondary-900 text-secondary-300 text-[10px] font-bold">
                {activeAdvanced}
              </span>
            )}
            <ChevronDown size={14} className={cn('transition-transform', advancedOpen && 'rotate-180')} />
          </button>

          {advancedOpen && (
            <div id="advanced-filters" className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-6 p-3 rounded border border-gray-800 bg-gray-950/40">
              <ContextSearchInput
                value={localFilters.context_search ?? ''}
                onChange={value => setLocalFilters(prev => ({ ...prev, context_search: value }))}
                storageType={storageType}
              />
              <ContextKeyValueFilter rows={contextRows} onChange={setContextRows} />

              {errors.length > 0 && (
                <ul className="lg:col-span-2 text-xs text-rose-400 space-y-0.5" role="alert">
                  {errors.map(err => <li key={err}>{err}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        {(contextChips.length > 0 || initialFilters.context_search) && (
          <div className="flex flex-wrap items-center gap-2" data-testid="context-filters">
            <span className="text-xs text-gray-500 font-medium">Context:</span>
            {initialFilters.context_search && (
              <span className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded border text-xs font-mono bg-violet-950/40 border-violet-900 text-violet-300">
                contains “{initialFilters.context_search}”
                <button
                  type="button"
                  onClick={() => onSearch({ ...initialFilters, context_search: undefined })}
                  className="p-0.5 rounded hover:bg-gray-800"
                  aria-label="Remove context search"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {contextChips.map(({ path, value, exclude }) => (
              <span
                key={`${exclude ? '!' : ''}${path}`}
                className={cn(
                  "flex items-center gap-1 pl-2 pr-1 py-0.5 rounded border text-xs font-mono",
                  exclude
                    ? "bg-rose-950/40 border-rose-900 text-rose-300"
                    : "bg-secondary-950/40 border-secondary-900 text-secondary-300"
                )}
              >
                {path} {exclude ? '≠' : '='} {value}
                <button
                  type="button"
                  onClick={() => onSearch(withoutContextFilter(initialFilters, path, exclude))}
                  className="p-0.5 rounded hover:bg-gray-800"
                  aria-label={`Remove context filter ${path}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </form>
    </div>
  );
};
