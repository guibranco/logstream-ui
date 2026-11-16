import React from 'react';
import { CircleDashed, ShieldCheck, ShieldX, TriangleAlert } from 'lucide-react';
import { ClientDisplayStatus } from '../../types';
import { cn } from '../../lib/utils';

const STYLES: Record<ClientDisplayStatus, { label: string; icon: React.ElementType; className: string }> = {
  active: {
    label: 'Active',
    icon: ShieldCheck,
    className: 'bg-green-900/30 text-green-400 ring-green-900/50',
  },
  silent: {
    label: 'Silent',
    icon: TriangleAlert,
    className: 'bg-amber-900/30 text-amber-400 ring-amber-900/50',
  },
  never_seen: {
    label: 'Never seen',
    icon: CircleDashed,
    className: 'bg-gray-800 text-gray-400 ring-gray-700',
  },
  inactive: {
    label: 'Inactive',
    icon: ShieldX,
    className: 'bg-red-900/30 text-red-400 ring-red-900/50',
  },
};

interface ClientStatusPillProps {
  status: ClientDisplayStatus;
  /** Native tooltip (multi-line), e.g. last seen / threshold / silent for. */
  title?: string;
}

export const ClientStatusPill: React.FC<ClientStatusPillProps> = ({ status, title }) => {
  const { label, icon: Icon, className } = STYLES[status];
  return (
    <span
      data-status={status}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        title && 'cursor-help',
        className,
      )}
    >
      <Icon size={12} />
      {label}
    </span>
  );
};
