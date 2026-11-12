import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { RetentionVolumeReport } from '../../types';
import {
  DEFAULT_LAYOUT,
  VolumeMetric,
  bucketAt,
  buildVolumeChart,
  dueValue,
  formatMetric,
  storedValue,
} from '../../lib/retentionVolume';

interface RetentionVolumeChartProps {
  report: RetentionVolumeReport;
  metric: VolumeMetric;
  /** Highlights a marker, e.g. while its row in the policy list is hovered. */
  activeMarker?: number | null;
  onMarkerHover?: (marker: number | null) => void;
}

const FALLBACK_WIDTH = 960;

/** Tracks the rendered width; falls back to a fixed width where ResizeObserver is missing (tests, old browsers). */
function useWidth(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(FALLBACK_WIDTH);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

export function RetentionVolumeChart({ report, metric, activeMarker = null, onMarkerHover }: RetentionVolumeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useWidth(containerRef);
  const [hovered, setHovered] = useState<number | null>(null);

  const model = useMemo(
    () => buildVolumeChart(report, metric, { ...DEFAULT_LAYOUT, width }),
    [report, metric, width],
  );

  const { plot } = model;
  const baseline = plot.y + plot.height;
  const hoveredBucket = hovered !== null ? report.buckets[hovered] : null;

  const handleMove = (event: React.MouseEvent<SVGRectElement>) => {
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const x = ((event.clientX - box.left) / (box.width || width)) * width;
    setHovered(bucketAt(x, model, report.buckets.length));
  };

  const tooltipLeft = hovered !== null
    ? Math.min(Math.max(plot.x + (hovered + 0.5) * model.bucketWidth, 90), width - 90)
    : 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        width={width}
        height={DEFAULT_LAYOUT.height}
        viewBox={`0 0 ${width} ${DEFAULT_LAYOUT.height}`}
        role="img"
        aria-label={`Stored log ${metric === 'count' ? 'entries' : 'size'} for the last ${report.days} days, with ${model.markers.length} retention policy markers`}
        className="block"
      >
        <defs>
          <pattern id="retention-due-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--color-gray-700)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-gray-500)" strokeWidth="2" />
          </pattern>
        </defs>

        {/* Grid and y axis */}
        {model.yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={plot.x} x2={plot.x + plot.width} y1={tick.position} y2={tick.position} stroke="var(--color-gray-800)" strokeWidth={1} />
            <text x={plot.x - 8} y={tick.position} dy="0.32em" textAnchor="end" className="fill-gray-500 text-[10px] font-mono">
              {tick.label}
            </text>
          </g>
        ))}

        {/* Stored = kept (solid) + due for deletion (hatched on top) */}
        <path d={model.storedPath} fill="url(#retention-due-hatch)" data-testid="volume-stored" />
        <path d={model.keptPath} fill="var(--color-primary-500)" fillOpacity={0.35} stroke="var(--color-primary-400)" strokeWidth={2} strokeLinejoin="round" data-testid="volume-kept" />

        {/* X axis */}
        <line x1={plot.x} x2={plot.x + plot.width} y1={baseline} y2={baseline} stroke="var(--color-gray-700)" strokeWidth={1} />
        {model.xTicks.map((tick) => (
          <text key={tick.value} x={tick.position} y={baseline + 16} textAnchor="middle" className="fill-gray-500 text-[10px]">
            {tick.label}
          </text>
        ))}

        {/* Hover column */}
        {hovered !== null && (
          <rect
            x={plot.x + hovered * model.bucketWidth}
            y={plot.y}
            width={Math.max(1, model.bucketWidth)}
            height={plot.height}
            fill="var(--color-gray-50)"
            fillOpacity={0.06}
            pointerEvents="none"
          />
        )}

        {/* Policy markers */}
        {model.markers.filter((m) => m.x !== null).map((marker) => {
          const x = marker.x as number;
          const labelX = marker.labelX ?? x;
          const isActive = activeMarker === marker.number;
          return (
            <g
              key={marker.policy.name}
              data-testid={`volume-marker-${marker.number}`}
              onMouseEnter={() => onMarkerHover?.(marker.number)}
              onMouseLeave={() => onMarkerHover?.(null)}
              className="cursor-default"
            >
              <title>{`${marker.number}. ${marker.policy.name}`}</title>
              {labelX !== x && (
                <line x1={labelX} x2={x} y1={plot.y - 3} y2={plot.y} stroke="var(--color-gray-500)" strokeWidth={1} />
              )}
              <line
                x1={x} x2={x} y1={plot.y} y2={baseline}
                stroke={isActive ? 'var(--color-gray-200)' : 'var(--color-gray-500)'}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray="3 3"
              />
              <circle
                cx={labelX} cy={plot.y - 12} r={9}
                fill={isActive ? 'var(--color-primary-600)' : 'var(--color-gray-900)'}
                stroke={isActive ? 'var(--color-primary-300)' : 'var(--color-gray-400)'}
                strokeWidth={1.5}
              />
              <text x={labelX} y={plot.y - 12} dy="0.35em" textAnchor="middle" className="fill-gray-100 text-[10px] font-bold">
                {marker.number}
              </text>
            </g>
          );
        })}

        {/* Hit area for the hover layer: larger than any mark */}
        <rect
          x={plot.x}
          y={plot.y}
          width={plot.width}
          height={plot.height}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHovered(null)}
          data-testid="volume-hit-area"
        />
      </svg>

      {hoveredBucket && (
        <div
          role="tooltip"
          className="absolute pointer-events-none -translate-x-1/2 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs whitespace-nowrap"
          style={{ left: tooltipLeft, top: DEFAULT_LAYOUT.top + 6 }}
        >
          <div className="font-semibold text-gray-100 mb-1">
            {format(parseISO(hoveredBucket.date), 'EEE, MMM d, yyyy')}
            <span className="text-gray-500 font-normal ml-1.5">
              {hoveredBucket.age_days === 0 ? 'today' : `${hoveredBucket.age_days}d ago`}
            </span>
          </div>
          <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-gray-400">
            <span>Stored</span>
            <span className="text-right font-mono text-gray-200">{formatMetric(storedValue(hoveredBucket, metric), metric)}</span>
            <span>Due for deletion</span>
            <span className="text-right font-mono text-gray-200">{formatMetric(dueValue(hoveredBucket, metric), metric)}</span>
            <span>Kept</span>
            <span className="text-right font-mono text-gray-200">
              {formatMetric(storedValue(hoveredBucket, metric) - dueValue(hoveredBucket, metric), metric)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
