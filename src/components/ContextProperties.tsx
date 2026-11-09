import React, { useState } from 'react';
import { Ban, Check, Copy, Search } from 'lucide-react';
import { flattenContext, toFilterValue } from '../lib/contextProperties';

interface ContextPropertiesProps {
  context: Record<string, unknown> | null;
  onFind: (path: string, value: string) => void;
  onExclude: (path: string, value: string) => void;
}

const renderValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return <span className="text-gray-500 italic">null</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-amber-300">{value}</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-rose-400">{value}</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-fuchsia-400">{String(value)}</span>;
  }
  // Arrays and empty objects: compact JSON.
  return <span className="text-gray-400">{JSON.stringify(value)}</span>;
};

/**
 * Context rendered as a property list (one row per scalar, nested objects
 * flattened to dotted paths), each with Find / Exclude / Copy actions.
 */
export const ContextProperties: React.FC<ContextPropertiesProps> = ({ context, onFind, onExclude }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const rows = flattenContext(context);

  if (rows.length === 0) {
    return <p className="text-xs text-gray-500 italic">No context properties</p>;
  }

  const handleCopy = (path: string, value: unknown) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    void navigator.clipboard.writeText(text);
    setCopied(path);
    setTimeout(() => setCopied(null), 2000);
  };

  const actionClass = 'p-1 rounded text-gray-500 hover:bg-gray-800 hover:text-gray-200 transition-colors';

  return (
    <table className="w-full text-xs font-mono">
      <tbody>
        {rows.map(({ path, value, filterable }) => (
          <tr key={path} className="group border-b border-gray-900 last:border-0 align-top">
            <td className="py-1.5 pr-2 w-px whitespace-nowrap">
              <div className="flex gap-0.5 opacity-40 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {filterable && (
                  <>
                    <button
                      type="button"
                      onClick={() => onFind(path, toFilterValue(value))}
                      className={actionClass}
                      title={`Find ${path} = ${toFilterValue(value)}`}
                      aria-label={`Find ${path}`}
                    >
                      <Search size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onExclude(path, toFilterValue(value))}
                      className={actionClass}
                      title={`Exclude ${path} = ${toFilterValue(value)}`}
                      aria-label={`Exclude ${path}`}
                    >
                      <Ban size={12} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleCopy(path, value)}
                  className={actionClass}
                  title="Copy value"
                  aria-label={`Copy ${path}`}
                >
                  {copied === path ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                </button>
              </div>
            </td>
            <td className="py-1.5 pr-4 text-sky-400 whitespace-nowrap">{path}</td>
            <td className="py-1.5 break-all">{renderValue(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
