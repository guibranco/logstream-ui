import React from 'react';
import { LogLevel } from '../types';
import { cn } from '../lib/utils';

interface LevelBadgeProps {
  level: LogLevel;
  className?: string;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'text-gray-400 bg-gray-800',
  info: 'text-sky-400 bg-sky-900',
  notice: 'text-teal-400 bg-teal-900',
  warning: 'text-amber-400 bg-amber-900',
  error: 'text-rose-400 bg-rose-900',
  critical: 'text-fuchsia-400 bg-fuchsia-900',
};

export const LevelBadge: React.FC<LevelBadgeProps> = ({ level, className }) => {
  return (
    <span className={cn(
      'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
      LEVEL_COLORS[level],
      className
    )}>
      {level}
    </span>
  );
};
