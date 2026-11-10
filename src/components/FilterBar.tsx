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
import { DateRangePicker, DateRangeValue } from './search/DateRangePicker';
import { AppKeyOption, AppKeyPicker } from './search/AppKeyPicker';
import { asList, fromList, toggleValue } from '../lib/multiValue';
import { TemplateText } from './TemplatedMessage';

interface FilterBarProps {
  filters: SearchFilters;
  onSearch: (filters: SearchFilters) => void;
  /** From GET /api/info; adjusts the context search hint. */
  storageType?: 'file' | 'mariadb';
  /** The server accepts several levels / app keys at once (features.multi_value_filters). */
  multiValue?: boolean;
  /** Applications offered in the app picker. */
  appKeyOptions?: AppKeyOption[];
}

const LEVELS: LogLevel[] = ['debug', 'info', 'notice', 'warning', 'error', 'critical'];

const hasContextFilters = (f: SearchFilters) =>
  !!f.message_template || !!f.context_search || Object.keys(f.context ?? {}).length > 0 || Object.keys(f.context_not ?? {}).length > 0;

export const FilterBar: React.FC<FilterBarProps> = ({
  filters: initialFilters,
  onSearch,
  storageType,
  multiValue = false,
  appKeyOptions = [],
}) => {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(initialFilters);
  const [contextRows, setContextRows] = useState<ContextRow[]>(() => filtersToRows(initialFilters));
  const [advancedOpen, setAdvancedOpen] = useState(() => hasContextFilters(initialFilters));
  // On phones only the message search shows until the filters are opened.
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsible = mobileOpen ? undefined : 'max-md:hidden';

  useEffect(() => {
    setLocalFilters(initialFilters);
    setContextRows(filtersToRows(initialFilters));
    if (hasContextFilters(initialFilters)) setAdvancedOpen(true);
  }, [initialFilters]);

  const errors = contextFilterErrors(contextRows, localFilters.context_search);
  const activeAdvanced = contextRows.filter(r => r.key.trim() && r.value).length
    + (localFilters.context_search?.trim() ? 1 : 0)
    + (localFilters.message_template ? 1 : 0);
  // Applied filters besides the message search and the time window, shown on the phone toggle.
  const appliedCount = [
    asList(initialFilters.level).length > 0,
    asList(initialFilters.app_key).length > 0,
    !!initialFilters.app_id,
    !!initialFilters.category,
    !!initialFilters.trace_id,
    !!initialFilters.batch_id,
    !!initialFilters.message_template,
    !!initialFilters.context_search,
    Object.keys(initialFilters.context ?? {}).length > 0,
    Object.keys(initialFilters.context_not ?? {}).length > 0,
  ].filter(Boolean).length;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalFilters(prev => ({ ...prev, [name]: value }));
  };

  // Like Seq, levels and apps apply as soon as they are picked, keeping the other applied filters.
  const applyNow = (changes: Partial<SearchFilters>) => {
    setLocalFilters(prev => ({ ...prev, ...changes }));
    onSearch({ ...initialFilters, ...changes });
  };

  const selectedLevels = asList(initialFilters.level);

  const toggleLevel = (level: LogLevel) => {
    let next = toggleValue(selectedLevels, level);
    // Without server support for lists, a level replaces the previous one.
    if (!multiValue) next = next.filter(l => l === level);
    applyNow({ level: fromList(next) });
  };

  // Reset clears what is searched for, not the time window (as in Seq).
  const handleReset = () => {
    const resetFilters: SearchFilters = {
      range: initialFilters.range,
      date_from: initialFilters.date_from,
      date_to: initialFilters.date_to,
    };
    setLocalFilters(resetFilters);
    onSearch(resetFilters);
  };

  // Chips show what is applied, not what is being edited.
  const contextChips = [
    ...Object.entries(initialFilters.context ?? {}).map(([path, value]) => ({ path, value, exclude: false })),
    ...Object.entries(initialFilters.context_not ?? {}).map(([path, value]) => ({ path, value, exclude: true })),
  ];

  // Like Seq, picking a range applies it at once, keeping the other applied filters.
  const applyDateRange = (range: DateRangeValue) => {
    const next: SearchFilters = {
      ...initialFilters,
      range: range.range,
      date_from: range.date_from,
      date_to: range.date_to,
    };
    setLocalFilters(prev => ({ ...prev, range: range.range, date_from: range.date_from, date_to: range.date_to }));
    onSearch(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.length > 0) return;

    setMobileOpen(false);
    const term = localFilters.context_search?.trim();
    onSearch({
      ...localFilters,
      ...rowsToFilters(contextRows),
      context_search: term ? term : undefined,
    });
  };

  return (
    <div
      className={cn(
        "sticky top-[57px] z-40 bg-gray-900 border-b border-gray-800 p-3 md:p-4 shadow-lg",
        // Opened on a phone, the filters scroll on their own and leave room for the events.
        mobileOpen && "max-md:max-h-[65dvh] max-md:overflow-y-auto",
      )}
      data-testid="filter-bar"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
          <div className="col-span-2 flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                name="search"
                placeholder="Search message text..."
                value={localFilters.search || ''}
                onChange={handleChange}
                enterKeyHint="search"
                className="w-full bg-gray-950 border border-gray-800 rounded px-10 py-2 text-sm focus:outline-none focus:border-secondary-500 transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(open => !open)}
              aria-expanded={mobileOpen}
              aria-controls="filter-fields"
              data-testid="mobile-filters-toggle"
              className={cn(
                "md:hidden flex-shrink-0 flex items-center gap-1.5 px-3 rounded border text-xs font-medium transition-colors",
                mobileOpen || appliedCount > 0
                  ? "bg-secondary-900/40 border-secondary-700 text-secondary-300"
                  : "bg-gray-950 border-gray-800 text-gray-400",
              )}
            >
              <SlidersHorizontal size={14} />
              Filters
              {appliedCount > 0 && (
                <span className="px-1.5 rounded-full bg-secondary-900 text-secondary-300 text-[10px] font-bold">
                  {appliedCount}
                </span>
              )}
              <ChevronDown size={14} className={cn('transition-transform', mobileOpen && 'rotate-180')} />
            </button>
          </div>

          <div className={cn("col-span-2 md:col-span-1", collapsible)}>
            <AppKeyPicker
              selected={asList(initialFilters.app_key)}
              options={appKeyOptions}
              multiple={multiValue}
              onChange={keys => applyNow({ app_key: fromList(keys) })}
            />
          </div>

          <input
            type="text"
            name="app_id"
            placeholder="App ID"
            value={localFilters.app_id || ''}
            onChange={handleChange}
            className={cn("min-w-0 bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary-500", collapsible)}
          />

          <input
            type="text"
            name="category"
            placeholder="Category"
            value={localFilters.category || ''}
            onChange={handleChange}
            className={cn("min-w-0 bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-secondary-500", collapsible)}
          />

          <div className={cn("col-span-2 md:col-span-1 flex gap-2", collapsible)}>
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

        <div id="filter-fields" className={cn("flex flex-wrap items-center gap-3 md:gap-4", collapsible)}>
          <div
            className="flex flex-wrap gap-2"
            title={multiValue ? 'Pick one or more levels' : 'This server filters one level at a time'}
          >
            {LEVELS.map(level => (
              <button
                key={level}
                type="button"
                onClick={() => toggleLevel(level)}
                aria-pressed={selectedLevels.includes(level)}
                className={cn(
                  "px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border transition-all",
                  selectedLevels.includes(level)
                    ? "bg-secondary-900 border-secondary-500 text-secondary-400"
                    : "bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700"
                )}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-800 hidden lg:block" />

          <DateRangePicker
            value={{ range: initialFilters.range, date_from: initialFilters.date_from, date_to: initialFilters.date_to }}
            onChange={applyDateRange}
          />

          <div className="h-6 w-px bg-gray-800 hidden lg:block" />

          <div className="flex gap-2 w-full md:w-auto md:flex-1 lg:flex-none">
            <input
              type="text"
              name="trace_id"
              placeholder="Trace ID"
              value={localFilters.trace_id || ''}
              onChange={handleChange}
              className="flex-1 min-w-0 lg:w-40 bg-gray-950 border border-gray-800 rounded px-3 py-1 text-xs focus:outline-none focus:border-secondary-500"
            />
            <input
              type="text"
              name="batch_id"
              placeholder="Batch ID"
              value={localFilters.batch_id || ''}
              onChange={handleChange}
              className="flex-1 min-w-0 lg:w-40 bg-gray-950 border border-gray-800 rounded px-3 py-1 text-xs focus:outline-none focus:border-secondary-500"
            />
          </div>
        </div>

        <div className={collapsible}>
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

              <div className="lg:col-span-2 flex flex-col gap-1">
                <label htmlFor="filter-message-template" className="text-xs font-medium text-gray-400">
                  Message template
                </label>
                <input
                  id="filter-message-template"
                  type="text"
                  name="message_template"
                  placeholder="Charge failed for invoice #{invoice_id}"
                  value={localFilters.message_template || ''}
                  onChange={handleChange}
                  aria-describedby="filter-message-template-hint"
                  className="bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-secondary-500"
                />
                <span id="filter-message-template-hint" className="text-[11px] text-gray-500">
                  Exact match: every event logged from this template, whatever its values.
                </span>
              </div>

              {errors.length > 0 && (
                <ul className="lg:col-span-2 text-xs text-rose-400 space-y-0.5" role="alert">
                  {errors.map(err => <li key={err}>{err}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        {initialFilters.message_template && (
          <div className="flex flex-wrap items-center gap-2" data-testid="template-filter">
            <span className="text-xs text-gray-500 font-medium">Template:</span>
            <span className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded border text-xs font-mono bg-sky-950/40 border-sky-900 text-sky-200 max-w-full">
              <TemplateText template={initialFilters.message_template} className="truncate" />
              <button
                type="button"
                onClick={() => onSearch({ ...initialFilters, message_template: undefined })}
                className="p-0.5 rounded hover:bg-gray-800 flex-shrink-0"
                aria-label="Remove template filter"
              >
                <X size={12} />
              </button>
            </span>
          </div>
        )}

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
