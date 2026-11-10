import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Boxes, Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toggleValue } from '../../lib/multiValue';

export interface AppKeyOption {
  appKey: string;
  /** Registered name, shown next to the key when it differs. */
  name?: string;
}

interface AppKeyPickerProps {
  /** Applied app keys. */
  selected: string[];
  options: AppKeyOption[];
  /** False when the server takes a single app key: picking one replaces the other. */
  multiple: boolean;
  /** Called with the new selection, applied straight away. */
  onChange: (appKeys: string[]) => void;
}

/** Text of the picker's button: "All apps", one key, or "key +N". */
function buttonLabel(selected: string[]): string {
  if (selected.length === 0) return 'All apps';
  if (selected.length === 1) return selected[0];
  return `${selected[0]} +${selected.length - 1}`;
}

/**
 * Seq-style app filter: a checklist of the registered applications (or the
 * app keys seen in the feed when the server has no client registry), with a
 * search box. Each tick applies at once.
 */
export const AppKeyPicker: React.FC<AppKeyPickerProps> = ({ selected, options, multiple, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Typing filters the list straight away when the panel opens.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

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

  // Selected keys stay listed even when the registry no longer has them.
  const allOptions = useMemo(() => {
    const byKey = new Map(options.map(o => [o.appKey, o]));
    for (const key of selected) if (!byKey.has(key)) byKey.set(key, { appKey: key });
    return [...byKey.values()].sort((a, b) => a.appKey.localeCompare(b.appKey));
  }, [options, selected]);

  const term = query.trim().toLowerCase();
  const visible = term
    ? allOptions.filter(o => o.appKey.toLowerCase().includes(term) || o.name?.toLowerCase().includes(term))
    : allOptions;
  const typedIsNew = term !== '' && !allOptions.some(o => o.appKey.toLowerCase() === term);

  const pick = (appKey: string) => {
    if (multiple) {
      onChange(toggleValue(selected, appKey));
      return;
    }
    onChange(selected.includes(appKey) ? [] : [appKey]);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="app-key-button"
        title={selected.join(', ') || undefined}
        className={cn(
          'w-full h-full flex items-center gap-2 rounded px-3 py-2 text-sm border transition-colors',
          selected.length > 0
            ? 'bg-secondary-900/30 border-secondary-700 text-secondary-300'
            : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700',
        )}
      >
        <Boxes size={14} className="flex-shrink-0" />
        <span className="flex-1 text-left truncate font-mono text-xs">{buttonLabel(selected)}</span>
        <ChevronDown size={14} className={cn('flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-800 bg-gray-900 shadow-xl">
          <div className="relative p-2 border-b border-gray-800">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                // Enter picks a typed key that isn't listed (e.g. a file-storage app not seen yet).
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (typedIsNew) {
                    pick(query.trim());
                    setQuery('');
                  }
                }
              }}
              placeholder="Find an app"
              aria-label="Find an app"
              className="w-full bg-gray-950 border border-gray-800 rounded pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:border-secondary-500"
            />
          </div>

          <ul role="listbox" aria-multiselectable={multiple} aria-label="Applications" className="max-h-64 overflow-y-auto py-1">
            {visible.map(option => {
              const isSelected = selected.includes(option.appKey);
              return (
                <li key={option.appKey}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => pick(option.appKey)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-800"
                  >
                    <span className={cn(
                      'w-4 h-4 flex items-center justify-center rounded border flex-shrink-0',
                      isSelected ? 'bg-secondary-600 border-secondary-500 text-white' : 'border-gray-700',
                    )}>
                      {isSelected && <Check size={12} />}
                    </span>
                    <span className="font-mono text-gray-200 truncate">{option.appKey}</span>
                    {option.name && option.name !== option.appKey && (
                      <span className="ml-auto text-gray-500 truncate">{option.name}</span>
                    )}
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && !typedIsNew && (
              <li className="px-3 py-2 text-xs text-gray-500">No applications</li>
            )}
            {typedIsNew && (
              <li>
                <button
                  type="button"
                  onClick={() => { pick(query.trim()); setQuery(''); }}
                  className="w-full px-3 py-1.5 text-left text-xs text-secondary-400 hover:bg-gray-800"
                >
                  Filter by “{query.trim()}”
                </button>
              </li>
            )}
          </ul>

          {selected.length > 0 && (
            <div className="border-t border-gray-800 p-2 flex justify-between items-center text-xs">
              <span className="text-gray-500">{selected.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="flex items-center gap-1 text-gray-400 hover:text-gray-200"
              >
                <X size={12} />
                All apps
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
