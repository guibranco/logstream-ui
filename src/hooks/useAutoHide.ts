import React, { useCallback, useEffect, useRef, useState } from 'react';

/** How long the search bar stays visible after the pointer and focus leave it. */
export const AUTO_HIDE_DELAY_MS = 15_000;

/** Handlers and ref for one area of controls that hides with the others. */
export interface AutoHideRegion {
  ref: (el: HTMLElement | null) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLElement>) => void;
}

/** True where the device has no hover (phones, tablets): nothing could bring the controls back. */
function hasNoHover(): boolean {
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;
  } catch {
    return false;
  }
}

/** Keyboard focus or typing counts as using the controls; a button left focused by a click does not. */
function isActiveFocus(el: Element): boolean {
  if (el.matches('input, textarea, select, [contenteditable="true"]')) return true;
  try {
    return el.matches(':focus-visible');
  } catch {
    return false;
  }
}

/** An open popup menu or picker, or a field being typed in, keeps the controls up. */
function isInUse(el: HTMLElement): boolean {
  if (el.querySelector('[aria-haspopup][aria-expanded="true"]')) return true;
  const focused = document.activeElement;
  return !!focused && el.contains(focused) && isActiveFocus(focused);
}

/**
 * Hides an area of controls (the search and filter bar) once nobody has used it for `delayMs`.
 *
 * Every area spreads `region(name)`; hovering any of them, or moving keyboard focus into one,
 * shows them all again.
 */
export function useAutoHide(enabled: boolean, delayMs: number = AUTO_HIDE_DELAY_MS) {
  const active = enabled && !hasNoHover();
  const [hidden, setHidden] = useState(false);
  const inside = useRef(new Set<string>());
  const elements = useRef(new Map<string, HTMLElement>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const schedule = useCallback(() => {
    cancel();
    if (!active) return;
    const tick = () => {
      if ([...elements.current.values()].some(isInUse)) {
        timer.current = setTimeout(tick, delayMs);
        return;
      }
      setHidden(true);
    };
    timer.current = setTimeout(tick, delayMs);
  }, [active, delayMs]);

  useEffect(() => {
    if (!active) {
      cancel();
      setHidden(false);
      return;
    }
    if (inside.current.size === 0) schedule();
    return cancel;
  }, [active, schedule]);

  const mark = useCallback(
    (key: string, isInside: boolean) => {
      if (isInside) {
        inside.current.add(key);
        cancel();
        setHidden(false);
      } else {
        inside.current.delete(key);
        if (inside.current.size === 0) schedule();
      }
    },
    [schedule],
  );

  const region = useCallback(
    (name: string): AutoHideRegion => ({
      ref: el => {
        if (el) elements.current.set(name, el);
        else elements.current.delete(name);
      },
      onPointerEnter: () => mark(`${name}:hover`, true),
      onPointerLeave: () => mark(`${name}:hover`, false),
      onFocus: e => {
        if (isActiveFocus(e.target)) mark(`${name}:focus`, true);
      },
      onBlur: e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) mark(`${name}:focus`, false);
      },
    }),
    [mark],
  );

  return { hidden: active && hidden, region };
}
