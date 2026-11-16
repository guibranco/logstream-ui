import React from 'react';
import { Radio } from 'lucide-react';
import { cn } from '../lib/utils';
import type { UdpHealth } from '../hooks/useServerHealth';

/** Plain-language labels for the server's rejection reasons; unknown reasons show as-is. */
export const UDP_REJECT_LABELS: Record<string, string> = {
  bad_signature: 'Bad signature',
  stale: 'Outside time window',
  replay: 'Replayed nonce',
  unknown_key: 'Unknown app key',
  reserved_key: 'Reserved app key',
  source_not_allowed: 'Source not allowed',
  too_large: 'Too large',
  invalid_json: 'Invalid JSON',
  bad_version: 'Unsupported version',
  missing_field: 'Missing field',
  bad_nonce: 'Bad nonce',
  invalid_entry: 'Invalid entry',
  nonce_cache_full: 'Nonce cache full',
  internal_error: 'Internal error',
};

interface UdpIngestStatsProps {
  udp?: UdpHealth;
  isLoading?: boolean;
  isError?: boolean;
}

const Counter: React.FC<{ label: string; value?: number; tone?: string }> = ({ label, value, tone }) => (
  <div className="bg-gray-900/50 p-2 rounded border border-gray-900 text-center">
    <div className={cn('text-sm font-bold font-mono', tone ?? 'text-gray-100')}>{value ?? 0}</div>
    <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
  </div>
);

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xs text-gray-500 italic">{children}</p>
);

/** The listener's state and counters, for a server where UDP ingest is on. */
const UdpCounters: React.FC<{ udp: UdpHealth }> = ({ udp }) => {
  const rejected = Object.entries(udp.rejected ?? {}).sort((a, b) => b[1] - a[1]);
  const notStored = udp.dropped ?? 0;
  const droppedTotal = rejected.reduce((sum, [, n]) => sum + n, 0) + notStored;
  const listening = udp.listening === true;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">Port {udp.port}</span>
        <span className={cn('inline-flex items-center gap-1.5 font-semibold', listening ? 'text-green-400' : 'text-amber-400')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', listening ? 'bg-green-400' : 'bg-amber-400')} />
          {listening ? 'Listening' : 'Not listening'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Counter label="Received" value={udp.received} />
        <Counter label="Accepted" value={udp.accepted} tone="text-green-400" />
        <Counter label="Dropped" value={droppedTotal} tone={droppedTotal > 0 ? 'text-amber-400' : undefined} />
      </div>

      {droppedTotal > 0 && (
        <ul className="space-y-1">
          {notStored > 0 && (
            <li className="flex justify-between text-xs">
              <span className="text-gray-400" title="Valid packets that couldn't be stored: ingest buffer full, shutting down, or a write failed">
                Not stored
              </span>
              <span className="font-mono text-gray-200">{notStored}</span>
            </li>
          )}
          {rejected.map(([reason, count]) => (
            <li key={reason} className="flex justify-between text-xs">
              <span className="text-gray-400" title={reason}>{UDP_REJECT_LABELS[reason] ?? reason}</span>
              <span className="font-mono text-gray-200">{count}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-gray-600">Totals since the server started.</p>
    </div>
  );
};

function body({ udp, isLoading, isError }: UdpIngestStatsProps): React.ReactNode {
  if (isError) return <Note>Couldn't load UDP status.</Note>;
  if (isLoading || !udp) return <Note>Loading…</Note>;
  if (!udp.enabled) return <Note>UDP ingest is turned off on this server.</Note>;
  return <UdpCounters udp={udp} />;
}

/** UDP ingest counters from GET /api/health, since the server started. */
export const UdpIngestStats: React.FC<UdpIngestStatsProps> = props => (
  <section data-testid="udp-ingest-stats">
    <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-4">
      <Radio size={12} />
      UDP Ingest
    </h3>
    {body(props)}
  </section>
);
