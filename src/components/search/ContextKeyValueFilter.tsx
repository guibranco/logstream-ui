import React from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  ContextRow,
  MAX_CONTEXT_FILTERS,
  contextPathError,
  newContextRow,
} from '../../lib/contextProperties';

interface ContextKeyValueFilterProps {
  rows: ContextRow[];
  onChange: (rows: ContextRow[]) => void;
}

const inputClass =
  'bg-gray-950 border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-secondary-500 min-w-0';

/** Editable list of `path = value` / `path ≠ value` conditions on the entry context. */
export const ContextKeyValueFilter: React.FC<ContextKeyValueFilterProps> = ({ rows, onChange }) => {
  const update = (id: string, patch: Partial<ContextRow>) =>
    onChange(rows.map(r => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      <span className="text-xs text-gray-500 font-medium">Context filters</span>

      {rows.map((row, i) => {
        const pathError = contextPathError(row.key);
        return (
          <div key={row.id} className="flex items-center gap-2" data-testid="context-row">
            <input
              type="text"
              placeholder="key (e.g. order.id)"
              aria-label={`Context filter ${i + 1} key`}
              aria-invalid={pathError !== null}
              title={pathError ?? undefined}
              value={row.key}
              onChange={e => update(row.id, { key: e.target.value })}
              className={cn(inputClass, 'flex-1', pathError ? 'border-rose-700' : 'border-gray-800')}
            />
            <select
              aria-label={`Context filter ${i + 1} operator`}
              value={row.exclude ? 'ne' : 'eq'}
              onChange={e => update(row.id, { exclude: e.target.value === 'ne' })}
              className="bg-gray-950 border border-gray-800 rounded px-1 py-1.5 text-xs focus:outline-none focus:border-secondary-500"
            >
              <option value="eq">=</option>
              <option value="ne">≠</option>
            </select>
            <input
              type="text"
              placeholder="value"
              aria-label={`Context filter ${i + 1} value`}
              value={row.value}
              onChange={e => update(row.id, { value: e.target.value })}
              className={cn(inputClass, 'flex-1 border-gray-800')}
            />
            <button
              type="button"
              onClick={() => onChange(rows.filter(r => r.id !== row.id))}
              className="p-1.5 rounded text-gray-500 hover:bg-gray-800 hover:text-gray-200"
              aria-label={`Remove context filter ${i + 1}`}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...rows, newContextRow()])}
        disabled={rows.length >= MAX_CONTEXT_FILTERS}
        className="flex items-center gap-1 text-xs text-secondary-400 hover:text-secondary-300 disabled:text-gray-600 disabled:cursor-not-allowed"
      >
        <Plus size={14} />
        Add context filter
      </button>
    </div>
  );
};
