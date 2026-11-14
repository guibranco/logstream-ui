import {
  RetentionVolumeBucket,
  RetentionVolumePolicy,
  RetentionVolumeReport,
  RetentionVolumeStorage,
  RetentionVolumeTotals,
} from '../types';

/**
 * Geometry for the Seq-style retention chart: stored volume by age (oldest on
 * the left, today on the right) with a numbered marker per policy.
 *
 * A policy with `older_than_days: N` deletes entries dated before today−N, so
 * it removes every bucket with age > N. Its marker therefore sits on the
 * boundary between age N+1 and age N.
 */

export type VolumeMetric = 'count' | 'bytes';

export type MarkerPlacement =
  | 'inside'      // within the window, at its cutoff
  | 'any-age'     // no older_than_days: deletes matches at any age, drawn at "now"
  | 'beyond';     // cutoff is older than the window

export interface VolumeMarker {
  /** 1-based number shown on the chart and in the policy list. */
  number: number;
  policy: RetentionVolumePolicy;
  placement: MarkerPlacement;
  /** Horizontal position in the plot, or null when beyond the window. */
  x: number | null;
  /** Where the numbered badge is drawn; differs from x when badges would overlap. */
  labelX: number | null;
}

export interface VolumeTick {
  value: number;
  position: number;
  label: string;
}

export interface VolumeChartLayout {
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface VolumeChartModel {
  plot: { x: number; y: number; width: number; height: number };
  bucketWidth: number;
  maxValue: number;
  /** Area for everything stored (kept + due). */
  storedPath: string;
  /** Area for the part no policy deletes yet. */
  keptPath: string;
  /**
   * On-disk mode (Size view on a server that reports table storage): the
   * stacked split of each day's estimated size. dataPath is the bottom layer,
   * storedPath (data + indexes) the top, and duePath the band between kept and
   * stored that policies would delete. All empty outside on-disk mode.
   */
  disk: boolean;
  dataPath: string;
  duePath: string;
  yTicks: VolumeTick[];
  xTicks: VolumeTick[];
  markers: VolumeMarker[];
  /** Policies without criteria: listed, but never get a marker. */
  inactive: RetentionVolumePolicy[];
}

export const DEFAULT_LAYOUT: Omit<VolumeChartLayout, 'width'> = {
  height: 240,
  top: 28,
  right: 16,
  bottom: 28,
  left: 56,
};

/** Estimated on-disk size of a set of entries (a day, or a totals row). */
export interface DiskEstimate {
  data: number;
  index: number;
  /** data + index */
  stored: number;
  /** Share of `stored` that policies would delete now. */
  due: number;
}

/**
 * Splits the table's on-disk size (one figure for the whole table) across a
 * set of entries. MariaDB has no per-day size, so this is an estimate:
 *
 *   data  — the table's DATA_LENGTH × this set's share of payload bytes
 *   index — the table's INDEX_LENGTH × this set's share of entries
 *           (each entry adds one key to every index, whatever its size)
 *
 * Summed over every stored entry it gives back the table's exact data + indexes.
 */
export function diskEstimate(
  part: RetentionVolumeTotals,
  totals: RetentionVolumeTotals,
  storage: RetentionVolumeStorage,
): DiskEstimate {
  const dataShare = totals.bytes > 0 ? part.bytes / totals.bytes : 0;
  const indexShare = totals.count > 0 ? part.count / totals.count : 0;
  const data = storage.data_bytes * dataShare;
  const index = storage.index_bytes * indexShare;
  const dueData = part.bytes > 0 ? data * (part.due_bytes / part.bytes) : 0;
  const dueIndex = part.count > 0 ? index * (part.due_count / part.count) : 0;
  return { data, index, stored: data + index, due: dueData + dueIndex };
}

/** True when the Size view should draw the estimated on-disk data / index split. */
export function usesDiskSplit(report: RetentionVolumeReport, metric: VolumeMetric): boolean {
  return metric === 'bytes' && !!report.storage;
}

/**
 * Stored and due values for any totals row in the current view: entries,
 * payload bytes, or (on-disk mode) the estimated on-disk size.
 */
export function viewValues(report: RetentionVolumeReport, metric: VolumeMetric) {
  if (usesDiskSplit(report, metric)) {
    const storage = report.storage as RetentionVolumeStorage;
    return {
      stored: (t: RetentionVolumeTotals) => diskEstimate(t, report.totals, storage).stored,
      due: (t: RetentionVolumeTotals) => diskEstimate(t, report.totals, storage).due,
    };
  }
  return {
    stored: (t: RetentionVolumeTotals) => (metric === 'count' ? t.count : t.bytes),
    due: (t: RetentionVolumeTotals) => (metric === 'count' ? t.due_count : t.due_bytes),
  };
}

export function storedValue(bucket: RetentionVolumeBucket, metric: VolumeMetric): number {
  return metric === 'count' ? bucket.count : bucket.bytes;
}

export function dueValue(bucket: RetentionVolumeBucket, metric: VolumeMetric): number {
  return metric === 'count' ? bucket.due_count : bucket.due_bytes;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function formatCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`;
  return `${(count / 1_000_000).toFixed(1)}M`;
}

export function formatMetric(value: number, metric: VolumeMetric): string {
  return metric === 'count' ? formatCount(value) : formatBytes(value);
}

/** A round upper bound and step for the y axis (1, 2, 2.5 or 5 × 10^n per tick). */
export function niceScale(max: number, ticks = 4, minStep = 0): { max: number; step: number } {
  if (max <= 0) return { max: Math.max(1, minStep), step: Math.max(1, minStep) };
  const raw = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
  // Entries are whole, so the count axis never steps by a fraction.
  const step = Math.max(nice, minStep);
  return { max: Math.ceil(max / step) * step, step };
}

/** Position of a policy marker; null when the cutoff falls before the window. */
export function markerX(
  olderThanDays: number | null,
  bucketCount: number,
  plotX: number,
  bucketWidth: number,
): { placement: MarkerPlacement; x: number | null } {
  if (olderThanDays === null) {
    return { placement: 'any-age', x: plotX + bucketCount * bucketWidth };
  }
  if (olderThanDays >= bucketCount) {
    return { placement: 'beyond', x: null };
  }
  // Bucket index of age N is (count − 1 − N); its left edge is the boundary with age N+1.
  return { placement: 'inside', x: plotX + (bucketCount - 1 - olderThanDays) * bucketWidth };
}

export function buildVolumeChart(
  report: RetentionVolumeReport,
  metric: VolumeMetric,
  layout: VolumeChartLayout,
): VolumeChartModel {
  const plot = {
    x: layout.left,
    y: layout.top,
    width: Math.max(1, layout.width - layout.left - layout.right),
    height: Math.max(1, layout.height - layout.top - layout.bottom),
  };

  const buckets = report.buckets;
  const n = Math.max(1, buckets.length);
  const bucketWidth = plot.width / n;

  const disk = usesDiskSplit(report, metric);
  const values = viewValues(report, metric);
  const estimates = disk
    ? buckets.map((b) => diskEstimate(b, report.totals, report.storage as RetentionVolumeStorage))
    : [];

  const peak = buckets.reduce((m, b) => Math.max(m, values.stored(b)), 0);
  const scale = niceScale(peak, 4, metric === 'count' ? 1 : 0);
  const y = (v: number) => plot.y + plot.height - (v / scale.max) * plot.height;

  const stepArea = (valueOf: (b: RetentionVolumeBucket, i: number) => number): string => {
    if (buckets.length === 0) return '';
    const baseline = plot.y + plot.height;
    let d = `M${plot.x},${baseline}`;
    buckets.forEach((b, i) => {
      const top = y(valueOf(b, i));
      d += ` L${plot.x + i * bucketWidth},${top} L${plot.x + (i + 1) * bucketWidth},${top}`;
    });
    return `${d} L${plot.x + buckets.length * bucketWidth},${baseline} Z`;
  };

  /** Stepped band between two series (upper ≥ lower), e.g. the due part on top of the kept part. */
  const stepBand = (
    upper: (b: RetentionVolumeBucket, i: number) => number,
    lower: (b: RetentionVolumeBucket, i: number) => number,
  ): string => {
    if (buckets.length === 0) return '';
    let d = '';
    buckets.forEach((b, i) => {
      const top = y(upper(b, i));
      d += `${i === 0 ? 'M' : ' L'}${plot.x + i * bucketWidth},${top} L${plot.x + (i + 1) * bucketWidth},${top}`;
    });
    for (let i = buckets.length - 1; i >= 0; i--) {
      const bottom = y(lower(buckets[i], i));
      d += ` L${plot.x + (i + 1) * bucketWidth},${bottom} L${plot.x + i * bucketWidth},${bottom}`;
    }
    return `${d} Z`;
  };

  const yTicks: VolumeTick[] = [];
  for (let v = 0; v <= scale.max + scale.step / 2; v += scale.step) {
    yTicks.push({ value: v, position: y(v), label: formatMetric(v, metric) });
  }

  const xTicks: VolumeTick[] = [];
  const every = Math.max(1, Math.ceil(n / 6));
  for (let age = 0; age < buckets.length; age += every) {
    const index = buckets.length - 1 - age;
    xTicks.push({
      value: age,
      position: plot.x + (index + 0.5) * bucketWidth,
      label: age === 0 ? 'Today' : `${age}d ago`,
    });
  }

  const markers: VolumeMarker[] = [];
  const inactive: RetentionVolumePolicy[] = [];
  for (const policy of report.policies) {
    if (!policy.active) {
      inactive.push(policy);
      continue;
    }
    const { placement, x } = markerX(policy.older_than_days, buckets.length, plot.x, bucketWidth);
    markers.push({ number: markers.length + 1, policy, placement, x, labelX: x });
  }

  spreadLabels(markers, plot.x, plot.x + plot.width + layout.right / 2);

  return {
    plot,
    bucketWidth,
    maxValue: scale.max,
    storedPath: stepArea((b) => values.stored(b)),
    keptPath: stepArea((b) => values.stored(b) - values.due(b)),
    disk,
    dataPath: disk ? stepArea((_, i) => estimates[i].data) : '',
    duePath: disk ? stepBand((_, i) => estimates[i].stored, (_, i) => estimates[i].stored - estimates[i].due) : '',
    yTicks,
    xTicks,
    markers,
    inactive,
  };
}

/** Minimum distance between badge centres (badge diameter + a 2px gap). */
export const MARKER_LABEL_SPACING = 20;

/**
 * Moves badges sideways so none overlap, keeping each group of colliding
 * badges centred on the markers it belongs to and inside [min, max].
 * Markers sharing a cutoff end up side by side above their common line.
 */
export function spreadLabels(markers: VolumeMarker[], min: number, max: number, spacing = MARKER_LABEL_SPACING): void {
  const placed = markers.filter((m) => m.x !== null).sort((a, b) => (a.x as number) - (b.x as number) || a.number - b.number);
  if (placed.length === 0) return;

  // Greedy clustering: a badge joins the previous cluster when it would overlap it.
  const clusters: VolumeMarker[][] = [];
  for (const marker of placed) {
    const last = clusters.at(-1);
    if (last) {
      const centre = last.reduce((sum, m) => sum + (m.x as number), 0) / last.length;
      const lastRight = centre + ((last.length - 1) * spacing) / 2;
      if ((marker.x as number) - lastRight < spacing) {
        last.push(marker);
        continue;
      }
    }
    clusters.push([marker]);
  }

  // Forward pass: centre each cluster on its markers, clamped to the bounds,
  // and push it right of the previous one.
  const starts: number[] = [];
  const widths = clusters.map((c) => (c.length - 1) * spacing);
  let previousRight = -Infinity;
  clusters.forEach((cluster, k) => {
    const centre = cluster.reduce((sum, m) => sum + (m.x as number), 0) / cluster.length;
    let start = Math.min(Math.max(centre - widths[k] / 2, min), max - widths[k]);
    start = Math.max(start, previousRight + spacing);
    starts.push(start);
    previousRight = start + widths[k];
  });

  // Backward pass: a cluster pushed past max moves left, pulling earlier ones
  // with it, so every badge stays in bounds whenever they all fit.
  let nextStart = Infinity;
  for (let k = clusters.length - 1; k >= 0; k--) {
    starts[k] = Math.min(starts[k], max - widths[k], nextStart - spacing - widths[k]);
    nextStart = starts[k];
  }

  clusters.forEach((cluster, k) => {
    cluster.forEach((marker, i) => {
      marker.labelX = starts[k] + i * spacing;
    });
  });
}

/** Bucket index under a horizontal plot coordinate, or null outside the plot. */
export function bucketAt(x: number, model: VolumeChartModel, bucketCount: number): number | null {
  const offset = x - model.plot.x;
  if (offset < 0 || offset >= model.plot.width || bucketCount === 0) return null;
  return Math.min(bucketCount - 1, Math.floor(offset / model.bucketWidth));
}
