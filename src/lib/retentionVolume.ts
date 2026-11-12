import { RetentionVolumeBucket, RetentionVolumePolicy, RetentionVolumeReport } from '../types';

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
export function niceScale(max: number, ticks = 4): { max: number; step: number } {
  if (max <= 0) return { max: 1, step: 1 };
  const raw = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
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

  const peak = buckets.reduce((m, b) => Math.max(m, storedValue(b, metric)), 0);
  const scale = niceScale(peak);
  const y = (v: number) => plot.y + plot.height - (v / scale.max) * plot.height;

  const stepArea = (valueOf: (b: RetentionVolumeBucket) => number): string => {
    if (buckets.length === 0) return '';
    const baseline = plot.y + plot.height;
    let d = `M${plot.x},${baseline}`;
    buckets.forEach((b, i) => {
      const top = y(valueOf(b));
      d += ` L${plot.x + i * bucketWidth},${top} L${plot.x + (i + 1) * bucketWidth},${top}`;
    });
    return `${d} L${plot.x + buckets.length * bucketWidth},${baseline} Z`;
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
    storedPath: stepArea((b) => storedValue(b, metric)),
    keptPath: stepArea((b) => storedValue(b, metric) - dueValue(b, metric)),
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

  let previousRight = -Infinity;
  for (const cluster of clusters) {
    const centre = cluster.reduce((sum, m) => sum + (m.x as number), 0) / cluster.length;
    const half = ((cluster.length - 1) * spacing) / 2;
    let start = Math.min(Math.max(centre - half, min), max - 2 * half);
    start = Math.max(start, previousRight + spacing);
    cluster.forEach((marker, i) => {
      marker.labelX = start + i * spacing;
    });
    previousRight = start + 2 * half;
  }
}

/** Bucket index under a horizontal plot coordinate, or null outside the plot. */
export function bucketAt(x: number, model: VolumeChartModel, bucketCount: number): number | null {
  const offset = x - model.plot.x;
  if (offset < 0 || offset >= model.plot.width || bucketCount === 0) return null;
  return Math.min(bucketCount - 1, Math.floor(offset / model.bucketWidth));
}
