import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useAutoHide, AUTO_HIDE_DELAY_MS } from '@/src/hooks/useAutoHide';
import { AutoHide } from '@/src/components/AutoHide';

const Harness: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const { hidden, region } = useAutoHide(enabled);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <AutoHide hidden={hidden} region={region('header')} strip="top" testId="header">
        <button aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
          Menu
        </button>
        <input aria-label="Search" />
      </AutoHide>
      <AutoHide hidden={hidden} region={region('footer')} strip="bottom" testId="footer">
        footer
      </AutoHide>
      <div data-testid="logs">logs</div>
    </>
  );
};

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const isHidden = (id: string) => screen.getByTestId(id).hasAttribute('data-hidden');

describe('useAutoHide', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('hides every area after the idle delay, leaving hover strips', () => {
    render(<Harness />);
    advance(AUTO_HIDE_DELAY_MS - 1);
    expect(isHidden('header')).toBe(false);
    advance(1);
    expect(isHidden('header')).toBe(true);
    expect(isHidden('footer')).toBe(true);
    expect(screen.getByTestId('header-strip')).toBeInTheDocument();
    expect(screen.getByTestId('footer-strip')).toBeInTheDocument();
  });

  it('shows everything again on hover and restarts the delay on leave', () => {
    render(<Harness />);
    advance(AUTO_HIDE_DELAY_MS);
    fireEvent.pointerEnter(screen.getByTestId('footer'));
    expect(isHidden('header')).toBe(false);

    // Stays up as long as the pointer is over it.
    advance(AUTO_HIDE_DELAY_MS * 2);
    expect(isHidden('header')).toBe(false);

    fireEvent.pointerLeave(screen.getByTestId('footer'));
    advance(AUTO_HIDE_DELAY_MS);
    expect(isHidden('header')).toBe(true);
  });

  it('stays up while a field is being typed in', () => {
    render(<Harness />);
    const search = screen.getByLabelText('Search');
    act(() => search.focus());
    advance(AUTO_HIDE_DELAY_MS * 3);
    expect(isHidden('header')).toBe(false);

    act(() => screen.getByTestId('logs').click());
    act(() => search.blur());
    advance(AUTO_HIDE_DELAY_MS);
    expect(isHidden('header')).toBe(true);
  });

  it('stays up while a popup menu is open', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Menu'));
    advance(AUTO_HIDE_DELAY_MS * 2);
    expect(isHidden('header')).toBe(false);

    fireEvent.click(screen.getByText('Menu'));
    advance(AUTO_HIDE_DELAY_MS);
    expect(isHidden('header')).toBe(true);
  });

  it('never hides when turned off', () => {
    render(<Harness enabled={false} />);
    advance(AUTO_HIDE_DELAY_MS * 2);
    expect(isHidden('header')).toBe(false);
  });

  it('never hides on devices without hover', () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    try {
      render(<Harness />);
      advance(AUTO_HIDE_DELAY_MS * 2);
      expect(isHidden('header')).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });
});
