import React, { useMemo, useState } from 'react';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useRetentionVolume } from '../../hooks/useRetentionVolume';
import { RetentionVolumeReport } from '../../types';
import {
  DEFAULT_LAYOUT,
  VolumeMetric,
  buildVolumeChart,
  dueValue,
  formatMetric,
  storedValue,
} from '../../lib/retentionVolume';
import { cn } from '../../lib/utils';
import { RetentionVolumeChart } from './RetentionVolumeChart';

export const VOLUME_WINDOWS = [30, 90, 180, 365] as const;

function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: Readonly<{
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}>) {
  return (
    <fieldset className="inline-flex bg-gray-950 border border-gray-800 rounded-lg p-0.5 m-0 min-w-0">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
            option.value === value ? 'bg-gray-800 text-gray-50' : 'text-gray-400 hover:text-gray-200',
          )}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

function Stat({ label, value, hint }: Readonly<{ label: string; value: string; hint?: string }>) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{label}</div>
      <div className="text-lg font-bold text-gray-50 font-mono">{value}</div>
      {hint && <div className="text-[11px] text-gray-500">{hint}</div>}
    </div>
  );
}

function cutoffLabel(olderThanDays: number | null): string {
  if (olderThanDays === null) return 'any age';
  return `after ${olderThanDays} day${olderThanDays === 1 ? '' : 's'}`;
}

interface RetentionVolumeViewProps {
  report: RetentionVolumeReport;
  metric: VolumeMetric;
}

/** Chart, legend, numbered policy list and data table for a loaded report. */
export function RetentionVolumeView({ report, metric }: Readonly<RetentionVolumeViewProps>) {
  const [activeMarker, setActiveMarker] = useState<number | null>(null);

  // Marker numbering only depends on policy order, not on width.
  const { markers, inactive } = useMemo(
    () => buildVolumeChart(report, metric, { ...DEFAULT_LAYOUT, width: 960 }),
    [report, metric],
  );

  const totalStored = metric === 'count' ? report.totals.count : report.totals.bytes;
  const totalDue = metric === 'count' ? report.totals.due_count : report.totals.due_bytes;
  const olderStored = metric === 'count' ? report.older.count : report.older.bytes;
  const futureStored = metric === 'count' ? report.future.count : report.future.bytes;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <Stat label="Stored" value={formatMetric(totalStored, metric)} hint={`${report.totals.count.toLocaleString()} entries`} />
        <Stat
          label="Due for deletion"
          value={formatMetric(totalDue, metric)}
          hint={totalStored > 0 ? `${Math.round((totalDue / totalStored) * 100)}% — eligible for a live retention run` : undefined}
        />
        {report.older.count > 0 && (
          <Stat label={`Older than ${report.days} days`} value={formatMetric(olderStored, metric)} hint="not shown on the chart" />
        )}
        {report.future.count > 0 && (
          <Stat label="Dated in the future" value={formatMetric(futureStored, metric)} hint="timestamps after today, not shown on the chart" />
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400" aria-label="Legend">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-primary-500/35 border-2 border-primary-400" />
          <span>Kept</span>
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" aria-hidden="true" className="rounded-sm">
            <rect width="12" height="12" fill="url(#retention-due-hatch)" />
          </svg>
          <span>Due for deletion</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400 text-[9px] font-bold text-gray-100">n</span>
          <span>Policy cutoff</span>
        </span>
      </div>

      <RetentionVolumeChart
        report={report}
        metric={metric}
        activeMarker={activeMarker}
        onMarkerHover={setActiveMarker}
      />

      {markers.length > 0 ? (
        <ol className="divide-y divide-gray-800 border border-gray-800 rounded-lg overflow-hidden" aria-label="Retention policy markers">
          {markers.map((marker) => {
            const { policy } = marker;
            const matched = metric === 'count' ? policy.matched_count : policy.matched_bytes;
            const due = metric === 'count' ? policy.due_count : policy.due_bytes;
            const share = Math.min(1, Math.max(0, policy.matched_share));
            return (
              <li
                key={policy.name}
                onMouseEnter={() => setActiveMarker(marker.number)}
                onMouseLeave={() => setActiveMarker(null)}
                className={cn(
                  'grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 transition-colors',
                  activeMarker === marker.number ? 'bg-gray-800/60' : 'bg-gray-900',
                )}
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gray-400 text-[11px] font-bold text-gray-100">
                  {marker.number}
                </span>
                <div className="min-w-0">
                  <div className="font-mono text-sm font-bold text-primary-400 truncate">{policy.name}</div>
                  <div className="text-xs text-gray-500">
                    Deletes matches {cutoffLabel(policy.older_than_days)}
                    {marker.placement === 'beyond' && ' — beyond this window'}
                  </div>
                </div>
                <div className="col-span-3 md:col-span-1 row-start-2 md:row-start-auto">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden" aria-hidden="true">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${share * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 font-mono w-12 text-right">{Math.round(share * 100)}%</span>
                  </div>
                  <div className="text-[11px] text-gray-500">matches {formatMetric(matched, metric)} of everything stored</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-gray-200">{formatMetric(due, metric)}</div>
                  <div className="text-[11px] text-gray-500">due now</div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-gray-500">No active policies — nothing will be deleted.</p>
      )}

      {inactive.length > 0 && (
        <p className="text-xs text-gray-500">
          Not shown: {inactive.map((p) => p.name).join(', ')} — no criteria set, so {inactive.length === 1 ? 'it never deletes' : 'they never delete'} anything.
        </p>
      )}

      <details className="text-xs text-gray-400">
        <summary className="cursor-pointer select-none hover:text-gray-200">Show data table</summary>
        <div className="mt-2 max-h-64 overflow-y-auto border border-gray-800 rounded-lg">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-gray-950">
              <tr className="border-b border-gray-800">
                <th className="px-3 py-1.5 font-semibold">Date</th>
                <th className="px-3 py-1.5 font-semibold text-right">Stored</th>
                <th className="px-3 py-1.5 font-semibold text-right">Due for deletion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-mono">
              {[...report.buckets].reverse().filter((b) => b.count > 0).map((b) => (
                <tr key={b.date}>
                  <td className="px-3 py-1">{format(parseISO(b.date), 'yyyy-MM-dd')}</td>
                  <td className="px-3 py-1 text-right text-gray-200">{formatMetric(storedValue(b, metric), metric)}</td>
                  <td className="px-3 py-1 text-right">{formatMetric(dueValue(b, metric), metric)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="text-[11px] text-gray-600">
        {report.size_basis === 'payload'
          ? 'Sizes are message, template and context lengths, not on-disk row sizes. '
          : 'Sizes are the stored JSONL line sizes. '}
        Computed {formatDistanceToNow(parseISO(report.generated_at), { addSuffix: true })}; the server refreshes it every few minutes.
      </p>
    </div>
  );
}

/** Seq-style storage view: stored volume by age with a marker per retention policy. */
export function RetentionVolumePanel() {
  const [days, setDays] = useState<number>(90);
  const [metric, setMetric] = useState<VolumeMetric>('count');
  const { data, isLoading, isError, error, isFetching } = useRetentionVolume(days);

  const unavailable = isError && (error as Error).message === 'SERVICE_UNAVAILABLE';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-500" />
          <h3 className="text-base font-bold text-gray-50">Storage by age</h3>
          {isFetching && !isLoading && <span className="text-[11px] text-gray-500">updating…</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Measure"
            value={metric}
            onChange={setMetric}
            options={[{ value: 'count', label: 'Entries' }, { value: 'bytes', label: 'Size' }]}
          />
          <SegmentedControl
            label="Window"
            value={days}
            onChange={setDays}
            options={VOLUME_WINDOWS.map((d) => ({ value: d, label: `${d}d` }))}
          />
        </div>
      </div>

      {isLoading && <div className="h-60 rounded-lg bg-gray-800/50 animate-pulse" />}

      {unavailable && (
        <p className="text-sm text-gray-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          The storage chart needs retention enabled on a logstream-server that provides <code className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">/api/retention/volume</code>.
        </p>
      )}

      {isError && !unavailable && (
        <p className="text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Could not load storage volume: {(error as Error).message}
        </p>
      )}

      {data && !isError && <RetentionVolumeView report={data} metric={metric} />}
    </div>
  );
}
