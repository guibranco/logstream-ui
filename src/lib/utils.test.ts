import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-2', 'px-4')).toBe('py-2 px-4');
  });

  it('handles conditional classes', () => {
    expect(cn('px-2', true && 'py-2', false && 'm-2')).toBe('px-2 py-2');
  });

  it('handles objects', () => {
    expect(cn('px-2', { 'py-2': true, 'm-2': false })).toBe('px-2 py-2');
  });

  it('handles arrays', () => {
    expect(cn(['px-2', 'py-2'])).toBe('px-2 py-2');
  });
});
