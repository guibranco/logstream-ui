import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { AutoHideRegion } from '../hooks/useAutoHide';

/** Matches the collapse animation below. */
const ANIMATION_MS = 300;

interface AutoHideProps {
  hidden: boolean;
  /** From `useAutoHide().region(name)`; leave out for parts that only follow the others. */
  region?: AutoHideRegion;
  /** Leave a thin strip to hover when hidden, on this side of the collapsed area. */
  strip?: 'top' | 'bottom';
  testId?: string;
  children: React.ReactNode;
}

/** Collapses its children to nothing (or to a thin hover strip) while `hidden`. */
export const AutoHide: React.FC<AutoHideProps> = ({ hidden, region, strip, testId, children }) => {
  // Clipped while collapsing, collapsed and expanding; then menus may open past the edges again.
  const [clipped, setClipped] = useState(hidden);
  useEffect(() => {
    if (hidden) {
      setClipped(true);
      return;
    }
    const done = setTimeout(() => setClipped(false), ANIMATION_MS);
    return () => clearTimeout(done);
  }, [hidden]);

  const hoverStrip = strip && hidden && (
    <div
      aria-hidden="true"
      data-testid={testId ? `${testId}-strip` : undefined}
      className="h-1.5 flex-shrink-0 bg-gray-800/60 hover:bg-secondary-700/70 transition-colors cursor-pointer"
    />
  );

  return (
    <div {...region} data-testid={testId} data-hidden={hidden || undefined} className="flex-shrink-0 flex flex-col">
      {strip === 'top' && hoverStrip}
      <div
        className={cn(
          'grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 ease-out',
          hidden ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        )}
      >
        <div className={cn('min-h-0', clipped && 'overflow-hidden')}>
          {children}
        </div>
      </div>
      {strip === 'bottom' && hoverStrip}
    </div>
  );
};
