import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TimestampTooltipProps {
  /** What the tooltip shows, e.g. the full date and time. */
  label: string;
  children: React.ReactNode;
}

/** Height of the tooltip plus a small gap, used to decide whether it fits above. */
const ROOM_ABOVE = 36;

/**
 * Shows `label` straight away when the time is hovered or focused.
 *
 * Log rows use `content-visibility: auto`, which clips anything drawn outside the row,
 * so the tooltip is drawn in `document.body` with fixed positioning instead of inside the row.
 */
export const TimestampTooltip: React.FC<TimestampTooltipProps> = ({ label, children }) => {
  const anchor = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; below: boolean } | null>(null);

  const show = () => {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const below = rect.top < ROOM_ABOVE;
    setPosition({ left: rect.left, top: below ? rect.bottom + 4 : rect.top - 4, below });
  };
  const hide = () => setPosition(null);

  // A fixed tooltip would stay put while the list moves under it.
  useEffect(() => {
    if (!position) return;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [position]);

  return (
    <>
      <span
        ref={anchor}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-label={label}
        data-testid="timestamp"
      >
        {children}
      </span>
      {position &&
        createPortal(
          <div
            role="tooltip"
            data-testid="timestamp-tooltip"
            className="fixed z-50 pointer-events-none bg-gray-800 text-gray-50 text-xs p-1 rounded whitespace-nowrap border border-gray-700 shadow-lg"
            style={{
              left: position.left,
              top: position.top,
              transform: position.below ? undefined : 'translateY(-100%)',
            }}
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  );
};
