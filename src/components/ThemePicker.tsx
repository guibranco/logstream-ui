import React, { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ColorMode, ModePreference, ThemeDefinition } from '../themes/types';
import { cn } from '../lib/utils';

const MODE_OPTIONS: ReadonlyArray<{ value: ModePreference; label: string; icon: React.ElementType }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/** A miniature of the variant: its page background with the two accents on top. */
const Swatch: React.FC<{ theme: ThemeDefinition; mode: ColorMode }> = ({ theme, mode }) => {
  const variant = theme[mode];
  const secondary = variant.secondary ?? variant.primary;
  const page = mode === 'light' ? variant.overrides?.['gray-950'] ?? variant.neutral['50'] : variant.neutral['950'];
  const border = mode === 'light' ? variant.neutral['200'] : variant.neutral['800'];
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-10 flex-shrink-0 items-center justify-center gap-1 rounded-md border"
      style={{ backgroundColor: page, borderColor: border }}
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: variant.primary['500'] }} />
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: secondary['500'] }} />
    </span>
  );
};

interface ThemePickerProps {
  /** Which side of the button the menu lines up with. */
  align?: 'left' | 'right';
  className?: string;
}

export const ThemePicker: React.FC<ThemePickerProps> = ({ align = 'right', className }) => {
  const { themes, theme, mode, resolvedMode, setThemeId, setMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    // With many themes the list scrolls: start with the current one in view.
    selectedRef.current?.scrollIntoView?.({ block: 'nearest' });
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'p-2 rounded transition-all',
          isOpen ? 'text-primary-400 bg-gray-900' : 'text-gray-500 hover:text-primary-400 hover:bg-gray-900',
        )}
        title="Theme"
        aria-label="Theme"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Palette size={18} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Theme settings"
          className={cn(
            'absolute top-full mt-2 w-64 z-[70] bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-3 space-y-3',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div>
            <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Mode</p>
            <div className="grid grid-cols-3 gap-1 bg-gray-950 border border-gray-800 p-1 rounded-lg" role="radiogroup" aria-label="Mode">
              {MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all',
                    mode === value ? 'bg-gray-800 text-gray-50 shadow-sm' : 'text-gray-500 hover:text-gray-300',
                  )}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">Theme</p>
            <div
              className="space-y-1 max-h-[min(22rem,calc(100vh-14rem))] overflow-y-auto overscroll-contain -mr-1.5 pr-1.5"
              role="radiogroup"
              aria-label="Theme"
            >
              {themes.map((option) => {
                const selected = option.id === theme.id;
                return (
                  <button
                    key={option.id}
                    ref={selected ? selectedRef : undefined}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setThemeId(option.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-left transition-colors',
                      selected ? 'bg-gray-800' : 'hover:bg-gray-800/60',
                    )}
                  >
                    <Swatch theme={option} mode={resolvedMode} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-100">{option.name}</span>
                      {option.description && (
                        <span className="block text-[11px] text-gray-500 truncate">{option.description}</span>
                      )}
                    </span>
                    {selected && <Check size={14} className="text-primary-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
