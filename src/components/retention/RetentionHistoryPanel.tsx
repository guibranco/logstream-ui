import React, { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, FlaskConical, History, RefreshCw } from 'lucide-react';
import { format, formatDistance, parseISO } from 'date-fns';
import { RETENTION_LOG_DAYS, useRetentionLog } from '../../hooks/useRetentionLog';
import { useRetentionPolicies } from '../../hooks/useRetentionPolicies';
import { RetentionLogEntry, RetentionLogResponse } from '../../types';
import { cn } from '../../lib/utils';

/** Rows shown at first, and added by "Show more". */
export const HISTORY_PAGE_SIZE = 50;

type RunKind = 'all' | 'live' | 'dry' | 'failed';

const KIND_OPTIONS: { value: RunKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'dry', label: 'Dry runs' },
  { value: 'failed', label: 'Failed' },
];

function matchesKind(run: RetentionLogEntry, kind: RunKind): boolean {
  switch (kind) {
    case 'live': return !run.dry_run;
    case 'dry': return run.dry_run;
    case 'failed': return run.error !== null;
    default: return true;
  }
}

function Stat({ label, value, tone }: Readonly<{ label: string; value: number; tone?: string }>) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{label}</div>
      <div className={cn('text-lg font-bold font-mono', tone ?? 'text-gray-50')}>{value.toLocaleString()}</div>
    </div>
  );
}

function RunStatus({ run }: Readonly<{ run: RetentionLogEntry }>) {
  if (run.error !== null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded">
        <AlertCircle size={12} /> Failed
      </span>
    );
  }
  if (run.dry_run) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-400 bg-primary-400/10 border border-primary-400/20 px-1.5 py-0.5 rounded">
        <FlaskConical size={12} /> Dry run
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded">
      <CheckCircle2 size={12} /> Live
    </span>
  );
}

interface RetentionHistoryViewProps {
  data: RetentionLogResponse;
  /** Reference time for relative dates; injectable for tests. */
  now?: Date;
}

/** The run history table, with totals and a status filter. */
export function RetentionHistoryView({ data, now }: Readonly<RetentionHistoryViewProps>) {
  const [kind, setKind] = useState<RunKind>('all');
  const [visible, setVisible] = useState(HISTORY_PAGE_SIZE);

  const runs = useMemo(() => data.runs.filter((r) => matchesKind(r, kind)), [data.runs, kind]);
  const shown = runs.slice(0, visible);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Runs" value={data.totals.runs} />
        <Stat label="Entries deleted" value={data.totals.deleted} />
        <Stat label="Failed" value={data.totals.failed} tone={data.totals.failed > 0 ? 'text-red-400' : undefined} />
        <Stat label="Dry runs" value={data.totals.dry_runs} />
      </div>

      <fieldset className="inline-flex bg-gray-950 border border-gray-800 rounded-lg p-0.5 m-0 min-w-0">
        <legend className="sr-only">Show</legend>
        {KIND_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === kind}
            onClick={() => { setKind(option.value); setVisible(HISTORY_PAGE_SIZE); }}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
              option.value === kind ? 'bg-gray-800 text-gray-50' : 'text-gray-400 hover:text-gray-200',
            )}
          >
            {option.label}
          </button>
        ))}
      </fieldset>

      {runs.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          {data.runs.length === 0
            ? `No retention runs in the last ${data.days} days.`
            : 'No runs match this filter.'}
        </p>
      ) : (
        <div className="overflow-x-auto border border-gray-800 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-950 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="text-left font-semibold px-3 py-2">Ran at</th>
                <th scope="col" className="text-left font-semibold px-3 py-2">Policy</th>
                <th scope="col" className="text-left font-semibold px-3 py-2">Status</th>
                <th scope="col" className="text-right font-semibold px-3 py-2">Deleted</th>
                <th scope="col" className="text-right font-semibold px-3 py-2">Duration</th>
                <th scope="col" className="text-left font-semibold px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {shown.map((run) => {
                const ranAt = parseISO(run.ran_at);
                return (
                  <tr key={run.id} data-testid="retention-run" className="hover:bg-gray-800/40 align-top">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="font-mono text-gray-200" title={run.ran_at}>{format(ranAt, 'yyyy-MM-dd HH:mm')}</div>
                      <div className="text-[11px] text-gray-500">
                        {formatDistance(ranAt, now ?? new Date(), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-200">{run.policy}</td>
                    <td className="px-3 py-2"><RunStatus run={run} /></td>
                    <td className="px-3 py-2 text-right font-mono text-gray-200 tabular-nums">
                      {run.dry_run ? '~' : ''}{run.deleted.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-400 tabular-nums whitespace-nowrap">
                      {run.duration_ms.toLocaleString()} ms
                    </td>
                    <td className="px-3 py-2 text-gray-400 max-w-md">
                      {run.error !== null
                        ? <span className="text-red-400 break-words">{run.error}</span>
                        : <span className="break-words">{run.summary ?? '—'}</span>}
                      {run.warnings.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {run.warnings.map((w, i) => (
                            <li key={i} className="flex items-start gap-1 text-[11px] text-amber-400">
                              <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                              <span className="break-words">{w}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {runs.length > shown.length && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + HISTORY_PAGE_SIZE)}
            className="text-xs font-medium text-primary-400 hover:text-primary-300"
          >
            Show more ({(runs.length - shown.length).toLocaleString()} remaining)
          </button>
        </div>
      )}

      {data.truncated && (
        <p className="text-[11px] text-gray-500">
          Only the latest {data.runs.length.toLocaleString()} runs are shown; pick a policy to see older ones.
        </p>
      )}
    </div>
  );
}

/** Retention run history (retention_log) for the last 90 days. */
export function RetentionHistoryPanel() {
  const [policy, setPolicy] = useState('');
  const { data: policies } = useRetentionPolicies();
  const { data, isLoading, isError, error, isFetching, refetch } = useRetentionLog(RETENTION_LOG_DAYS, policy || undefined);

  // Runs of policies deleted since are still worth filtering by.
  const policyNames = useMemo(() => {
    const names = new Set<string>((policies ?? []).map((p) => p.name));
    if (!policy) data?.runs.forEach((r) => names.add(r.policy));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [policies, data, policy]);

  const unavailable = isError && error?.message === 'SERVICE_UNAVAILABLE';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-50 flex items-center gap-2">
            <History className="w-5 h-5 text-primary-500" />
            Run history
          </h2>
          <p className="text-gray-400 text-sm">
            Every retention run in the last {RETENTION_LOG_DAYS} days — scheduled, manual or CLI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-400" htmlFor="retention-history-policy">Policy:</label>
          <select
            id="retention-history-policy"
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
            disabled={unavailable}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 min-w-[160px]"
          >
            <option value="">(all policies)</option>
            {policyNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching || unavailable}
            aria-label="Refresh run history"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 disabled:opacity-50"
          >
            <RefreshCw size={16} className={cn(isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {isLoading && <div className="h-32 rounded-lg bg-gray-800/50 animate-pulse" aria-label="Loading run history" />}

      {unavailable && (
        <p className="text-sm text-gray-500">
          This server does not expose its retention run history. Update logstream-server to a version with
          {' '}<code className="font-mono text-gray-400">GET /api/retention/log</code>.
        </p>
      )}

      {isError && !unavailable && (
        <p className="text-sm text-red-400 flex items-center gap-2">
          <AlertCircle size={16} /> Could not load the run history: {error?.message}
        </p>
      )}

      {data && <RetentionHistoryView key={policy} data={data} />}
    </div>
  );
}
