import React from 'react';
import { TextSearch } from 'lucide-react';
import { MAX_CONTEXT_SEARCH_LEN } from '../../lib/contextProperties';

interface ContextSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  storageType?: 'file' | 'mariadb';
}

const HINTS: Record<'file' | 'mariadb', string> = {
  mariadb: 'Whole words or phrases, any key or value, case-insensitive. Min. 3 characters.',
  file: 'Text anywhere in keys or values, including inside words, case-insensitive. Min. 3 characters. File storage scans every entry, so this is slower on large volumes.',
};

/** Free-text search across every key and value of the entry context (`context_search`). */
export const ContextSearchInput: React.FC<ContextSearchInputProps> = ({ value, onChange, storageType }) => (
  <div className="space-y-1">
    <label htmlFor="context_search" className="text-xs text-gray-500 font-medium">
      Context contains
    </label>
    <div className="relative">
      <TextSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
      <input
        id="context_search"
        type="text"
        name="context_search"
        placeholder="e.g. card_declined"
        maxLength={MAX_CONTEXT_SEARCH_LEN}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-950 border border-gray-800 rounded pl-9 pr-3 py-1.5 text-xs font-mono focus:outline-none focus:border-sky-500"
      />
    </div>
    <p className="text-[11px] text-gray-500">
      {HINTS[storageType ?? 'mariadb']}
    </p>
  </div>
);
