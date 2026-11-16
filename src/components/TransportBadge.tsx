import React from 'react';
import { Transport } from '../types';
import { cn } from '../lib/utils';

interface TransportBadgeProps {
  transport: Transport | null | undefined;
  className?: string;
}

/** Outlined so it reads as metadata, not as another severity badge. */
const TRANSPORT_STYLES: Record<Transport, { classes: string; title: string }> = {
  tcp: { classes: 'text-gray-400 border-gray-700', title: 'Received over TCP (HTTP ingestion)' },
  udp: { classes: 'text-violet-300 border-violet-700', title: 'Received over UDP' },
};

/**
 * TCP / UDP label for how an entry reached the server. Renders nothing when
 * the server did not record it (older servers, older entries, server self-logs).
 */
export const TransportBadge: React.FC<TransportBadgeProps> = ({ transport, className }) => {
  const style = transport ? TRANSPORT_STYLES[transport] : undefined;
  if (!style) return null;

  return (
    <span
      className={cn(
        'px-1.5 py-px rounded border text-[9px] font-bold uppercase tracking-wider font-mono flex-shrink-0',
        style.classes,
        className,
      )}
      title={style.title}
      data-testid="transport-badge"
    >
      {transport}
    </span>
  );
};
