import React, { useEffect, useRef, useState } from 'react';
import { Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ImageFormat } from '../lib/logImage';
import { cn } from '../lib/utils';

/** State of the last export, shown on the button for a moment. */
export type ExportState = { status: 'busy' } | { status: 'done' } | { status: 'failed'; message: string } | null;

const FORMATS: { format: ImageFormat; label: string; hint: string }[] = [
  { format: 'png', label: 'PNG', hint: 'Sharp, lossless; best for sharing in chats and issues' },
  { format: 'jpeg', label: 'JPEG', hint: 'Smaller file, slightly soft text' },
  { format: 'svg', label: 'SVG', hint: 'Vector; scales without blur, opens in a browser' },
];

interface ExportImageMenuProps {
  /** What is exported, for labels: "selected events" or "events in view". */
  subject: string;
  onExport: (format: ImageFormat) => void;
  state: ExportState;
  /** Button label; hidden on small screens unless `alwaysShowLabel`. */
  label?: string;
  alwaysShowLabel?: boolean;
  className?: string;
  /** Unique within the page, for test IDs. */
  testId: string;
}

function buttonText(label: string, state: ExportState): string {
  if (state?.status === 'busy') return 'Exporting…';
  if (state?.status === 'done') return 'Exported';
  if (state?.status === 'failed') return 'Export failed';
  return label;
}

/** A button that opens upwards onto PNG / JPEG / SVG. */
export const ExportImageMenu: React.FC<ExportImageMenuProps> = ({
  subject,
  onExport,
  state,
  label = 'Image',
  alwaysShowLabel = false,
  className,
  testId,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Escape closes the menu, not the selection behind it.
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const busy = state?.status === 'busy';
  let Icon: React.ElementType = ImageIcon;
  if (busy) Icon = Loader2;
  else if (state?.status === 'done') Icon = Check;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        title={state?.status === 'failed' ? state.message : `Export the ${subject} as an image`}
        data-testid={`${testId}-button`}
        className={cn(
          'flex items-center gap-1.5 whitespace-nowrap transition-colors disabled:opacity-60',
          state?.status === 'failed' && 'text-rose-300',
          className,
        )}
      >
        <Icon size={14} className={cn(busy && 'animate-spin', state?.status === 'done' && 'text-green-500')} />
        <span className={cn(!alwaysShowLabel && !state && 'hidden sm:inline')}>{buttonText(label, state)}</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`Export the ${subject} as`}
          data-testid={`${testId}-menu`}
          className="absolute bottom-full right-0 mb-2 z-30 w-64 rounded-lg border border-gray-700 bg-gray-900 shadow-2xl shadow-black/40 py-1 text-xs"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Export {subject}
          </div>
          {FORMATS.map(f => (
            <button
              key={f.format}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onExport(f.format);
              }}
              data-testid={`${testId}-${f.format}`}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-800 focus:bg-gray-800 outline-none"
            >
              <span className="font-semibold text-gray-100">{f.label}</span>
              <span className="block text-gray-500">{f.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
