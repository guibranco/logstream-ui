import { describe, it, expect } from 'vitest';
import {
  buildVolumeChart,
  bucketAt,
  formatBytes,
  formatCount,
  markerX,
  niceScale,
  spreadLabels,
} from '@/src/lib/retentionVolume';
import { RetentionVolumePolicy, RetentionVolumeReport } from '@/src/types';

function policy(name: string, olderThanDays: number | null, active = true): RetentionVolumePolicy {
  return {
    name,
    older_than_days: olderThanDays,
    active,
    matched_count: 0,
    matched_bytes: 0,
    due_count: 0,
    due_bytes: 0,
    matched_share: 0,
  };
}

function report(counts: number[], policies: RetentionVolumePolicy[] = []): RetentionVolumeReport {
  const n = counts.length;
  const zero = { count: 0, bytes: 0, due_count: 0, due_bytes: 0 };
  return {
    generated_at: '2026-11-12T18:00:00+00:00',
    days: n,
    size_basis: 'file',
    buckets: counts.map((count, i) => ({
      date: `2026-11-${String(i + 1).padStart(2, '0')}`,
      age_days: n - 1 - i,
      count,
      bytes: count * 100,
      due_count: Math.floor(count / 2),
      due_bytes: Math.floor(count / 2) * 100,
    })),
    older: zero,
    future: zero,
    policies,
    totals: zero,
  };
}

const layout = { width: 116, height: 140, top: 20, right: 6, bottom: 20, left: 10 };

describe('niceScale', () => {
  it('rounds the max up to a whole number of nice steps', () => {
    expect(niceScale(87)).toEqual({ max: 100, step: 25 });
    expect(niceScale(1234)).toEqual({ max: 1500, step: 500 });
  });

  it('never steps by less than the minimum', () => {
    expect(niceScale(1, 4, 1)).toEqual({ max: 1, step: 1 });
    expect(niceScale(3, 4, 1)).toEqual({ max: 3, step: 1 });
    expect(niceScale(1)).toEqual({ max: 1, step: 0.25 });
  });

  it('returns a unit scale for empty data', () => {
    expect(niceScale(0)).toEqual({ max: 1, step: 1 });
  });
});

describe('markerX', () => {
  it('places a cutoff of N days on the boundary between age N+1 and age N', () => {
    // 10 buckets of 10px from x=0: age 2 is index 7, whose left edge is x=70.
    expect(markerX(2, 10, 0, 10)).toEqual({ placement: 'inside', x: 70 });
    expect(markerX(0, 10, 0, 10)).toEqual({ placement: 'inside', x: 90 });
    expect(markerX(9, 10, 0, 10)).toEqual({ placement: 'inside', x: 0 });
  });

  it('flags cutoffs older than the window', () => {
    expect(markerX(10, 10, 0, 10)).toEqual({ placement: 'beyond', x: null });
  });

  it('draws any-age policies at today', () => {
    expect(markerX(null, 10, 5, 10)).toEqual({ placement: 'any-age', x: 105 });
  });
});

describe('buildVolumeChart', () => {
  it('fits the plot inside the margins and builds stepped areas', () => {
    const model = buildVolumeChart(report([10, 20, 40, 0, 5]), 'count', layout);

    expect(model.plot).toEqual({ x: 10, y: 20, width: 100, height: 100 });
    expect(model.bucketWidth).toBe(20);
    expect(model.maxValue).toBe(40);
    // Tallest bucket (40) reaches the top of the plot.
    expect(model.storedPath).toContain('L50,20 L70,20');
    // Kept = 40 − 20 due = 20 → half way.
    expect(model.keptPath).toContain('L50,70 L70,70');
    expect(model.storedPath.endsWith('Z')).toBe(true);
  });

  it('labels whole entries on a one-entry axis', () => {
    const model = buildVolumeChart(report([1, 0]), 'count', layout);
    expect(model.yTicks.map((t) => t.label)).toEqual(['0', '1']);
  });

  it('uses bytes when asked', () => {
    const model = buildVolumeChart(report([10, 40]), 'bytes', layout);
    expect(model.maxValue).toBe(4000);
    expect(model.yTicks.at(-1)?.label).toBe('3.9 KB');
  });

  it('numbers active policies in order and lists inactive ones separately', () => {
    const model = buildVolumeChart(
      report([1, 1, 1, 1, 1], [policy('debug', 1), policy('empty', null, false), policy('all', 30), policy('pii', null)]),
      'count',
      layout,
    );

    expect(model.markers.map((m) => [m.number, m.policy.name, m.placement])).toEqual([
      [1, 'debug', 'inside'],
      [2, 'all', 'beyond'],
      [3, 'pii', 'any-age'],
    ]);
    expect(model.markers[0].x).toBe(70);
    expect(model.inactive.map((p) => p.name)).toEqual(['empty']);
  });

  it('labels the newest tick as today', () => {
    const model = buildVolumeChart(report([1, 1, 1]), 'count', layout);
    expect(model.xTicks[0].label).toBe('Today');
    expect(model.xTicks[1].label).toBe('1d ago');
  });

  it('copes with an empty report', () => {
    const model = buildVolumeChart(report([]), 'count', layout);
    expect(model.storedPath).toBe('');
    expect(model.markers).toEqual([]);
  });
});

describe('bucketAt', () => {
  it('maps a plot coordinate to its bucket and ignores the margins', () => {
    const model = buildVolumeChart(report([1, 2, 3, 4, 5]), 'count', layout);
    expect(bucketAt(10, model, 5)).toBe(0);
    expect(bucketAt(49, model, 5)).toBe(1);
    expect(bucketAt(109, model, 5)).toBe(4);
    expect(bucketAt(5, model, 5)).toBeNull();
    expect(bucketAt(110, model, 5)).toBeNull();
  });
});

describe('formatters', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(250 * 1024 * 1024)).toBe('250 MB');
  });

  it('formats counts', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1500)).toBe('1.5k');
    expect(formatCount(25_000)).toBe('25k');
    expect(formatCount(2_500_000)).toBe('2.5M');
  });
});

describe('spreadLabels', () => {
  function markersAt(xs: (number | null)[]) {
    return xs.map((x, i) => ({ number: i + 1, policy: policy(`p${i}`, 1), placement: 'inside' as const, x, labelX: x }));
  }

  it('leaves well-separated badges where they are', () => {
    const markers = markersAt([50, 100]);
    spreadLabels(markers, 0, 200);
    expect(markers.map((m) => m.labelX)).toEqual([50, 100]);
  });

  it('puts badges that share a cutoff side by side, centred on the line', () => {
    const markers = markersAt([100, 100, 100]);
    spreadLabels(markers, 0, 200);
    expect(markers.map((m) => m.labelX)).toEqual([80, 100, 120]);
  });

  it('keeps badges inside the bounds and in marker order', () => {
    const markers = markersAt([198, 195]);
    spreadLabels(markers, 0, 200);
    expect(markers[1].labelX).toBe(180);
    expect(markers[0].labelX).toBe(200);
  });

  it('moves earlier clusters left when a later one would overflow', () => {
    const markers = markersAt([40, 40, 72, 72]);
    spreadLabels(markers, 0, 80);
    expect(markers.map((m) => m.labelX)).toEqual([20, 40, 60, 80]);
  });

  it('skips markers beyond the window', () => {
    const markers = markersAt([null, 10]);
    spreadLabels(markers, 0, 200);
    expect(markers[0].labelX).toBeNull();
    expect(markers[1].labelX).toBe(10);
  });
});
