import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LevelBadge } from './LevelBadge';
import { LogLevel } from '../types';

describe('LevelBadge', () => {
  it('renders the level text correctly', () => {
    render(<LevelBadge level="info" />);
    expect(screen.getByText('info')).toBeInTheDocument();
  });

  it('applies the correct colors for error level', () => {
    const { container } = render(<LevelBadge level="error" />);
    const span = container.firstChild as HTMLElement;
    expect(span).toHaveClass('text-rose-400', 'bg-rose-900');
  });

  it('renders correctly for all levels', () => {
    const levels: LogLevel[] = ['debug', 'info', 'notice', 'warning', 'error', 'critical'];
    levels.forEach(level => {
      render(<LevelBadge level={level} />);
      expect(screen.getByText(level)).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    render(<LevelBadge level="info" className="custom-class" />);
    const badge = screen.getByText('info');
    expect(badge).toHaveClass('custom-class');
  });
});
