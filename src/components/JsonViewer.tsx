import React from 'react';

interface JsonViewerProps {
  data: any;
  level?: number;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data, level = 0 }) => {
  if (data === null) return <span className="text-gray-500 italic">null</span>;
  if (typeof data === 'undefined') return <span className="text-gray-500 italic">undefined</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-400">[]</span>;
    return (
      <div className="pl-4 border-l border-gray-800">
        <span className="text-gray-400">[</span>
        {data.map((item, i) => (
          <div key={i} className="my-1">
            <JsonViewer data={item} level={level + 1} />
            {i < data.length - 1 && <span className="text-gray-600">,</span>}
          </div>
        ))}
        <span className="text-gray-400">]</span>
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-gray-400">{"{}"}</span>;
    return (
      <div className="pl-4 border-l border-gray-800">
        <span className="text-gray-400">{"{"}</span>
        {keys.map((key, i) => (
          <div key={key} className="my-1">
            <span className="text-sky-400 font-mono">"{key}"</span>
            <span className="text-gray-600 mx-1">:</span>
            <JsonViewer data={data[key]} level={level + 1} />
            {i < keys.length - 1 && <span className="text-gray-600">,</span>}
          </div>
        ))}
        <span className="text-gray-400">{"}"}</span>
      </div>
    );
  }

  if (typeof data === 'string') {
    return <span className="text-amber-300 font-mono">"{data}"</span>;
  }

  if (typeof data === 'number') {
    return <span className="text-rose-400 font-mono">{data}</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="text-fuchsia-400 font-mono">{data.toString()}</span>;
  }

  return <span className="text-gray-300">{String(data)}</span>;
};
