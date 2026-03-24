import React, { useState, useEffect } from 'react';
import { SearchFilters, LogLevel } from '../types';
import { Search, RotateCcw, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface FilterBarProps {
  filters: SearchFilters;
  onSearch: (filters: SearchFilters) => void;
}

const LEVELS: LogLevel[] = ['debug', 'info', 'notice', 'warning', 'error', 'critical'];

export const FilterBar: React.FC<FilterBarProps> = ({ filters: initialFilters, onSearch }) => {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(initialFilters);

  useEffect(() => {
    setLocalFilters(initialFilters);
  }, [initialFilters]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localFilters);
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
              className="w-full bg-gray-950 border border-gray-800 rounded px-10 py-2 text-sm focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <input
            type="text"
            name="app_key"
            placeholder="App Key"
            value={localFilters.app_key || ''}
            onChange={handleChange}
            className="bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
          />

          <input
            type="text"
            name="app_id"
            placeholder="App ID"
            value={localFilters.app_id || ''}
            onChange={handleChange}
            className="bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
          />

          <input
            type="text"
            name="category"
            placeholder="Category"
            value={localFilters.category || ''}
            onChange={handleChange}
            className="bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium py-2 rounded transition-colors flex items-center justify-center gap-2"
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
                    ? "bg-sky-900 border-sky-500 text-sky-400"
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
              className="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500 text-gray-300"
            />
            <span className="text-xs text-gray-500 font-medium">To:</span>
            <input
              type="datetime-local"
              name="date_to"
              value={localFilters.date_to || ''}
              onChange={handleChange}
              className="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs focus:outline-none focus:border-sky-500 text-gray-300"
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
              className="flex-1 lg:w-40 bg-gray-950 border border-gray-800 rounded px-3 py-1 text-xs focus:outline-none focus:border-sky-500"
            />
            <input
              type="text"
              name="batch_id"
              placeholder="Batch ID"
              value={localFilters.batch_id || ''}
              onChange={handleChange}
              className="flex-1 lg:w-40 bg-gray-950 border border-gray-800 rounded px-3 py-1 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </form>
    </div>
  );
};
